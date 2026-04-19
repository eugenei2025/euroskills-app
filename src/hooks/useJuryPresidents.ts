import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getCurrentUserName } from '@/context/UserContext'
import type { AuditLog } from '@/types/database'
import type {
  GlobalJuryPresident,
  GlobalSkillsAdvisor,
  SkillJpAssignment,
  SkillSaAssignment,
} from '@/types/database'

// ── Per-skill JP/SA resolved info (for use inside SkillDetail) ────────────────

export interface SkillJpSaInfo {
  jps:   (GlobalJuryPresident & { jptl_id: string | null })[]
  jptls: GlobalJuryPresident[]
  sas:   GlobalSkillsAdvisor[]
}

export function useSkillJpSaInfo(skillId: string | null): SkillJpSaInfo {
  const { data: allJPs = [] }    = useJuryPresidents()
  const { data: allSAs = [] }    = useSkillsAdvisors()
  const { data: jpAsgn = [] }    = useJpAssignments()
  const { data: saAsgn = [] }    = useSaAssignments()

  if (!skillId) return { jps: [], jptls: [], sas: [] }

  const jpMap: Record<string, GlobalJuryPresident> = {}
  for (const jp of allJPs) jpMap[jp.id] = jp
  const saMap: Record<string, GlobalSkillsAdvisor> = {}
  for (const sa of allSAs) saMap[sa.id] = sa

  const skillJpAsgn = jpAsgn.filter(a => a.skill_id === skillId)
  const skillSaAsgn = saAsgn.filter(a => a.skill_id === skillId)

  // JPs = rows where jp_id points to a non-JPTL person
  const jps = skillJpAsgn
    .map(a => ({ ...jpMap[a.jp_id], jptl_id: a.jptl_id }))
    .filter(jp => jp.id && !jp.is_jptl) as (GlobalJuryPresident & { jptl_id: string | null })[]

  // JPTLs = (a) referenced via jptl_id on any assignment, OR (b) assigned directly as jp_id when is_jptl=true
  const jptlIdsFromRef    = skillJpAsgn.map(a => a.jptl_id).filter(Boolean) as string[]
  const jptlIdsFromDirect = skillJpAsgn
    .map(a => a.jp_id)
    .filter(id => jpMap[id]?.is_jptl)
  const jptlIds = [...new Set([...jptlIdsFromRef, ...jptlIdsFromDirect])]
  const jptls = jptlIds.map(id => jpMap[id]).filter(Boolean) as GlobalJuryPresident[]

  const sas = skillSaAsgn.map(a => saMap[a.sa_id]).filter(Boolean) as GlobalSkillsAdvisor[]

  return { jps, jptls, sas }
}

// ── Settings audit log query ─────────────────────────────────────────────────
// Reads audit entries whose skill_id IS NULL (settings-level changes)
export function useSettingsAuditLog() {
  return useQuery<AuditLog[]>({
    queryKey: ['settings-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .is('skill_id', null)
        .order('changed_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 1000,
  })
}

// Helper: write a settings-level audit entry (skill_id = null)
async function writeSettingsAudit(
  section: string,
  recordId: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
) {
  await supabase.from('audit_log').insert({
    table_name: section,
    record_id:  recordId,
    skill_id:   null,
    changed_by: getCurrentUserName(),
    action,
    old_data:   oldData,
    new_data:   newData,
  })
}

// ── Jury Presidents ───────────────────────────────────────────────────────────

export function useJuryPresidents() {
  return useQuery<GlobalJuryPresident[]>({
    queryKey: ['global-jury-presidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_jury_presidents')
        .select('*')
        .order('family_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpsertJuryPresident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (jp: Partial<GlobalJuryPresident>) => {
      if (jp.id) {
        const { data: old } = await supabase.from('global_jury_presidents').select('*').eq('id', jp.id).maybeSingle()
        const { error } = await supabase
          .from('global_jury_presidents')
          .update({ ...jp, updated_at: new Date().toISOString() })
          .eq('id', jp.id)
        if (error) throw error
        await writeSettingsAudit('global_jury_presidents', jp.id, 'UPDATE', old as Record<string,unknown> | null, jp as Record<string,unknown>)
      } else {
        const { data: inserted, error } = await supabase
          .from('global_jury_presidents')
          .insert(jp)
          .select()
          .maybeSingle()
        if (error) throw error
        await writeSettingsAudit('global_jury_presidents', (inserted as {id:string}|null)?.id ?? 'new', 'INSERT', null, jp as Record<string,unknown>)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-jury-presidents'] })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}

export function useDeleteJuryPresident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: old } = await supabase.from('global_jury_presidents').select('*').eq('id', id).maybeSingle()
      const { error } = await supabase
        .from('global_jury_presidents')
        .delete()
        .eq('id', id)
      if (error) throw error
      await writeSettingsAudit('global_jury_presidents', id, 'DELETE', old as Record<string,unknown> | null, null)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-jury-presidents'] })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}

// ── Skills Advisors ───────────────────────────────────────────────────────────

export function useSkillsAdvisors() {
  return useQuery<GlobalSkillsAdvisor[]>({
    queryKey: ['global-skills-advisors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_skills_advisors')
        .select('*')
        .order('family_name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpsertSkillsAdvisor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sa: Partial<GlobalSkillsAdvisor>) => {
      if (sa.id) {
        const { data: old } = await supabase.from('global_skills_advisors').select('*').eq('id', sa.id).maybeSingle()
        const { error } = await supabase
          .from('global_skills_advisors')
          .update({ ...sa, updated_at: new Date().toISOString() })
          .eq('id', sa.id)
        if (error) throw error
        await writeSettingsAudit('global_skills_advisors', sa.id, 'UPDATE', old as Record<string,unknown> | null, sa as Record<string,unknown>)
      } else {
        const { data: inserted, error } = await supabase
          .from('global_skills_advisors')
          .insert(sa)
          .select()
          .maybeSingle()
        if (error) throw error
        await writeSettingsAudit('global_skills_advisors', (inserted as {id:string}|null)?.id ?? 'new', 'INSERT', null, sa as Record<string,unknown>)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-skills-advisors'] })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}

export function useDeleteSkillsAdvisor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: old } = await supabase.from('global_skills_advisors').select('*').eq('id', id).maybeSingle()
      const { error } = await supabase
        .from('global_skills_advisors')
        .delete()
        .eq('id', id)
      if (error) throw error
      await writeSettingsAudit('global_skills_advisors', id, 'DELETE', old as Record<string,unknown> | null, null)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-skills-advisors'] })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}

// ── JP Skill Assignments ──────────────────────────────────────────────────────

export function useJpAssignments() {
  return useQuery<SkillJpAssignment[]>({
    queryKey: ['skill-jp-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_jp_assignments')
        .select('*')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSetJpAssignmentsForSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      skillId,
      assignments,
    }: {
      skillId: string
      assignments: { jp_id: string; jptl_id: string | null }[]
    }) => {
      // Read existing for audit old_data
      const { data: existing } = await supabase
        .from('skill_jp_assignments')
        .select('*')
        .eq('skill_id', skillId)

      // Delete existing for this skill
      const { error: delErr } = await supabase
        .from('skill_jp_assignments')
        .delete()
        .eq('skill_id', skillId)
      if (delErr) throw delErr

      if (assignments.length > 0) {
        const { error: insErr } = await supabase
          .from('skill_jp_assignments')
          .insert(assignments.map(a => ({ skill_id: skillId, jp_id: a.jp_id, jptl_id: a.jptl_id })))
        if (insErr) throw insErr
      }

      // Settings-level audit (skill_id = null — these are global assignments)
      await writeSettingsAudit(
        'skill_jp_assignments',
        skillId,
        'UPDATE',
        { skill_id: skillId, assignments: existing ?? [] },
        { skill_id: skillId, assignments },
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill-jp-assignments'] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}

// ── SA Skill Assignments ──────────────────────────────────────────────────────

export function useSaAssignments() {
  return useQuery<SkillSaAssignment[]>({
    queryKey: ['skill-sa-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_sa_assignments')
        .select('*')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSetSaAssignmentsForSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      skillId,
      saIds,
    }: {
      skillId: string
      saIds: string[]
    }) => {
      // Read existing for audit old_data
      const { data: existing } = await supabase
        .from('skill_sa_assignments')
        .select('*')
        .eq('skill_id', skillId)

      const { error: delErr } = await supabase
        .from('skill_sa_assignments')
        .delete()
        .eq('skill_id', skillId)
      if (delErr) throw delErr

      if (saIds.length > 0) {
        const { error: insErr } = await supabase
          .from('skill_sa_assignments')
          .insert(saIds.map(id => ({ skill_id: skillId, sa_id: id })))
        if (insErr) throw insErr
      }

      // Settings-level audit (skill_id = null — these are global assignments)
      await writeSettingsAudit(
        'skill_sa_assignments',
        skillId,
        'UPDATE',
        { skill_id: skillId, sa_ids: (existing ?? []).map((r: SkillSaAssignment) => r.sa_id) },
        { skill_id: skillId, sa_ids: saIds },
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill-sa-assignments'] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}

// ── Reset ALL audit logs ──────────────────────────────────────────────────────
// Deletes ALL rows from audit_log.

export function useResetAllAuditLogs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('audit_log')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
      qc.invalidateQueries({ queryKey: ['audit'] })
    },
  })
}

// ── Reset ALL JP + SA allocations ─────────────────────────────────────────────
// Deletes every row in skill_jp_assignments and skill_sa_assignments,
// effectively returning every skill to "no JP / SA assigned".

export function useResetAllAllocations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Read counts for audit trail
      const { data: jpRows } = await supabase.from('skill_jp_assignments').select('id')
      const { data: saRows } = await supabase.from('skill_sa_assignments').select('id')

      const { error: jpErr } = await supabase.from('skill_jp_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (jpErr) throw jpErr
      const { error: saErr } = await supabase.from('skill_sa_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (saErr) throw saErr

      await writeSettingsAudit(
        'skill_jp_assignments',
        'ALL',
        'DELETE',
        { note: 'Reset all allocations', jp_count: (jpRows ?? []).length, sa_count: (saRows ?? []).length },
        { note: 'All JP and SA allocations cleared' },
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill-jp-assignments'] })
      qc.invalidateQueries({ queryKey: ['skill-sa-assignments'] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
      qc.invalidateQueries({ queryKey: ['settings-audit'] })
    },
  })
}
