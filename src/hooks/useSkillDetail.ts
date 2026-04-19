import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getCurrentUserName } from '@/context/UserContext'
import type {
  CompetitionRole,
  SupportingDocument,
  SkillPosition,
  SkillEvent,
  AuditLog,
} from '@/types/database'

export function useSkillDetail(skillId: string | null) {
  const enabled = Boolean(skillId)

  const roles = useQuery<CompetitionRole[]>({
    queryKey: ['roles', skillId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competition_roles')
        .select('*')
        .eq('skill_id', skillId!)
        .order('role_type')
      if (error) throw error
      return data ?? []
    },
  })

  const documents = useQuery<SupportingDocument[]>({
    queryKey: ['documents', skillId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supporting_documents')
        .select('*')
        .eq('skill_id', skillId!)
        .order('doc_type')
      if (error) throw error
      return data ?? []
    },
  })

  const position = useQuery<SkillPosition | null>({
    queryKey: ['position', skillId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_positions')
        .select('*')
        .eq('skill_id', skillId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const events = useQuery<SkillEvent[]>({
    queryKey: ['events', skillId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_events')
        .select('*')
        .eq('skill_id', skillId!)
        .order('event_type')
      if (error) throw error
      return data ?? []
    },
  })

  const auditLog = useQuery<AuditLog[]>({
    queryKey: ['audit', skillId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('skill_id', skillId!)
        .order('changed_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data ?? []
    },
  })

  return { roles, documents, position, events, auditLog }
}

// ── Audit log writer ──────────────────────────────────────────────────────────
// Records a structured change entry with section, old data and new data.
async function writeAuditEntry({
  skillId,
  section,
  recordId,
  action,
  oldData,
  newData,
}: {
  skillId: string
  section: string
  recordId: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
}) {
  await supabase.from('audit_log').insert({
    table_name: section,
    record_id:  recordId,
    skill_id:   skillId,
    changed_by: getCurrentUserName(),
    action,
    old_data:   oldData,
    new_data:   newData,
  })
}

// ── useLogSave (generic section save note) ────────────────────────────────────
export function useLogSave(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (section: 'Roles' | 'Documents' | 'Test Project' | 'Events') => {
      await supabase.from('audit_log').insert({
        table_name: section,
        record_id:  skillId,
        skill_id:   skillId,
        changed_by: getCurrentUserName(),
        action:     'UPDATE',
        old_data:   null,
        new_data:   { note: `Saved changes in ${section} section` },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit', skillId] }),
  })
}

// ── useUpsertRole ─────────────────────────────────────────────────────────────
export function useUpsertRole(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (role: Partial<CompetitionRole>) => {
      if (role.id) {
        // Fetch old data for audit
        const { data: old } = await supabase
          .from('competition_roles')
          .select('*')
          .eq('id', role.id)
          .maybeSingle()

        const { error } = await supabase
          .from('competition_roles')
          .update({ ...role, updated_at: new Date().toISOString() })
          .eq('id', role.id)
        if (error) throw error

        await writeAuditEntry({
          skillId,
          section:  'competition_roles',
          recordId: role.id,
          action:   'UPDATE',
          oldData:  old as Record<string, unknown> | null,
          newData:  role as Record<string, unknown>,
        })
      } else {
        const { data: inserted, error } = await supabase
          .from('competition_roles')
          .insert({ ...role, skill_id: skillId })
          .select()
          .maybeSingle()
        if (error) throw error

        await writeAuditEntry({
          skillId,
          section:  'competition_roles',
          recordId: (inserted as { id: string } | null)?.id ?? skillId,
          action:   'INSERT',
          oldData:  null,
          newData:  role as Record<string, unknown>,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles', skillId] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['audit', skillId] })
    },
  })
}

// ── useDeleteRole ─────────────────────────────────────────────────────────────
export function useDeleteRole(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (roleId: string) => {
      // Fetch old data for audit
      const { data: old } = await supabase
        .from('competition_roles')
        .select('*')
        .eq('id', roleId)
        .maybeSingle()

      const { error } = await supabase
        .from('competition_roles')
        .delete()
        .eq('id', roleId)
      if (error) throw error

      await writeAuditEntry({
        skillId,
        section:  'competition_roles',
        recordId: roleId,
        action:   'DELETE',
        oldData:  old as Record<string, unknown> | null,
        newData:  null,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles', skillId] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['audit', skillId] })
    },
  })
}

// ── useUpsertDocument ─────────────────────────────────────────────────────────
export function useUpsertDocument(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (doc: Partial<SupportingDocument>) => {
      if (doc.id) {
        const { data: old } = await supabase
          .from('supporting_documents')
          .select('*')
          .eq('id', doc.id)
          .maybeSingle()

        const { error } = await supabase
          .from('supporting_documents')
          .update({ ...doc, updated_at: new Date().toISOString() })
          .eq('id', doc.id)
        if (error) throw error

        await writeAuditEntry({
          skillId,
          section:  'supporting_documents',
          recordId: doc.id,
          action:   'UPDATE',
          oldData:  old as Record<string, unknown> | null,
          newData:  doc as Record<string, unknown>,
        })
      } else {
        const { data: inserted, error } = await supabase
          .from('supporting_documents')
          .insert({ ...doc, skill_id: skillId })
          .select()
          .maybeSingle()
        if (error) throw error

        await writeAuditEntry({
          skillId,
          section:  'supporting_documents',
          recordId: (inserted as { id: string } | null)?.id ?? skillId,
          action:   'INSERT',
          oldData:  null,
          newData:  doc as Record<string, unknown>,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', skillId] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['audit', skillId] })
    },
  })
}

// ── useUpsertPosition ─────────────────────────────────────────────────────────
export function useUpsertPosition(skillId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pos: Partial<SkillPosition>) => {
      const { data: existing } = await supabase
        .from('skill_positions')
        .select('*')
        .eq('skill_id', skillId)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await supabase
          .from('skill_positions')
          .update({ ...pos, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error

        await writeAuditEntry({
          skillId,
          section:  'skill_positions',
          recordId: existing.id,
          action:   'UPDATE',
          oldData:  existing as unknown as Record<string, unknown>,
          newData:  pos as Record<string, unknown>,
        })
      } else {
        const { data: inserted, error } = await supabase
          .from('skill_positions')
          .insert({ ...pos, skill_id: skillId })
          .select()
          .maybeSingle()
        if (error) throw error

        await writeAuditEntry({
          skillId,
          section:  'skill_positions',
          recordId: (inserted as { id: string } | null)?.id ?? skillId,
          action:   'INSERT',
          oldData:  null,
          newData:  pos as Record<string, unknown>,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['position', skillId] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['audit', skillId] })
    },
  })
}
