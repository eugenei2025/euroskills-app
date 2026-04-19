import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/context/UserContext'

const navItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Import', to: '/import' },
  { label: 'Settings', to: '/settings' },
]

/** Returns the local-part of an email, e.g. "eugene.incerti" from "Eugene.Incerti@..." */
function emailLocalPart(email: string): string {
  return email.split('@')[0] ?? email
}

export function Header() {
  const location = useLocation()
  const { currentUser, openModal, canEdit } = useCurrentUser()

  const isAuthenticated = Boolean(currentUser) && currentUser !== 'view-only'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo / brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">ES</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm hidden sm:block">
              EuroSkills Skills Status
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === item.to
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User identity */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* Green badge — shows email local-part */}
                <span
                  className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-green-800 bg-green-50 border border-green-200 rounded-full px-3 py-1"
                  title={currentUser ?? ''}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  {emailLocalPart(currentUser ?? '')}
                  <span className="ml-1 text-green-600 text-xs font-semibold">✎</span>
                </span>
                <button
                  onClick={openModal}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-1"
                  title="Sign out / switch account"
                >
                  Sign out
                </button>
              </>
            ) : (
              /* Amber badge — view only or not signed in */
              <button
                onClick={openModal}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 hover:bg-amber-100 transition-colors"
                title="Sign in to edit data"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                {canEdit ? '' : currentUser === 'view-only' ? 'View only — sign in to edit' : 'Sign in to edit'}
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
