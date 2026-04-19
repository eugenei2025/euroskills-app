import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getCurrentUserName } from '@/context/UserContext'
import type { Skill, GlobalJuryPresident, GlobalSkillsAdvisor } from '@/types/database'

export function useSkills() {
  return useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('is_active', true)
        .order('skill_number', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    staleTime: 30 * 1000,
  })
}

export function useSkillsWithMetrics() {
  return useQuery({
    queryKey: ['skills-with-metrics'],
    queryFn: async () => {
      // Fetch skills with embedded related data
      const { data: skills, error: skillsError } = await supabase
        .from('skills')
        .select(`
          *,
          competition_roles ( id, role_type, status, is_new, first_name, family_name, iso_code, td_support ),
          supporting_documents ( id, doc_type, status ),
          skill_positions ( id, readiness_flag, has_itpd, test_project_ready, marking_scheme_ready, marking_scheme_tested, test_project_validated ),
          skill_events ( id, event_type, attendance_status, attendee_name )
        `)
        .eq('is_active', true)
        .order('skill_number', { ascending: true })

      if (skillsError) throw skillsError

      // Fetch JP assignments with full JP details
      const { data: jpAssignments, error: jpErr } = await supabase
        .from('skill_jp_assignments')
        .select('skill_id, jp_id, jptl_id')
      if (jpErr) throw jpErr

      // Fetch SA assignments
      const { data: saAssignments, error: saErr } = await supabase
        .from('skill_sa_assignments')
        .select('skill_id, sa_id')
      if (saErr) throw saErr

      // Fetch all JPs and SAs for lookup
      const { data: allJPs, error: jpListErr } = await supabase
        .from('global_jury_presidents')
        .select('id, first_name, family_name, iso_code, email, phone, is_jptl')
      if (jpListErr) throw jpListErr

      const { data: allSAs, error: saListErr } = await supabase
        .from('global_skills_advisors')
        .select('id, first_name, family_name, iso_code, email, phone')
      if (saListErr) throw saListErr

      const jpMap: Record<string, GlobalJuryPresident> = {}
      for (const jp of (allJPs ?? [])) jpMap[jp.id] = jp as GlobalJuryPresident

      const saMap: Record<string, GlobalSkillsAdvisor> = {}
      for (const sa of (allSAs ?? [])) saMap[sa.id] = sa as GlobalSkillsAdvisor

      // Fetch latest audit log entry per skill (for the Updated column)
      const { data: auditLatest } = await supabase
        .from('audit_log')
        .select('skill_id, changed_at')
        .not('skill_id', 'is', null)
        .order('changed_at', { ascending: false })

      // Build a map: skill_id → most recent changed_at
      const latestAuditMap: Record<string, string> = {}
      for (const entry of (auditLatest ?? [])) {
        if (entry.skill_id && !latestAuditMap[entry.skill_id]) {
          latestAuditMap[entry.skill_id] = entry.changed_at
        }
      }

      // Enrich each skill with its JP/SA/JPTL details and latest audit date
      const enriched = (skills ?? []).map(skill => {
        const jpAsgn = (jpAssignments ?? []).filter(a => a.skill_id === skill.id)
        const saAsgn = (saAssignments ?? []).filter(a => a.skill_id === skill.id)

        // Non-JPTL JPs assigned to this skill
        const skillJPs = jpAsgn
          .map(a => jpMap[a.jp_id])
          .filter(Boolean)
          .filter(jp => !jp.is_jptl)

        // JPTL(s) — unique jptl_ids from the assignments for this skill
        const jptlIds = [...new Set(jpAsgn.map(a => a.jptl_id).filter(Boolean) as string[])]
        const skillJPTLs = jptlIds.map(id => jpMap[id]).filter(Boolean)

        // SAs assigned to this skill
        const skillSAs = saAsgn.map(a => saMap[a.sa_id]).filter(Boolean)

        return {
          ...skill,
          skill_jps:        skillJPs,
          skill_jptls:      skillJPTLs,
          skill_sas:        skillSAs,
          latest_audit_at:  latestAuditMap[skill.id] ?? null,
        }
      })

      return enriched
    },
    staleTime: 30 * 1000,  // 30 s — keeps the counter fresh after add/delete
  })
}

// ── Add skill mutation ────────────────────────────────────────────────────────

export interface AddSkillPayload {
  skill_number: string
  skill_name: string
  competition_mode?: string | null
}

export function useAddSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: AddSkillPayload) => {
      const changedBy = getCurrentUserName()
      const { data, error } = await supabase
        .from('skills')
        .insert({
          skill_number:    payload.skill_number.trim(),
          skill_name:      payload.skill_name.trim(),
          competition_mode: payload.competition_mode?.trim() || null,
          is_active:       true,
          updated_by:      changedBy,
        })
        .select()
        .single()
      if (error) throw error
      return data as Skill
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
    },
  })
}

// ── Delete skill mutation (soft delete — sets is_active = false) ──────────────

export function useDeleteSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (skillId: string) => {
      const changedBy = getCurrentUserName()
      const { error } = await supabase
        .from('skills')
        .update({ is_active: false, updated_by: changedBy })
        .eq('id', skillId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
    },
  })
}
