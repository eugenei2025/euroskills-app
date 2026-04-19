import { ROLE_STATUSES, DOC_STATUSES } from '@/lib/constants'
import type { FilterState, QuickFilter } from '@/types/ui'
import { cn } from '@/lib/utils'

interface FilterBarProps {
  filters: FilterState
  onChange: (f: FilterState) => void
  onPrint: () => void
}

interface QuickFilterDef {
  id: QuickFilter
  label: string
  color: string
}

const QUICK_FILTERS: QuickFilterDef[] = [
  { id: 'all',           label: 'All Skills',         color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
  { id: 'missing_ce',    label: 'Missing CE',          color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' },
  { id: 'missing_dce',   label: 'Missing DCE',         color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' },
  { id: 'missing_wm',    label: 'Missing WM',          color: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' },
  { id: 'has_vacant',    label: 'Has Vacant Roles',    color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200' },
  { id: 'new_roles',     label: 'Has New Roles',       color: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200' },
  { id: 'no_docs',       label: 'No Documents',        color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200' },
  { id: 'docs_incomplete', label: 'Docs Incomplete',   color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200' },
  { id: 'not_ready',     label: 'Not Ready',           color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200' },
  { id: 'td_support',    label: 'TD Supporting',       color: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' },
]

export function FilterBar({ filters, onChange, onPrint }: FilterBarProps) {
  const set = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial })

  return (
    <div className="space-y-4">

      {/* Quick filter pills */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Quick Filters</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(qf => (
            <button
              key={qf.id}
              onClick={() => set({ quickFilter: qf.id })}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                qf.color,
                filters.quickFilter === qf.id
                  ? 'ring-2 ring-offset-1 ring-blue-500 font-semibold'
                  : ''
              )}
            >
              {qf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed filters row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={e => set({ search: e.target.value })}
            placeholder="Skill number or name…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Role status */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role Status</label>
          <select
            value={filters.roleStatus}
            onChange={e => set({ roleStatus: e.target.value as FilterState['roleStatus'] })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Any Role Status</option>
            {ROLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Doc status */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Doc Status</label>
          <select
            value={filters.docStatus}
            onChange={e => set({ docStatus: e.target.value as FilterState['docStatus'] })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Any Doc Status</option>
            {DOC_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Clear + Print */}
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ search: '', roleStatus: 'all', docStatus: 'all', attendanceStatus: 'all', skillNumber: '', quickFilter: 'all' })}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  )
}
