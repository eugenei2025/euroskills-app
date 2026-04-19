/**
 * ImportWizard — expanded for Change Set 13.
 *
 * Auto-detects which data type the CSV contains by inspecting headers:
 *   • competition_roles  → has "role_type"
 *   • supporting_documents → has "doc_type"
 *   • skill_positions    → has "has_itpd" or "project_type"
 *   • skill_events       → has "event_type" and "attendance_status"
 *
 * All types require a "skill_number" column (or "skill_name" as fallback).
 */

import { useState, useCallback } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { StepUpload } from './StepUpload'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getCurrentUserName } from '@/context/UserContext'

// ── Types ────────────────────────────────────────────────────────────────────

type DataType = 'roles' | 'documents' | 'positions' | 'events' | 'unknown'

interface DetectionResult {
  type: DataType
  label: string
  confidence: 'high' | 'low'
  missing: string[]
}

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

// ── Header normalisation ─────────────────────────────────────────────────────
// The CSV from the EuroSkills system uses mixed-case column names with spaces
// and non-standard names (e.g. "First_Name", "e-mail", "Competition_Mode").
// This map converts them to the internal snake_case names the import functions expect.

const HEADER_ALIAS: Record<string, string> = {
  // Name variants
  'first_name':         'first_name',
  'firstname':          'first_name',
  'given_name':         'first_name',
  'family_name':        'family_name',
  'familyname':         'family_name',
  'last_name':          'family_name',
  'lastname':           'family_name',
  'surname':            'family_name',
  // Email variants
  'e-mail':             'email',
  'email_address':      'email',
  'emailaddress':       'email',
  // Competition mode (maps to a notes/extra field, stored as competition_mode)
  'competition_mode':   'competition_mode',
  'competitionmode':    'competition_mode',
  // Position / role type
  'position':           'role_type',
  'role':               'role_type',
  // Skill number
  'skill_no':           'skill_number',
  'skillnumber':        'skill_number',
  'skill_id':           'skill_number',
  // Skill name
  'skillname':          'skill_name',
  // Status
  'filled':             'status',
}

/**
 * Normalise a row's keys: lowercase+trim the header, then apply any alias.
 * Preserves original value if no alias exists.
 */
function normaliseRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    const norm = key.toLowerCase().trim().replace(/\s+/g, '_')
    const mapped = HEADER_ALIAS[norm] ?? norm
    // Don't overwrite already-mapped keys (first one wins)
    if (!(mapped in out)) out[mapped] = value
  }
  return out
}

/**
 * Normalise all rows and return both normalised rows and the new header list.
 */
function normaliseRows(rows: Record<string, string>[]): { rows: Record<string, string>[]; headers: string[] } {
  const normalised = rows.map(normaliseRow)
  const headers = normalised.length > 0 ? Object.keys(normalised[0]) : []
  return { rows: normalised, headers }
}

// ── Header detection ─────────────────────────────────────────────────────────

function detectDataType(headers: string[]): DetectionResult {
  const h = headers.map(x => x.toLowerCase().trim())
  const has = (col: string) => h.includes(col)

  const hasSkillRef = has('skill_number') || has('skill_name')
  const missing: string[] = []
  if (!hasSkillRef) missing.push('skill_number (or skill_name)')

  if (has('role_type')) {
    return { type: 'roles', label: 'Competition Roles', confidence: 'high', missing }
  }
  if (has('doc_type') || has('document_type')) {
    return { type: 'documents', label: 'Supporting Documents', confidence: 'high', missing }
  }
  if (has('has_itpd') || has('project_type') || has('test_project_ready')) {
    return { type: 'positions', label: 'Test Project / Positions', confidence: 'high', missing }
  }
  if (has('event_type') && (has('attendance_status') || has('event_date'))) {
    return { type: 'events', label: 'Events & Attendance', confidence: 'high', missing }
  }
  return { type: 'unknown', label: 'Unknown — cannot determine data type', confidence: 'low', missing }
}

// ── Skill lookup helper ───────────────────────────────────────────────────────

async function buildSkillMap(rows: Record<string, string>[]): Promise<Record<string, string>> {
  const numbers = [...new Set(rows.map(r => r.skill_number).filter(Boolean))]
  const names   = [...new Set(rows.map(r => r.skill_name).filter(Boolean))]

  const results: { id: string; skill_number: string; skill_name: string }[] = []

  if (numbers.length > 0) {
    const { data } = await supabase.from('skills').select('id,skill_number,skill_name').in('skill_number', numbers)
    if (data) results.push(...data)
  }
  if (names.length > 0) {
    const { data } = await supabase.from('skills').select('id,skill_number,skill_name').in('skill_name', names)
    if (data) {
      for (const s of data) {
        if (!results.find(r => r.id === s.id)) results.push(s)
      }
    }
  }

  const map: Record<string, string> = {}
  for (const s of results) {
    if (s.skill_number) map[s.skill_number] = s.id
    if (s.skill_name)   map[s.skill_name]   = s.id
  }
  return map
}

function getSkillId(row: Record<string, string>, skillMap: Record<string, string>): string | null {
  return skillMap[row.skill_number] ?? skillMap[row.skill_name] ?? null
}

// ── Import functions per data type ───────────────────────────────────────────

async function importRoles(rows: Record<string, string>[], skillMap: Record<string, string>): Promise<ImportResult> {
  let imported = 0, skipped = 0
  const errors: string[] = []

  const inserts = []
  for (const row of rows) {
    const skillId = getSkillId(row, skillMap)
    if (!skillId) { skipped++; continue }
    if (!row.role_type) { errors.push(`Row missing role_type`); skipped++; continue }

    // Derive status: if a first or family name is present the role is Filled,
    // otherwise use any explicit status field, defaulting to Vacant.
    const hasName = !!(row.first_name || row.family_name)
    let derivedStatus: 'Vacant' | 'Pending' | 'Filled' | 'Not Applicable' = 'Vacant'
    if (row.status) {
      const s = row.status.trim()
      if (['Vacant','Pending','Filled','Not Applicable'].includes(s)) {
        derivedStatus = s as typeof derivedStatus
      }
    } else if (hasName) {
      derivedStatus = 'Filled'
    }

    // Combine competition_mode into notes if present
    const noteParts = [
      row.competition_mode ? `Mode: ${row.competition_mode}` : '',
      row.notes ?? '',
    ].filter(Boolean)

    inserts.push({
      skill_id:    skillId,
      role_type:   row.role_type,
      status:      derivedStatus,
      is_new:      row.is_new === 'true' || row.is_new === '1',
      first_name:  row.first_name  || null,
      family_name: row.family_name || null,
      email:       row.email       || null,
      iso_code:    row.iso_code    || row.nationality || null,
      phone:       row.phone       || null,
      notes:       noteParts.join(' | ') || null,
    })
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('competition_roles').insert(inserts)
    if (error) throw error
    imported = inserts.length

    // Update competition_mode on the skills themselves
    // Each skill gets the first non-empty competition_mode from its rows
    const modeBySkill: Record<string, string> = {}
    for (const row of rows) {
      const skillId = getSkillId(row, skillMap)
      if (skillId && row.competition_mode && !modeBySkill[skillId]) {
        modeBySkill[skillId] = row.competition_mode
      }
    }
    for (const [skillId, mode] of Object.entries(modeBySkill)) {
      await supabase.from('skills').update({ competition_mode: mode }).eq('id', skillId)
    }

    // Audit
    await supabase.from('audit_log').insert({
      table_name: 'competition_roles',
      record_id:  'bulk-import',
      skill_id:   null,
      changed_by: getCurrentUserName(),
      action:     'INSERT',
      old_data:   null,
      new_data:   { count: imported, note: 'Bulk import' },
    })
  }

  return { imported, skipped, errors }
}

async function importDocuments(rows: Record<string, string>[], skillMap: Record<string, string>): Promise<ImportResult> {
  let imported = 0, skipped = 0
  const errors: string[] = []
  const inserts = []

  for (const row of rows) {
    const skillId = getSkillId(row, skillMap)
    if (!skillId) { skipped++; continue }
    const docType = row.doc_type || row.document_type
    if (!docType) { errors.push('Row missing doc_type'); skipped++; continue }

    inserts.push({
      skill_id: skillId,
      doc_type: docType,
      status:   (row.status as 'Missing' | 'Pending' | 'Complete' | 'Not Applicable') || 'Missing',
      due_date: row.due_date || null,
      notes:    row.notes    || null,
    })
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('supporting_documents').insert(inserts)
    if (error) throw error
    imported = inserts.length

    await supabase.from('audit_log').insert({
      table_name: 'supporting_documents',
      record_id:  'bulk-import',
      skill_id:   null,
      changed_by: getCurrentUserName(),
      action:     'INSERT',
      old_data:   null,
      new_data:   { count: imported, note: 'Bulk import' },
    })
  }

  return { imported, skipped, errors }
}

function parseBool(val: string | undefined): boolean | null {
  if (val === undefined || val === '') return null
  return val === 'true' || val === '1' || val === 'yes'
}

async function importPositions(rows: Record<string, string>[], skillMap: Record<string, string>): Promise<ImportResult> {
  let imported = 0, skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const skillId = getSkillId(row, skillMap)
    if (!skillId) { skipped++; continue }

    const payload: Record<string, unknown> = {
      skill_id:              skillId,
      project_type:          row.project_type       || null,
      has_itpd:              parseBool(row.has_itpd),
      requires_30_percent:   parseBool(row.requires_30_percent),
      expert_created_tp:     parseBool(row.expert_created_tp),
      itpd_scope:            row.itpd_scope          || null,
      test_project_ready:    parseBool(row.test_project_ready),
      marking_scheme_ready:  parseBool(row.marking_scheme_ready),
      marking_scheme_tested: parseBool(row.marking_scheme_tested),
      test_project_validated:parseBool(row.test_project_validated),
      test_project_delivered:row.test_project_delivered || null,
      tp_agreed_delivery_date:row.tp_agreed_delivery_date || null,
      itpd_budget:           row.itpd_budget  ? Number(row.itpd_budget)  : null,
      itpd_flight_costs:     row.itpd_flight_costs ? Number(row.itpd_flight_costs) : null,
      itpd_spend:            row.itpd_spend   ? Number(row.itpd_spend)   : null,
      readiness_flag:        parseBool(row.readiness_flag) ?? false,
      notes:                 row.notes || null,
    }

    // Upsert (skill_positions has UNIQUE on skill_id)
    const { error } = await supabase
      .from('skill_positions')
      .upsert(payload, { onConflict: 'skill_id' })
    if (error) { errors.push(`Skill ${row.skill_number ?? row.skill_name}: ${error.message}`); skipped++; continue }
    imported++
  }

  if (imported > 0) {
    await supabase.from('audit_log').insert({
      table_name: 'skill_positions',
      record_id:  'bulk-import',
      skill_id:   null,
      changed_by: getCurrentUserName(),
      action:     'INSERT',
      old_data:   null,
      new_data:   { count: imported, note: 'Bulk import' },
    })
  }

  return { imported, skipped, errors }
}

async function importEvents(rows: Record<string, string>[], skillMap: Record<string, string>): Promise<ImportResult> {
  let imported = 0, skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const skillId = getSkillId(row, skillMap)
    if (!skillId) { skipped++; continue }
    if (!row.event_type) { errors.push('Row missing event_type'); skipped++; continue }

    const payload = {
      skill_id:          skillId,
      event_type:        row.event_type as 'SDW' | 'CPM' | 'EuroSkills Competition',
      event_date:        row.event_date      || null,
      event_location:    row.event_location  || null,
      attendance_status: (row.attendance_status as 'Attending' | 'Package Secured' | 'Tentative' | 'Not Attending' | 'Not Applicable') || 'Not Applicable',
      attendee_name:     row.attendee_name   || null,
      notes:             row.notes           || null,
    }

    const { error } = await supabase
      .from('skill_events')
      .upsert(payload, { onConflict: 'skill_id,event_type' })
    if (error) { errors.push(`Skill ${row.skill_number ?? row.skill_name}: ${error.message}`); skipped++; continue }
    imported++
  }

  if (imported > 0) {
    await supabase.from('audit_log').insert({
      table_name: 'skill_events',
      record_id:  'bulk-import',
      skill_id:   null,
      changed_by: getCurrentUserName(),
      action:     'INSERT',
      old_data:   null,
      new_data:   { count: imported, note: 'Bulk import' },
    })
  }

  return { imported, skipped, errors }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

function useSmartImport(dataType: DataType) {
  const qc = useQueryClient()
  return useMutation<ImportResult, Error, Record<string, string>[]>({
    mutationFn: async (rows) => {
      const skillMap = await buildSkillMap(rows)
      switch (dataType) {
        case 'roles':     return importRoles(rows, skillMap)
        case 'documents': return importDocuments(rows, skillMap)
        case 'positions': return importPositions(rows, skillMap)
        case 'events':    return importEvents(rows, skillMap)
        default:          throw new Error('Cannot import unknown data type')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['roles'] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['position'] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Confirm' },
  { id: 3, label: 'Import' },
]

// ── ImportWizard ──────────────────────────────────────────────────────────────

export function ImportWizard() {
  const [step, setStep]             = useState<1 | 2 | 3>(1)
  const [rawRows, setRawRows]       = useState<Record<string, string>[]>([])
  const [headers, setHeaders]       = useState<string[]>([])
  const [detection, setDetection]   = useState<DetectionResult | null>(null)
  const [result, setResult]         = useState<ImportResult | null>(null)

  const { mutate, isPending } = useSmartImport(detection?.type ?? 'unknown')

  const handleParsed = useCallback((rows: Record<string, string>[], _hdrs: string[]) => {
    // Normalise headers first (handles First_Name → first_name, e-mail → email, etc.)
    const { rows: normRows, headers: normHdrs } = normaliseRows(rows)
    setRawRows(normRows)
    setHeaders(normHdrs)
    setDetection(detectDataType(normHdrs))
    setStep(2)
  }, [])

  const handleImport = () => {
    mutate(rawRows, {
      onSuccess: (r) => {
        setResult(r)
        setStep(3)
      },
      onError: (err) => {
        setResult({ imported: 0, skipped: 0, errors: [err.message] })
        setStep(3)
      },
    })
  }

  const reset = () => {
    setStep(1)
    setRawRows([])
    setHeaders([])
    setDetection(null)
    setResult(null)
  }

  const canProceed = detection?.type !== 'unknown' && detection?.missing.length === 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bulk Import</CardTitle>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step > s.id ? 'bg-green-500 text-white' :
                  step === s.id ? 'bg-blue-600 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.id ? '✓' : s.id}
                </div>
                <span className="text-xs text-gray-500 hidden sm:block">{s.label}</span>
                {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-300 mx-1" />}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* ── Step 1: Upload ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
              <p className="font-semibold">Supported CSV types — auto-detected from column headers:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong>Competition Roles</strong> — must include: <code>skill_number</code>, <code>role_type</code></li>
                <li><strong>Supporting Documents</strong> — must include: <code>skill_number</code>, <code>doc_type</code></li>
                <li><strong>Test Project / Positions</strong> — must include: <code>skill_number</code>, <code>has_itpd</code> or <code>project_type</code></li>
                <li><strong>Events &amp; Attendance</strong> — must include: <code>skill_number</code>, <code>event_type</code>, <code>attendance_status</code></li>
              </ul>
              <p className="text-xs text-blue-600">
                You can use <code>skill_number</code> <strong>or</strong> <code>skill_name</code> to identify skills.
                Having both is best practice.
              </p>
            </div>
            <StepUpload onParsed={handleParsed} />
          </div>
        )}

        {/* ── Step 2: Confirm detected type ── */}
        {step === 2 && detection && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-gray-700">Step 2 — Confirm Import Type</h3>

            {/* Detection result */}
            <div className={`rounded-lg border p-4 space-y-2 ${
              detection.type === 'unknown'
                ? 'border-red-200 bg-red-50'
                : detection.missing.length > 0
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-green-200 bg-green-50'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  detection.type === 'unknown' ? 'bg-red-500 text-white' :
                  detection.missing.length > 0 ? 'bg-amber-500 text-white' :
                  'bg-green-600 text-white'
                }`}>
                  {detection.type === 'unknown' ? '✗ Unrecognised' : '✓ Detected'}
                </span>
                <span className="text-sm font-medium text-gray-800">{detection.label}</span>
              </div>

              {detection.missing.length > 0 && (
                <p className="text-xs text-red-700">
                  Missing required column(s): <strong>{detection.missing.join(', ')}</strong>
                </p>
              )}
            </div>

            {/* Columns found */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Columns detected in your CSV ({headers.length}):</p>
              <div className="flex flex-wrap gap-1">
                {headers.map(h => (
                  <span key={h} className="text-xs bg-gray-100 text-gray-700 rounded px-2 py-0.5 font-mono">{h}</span>
                ))}
              </div>
            </div>

            {/* Row count + preview */}
            <div className="flex gap-4">
              <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-semibold text-blue-600">{rawRows.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">Rows to import</p>
              </div>
            </div>

            {/* Preview table */}
            {rawRows.length > 0 && canProceed && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-xs divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rawRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {headers.map(h => (
                          <td key={h} className="px-3 py-2 text-gray-700 truncate max-w-[160px]">
                            {row[h] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rawRows.length > 5 && (
                  <p className="text-xs text-gray-400 px-3 py-2">…and {rawRows.length - 5} more rows</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={reset} className="text-sm text-gray-500 hover:underline">← Back</button>
              {canProceed && (
                <Button onClick={handleImport} loading={isPending}>
                  Import {rawRows.length} {detection.label} rows
                </Button>
              )}
              {!canProceed && (
                <p className="text-sm text-red-600 self-center">
                  Fix the issues above before importing.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Result ── */}
        {step === 3 && result && (
          <div className="py-8 text-center space-y-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
              result.errors.length > 0 ? 'bg-amber-100' : 'bg-green-100'
            }`}>
              {result.errors.length > 0 ? (
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <p className="text-lg font-semibold text-gray-900">
              {result.errors.length > 0 ? 'Import completed with warnings' : 'Import complete'}
            </p>

            <div className="flex justify-center gap-4 text-sm">
              <div className="bg-green-50 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-semibold text-green-600">{result.imported}</p>
                <p className="text-xs text-gray-500">Imported</p>
              </div>
              {result.skipped > 0 && (
                <div className="bg-amber-50 rounded-lg px-4 py-3 text-center">
                  <p className="text-2xl font-semibold text-amber-600">{result.skipped}</p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="text-left max-w-md mx-auto border border-amber-200 rounded-lg overflow-hidden">
                <div className="bg-amber-50 px-4 py-2">
                  <p className="text-sm font-medium text-amber-700">Warnings / errors</p>
                </div>
                <ul className="px-4 py-2 space-y-1">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <li key={i} className="text-xs text-red-600">• {e}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="text-xs text-gray-400">…and {result.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}

            <button onClick={reset} className="text-blue-600 text-sm hover:underline">
              Import another file
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
