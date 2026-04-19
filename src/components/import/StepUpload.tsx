import { useRef, useState } from 'react'
import Papa from 'papaparse'

interface StepUploadProps {
  onParsed: (rows: Record<string, string>[], headers: string[]) => void
}

export function StepUpload({ onParsed }: StepUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFile = (file: File) => {
    setError(null)
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file.')
      return
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: result => {
        if (!result.data.length) {
          setError('The CSV file appears to be empty.')
          return
        }
        onParsed(result.data, result.meta.fields ?? [])
      },
      error: (err: { message: string }) => setError(err.message),
    })
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Step 1 — Upload CSV File</h3>
      <p className="text-sm text-gray-500">
        Upload a CSV file. The data type is automatically detected from the column headers.
        All CSV types must include a <code className="bg-gray-100 px-1 rounded">skill_number</code> column
        (or <code className="bg-gray-100 px-1 rounded">skill_name</code>) to link data to the correct skill.
      </p>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-gray-600">Drag &amp; drop a CSV, or <span className="text-blue-600">browse</span></p>
        <p className="text-xs text-gray-400 mt-1">CSV only</p>
      </div>

      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
