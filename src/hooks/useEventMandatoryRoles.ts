import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getCurrentUserName } from '@/context/UserContext'
import type { EventType } from '@/types/database'

export interface MandatoryRoleRow {
  id: string
  event_type: EventType
  role_abbr: string
}

// Fetch all global mandatory role settings
export function useEventMandatoryRoles() {
  return useQuery<MandatoryRoleRow[]>({
    queryKey: ['event-mandatory-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_mandatory_roles')
        .select('*')
        .order('event_type')
      if (error) throw error
      return data ?? []
    },
    staleTime: 10 * 60 * 1000, // 10 min — rarely changes
  })
}

// Return mandatory roles for a single event type as a string[]
export function useMandatoryRolesForEvent(eventType: EventType): string[] {
  const { data } = useEventMandatoryRoles()
  if (!data) return []
  return data.filter(r => r.event_type === eventType).map(r => r.role_abbr)
}

// Set the full list of mandatory roles for one event type (replace all)
// Writes a settings-level audit log entry (skill_id = null)
export function useSetMandatoryRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ eventType, roles }: { eventType: EventType; roles: string[] }) => {
      // Read existing rows for audit old_data
      const { data: existing } = await supabase
        .from('event_mandatory_roles')
        .select('*')
        .eq('event_type', eventType)

      // Delete existing for this event type
      const { error: delErr } = await supabase
        .from('event_mandatory_roles')
        .delete()
        .eq('event_type', eventType)
      if (delErr) throw delErr

      // Insert new rows (if any)
      if (roles.length > 0) {
        const { error: insErr } = await supabase
          .from('event_mandatory_roles')
          .insert(roles.map(r => ({ event_type: eventType, role_abbr: r })))
        if (insErr) throw insErr
      }

      // Audit entry — record old roles list and new roles list for this event type
      await supabase.from('audit_log').insert({
        table_name: 'event_mandatory_roles',
        record_id:  eventType,
        skill_id:   null,
        changed_by: getCurrentUserName(),
        action:     'UPDATE',
        old_data:   { event_type: eventType, roles: (existing ?? []).map((r: MandatoryRoleRow) => r.role_abbr) },
        new_data:   { event_type: eventType, roles },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-mandatory-roles'] })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}
