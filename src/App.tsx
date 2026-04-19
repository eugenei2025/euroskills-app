import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SkillDetail } from '@/components/skill/SkillDetail'
import { ImportWizard } from '@/components/import/ImportWizard'
import { EventMandatoryRolesSettings } from '@/components/settings/EventMandatoryRolesSettings'
import { JuryPresidentsSettings } from '@/components/settings/JuryPresidentsSettings'
import { AccessSettings } from '@/components/settings/AccessSettings'
import { UserSelectModal } from '@/components/auth/UserSelectModal'
import { useSettingsAuditLog } from '@/hooks/useJuryPresidents'
import type { AuditLog } from '@/types/database'

// ── Settings Audit Log tab ────────────────────────────────────────────────────

const TABLE_LABELS: Record<string, string> = {
  global_jury_presidents:  'Jury Presidents',
  global_skills_advisors:  'Skills Advisors',
  skill_jp_assignments:    'JP/JPTL Skill Assignment',
  skill_sa_assignments:    'SA Skill Assignment',
  global_settings:         'General & Pricing',
  event_mandatory_roles:   'Event Mandatory Roles',
}

const ACTION_COLOURS: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100  text-blue-700',
  DELETE: 'bg-red-100   text-red-700',
}

function formatAuditData(data: Record<string, unknown> | null): string {
  if (!data) return '—'
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

function SettingsAuditLogPanel() {
  const { data: entries = [], isLoading } = useSettingsAuditLog()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return <p className="text-sm text-gray-500 py-8 text-center">Loading audit log…</p>
  }

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm">
        No settings changes recorded yet. Changes to Jury Presidents, Skills Advisors, Assignments,
        Event Mandatory Roles, and General &amp; Pricing will appear here.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-4">
        Showing the last {entries.length} settings changes, most recent first.
      </p>
      {entries.map((entry: AuditLog) => {
        const isExpanded = expandedId === entry.id
        const tableLabel = TABLE_LABELS[entry.table_name] ?? entry.table_name
        const actionCls  = ACTION_COLOURS[entry.action] ?? 'bg-gray-100 text-gray-600'
        const ts = new Date(entry.changed_at).toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })

        return (
          <div
            key={entry.id}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            {/* Summary row */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${actionCls}`}>
                {entry.action}
              </span>
              <span className="text-sm font-medium text-gray-800 shrink-0">{tableLabel}</span>
              <span className="text-xs text-gray-400 truncate flex-1">
                ID: {entry.record_id}
              </span>
              <span className="text-xs text-gray-500 shrink-0">
                by <strong className="font-semibold text-gray-700">{entry.changed_by ?? 'unknown'}</strong>
              </span>
              <span className="text-xs text-gray-400 shrink-0">{ts}</span>
              <span className="text-gray-400 text-xs shrink-0">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 text-xs">
                <div>
                  <p className="font-semibold text-gray-600 uppercase tracking-wide mb-1">Before</p>
                  <pre className="whitespace-pre-wrap break-all bg-white border border-gray-200 rounded p-2 text-gray-600 max-h-48 overflow-y-auto">
                    {formatAuditData(entry.old_data as Record<string, unknown> | null)}
                  </pre>
                </div>
                <div>
                  <p className="font-semibold text-gray-600 uppercase tracking-wide mb-1">After</p>
                  <pre className="whitespace-pre-wrap break-all bg-white border border-gray-200 rounded p-2 text-gray-600 max-h-48 overflow-y-auto">
                    {formatAuditData(entry.new_data as Record<string, unknown> | null)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Settings page ─────────────────────────────────────────────────────────────

type SettingsTab = 'general' | 'events' | 'jury' | 'auditlog' | 'access'

function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('general')
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'general',  label: 'General & Pricing' },
    { id: 'events',   label: 'Event Mandatory Roles' },
    { id: 'jury',     label: 'Jury Presidents & SAs' },
    { id: 'auditlog', label: 'Audit Log' },
    { id: 'access',   label: 'Access' },
  ]
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Settings</h1>
      {/* Top-level settings tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'general'  && <EventMandatoryRolesSettings generalOnly />}
      {tab === 'events'   && <EventMandatoryRolesSettings eventsOnly />}
      {tab === 'jury'     && <JuryPresidentsSettings />}
      {tab === 'auditlog' && <SettingsAuditLogPanel />}
      {tab === 'access'   && <AccessSettings />}
    </div>
  )
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSelectSkill = (skillId: string) => {
    setSelectedSkillId(skillId)
    navigate('/')
  }

  const handleCloseDetail = () => {
    setSelectedSkillId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <UserSelectModal />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route
            path="/"
            element={
              selectedSkillId ? (
                <SkillDetail
                  skillId={selectedSkillId}
                  onClose={handleCloseDetail}
                />
              ) : (
                <Dashboard onSelectSkill={handleSelectSkill} />
              )
            }
          />
          <Route
            path="/import"
            element={<ImportWizard />}
          />
          <Route
            path="/settings"
            element={<SettingsPage />}
          />
        </Routes>
      </main>
    </div>
  )
}
