import type { RoleStatus, DocStatus, AttendanceStatus } from './database'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

export type QuickFilter =
  | 'all'
  | 'missing_ce'
  | 'missing_dce'
  | 'missing_wm'
  | 'no_docs'
  | 'docs_incomplete'
  | 'not_ready'
  | 'has_vacant'
  | 'new_roles'
  | 'td_support'

export interface FilterState {
  search: string
  roleStatus: RoleStatus | 'all'
  docStatus: DocStatus | 'all'
  attendanceStatus: AttendanceStatus | 'all'
  skillNumber: string
  quickFilter: QuickFilter
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
