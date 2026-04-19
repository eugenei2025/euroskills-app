import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { importRowSchema } from '@/lib/validators'
import type { ImportRow, ValidationError } from '@/types/ui'

export function useImportJob() {
  const qc = useQueryClient()
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  const mutation = useMutation({
    mutationFn: async (rows: ImportRow[]) => {
      setValidationErrors([])
      const errors: ValidationError[] = []

      // Validate each row
      rows.forEach((row, i) => {
        const result = importRowSchema.safeParse(row)
        if (!result.success) {
          result.error.issues.forEach(issue => {
            errors.push({
              row: i + 1,
              field: issue.path.join('.'),
              message: issue.message,
            })
          })
        }
      })

      if (errors.length > 0) {
        setValidationErrors(errors)
        throw new Error(`${errors.length} validation error(s) found`)
      }

      // Create import job record
      const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          file_name: 'import.csv',
          status: 'processing',
          row_count: rows.length,
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Look up skill IDs
      const skillNumbers = [...new Set(rows.map(r => r.skill_number))]
      const { data: skills, error: skillsError } = await supabase
        .from('skills')
        .select('id, skill_number')
        .in('skill_number', skillNumbers)

      if (skillsError) throw skillsError

      const skillMap = Object.fromEntries(
        (skills ?? []).map(s => [s.skill_number, s.id])
      )

      // Upsert roles
      const roleInserts = rows
        .filter(r => skillMap[r.skill_number])
        .map(r => ({
          skill_id: skillMap[r.skill_number],
          role_type: r.role_type,
          first_name: r.first_name || null,
          family_name: r.family_name || null,
          email: r.email || null,
          nationality: r.nationality || null,
          status: 'Pending' as const,
        }))

      if (roleInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('competition_roles')
          .insert(roleInserts)
        if (insertError) throw insertError
      }

      // Mark job done
      await supabase
        .from('import_jobs')
        .update({ status: 'done' })
        .eq('id', job.id)

      return { imported: roleInserts.length, jobId: job.id }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills-with-metrics'] })
    },
  })

  return { ...mutation, validationErrors }
}
