import { z } from 'zod'
import { ROLE_TYPES } from './constants'

export const competitionRoleSchema = z.object({
  role_type:   z.enum(ROLE_TYPES as [string, ...string[]]),
  status:      z.enum(['Vacant', 'Pending', 'Filled', 'Not Applicable']),
  is_new:      z.boolean().default(false),
  first_name:  z.string().max(100).nullable().optional(),
  family_name: z.string().max(100).nullable().optional(),
  email:       z.string().email().nullable().optional().or(z.literal('')),
  iso_code:    z.string().max(3).nullable().optional(),
  nationality: z.string().max(100).nullable().optional(),
  votes:       z.number().int().nullable().optional(),
  td_support:  z.boolean().default(false),
  phone:       z.string().max(50).nullable().optional(),
  notes:       z.string().max(1000).nullable().optional(),
})

export const supportingDocumentSchema = z.object({
  doc_type: z.string().min(1, 'Document type is required'),
  status:   z.enum(['Missing', 'Pending', 'Complete', 'Not Applicable']),
  due_date: z.string().nullable().optional(),
  notes:    z.string().max(1000).nullable().optional(),
})

// SkillPosition: Yes/No boolean fields use string "true"/"false" from radio inputs.
// Coercion back to boolean happens in the component's onSubmit before DB write.
export const skillPositionSchema = z.object({
  // Setup
  project_type:           z.string().nullable().optional(),
  has_itpd:               z.any().optional(),
  requires_30_percent:    z.any().optional(),
  expert_created_tp:      z.any().optional(),
  itpd_scope:             z.string().nullable().optional(), // 'full' | 'only_30_percent'
  // Delivery
  test_project_ready:     z.any().optional(),
  marking_scheme_ready:   z.any().optional(),
  marking_scheme_tested:  z.any().optional(),
  test_project_validated: z.any().optional(),
  test_project_delivered: z.string().nullable().optional(),    // actual delivery date
  tp_agreed_delivery_date: z.string().nullable().optional(),  // agreed delivery date
  // Budget
  itpd_budget:             z.number().nullable().optional(),
  itpd_flight_costs:       z.number().nullable().optional(),
  itpd_spend:              z.number().nullable().optional(),
  change_30_description:   z.string().max(1000).nullable().optional(),
  readiness_flag:          z.boolean().default(false),
  notes:                   z.string().max(2000).nullable().optional(),
})

export const skillEventSchema = z.object({
  event_type:        z.enum(['SDW', 'CPM', 'EuroSkills Competition']),
  event_date:        z.string().nullable().optional(),
  event_location:    z.string().max(200).nullable().optional(),
  attendance_status: z.enum(['Attending', 'Package Secured', 'Tentative', 'Not Attending', 'Not Applicable']),
  attendee_role:     z.string().nullable().optional(),   // maps to attendee_name column
  notes:             z.string().max(1000).nullable().optional(),
})

export const importRowSchema = z.object({
  skill_number: z.string().min(1, 'Skill number is required'),
  role_type:    z.string().min(1, 'Role type is required'),
  first_name:   z.string().optional(),
  family_name:  z.string().optional(),
  email:        z.string().email().optional().or(z.literal('')),
  nationality:  z.string().optional(),
})

export type CompetitionRoleForm  = z.infer<typeof competitionRoleSchema>
export type SupportingDocumentForm = z.infer<typeof supportingDocumentSchema>
export type SkillPositionForm    = z.infer<typeof skillPositionSchema>
export type SkillEventForm       = z.infer<typeof skillEventSchema>
export type ImportRowForm        = z.infer<typeof importRowSchema>
