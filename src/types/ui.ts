import type { RoleStatus, DocStatus, AttendanceStatus, RoleType } from './database'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export type QuickFilter =
  | 'all'
  | 'missing_ce'
  | 'missing_dce'
  | 'missing_wm'
  | 'has_vacant'
  | 'no_docs'
  | 'docs_incomplete'
  | 'missing_tp'
  | 'missing_ms'

export type TpStatusFilter =
  | 'all'
  | 'tp_ready'
  | 'tp_validated'
  | 'tp_delivered'
  | 'ms_ready'
  | 'ms_tested'
  | 'tp_not_ready'
  | 'tp_overdue'
  | 'tp_incomplete'

/** Which document types to filter on (empty = any) */
export type DocTypeFilter = string   // matches DOCUMENT_TYPES values or 'all'

/** Group results by this dimension in the table */
export type GroupByMode = 'none' | 'role_type' | 'doc_status' | 'tp_status' | 'roles_tl' | 'docs_tl'

export interface FilterState {
  search: string
  // Role filters
  roleStatus: RoleStatus | 'all'
  roleType: RoleType | 'all'          // filter to skills that have this role type at the given status
  // Doc filters
  docStatus: DocStatus | 'all'
  docType: DocTypeFilter              // 'all' or a specific doc_type string
  // TP filters
  tpStatus: TpStatusFilter
  // Attendance
  attendanceStatus: AttendanceStatus | 'all'
  // Legacy
  skillNumber: string
  quickFilter: QuickFilter
  // Grouping
  groupBy: GroupByMode
}

export interface DashboardMetrics {
  totalSkills: number
  vacantRoles: number
  pendingRoles: number
  filledRoles: number
  docsComplete: number
  docsInProgress: number
  docsNotStarted: number
  readySkills: number
}

export type TabId = 'roles' | 'documents' | 'position' | 'events' | 'audit'

export interface ImportRow {
  skill_number: string
  role_type: string
  first_name: string
  family_name: string
  email: string
  nationality: string
  [key: string]: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
}
