import type { BadgeVariant } from '@/types/ui'
import type { RoleStatus, DocStatus, AttendanceStatus } from '@/types/database'

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function roleStatusVariant(status: RoleStatus): BadgeVariant {
  switch (status) {
    case 'Filled':         return 'success'
    case 'Pending':        return 'warning'
    case 'Vacant':         return 'danger'
    case 'Not Applicable': return 'muted'
  }
}

export function docStatusVariant(status: DocStatus): BadgeVariant {
  switch (status) {
    case 'Complete':       return 'success'
    case 'Pending':        return 'warning'
    case 'Missing':        return 'danger'
    case 'Not Applicable': return 'muted'
  }
}

export function attendanceVariant(status: AttendanceStatus): BadgeVariant {
  switch (status) {
    case 'Attending':        return 'success'
    case 'Package Secured':  return 'info'
    case 'Tentative':        return 'warning'
    case 'Not Attending':    return 'danger'
    case 'Not Applicable':   return 'muted'
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function skillLabel(skillNumber: string, skillName: string): string {
  return `${skillNumber} — ${skillName}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
