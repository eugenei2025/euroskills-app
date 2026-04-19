import { IMPORT_FIELD_LABELS } from '@/lib/constants'

const REQUIRED_FIELDS = ['skill_number', 'role_type']
const ALL_FIELDS = ['skill_number', 'role_type', 'first_name', 'family_name', 'email', 'nationality']

interface StepMappingProps {
  csvHeaders: string[]
  mapping: Record<string, string>
  onChange: (mapping: Record<string, string>) => void
}

export function StepMapping({ csvHeaders, mapping, onChange }: StepMappingProps) {
  const update = (field: string, csvCol: string) => {
    onChange({ ...mapping, [field]: csvCol })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Step 2 — Map Columns</h3>
      <p className="text-sm text-gray-500">
        Match your CSV column headers to the expected fields. Required fields are marked with *.
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase border-b">
            <th className="pb-2 pr-4">App Field</th>
            <th className="pb-2">Your CSV Column</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {ALL_FIELDS.map(field => (
            <tr key={field}>
              <td className="py-2 pr-4 font-medium text-gray-700">
                {IMPORT_FIELD_LABELS[field] ?? field}
                {REQUIRED_FIELDS.includes(field) && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </td>
              <td className="py-2">
                <select
                  value={mapping[field] ?? ''}
                  onChange={e => update(field, e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full max-w-xs"
                >
                  <option value="">— not mapped —</option>
                  {csvHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
