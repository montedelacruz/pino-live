import { useRef, useState } from 'react'
import { X, Download, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { exportData, importData, type ImportResult } from '../utils/exportImport'
import { useSongStore } from '../store/songStore'
import { useSetlistStore } from '../store/setlistStore'

interface DataModalProps {
  onClose: () => void
}

type Status = 'idle' | 'importing' | 'done' | 'error'

export function DataModal({ onClose }: DataModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [exporting, setExporting] = useState(false)

  const hydrateSongs = useSongStore((s) => s.hydrate)
  const hydrateSetlists = useSetlistStore((s) => s.hydrate)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportData()
    } finally {
      setExporting(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('importing')
    setResult(null)
    setErrorMsg('')

    try {
      const res = await importData(file)
      setResult(res)
      setStatus('done')
      // Re-hydrate stores so UI reflects imported data immediately
      await hydrateSongs()
      await hydrateSetlists()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    } finally {
      // Reset input so same file can be re-imported if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Data Management</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* Export */}
          <div className="p-4 bg-slate-700/40 border border-slate-700 rounded-xl space-y-2">
            <h3 className="font-medium text-slate-200">Export Backup</h3>
            <p className="text-sm text-slate-400">
              Download all your songs and setlists as a JSON file.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-600 hover:bg-slate-500
                         disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {exporting
                ? <Loader2 size={16} className="animate-spin" />
                : <Download size={16} />}
              {exporting ? 'Preparing…' : 'Download Backup'}
            </button>
          </div>

          {/* Import */}
          <div className="p-4 bg-slate-700/40 border border-slate-700 rounded-xl space-y-2">
            <h3 className="font-medium text-slate-200">Import</h3>
            <p className="text-sm text-slate-400">
              Load songs and setlists from a backup JSON file. Existing songs with the same
              ID will be updated; new ones will be added.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={status === 'importing'}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500
                         disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {status === 'importing'
                ? <Loader2 size={16} className="animate-spin" />
                : <Upload size={16} />}
              {status === 'importing' ? 'Importing…' : 'Choose File'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Import result */}
          {status === 'done' && result && (
            <div className="flex gap-3 p-4 bg-green-900/30 border border-green-700/50 rounded-xl">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-200 space-y-1">
                <p className="font-medium">Import complete!</p>
                <p>
                  Songs: {result.songsAdded} added, {result.songsUpdated} updated
                </p>
                <p>
                  Setlists: {result.setlistsAdded} added, {result.setlistsUpdated} updated
                </p>
                {result.errors.length > 0 && (
                  <p className="text-yellow-400 mt-1">
                    {result.errors.length} item(s) skipped — check console for details.
                  </p>
                )}
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex gap-3 p-4 bg-red-900/30 border border-red-700/50 rounded-xl">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">
                <p className="font-medium">Import failed</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
