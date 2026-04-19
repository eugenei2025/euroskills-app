import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getCurrentUserName } from '@/context/UserContext'
import type { GlobalSettings } from '@/types/database'

const QUERY_KEY = ['global-settings']

export function useGlobalSettings() {
  return useQuery<GlobalSettings | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data ?? null
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSaveGlobalSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: {
      itpd_package_price?: number | null
      competition_name?: string | null
      sdw_date?: string | null
      cpm_date?: string | null
      euroskills_date?: string | null
    }) => {
      const { data: existing } = await supabase
        .from('global_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await supabase
          .from('global_settings')
          .update({ ...values, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
        await supabase.from('audit_log').insert({
          table_name: 'global_settings',
          record_id:  existing.id,
          skill_id:   null,
          changed_by: getCurrentUserName(),
          action:     'UPDATE',
          old_data:   existing as Record<string, unknown>,
          new_data:   values   as Record<string, unknown>,
        })
      } else {
        const { data: inserted, error } = await supabase
          .from('global_settings')
          .insert({ ...values })
          .select()
          .maybeSingle()
        if (error) throw error
        const newId = (inserted as { id: string } | null)?.id ?? 'new'
        await supabase.from('audit_log').insert({
          table_name: 'global_settings',
          record_id:  newId,
          skill_id:   null,
          changed_by: getCurrentUserName(),
          action:     'INSERT',
          old_data:   null,
          new_data:   values as Record<string, unknown>,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}
