import { Button } from '@/components/ui/Button'
import type { ImportRow, ValidationError } from '@/types/ui'

interface StepValidationProps {
  rows: ImportRow[]
  errors: ValidationError[]
  onConfirm: () => void
  isLoading: boolean
}

export function StepValidation({ rows, errors, onConfirm, isLoading }: StepValidationProps) {
  const hasErrors = errors.length > 0

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Step 3 — Review & Import</h3>

      <div className="flex gap-4">
        <div className="bg-blue-50 rounded-lg px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-blue-600">{rows.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Rows to import</p>
        </div>
        <div className={`${hasErrors ? 'bg-red-50' : 'bg-green-50'} rounded-lg px-4 py-3 text-center`}>
          <p className={`text-2xl font-semibold ${hasErrors ? 'text-red-600' : 'text-green-600'}`}>
            {errors.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Validation errors</p>
        </div>
      </div>

      {hasErrors && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-2">
            <p className="text-sm font-medium text-red-700">Errors found — fix your CSV and re-upload</p>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Row', 'Field', 'Error'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {errors.map((err, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-gray-600">{err.row}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{err.field}</td>
                  <td className="px-3 py-2 text-red-600">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasErrors && rows.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Preview (first 5 rows):</p>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(rows[0]).map(k => (
                    <th key={k} className="px-3 py-2 text-left font-medium text-gray-500 uppercase">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-gray-700">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 5 && (
            <p className="text-xs text-gray-400 mt-1">…and {rows.length - 5} more rows</p>
          )}
        </div>
      )}

      <Button
        onClick={onConfirm}
        loading={isLoading}
        disabled={hasErrors || rows.length === 0}
      >
        Import {rows.length} rows
      </Button>
    </div>
  )
}
