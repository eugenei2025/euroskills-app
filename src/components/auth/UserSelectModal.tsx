/**
 * UserSelectModal
 *
 * Shown on first load (or when "Sign out" is clicked).
 * The user must enter:
 *   1. Their email address — matched against the permitted list
 *   2. The global password — same password used in Settings → Access
 *
 * The modal closes automatically when setCurrentUser() is called with
 * any non-null value (showModal is derived from currentUser === null).
 *
 * useEffect resets local form state whenever showModal becomes true,
 * so a second login always starts with a clean form.
 */
import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/context/UserContext'
import { checkEmailPermitted, checkAdminPassword } from '@/hooks/useAppUsers'

type AuthState = 'idle' | 'checking' | 'error'

export function UserSelectModal() {
  const { setCurrentUser, showModal } = useCurrentUser()

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [authState, setAuthState] = useState<AuthState>('idle')
  const [errorMsg,  setErrorMsg]  = useState('')

  // Reset form every time the modal (re-)appears — prevents stale state
  // from a previous login attempt carrying over after sign-out
  useEffect(() => {
    if (showModal) {
      setEmail('')
      setPassword('')
      setAuthState('idle')
      setErrorMsg('')
    }
  }, [showModal])

  if (!showModal) return null

  const clearError = () => {
    if (authState === 'error') { setAuthState('idle'); setErrorMsg('') }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()
    const trimmedPwd   = password.trim()

    if (!trimmedEmail) { setErrorMsg('Please enter your email address.'); setAuthState('error'); return }
    if (!trimmedPwd)   { setErrorMsg('Please enter the password.');       setAuthState('error'); return }
    if (!trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      setAuthState('error')
      return
    }

    setAuthState('checking')
    setErrorMsg('')

    // 10-second hard deadline
    const deadline = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 10_000)
    )

    try {
      const [emailOk, passwordOk] = await Promise.race([
        Promise.all([
          checkEmailPermitted(trimmedEmail),
          checkAdminPassword(trimmedPwd),
        ]),
        deadline,
      ])

      if (!passwordOk) {
        setErrorMsg('Incorrect password. Please try again.')
        setAuthState('error')
        return
      }

      if (!emailOk) {
        // Correct password, email not on list → view-only
        setCurrentUser('view-only')
        return
      }

      // Both correct → edit access; modal closes automatically
      setCurrentUser(trimmedEmail)

    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout'
      setErrorMsg(
        isTimeout
          ? 'The server took too long to respond. Please try again.'
          : 'Could not verify credentials. Check your connection and try again.'
      )
      setAuthState('error')
    }
  }

  const handleViewOnly = () => {
    setCurrentUser('view-only')
  }

  const isChecking = authState === 'checking'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white text-lg font-bold">ES</span>
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">Sign in to EuroSkills</h2>
              <p className="text-blue-200 text-sm">Enter your credentials to access the system</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="px-6 py-6 space-y-4">

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clearError() }}
              placeholder="your.name@organisation.org"
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); clearError() }}
              placeholder="Enter the global password"
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Error message */}
          {authState === 'error' && errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
            Your email address will be recorded in the audit log against any changes you make.
            If your email is not in the permitted list you will have view-only access.
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={isChecking}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Checking…
                </>
              ) : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={handleViewOnly}
              disabled={isChecking}
              className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors disabled:opacity-50"
            >
              Continue in view-only mode
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
