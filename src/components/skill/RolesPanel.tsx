import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useUpsertRole, useDeleteRole } from '@/hooks/useSkillDetail'
import { competitionRoleSchema, type CompetitionRoleForm } from '@/lib/validators'
import { roleStatusVariant } from '@/lib/utils'
import { ROLE_TYPES, ROLE_TYPE_ABBR } from '@/lib/constants'
import { useCurrentUser } from '@/context/UserContext'
import type { CompetitionRole } from '@/types/database'

// Roles that require TD Support indication (CE and DCE only)
const TD_SUPPORT_ROLES = new Set(['Chief Expert', 'Deputy Chief Expert'])

// Roles for which the Votes field is relevant (CE and DCE only)
const VOTES_ROLES = new Set(['Chief Expert', 'Deputy Chief Expert'])

// ── Per-role colour palette ────────────────────────────────────────────────────
// Each role type gets a distinct accent colour for its card border + abbr badge.
const ROLE_COLOURS: Record<string, {
  border: string
  headerBg: string
  abbrBg: string
  abbrText: string
}> = {
  'Chief Expert':               { border: 'border-blue-300',   headerBg: 'bg-blue-50',   abbrBg: 'bg-blue-600',   abbrText: 'text-white' },
  'Deputy Chief Expert':        { border: 'border-sky-300',    headerBg: 'bg-sky-50',    abbrBg: 'bg-sky-500',    abbrText: 'text-white' },
  'ITPD':                       { border: 'border-orange-300', headerBg: 'bg-orange-50', abbrBg: 'bg-orange-500', abbrText: 'text-white' },
  'Sector Manager':             { border: 'border-teal-300',   headerBg: 'bg-teal-50',   abbrBg: 'bg-teal-600',   abbrText: 'text-white' },
  'Workshop Manager':           { border: 'border-emerald-300',headerBg: 'bg-emerald-50',abbrBg: 'bg-emerald-600',abbrText: 'text-white' },
  'Workshop Manager Assistant': { border: 'border-green-300',  headerBg: 'bg-green-50',  abbrBg: 'bg-green-500',  abbrText: 'text-white' },
  'ITPD Validator':             { border: 'border-amber-300',  headerBg: 'bg-amber-50',  abbrBg: 'bg-amber-500',  abbrText: 'text-white' },
  'Independent Assessor':       { border: 'border-rose-300',   headerBg: 'bg-rose-50',   abbrBg: 'bg-rose-500',   abbrText: 'text-white' },
}

const DEFAULT_COLOUR = { border: 'border-gray-200', headerBg: 'bg-gray-50', abbrBg: 'bg-gray-400', abbrText: 'text-white' }

interface RolesPanelProps {
  skillId: string
  roles: CompetitionRole[]
  hasItpd: boolean | null  // from skill_positions — if false, ITPD role is hidden
}

// Props for a single role row — now accepts optional index for multi-ITPD display
interface RoleRowProps {
  skillId: string
  roleType: string
  existing: CompetitionRole | undefined
  itpdIndex?: number  // e.g. 1, 2, 3 — shown in header for multi-ITPD
}

function RoleRow({ skillId, roleType, existing, itpdIndex }: RoleRowProps) {
  const [editing, setEditing] = useState(false)
  const upsert = useUpsertRole(skillId)
  const del    = useDeleteRole(skillId)
  const { canEdit } = useCurrentUser()

  const showTdSupport = TD_SUPPORT_ROLES.has(roleType)
  const showVotes     = VOTES_ROLES.has(roleType)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CompetitionRoleForm>({
    resolver: zodResolver(competitionRoleSchema),
    defaultValues: existing
      ? {
          role_type:   existing.role_type,
          status:      existing.status,
          is_new:      existing.is_new ?? false,
          first_name:  existing.first_name  ?? '',
          family_name: existing.family_name ?? '',
          email:       existing.email       ?? '',
          iso_code:    existing.iso_code    ?? '',
          phone:       existing.phone       ?? '',
          votes:       existing.votes       ?? undefined,
          td_support:  existing.td_support  ?? false,
          notes:       existing.notes       ?? '',
        }
      : { role_type: roleType, status: 'Vacant', is_new: false, td_support: false },
  })

  const status         = watch('status')
  const isFilled       = status === 'Filled'
  const isNotApplicable = status === 'Not Applicable'

  const onSubmit = (data: CompetitionRoleForm) => {
    const payload: Partial<CompetitionRole> = {
      ...(data as Partial<CompetitionRole>),
      id:          existing?.id,
      first_name:  isFilled ? (data.first_name  ?? null) : null,
      family_name: isFilled ? (data.family_name ?? null) : null,
      email:       isFilled ? (data.email       ?? null) : null,
      iso_code:    isFilled ? (data.iso_code    ?? null) : null,
      phone:       isFilled ? (data.phone       ?? null) : null,
      td_support:  showTdSupport ? (data.td_support ?? false) : false,
    }
    upsert.mutate(payload, {
      onSuccess: () => setEditing(false),
    })
  }

  const abbr    = ROLE_TYPE_ABBR[roleType] ?? roleType
  const colours = ROLE_COLOURS[roleType] ?? DEFAULT_COLOUR

  // For multi-ITPD: show ITPD #1, ITPD #2 etc in the header
  const headerLabel = itpdIndex != null ? `${roleType} #${itpdIndex}` : roleType

  // ── Display row ──────────────────────────────────────────────
  if (!editing) {
    // Treat both explicit "Not Applicable" and unset (no DB row) as greyed/dimmed
    const notApplicable = existing?.status === 'Not Applicable'
    const notSet        = !existing  // no DB row at all
    const isDimmed      = notApplicable || notSet

    return (
      <div className={`border rounded-lg overflow-hidden ${isDimmed ? 'border-gray-100 opacity-40' : colours.border}`}>
        {/* Role header */}
        <div className={`flex items-center justify-between px-4 py-2.5 ${isDimmed ? 'bg-gray-50' : colours.headerBg}`}>
          <div className="flex items-center gap-3">
            {/* Coloured abbr badge */}
            <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${isDimmed ? 'bg-gray-200 text-gray-400' : `${colours.abbrBg} ${colours.abbrText}`}`}>
              {abbr}{itpdIndex != null ? ` #${itpdIndex}` : ''}
            </span>
            <span className={`text-sm font-medium ${isDimmed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              {headerLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {existing ? (
              <>
                <Badge variant={roleStatusVariant(existing.status)}>{existing.status}</Badge>
                {/* New flag — shown regardless of whether Filled; it's a separate indicator */}
                {existing.is_new && !notApplicable && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                    New
                  </span>
                )}
                {showTdSupport && existing.td_support && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold">V</span>
                )}
                <button
                  onClick={() => canEdit && setEditing(true)}
                  disabled={!canEdit}
                  title={!canEdit ? 'Select your name to edit' : undefined}
                  className={`text-xs ml-2 ${canEdit ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                >
                  Edit
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-gray-400 italic">Not applicable for this skill</span>
                <button
                  onClick={() => canEdit && setEditing(true)}
                  disabled={!canEdit}
                  title={!canEdit ? 'Select your name to edit' : undefined}
                  className={`text-xs ml-2 ${canEdit ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                >
                  Set
                </button>
              </>
            )}
          </div>
        </div>

        {/* Person detail — shown when Filled (is_new is a flag on the same Filled record) */}
        {existing && existing.status === 'Filled' && (
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-100 bg-white text-xs">
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-0.5">Name</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-gray-800">
                  {[existing.first_name, existing.family_name].filter(Boolean).join(' ') || '—'}
                </p>
                {existing.is_new && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">New</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-0.5">Country</p>
              <p className="font-bold text-blue-700">{existing.iso_code ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
              <p className="text-gray-700 truncate">{existing.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
              <p className="text-gray-700">{existing.phone ?? '—'}</p>
            </div>
            {showVotes && existing.votes != null && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide mb-0.5">Votes (last ES)</p>
                <p className="text-gray-700">{existing.votes}</p>
              </div>
            )}
            {existing.notes && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-gray-400 uppercase tracking-wide mb-0.5">Notes</p>
                <p className="text-gray-600">{existing.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes for Pending/Vacant */}
        {existing && existing.status !== 'Filled' && existing.status !== 'Not Applicable' && existing.notes && (
          <div className="px-4 py-2 border-t border-gray-100 bg-white text-xs text-gray-500">
            {existing.notes}
          </div>
        )}
      </div>
    )
  }

  // ── Edit / Set form ──────────────────────────────────────────
  return (
    <div className={`border-2 rounded-lg overflow-hidden ${colours.border}`}>
      <div className={`px-4 py-2 flex items-center justify-between ${colours.headerBg}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${colours.abbrBg} ${colours.abbrText}`}>
            {abbr}{itpdIndex != null ? ` #${itpdIndex}` : ''}
          </span>
          <span className="text-sm font-semibold text-gray-800">{headerLabel}</span>
        </div>
        <button onClick={() => { setEditing(false); reset() }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 bg-white space-y-4">
        <input type="hidden" {...register('role_type')} value={roleType} />

        {/* Status + is_new */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Position Status</label>
            <select
              {...register('status')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Vacant">Position Vacant</option>
              <option value="Pending">Position Pending</option>
              <option value="Filled">Position Filled</option>
              <option value="Not Applicable">Not Applicable for this skill</option>
            </select>
          </div>

          {!isNotApplicable && (
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  {...register('is_new')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">New to this competition role</span>
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-6">First time holding this position</p>
            </div>
          )}
        </div>

        {/* Person details — only when Filled */}
        {isFilled && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Person Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">First Name</label>
                <input
                  {...register('first_name')}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Family Name</label>
                <input
                  {...register('family_name')}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email Address</label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mobile Telephone</label>
                <input
                  {...register('phone')}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Country Code (ISO)</label>
                <input
                  {...register('iso_code')}
                  maxLength={3}
                  placeholder="e.g. DE, GB, FR"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              {showVotes && (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Votes from last EuroSkills</label>
                  <input
                    {...register('votes', { valueAsNumber: true })}
                    type="number"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* TD Support — only for CE and DCE */}
            {showTdSupport && (
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    {...register('td_support')}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-green-600"
                  />
                  <span className="text-sm text-gray-700">TD Support (Technical Delegate supporting this role)</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Notes — not shown for Not Applicable */}
        {!isNotApplicable && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes about this role</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={upsert.isPending}>Save</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(false); reset() }}>Cancel</Button>
          {existing && (
            <Button type="button" size="sm" variant="danger" onClick={() => del.mutate(existing.id)}>Remove</Button>
          )}
        </div>
      </form>
    </div>
  )
}

// ── AddItpdRow: blank form to add a new ITPD entry ───────────────────────────

interface AddItpdRowProps {
  skillId: string
  itpdIndex: number
  onCancel: () => void
}

function AddItpdRow({ skillId, itpdIndex, onCancel }: AddItpdRowProps) {
  const upsert = useUpsertRole(skillId)
  const colours = ROLE_COLOURS['ITPD']
  const abbr    = ROLE_TYPE_ABBR['ITPD']

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CompetitionRoleForm>({
    resolver: zodResolver(competitionRoleSchema),
    defaultValues: { role_type: 'ITPD', status: 'Vacant', is_new: false, td_support: false },
  })

  const status  = watch('status')
  const isFilled = status === 'Filled'
  const isNA     = status === 'Not Applicable'

  const onSubmit = (data: CompetitionRoleForm) => {
    const payload: Partial<CompetitionRole> = {
      ...(data as Partial<CompetitionRole>),
      first_name:  isFilled ? (data.first_name  ?? null) : null,
      family_name: isFilled ? (data.family_name ?? null) : null,
      email:       isFilled ? (data.email       ?? null) : null,
      iso_code:    isFilled ? (data.iso_code    ?? null) : null,
      phone:       isFilled ? (data.phone       ?? null) : null,
      td_support:  false,
    }
    upsert.mutate(payload, { onSuccess: onCancel })
  }

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${colours.border}`}>
      <div className={`px-4 py-2 flex items-center justify-between ${colours.headerBg}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${colours.abbrBg} ${colours.abbrText}`}>
            {abbr} #{itpdIndex}
          </span>
          <span className="text-sm font-semibold text-gray-800">ITPD #{itpdIndex} — New Entry</span>
        </div>
        <button onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 bg-white space-y-4">
        <input type="hidden" {...register('role_type')} value="ITPD" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Position Status</label>
            <select
              {...register('status')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            >
              <option value="Vacant">Position Vacant</option>
              <option value="Pending">Position Pending</option>
              <option value="Filled">Position Filled</option>
              <option value="Not Applicable">Not Applicable for this skill</option>
            </select>
          </div>
          {!isNA && (
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input {...register('is_new')} type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                <span className="text-sm text-gray-700">New to this competition role</span>
              </label>
            </div>
          )}
        </div>

        {isFilled && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Person Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">First Name</label>
                <input {...register('first_name')}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Family Name</label>
                <input {...register('family_name')}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Email Address</label>
                <input {...register('email')} type="email"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mobile Telephone</label>
                <input {...register('phone')}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Country Code (ISO)</label>
                <input {...register('iso_code')} maxLength={3} placeholder="e.g. DE, GB, FR"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm uppercase focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>
          </div>
        )}

        {!isNA && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes about this role</label>
            <textarea {...register('notes')} rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={upsert.isPending}>Save ITPD #{itpdIndex}</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

// ── RolesPanel ────────────────────────────────────────────────────────────────

export function RolesPanel({ skillId, roles, hasItpd }: RolesPanelProps) {
  const [addingItpd, setAddingItpd] = useState(false)
  const { canEdit } = useCurrentUser()

  // Split roles into a map for single-instance roles and an array for ITPD (multi)
  const itpdRoles    = roles.filter(r => r.role_type === 'ITPD')
  const nonItpdMap   = Object.fromEntries(roles.filter(r => r.role_type !== 'ITPD').map(r => [r.role_type, r]))

  // Determine which non-ITPD role types to show
  const nonItpdTypes = ROLE_TYPES.filter(rt => rt !== 'ITPD')

  // "Not applicable" = explicitly set to Not Applicable OR has no DB row at all (no data entered).
  // Active = has a row with any status other than Not Applicable.
  const isNaOrUnset = (rt: string) =>
    !nonItpdMap[rt] || nonItpdMap[rt].status === 'Not Applicable'

  const activeNonItpd = nonItpdTypes.filter(rt => !isNaOrUnset(rt))
  const naNonItpd     = nonItpdTypes.filter(rt =>  isNaOrUnset(rt))

  // ITPD section: show when hasItpd !== false (i.e. true or null/unset)
  const showItpdSection = hasItpd !== false

  // ITPD N/A: all ITPD rows are N/A (or has_itpd === false) OR no ITPD rows exist yet
  const itpdAllNA = hasItpd === false
    || (itpdRoles.length > 0 && itpdRoles.every(r => r.status === 'Not Applicable'))
    || (itpdRoles.length === 0)  // no data yet — treat as N/A and push to bottom

  // Count of ITPD for next index
  const nextItpdIndex = itpdRoles.length + (addingItpd ? 1 : 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Competition Roles</h3>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span> New = first competition in role
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-green-700">V</span> = TD supporting (CE/DCE only)
          </span>
        </div>
      </div>

      {hasItpd === false && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          ITPD role is hidden — this skill has indicated it does not have an ITPD (set in Test Project tab).
        </p>
      )}

      {/* Active non-ITPD roles first */}
      {activeNonItpd.map(rt => (
        <RoleRow key={rt} skillId={skillId} roleType={rt} existing={nonItpdMap[rt]} />
      ))}

      {/* ── ITPD section — only shown inline when there are actual active ITPD rows ── */}
      {showItpdSection && !itpdAllNA && (
        <div className="space-y-2">

          {/* Existing ITPD rows */}
          {itpdRoles.map((itpd, idx) => (
            <RoleRow
              key={itpd.id}
              skillId={skillId}
              roleType="ITPD"
              existing={itpd}
              itpdIndex={itpdRoles.length > 1 ? idx + 1 : undefined}
            />
          ))}

          {/* Inline add form for a new ITPD */}
          {addingItpd && (
            <AddItpdRow
              skillId={skillId}
              itpdIndex={nextItpdIndex}
              onCancel={() => setAddingItpd(false)}
            />
          )}

          {/* Add Another ITPD button — only when there is already at least one and hasItpd !== false */}
          {!addingItpd && itpdRoles.length > 0 && !itpdAllNA && (
            <button
              onClick={() => canEdit && setAddingItpd(true)}
              disabled={!canEdit}
              title={!canEdit ? 'Select your name to edit' : undefined}
              className={`flex items-center gap-1.5 text-xs font-medium border rounded px-3 py-1.5 transition-colors ${
                canEdit
                  ? 'text-orange-600 hover:text-orange-800 border-orange-200 bg-orange-50 hover:bg-orange-100 cursor-pointer'
                  : 'text-gray-300 border-gray-200 bg-gray-50 cursor-not-allowed'
              }`}
            >
              <span className="text-base leading-none">+</span> Add Another ITPD
            </button>
          )}
        </div>
      )}

      {/* Not Applicable / unset roles grouped at bottom */}
      {(naNonItpd.length > 0 || itpdAllNA) && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
            Not applicable / no data for this skill ({naNonItpd.length + (itpdAllNA && showItpdSection ? 1 : 0)})
          </p>
          <div className="space-y-2">
            {/* N/A or unset non-ITPD roles */}
            {naNonItpd.map(rt => (
              <RoleRow key={rt} skillId={skillId} roleType={rt} existing={nonItpdMap[rt]} />
            ))}
            {/* N/A or unset ITPD */}
            {itpdAllNA && showItpdSection && (
              itpdRoles.length === 0
                ? <RoleRow key="itpd-placeholder" skillId={skillId} roleType="ITPD" existing={undefined} />
                : itpdRoles.map((itpd, idx) => (
                    <RoleRow
                      key={itpd.id}
                      skillId={skillId}
                      roleType="ITPD"
                      existing={itpd}
                      itpdIndex={itpdRoles.length > 1 ? idx + 1 : undefined}
                    />
                  ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
