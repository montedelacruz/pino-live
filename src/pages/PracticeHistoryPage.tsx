import { useEffect, useMemo } from 'react'
import { Flame, ThumbsUp, Wrench, SkipForward, Music2, Trash2 } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { usePracticeHistoryStore } from '../store/practiceHistoryStore'
import { useSongStore } from '../store/songStore'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  })
}

const RESULT_STYLE = {
  nailed:     { color: 'text-emerald-400', bg: 'bg-emerald-900/30 border-emerald-700/40', label: 'Nailed it',    Icon: ThumbsUp     },
  needs_work: { color: 'text-amber-400',   bg: 'bg-amber-900/30   border-amber-700/40',   label: 'Needs work',   Icon: Wrench       },
  skipped:    { color: 'text-slate-500',   bg: 'bg-slate-800       border-slate-700',      label: 'Skipped',      Icon: SkipForward  },
} as const

export function PracticeHistoryPage() {
  const { entries, loading, hydrate, clearHistory, getStreakDays } = usePracticeHistoryStore()
  const { songs: allSongs } = useSongStore()

  useEffect(() => { hydrate() }, [hydrate])

  const streak = getStreakDays()

  // Group entries by local date (most recent first)
  const grouped = useMemo(() => {
    const map = new Map<string, typeof entries>()
    for (const e of [...entries].sort((a, b) => b.practicedAt - a.practicedAt)) {
      const key = new Date(e.practicedAt).toLocaleDateString('en-CA')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()]
  }, [entries])

  const nailed    = entries.filter((e) => e.result === 'nailed').length
  const needsWork = entries.filter((e) => e.result === 'needs_work').length
  const skipped   = entries.filter((e) => e.result === 'skipped').length

  const handleClear = async () => {
    if (!window.confirm('Clear all practice history? This cannot be undone.')) return
    await clearHistory()
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-slate-500">Loading…</div>
  )

  return (
    <div className="flex flex-col flex-1 pb-20">
      <TopBar
        title="Practice history"
        showBack
        right={
          entries.length > 0
            ? (
              <button
                onClick={handleClear}
                className="p-2 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                title="Clear history"
              >
                <Trash2 size={18} />
              </button>
            )
            : undefined
        }
      />

      {/* ── Summary cards ── */}
      <div className="px-4 pt-4 grid grid-cols-4 gap-2">
        {/* Streak */}
        <div className="flex flex-col items-center gap-1 p-2.5 bg-amber-900/30 border border-amber-700/40 rounded-xl">
          <Flame size={18} className="text-amber-400" />
          <span className="text-lg font-bold text-amber-300 tabular-nums">{streak}</span>
          <span className="text-[10px] text-slate-400">day streak</span>
        </div>
        {/* Nailed */}
        <div className="flex flex-col items-center gap-1 p-2.5 bg-emerald-900/30 border border-emerald-700/40 rounded-xl">
          <ThumbsUp size={18} className="text-emerald-400" />
          <span className="text-lg font-bold text-emerald-300 tabular-nums">{nailed}</span>
          <span className="text-[10px] text-slate-400">nailed</span>
        </div>
        {/* Needs work */}
        <div className="flex flex-col items-center gap-1 p-2.5 bg-amber-900/30 border border-amber-700/40 rounded-xl">
          <Wrench size={18} className="text-amber-400" />
          <span className="text-lg font-bold text-amber-300 tabular-nums">{needsWork}</span>
          <span className="text-[10px] text-slate-400">needs work</span>
        </div>
        {/* Skipped */}
        <div className="flex flex-col items-center gap-1 p-2.5 bg-slate-800 border border-slate-700 rounded-xl">
          <SkipForward size={18} className="text-slate-400" />
          <span className="text-lg font-bold text-slate-300 tabular-nums">{skipped}</span>
          <span className="text-[10px] text-slate-400">skipped</span>
        </div>
      </div>

      {/* ── Log ── */}
      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 px-8 text-center py-16">
          <Music2 size={48} className="opacity-30" />
          <p className="font-medium">No practice history yet</p>
          <p className="text-sm">Your session results will appear here after you practice.</p>
        </div>
      ) : (
        <div className="px-4 pt-5 space-y-5">
          {grouped.map(([dateKey, dayEntries]) => (
            <section key={dateKey} className="space-y-1.5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {formatDate(dayEntries[0].practicedAt)}
              </h2>
              {dayEntries.map((entry) => {
                const song = allSongs.find((s) => s.id === entry.songId)
                const rs   = RESULT_STYLE[entry.result]
                const Icon = rs.Icon
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${rs.bg}`}
                  >
                    <Icon size={14} className={`flex-shrink-0 ${rs.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {song?.title ?? <span className="text-slate-500 italic">Unknown song</span>}
                      </p>
                      {song?.artist && (
                        <p className="text-xs text-slate-500 truncate">{song.artist}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium flex-shrink-0 ${rs.color}`}>
                      {rs.label}
                    </span>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">
                      {formatTime(entry.practicedAt)}
                    </span>
                  </div>
                )
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
