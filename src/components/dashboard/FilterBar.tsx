import { useState } from 'react'
import { ROLE_STATUSES, DOC_STATUSES, DOCUMENT_TYPES } from '@/lib/constants'
import type { FilterState, QuickFilter, TpStatusFilter, GroupByMode } from '@/types/ui'
import type { RoleType } from '@/types/database'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  filters: FilterState
  onChange: (f: FilterState) => void
  onPrint: () => void
}

// ── Role types that appear in competition_roles ────────────────────────────────
const ROLE_TYPES_FOR_FILTER: { value: RoleType | 'all'; label: string }[] = [
  { value: 'all',                       label: 'Any Role Type' },
  { value: 'Chief Expert',              label: 'Chief Expert (CE)' },
  { value: 'Deputy Chief Expert',       label: 'Deputy Chief Expert (DCE)' },
  { value: 'Workshop Manager',          label: 'Workshop Manager (WM)' },
  { value: 'ITPD',                      label: 'ITPD' },
  { value: 'Sector Manager',            label: 'Sector Manager' },
  { value: 'Workshop Manager Assistant',label: 'Workshop Manager Assistant' },
  { value: 'ITPD Validator',            label: 'ITPD Validator' },
  { value: 'Independent Assessor',      label: 'Independent Assessor' },
]

// ── TP status dropdown options ────────────────────────────────────────────────
const TP_STATUS_OPTIONS: { value: TpStatusFilter; label: string }[] = [
  { value: 'all',          label: 'Any TP Status' },
  { value: 'tp_ready',     label: 'TP Ready' },
  { value: 'tp_validated', label: 'TP Validated' },
  { value: 'tp_delivered', label: 'TP Delivered' },
  { value: 'ms_ready',     label: 'Marking Scheme Ready' },
  { value: 'ms_tested',    label: 'Marking Scheme Tested' },
  { value: 'tp_not_ready', label: 'TP Not Ready' },
  { value: 'tp_overdue',   label: 'TP Overdue' },
  { value: 'tp_incomplete','label': 'TP Incomplete (any flag missing)' },
]

// ── Group-by options ──────────────────────────────────────────────────────────
const GROUP_BY_OPTIONS: { value: GroupByMode; label: string }[] = [
  { value: 'none',      label: 'No grouping' },
  { value: 'roles_tl',  label: 'Group by Roles status' },
  { value: 'docs_tl',   label: 'Group by Docs status' },
  { value: 'tp_status', label: 'Group by TP status' },
  { value: 'doc_status','label': 'Group by Document type' },
  { value: 'role_type', label: 'Group by Role type' },
]

// ── Quick filter definitions ──────────────────────────────────────────────────
interface QuickFilterDef {
  id: QuickFilter
  label: string
  color: string
  section: 'roles' | 'docs' | 'tp'
}

const QUICK_FILTERS: QuickFilterDef[] = [
  { id: 'missing_ce',     label: 'Missing CE',           color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',       section: 'roles' },
  { id: 'missing_dce',    label: 'Missing DCE',          color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',       section: 'roles' },
  { id: 'missing_wm',     label: 'Missing WM',           color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200',       section: 'roles' },
  { id: 'has_vacant',     label: 'Has Vacant Roles',     color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200', section: 'roles' },
  { id: 'no_docs',        label: 'No Documents',         color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200', section: 'docs' },
  { id: 'docs_incomplete','label': 'Docs Incomplete',    color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200', section: 'docs' },
  { id: 'missing_tp',     label: 'Missing TP',           color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200', section: 'tp' },
  { id: 'missing_ms',     label: 'Missing Marking Scheme', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200', section: 'tp' },
]

const SELECT_CLS = 'border border-gray-300 rounded-md px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white w-full'
const LABEL_CLS  = 'block text-xs font-medium text-gray-600 mb-1'

// ── Count of active (non-default) filters ─────────────────────────────────────
function activeFilterCount(f: FilterState): number {
  let n = 0
  if (f.search)                     n++
  if (f.roleStatus !== 'all')       n++
  if (f.roleType   !== 'all')       n++
  if (f.docStatus  !== 'all')       n++
  if (f.docType    !== 'all')       n++
  if (f.tpStatus   !== 'all')       n++
  if (f.quickFilter !== 'all')      n++
  return n
}

export function FilterBar({ filters, onChange, onPrint }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)
  const set = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial })

  const clearAll = () => onChange({
    search:           '',
    roleStatus:       'all',
    roleType:         'all',
    docStatus:        'all',
    docType:          'all',
    attendanceStatus: 'all',
    skillNumber:      '',
    quickFilter:      'all',
    tpStatus:         'all',
    groupBy:          'none',
  })

  const activeCount = activeFilterCount(filters)

  return (
    <div className="space-y-3">

      {/* ── Top bar: search + quick toggles + expand button ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={filters.search}
            onChange={e => set({ search: e.target.value })}
            placeholder="Skill number or name…"
            className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-52"
          />
          {filters.search && (
            <button
              onClick={() => set({ search: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={() => setExpanded(v => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
            expanded
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm3 5h10M6 14h10M9 19h6" />
          </svg>
          Filters &amp; Grouping
          {activeCount > 0 && (
            <span className={cn(
              'inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold',
              expanded ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'
            )}>
              {activeCount}
            </span>
          )}
          <svg
            className={cn('w-3 h-3 transition-transform', expanded ? 'rotate-180' : '')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Active quick filter badge */}
        {filters.quickFilter !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            {QUICK_FILTERS.find(q => q.id === filters.quickFilter)?.label}
            <button onClick={() => set({ quickFilter: 'all' })} className="hover:text-blue-600">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}

        {/* Group-by badge */}
        {filters.groupBy !== 'none' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-800 rounded-full text-xs font-medium">
            {GROUP_BY_OPTIONS.find(g => g.value === filters.groupBy)?.label}
            <button onClick={() => set({ groupBy: 'none' })} className="hover:text-violet-600">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}

        {/* Clear + print — always visible */}
        <div className="flex gap-2 ml-auto">
          {(activeCount > 0 || filters.groupBy !== 'none') && (
            <button
              onClick={clearAll}
              className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {/* ── Expanded filter panel ── */}
      {expanded && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-5">

          {/* ── Section: Quick filters ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Filters</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Roles group */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Roles</p>
                {QUICK_FILTERS.filter(q => q.section === 'roles').map(qf => (
                  <button
                    key={qf.id}
                    onClick={() => set({ quickFilter: filters.quickFilter === qf.id ? 'all' : qf.id })}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      qf.color,
                      filters.quickFilter === qf.id ? 'ring-2 ring-offset-1 ring-blue-500 font-semibold' : ''
                    )}
                  >
                    {qf.label}
                  </button>
                ))}
              </div>

              {/* Documents group */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Documents</p>
                {QUICK_FILTERS.filter(q => q.section === 'docs').map(qf => (
                  <button
                    key={qf.id}
                    onClick={() => set({ quickFilter: filters.quickFilter === qf.id ? 'all' : qf.id })}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      qf.color,
                      filters.quickFilter === qf.id ? 'ring-2 ring-offset-1 ring-blue-500 font-semibold' : ''
                    )}
                  >
                    {qf.label}
                  </button>
                ))}
              </div>

              {/* Test Project group */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Test Project</p>
                {QUICK_FILTERS.filter(q => q.section === 'tp').map(qf => (
                  <button
                    key={qf.id}
                    onClick={() => set({ quickFilter: filters.quickFilter === qf.id ? 'all' : qf.id })}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                      qf.color,
                      filters.quickFilter === qf.id ? 'ring-2 ring-offset-1 ring-blue-500 font-semibold' : ''
                    )}
                  >
                    {qf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* ── Section: Detailed filters ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Detailed Filters</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

              {/* Role type */}
              <div>
                <label className={LABEL_CLS}>Role Type</label>
                <select
                  value={filters.roleType}
                  onChange={e => set({ roleType: e.target.value as FilterState['roleType'] })}
                  className={SELECT_CLS}
                >
                  {ROLE_TYPES_FOR_FILTER.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Role status */}
              <div>
                <label className={LABEL_CLS}>Role Status</label>
                <select
                  value={filters.roleStatus}
                  onChange={e => set({ roleStatus: e.target.value as FilterState['roleStatus'] })}
                  className={SELECT_CLS}
                >
                  <option value="all">Any Status</option>
                  {ROLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {filters.roleType !== 'all' && filters.roleStatus !== 'all' && (
                  <p className="text-xs text-blue-600 mt-1">
                    → Skills where {filters.roleType} is {filters.roleStatus}
                  </p>
                )}
              </div>

              {/* Doc type */}
              <div>
                <label className={LABEL_CLS}>Document Type</label>
                <select
                  value={filters.docType}
                  onChange={e => set({ docType: e.target.value })}
                  className={SELECT_CLS}
                >
                  <option value="all">Any Document</option>
                  {DOCUMENT_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Doc status */}
              <div>
                <label className={LABEL_CLS}>Document Status</label>
                <select
                  value={filters.docStatus}
                  onChange={e => set({ docStatus: e.target.value as FilterState['docStatus'] })}
                  className={SELECT_CLS}
                >
                  <option value="all">Any Status</option>
                  {DOC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {filters.docType !== 'all' && filters.docStatus !== 'all' && (
                  <p className="text-xs text-blue-600 mt-1">
                    → Skills where {filters.docType.replace(' (TD)', '').replace(' (SAG)', '').replace(' (CTL)', '').replace(' (WL)', '')} is {filters.docStatus}
                  </p>
                )}
              </div>

              {/* TP status */}
              <div>
                <label className={LABEL_CLS}>TP / Marking Scheme</label>
                <select
                  value={filters.tpStatus}
                  onChange={e => set({ tpStatus: e.target.value as TpStatusFilter })}
                  className={SELECT_CLS}
                >
                  {TP_STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* ── Section: Grouping ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Group Results By</p>
            <div className="flex flex-wrap gap-2">
              {GROUP_BY_OPTIONS.map(g => (
                <button
                  key={g.value}
                  onClick={() => set({ groupBy: g.value })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    filters.groupBy === g.value
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-violet-400 hover:text-violet-700'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {filters.groupBy !== 'none' && (
              <p className="text-xs text-violet-600 mt-2">
                Results will be grouped by {GROUP_BY_OPTIONS.find(g => g.value === filters.groupBy)?.label?.replace('Group by ', '').toLowerCase()}.
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
