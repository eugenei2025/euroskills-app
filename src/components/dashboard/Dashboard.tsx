import { useState, useEffect, useRef } from 'react'
import { useSkillsWithMetrics } from '@/hooks/useSkills'
import { useEventMandatoryRoles } from '@/hooks/useEventMandatoryRoles'
import { useGlobalSettings, useSaveGlobalSettings } from '@/hooks/useGlobalSettings'
import { MetricCard } from './MetricCard'
import { FilterBar } from './FilterBar'
import { SkillsTable } from './SkillsTable'
import { AttendanceMatrix } from './AttendanceMatrix'
import { Card } from '@/components/ui/Card'
import { SkillManagementModal } from '@/components/skill/SkillManagementModal'
import { useCurrentUser } from '@/context/UserContext'
import type { FilterState } from '@/types/ui'

const defaultFilters: FilterState = {
  search: '',
  roleStatus: 'all',
  docStatus: 'all',
  attendanceStatus: 'all',
  skillNumber: '',
  quickFilter: 'all',
}

interface DashboardProps {
  onSelectSkill: (skillId: string) => void
}

type MainTab = 'skills' | 'attendance'

// ── Editable competition name in banner ───────────────────────────────────────

function CompetitionNameBanner({ lastUpdated }: { lastUpdated: Date | null }) {
  const { data: settings } = useGlobalSettings()
  const save = useSaveGlobalSettings()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync from settings once loaded
  useEffect(() => {
    if (settings?.competition_name != null) {
      setDraft(settings.competition_name)
    }
  }, [settings?.competition_name])

  const displayName = settings?.competition_name || 'EuroSkills Skills Status Dashboard'

  const handleEdit = () => {
    setDraft(settings?.competition_name ?? 'EuroSkills Dusseldorf 2027')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSave = () => {
    save.mutate({ competition_name: draft.trim() || null })
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  { handleSave() }
    if (e.key === 'Escape') { setEditing(false) }
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 px-6 py-5 flex items-center justify-between shadow-md">
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-white text-xl font-bold bg-blue-700/60 border border-blue-300 rounded px-3 py-1 outline-none focus:ring-2 focus:ring-white/50 w-full max-w-md placeholder-blue-300"
              placeholder="e.g. EuroSkills Dusseldorf 2027"
            />
            <button
              onClick={handleSave}
              className="shrink-0 px-3 py-1 bg-white text-blue-700 text-sm font-semibold rounded hover:bg-blue-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="shrink-0 px-3 py-1 bg-blue-700/50 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 group">
            <h1 className="text-white text-xl font-bold tracking-tight truncate">{displayName}</h1>
            <button
              onClick={handleEdit}
              title="Edit competition name"
              className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-xs text-blue-200 hover:text-white border border-blue-300/50 rounded hover:border-white/60"
            >
              Edit name
            </button>
          </div>
        )}
        <p className="text-blue-200 text-sm mt-1">Skills readiness and role status overview</p>
      </div>
      <div className="text-right shrink-0 ml-6">
        <p className="text-blue-300 text-xs uppercase tracking-wide font-medium">Data last fetched</p>
        <p className="text-white font-semibold text-sm mt-0.5">
          {lastUpdated
            ? lastUpdated.toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            : '—'}
        </p>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard({ onSelectSkill }: DashboardProps) {
  const { data: skills = [], isLoading, error, dataUpdatedAt } = useSkillsWithMetrics()
  const { data: mandatoryRoles = [] } = useEventMandatoryRoles()
  const [filters, setFilters]   = useState<FilterState>(defaultFilters)
  const [mainTab, setMainTab]   = useState<MainTab>('skills')
  const [showManageSkills, setShowManageSkills] = useState(false)
  const { canEdit } = useCurrentUser()

  // Compute metrics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRoles = skills.flatMap((s: any) => (s.competition_roles ?? []).filter(Boolean))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allDocs  = skills.flatMap((s: any) => (s.supporting_documents ?? []).filter(Boolean))

  const vacantRoles  = allRoles.filter((r: { status: string }) => r.status === 'Vacant').length
  const pendingRoles = allRoles.filter((r: { status: string }) => r.status === 'Pending').length
  const filledRoles  = allRoles.filter((r: { status: string }) => r.status === 'Filled').length
  const newRoles     = allRoles.filter((r: { is_new: boolean }) => r.is_new).length
  const docsComplete = allDocs.filter((d: { status: string }) =>
    d.status === 'Complete' || d.status === 'Approved'
  ).length

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading skills…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Error loading data. Check your Supabase credentials.
      </div>
    )
  }

  const mainTabs: { id: MainTab; label: string }[] = [
    { id: 'skills',     label: 'Skills Overview' },
    { id: 'attendance', label: 'Attendance Overview' },
  ]

  return (
    <div className="space-y-6">

      {/* Banner with editable competition name */}
      <CompetitionNameBanner lastUpdated={lastUpdated} />

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Skills"  value={skills.length}  color="blue" />
        <MetricCard label="Vacant Roles"  value={vacantRoles}    color="red"    sub="Need filling" />
        <MetricCard label="Pending Roles" value={pendingRoles}   color="yellow" />
        <MetricCard label="New to Role"   value={newRoles}       color="blue"   sub="First competition" />
        <MetricCard label="Filled Roles"  value={filledRoles}    color="green" />
        <MetricCard label="Docs Complete" value={docsComplete}   color="green" />
      </div>

      {/* Main tab card */}
      <Card>
        {/* Tab bar */}
        <div className="px-6 pt-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-0">
              {mainTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setMainTab(t.id)}
                  className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    mainTab === t.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pb-2">
              <span className="text-xs text-gray-400">{skills.length} skills</span>
              {canEdit && (
                <button
                  onClick={() => setShowManageSkills(true)}
                  className="px-3 py-1 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                >
                  Manage Skills
                </button>
              )}
            </div>
          </div>

          {/* Filter bar — only for Skills Overview */}
          {mainTab === 'skills' && (
            <div className="pb-4">
              <FilterBar filters={filters} onChange={setFilters} onPrint={() => window.print()} />
            </div>
          )}
        </div>

        {/* Tab content */}
        {mainTab === 'skills' && (
          <SkillsTable
            skills={skills}
            filters={filters}
            onSelect={onSelectSkill}
          />
        )}

        {mainTab === 'attendance' && (
          <AttendanceMatrix
            skills={skills}
            mandatoryRoles={mandatoryRoles}
            onSelectSkill={onSelectSkill}
          />
        )}
      </Card>

      {/* Skill management modal — add / delete skills */}
      {showManageSkills && (
        <SkillManagementModal onClose={() => setShowManageSkills(false)} />
      )}
    </div>
  )
}
