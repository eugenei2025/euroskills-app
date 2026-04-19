import type { RoleType, DocStatus, AttendanceStatus } from '@/types/database'

// JP, JPTL and Skills Advisor are managed globally in Settings and are NOT
// editable per-skill in the Roles tab. They are shown read-only via JpSaPanel.
export const ROLE_TYPES: RoleType[] = [
  'Chief Expert',
  'Deputy Chief Expert',
  'ITPD',
  'Sector Manager',
  'Workshop Manager',
  'Workshop Manager Assistant',
  'ITPD Validator',
  'Independent Assessor',
]

export const ROLE_TYPE_ABBR: Record<string, string> = {
  'Chief Expert':               'CE',
  'Deputy Chief Expert':        'DCE',
  'ITPD':                       'ITPD',
  'Sector Manager':             'SM',
  'Workshop Manager':           'WM',
  'Workshop Manager Assistant': 'WMA',
  'Skills Advisor':             'SA',
  'Jury President Team Leader': 'JPTL',
  'Jury President':             'JP',
  'ITPD Validator':             'ITPD-V',
  'Independent Assessor':       'IA',
}

// Full display labels for roles (used in event attendee selector)
export const ROLE_TYPE_LABELS: Record<string, string> = {
  'Chief Expert':               'Chief Expert (CE)',
  'Deputy Chief Expert':        'Deputy Chief Expert (DCE)',
  'ITPD':                       'Independent Test Project Developer (ITPD)',
  'Sector Manager':             'Sector Manager (SM)',
  'Workshop Manager':           'Workshop Manager (WM)',
  'Workshop Manager Assistant': 'Workshop Manager Assistant (WMA)',
  'Skills Advisor':             'Skills Advisor (SA)',
  'Jury President Team Leader': 'Jury President Team Leader (JPTL)',
  'Jury President':             'Jury President (JP)',
  'ITPD Validator':             'ITPD Validator (ITPD-V)',
  'Independent Assessor':       'Independent Assessor (IA)',
}

export const ROLE_STATUSES = ['Vacant', 'Pending', 'Filled', 'Not Applicable'] as const

export const DOC_STATUSES: DocStatus[] = [
  'Missing',
  'Pending',
  'Complete',
  'Not Applicable',
]

// Fixed document types from the diagram
export const DOCUMENT_TYPES = [
  'Technical Description (TD)',
  'Skills Assessment Guide (SAG)',
  'Competitor Tool List (CTL)',
  'Workshop Layout (WL)',
]

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'Attending',
  'Package Secured',
  'Tentative',
  'Not Attending',
  'Not Applicable',
]

// Fixed event types from the diagram
export const EVENT_TYPES = ['SDW', 'CPM', 'EuroSkills Competition'] as const

// Roles that appear as attendees on events (from the diagram)
export const EVENT_ATTENDEE_ROLES = [
  'Chief Expert (CE)',
  'Deputy Chief Expert (DCE)',
  'Independent Test Project Developer (ITPD)',
  'Jury President (JP)',
  'Jury President Team Leader (JPTL)',
  'Workshop Manager (WM)',
  'Workshop Manager Assistant (WMA)',
  'Skills Advisor (SA)',
]

export const IMPORT_FIELD_LABELS: Record<string, string> = {
  skill_number: 'Skill Number',
  role_type: 'Role Type',
  first_name: 'First Name',
  family_name: 'Family Name',
  email: 'Email',
  nationality: 'Nationality',
  status: 'Status',
  notes: 'Notes',
}
