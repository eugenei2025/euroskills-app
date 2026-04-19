/**
 * Hooks for email-based access control.
 *
 * Login flow:
 *   1. User enters their email address + the global password.
 *   2. Email is matched (case-insensitively) against the app_users table.
 *   3. Password is checked against the SHA-256 hash in global_settings.
 *   4. Both must pass — only then is the user granted edit access.
 *
 * The global password is the same one used to manage the email list in Settings → Access.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface AppUser {
  id: string
  email: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const QUERY_KEY = ['app-users']

// ── Hardcoded fallback list ───────────────────────────────────────────────────
// Used when the app_users table doesn't exist yet (migration not run) or is empty.
// Emails are stored lowercase-normalised for comparison.
export const FALLBACK_EMAILS: string[] = [
  'eugene.incerti@worldskillseurope.org',
  'patrik.svensson@worldskills.se',
  'zsofia.csiszar@worldskillseurope.org',
  'katie.zorzetto@worldskillseurope.org',
  'greta.wolny@worldskillseurope.org',
  'jordy.degroot@worldskillseurope.org',
  'alina.fleaca@worldskills.be',
]

export const FALLBACK_USERS: AppUser[] = FALLBACK_EMAILS.map((email, i) => ({
  id:         `fallback-${i + 1}`,
  email,
  is_active:  true,
  created_at: '',
  updated_at: '',
}))

// ── SHA-256 hash helper (Web Crypto API — all modern browsers) ────────────────

export async function sha256Hex(message: string): Promise<string> {
  const msgBuffer  = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray  = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Fetch all active users ────────────────────────────────────────────────────

export function useAppUsers() {
  return useQuery<AppUser[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('is_active', true)
        .order('email')
        .then(r => r)
      if (error || !data || data.length === 0) return FALLBACK_USERS
      return data as AppUser[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Fetch ALL users including inactive — for the admin panel
export function useAllAppUsers() {
  return useQuery<AppUser[]>({
    queryKey: [...QUERY_KEY, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('email')
        .then(r => r)
      if (error || !data || data.length === 0) return FALLBACK_USERS
      return data as AppUser[]
    },
    staleTime: 60 * 1000,
  })
}

// ── Add / toggle / delete ─────────────────────────────────────────────────────

export function useAddAppUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('app_users')
        .insert({ email: email.toLowerCase().trim(), is_active: true })
        .then(r => r)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useToggleAppUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('app_users')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(r => r)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteAppUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_users')
        .delete()
        .eq('id', id)
        .then(r => r)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

// ── Admin password check ──────────────────────────────────────────────────────
// Password is stored as SHA-256 in global_settings.admin_password_hash.
// runWithTimeout() takes an async factory fn so the query is created AND awaited
// inside a real Promise — preventing the PostgrestBuilder-vs-Promise issue that
// caused the "Checking..." hang in previous versions.

async function runWithTimeout<T>(fn: () => Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ])
}

export async function checkAdminPassword(input: string): Promise<boolean> {
  // Hash locally first — no network needed
  const [inputHash, defaultHash] = await Promise.all([
    sha256Hex(input),
    sha256Hex('Incerti2026'),
  ])

  try {
    const { data, error } = await runWithTimeout(async () => {
      return supabase
        .from('global_settings')
        .select('id, admin_password_hash')
        .limit(1)
        .maybeSingle()
    })

    if (error || !data) {
      // DB unavailable — accept the default password only
      return inputHash === defaultHash
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data as any
    const storedHash: string | null = row.admin_password_hash ?? null
    const rowId: string = row.id

    if (!storedHash) {
      // No hash stored yet — first login bootstraps with default password
      if (inputHash === defaultHash) {
        // Save hash in background, don't block the login
        void Promise.resolve(
          supabase
            .from('global_settings')
            .update({ admin_password_hash: defaultHash })
            .eq('id', rowId)
        ).catch(() => undefined)
        return true
      }
      return false
    }

    return inputHash === storedHash

  } catch {
    // Timed out or network error — fall back to default password
    return inputHash === defaultHash
  }
}

export async function changeAdminPassword(newPassword: string): Promise<void> {
  const hash = await sha256Hex(newPassword)
  const { data } = await supabase
    .from('global_settings')
    .select('id')
    .limit(1)
    .maybeSingle()
  if (data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase
      .from('global_settings')
      .update({ admin_password_hash: hash })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq('id', (data as any).id)
  } else {
    await supabase.from('global_settings').insert({ admin_password_hash: hash })
  }
}

// ── Email access check ────────────────────────────────────────────────────────
// Returns true if the given email is in the active permitted list.
// Falls back to the hardcoded list if the DB is unavailable or times out.

export async function checkEmailPermitted(email: string): Promise<boolean> {
  const normalised = email.toLowerCase().trim()

  try {
    const { data, error } = await runWithTimeout(async () => {
      // Use filter with lower() for reliable case-insensitive matching
      return supabase
        .from('app_users')
        .select('id')
        .eq('is_active', true)
        .filter('email', 'ilike', normalised)
        .limit(1)
        .maybeSingle()
    })

    if (error) {
      // DB error — fall back to hardcoded list
      return FALLBACK_EMAILS.includes(normalised)
    }

    return data !== null

  } catch {
    // Timed out — fall back to hardcoded list
    return FALLBACK_EMAILS.includes(normalised)
  }
}
