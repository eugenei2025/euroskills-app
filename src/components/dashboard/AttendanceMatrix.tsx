import { skillLabel } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SkillRow = any

interface MandatoryRoleRow {
  event_type: string
  role_abbr: string
}

interface AttendanceMatrixProps {
  skills: SkillRow[]
  mandatoryRoles: MandatoryRoleRow[]
  onSelectSkill: (skillId: string) => void
}

// ── Constants ──────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['SDW', 'CPM', 'EuroSkills Competition'] as const
const EVENT_LABELS: Record<string, string> = {
  'SDW':                    'Skills Development Workshop (SDW)',
  'CPM':                    'Competition Preparation Meeting (CPM)',
  'EuroSkills Competition': 'EuroSkills Competition (EC)',
}

// ── Colour logic ───────────────────────────────────────────────────────────────

type CellColour = 'green' | 'yellow' | 'red' | 'blue' | 'lightgray' | 'empty'

interface CellData {
  colour: CellColour
  tooltip: string
  /** sub name if blue (substitute attending) */
  subName?: string
}

function getAttendeeStatus(
  attendeeJson: string | null | undefined,
  roleAbbr: string
): { status: string; is_substitute: boolean; subName: string } {
  if (!attendeeJson) return { status: 'Not Applicable', is_substitute: false, subName: '' }
  try {
    const arr = JSON.parse(attendeeJson)
    if (!Array.isArray(arr)) return { status: 'Not Applicable', is_substitute: false, subName: '' }
    const found = arr.find((a: { role: string }) => a.role === roleAbbr)
    if (!found) return { status: 'Not Applicable', is_substitute: false, subName: '' }
    const subName = [found.sub_first_name, found.sub_family_name].filter(Boolean).join(' ')
    return { status: found.status ?? 'Not Applicable', is_substitute: !!found.is_substitute, subName }
  } catch {
    return { status: 'Not Applicable', is_substitute: false, subName: '' }
  }
}

function resolveCellColour(
  skill: SkillRow,
  eventType: string,
  roleAbbr: string,
  isMandatory: boolean
): CellData {
  if (!isMandatory) {
    return { colour: 'lightgray', tooltip: 'Not required for this event' }
  }

  const events: { event_type: string; attendee_name: string | null }[] =
    (skill.skill_events ?? []).filter(Boolean)
  const ev = events.find(e => e.event_type === eventType)

  if (!ev) {
    return { colour: 'empty', tooltip: 'No event data recorded' }
  }

  const { status, is_substitute, subName } = getAttendeeStatus(ev.attendee_name, roleAbbr)

  // Substitute attending — blue
  if (is_substitute) {
    const tip = subName
      ? `Substitute attending: ${subName}`
      : 'Substitute attending'
    return { colour: 'blue', tooltip: tip, subName }
  }

  switch (status) {
    case 'Attending':
    case 'Package Secured':
      return { colour: 'green',     tooltip: status }
    case 'Tentative':
      return { colour: 'yellow',    tooltip: 'Tentative' }
    case 'Not Attending':
      return { colour: 'red',       tooltip: 'Not Attending' }
    case 'Not Applicable':
      return { colour: 'lightgray', tooltip: 'Not Applicable' }
    default:
      return { colour: 'empty',     tooltip: status }
  }
}

// ── Cell component ─────────────────────────────────────────────────────────────

const COLOUR_CLASSES: Record<CellColour, string> = {
  green:     'bg-green-500  hover:bg-green-600  cursor-pointer',
  yellow:    'bg-yellow-400 hover:bg-yellow-500 cursor-pointer',
  red:       'bg-red-500    hover:bg-red-600    cursor-pointer',
  blue:      'bg-blue-500   hover:bg-blue-600   cursor-pointer',
  lightgray: 'bg-gray-100   cursor-default',
  empty:     'bg-gray-200   hover:bg-gray-300   cursor-pointer border border-dashed border-gray-300',
}

function MatrixCell({
  cell,
  onClick,
}: {
  cell: CellData
  onClick: () => void
}) {
  const cls = COLOUR_CLASSES[cell.colour]
  const isClickable = cell.colour !== 'lightgray'

  return (
    <td className="p-0.5">
      <button
        title={cell.tooltip}
        onClick={isClickable ? onClick : undefined}
        className={`w-full h-7 rounded transition-colors text-xs font-bold text-white ${cls}`}
        style={{ minWidth: '2rem' }}
      >
        {cell.colour === 'blue' && '↔'}
        {cell.colour === 'empty' && '?'}
      </button>
    </td>
  )
}

// ── Group columns by event ─────────────────────────────────────────────────────

interface EventGroup {
  eventType: string
  roles: string[]
}

// ── AttendanceMatrix ───────────────────────────────────────────────────────────

export function AttendanceMatrix({
  skills,
  mandatoryRoles,
  onSelectSkill,
}: AttendanceMatrixProps) {
  // Build event groups: only events that have at least one mandatory role configured
  const eventGroups: EventGroup[] = EVENT_TYPES
    .map(et => ({
      eventType: et,
      roles: mandatoryRoles.filter(r => r.event_type === et).map(r => r.role_abbr),
    }))
    .filter(g => g.roles.length > 0)

  if (eventGroups.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        No mandatory roles have been configured yet. Go to{' '}
        <strong>Settings → Event Mandatory Roles</strong> to define which roles
        must attend each event.
      </div>
    )
  }

  if (skills.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        No skills found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          {/* Row 1: Event group headers */}
          <tr className="bg-gray-50">
            <th
              rowSpan={2}
              className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide border-b border-r border-gray-200 whitespace-nowrap min-w-[180px]"
            >
              Skill
            </th>
            {eventGroups.map(g => (
              <th
                key={g.eventType}
                colSpan={g.roles.length}
                className="px-2 py-2 text-center text-xs font-bold text-white uppercase tracking-wide border-b border-r border-gray-200"
                style={{
                  background:
                    g.eventType === 'SDW'                    ? '#2563eb' :
                    g.eventType === 'CPM'                    ? '#0d9488' :
                    /* EuroSkills Competition */               '#7c3aed',
                }}
              >
                {EVENT_LABELS[g.eventType] ?? g.eventType}
              </th>
            ))}
          </tr>

          {/* Row 2: Role abbreviation headers */}
          <tr className="bg-gray-100">
            {eventGroups.map(g =>
              g.roles.map((role, roleIdx) => (
                <th
                  key={`${g.eventType}-${role}`}
                  className={`px-1 py-2 text-center font-bold text-gray-600 uppercase tracking-wide border-b border-gray-200 ${
                    roleIdx === g.roles.length - 1 ? 'border-r border-gray-200' : ''
                  }`}
                  style={{ minWidth: '2.5rem' }}
                >
                  {role}
                </th>
              ))
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {skills.map((skill: SkillRow) => (
            <tr
              key={skill.id}
              className="hover:bg-blue-50/30 transition-colors group"
            >
              {/* Skill name — sticky left */}
              <td
                className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 px-4 py-1.5 font-medium text-gray-900 text-xs border-r border-gray-100 whitespace-nowrap max-w-[220px] truncate"
                title={skillLabel(skill.skill_number, skill.skill_name)}
              >
                <button
                  onClick={() => onSelectSkill(skill.id)}
                  className="text-left hover:text-blue-700 transition-colors truncate block w-full"
                >
                  {skillLabel(skill.skill_number, skill.skill_name)}
                </button>
              </td>

              {/* Attendance cells */}
              {eventGroups.map(g =>
                g.roles.map(role => {
                  const cell = resolveCellColour(skill, g.eventType, role, true)
                  return (
                    <MatrixCell
                      key={`${g.eventType}-${role}`}
                      cell={cell}
                      onClick={() => onSelectSkill(skill.id)}
                    />
                  )
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 border-t flex flex-wrap items-center gap-5 text-xs text-gray-600">
        <span className="font-semibold text-gray-700 mr-1">Attendance key:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-green-500 inline-block"></span>
          Attending / Package Secured
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-yellow-400 inline-block"></span>
          Tentative
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-red-500 inline-block"></span>
          Not Attending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-blue-500 inline-block flex items-center justify-center text-white font-bold text-xs">↔</span>
          Substitute attending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-gray-100 border border-gray-300 inline-block"></span>
          Not required for this event
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded bg-gray-200 border border-dashed border-gray-300 inline-block"></span>
          No data recorded
        </span>
        <span className="ml-auto text-gray-400">
          Click any cell or skill name to open skill detail · {skills.length} skills
        </span>
      </div>
    </div>
  )
}
