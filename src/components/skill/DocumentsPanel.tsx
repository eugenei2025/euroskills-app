import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useUpsertDocument } from '@/hooks/useSkillDetail'
import { supportingDocumentSchema, type SupportingDocumentForm } from '@/lib/validators'
import { docStatusVariant } from '@/lib/utils'
import { DOC_STATUSES, DOCUMENT_TYPES } from '@/lib/constants'
import { useCurrentUser } from '@/context/UserContext'
import type { SupportingDocument, DocStatus } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentsPanelProps {
  skillId: string
  documents: SupportingDocument[]
}

interface DocRowProps {
  skillId: string
  docType: string
  existing: SupportingDocument | undefined
}

// ── Status label map ──────────────────────────────────────────────────────────

const STATUS_LABELS: Record<DocStatus, string> = {
  'Missing':        'Documents Missing',
  'Pending':        'Documents Pending',
  'Complete':       'Document Complete',
  'Not Applicable': 'Not Applicable for this skill',
}

// ── DocRow ────────────────────────────────────────────────────────────────────

function DocRow({ skillId, docType, existing }: DocRowProps) {
  const [editing, setEditing] = useState(false)
  // Use the audit-aware hook from useSkillDetail (writes to audit_log)
  const upsert = useUpsertDocument(skillId)
  const { canEdit } = useCurrentUser()

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<SupportingDocumentForm>({
    resolver: zodResolver(supportingDocumentSchema),
    defaultValues: existing
      ? {
          doc_type: existing.doc_type,
          status:   existing.status,
          due_date: existing.due_date ?? undefined,
          notes:    existing.notes   ?? undefined,
        }
      : { doc_type: docType, status: 'Missing' },
  })

  const watchedStatus = watch('status')
  const isComplete      = watchedStatus === 'Complete'
  const isNotApplicable = watchedStatus === 'Not Applicable'

  const onSubmit = (data: SupportingDocumentForm) => {
    // Clear date when Not Applicable
    const payload = {
      ...(data as Partial<SupportingDocument>),
      id:       existing?.id,
      due_date: isNotApplicable ? null : (data.due_date ?? null),
    }
    upsert.mutate(payload, { onSuccess: () => setEditing(false) })
  }

  const notApplicable = existing?.status === 'Not Applicable'

  // ── Display mode ──────────────────────────────────────────────
  if (!editing) {
    return (
      <div className={`border rounded-lg overflow-hidden ${notApplicable ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <span className={`text-sm font-medium ${notApplicable ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {docType}
          </span>
          <div className="flex items-center gap-2">
            {existing ? (
              <>
                <Badge variant={docStatusVariant(existing.status)}>
                  {STATUS_LABELS[existing.status] ?? existing.status}
                </Badge>
                <button
                  onClick={() => canEdit && setEditing(true)}
                  disabled={!canEdit}
                  title={!canEdit ? 'Select your name to edit' : undefined}
                  className={`text-xs ml-2 ${canEdit ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                >
                  Edit
                </button>
              </>
            ) : (
              <>
                <Badge variant="muted">Not Set</Badge>
                <button
                  onClick={() => canEdit && setEditing(true)}
                  disabled={!canEdit}
                  title={!canEdit ? 'Select your name to edit' : undefined}
                  className={`text-xs ml-2 ${canEdit ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                >
                  Set
                </button>
              </>
            )}
          </div>
        </div>

        {/* Date + notes detail */}
        {existing && !notApplicable && (existing.due_date || existing.notes) && (
          <div className="px-4 py-2 border-t border-gray-100 bg-white grid grid-cols-2 gap-3 text-xs">
            {existing.due_date && (
              <div>
                {/* Label changes based on status */}
                <p className="text-gray-400 uppercase tracking-wide mb-0.5">
                  {existing.status === 'Complete' ? 'Approved Date' : 'Due Date'}
                </p>
                <p className="text-gray-700">{existing.due_date}</p>
              </div>
            )}
            {existing.notes && (
              <div className={existing.due_date ? '' : 'col-span-2'}>
                <p className="text-gray-400 uppercase tracking-wide mb-0.5">Notes</p>
                <p className="text-gray-600">{existing.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Edit / Set form ────────────────────────────────────────────
  return (
    <div className="border-2 border-blue-300 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-blue-50 flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-800">{docType}</span>
        <button
          onClick={() => { setEditing(false); reset() }}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-4 bg-white space-y-3">
        <input type="hidden" {...register('doc_type')} value={docType} />

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Document Status</label>
          <select
            {...register('status')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {DOC_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          {errors.status && (
            <p className="text-red-500 text-xs mt-0.5">{errors.status.message}</p>
          )}
        </div>

        {/* Date — hidden when Not Applicable. Label changes to "Approved Date" when Complete */}
        {!isNotApplicable && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              {isComplete ? 'Approved Date' : 'Due Date'} (optional)
            </label>
            <input
              {...register('due_date')}
              type="date"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        {/* Notes */}
        {!isNotApplicable && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={upsert.isPending}>Save</Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => { setEditing(false); reset() }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── DocumentsPanel ────────────────────────────────────────────────────────────

export function DocumentsPanel({ skillId, documents }: DocumentsPanelProps) {
  const docMap: Record<string, SupportingDocument> = {}
  for (const d of documents) {
    docMap[d.doc_type] = d
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Supporting Documents</h3>
        <span className="text-xs text-gray-400">Click Set or Edit to update each document</span>
      </div>

      {DOCUMENT_TYPES.map(docType => (
        <DocRow
          key={docType}
          skillId={skillId}
          docType={docType}
          existing={docMap[docType]}
        />
      ))}
    </div>
  )
}
