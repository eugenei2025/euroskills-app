/**
 * UserContext — tracks who is currently using the webapp.
 *
 * The stored value in localStorage is one of:
 *   - an email string  → authenticated user with edit rights
 *   - 'view-only'      → explicit view-only session
 *   - null             → no session yet (modal will be shown)
 *
 * showModal is derived purely from currentUser:
 *   - null        → show modal
 *   - any string  → hide modal
 *
 * This avoids any async state-batching race conditions between
 * setCurrentUser() and dismissModal() calls.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'euroskills_current_user'

interface UserContextValue {
  /** The currently signed-in email, 'view-only', or null */
  currentUser: string | null
  /** Persist a new value and update modal visibility */
  setCurrentUser: (value: string | null) => void
  /** True when the sign-in modal should be shown */
  showModal: boolean
  /** Sign out — clears session and re-shows modal */
  openModal: () => void
  /** True when the user may create/edit/delete data */
  canEdit: boolean
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY) ?? null } catch { return null }
  })

  const setCurrentUser = useCallback((value: string | null) => {
    setCurrentUserState(value)
    try {
      if (value) { localStorage.setItem(STORAGE_KEY, value) }
      else        { localStorage.removeItem(STORAGE_KEY) }
    } catch { /* ignore */ }
  }, [])

  // Auto sign-out when the browser tab/window is closed.
  // 'beforeunload' fires reliably on tab close and browser close.
  // We clear localStorage so the next person who opens the app
  // always sees the login modal fresh.
  useEffect(() => {
    const handleUnload = () => {
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  const openModal = useCallback(() => {
    // Clear session — this alone causes showModal to become true (derived below)
    setCurrentUser(null)
  }, [setCurrentUser])

  // showModal is derived directly from currentUser — no separate state needed.
  // When currentUser is null the modal shows; any non-null value hides it.
  const showModal = currentUser === null

  return (
    <UserContext.Provider value={{
      currentUser,
      setCurrentUser,
      showModal,
      openModal,
      canEdit: Boolean(currentUser) && currentUser !== 'view-only',
    }}>
      {children}
    </UserContext.Provider>
  )
}

/**
 * Module-level helper — reads the current user's email from localStorage.
 * Safe to call from hooks and mutation functions (no React context needed).
 */
export function getCurrentUserName(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored || stored === 'view-only') return 'unknown'
    return stored
  } catch { return 'unknown' }
}

export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useCurrentUser must be used inside <UserProvider>')
  return ctx
}
