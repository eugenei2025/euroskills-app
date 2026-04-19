// Auto-generated types matching the Supabase schema

export type RoleType =
  | 'Chief Expert'
  | 'Deputy Chief Expert'
  | 'ITPD'
  | 'Sector Manager'
  | 'Workshop Manager'
  | 'Workshop Manager Assistant'
  | 'Skills Advisor'
  | 'Jury President Team Leader'
  | 'Jury President'
  | 'ITPD Validator'
  | 'Independent Assessor'

export type RoleStatus = 'Vacant' | 'Pending' | 'Filled' | 'Not Applicable'

export type DocStatus = 'Missing' | 'Pending' | 'Complete' | 'Not Applicable'

export type EventType = 'SDW' | 'CPM' | 'EuroSkills Competition'

export type AttendanceStatus =
  | 'Attending'
  | 'Package Secured'
  | 'Tentative'
  | 'Not Attending'
  | 'Not Applicable'

export type ImportStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface Skill {
  id: string
  skill_number: string
  skill_name: string
  competition_mode: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface CompetitionRole {
  id: string
  skill_id: string
  role_type: RoleType
  status: RoleStatus
  is_new: boolean
  first_name: string | null
  family_name: string | null
  email: string | null
  iso_code: string | null
  nationality: string | null
  votes: number | null
  td_support: boolean
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface SupportingDocument {
  id: string
  skill_id: string
  doc_type: string
  status: DocStatus
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface SkillPosition {
  id: string
  skill_id: string
  // ── Setup fields ─────────────────────────────────────────────
  project_type: string | null           // 'modular' | 'single'
  has_itpd: boolean | null
  requires_30_percent: boolean | null
  expert_created_tp: boolean | null     // Expert created the TP (yes/no)
  itpd_scope: string | null             // 'full' | 'only_30_percent'
  // ── Delivery / status fields ─────────────────────────────────
  test_project_ready: boolean | null
  marking_scheme_ready: boolean | null
  marking_scheme_tested: boolean | null
  test_project_validated: boolean | null
  test_project_delivered: string | null      // date string when TP was actually delivered
  tp_agreed_delivery_date: string | null    // date agreed for TP delivery
  // ── Budget ───────────────────────────────────────────────────
  itpd_budget: number | null           // Full ITPD budget (replaces old "Budget")
  itpd_flight_costs: number | null     // ITPD flight costs
  itpd_spend: number | null
  change_30_description: string | null // Description of how skill will select 30% change
  readiness_flag: boolean
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

// ── Global Jury Presidents ───────────────────────────────────────────────────
export interface GlobalJuryPresident {
  id: string
  first_name: string
  family_name: string
  title: string | null          // Mr, Mrs, Ms, Dr
  iso_code: string | null       // 2-3 letter country code
  country: string | null        // Full country name
  email: string | null
  phone: string | null
  phone2: string | null
  is_jptl: boolean              // Is this JP also a Jury President Team Leader?
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Global Skills Advisors ────────────────────────────────────────────────────
export interface GlobalSkillsAdvisor {
  id: string
  first_name: string
  family_name: string
  title: string | null
  iso_code: string | null
  country: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Skill allocations ─────────────────────────────────────────────────────────
// JP assigned to a skill (and optionally grouped under a JPTL)
export interface SkillJpAssignment {
  id: string
  skill_id: string
  jp_id: string                 // references global_jury_presidents
  jptl_id: string | null        // references global_jury_presidents (JPTL who leads this JP)
  created_at: string
}

// SA assigned to a skill
export interface SkillSaAssignment {
  id: string
  skill_id: string
  sa_id: string                 // references global_skills_advisors
  created_at: string
}

// Global settings (singleton row, key/value store)
export interface GlobalSettings {
  id: string
  itpd_package_price: number | null   // Global ITPD package price (€)
  competition_name: string | null     // e.g. "EuroSkills Dusseldorf 2027"
  sdw_date: string | null             // Global SDW arrival date
  cpm_date: string | null             // Global CPM arrival date
  euroskills_date: string | null      // Global EuroSkills Competition arrival date
  updated_at: string
}

// Global mandatory attendance roles per event type (not per-skill)
export interface EventMandatoryRole {
  id: string
  event_type: EventType
  role_abbr: string   // e.g. 'CE', 'DCE', 'WM'
  created_at: string
}

export interface SkillEvent {
  id: string
  skill_id: string
  event_type: EventType
  event_date: string | null
  event_location: string | null
  attendance_status: AttendanceStatus
  attendee_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  skill_id: string | null
  changed_by: string
  changed_at: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

export interface ImportJob {
  id: string
  file_name: string
  status: ImportStatus
  row_count: number | null
  error_count: number
  errors: unknown | null
  created_at: string
  updated_at: string
  created_by: string | null
}
