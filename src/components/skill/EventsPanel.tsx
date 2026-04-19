import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { attendanceVariant } from '@/lib/utils'
import { ATTENDANCE_STATUSES } from '@/lib/constants'
import { useEventMandatoryRoles } from '@/hooks/useEventMandatoryRoles'
import { getCurrentUserName, useCurrentUser } from '@/context/UserContext'
import type { SkillEvent, EventType, AttendanceStatus } from '@/types/database'

// ── Fixed event types ─────────────────────────────────────────────────────────

const FIXED_EVENTS: { type: EventType; label: string }[] = [
  { type: 'SDW',                   label: 'Skills Development Workshop (SDW)' },
  { type: 'CPM',                   label: 'Competition Preparation Meeting (CPM)' },
  { type: 'EuroSkills Competition', label: 'EuroSkills Competition' },
]

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  'Attending':       'Attending',
  'Package Secured': 'Package Secured',
  'Tentative':       'Tentative',
  'Not Attending':   'Not Attending',
  'Not Applicable':  'Not Applicable',
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const attendeeSchema = z.object({
  role:            z.string().min(1),
  status:          z.enum(['Attending', 'Package Secured', 'Tentative', 'Not Attending', 'Not Applicable']),
  is_substitute:   z.boolean().default(false),
  sub_first_name:  z.string().optional(),
  sub_family_name: z.string().optional(),
  sub_email:       z.string().optional(),
  sub_phone:       z.string().optional(),
  sub_iso_code:    z.string().max(3).optional(),
})

const eventFormSchema = z.object({
  event_type:        z.enum(['SDW', 'CPM', 'EuroSkills Competition']),
  event_date:        z.string().optional(),
  attendance_status: z.enum(['Attending', 'Package Secured', 'Tentative', 'Not Attending', 'Not Applicable']),
  notes:             z.string().optional(),
  attendees:         z.array(attendeeSchema),
})

type EventFormData = z.infer<typeof eventFormSchema>
type AttendeeRow  = z.infer<typeof attendeeSchema>

// ── Mutation ──────────────────────────────────────────────────────────────────

function useUpsertEvent(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ev: Partial<SkillEvent>) => {
      if (ev.id) {
        // Fetch old data for audit
        const { data: old } = await supabase
          .from('skill_events')
          .select('*')
          .eq('id', ev.id)
          .maybeSingle()

        const { error } = await supabase
          .from('skill_events')
          .update({ ...ev, updated_at: new Date().toISOString() })
          .eq('id', ev.id)
        if (error) throw error

        // Write audit entry
        await supabase.from('audit_log').insert({
          table_name: 'skill_events',
          record_id:  ev.id,
          skill_id:   skillId,
          changed_by: getCurrentUserName(),
          action:     'UPDATE',
          old_data:   old,
          new_data:   ev,
        })
      } else {
        const { data: inserted, error } = await supabase
          .from('skill_events')
          .insert({ ...ev, skill_id: skillId })
          .select()
          .maybeSingle()
        if (error) throw error

        await supabase.from('audit_log').insert({
          table_name: 'skill_events',
          record_id:  (inserted as { id: string } | null)?.id ?? skillId,
          skill_id:   skillId,
          changed_by: getCurrentUserName(),
          action:     'INSERT',
          old_data:   null,
          new_data:   ev,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', skillId] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['audit', skillId] })
    },
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseAttendees(raw: string | null | undefined): AttendeeRow[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EventsPanelProps {
  skillId: string
  events: SkillEvent[]
}

interface EventRowProps {
  skillId: string
  eventType: EventType
  eventLabel: string
  existing: SkillEvent | undefined
  mandatoryRoles: string[]   // global config for this event type
}

// ── AttendeeSubForm ───────────────────────────────────────────────────────────

function AttendeeSubForm({ index, register, watch }: {
  index: number
  register: ReturnType<typeof useForm<EventFormData>>['register']
  watch:    ReturnType<typeof useForm<EventFormData>>['watch']
}) {
  const isSubstitute = watch(`attendees.${index}.is_substitute`)
  const role         = watch(`attendees.${index}.role`)

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
      <div className="grid grid-cols-2 gap-2 items-end">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">{role}</span>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-0.5">Attendance</label>
          <select
            {...register(`attendees.${index}.status`)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {ATTENDANCE_STATUSES.map(s => (
              <option key={s} value={s}>{ATTENDANCE_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Substitute toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          {...register(`attendees.${index}.is_substitute`)}
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-gray-300 text-orange-500"
        />
        <span className="text-xs text-gray-600">Attending with a substitute</span>
      </label>

      {/* Substitute details */}
      {isSubstitute && (
        <div className="border border-orange-200 rounded-lg p-3 bg-orange-50 space-y-2">
          <p className="text-xs font-semibold text-orange-700">Substitute Details</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">First Name</label>
              <input {...register(`attendees.${index}.sub_first_name`)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">Family Name</label>
              <input {...register(`attendees.${index}.sub_family_name`)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">Email Address</label>
              <input {...register(`attendees.${index}.sub_email`)} type="email"
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">Mobile Number</label>
              <input {...register(`attendees.${index}.sub_phone`)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">Country ISO</label>
              <input {...register(`attendees.${index}.sub_iso_code`)} maxLength={3} placeholder="e.g. GB"
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── EventRow ──────────────────────────────────────────────────────────────────

function EventRow({ skillId, eventType, eventLabel, existing, mandatoryRoles }: EventRowProps) {
  const [editing, setEditing] = useState(false)
  const upsert = useUpsertEvent(skillId)
  const { canEdit } = useCurrentUser()

  // Build default attendee list from mandatory roles
  const existingAttendees = parseAttendees(existing?.attendee_name)

  // Merge: for each mandatory role, use existing data or default to Not Applicable
  const buildAttendees = (mandatory: string[]): AttendeeRow[] =>
    mandatory.map(role => {
      const found = existingAttendees.find(a => a.role === role)
      return found ?? { role, status: 'Not Applicable', is_substitute: false }
    })

  const { register, handleSubmit, watch, control, reset } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      event_type:        eventType,
      event_date:        existing?.event_date        ?? undefined,
      attendance_status: existing?.attendance_status ?? 'Not Applicable',
      notes:             existing?.notes             ?? undefined,
      attendees:         buildAttendees(mandatoryRoles),
    },
  })

  const { fields: attendeeFields } = useFieldArray({ control, name: 'attendees' })

  const onSubmit = (data: EventFormData) => {
    upsert.mutate(
      {
        id:                existing?.id,
        event_type:        data.event_type,
        event_date:        data.event_date    || null,
        event_location:    null,              // no longer used for mandatory roles storage
        attendance_status: data.attendance_status,
        attendee_name:     data.attendees.length > 0 ? JSON.stringify(data.attendees) : null,
        notes:             data.notes         || null,
      },
      { onSuccess: () => setEditing(false) }
    )
  }

  // ── Display mode ──────────────────────────────────────────────────────────
  if (!editing) {
    const attendees = parseAttendees(existing?.attendee_name)

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <span className="text-sm font-medium text-gray-800">{eventLabel}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => canEdit && setEditing(true)}
              disabled={!canEdit}
              title={!canEdit ? 'Select your name to edit' : undefined}
              className={`text-xs ${canEdit ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
            >
              {existing ? 'Edit' : 'Set'}
            </button>
          </div>
        </div>

        {/* Event date + notes */}
        {existing && (existing.event_date || existing.notes) && (
          <div className="px-4 py-2 border-t border-gray-100 bg-white grid grid-cols-2 gap-3 text-xs">
            {existing.event_date && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
                <p className="text-gray-700">{existing.event_date}</p>
              </div>
            )}
            {existing.notes && (
              <div>
                <p className="text-gray-400 uppercase tracking-wide mb-0.5">Notes</p>
                <p className="text-gray-600">{existing.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Mandatory role attendees */}
        {mandatoryRoles.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-white text-xs">
            <p className="text-gray-400 uppercase tracking-wide mb-2">Mandatory Role Attendance</p>
            <div className="space-y-1.5">
              {mandatoryRoles.map(role => {
                const att = attendees.find(a => a.role === role)
                const status = att?.status ?? 'Not Applicable'
                return (
                  <div key={role} className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-gray-600 w-10">{role}</span>
                    <Badge variant={attendanceVariant(status as AttendanceStatus)}>
                      {ATTENDANCE_LABELS[status as AttendanceStatus] ?? status}
                    </Badge>
                    {att?.is_substitute && (
                      <span className="text-orange-600 font-medium">
                        Sub: {[att.sub_first_name, att.sub_family_name].filter(Boolean).join(' ')}
                        {att.sub_iso_code ? ` (${att.sub_iso_code})` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {mandatoryRoles.length === 0 && (
          <div className="px-4 py-2 border-t border-gray-100 bg-white text-xs text-gray-400 italic">
            No mandatory roles configured for this event — go to Settings to set them.
          </div>
        )}
      </div>
    )
  }

  // ── Edit form ──────────────────────────────────────────────────────────────
  return (
    <div className="border-2 border-blue-300 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-blue-50 flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-800">{eventLabel}</span>
        <button onClick={() => { setEditing(false); reset() }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 bg-white space-y-4">
        <input type="hidden" {...register('event_type')} value={eventType} />

        {/* Overall status + date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Overall Event Status</label>
            <select {...register('attendance_status')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              {ATTENDANCE_STATUSES.map(s => (
                <option key={s} value={s}>{ATTENDANCE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Event Date (optional)</label>
            <input {...register('event_date')} type="date"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-600 mb-1">Notes (optional)</label>
            <textarea {...register('notes')} rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>

        {/* Per-role attendance (driven by global mandatory roles) */}
        {attendeeFields.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Mandatory Role Attendance
              </p>
              <span className="text-xs text-gray-400">
                Roles set globally in Settings
              </span>
            </div>
            {attendeeFields.map((field, index) => (
              <AttendeeSubForm
                key={field.id}
                index={index}
                register={register}
                watch={watch}
              />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-400 text-center">
            No mandatory roles configured for this event.
            Go to <strong>Settings</strong> to define which roles must attend.
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={upsert.isPending}>Save</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(false); reset() }}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

// ── EventsPanel ───────────────────────────────────────────────────────────────

export function EventsPanel({ skillId, events }: EventsPanelProps) {
  const { data: globalMandatory = [] } = useEventMandatoryRoles()

  const eventMap: Partial<Record<EventType, SkillEvent>> = {}
  for (const ev of events) { eventMap[ev.event_type] = ev }

  const mandatoryForType = (et: EventType) =>
    globalMandatory.filter(r => r.event_type === et).map(r => r.role_abbr)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Events</h3>
        <span className="text-xs text-gray-400">
          Mandatory roles are set globally in Settings
        </span>
      </div>

      {FIXED_EVENTS.map(({ type, label }) => (
        <EventRow
          key={type}
          skillId={skillId}
          eventType={type}
          eventLabel={label}
          existing={eventMap[type]}
          mandatoryRoles={mandatoryForType(type)}
        />
      ))}
    </div>
  )
}
