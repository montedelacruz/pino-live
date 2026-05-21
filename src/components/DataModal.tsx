import { useRef, useState } from 'react'
import {
  X, Download, Upload, CheckCircle, AlertCircle, Loader2,
  Cloud, CloudCheck, RotateCcw, ChevronDown, ChevronUp, KeyRound, Save,
  RefreshCw,
} from 'lucide-react'
import { exportData, exportAsRepertoire, importData, type ImportResult } from '../utils/exportImport'
import { useSongStore } from '../store/songStore'
import { useSetlistStore } from '../store/setlistStore'
import { useSettingsStore } from '../store/settingsStore'
import { useSyncErrorStore } from '../store/syncErrorStore'
import { syncSongUp, syncSetlistUp } from '../db/firestoreSync'
import { getCurrentUid } from '../store/currentUser'
import { db } from '../db/db'

interface DataModalProps {
  onClose: () => void
}

type Status = 'idle' | 'importing' | 'done' | 'error'

async function importFromUrl(url: string): Promise<ImportResult> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not fetch backup (${res.status})`)
  const blob = await res.blob()
  const file = new File([blob], 'pino-import.json', { type: 'application/json' })
  return importData(file)
}

export function DataModal({ onClose }: DataModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status,           setStatus]           = useState<Status>('idle')
  const [result,           setResult]           = useState<ImportResult | null>(null)
  const [errorMsg,         setErrorMsg]         = useState('')
  const [exporting,        setExporting]        = useState(false)
  const [activeRestore,    setActiveRestore]    = useState<string | null>(null)
  const [showAdvanced,     setShowAdvanced]     = useState(false)
  const [savingRepertoire, setSavingRepertoire] = useState(false)
  const [forceSyncing,     setForceSyncing]     = useState(false)
  const [forceSyncResult,  setForceSyncResult]  = useState<string | null>(null)

  const { githubPat, setGithubPat } = useSettingsStore()
  const [patDraft, setPatDraft] = useState(githubPat)
  const [patSaved, setPatSaved] = useState(false)

  const hydrateSongs    = useSongStore((s) => s.hydrate)
  const hydrateSetlists = useSetlistStore((s) => s.hydrate)
  const { pendingCount, reset: resetSyncErrors } = useSyncErrorStore()
  const uid             = getCurrentUid()

  // ── Helpers ──────────────────────────────────────────────────────────────
  const runImport = async (promise: Promise<ImportResult>, key: string) => {
    setStatus('importing')
    setActiveRestore(key)
    setResult(null)
    setErrorMsg('')
    try {
      const res = await promise
      setResult(res)
      setStatus('done')
      await hydrateSongs()
      await hydrateSetlists()
      if (uid) {
        const [songs, setlists] = await Promise.all([db.songs.toArray(), db.setlists.toArray()])
        for (const s  of songs)    syncSongUp(uid, s).catch(console.error)
        for (const sl of setlists) syncSetlistUp(uid, sl).catch(console.error)
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    } finally {
      setActiveRestore(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try { await exportData() } finally { setExporting(false) }
  }

  const handleSaveRepertoire = async () => {
    setSavingRepertoire(true)
    try { await exportAsRepertoire() } finally { setSavingRepertoire(false) }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await runImport(importData(file), 'file')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleForceSync = async () => {
    if (!uid) return
    setForceSyncing(true)
    setForceSyncResult(null)
    try {
      const [songs, setlists] = await Promise.all([
        db.songs.toArray(),
        db.setlists.toArray(),
      ])
      await Promise.all([
        ...songs.map((s)  => syncSongUp(uid, s)),
        ...setlists.map((sl) => syncSetlistUp(uid, sl)),
      ])
      resetSyncErrors()
      setForceSyncResult(`✓ Pushed ${songs.length} songs and ${setlists.length} setlists to cloud`)
    } catch (err) {
      setForceSyncResult(`✗ ${err instanceof Error ? err.message : 'Sync failed'}`)
    } finally {
      setForceSyncing(false)
    }
  }

  const handleSavePat = () => {
    setGithubPat(patDraft.trim())
    setPatSaved(true)
    setTimeout(() => setPatSaved(false), 2000)
  }

  const isBusy = status === 'importing'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-slate-100">Data &amp; Backup</h2>
          <button onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-3">

          {/* Cloud sync status + force sync */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border
                           ${pendingCount > 0
                             ? 'bg-rose-900/25 border-rose-700/50'
                             : 'bg-emerald-900/25 border-emerald-700/40'}`}>
            {uid
              ? (pendingCount > 0
                  ? <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
                  : <CloudCheck  size={16} className="text-emerald-400 flex-shrink-0" />)
              : <Cloud size={16} className="text-slate-500 flex-shrink-0" />}

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200">
                {!uid
                  ? 'Signed out — local only'
                  : pendingCount > 0
                    ? `${pendingCount} save${pendingCount > 1 ? 's' : ''} didn't reach the cloud`
                    : 'Cloud sync active'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {uid
                  ? 'Every save is pushed to Firestore automatically'
                  : 'Sign in to enable automatic cloud sync'}
              </p>
            </div>

            {uid && (
              <button
                onClick={handleForceSync}
                disabled={forceSyncing}
                title="Push all local data to cloud now"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
                            transition-colors flex-shrink-0
                            ${pendingCount > 0
                              ? 'bg-rose-700/50 hover:bg-rose-600/60 text-rose-200 border border-rose-600/60'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'}`}
              >
                {forceSyncing
                  ? <Loader2 size={12} className="animate-spin" />
                  : <RefreshCw size={12} />}
                {forceSyncing ? 'Syncing…' : 'Force sync'}
              </button>
            )}
          </div>

          {/* Force sync result */}
          {forceSyncResult && (
            <p className={`text-xs px-3 py-2 rounded-lg border
                           ${forceSyncResult.startsWith('✓')
                             ? 'text-emerald-300 bg-emerald-900/25 border-emerald-700/40'
                             : 'text-rose-300 bg-rose-900/25 border-rose-700/40'}`}>
              {forceSyncResult}
            </p>
          )}

          {/* ── Main actions — 2-column grid ── */}
          <div className="grid grid-cols-2 gap-2">

            {/* Backup */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex flex-col items-center gap-2 p-4 bg-slate-700/50 border border-slate-600
                         hover:bg-slate-700 hover:border-slate-500 disabled:opacity-50
                         rounded-xl text-sm font-medium text-slate-200 transition-colors"
            >
              {exporting
                ? <Loader2 size={22} className="animate-spin text-slate-400" />
                : <Download size={22} className="text-sky-400" />}
              <span>{exporting ? 'Preparing…' : 'Download Backup'}</span>
            </button>

            {/* Restore from file */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="flex flex-col items-center gap-2 p-4 bg-slate-700/50 border border-slate-600
                         hover:bg-slate-700 hover:border-slate-500 disabled:opacity-50
                         rounded-xl text-sm font-medium text-slate-200 transition-colors"
            >
              {isBusy && activeRestore === 'file'
                ? <Loader2 size={22} className="animate-spin text-slate-400" />
                : <Upload size={22} className="text-violet-400" />}
              <span>{isBusy && activeRestore === 'file' ? 'Importing…' : 'Restore File'}</span>
            </button>

            <input ref={fileInputRef} type="file" accept=".json,application/json"
              onChange={handleFileChange} className="hidden" />
          </div>

          {/* ── Emergency cloud restore ── */}
          <div className="p-3 bg-slate-700/30 border border-slate-700 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5">
              <RotateCcw size={13} className="text-amber-400" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Emergency restore</p>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { key: 'current',  label: 'Latest',   url: `${import.meta.env.BASE_URL}pino-import.json` },
                { key: 'backup1',  label: 'Backup 1', url: `${import.meta.env.BASE_URL}pino-import-backup-1.json` },
                { key: 'backup2',  label: 'Backup 2', url: `${import.meta.env.BASE_URL}pino-import-backup-2.json` },
              ]).map(({ key, label, url }) => (
                <button
                  key={key}
                  onClick={() => runImport(importFromUrl(url), key)}
                  disabled={isBusy}
                  className="py-2 text-xs font-medium text-slate-300 bg-slate-600/60
                             hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors
                             flex items-center justify-center gap-1"
                >
                  {isBusy && activeRestore === key
                    ? <Loader2 size={12} className="animate-spin" />
                    : null}
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              Use only if something went wrong. Cloud sync restores automatically on sign-in.
            </p>
          </div>

          {/* ── Result feedback ── */}
          {status === 'done' && result && (
            <div className="flex gap-2 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl">
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-200 space-y-0.5">
                <p className="font-medium">Imported successfully</p>
                <p>{result.songsAdded} songs added · {result.songsUpdated} updated</p>
                <p>{result.setlistsAdded} setlists added · {result.setlistsUpdated} updated</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex gap-2 p-3 bg-red-900/30 border border-red-700/50 rounded-xl">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-200">
                <p className="font-medium">Import failed</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* ── Advanced (collapsed) ── */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-500
                       hover:text-slate-300 transition-colors"
          >
            <span>Advanced</span>
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {showAdvanced && (
            <div className="space-y-2.5 pt-1">

              {/* Update repertoire file */}
              <div className="p-3 bg-slate-700/30 border border-slate-600 rounded-xl space-y-2">
                <p className="text-xs font-medium text-slate-300">Update Repertoire File</p>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Downloads <span className="font-mono text-slate-400">pino-import.json</span> — save it to
                  <span className="font-mono text-slate-400"> public/</span> and push to keep the bundled restore current.
                </p>
                <button
                  onClick={handleSaveRepertoire}
                  disabled={savingRepertoire}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-700
                             disabled:opacity-50 text-emerald-200 rounded-lg text-xs font-medium transition-colors"
                >
                  {savingRepertoire ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {savingRepertoire ? 'Preparing…' : 'Save Repertoire File'}
                </button>
              </div>

              {/* GitHub PAT */}
              <div className="p-3 bg-slate-700/30 border border-slate-600 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5">
                  <KeyRound size={13} className="text-slate-400" />
                  <p className="text-xs font-medium text-slate-300">GitHub Sync Token</p>
                  {githubPat && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-800/50 text-emerald-400 rounded-full">Active</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={patDraft}
                    onChange={(e) => setPatDraft(e.target.value)}
                    placeholder="github_pat_..."
                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5
                               text-slate-100 placeholder-slate-500 text-xs focus:outline-none
                               focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSavePat}
                    disabled={!patDraft.trim()}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-40
                               text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {patSaved ? '✓' : 'Save'}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
