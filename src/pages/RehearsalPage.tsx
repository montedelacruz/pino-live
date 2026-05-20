import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Music2, Flame, SlidersHorizontal, History, ChevronDown, ChevronUp } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { PracticeConfigPanel } from '../components/PracticeConfigPanel'
import { useSongStore } from '../store/songStore'
import { useSetlistStore } from '../store/setlistStore'
import { useRehearsalStore } from '../store/rehearsalStore'
import { usePracticeHistoryStore } from '../store/practiceHistoryStore'
import type { Song } from '../db/db'

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RehearsalPage() {
  const navigate = useNavigate()
  const { songs: allSongs } = useSongStore()
  const { setlists }        = useSetlistStore()
  const { config, songIds, setConfig, buildSession } = useRehearsalStore()
  const { entries, hydrate, getStreakDays }           = usePracticeHistoryStore()

  const [configOpen,    setConfigOpen]    = useState(songIds.length === 0)
  const [buildWarning,  setBuildWarning]  = useState('')

  // Hydrate practice history once
  useEffect(() => { hydrate() }, [hydrate])

  const songs: Song[] = songIds
    .map((id) => allSongs.find((s) => s.id === id))
    .filter(Boolean) as Song[]

  const handleBuild = () => {
    setBuildWarning('')
    buildSession(allSongs, setlists, entries)
    // Zustand set() is synchronous — read the fresh state directly
    const built = useRehearsalStore.getState().songIds
    if (built.length === 0) {
      setBuildWarning('No songs matched these settings. Try loosening the filters (e.g. turn off "Needs-work only").')
    } else {
      setConfigOpen(false)
    }
  }

  const handleStartPractice = () => {
    if (songIds.length === 0) return
    navigate('/practice')
  }

  const streak = getStreakDays()

  // Estimate total duration
  const estimatedSec = songs.reduce((acc, s) => acc + (s.durationSeconds ?? 180), 0)

  return (
    <div className="flex flex-col flex-1 pb-24">
      <TopBar
        title="Practice"
        showBack
        right={
          <button
            onClick={() => navigate('/practice/history')}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg transition-colors"
            title="Practice history"
          >
            <History size={20} />
          </button>
        }
      />

      {/* ── Streak banner ── */}
      {streak > 0 && (
        <div className="mx-4 mt-4 flex items-center gap-2 px-3 py-2.5 bg-amber-900/30 border border-amber-700/40 rounded-xl">
          <Flame size={18} className="text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-200 font-medium">
            {streak}-day streak! Keep it up 🔥
          </span>
        </div>
      )}

      {/* ── Config section ── */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => setConfigOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2.5
                     bg-slate-800 border border-slate-700 rounded-xl
                     text-slate-200 text-sm font-medium hover:border-slate-500 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-emerald-400" />
            Session settings
          </div>
          {configOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </button>

        {configOpen && (
          <div className="mt-3 p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
            <PracticeConfigPanel
              config={config}
              onChange={(p) => { setBuildWarning(''); setConfig(p) }}
            />

            {buildWarning && (
              <p className="mt-4 text-xs text-amber-400 bg-amber-900/30 border border-amber-700/40 rounded-lg px-3 py-2">
                ⚠ {buildWarning}
              </p>
            )}

            <button
              onClick={handleBuild}
              className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500
                         text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Build session
            </button>
          </div>
        )}
      </div>

      {/* ── Session preview ── */}
      {songs.length > 0 && (
        <div className="mx-4 mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>{songs.length} songs · ~{formatElapsed(estimatedSec)}</span>
            <button
              onClick={() => buildSession(allSongs, setlists, entries)}
              className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors"
            >
              Re-build
            </button>
          </div>

          {songs.map((song, index) => {
            const meta = [song.artist, song.key, song.genre].filter(Boolean).join(' · ')
            const dur  = song.durationSeconds ? formatElapsed(song.durationSeconds) : null
            return (
              <div
                key={`${song.id}-${index}`}
                className="flex items-center gap-3 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl"
              >
                <span className="w-7 text-center text-xs font-mono text-emerald-500 flex-shrink-0">
                  {index + 1}
                </span>
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Music2 size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 text-sm truncate">{song.title}</p>
                  {meta && <p className="text-xs text-slate-400 truncate">{meta}</p>}
                </div>
                {song.needsWork && (
                  <span className="text-[10px] bg-amber-900/50 border border-amber-700/50 text-amber-300 px-1.5 py-0.5 rounded-full flex-shrink-0">
                    needs work
                  </span>
                )}
                {dur && <span className="text-[10px] text-slate-500 flex-shrink-0">{dur}</span>}
              </div>
            )
          })}
        </div>
      )}

      {songs.length === 0 && !configOpen && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 px-8 text-center py-16">
          <Music2 size={48} className="opacity-30" />
          <p className="font-medium">No session built yet</p>
          <p className="text-sm">Open settings above to configure and build your practice session.</p>
          <button
            onClick={() => setConfigOpen(true)}
            className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Configure session
          </button>
        </div>
      )}

      {/* ── Start button ── */}
      {songs.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pointer-events-none">
          <button
            onClick={handleStartPractice}
            className="pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-center
                       gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold
                       text-lg rounded-2xl shadow-xl shadow-emerald-900/40 transition-colors"
          >
            <Play size={22} />
            Start Practice ({songs.length})
          </button>
        </div>
      )}
    </div>
  )
}
