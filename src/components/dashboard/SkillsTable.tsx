import { skillLabel } from '@/lib/utils'
import type { FilterState } from '@/types/ui'

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
 *
 * Green  — CE, DCE and WM are all Filled AND at least 1 JP/JPTL AND at least 1 SA assigned
 * Amber  — CE, DCE and WM are all Filled BUT JP/JPTL or SA are not yet assigned
 * Red    — any of CE, DCE or WM is not Filled (regardless of JP/JPTL/SA)
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

  // Check the three key competition roles
  const KEY_ROLES = ['Chief Expert', 'Deputy Chief Expert', 'Workshop Manager'] as const
  const keyFilled = KEY_ROLES.every(rt => {
    const match = validRoles.filter(r => r.role_type === rt)
    // A key role counts as filled if at least one row for that type has status Filled.
    // If no row exists for this type at all, it counts as missing (red).
    return match.length > 0 && match.some(r => r.status === 'Filled')
  })

  if (!keyFilled) {
    // Describe which key role(s) are missing for the tooltip
    const missing = KEY_ROLES.filter(rt => {
      const match = validRoles.filter(r => r.role_type === rt)
      return match.length === 0 || !match.some(r => r.status === 'Filled')
    })
    return { colour: 'red', label: `Not filled: ${missing.join(', ')}` }
  }

  // CE/DCE/WM all filled — check JP/JPTL + SA
  const jpOk = hasJp || hasJptl   // at least one JP or JPTL assigned
  const saOk = hasSa               // at least one SA assigned

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
 * Green — all applicable docs (non-Not-Applicable) are Complete
 * Amber — TD is Complete but other docs are missing
 * Red   — Technical Description is not Complete
 * Grey  — no doc data
 */
function docsTrafficLight(docs: { doc_type: string; status: string }[]): { colour: TrafficColour; label: string } {
  const validDocs = (docs ?? []).filter(Boolean)
  if (validDocs.length === 0) return { colour: 'grey', label: 'No document data' }

  const applicable = validDocs.filter(d => d.status !== 'Not Applicable')
  if (applicable.length === 0) return { colour: 'grey', label: 'All documents not applicable' }

  const td = applicable.find(d => d.doc_type === 'Technical Description (TD)')
  const tdComplete = td ? td.status === 'Complete' : false
  const allComplete = applicable.every(d => d.status === 'Complete')

  if (allComplete) return { colour: 'green', label: 'All documents complete' }
  if (tdComplete)  return { colour: 'amber', label: 'TD complete; other documents missing' }
  return { colour: 'red', label: 'Technical Description not complete' }
}

/**
 * POSITION traffic light
 * Green — Test Project Ready AND Marking Scheme Ready AND Marking Scheme Tested are all Yes
 * Red   — any of the three are not Yes (no amber for position)
 * Grey  — no position data
 */
function positionTrafficLight(positions: {
  readiness_flag: boolean
  test_project_ready: boolean | null
  marking_scheme_ready: boolean | null
  marking_scheme_tested: boolean | null
}[]): { colour: TrafficColour; label: string } {
  // Filter out any null/undefined entries Supabase may return from the join
  const valid = (positions ?? []).filter(Boolean)
  if (valid.length === 0) return { colour: 'grey', label: 'No position data' }
  const pos = valid[0]
  if (pos.test_project_ready && pos.marking_scheme_ready && pos.marking_scheme_tested) {
    return { colour: 'green', label: 'Test project ready, marking scheme ready and tested' }
  }
  return { colour: 'red', label: 'Test project or marking scheme not ready' }
}

// ── Main table ────────────────────────────────────────────────────────────────

export function SkillsTable({ skills, filters, onSelect }: SkillsTableProps) {
  const filtered = skills.filter((s: SkillRow) => {
    const roles: { status: string; role_type: string; td_support: boolean }[] = (s.competition_roles ?? []).filter(Boolean)
    const docs:  { status: string }[] = (s.supporting_documents ?? []).filter(Boolean)
    // skill_positions may come back as object (1:1 FK) or array — normalise to array
    const rawPos = s.skill_positions
    const positions: { readiness_flag: boolean }[] = rawPos
      ? (Array.isArray(rawPos) ? rawPos.filter(Boolean) : [rawPos])
      : []

    const q = filters.search.toLowerCase()
    if (q) {
      const label = skillLabel(s.skill_number, s.skill_name).toLowerCase()
      if (!label.includes(q)) return false
    }

    if (filters.roleStatus !== 'all') {
      if (!roles.some(r => r.status === filters.roleStatus)) return false
    }

    if (filters.docStatus !== 'all') {
      if (!docs.some(d => d.status === filters.docStatus)) return false
    }

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
      case 'not_ready':
        if (positions.some(p => p.readiness_flag)) return false
        break
      case 'has_vacant':
        if (!roles.some(r => r.status === 'Vacant')) return false
        break
      case 'new_roles':
        if (!roles.some((r: any) => r.is_new)) return false
        break
      case 'td_support':
        if (!roles.some(r => r.td_support)) return false
        break
    }

    return true
  })

  if (filtered.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        No skills match the current filters.
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
            {/* Status columns — equal fixed width */}
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
          {filtered.map((s: SkillRow) => {
            const roles     = (s.competition_roles    ?? []).filter(Boolean)
            const docs      = (s.supporting_documents ?? []).filter(Boolean)
            // skill_positions may come back as object (1:1 FK) or array — normalise
            const rawPos2   = s.skill_positions
            const positions = rawPos2
              ? (Array.isArray(rawPos2) ? rawPos2.filter(Boolean) : [rawPos2])
              : []

            // For roles that can have multiple rows (e.g. multiple WMs across SC/TC),
            // prefer the Filled row so the dashboard shows the best available status.
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

            // Mini card for global role (JP / JPTL / SA)
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

            const rolesTL    = rolesTrafficLight(
              roles,
              skillJPs.length   > 0,
              skillJPTLs.length > 0,
              skillSAs.length   > 0,
            )
            const docsTL     = docsTrafficLight(docs)
            const positionTL = positionTrafficLight(positions)

            return (
              <tr
                key={s.id}
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
                        {ce.td_support && <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">V</span>}
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
                        {dce.td_support && <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">V</span>}
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

                {/* Updated — shows the date of the most recent audit log entry for this skill */}
                <td className="w-28 px-3 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {s.latest_audit_at
                    ? new Date(s.latest_audit_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : <span className="text-gray-300">—</span>
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 border-t flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="font-medium text-gray-600">Roles indicator:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> CE+DCE+WM filled &amp; JP/JPTL+SA assigned</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> CE/DCE/WM filled — JP/JPTL or SA missing</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> CE, DCE or WM not filled</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block"></span> No data yet</span>
        <span className="ml-auto text-gray-400">Hover dots for detail · {filtered.length} of {skills.length} skills shown</span>
      </div>
    </div>
  )
}
