import { useRef, useState } from 'react'
import { X, Download, Upload, CheckCircle, AlertCircle, Loader2, Music2, Save, KeyRound } from 'lucide-react'
import { exportData, exportAsRepertoire, importData, type ImportResult } from '../utils/exportImport'
import { useSongStore } from '../store/songStore'
import { useSetlistStore } from '../store/setlistStore'
import { useSettingsStore } from '../store/settingsStore'

interface DataModalProps {
  onClose: () => void
}

type Status = 'idle' | 'importing' | 'done' | 'error'

async function importFromUrl(url: string): Promise<ImportResult> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch file (${res.status})`)
  const blob = await res.blob()
  const file = new File([blob], 'pino-import.json', { type: 'application/json' })
  return importData(file)
}

export function DataModal({ onClose }: DataModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [exporting, setExporting] = useState(false)
  const [savingRepertoire, setSavingRepertoire] = useState(false)
  const [bundleImporting, setBundleImporting] = useState(false)

  const { githubPat, setGithubPat } = useSettingsStore()
  const [patDraft, setPatDraft] = useState(githubPat)
  const [patSaved, setPatSaved] = useState(false)

  const hydrateSongs = useSongStore((s) => s.hydrate)
  const hydrateSetlists = useSetlistStore((s) => s.hydrate)

  const handleSavePat = () => {
    setGithubPat(patDraft.trim())
    setPatSaved(true)
    setTimeout(() => setPatSaved(false), 2000)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportData()
    } finally {
      setExporting(false)
    }
  }

  const handleSaveRepertoire = async () => {
    setSavingRepertoire(true)
    try {
      await exportAsRepertoire()
    } finally {
      setSavingRepertoire(false)
    }
  }

  const runImport = async (promise: Promise<ImportResult>) => {
    setStatus('importing')
    setResult(null)
    setErrorMsg('')
    try {
      const res = await promise
      setResult(res)
      setStatus('done')
      await hydrateSongs()
      await hydrateSetlists()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }

  const handleBundledImport = async () => {
    setBundleImporting(true)
    const url = `${import.meta.env.BASE_URL}pino-import.json`
    await runImport(importFromUrl(url))
    setBundleImporting(false)
  }

  const handleBackupImport = async (n: 1 | 2) => {
    const url = `${import.meta.env.BASE_URL}pino-import-backup-${n}.json`
    await runImport(importFromUrl(url))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await runImport(importData(file))
    if (fileInputRef.current) fileInputRef.current.value = ''
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

          {/* Emergency restore — backups only */}
          <div className="p-4 bg-slate-700/40 border border-slate-700 rounded-xl space-y-2">
            <h3 className="font-medium text-slate-200">Restore Repertoire</h3>
            <p className="text-sm text-slate-400">
              Emergency restore from a previous cloud backup. Use only if something went wrong —
              the repertoire loads automatically on sign-in when needed.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleBundledImport}
                disabled={status === 'importing' || bundleImporting}
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-600 hover:bg-slate-500
                           disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                {bundleImporting ? <Loader2 size={15} className="animate-spin" /> : <Music2 size={15} />}
                {bundleImporting ? 'Loading…' : 'Current'}
              </button>
              <button
                onClick={() => handleBackupImport(1)}
                disabled={status === 'importing'}
                title="Load the version before the current one"
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-600 hover:bg-slate-500
                           disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Backup 1
              </button>
              <button
                onClick={() => handleBackupImport(2)}
                disabled={status === 'importing'}
                title="Load two versions back"
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-600 hover:bg-slate-500
                           disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Backup 2
              </button>
            </div>
          </div>

          {/* Update bundled repertoire */}
          <div className="p-4 bg-emerald-900/20 border border-emerald-700/40 rounded-xl space-y-2">
            <h3 className="font-medium text-slate-200">Update Repertoire File</h3>
            <p className="text-sm text-slate-400">
              Downloads your current songs as <span className="font-mono text-slate-300">pino-import.json</span>.
              Save it to <span className="font-mono text-slate-300">public/</span> in your project folder,
              then ask Claude to push it — so "Load Repertoire" always has your latest songs.
            </p>
            <button
              onClick={handleSaveRepertoire}
              disabled={savingRepertoire}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600
                         disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {savingRepertoire ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savingRepertoire ? 'Preparing…' : 'Save as Repertoire File'}
            </button>
          </div>

          {/* Export */}
          <div className="p-4 bg-slate-700/40 border border-slate-700 rounded-xl space-y-2">
            <h3 className="font-medium text-slate-200">Export Backup</h3>
            <p className="text-sm text-slate-400">
              Download all your songs and setlists as a dated JSON backup file.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-600 hover:bg-slate-500
                         disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {exporting ? 'Preparing…' : 'Download Backup'}
            </button>
          </div>

          {/* Import from file */}
          <div className="p-4 bg-slate-700/40 border border-slate-700 rounded-xl space-y-2">
            <h3 className="font-medium text-slate-200">Import from File</h3>
            <p className="text-sm text-slate-400">
              Restore from a previously exported backup JSON file.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={status === 'importing'}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-600 hover:bg-slate-500
                         disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {status === 'importing' && !bundleImporting
                ? <Loader2 size={16} className="animate-spin" />
                : <Upload size={16} />}
              {status === 'importing' && !bundleImporting ? 'Importing…' : 'Choose File'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Result */}
          {status === 'done' && result && (
            <div className="flex gap-3 p-4 bg-green-900/30 border border-green-700/50 rounded-xl">
              <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-200 space-y-1">
                <p className="font-medium">Import complete!</p>
                <p>Songs: {result.songsAdded} added, {result.songsUpdated} updated</p>
                <p>Setlists: {result.setlistsAdded} added, {result.setlistsUpdated} updated</p>
                {result.errors.length > 0 && (
                  <p className="text-yellow-400 mt-1">
                    {result.errors.length} item(s) skipped.
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

          {/* GitHub sync token */}
          <div className="p-4 bg-slate-700/40 border border-slate-700 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <KeyRound size={15} className="text-slate-400" />
              <h3 className="font-medium text-slate-200">GitHub Sync Token</h3>
              {githubPat && (
                <span className="text-xs px-2 py-0.5 bg-green-800/50 text-green-400 rounded-full">Active</span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              Auto-pushes your repertoire to GitHub after every save so new devices always load the latest version.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={patDraft}
                onChange={(e) => setPatDraft(e.target.value)}
                placeholder="github_pat_..."
                className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2
                           text-slate-100 placeholder-slate-500 text-sm focus:outline-none
                           focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
              <button
                onClick={handleSavePat}
                disabled={!patDraft.trim()}
                className="px-3 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-40
                           text-white rounded-lg text-sm font-medium transition-colors"
              >
                {patSaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
