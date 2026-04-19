import { useState } from 'react'
import { useSkillDetail } from '@/hooks/useSkillDetail'
import { useSkills } from '@/hooks/useSkills'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { RolesPanel } from './RolesPanel'
import { JpSaPanel } from './JpSaPanel'
import { PositionPanel } from './PositionPanel'
import { DocumentsPanel } from './DocumentsPanel'
import { EventsPanel } from './EventsPanel'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime, skillLabel } from '@/lib/utils'
import type { TabId } from '@/types/ui'

const TABS = [
  { id: 'roles',     label: 'Roles' },
  { id: 'documents', label: 'Documents' },
  { id: 'position',  label: 'Test Project' },
  { id: 'events',    label: 'Events' },
  { id: 'audit',     label: 'Audit Log' },
]

interface SkillDetailProps {
  skillId: string
  onClose: () => void
}

export function SkillDetail({ skillId, onClose }: SkillDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('roles')
  const { data: skills = [], isLoading: skillsLoading } = useSkills()
  const skill = skills.find(s => s.id === skillId)
  const { roles, documents, position, events, auditLog } = useSkillDetail(skillId)

  const tabsWithCounts = TABS.map(t => ({
    ...t,
    count:
      t.id === 'roles'     ? roles.data?.length :
      t.id === 'documents' ? documents.data?.length :
      t.id === 'events'    ? events.data?.length :
      t.id === 'audit'     ? auditLog.data?.length :
      undefined,
  }))

  // Summary badges for the header — quick health check at a glance
  const ceRole     = roles.data?.find(r => r.role_type === 'Chief Expert')
  const dceRole    = roles.data?.find(r => r.role_type === 'Deputy Chief Expert')
  const readyFlag  = position.data?.readiness_flag

  return (
    <div className="space-y-0">

      {/* ── Header bar ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              {skillsLoading ? (
                <div className="h-7 w-64 bg-gray-100 rounded animate-pulse" />
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {skill ? skillLabel(skill.skill_number, skill.skill_name) : '—'}
                  </h2>
                  {skill?.competition_mode && (
                    <p className="text-sm text-indigo-600 font-medium mt-0.5">
                      Competition Mode: {skill.competition_mode}
                    </p>
                  )}
                </div>
              )}
              {skill?.updated_at && (
                <p className="text-xs text-gray-400 mt-1">
                  Record updated {formatDateTime(skill.updated_at)}
                  {skill.updated_by ? ` by ${skill.updated_by}` : ''}
                </p>
              )}
            </div>

            {/* Quick-status summary */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">CE: </span>
                {ceRole && ceRole.status === 'Filled'
                  ? <span className="font-medium">{ceRole.first_name} {ceRole.family_name}
                      {ceRole.iso_code && <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{ceRole.iso_code}</span>}
                    </span>
                  : <span className="text-red-500">{ceRole?.status ?? 'Vacant'}</span>}
              </div>
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">DCE: </span>
                {dceRole && dceRole.status === 'Filled'
                  ? <span className="font-medium">{dceRole.first_name} {dceRole.family_name}
                      {dceRole.iso_code && <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">{dceRole.iso_code}</span>}
                    </span>
                  : <span className="text-red-500">{dceRole?.status ?? 'Vacant'}</span>}
              </div>
              <Badge variant={readyFlag ? 'success' : 'muted'}>
                {readyFlag ? 'Ready' : 'Not Ready'}
              </Badge>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <Tabs
            tabs={tabsWithCounts}
            activeTab={activeTab}
            onChange={id => setActiveTab(id as TabId)}
          />
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-6 py-6">

        {/* ROLES */}
        {activeTab === 'roles' && (
          roles.isLoading
            ? <p className="text-gray-400 text-sm py-8 text-center">Loading roles…</p>
            : (
              <>
                <JpSaPanel skillId={skillId} />
                <div className="mt-5">
                  <RolesPanel skillId={skillId} roles={roles.data ?? []} hasItpd={position.data?.has_itpd ?? null} />
                </div>
              </>
            )
        )}

        {/* DOCUMENTS */}
        {activeTab === 'documents' && (
          documents.isLoading
            ? <p className="text-gray-400 text-sm py-8 text-center">Loading documents…</p>
            : <DocumentsPanel skillId={skillId} documents={documents.data ?? []} />
        )}

        {/* POSITION */}
        {activeTab === 'position' && (
          position.isLoading
            ? <p className="text-gray-400 text-sm py-8 text-center">Loading position data…</p>
            : <PositionPanel
                skillId={skillId}
                position={position.data}
                itpdCount={(roles.data ?? []).filter(r => r.role_type === 'ITPD').length}
              />
        )}

        {/* EVENTS */}
        {activeTab === 'events' && (
          events.isLoading
            ? <p className="text-gray-400 text-sm py-8 text-center">Loading events…</p>
            : <EventsPanel skillId={skillId} events={events.data ?? []} />
        )}

        {/* AUDIT LOG */}
        {activeTab === 'audit' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Audit Log</h3>
            {auditLog.isLoading ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : (auditLog.data ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No audit entries yet.</p>
            ) : (
              <div className="space-y-2">
                {(auditLog.data ?? []).map(log => {
                  // Human-readable section labels
                  const sectionLabel: Record<string, string> = {
                    competition_roles:    'Roles',
                    supporting_documents: 'Documents',
                    skill_positions:      'Test Project',
                    skill_events:         'Events',
                  }
                  const section = sectionLabel[log.table_name] ?? log.table_name

                  // Build a short summary of key changed fields
                  const summarise = (data: Record<string, unknown> | null) => {
                    if (!data) return null
                    const skip = new Set(['id', 'skill_id', 'created_at', 'updated_at', 'updated_by'])
                    const entries = Object.entries(data).filter(([k]) => !skip.has(k))
                    if (entries.length === 0) return null
                    return entries
                      .slice(0, 6)
                      .map(([k, v]) => `${k}: ${v ?? '—'}`)
                      .join(' · ')
                  }

                  const summary = log.action === 'UPDATE'
                    ? summarise(log.new_data)
                    : log.action === 'INSERT'
                    ? summarise(log.new_data)
                    : summarise(log.old_data)

                  const changedBy: string = log.changed_by ?? 'unknown'

                  return (
                    <div key={log.id} className="border border-gray-100 rounded-lg px-4 py-3 bg-white text-xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-gray-400">{formatDateTime(log.changed_at)}</span>
                        <span className="font-semibold text-gray-700">{section}</span>
                        <Badge variant={log.action === 'INSERT' ? 'success' : log.action === 'DELETE' ? 'danger' : 'info'}>
                          {log.action}
                        </Badge>
                        <span className="text-gray-500">
                          by <strong className="text-gray-800 font-bold">{changedBy}</strong>
                        </span>
                      </div>
                      {summary && (
                        <p className="mt-1 text-gray-500 font-mono text-xs truncate">{summary}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
