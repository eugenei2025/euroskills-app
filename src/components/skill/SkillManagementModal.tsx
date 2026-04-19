/**
 * SkillManagementModal
 *
 * Allows authorised users to:
 *  - Add a new skill (skill_number + skill_name required, competition_mode optional)
 *  - Delete an existing skill (soft-delete: is_active = false) with confirmation warning
 *
 * Triggered from the Dashboard header ("Manage Skills" button).
 */

import { useState } from 'react'
import { useSkills, useAddSkill, useDeleteSkill } from '@/hooks/useSkills'
import { skillLabel } from '@/lib/utils'

interface Props {
  onClose: () => void
}

type View = 'list' | 'add'

export function SkillManagementModal({ onClose }: Props) {
  const { data: skills = [], isLoading } = useSkills()
  const addSkill    = useAddSkill()
  const deleteSkill = useDeleteSkill()

  const [view, setView]                         = useState<View>('list')
  const [deleteConfirm, setDeleteConfirm]       = useState<string | null>(null)  // skill id pending confirmation
  const [deleteError, setDeleteError]           = useState<string | null>(null)

  // Add-skill form state
  const [skillNumber, setSkillNumber]           = useState('')
  const [skillName, setSkillName]               = useState('')
  const [competitionMode, setCompetitionMode]   = useState('')
  const [addError, setAddError]                 = useState<string | null>(null)
  const [addSuccess, setAddSuccess]             = useState(false)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDeleteRequest = (skillId: string) => {
    setDeleteConfirm(skillId)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    try {
      await deleteSkill.mutateAsync(deleteConfirm)
      setDeleteConfirm(null)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError(null)
    setAddSuccess(false)

    const trimmedNumber = skillNumber.trim()
    const trimmedName   = skillName.trim()

    if (!trimmedNumber) { setAddError('Skill number is required.'); return }
    if (!trimmedName)   { setAddError('Skill name is required.'); return }

    // Check for duplicate skill_number
    if (skills.some(s => s.skill_number.toLowerCase() === trimmedNumber.toLowerCase())) {
      setAddError(`Skill number "${trimmedNumber}" already exists.`)
      return
    }

    try {
      await addSkill.mutateAsync({
        skill_number:    trimmedNumber,
        skill_name:      trimmedName,
        competition_mode: competitionMode.trim() || null,
      })
      setAddSuccess(true)
      setSkillNumber('')
      setSkillName('')
      setCompetitionMode('')
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Add skill failed')
    }
  }

  // ── Skill being deleted (for the warning dialog) ──────────────────────────
  const skillToDelete = deleteConfirm ? skills.find(s => s.id === deleteConfirm) : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Manage Skills</h2>
            {/* Tab switcher */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
              <button
                onClick={() => { setView('list'); setAddSuccess(false) }}
                className={`px-3 py-1 font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Skill List
              </button>
              <button
                onClick={() => { setView('add'); setAddSuccess(false) }}
                className={`px-3 py-1 font-medium transition-colors ${
                  view === 'add'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                + Add New Skill
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── LIST VIEW ──────────────────────────────────────────────────── */}
          {view === 'list' && (
            <>
              {isLoading ? (
                <p className="text-gray-400 text-sm py-8 text-center">Loading skills…</p>
              ) : skills.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No active skills found.</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 mb-3">
                    {skills.length} active skill{skills.length !== 1 ? 's' : ''}.
                    Deleting a skill removes it from the dashboard but preserves all historical data.
                  </p>
                  {skills.map(skill => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded shrink-0">
                          {skill.skill_number}
                        </span>
                        <span className="text-sm text-gray-800 font-medium truncate">
                          {skill.skill_name}
                        </span>
                        {skill.competition_mode && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded shrink-0">
                            {skill.competition_mode}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteRequest(skill.id)}
                        className="shrink-0 ml-3 px-3 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ADD VIEW ───────────────────────────────────────────────────── */}
          {view === 'add' && (
            <form onSubmit={handleAddSubmit} className="space-y-5 max-w-md">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Skill Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={skillNumber}
                  onChange={e => setSkillNumber(e.target.value)}
                  placeholder="e.g. 58"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Must be unique — used in the skill label throughout the app.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Skill Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={skillName}
                  onChange={e => setSkillName(e.target.value)}
                  placeholder="e.g. Cloud Computing"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Competition Mode <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={competitionMode}
                  onChange={e => setCompetitionMode(e.target.value)}
                  placeholder="e.g. SC, TC, SC+TC"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Shown in the skill detail header. Can be set or updated later.</p>
              </div>

              {addError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {addError}
                </div>
              )}

              {addSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 font-medium">
                  Skill added successfully. It now appears in the dashboard and all dropdowns.
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={addSkill.isPending}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {addSkill.isPending ? 'Adding…' : 'Add Skill'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSkillNumber(''); setSkillName(''); setCompetitionMode('')
                    setAddError(null); setAddSuccess(false)
                  }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Clear
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* ── Delete confirmation dialog ──────────────────────────────────────── */}
      {deleteConfirm && skillToDelete && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Delete Skill?</h3>
                <p className="text-sm text-gray-600">
                  You are about to delete{' '}
                  <strong className="text-gray-900">
                    {skillLabel(skillToDelete.skill_number, skillToDelete.skill_name)}
                  </strong>
                  {' '}from the dashboard.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will remove the skill from all lists and overviews. All existing role, document, and audit data will be preserved in the database.
                  <strong className="text-red-600"> This action cannot be easily undone.</strong>
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteSkill.isPending}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteSkill.isPending ? 'Deleting…' : 'Yes, Delete Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
