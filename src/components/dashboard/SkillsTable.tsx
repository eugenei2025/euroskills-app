import { skillLabel } from '@/lib/utils'
import type { FilterState, GroupByMode } from '@/types/ui'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SkillRow = any

interface SkillsTableProps {
  skills: SkillRow[]
  filters: FilterState
  onSelect: (skillId: string) => void
}

// ── Traffic light dot ─────────────────────────────────────────────────────────

type TrafficColour = 'green' | 'amber' | 'red' | 'grey'

function TrafficDot({ colour, title }: { colour: TrafficColour; title: string }) {
  const cls: Record<TrafficColour, string> = {
    green: 'bg-green-500',
    amber: 'bg-amber-400',
    red:   'bg-red-500',
    grey:  'bg-gray-300',
  }
  return (
    <span
      title={title}
      className={`inline-block w-3.5 h-3.5 rounded-full ${cls[colour]}`}
    />
  )
}

// ── Traffic light logic ───────────────────────────────────────────────────────

/**
 * ROLES traffic light
 * Green  — CE, DCE and WM all Filled AND at least 1 JP/JPTL AND at least 1 SA
 * Amber  — CE, DCE and WM all Filled BUT JP/JPTL or SA not yet assigned
 * Red    — any of CE, DCE or WM not Filled
 * Grey   — no role data at all
 */
function rolesTrafficLight(
  roles: { role_type: string; status: string }[],
  hasJp: boolean,
  hasJptl: boolean,
  hasSa: boolean,
): { colour: TrafficColour; label: string } {
  const validRoles = (roles ?? []).filter(Boolean)
  if (validRoles.length === 0 && !hasJp && !hasJptl && !hasSa) {
    return { colour: 'grey', label: 'No role data' }
  }

  const KEY_ROLES = ['Chief Expert', 'Deputy Chief Expert', 'Workshop Manager'] as const
  const keyFilled = KEY_ROLES.every(rt => {
    const match = validRoles.filter(r => r.role_type === rt)
    return match.length > 0 && match.some(r => r.status === 'Filled')
  })

  if (!keyFilled) {
    const missing = KEY_ROLES.filter(rt => {
      const match = validRoles.filter(r => r.role_type === rt)
      return match.length === 0 || !match.some(r => r.status === 'Filled')
    })
    return { colour: 'red', label: `Not filled: ${missing.join(', ')}` }
  }

  const jpOk = hasJp || hasJptl
  const saOk = hasSa

  if (jpOk && saOk) {
    return { colour: 'green', label: 'CE, DCE, WM filled and JP/JPTL & SA assigned' }
  }

  const missing: string[] = []
  if (!jpOk) missing.push('JP/JPTL')
  if (!saOk) missing.push('SA')
  return { colour: 'amber', label: `CE/DCE/WM filled — ${missing.join(' & ')} not yet assigned` }
}

/**
 * DOCUMENTS traffic light
 * Green — ALL applicable docs Complete
 * Amber — TD + CTL both Complete (SAG/WL can still be missing/pending)
 * Red   — TD or CTL not complete
 * Grey  — no doc data
 */
function docsTrafficLight(docs: { doc_type: string; status: string }[]): { colour: TrafficColour; label: string } {
  const validDocs = (docs ?? []).filter(Boolean)
  if (validDocs.length === 0) return { colour: 'grey', label: 'No document data' }

  const applicable = validDocs.filter(d => d.status !== 'Not Applicable')
  if (applicable.length === 0) return { colour: 'grey', label: 'All documents not applicable' }

  const allComplete = applicable.every(d => d.status === 'Complete')
  if (allComplete) return { colour: 'green', label: 'All documents complete' }

  const td  = applicable.find(d => d.doc_type.startsWith('Technical Description'))
  const ctl = applicable.find(d => d.doc_type.startsWith('Competitor Tool List') || d.doc_type.startsWith('CTL'))
  const tdComplete  = td  ? td.status  === 'Complete' : false
  const ctlComplete = ctl ? ctl.status === 'Complete' : false

  if (tdComplete && ctlComplete) {
    return { colour: 'amber', label: 'TD and CTL complete; SAG/WL may still be pending' }
  }
  const missing: string[] = []
  if (!tdComplete)  missing.push('TD')
  if (!ctlComplete) missing.push('CTL')
  return { colour: 'red', label: `Not complete: ${missing.join(', ')}` }
}

/**
 * POSITION (Test Project) traffic light
 * Green — TP Ready + Validated + MS Ready + MS Tested
 * Amber — TP Ready + Validated (marking scheme pending)
 * Red   — TP not ready or not validated
 * Grey  — no position data
 */
function positionTrafficLight(positions: {
  readiness_flag: boolean
  test_project_ready: boolean | null
  marking_scheme_ready: boolean | null
  marking_scheme_tested: boolean | null
  test_project_validated: boolean | null
}[]): { colour: TrafficColour; label: string } {
  const valid = (positions ?? []).filter(Boolean)
  if (valid.length === 0) return { colour: 'grey', label: 'No Test Project data' }
  const pos = valid[0]

  const tpReady     = Boolean(pos.test_project_ready)
  const tpValidated = Boolean(pos.test_project_validated)
  const msReady     = Boolean(pos.marking_scheme_ready)
  const msTested    = Boolean(pos.marking_scheme_tested)

  if (tpReady && tpValidated && msReady && msTested) {
    return { colour: 'green', label: 'TP ready + validated; marking scheme ready and tested' }
  }
  if (tpReady && tpValidated) {
    return { colour: 'amber', label: 'TP ready and validated — marking scheme still pending' }
  }
  const missing: string[] = []
  if (!tpReady)     missing.push('TP not ready')
  if (!tpValidated) missing.push('TP not validated')
  return { colour: 'red', label: missing.join('; ') }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tlColourLabel(c: TrafficColour): string {
  return c === 'green' ? 'Complete'
    : c === 'amber' ? 'Partial'
    : c === 'red'   ? 'Incomplete'
    : 'No data'
}

function tlOrder(c: TrafficColour): number {
  return c === 'green' ? 0 : c === 'amber' ? 1 : c === 'red' ? 2 : 3
}

// ── Filtering ─────────────────────────────────────────────────────────────────

function applyFilters(skills: SkillRow[], filters: FilterState): SkillRow[] {
  return skills.filter((s: SkillRow) => {
    const roles: { status: string; role_type: string }[] = (s.competition_roles ?? []).filter(Boolean)
    const docs:  { status: string; doc_type: string }[]  = (s.supporting_documents ?? []).filter(Boolean)
    const rawPos = s.skill_positions
    const positions: {
      readiness_flag: boolean
      test_project_ready: boolean | null
      test_project_validated: boolean | null
      test_project_delivered: string | null
      tp_agreed_delivery_date: string | null
      marking_scheme_ready: boolean | null
      marking_scheme_tested: boolean | null
    }[] = rawPos
      ? (Array.isArray(rawPos) ? rawPos.filter(Boolean) : [rawPos])
      : []
    const pos = positions[0] ?? null

    // ── Text search ──────────────────────────────────────────────────────────
    const q = filters.search.toLowerCase()
    if (q) {
      const label = skillLabel(s.skill_number, s.skill_name).toLowerCase()
      if (!label.includes(q)) return false
    }

    // ── Role type + status (combined) ────────────────────────────────────────
    // If roleType is set: skill must have at least one row with that role_type
    // If roleStatus is also set: that row must also match the status
    if (filters.roleType !== 'all') {
      const matching = roles.filter(r => r.role_type === filters.roleType)
      if (matching.length === 0) return false
      if (filters.roleStatus !== 'all') {
        if (!matching.some(r => r.status === filters.roleStatus)) return false
      }
    } else if (filters.roleStatus !== 'all') {
      // No specific role type — just require any role with that status
      if (!roles.some(r => r.status === filters.roleStatus)) return false
    }

    // ── Document type + status (combined) ────────────────────────────────────
    if (filters.docType !== 'all') {
      const matchingDocs = docs.filter(d => d.doc_type === filters.docType)
      if (matchingDocs.length === 0) return false
      if (filters.docStatus !== 'all') {
        if (!matchingDocs.some(d => d.status === filters.docStatus)) return false
      }
    } else if (filters.docStatus !== 'all') {
      if (!docs.some(d => d.status === filters.docStatus)) return false
    }

    // ── TP status dropdown ───────────────────────────────────────────────────
    if (filters.tpStatus !== 'all') {
      if (!pos) return false
      switch (filters.tpStatus) {
        case 'tp_ready':
          if (!pos.test_project_ready) return false
          break
        case 'tp_validated':
          if (!pos.test_project_validated) return false
          break
        case 'tp_delivered':
          if (!pos.test_project_delivered) return false
          break
        case 'ms_ready':
          if (!pos.marking_scheme_ready) return false
          break
        case 'ms_tested':
          if (!pos.marking_scheme_tested) return false
          break
        case 'tp_not_ready':
          if (pos.test_project_ready) return false
          break
        case 'tp_overdue': {
          const today = new Date().toISOString().slice(0, 10)
          if (!pos.tp_agreed_delivery_date) return false
          if (pos.tp_agreed_delivery_date >= today) return false
          if (pos.test_project_ready) return false
          break
        }
        case 'tp_incomplete':
          if (
            pos.test_project_ready &&
            pos.test_project_validated &&
            pos.marking_scheme_ready &&
            pos.marking_scheme_tested
          ) return false
          break
      }
    }

    // ── Quick filters ────────────────────────────────────────────────────────
    switch (filters.quickFilter) {
      case 'missing_ce':
        if (roles.some(r => r.role_type === 'Chief Expert' && r.status === 'Filled')) return false
        break
      case 'missing_dce':
        if (roles.some(r => r.role_type === 'Deputy Chief Expert' && r.status === 'Filled')) return false
        break
      case 'missing_wm':
        if (roles.some(r => r.role_type === 'Workshop Manager' && r.status === 'Filled')) return false
        break
      case 'no_docs':
        if (docs.length > 0) return false
        break
      case 'docs_incomplete':
        if (docs.every(d => d.status === 'Complete' || d.status === 'Approved')) return false
        if (docs.length === 0) return false
        break
      case 'has_vacant':
        if (!roles.some(r => r.status === 'Vacant')) return false
        break
      case 'missing_tp':
        if (pos?.test_project_ready) return false
        break
      case 'missing_ms':
        if (pos?.marking_scheme_ready && pos?.marking_scheme_tested) return false
        break
    }

    return true
  })
}

// ── Grouping ──────────────────────────────────────────────────────────────────

interface Group {
  key: string
  label: string
  colour?: TrafficColour
  skills: SkillRow[]
}

function groupSkills(skills: SkillRow[], groupBy: GroupByMode): Group[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: '', skills }]
  }

  const buckets = new Map<string, SkillRow[]>()

  for (const s of skills) {
    const roles     = (s.competition_roles    ?? []).filter(Boolean)
    const docs      = (s.supporting_documents ?? []).filter(Boolean)
    const rawPos    = s.skill_positions
    const positions = rawPos
      ? (Array.isArray(rawPos) ? rawPos.filter(Boolean) : [rawPos])
      : []

    let keys: string[] = []

    if (groupBy === 'roles_tl') {
      const jps   = s.skill_jps   ?? []
      const jptls = s.skill_jptls ?? []
      const sas   = s.skill_sas   ?? []
      const tl    = rolesTrafficLight(roles, jps.length > 0, jptls.length > 0, sas.length > 0)
      keys = [`${tlOrder(tl.colour)}__${tl.colour}__${tlColourLabel(tl.colour)}`]
    }

    else if (groupBy === 'docs_tl') {
      const tl = docsTrafficLight(docs)
      keys = [`${tlOrder(tl.colour)}__${tl.colour}__${tlColourLabel(tl.colour)}`]
    }

    else if (groupBy === 'tp_status') {
      const tl = positionTrafficLight(positions)
      keys = [`${tlOrder(tl.colour)}__${tl.colour}__${tlColourLabel(tl.colour)}`]
    }

    else if (groupBy === 'doc_status') {
      // One group per doc_type → status combination, skill appears in each applicable group
      if (docs.length === 0) {
        keys = ['zz__grey__No document data']
      } else {
        keys = docs.map((d: { doc_type: string; status: string }) => `${d.doc_type} — ${d.status}`)
      }
    }

    else if (groupBy === 'role_type') {
      if (roles.length === 0) {
        keys = ['zz__No role data']
      } else {
        // Unique role types for this skill
        const seen = new Set<string>()
        for (const r of roles) {
          if (!seen.has(r.role_type)) {
            seen.add(r.role_type)
            keys.push(r.role_type)
          }
        }
      }
    }

    for (const k of keys) {
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k)!.push(s)
    }
  }

  // Sort bucket keys and build groups
  const sorted = [...buckets.keys()].sort()

  return sorted.map(k => {
    // Key format for TL groups: "order__colour__label"
    const parts = k.split('__')
    if (parts.length === 3 && ['green', 'amber', 'red', 'grey'].includes(parts[1])) {
      return {
        key: k,
        label: parts[2],
        colour: parts[1] as TrafficColour,
        skills: buckets.get(k)!,
      }
    }
    return {
      key: k,
      label: k.replace(/^zz__/, ''),
      skills: buckets.get(k)!,
    }
  })
}

// ── Group header ──────────────────────────────────────────────────────────────

function GroupHeader({ group, groupBy, colSpan }: { group: Group; groupBy: GroupByMode; colSpan: number }) {
  const colourBg: Record<TrafficColour, string> = {
    green: 'bg-green-50 border-green-200 text-green-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red:   'bg-red-50 border-red-200 text-red-800',
    grey:  'bg-gray-50 border-gray-200 text-gray-500',
  }

  const groupTitle: Partial<Record<GroupByMode, string>> = {
    roles_tl:  'Roles Status',
    docs_tl:   'Documents Status',
    tp_status: 'Test Project Status',
    doc_status:'Document Type',
    role_type: 'Role Type',
  }

  const cls = group.colour
    ? colourBg[group.colour]
    : 'bg-indigo-50 border-indigo-200 text-indigo-800'

  return (
    <tr>
      <td colSpan={colSpan} className={`px-4 py-2 border-t border-b ${cls}`}>
        <div className="flex items-center gap-2">
          {group.colour && (
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
              group.colour === 'green' ? 'bg-green-500'
              : group.colour === 'amber' ? 'bg-amber-400'
              : group.colour === 'red'   ? 'bg-red-500'
              : 'bg-gray-300'
            }`} />
          )}
          <span className="text-xs font-semibold uppercase tracking-wide">
            {groupTitle[groupBy] ? `${groupTitle[groupBy]}: ` : ''}{group.label}
          </span>
          <span className="ml-auto text-xs opacity-70">{group.skills.length} skill{group.skills.length !== 1 ? 's' : ''}</span>
        </div>
      </td>
    </tr>
  )
}

// ── Skill row ─────────────────────────────────────────────────────────────────

function SkillDataRow({ s, onSelect }: { s: SkillRow; onSelect: (id: string) => void }) {
  const roles     = (s.competition_roles    ?? []).filter(Boolean)
  const docs      = (s.supporting_documents ?? []).filter(Boolean)
  const rawPos2   = s.skill_positions
  const positions = rawPos2
    ? (Array.isArray(rawPos2) ? rawPos2.filter(Boolean) : [rawPos2])
    : []

  const pickBest = (type: string) => {
    const matches = roles.filter((r: any) => r.role_type === type)
    return matches.find((r: any) => r.status === 'Filled')
      ?? matches.find((r: any) => r.status !== 'Vacant')
      ?? matches[0]
      ?? null
  }
  const ce  = pickBest('Chief Expert')
  const dce = pickBest('Deputy Chief Expert')
  const wm  = pickBest('Workshop Manager')

  const skillJPs:   any[] = s.skill_jps   ?? []
  const skillJPTLs: any[] = s.skill_jptls ?? []
  const skillSAs:   any[] = s.skill_sas   ?? []

  const personLabel = (r: any) =>
    r ? [r.first_name, r.family_name].filter(Boolean).join(' ') : null

  const GlobalRoleCell = ({ people }: { people: any[] }) => {
    if (!people || people.length === 0) {
      return <span className="text-gray-300 text-xs">—</span>
    }
    return (
      <div className="space-y-1">
        {people.map((p: any) => (
          <div key={p.id} className="flex items-center gap-1">
            <span className="text-gray-800 text-xs font-medium truncate max-w-[90px]">
              {[p.first_name, p.family_name].filter(Boolean).join(' ')}
            </span>
            {p.iso_code && (
              <span className="px-1 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700 shrink-0">
                {p.iso_code}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  const rolesTL    = rolesTrafficLight(roles, skillJPs.length > 0, skillJPTLs.length > 0, skillSAs.length > 0)
  const docsTL     = docsTrafficLight(docs)
  const positionTL = positionTrafficLight(positions)

  return (
    <tr
      onClick={() => onSelect(s.id)}
      className="hover:bg-blue-50 cursor-pointer transition-colors group"
    >
      {/* Skill */}
      <td className="px-4 py-3 font-medium text-gray-900 group-hover:text-blue-700">
        {skillLabel(s.skill_number, s.skill_name)}
      </td>

      {/* CE */}
      <td className="px-3 py-3">
        {ce && ce.status === 'Filled' ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-800 text-xs font-medium">{personLabel(ce)}</span>
              {ce.iso_code && <span className="px-1 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">{ce.iso_code}</span>}
              {ce.is_new && <span className="px-1 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">New</span>}
            </div>
          </div>
        ) : ce && ce.status === 'Not Applicable' ? (
          <span className="text-gray-300 text-xs">N/A</span>
        ) : (
          <span className="text-red-400 text-xs font-medium">{ce?.status ?? 'Vacant'}</span>
        )}
      </td>

      {/* DCE */}
      <td className="px-3 py-3">
        {dce && dce.status === 'Filled' ? (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-800 text-xs font-medium">{personLabel(dce)}</span>
              {dce.iso_code && <span className="px-1 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-700">{dce.iso_code}</span>}
              {dce.is_new && <span className="px-1 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">New</span>}
            </div>
          </div>
        ) : dce && dce.status === 'Not Applicable' ? (
          <span className="text-gray-300 text-xs">N/A</span>
        ) : (
          <span className="text-red-400 text-xs font-medium">{dce?.status ?? 'Vacant'}</span>
        )}
      </td>

      {/* WM */}
      <td className="px-3 py-3">
        {wm && wm.status === 'Filled' ? (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-gray-800 text-xs font-medium">{personLabel(wm)}</span>
            {wm.iso_code && <span className="px-1 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700">{wm.iso_code}</span>}
            {wm.is_new && <span className="px-1 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">New</span>}
          </div>
        ) : wm && wm.status === 'Not Applicable' ? (
          <span className="text-gray-300 text-xs">N/A</span>
        ) : (
          <span className="text-red-400 text-xs font-medium">{wm?.status ?? 'Vacant'}</span>
        )}
      </td>

      {/* JPTL */}
      <td className="px-3 py-3"><GlobalRoleCell people={skillJPTLs} /></td>

      {/* JP */}
      <td className="px-3 py-3"><GlobalRoleCell people={skillJPs} /></td>

      {/* SA */}
      <td className="px-3 py-3 border-r border-gray-100"><GlobalRoleCell people={skillSAs} /></td>

      {/* Roles traffic light */}
      <td className="w-16 px-2 py-3 text-center bg-indigo-50/40">
        <TrafficDot colour={rolesTL.colour} title={rolesTL.label} />
      </td>

      {/* Docs traffic light */}
      <td className="w-16 px-2 py-3 text-center bg-indigo-50/40">
        <TrafficDot colour={docsTL.colour} title={docsTL.label} />
      </td>

      {/* Position traffic light */}
      <td className="w-16 px-2 py-3 text-center bg-indigo-50/40 border-r border-gray-100">
        <TrafficDot colour={positionTL.colour} title={positionTL.label} />
      </td>

      {/* Updated */}
      <td className="w-28 px-3 py-3 text-gray-400 text-xs whitespace-nowrap">
        {s.latest_audit_at
          ? new Date(s.latest_audit_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : <span className="text-gray-300">—</span>
        }
      </td>
    </tr>
  )
}

// ── Main table ────────────────────────────────────────────────────────────────

const COL_SPAN = 11

export function SkillsTable({ skills, filters, onSelect }: SkillsTableProps) {
  const filtered = applyFilters(skills, filters)
  const groups   = groupSkills(filtered, filters.groupBy)

  if (filtered.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <p className="text-gray-400 text-sm">No skills match the current filters.</p>
        <p className="text-gray-300 text-xs">Try adjusting or clearing your filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm divide-y divide-gray-200">
        <thead>
          {/* Column group labels */}
          <tr className="bg-gray-100 border-b border-gray-200">
            <th colSpan={7} className="px-4 py-1.5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest border-r border-gray-300">
              Personnel
            </th>
            <th colSpan={3} className="px-4 py-1.5 text-center text-xs font-bold text-indigo-600 uppercase tracking-widest border-r border-gray-200 bg-indigo-50">
              Status Overview
            </th>
            <th className="px-4 py-1.5" />
          </tr>
          {/* Column headers */}
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Skill</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-blue-600 uppercase tracking-wide">CE</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-sky-600 uppercase tracking-wide">DCE</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-emerald-600 uppercase tracking-wide">WM</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-violet-600 uppercase tracking-wide">JPTL</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wide">JP</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-teal-600 uppercase tracking-wide border-r border-gray-200">SA</th>
            <th className="w-16 px-2 py-2.5 text-center text-xs font-semibold text-indigo-500 uppercase tracking-wide bg-indigo-50" title="Green=all filled, Amber=key roles only, Red=CE/DCE/WM missing">
              Roles
            </th>
            <th className="w-16 px-2 py-2.5 text-center text-xs font-semibold text-indigo-500 uppercase tracking-wide bg-indigo-50" title="Green=all complete, Amber=TD done, Red=TD missing">
              Docs
            </th>
            <th className="w-16 px-2 py-2.5 text-center text-xs font-semibold text-indigo-500 uppercase tracking-wide bg-indigo-50 border-r border-gray-200" title="Green=TP+marking scheme ready and tested">
              TP
            </th>
            <th className="w-28 px-3 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {groups.map(group => (
            <>
              {/* Group header — only when grouping is active */}
              {filters.groupBy !== 'none' && (
                <GroupHeader key={`hdr-${group.key}`} group={group} groupBy={filters.groupBy} colSpan={COL_SPAN} />
              )}
              {group.skills.map((s: SkillRow) => (
                <SkillDataRow key={s.id} s={s} onSelect={onSelect} />
              ))}
            </>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="px-4 py-4 bg-gray-50 border-t text-xs text-gray-500 space-y-3">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {/* Roles */}
          <div className="space-y-1">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-xs">Roles</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 shrink-0"></span> CE+DCE+WM filled &amp; JP/JPTL+SA assigned</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span> CE/DCE/WM filled — JP/JPTL or SA missing</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span> CE, DCE or WM not filled</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 shrink-0"></span> No data</p>
          </div>
          {/* Documents */}
          <div className="space-y-1">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-xs">Documents</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 shrink-0"></span> All documents complete</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span> TD &amp; CTL complete (SAG/WL may be pending)</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span> TD or CTL not complete</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 shrink-0"></span> No data</p>
          </div>
          {/* Test Project */}
          <div className="space-y-1">
            <p className="font-semibold text-gray-700 uppercase tracking-wide text-xs">Test Project (TP)</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 shrink-0"></span> TP ready+validated &amp; marking scheme ready+tested</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0"></span> TP ready &amp; validated (marking scheme pending)</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 shrink-0"></span> TP not ready or not validated</p>
            <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 shrink-0"></span> No data</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs">
          Hover any dot for detail ·{' '}
          {filtered.length} of {skills.length} skills shown
          {filters.groupBy !== 'none' && ` · grouped into ${groups.length} group${groups.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  )
}
