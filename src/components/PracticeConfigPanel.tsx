import { useMemo } from 'react'
import {
  Shuffle, Brain, Dumbbell, ListOrdered, Languages,
  ListMusic, Filter, Clock, Hash, Repeat2,
  Timer, CheckSquare,
} from 'lucide-react'
import type { PracticeConfig } from '../store/rehearsalStore'
import { useSetlistStore } from '../store/setlistStore'
import { useSongStore } from '../store/songStore'
import { availableDecades, decadeLabel } from '../utils/autoSetlist'

interface Props {
  config:    PracticeConfig
  onChange:  (partial: Partial<PracticeConfig>) => void
}

// ── Tiny pill toggle component ────────────────────────────────────────────────
function Pill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                  ${active
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
    >
      {label}
    </button>
  )
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
      {children}
    </p>
  )
}

export function PracticeConfigPanel({ config, onChange }: Props) {
  const { setlists } = useSetlistStore()
  const { songs }    = useSongStore()

  const genres    = useMemo(() => [...new Set(songs.map((s) => s.genre).filter(Boolean))].sort(), [songs])
  const languages = useMemo(() => [...new Set(songs.map((s) => s.language).filter(Boolean))].sort(), [songs])
  const decades   = useMemo(() => availableDecades(songs), [songs])

  // ── Toggle helpers ────────────────────────────────────────────────────────
  function toggleArrayItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
  }

  return (
    <div className="space-y-5 text-slate-200">

      {/* ── Source ── */}
      <div>
        <SectionLabel>Song source</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { v: 'all',     label: 'All songs',  Icon: ListOrdered },
            { v: 'setlist', label: 'Setlist',     Icon: ListMusic   },
            { v: 'filter',  label: 'Filter',      Icon: Filter      },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              onClick={() => onChange({ sourceType: v })}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-colors
                          ${config.sourceType === v
                            ? 'bg-emerald-700/30 border-emerald-600 text-emerald-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Setlist picker */}
        {config.sourceType === 'setlist' && (
          <div className="mt-2">
            <select
              value={config.setlistId}
              onChange={(e) => onChange({ setlistId: e.target.value })}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200
                         focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">— pick a setlist —</option>
              {setlists.map((sl) => (
                <option key={sl.id} value={sl.id}>
                  {sl.type === 'auto' && '⚡ '}{sl.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filter chips */}
        {config.sourceType === 'filter' && (
          <div className="mt-3 space-y-2.5">
            {genres.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Genre</p>
                <div className="flex flex-wrap gap-1.5">
                  {genres.map((g) => (
                    <Pill
                      key={g} label={g}
                      active={config.filterGenres.includes(g)}
                      onClick={() => onChange({ filterGenres: toggleArrayItem(config.filterGenres, g) })}
                    />
                  ))}
                </div>
              </div>
            )}
            {languages.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Language</p>
                <div className="flex flex-wrap gap-1.5">
                  {languages.map((l) => (
                    <Pill
                      key={l} label={l}
                      active={config.filterLanguages.includes(l)}
                      onClick={() => onChange({ filterLanguages: toggleArrayItem(config.filterLanguages, l) })}
                    />
                  ))}
                </div>
              </div>
            )}
            {decades.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Decade</p>
                <div className="flex flex-wrap gap-1.5">
                  {decades.map((d) => (
                    <Pill
                      key={d} label={decadeLabel(d)}
                      active={config.filterDecades.includes(d)}
                      onClick={() => onChange({ filterDecades: toggleArrayItem(config.filterDecades, d) })}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Order mode ── */}
      <div>
        <SectionLabel>Order</SectionLabel>
        <div className="grid grid-cols-5 gap-1">
          {([
            { v: 'shuffle',  label: 'Shuffle',   Icon: Shuffle     },
            { v: 'smart',    label: 'Smart',      Icon: Brain       },
            { v: 'warmup',   label: 'Warm-up',    Icon: Dumbbell    },
            { v: 'in_order', label: 'In order',   Icon: ListOrdered },
            { v: 'alternate',label: 'Alternate',  Icon: Languages   },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              onClick={() => onChange({ orderMode: v })}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-medium transition-colors
                          ${config.orderMode === v
                            ? 'bg-violet-700/30 border-violet-600 text-violet-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        {config.orderMode === 'smart' && (
          <p className="mt-1.5 text-[10px] text-slate-500">
            Prioritises songs marked "needs work" and least recently practiced.
          </p>
        )}
        {config.orderMode === 'warmup' && (
          <p className="mt-1.5 text-[10px] text-slate-500">
            Shortest songs first — ideal for warming up.
          </p>
        )}
        {config.orderMode === 'alternate' && (
          <p className="mt-1.5 text-[10px] text-slate-500">
            Interleaves by language so you switch between them evenly.
          </p>
        )}
      </div>

      {/* ── Limit ── */}
      <div>
        <SectionLabel>Session length</SectionLabel>
        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
          {([
            { v: 'all',   label: 'All songs', Icon: ListOrdered },
            { v: 'count', label: 'By count',  Icon: Hash        },
            { v: 'time',  label: 'By time',   Icon: Clock       },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              onClick={() => onChange({ limitType: v })}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-colors
                          ${config.limitType === v
                            ? 'bg-sky-700/30 border-sky-600 text-sky-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {config.limitType === 'count' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-20">Songs:</span>
            <input
              type="range" min={1} max={50} value={config.songCount}
              onChange={(e) => onChange({ songCount: Number(e.target.value) })}
              className="flex-1 accent-sky-500"
            />
            <span className="text-sm tabular-nums text-sky-300 w-8 text-right">{config.songCount}</span>
          </div>
        )}

        {config.limitType === 'time' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-20">Minutes:</span>
            <input
              type="range" min={5} max={120} step={5} value={config.timeLimitMinutes}
              onChange={(e) => onChange({ timeLimitMinutes: Number(e.target.value) })}
              className="flex-1 accent-sky-500"
            />
            <span className="text-sm tabular-nums text-sky-300 w-10 text-right">{config.timeLimitMinutes} min</span>
          </div>
        )}
      </div>

      {/* ── Options ── */}
      <div>
        <SectionLabel>Options</SectionLabel>
        <div className="space-y-3">

          {/* Needs work only */}
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2 text-sm">
              <CheckSquare size={15} className="text-amber-400" />
              <span>Needs-work songs only</span>
            </div>
            <button
              onClick={() => onChange({ onlyNeedsWork: !config.onlyNeedsWork })}
              className={`relative w-10 h-6 rounded-full transition-colors
                          ${config.onlyNeedsWork ? 'bg-amber-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all
                               ${config.onlyNeedsWork ? 'left-5' : 'left-1'}`} />
            </button>
          </label>

          {/* Repeat / Focus mode */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm flex-1">
              <Repeat2 size={15} className="text-rose-400" />
              <span>Repeat each song</span>
            </div>
            <input
              type="range" min={1} max={5} value={config.repeatCount}
              onChange={(e) => onChange({ repeatCount: Number(e.target.value) })}
              className="w-24 accent-rose-500"
            />
            <span className="text-sm tabular-nums text-rose-300 w-12 text-right">
              {config.repeatCount === 1 ? 'off' : `× ${config.repeatCount}`}
            </span>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm flex-1">
              <Timer size={15} className="text-teal-400" />
              <span>Countdown between songs</span>
            </div>
            <input
              type="range" min={0} max={10} value={config.countdownSeconds}
              onChange={(e) => onChange({ countdownSeconds: Number(e.target.value) })}
              className="w-24 accent-teal-500"
            />
            <span className="text-sm tabular-nums text-teal-300 w-12 text-right">
              {config.countdownSeconds === 0 ? 'off' : `${config.countdownSeconds}s`}
            </span>
          </div>

        </div>
      </div>

    </div>
  )
}
