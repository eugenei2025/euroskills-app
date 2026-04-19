import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useSkills } from '@/hooks/useSkills'
import {
  useJuryPresidents,
  useUpsertJuryPresident,
  useDeleteJuryPresident,
  useSkillsAdvisors,
  useUpsertSkillsAdvisor,
  useDeleteSkillsAdvisor,
  useJpAssignments,
  useSetJpAssignmentsForSkill,
  useSaAssignments,
  useSetSaAssignmentsForSkill,
  useResetAllAllocations,
} from '@/hooks/useJuryPresidents'
import type { GlobalJuryPresident, GlobalSkillsAdvisor } from '@/types/database'

// ── Shared person form fields ─────────────────────────────────────────────────

interface PersonFields {
  title: string
  first_name: string
  family_name: string
  country: string
  iso_code: string
  email: string
  phone: string
  phone2?: string
  is_jptl?: boolean
  notes: string
}

const EMPTY_JP: PersonFields = {
  title: '', first_name: '', family_name: '',
  country: '', iso_code: '', email: '',
  phone: '', phone2: '', is_jptl: false, notes: '',
}
const EMPTY_SA: PersonFields = {
  title: '', first_name: '', family_name: '',
  country: '', iso_code: '', email: '',
  phone: '', notes: '',
}

function PersonForm({
  initial,
  showJptl,
  showPhone2,
  onSave,
  onCancel,
  saving,
}: {
  initial: PersonFields
  showJptl?: boolean
  showPhone2?: boolean
  onSave: (v: PersonFields) => void
  onCancel: () => void
  saving?: boolean
}) {
  const [v, setV] = useState<PersonFields>(initial)
  const f = (k: keyof PersonFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Title</label>
          <select value={v.title} onChange={f('title')}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">—</option>
            {['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">First Name *</label>
          <input value={v.first_name} onChange={f('first_name')}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Family Name *</label>
          <input value={v.family_name} onChange={f('family_name')}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Country</label>
          <input value={v.country} onChange={f('country')}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">ISO Code</label>
          <input value={v.iso_code} onChange={f('iso_code')} maxLength={3} placeholder="e.g. DE"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Email</label>
          <input value={v.email} onChange={f('email')} type="email"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Phone</label>
          <input value={v.phone} onChange={f('phone')}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        {showPhone2 && (
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Phone 2</label>
            <input value={v.phone2 ?? ''} onChange={f('phone2')}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        )}
      </div>
      {showJptl && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={!!v.is_jptl}
            onChange={e => setV(prev => ({ ...prev, is_jptl: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span className="text-sm text-gray-700 font-medium">This JP is also a Jury President Team Leader (JPTL)</span>
        </label>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
        <textarea value={v.notes} onChange={f('notes')} rows={2}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" loading={saving} onClick={() => onSave(v)}>Save</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// ── JP Row ────────────────────────────────────────────────────────────────────

function JpRow({ jp }: { jp: GlobalJuryPresident }) {
  const [editing, setEditing] = useState(false)
  const upsert = useUpsertJuryPresident()
  const del    = useDeleteJuryPresident()

  if (editing) {
    return (
      <PersonForm
        initial={{
          title:       jp.title       ?? '',
          first_name:  jp.first_name,
          family_name: jp.family_name,
          country:     jp.country     ?? '',
          iso_code:    jp.iso_code    ?? '',
          email:       jp.email       ?? '',
          phone:       jp.phone       ?? '',
          phone2:      jp.phone2      ?? '',
          is_jptl:     jp.is_jptl,
          notes:       jp.notes       ?? '',
        }}
        showJptl
        showPhone2
        saving={upsert.isPending}
        onCancel={() => setEditing(false)}
        onSave={v => upsert.mutate(
          { id: jp.id, ...v, updated_at: new Date().toISOString() },
          { onSuccess: () => setEditing(false) }
        )}
      />
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-3">
          {jp.iso_code && (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">{jp.iso_code}</span>
          )}
          <span className="text-sm font-medium text-gray-800">
            {[jp.title, jp.first_name, jp.family_name].filter(Boolean).join(' ')}
          </span>
          {jp.country && <span className="text-xs text-gray-400">{jp.country}</span>}
          {jp.is_jptl && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700">JPTL</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
          <button onClick={() => del.mutate(jp.id)} className="text-xs text-red-500 hover:underline ml-1">Remove</button>
        </div>
      </div>
      <div className="px-4 py-2 bg-white grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
        {jp.email && <span className="truncate">{jp.email}</span>}
        {jp.phone && <span>{jp.phone}</span>}
        {jp.phone2 && <span>{jp.phone2}</span>}
        {jp.notes && <span className="col-span-2 text-gray-400 italic">{jp.notes}</span>}
      </div>
    </div>
  )
}

// ── SA Row ────────────────────────────────────────────────────────────────────

function SaRow({ sa }: { sa: GlobalSkillsAdvisor }) {
  const [editing, setEditing] = useState(false)
  const upsert = useUpsertSkillsAdvisor()
  const del    = useDeleteSkillsAdvisor()

  if (editing) {
    return (
      <PersonForm
        initial={{
          title:       sa.title       ?? '',
          first_name:  sa.first_name,
          family_name: sa.family_name,
          country:     sa.country     ?? '',
          iso_code:    sa.iso_code    ?? '',
          email:       sa.email       ?? '',
          phone:       sa.phone       ?? '',
          notes:       sa.notes       ?? '',
        }}
        saving={upsert.isPending}
        onCancel={() => setEditing(false)}
        onSave={v => upsert.mutate(
          { id: sa.id, ...v, updated_at: new Date().toISOString() },
          { onSuccess: () => setEditing(false) }
        )}
      />
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-3">
          {sa.iso_code && (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">{sa.iso_code}</span>
          )}
          <span className="text-sm font-medium text-gray-800">
            {[sa.title, sa.first_name, sa.family_name].filter(Boolean).join(' ')}
          </span>
          {sa.country && <span className="text-xs text-gray-400">{sa.country}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">Edit</button>
          <button onClick={() => del.mutate(sa.id)} className="text-xs text-red-500 hover:underline ml-1">Remove</button>
        </div>
      </div>
      {(sa.email || sa.phone) && (
        <div className="px-4 py-2 bg-white grid grid-cols-2 gap-3 text-xs text-gray-600">
          {sa.email && <span className="truncate">{sa.email}</span>}
          {sa.phone && <span>{sa.phone}</span>}
        </div>
      )}
    </div>
  )
}

// ── Skill Allocation Panel ────────────────────────────────────────────────────

function SkillAllocationPanel() {
  const { data: skills = [] }    = useSkills()
  const { data: jps = [] }       = useJuryPresidents()
  const { data: sas = [] }       = useSkillsAdvisors()
  const { data: jpAssign = [] }  = useJpAssignments()
  const { data: saAssign = [] }  = useSaAssignments()
  const setJpForSkill  = useSetJpAssignmentsForSkill()
  const setSaForSkill  = useSetSaAssignmentsForSkill()
  const resetAllAlloc  = useResetAllAllocations()

  const jptls = jps.filter(j => j.is_jptl)

  const [selectedSkillId, setSelectedSkillId] = useState<string>('')
  const [savedSkillId, setSavedSkillId]       = useState<string | null>(null)
  const [resetDone, setResetDone]             = useState(false)

  // Local state for editing
  const [jpSelections, setJpSelections] = useState<{ jp_id: string; jptl_id: string | null }[]>([])
  const [saSelections, setSaSelections] = useState<string[]>([])

  const loadSkillAssignments = (skillId: string) => {
    setSelectedSkillId(skillId)
    setSavedSkillId(null)
    const existingJp = jpAssign.filter(a => a.skill_id === skillId).map(a => ({ jp_id: a.jp_id, jptl_id: a.jptl_id }))
    const existingSa = saAssign.filter(a => a.skill_id === skillId).map(a => a.sa_id)
    setJpSelections(existingJp)
    setSaSelections(existingSa)
  }

  const toggleJp = (jpId: string) => {
    setJpSelections(prev => {
      const exists = prev.find(a => a.jp_id === jpId)
      if (exists) return prev.filter(a => a.jp_id !== jpId)
      return [...prev, { jp_id: jpId, jptl_id: null }]
    })
  }

  const setJptlForJp = (jpId: string, jptlId: string | null) => {
    setJpSelections(prev => prev.map(a => a.jp_id === jpId ? { ...a, jptl_id: jptlId } : a))
  }

  const toggleSa = (saId: string) => {
    setSaSelections(prev => prev.includes(saId) ? prev.filter(id => id !== saId) : [...prev, saId])
  }

  const handleSave = () => {
    if (!selectedSkillId) return
    Promise.all([
      setJpForSkill.mutateAsync({ skillId: selectedSkillId, assignments: jpSelections }),
      setSaForSkill.mutateAsync({ skillId: selectedSkillId, saIds: saSelections }),
    ]).then(() => setSavedSkillId(selectedSkillId))
  }

  const selectedSkill = skills.find((s: any) => s.id === selectedSkillId)

  const handleResetAll = () => {
    if (!window.confirm(
      'This will remove ALL JP and SA allocations for every skill.\n\nThis cannot be undone. Continue?'
    )) return
    resetAllAlloc.mutate(undefined, {
      onSuccess: () => {
        setResetDone(true)
        setSelectedSkillId('')
        setJpSelections([])
        setSaSelections([])
        setTimeout(() => setResetDone(false), 4000)
      },
    })
  }

  return (
    <div className="space-y-4">

      {/* ── Reset All banner ── */}
      <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-red-800">Reset All Allocations</p>
          <p className="text-xs text-red-600 mt-0.5">
            Removes every JP and SA allocation across all skills, returning them to unassigned.
          </p>
        </div>
        {resetDone ? (
          <span className="text-xs font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg">
            ✓ All allocations cleared
          </span>
        ) : (
          <button
            onClick={handleResetAll}
            disabled={resetAllAlloc.isPending}
            className="ml-4 shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition-colors"
          >
            {resetAllAlloc.isPending ? 'Resetting…' : 'Reset All'}
          </button>
        )}
      </div>

      {/* Skill picker */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Select Skill to Allocate</label>
        <select
          value={selectedSkillId}
          onChange={e => loadSkillAssignments(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">— Choose a skill —</option>
          {(skills as any[]).map((s: any) => (
            <option key={s.id} value={s.id}>{s.skill_number} — {s.skill_name}</option>
          ))}
        </select>
      </div>

      {selectedSkillId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* JP Allocation */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-purple-50 border-b border-purple-100">
              <span className="text-sm font-medium text-purple-800">Jury Presidents (JP / JPTL)</span>
            </div>
            <div className="px-4 py-3 space-y-2 bg-white max-h-80 overflow-y-auto">
              {jps.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No jury presidents defined yet.</p>
              ) : (
                jps.map(jp => {
                  const sel = jpSelections.find(a => a.jp_id === jp.id)
                  const isSelected = !!sel
                  return (
                    <div key={jp.id} className={`border rounded-lg p-2 ${isSelected ? 'border-purple-300 bg-purple-50' : 'border-gray-100'}`}>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleJp(jp.id)}
                          className="h-4 w-4 rounded border-gray-300 text-purple-600"
                        />
                        <span className="text-sm text-gray-800 font-medium">
                          {[jp.title, jp.first_name, jp.family_name].filter(Boolean).join(' ')}
                        </span>
                        {jp.iso_code && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{jp.iso_code}</span>
                        )}
                        {jp.is_jptl && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-semibold">JPTL</span>
                        )}
                      </label>
                      {/* JPTL assignment for non-JPTL JPs when selected */}
                      {isSelected && !jp.is_jptl && jptls.length > 0 && (
                        <div className="mt-1.5 ml-6">
                          <label className="text-xs text-gray-500 mr-2">Assign to JPTL:</label>
                          <select
                            value={sel?.jptl_id ?? ''}
                            onChange={e => setJptlForJp(jp.id, e.target.value || null)}
                            className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                          >
                            <option value="">— No JPTL —</option>
                            {jptls.map(jptl => (
                              <option key={jptl.id} value={jptl.id}>
                                {[jptl.title, jptl.first_name, jptl.family_name].filter(Boolean).join(' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* SA Allocation */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-green-50 border-b border-green-100">
              <span className="text-sm font-medium text-green-800">Skills Advisors (SA)</span>
            </div>
            <div className="px-4 py-3 space-y-2 bg-white max-h-80 overflow-y-auto">
              {sas.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No skills advisors defined yet.</p>
              ) : (
                sas.map(sa => {
                  const isSelected = saSelections.includes(sa.id)
                  return (
                    <label key={sa.id} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg border ${isSelected ? 'border-green-300 bg-green-50' : 'border-gray-100'}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSa(sa.id)}
                        className="h-4 w-4 rounded border-gray-300 text-green-600"
                      />
                      <span className="text-sm text-gray-800 font-medium">
                        {[sa.title, sa.first_name, sa.family_name].filter(Boolean).join(' ')}
                      </span>
                      {sa.iso_code && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold">{sa.iso_code}</span>
                      )}
                    </label>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {selectedSkillId && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            loading={setJpForSkill.isPending || setSaForSkill.isPending}
            onClick={handleSave}
          >
            Save Allocations for {selectedSkill ? `${(selectedSkill as any).skill_number}` : 'Skill'}
          </Button>
          {savedSkillId === selectedSkillId && (
            <span className="text-xs text-green-600 font-medium">Saved</span>
          )}
        </div>
      )}

      {/* Summary: current allocations overview */}
      {jps.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">All JP Allocations</h4>
          <div className="space-y-1">
            {jps.map(jp => {
              const assigned = jpAssign.filter(a => a.jp_id === jp.id)
              const skillNames = assigned.map(a => {
                const sk = (skills as any[]).find((s: any) => s.id === a.skill_id)
                return sk ? `${sk.skill_number}` : '?'
              })
              return (
                <div key={jp.id} className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-700 w-40 truncate">
                    {[jp.first_name, jp.family_name].filter(Boolean).join(' ')}
                    {jp.is_jptl && ' (JPTL)'}
                  </span>
                  {skillNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {skillNames.map(n => (
                        <span key={n} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{n}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-300 italic">No skills assigned</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── JPTL Team View ────────────────────────────────────────────────────────────

function JptlTeamView() {
  const { data: jps = [] }      = useJuryPresidents()
  const { data: jpAssign = [] } = useJpAssignments()
  const { data: skills = [] }   = useSkills()

  const jptls = jps.filter(j => j.is_jptl)
  if (jptls.length === 0) return (
    <p className="text-xs text-gray-400 italic">No JPTL designated yet. Mark a JP as JPTL in the Jury Presidents list.</p>
  )

  return (
    <div className="space-y-4">
      {jptls.map(jptl => {
        // Find all JPs assigned under this JPTL (across all skills)
        const teamJpIds = [...new Set(
          jpAssign.filter(a => a.jptl_id === jptl.id).map(a => a.jp_id)
        )]
        const teamJps = jps.filter(j => teamJpIds.includes(j.id))

        return (
          <div key={jptl.id} className="border border-purple-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-purple-50 flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-800">JPTL</span>
              <span className="text-sm font-semibold text-purple-900">
                {[jptl.title, jptl.first_name, jptl.family_name].filter(Boolean).join(' ')}
              </span>
              {jptl.iso_code && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{jptl.iso_code}</span>}
            </div>
            <div className="px-4 py-3 bg-white">
              {teamJps.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No JPs assigned to this JPTL yet.</p>
              ) : (
                <div className="space-y-2">
                  {teamJps.map(jp => {
                    const jpSkillAssign = jpAssign.filter(a => a.jp_id === jp.id)
                    const skillNums = jpSkillAssign.map(a => {
                      const sk = (skills as any[]).find((s: any) => s.id === a.skill_id)
                      return sk ? `${(sk as any).skill_number}` : '?'
                    })
                    return (
                      <div key={jp.id} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-700">
                          {[jp.title, jp.first_name, jp.family_name].filter(Boolean).join(' ')}
                        </span>
                        {jp.iso_code && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{jp.iso_code}</span>}
                        {skillNums.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-1">
                            {skillNums.map(n => (
                              <span key={n} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Skill {n}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main JP/SA Settings Component ─────────────────────────────────────────────

type JpTab = 'roster-jp' | 'roster-sa' | 'allocate' | 'teams'

export function JuryPresidentsSettings() {
  const [tab, setTab] = useState<JpTab>('roster-jp')
  const [addingJp, setAddingJp] = useState(false)
  const [addingSa, setAddingSa] = useState(false)
  const { data: jps = [], isLoading: jpLoading } = useJuryPresidents()
  const { data: sas = [], isLoading: saLoading } = useSkillsAdvisors()
  const upsertJp = useUpsertJuryPresident()
  const upsertSa = useUpsertSkillsAdvisor()

  const tabs: { id: JpTab; label: string }[] = [
    { id: 'roster-jp', label: `Jury Presidents (${jps.length})` },
    { id: 'roster-sa', label: `Skills Advisors (${sas.length})` },
    { id: 'allocate',  label: 'Skill Allocation' },
    { id: 'teams',     label: 'JPTL Teams' },
  ]

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* JP Roster */}
      {tab === 'roster-jp' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Define all Jury Presidents globally. Mark any JP who is also a Team Leader (JPTL).
            </p>
            <Button type="button" size="sm" onClick={() => setAddingJp(true)}>+ Add JP</Button>
          </div>
          {addingJp && (
            <PersonForm
              initial={EMPTY_JP}
              showJptl
              showPhone2
              saving={upsertJp.isPending}
              onCancel={() => setAddingJp(false)}
              onSave={v => upsertJp.mutate(
                { ...v, is_jptl: !!v.is_jptl },
                { onSuccess: () => setAddingJp(false) }
              )}
            />
          )}
          {jpLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : jps.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">No jury presidents defined yet.</p>
          ) : (
            jps.map(jp => <JpRow key={jp.id} jp={jp} />)
          )}
        </div>
      )}

      {/* SA Roster */}
      {tab === 'roster-sa' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Define all Skills Advisors globally. Then allocate them to specific skills in the Skill Allocation tab.
            </p>
            <Button type="button" size="sm" onClick={() => setAddingSa(true)}>+ Add SA</Button>
          </div>
          {addingSa && (
            <PersonForm
              initial={EMPTY_SA}
              saving={upsertSa.isPending}
              onCancel={() => setAddingSa(false)}
              onSave={v => upsertSa.mutate(
                { ...v },
                { onSuccess: () => setAddingSa(false) }
              )}
            />
          )}
          {saLoading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : sas.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-4 text-center">No skills advisors defined yet.</p>
          ) : (
            sas.map(sa => <SaRow key={sa.id} sa={sa} />)
          )}
        </div>
      )}

      {/* Skill Allocation */}
      {tab === 'allocate' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Select a skill then tick which JPs and SAs are allocated to it. For each JP you can also assign which JPTL they report to for that skill.
          </p>
          <SkillAllocationPanel />
        </div>
      )}

      {/* JPTL Teams */}
      {tab === 'teams' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Overview of JPTL teams — each JPTL and the JPs assigned under them across all skills.
          </p>
          <JptlTeamView />
        </div>
      )}
    </div>
  )
}
