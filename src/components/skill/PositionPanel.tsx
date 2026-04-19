import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useUpsertPosition } from '@/hooks/useSkillDetail'
import { useGlobalSettings } from '@/hooks/useGlobalSettings'
import { skillPositionSchema, type SkillPositionForm } from '@/lib/validators'
import { useCurrentUser } from '@/context/UserContext'
import type { SkillPosition } from '@/types/database'

interface PositionPanelProps {
  skillId: string
  position: SkillPosition | null | undefined
  /** How many ITPD rows exist in competition_roles for this skill */
  itpdCount?: number
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, colour, children }: {
  title: string
  colour: 'blue' | 'green' | 'gray'
  children: React.ReactNode
}) {
  const headerCls =
    colour === 'blue'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
    colour === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                         'bg-gray-50 text-gray-600 border-gray-200'
  const borderCls =
    colour === 'blue'  ? 'border-blue-200' :
    colour === 'green' ? 'border-green-200' :
                         'border-gray-200'

  return (
    <div className={`border rounded-lg overflow-hidden ${borderCls}`}>
      <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${headerCls}`}>
        {title}
      </div>
      <div className="px-4 py-4 bg-white">
        {children}
      </div>
    </div>
  )
}

// ── Yes/No badge for display ──────────────────────────────────────────────────

function YNBadge({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined) return <Badge variant="muted">Not Set</Badge>
  return <Badge variant={value ? 'success' : 'danger'}>{value ? 'Yes' : 'No'}</Badge>
}

// ── Yes/No radio group ────────────────────────────────────────────────────────

function YNRadio({
  label,
  name,
  register,
  disabled = false,
}: {
  label: string
  name: keyof SkillPositionForm
  register: ReturnType<typeof useForm<SkillPositionForm>>['register']
  disabled?: boolean
}) {
  return (
    <div className={disabled ? 'opacity-40 pointer-events-none' : ''}>
      <p className="block text-xs font-medium text-gray-600 mb-1.5">{label}</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input {...register(name)} type="radio" value="true"
            className="h-3.5 w-3.5 text-green-600 border-gray-300 focus:ring-green-500" />
          <span className="text-sm text-gray-700">Yes</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input {...register(name)} type="radio" value="false"
            className="h-3.5 w-3.5 text-red-500 border-gray-300 focus:ring-red-500" />
          <span className="text-sm text-gray-700">No</span>
        </label>
      </div>
    </div>
  )
}

// ── Display row helper ────────────────────────────────────────────────────────

function DL({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 mb-0.5">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

// ── Delivery date status helper ───────────────────────────────────────────────
// Returns the warning to display based on today vs agreed delivery date

function DeliveryStatus({ agreedDate, actualDate }: {
  agreedDate: string | null | undefined
  actualDate: string | null | undefined
}) {
  if (!agreedDate) return null

  const today   = new Date()
  today.setHours(0, 0, 0, 0)
  const agreed  = new Date(agreedDate)
  agreed.setHours(0, 0, 0, 0)
  const diffMs  = agreed.getTime() - today.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  // Already delivered — no warning needed
  if (actualDate) return null

  if (diffDays < 0) {
    // Past agreed date with no actual delivery
    return (
      <span className="ml-3 font-bold text-red-600">
        TP DELIVERY NOW OVERDUE
      </span>
    )
  }

  if (diffDays <= 14) {
    // Within 14 days of agreed date
    return (
      <span className="ml-3 font-bold text-yellow-600">
        TP DELIVERY PENDING SHORTLY
      </span>
    )
  }

  return null
}

// ── PositionPanel ─────────────────────────────────────────────────────────────

export function PositionPanel({ skillId, position, itpdCount = 0 }: PositionPanelProps) {
  const [editing, setEditing] = useState(false)
  const upsert = useUpsertPosition(skillId)
  const { data: globalSettings } = useGlobalSettings()
  const { canEdit } = useCurrentUser()

  const boolToRadio = (v: boolean | null | undefined): string | undefined => {
    if (v === true) return 'true'
    if (v === false) return 'false'
    return undefined
  }

  const { register, handleSubmit, watch, reset } = useForm<SkillPositionForm>({
    resolver: zodResolver(skillPositionSchema),
    defaultValues: position
      ? {
          // Setup
          project_type:             position.project_type      ?? undefined,
          has_itpd:                 boolToRadio(position.has_itpd)           as any,
          requires_30_percent:      boolToRadio(position.requires_30_percent) as any,
          expert_created_tp:        boolToRadio(position.expert_created_tp)  as any,
          itpd_scope:               position.itpd_scope         ?? undefined,
          change_30_description:    position.change_30_description ?? undefined,
          // Delivery
          test_project_ready:       boolToRadio(position.test_project_ready)     as any,
          marking_scheme_ready:     boolToRadio(position.marking_scheme_ready)   as any,
          marking_scheme_tested:    boolToRadio(position.marking_scheme_tested)  as any,
          test_project_validated:   boolToRadio(position.test_project_validated) as any,
          test_project_delivered:   position.test_project_delivered ?? undefined,
          tp_agreed_delivery_date:  position.tp_agreed_delivery_date ?? undefined,
          // Budget
          itpd_budget:              position.itpd_budget       ?? undefined,
          itpd_flight_costs:        position.itpd_flight_costs ?? undefined,
          itpd_spend:               position.itpd_spend        ?? undefined,
          readiness_flag:           position.readiness_flag ?? false,
          notes:                    position.notes ?? undefined,
        }
      : { readiness_flag: false },
  })

  // ── Watched values for conditional rendering ──────────────────────────────
  const watchExpertCreatedTp   = watch('expert_created_tp')  // 'true' | 'false' | undefined
  const watchHasItpd           = watch('has_itpd')           // 'true' | 'false' | undefined
  const watchRequires30        = watch('requires_30_percent') // 'true' | 'false' | undefined
  const watchItpdScope         = watch('itpd_scope')
  const watchAgreedDate        = watch('tp_agreed_delivery_date')
  const watchActualDate        = watch('test_project_delivered')

  const expertCreatedTP = watchExpertCreatedTp === 'true'
  const expertCreatedNo = watchExpertCreatedTp === 'false'
  const hasItpdYes      = watchHasItpd === 'true'
  const requires30Yes   = watchRequires30 === 'true'

  // "More than one ITPD?" — forced Yes if itpdCount >= 2
  const multipleItpdForced = itpdCount >= 2

  // Budget calc (in form)
  const watchedBudget      = watch('itpd_budget')
  const watchedFlightCosts = watch('itpd_flight_costs')
  const packagePrice       = globalSettings?.itpd_package_price ?? null

  const devBudget =
    packagePrice != null && watchedFlightCosts != null
      ? packagePrice - Number(watchedFlightCosts)
      : null

  const fmtEur = (v: number) =>
    `€${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const onSubmit = (data: SkillPositionForm) => {
    const coerceBool = (v: any): boolean | null => {
      if (v === 'true'  || v === true)  return true
      if (v === 'false' || v === false) return false
      return null
    }
    const payload: Partial<SkillPosition> = {
      ...data,
      has_itpd:               coerceBool(data.has_itpd),
      requires_30_percent:    coerceBool(data.requires_30_percent),
      expert_created_tp:      coerceBool(data.expert_created_tp),
      test_project_ready:     coerceBool(data.test_project_ready),
      marking_scheme_ready:   coerceBool(data.marking_scheme_ready),
      marking_scheme_tested:  coerceBool(data.marking_scheme_tested),
      test_project_validated: coerceBool(data.test_project_validated),
      itpd_budget:            data.itpd_budget       != null ? Number(data.itpd_budget)       : null,
      itpd_flight_costs:      data.itpd_flight_costs != null ? Number(data.itpd_flight_costs) : null,
      itpd_spend:             data.itpd_spend        != null ? Number(data.itpd_spend)        : null,
      test_project_delivered:  data.test_project_delivered  || null,
      tp_agreed_delivery_date: data.tp_agreed_delivery_date || null,
      change_30_description:  data.change_30_description || null,
    }
    upsert.mutate(payload, {
      onSuccess: () => setEditing(false),
    })
  }

  // ── Display mode ─────────────────────────────────────────────────────────────
  if (!editing && position) {
    const budget      = position.itpd_budget
    const flightCosts = position.itpd_flight_costs
    const spend       = position.itpd_spend
    const pkgPrice    = globalSettings?.itpd_package_price ?? null

    const displayDevBudget =
      pkgPrice != null && flightCosts != null ? pkgPrice - flightCosts : null
    const diff = budget != null && spend != null ? budget - spend : null

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Test Project Status</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => canEdit && setEditing(true)}
            disabled={!canEdit}
            title={!canEdit ? 'Select your name to edit' : undefined}
          >
            Edit
          </Button>
        </div>

        {/* ── SECTION 1: Setup ── */}
        <Section title="Test Project Setup" colour="blue">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <DL label="Project Type">
              <span className="font-medium text-gray-800 capitalize">{position.project_type ?? '—'}</span>
            </DL>
            <DL label="Expert Created TP"><YNBadge value={position.expert_created_tp} /></DL>

            {/* Expert = No path */}
            {position.expert_created_tp === false && (
              <DL label="Has ITPD"><YNBadge value={position.has_itpd} /></DL>
            )}
            {position.expert_created_tp === false && position.has_itpd === true && (
              <>
                <DL label="ITPD Scope">
                  <span className="font-medium text-gray-800">
                    {position.itpd_scope === 'full'             ? 'Full TP'
                    : position.itpd_scope === 'only_30_percent' ? 'Only 30% Change'
                    : '—'}
                  </span>
                </DL>
                <DL label="More Than One ITPD">
                  <YNBadge value={itpdCount >= 2 ? true : undefined} />
                  {itpdCount >= 2 && (
                    <span className="ml-2 text-xs text-orange-600">{itpdCount} ITPDs defined</span>
                  )}
                </DL>
              </>
            )}

            {/* Expert = Yes path */}
            {position.expert_created_tp === true && (
              <DL label="30% Change Required"><YNBadge value={position.requires_30_percent} /></DL>
            )}
            {position.expert_created_tp === true && position.requires_30_percent === true && position.change_30_description && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-xs text-gray-400 mb-0.5">30% Change Description</dt>
                <dd className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border border-gray-100">
                  {position.change_30_description}
                </dd>
              </div>
            )}
          </dl>
        </Section>

        {/* ── SECTION 2: Delivery Status ── */}
        <Section title="Delivery Status" colour="green">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-sm">
            <DL label="Test Project Ready"><YNBadge value={position.test_project_ready} /></DL>
            <DL label="Marking Scheme Ready"><YNBadge value={position.marking_scheme_ready} /></DL>
            <DL label="Marking Scheme Tested"><YNBadge value={position.marking_scheme_tested} /></DL>
            <DL label="Test Project Validated"><YNBadge value={position.test_project_validated} /></DL>

            {/* Agreed Delivery Date with overdue/pending warning */}
            <DL label="Agreed Delivery Date">
              <div className="flex items-center flex-wrap gap-1">
                {position.tp_agreed_delivery_date
                  ? <span className="font-medium text-gray-800">{position.tp_agreed_delivery_date}</span>
                  : <Badge variant="muted">Not Set</Badge>}
                <DeliveryStatus
                  agreedDate={position.tp_agreed_delivery_date}
                  actualDate={position.test_project_delivered}
                />
              </div>
            </DL>

            {/* Actual Delivery Date */}
            <DL label="Actual Delivery Date">
              {position.test_project_delivered
                ? <span className="font-medium text-gray-800">{position.test_project_delivered}</span>
                : <Badge variant="muted">Not Delivered</Badge>}
            </DL>
          </dl>
        </Section>

        {/* ── ITPD Budget — only when has_itpd = true ── */}
        {position.has_itpd === true && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
              ITPD Budget
            </div>
            <dl className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-4 text-sm">
              <DL label="Full ITPD Budget € for this skill">
                <span className="font-medium text-gray-800">{budget != null ? fmtEur(budget) : '—'}</span>
              </DL>
              <DL label="ITPD Package Price (€)">
                <span className="font-medium text-gray-800">{pkgPrice != null ? fmtEur(pkgPrice) : <span className="text-gray-400">Not set in Settings</span>}</span>
              </DL>
              <DL label="ITPD Flight Costs (€)">
                <span className="font-medium text-gray-800">{flightCosts != null ? fmtEur(flightCosts) : '—'}</span>
              </DL>
              <DL label="ITPD Development Budget (€)">
                <span className={`font-semibold ${displayDevBudget != null ? (displayDevBudget >= 0 ? 'text-green-700' : 'text-red-600') : 'text-gray-400'}`}>
                  {displayDevBudget != null ? fmtEur(displayDevBudget) : '—'}
                </span>
              </DL>
              {spend != null && (
                <DL label="Current Spend (€)">
                  <span className="font-medium text-gray-800">{fmtEur(spend)}</span>
                </DL>
              )}
              {diff != null && (
                <DL label="Budget Remaining (€)">
                  <span className={`font-semibold ${diff >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {fmtEur(diff)}
                  </span>
                </DL>
              )}
            </dl>
          </div>
        )}

        {/* Readiness + Notes */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Overall readiness:</span>
          <Badge variant={position.readiness_flag ? 'success' : 'muted'}>
            {position.readiness_flag ? 'Ready' : 'Not Ready'}
          </Badge>
        </div>

        {position.notes && (
          <div className="border border-gray-100 rounded-lg px-4 py-3 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
            {position.notes}
          </div>
        )}
      </div>
    )
  }

  // ── Edit / Create form ────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Test Project Status</h3>
      </div>

      {/* ── SECTION 1: Test Project Setup ── */}
      <Section title="Test Project Setup" colour="blue">
        <div className="space-y-5">

          {/* Project Type */}
          <div>
            <p className="block text-xs font-medium text-gray-600 mb-1.5">Skills Test Project Type</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input {...register('project_type')} type="radio" value="modular"
                  className="h-3.5 w-3.5 text-blue-600 border-gray-300" />
                <span className="text-sm text-gray-700">Modular</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input {...register('project_type')} type="radio" value="single"
                  className="h-3.5 w-3.5 text-blue-600 border-gray-300" />
                <span className="text-sm text-gray-700">Single</span>
              </label>
            </div>
          </div>

          {/* Step 1: Expert Created TP — always shown */}
          <div className="border-l-2 border-blue-200 pl-4 space-y-4">
            <YNRadio label="Expert Created TP" name="expert_created_tp" register={register} />

            {/* ── Branch A: Expert = No ── */}
            {expertCreatedNo && (
              <div className="space-y-4">
                {/* Has ITPD */}
                <YNRadio label="Has ITPD" name="has_itpd" register={register} />

                {/* ITPD Scope + multi-ITPD question — only if has_itpd = Yes */}
                {hasItpdYes && (
                  <div className="space-y-4">
                    <div>
                      <p className="block text-xs font-medium text-gray-600 mb-1.5">ITPD for Full TP or Only 30% Change</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input {...register('itpd_scope')} type="radio" value="full"
                            className="h-3.5 w-3.5 text-blue-600 border-gray-300" />
                          <span className="text-sm text-gray-700">Full TP</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input {...register('itpd_scope')} type="radio" value="only_30_percent"
                            className="h-3.5 w-3.5 text-blue-600 border-gray-300" />
                          <span className="text-sm text-gray-700">Only 30% Change</span>
                        </label>
                      </div>
                    </div>

                    {/* Is there more than one ITPD? */}
                    {watchItpdScope && (
                      <div className={multipleItpdForced ? '' : ''}>
                        <p className="block text-xs font-medium text-gray-600 mb-1.5">
                          Is there more than one ITPD for this skill?
                        </p>
                        {multipleItpdForced ? (
                          // Locked: forced Yes because 2+ ITPD rows already exist in Roles
                          <div className="flex items-center gap-2">
                            <div className="flex gap-4 opacity-60 pointer-events-none">
                              <label className="flex items-center gap-1.5">
                                <input type="radio" checked readOnly
                                  className="h-3.5 w-3.5 text-green-600 border-gray-300" />
                                <span className="text-sm text-gray-700">Yes</span>
                              </label>
                              <label className="flex items-center gap-1.5">
                                <input type="radio"
                                  className="h-3.5 w-3.5 text-red-500 border-gray-300" />
                                <span className="text-sm text-gray-700">No</span>
                              </label>
                            </div>
                            <span className="text-xs text-orange-600 font-medium">
                              Locked — {itpdCount} ITPDs are defined in the Roles tab
                            </span>
                          </div>
                        ) : (
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input {...register('has_itpd')} type="radio" value="true"
                                className="h-3.5 w-3.5 text-green-600 border-gray-300 focus:ring-green-500" />
                              <span className="text-sm text-gray-700">Yes</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input {...register('has_itpd')} type="radio" value="false"
                                className="h-3.5 w-3.5 text-red-500 border-gray-300 focus:ring-red-500" />
                              <span className="text-sm text-gray-700">No</span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Branch B: Expert = Yes ── */}
            {expertCreatedTP && (
              <div className="space-y-4">
                {/* 30% Required */}
                <YNRadio label="30% Change Required" name="requires_30_percent" register={register} />

                {/* Description textbox — only when 30% = Yes */}
                {requires30Yes && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      30% Change Description
                    </label>
                    <p className="text-xs text-gray-400 mb-1.5">
                      Briefly describe how this skill will select the 30% change to the test project
                    </p>
                    <textarea
                      {...register('change_30_description')}
                      rows={3}
                      placeholder="e.g. The CE will propose three options; the jury votes at CPM…"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── SECTION 2: Delivery Status ── */}
      <Section title="Delivery Status" colour="green">
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            <YNRadio label="Test Project Ready"      name="test_project_ready"     register={register} />
            <YNRadio label="Marking Scheme Ready"    name="marking_scheme_ready"   register={register} />
            <YNRadio label="Marking Scheme Tested"   name="marking_scheme_tested"  register={register} />
            <YNRadio label="Test Project Validated"  name="test_project_validated" register={register} />
          </div>

          {/* Agreed Delivery Date */}
          <div>
            <p className="block text-xs font-medium text-gray-600 mb-1.5">Agreed Delivery Date</p>
            <p className="text-xs text-gray-400 mb-2">The date agreed for the test project to be delivered</p>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                {...register('tp_agreed_delivery_date')}
                type="date"
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              {/* Live warning preview in form */}
              {watchAgreedDate && (() => {
                const today   = new Date(); today.setHours(0,0,0,0)
                const agreed  = new Date(watchAgreedDate); agreed.setHours(0,0,0,0)
                const diffDays = Math.ceil((agreed.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                if (!watchActualDate && diffDays < 0) {
                  return <span className="font-bold text-red-600">TP DELIVERY NOW OVERDUE</span>
                }
                if (!watchActualDate && diffDays <= 14) {
                  return <span className="font-bold text-yellow-600">TP DELIVERY PENDING SHORTLY</span>
                }
                return null
              })()}
            </div>
          </div>

          {/* Actual Delivery Date */}
          <div>
            <p className="block text-xs font-medium text-gray-600 mb-1.5">Actual Delivery Date</p>
            <p className="text-xs text-gray-400 mb-2">Enter the date the test project was actually received/delivered</p>
            <input
              {...register('test_project_delivered')}
              type="date"
              className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
        </div>
      </Section>

      {/* ── ITPD Budget — only when has_itpd = Yes ── */}
      {hasItpdYes && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
            ITPD Budget
          </div>
          {/* Single horizontal row with all 6 budget boxes */}
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

              {/* 1 — Full ITPD Budget € for this skill */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Full ITPD Budget € for this skill</label>
                <input
                  {...register('itpd_budget', { valueAsNumber: true })}
                  type="number" step="0.01" min="0" placeholder="0.00"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 2 — Package Price (read-only from settings) */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">ITPD Package Price (€)</label>
                <div className="px-2 py-1.5 text-sm rounded border border-gray-200 bg-gray-50 text-gray-700 min-h-[34px]">
                  {packagePrice != null
                    ? fmtEur(packagePrice)
                    : <span className="text-gray-400 italic text-xs">Set in Settings</span>}
                </div>
              </div>

              {/* 3 — Flight Costs */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">ITPD Flight Costs (€)</label>
                <input
                  {...register('itpd_flight_costs', { valueAsNumber: true })}
                  type="number" step="0.01" min="0" placeholder="0.00"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 4 — Development Budget (calculated) */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Development Budget (€)</label>
                <div className={`px-2 py-1.5 text-sm font-semibold rounded border border-gray-200 bg-gray-50 min-h-[34px] ${
                  devBudget != null ? (devBudget >= 0 ? 'text-green-700' : 'text-red-600') : 'text-gray-400'
                }`}>
                  {devBudget != null ? fmtEur(devBudget) : '—'}
                </div>
              </div>

              {/* 5 — Current Spend */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Current Spend (€)</label>
                <input
                  {...register('itpd_spend', { valueAsNumber: true })}
                  type="number" step="0.01" min="0" placeholder="0.00"
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 6 — Budget Remaining (calculated) */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Budget Remaining (€)</label>
                <div className={`px-2 py-1.5 text-sm font-semibold rounded border border-gray-200 bg-gray-50 min-h-[34px] ${
                  watchedBudget != null && watchedBudget !== undefined
                    ? ((Number(watchedBudget) - (Number(watch('itpd_spend')) || 0)) >= 0 ? 'text-green-700' : 'text-red-600')
                    : 'text-gray-400'
                }`}>
                  {watchedBudget != null && watchedBudget !== undefined
                    ? fmtEur(Number(watchedBudget) - (Number(watch('itpd_spend')) || 0))
                    : '—'}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Readiness + Notes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input {...register('readiness_flag')} type="checkbox" id="readiness"
            className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
          <label htmlFor="readiness" className="text-sm text-gray-700">Mark skill as Ready</label>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea {...register('notes')} rows={3}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={upsert.isPending}>Save</Button>
        {position && (
          <Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(false); reset() }}>Cancel</Button>
        )}
      </div>
    </form>
  )
}
