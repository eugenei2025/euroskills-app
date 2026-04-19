import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  useAllAppUsers,
  useAddAppUser,
  useToggleAppUser,
  useDeleteAppUser,
  checkAdminPassword,
  changeAdminPassword,
} from '@/hooks/useAppUsers'
import { useResetAllAuditLogs } from '@/hooks/useJuryPresidents'
import type { AppUser } from '@/hooks/useAppUsers'

// ── Password Gate ─────────────────────────────────────────────────────────────

function PasswordGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [pwd, setPwd]         = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwd.trim()) return
    setChecking(true)
    setError('')
    try {
      const ok = await checkAdminPassword(pwd)
      if (ok) { onUnlocked() }
      else    { setError('Incorrect password. Please try again.') }
    } catch {
      setError('Error checking password. Try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-8">
      <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-xl">
            🔒
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Admin Password Required</h3>
            <p className="text-xs text-gray-500">Enter the global password to manage email access</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
            <input
              type="password"
              value={pwd}
              onChange={e => { setPwd(e.target.value); setError('') }}
              placeholder="Enter admin password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <Button type="submit" size="sm" loading={checking} className="w-full">
            Unlock
          </Button>
        </form>

        <p className="text-xs text-gray-400 text-center">
          Initial password: <strong>Incerti2026</strong>
        </p>
      </div>
    </div>
  )
}

// ── Access Management Panel ───────────────────────────────────────────────────

function AccessManagementPanel() {
  const { data: users = [], isLoading } = useAllAppUsers()
  const addUser         = useAddAppUser()
  const toggleUser      = useToggleAppUser()
  const deleteUser      = useDeleteAppUser()
  const resetAuditLogs  = useResetAllAuditLogs()

  const [newEmail, setNewEmail]     = useState('')
  const [addError, setAddError]     = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Change password state
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [oldPwd,     setOldPwd]     = useState('')
  const [newPwd,     setNewPwd]     = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError,   setPwdError]   = useState('')
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)

  // Audit log reset
  const [confirmAuditReset, setConfirmAuditReset] = useState(false)
  const [auditResetDone, setAuditResetDone]       = useState(false)

  const handleAddEmail = () => {
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed) { setAddError('Please enter an email address.'); return }
    if (!trimmed.includes('@')) { setAddError('Please enter a valid email address.'); return }
    if (users.some(u => u.email.toLowerCase() === trimmed)) {
      setAddError('That email address already exists.')
      return
    }
    addUser.mutate(trimmed, {
      onSuccess: () => { setNewEmail(''); setAddError('') },
      onError:   () => setAddError('Failed to add email. Try again.'),
    })
  }

  const handleChangePassword = async () => {
    setPwdError(''); setPwdSuccess(false)
    if (!oldPwd || !newPwd || !confirmPwd) { setPwdError('All fields are required.'); return }
    if (newPwd !== confirmPwd)             { setPwdError('New passwords do not match.'); return }
    if (newPwd.length < 8)                { setPwdError('Password must be at least 8 characters.'); return }
    setChangingPwd(true)
    try {
      const ok = await checkAdminPassword(oldPwd)
      if (!ok) { setPwdError('Current password is incorrect.'); return }
      await changeAdminPassword(newPwd)
      setPwdSuccess(true)
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
      setTimeout(() => setShowChangePwd(false), 1500)
    } catch {
      setPwdError('Failed to change password.')
    } finally {
      setChangingPwd(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Section header */}
      <div>
        <h2 className="text-base font-semibold text-gray-900">Permitted Email Addresses</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Only users who sign in with one of these email addresses <strong>and</strong> the correct
          global password can edit data. Anyone else has view-only access.
        </p>
      </div>

      {/* Email list */}
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Email Address</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u: AppUser) => (
                <tr key={u.id} className={u.is_active ? '' : 'opacity-50'}>
                  <td className="px-4 py-3 font-mono text-sm text-gray-800">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      u.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => toggleUser.mutate({ id: u.id, isActive: !u.is_active })}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                      {confirmDelete === u.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600">Remove?</span>
                          <button
                            onClick={() => { deleteUser.mutate(u.id); setConfirmDelete(null) }}
                            className="text-xs text-red-600 font-semibold hover:underline"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs text-gray-500 hover:underline"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(u.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add new email */}
      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Add a permitted email</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={e => { setNewEmail(e.target.value); setAddError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAddEmail()}
            placeholder="name@organisation.org"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Button type="button" size="sm" onClick={handleAddEmail} loading={addUser.isPending}>
            Add
          </Button>
        </div>
        {addError && <p className="text-red-500 text-xs">{addError}</p>}
      </div>

      {/* Change global password */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowChangePwd(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
        >
          <span>Change Global Password</span>
          <span className="text-gray-400 text-xs">{showChangePwd ? '▲' : '▼'}</span>
        </button>

        {showChangePwd && (
          <div className="px-4 py-4 bg-white space-y-3">
            <p className="text-xs text-gray-500">
              This changes the password required both to sign in and to access this settings panel.
            </p>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Current Password</label>
              <input type="password" value={oldPwd}
                onChange={e => { setOldPwd(e.target.value); setPwdError('') }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">New Password (min 8 characters)</label>
              <input type="password" value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setPwdError('') }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setPwdError('') }}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            {pwdError   && <p className="text-red-500 text-xs">{pwdError}</p>}
            {pwdSuccess  && <p className="text-green-600 text-xs font-semibold">Password changed successfully.</p>}
            <Button type="button" size="sm" onClick={handleChangePassword} loading={changingPwd}>
              Change Password
            </Button>
          </div>
        )}
      </div>

      {/* ── Danger Zone: Reset All Audit Logs ───────────────────────── */}
      <div className="border border-red-200 rounded-xl overflow-hidden mt-6">
        <div className="px-4 py-2.5 bg-red-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-red-700">Danger Zone</span>
        </div>
        <div className="px-4 py-4 bg-white space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Reset All Audit Logs</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Permanently deletes every entry from all audit logs (both skill-level and settings-level).
              This cannot be undone.
            </p>
          </div>
          {auditResetDone && (
            <p className="text-xs text-green-600 font-semibold">All audit logs have been cleared.</p>
          )}
          {!confirmAuditReset ? (
            <button
              onClick={() => setConfirmAuditReset(true)}
              className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Reset All Audit Logs…
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-red-700 font-medium">Are you sure? This is irreversible.</p>
              <button
                onClick={() => {
                  resetAuditLogs.mutate(undefined, {
                    onSuccess: () => {
                      setConfirmAuditReset(false)
                      setAuditResetDone(true)
                    },
                  })
                }}
                disabled={resetAuditLogs.isPending}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {resetAuditLogs.isPending ? 'Clearing…' : 'Yes, Clear All Logs'}
              </button>
              <button
                onClick={() => setConfirmAuditReset(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AccessSettings (password-gated wrapper) ───────────────────────────────────

export function AccessSettings() {
  const [unlocked, setUnlocked] = useState(false)

  if (!unlocked) {
    return <PasswordGate onUnlocked={() => setUnlocked(true)} />
  }

  return <AccessManagementPanel />
}
