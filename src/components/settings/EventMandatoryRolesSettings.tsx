import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useEventMandatoryRoles, useSetMandatoryRoles } from '@/hooks/useEventMandatoryRoles'
import { useGlobalSettings, useSaveGlobalSettings } from '@/hooks/useGlobalSettings'
import type { EventType } from '@/types/database'

const FIXED_EVENTS: { type: EventType; label: string }[] = [
  { type: 'SDW',                   label: 'Skills Development Workshop (SDW)' },
  { type: 'CPM',                   label: 'Competition Preparation Meeting (CPM)' },
  { type: 'EuroSkills Competition', label: 'EuroSkills Competition' },
]

const ALL_ROLES = ['CE', 'DCE', 'ITPD', 'JP', 'JPTL', 'WM', 'WMA', 'SA']

// ── Global ITPD Package Price ─────────────────────────────────────────────────

function GlobalPriceSettings() {
  const { data: settings, isLoading } = useGlobalSettings()
  const save = useSaveGlobalSettings()
  const [price, setPrice] = useState<string>('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings?.itpd_package_price != null) {
      setPrice(String(settings.itpd_package_price))
    }
  }, [settings?.itpd_package_price])

  const handleSave = () => {
    const parsed = price === '' ? null : parseFloat(price)
    save.mutate(
      { itpd_package_price: parsed },
      { onSuccess: () => setSaved(true) }
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">ITPD Package Price</span>
        {saved && <span className="text-xs text-green-600 font-medium">Saved</span>}
      </div>
      <div className="px-4 py-4 bg-white">
        <p className="text-xs text-gray-400 mb-3">
          Set the global ITPD package price (€). This figure is used across all skills to calculate
          the ITPD Development Budget (Package Price minus Flight Costs).
        </p>
        {isLoading ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : (
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                ITPD Package Price (€)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-500">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={e => { setPrice(e.target.value); setSaved(false) }}
                  className="w-36 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              loading={save.isPending}
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Event Role Editor ─────────────────────────────────────────────────────────

interface EventRoleEditorProps {
  eventType: EventType
  label: string
  currentRoles: string[]
}

function EventRoleEditor({ eventType, label, currentRoles }: EventRoleEditorProps) {
  const [selected, setSelected] = useState<string[]>(currentRoles)
  const [saved, setSaved] = useState(false)
  const setMandatory = useSetMandatoryRoles()

  // Sync if global data changes (e.g. on first load)
  useEffect(() => { setSelected(currentRoles) }, [currentRoles.join(',')])

  const toggle = (role: string) => {
    setSelected(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
    setSaved(false)
  }

  const save = () => {
    setMandatory.mutate(
      { eventType, roles: selected },
      { onSuccess: () => setSaved(true) }
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        {saved && (
          <span className="text-xs text-green-600 font-medium">Saved</span>
        )}
      </div>
      <div className="px-4 py-3 bg-white">
        <p className="text-xs text-gray-400 mb-3">
          Tick the roles that have a mandatory obligation to attend this event.
          All unticked roles will be treated as not applicable for this event by default.
        </p>
        <div className="flex flex-wrap gap-3">
          {ALL_ROLES.map(role => {
            const checked = selected.includes(role)
            return (
              <label key={role} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(role)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                  checked ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                }`}>
                  {role}
                </span>
              </label>
            )
          })}
        </div>
        <div className="mt-3">
          <Button
            type="button"
            size="sm"
            onClick={save}
            loading={setMandatory.isPending}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Settings Component ───────────────────────────────────────────────────

interface EventMandatoryRolesSettingsProps {
  generalOnly?: boolean  // show only General & Pricing section
  eventsOnly?:  boolean  // show only Event Mandatory Roles section
}

export function EventMandatoryRolesSettings({ generalOnly, eventsOnly }: EventMandatoryRolesSettingsProps = {}) {
  const { data: allRoles = [], isLoading } = useEventMandatoryRoles()
  const showGeneral = !eventsOnly
  const showEvents  = !generalOnly

  return (
    <div className="space-y-8">

      {/* Section: ITPD Pricing */}
      {showGeneral && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Global Pricing</h2>
            <p className="text-sm text-gray-500 mt-1">
              Set global pricing figures used in ITPD budget calculations across all skills.
            </p>
          </div>
          <GlobalPriceSettings />
        </div>
      )}

      {/* Divider — only when showing both */}
      {showGeneral && showEvents && <hr className="border-gray-200" />}

      {/* Section: Mandatory Event Roles */}
      {showEvents && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Event Mandatory Attendance Roles</h2>
            <p className="text-sm text-gray-500 mt-1">
              Set which competition roles are required to attend each event globally.
              These settings apply across all skills. Roles not marked as mandatory
              will default to "Not Applicable" for that event.
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-gray-400 py-4">Loading settings…</p>
          ) : (
            FIXED_EVENTS.map(({ type, label }) => {
              const currentRoles = allRoles
                .filter(r => r.event_type === type)
                .map(r => r.role_abbr)

              return (
                <EventRoleEditor
                  key={type}
                  eventType={type}
                  label={label}
                  currentRoles={currentRoles}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
