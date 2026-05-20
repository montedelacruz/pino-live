import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ListMusic, ChevronRight, Trash2, Copy,
  MapPin, CalendarDays, Sparkles,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useSetlistStore } from '../store/setlistStore'
import { useSongStore } from '../store/songStore'
import { formatDuration, totalDuration } from '../utils/formatDuration'
import type { Setlist } from '../db/db'

export function SetlistsPage() {
  const navigate = useNavigate()
  const { setlists, addSetlist, addAutoSetlist, deleteSetlist, duplicateSetlist } = useSetlistStore()
  const { songs } = useSongStore()

  const [creating, setCreating]     = useState(false)
  const [createType, setCreateType] = useState<'manual' | 'auto'>('manual')
  const [newName, setNewName]       = useState('')

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    const sl = createType === 'auto'
      ? await addAutoSetlist(name, {})
      : await addSetlist(name)
    setNewName('')
    setCreating(false)
    navigate(`/setlists/${sl.id}/edit`)
  }

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    await deleteSetlist(id)
  }

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const copy = await duplicateSetlist(id)
    if (copy) navigate(`/setlists/${copy.id}/edit`)
  }

  const manual = setlists.filter((sl) => !sl.type || sl.type === 'manual')
  const auto   = setlists.filter((sl) => sl.type === 'auto')

  const SetlistCard = ({ sl }: { sl: Setlist }) => {
    const slSongs = sl.songIds
      .map((id) => songs.find((s) => s.id === id))
      .filter(Boolean) as typeof songs
    const total  = totalDuration(slSongs.map((s) => s.durationSeconds))
    const isAuto = sl.type === 'auto'

    return (
      <button
        onClick={() => navigate(`/setlists/${sl.id}/edit`)}
        className={`w-full flex flex-col gap-2 p-3 rounded-xl text-left transition-colors group
                    border
                    ${isAuto
                      ? 'bg-violet-950/50 border-violet-700/40 hover:bg-violet-900/50 hover:border-violet-600/60'
                      : 'bg-emerald-950/50 border-emerald-800/40 hover:bg-emerald-900/40 hover:border-emerald-700/60'}`}
      >
        {/* Top row: icon + actions */}
        <div className="flex items-start justify-between gap-1">
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                           ${isAuto ? 'bg-violet-800/50' : 'bg-emerald-800/50'}`}>
            {isAuto
              ? <Sparkles size={15} className="text-violet-300" />
              : <ListMusic size={15} className="text-emerald-300" />}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
               onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleDuplicate(sl.id, e)}
              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-colors"
              title="Duplicate"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={(e) => handleDelete(sl.id, sl.name, e)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={13} />
            </button>
            <ChevronRight size={14} className="text-slate-600 ml-0.5" />
          </div>
        </div>

        {/* Name */}
        <p className={`font-semibold text-sm leading-tight line-clamp-2
                       ${isAuto ? 'text-violet-100' : 'text-emerald-100'}`}>
          {sl.name}
        </p>

        {/* Meta */}
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-400">
            {sl.songIds.length} song{sl.songIds.length !== 1 ? 's' : ''}
            {total > 0 && (
              <span className="text-slate-500"> · {formatDuration(total)}</span>
            )}
          </span>
          {sl.date && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <CalendarDays size={10} />
              {new Date(sl.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {sl.venue && (
            <span className="flex items-center gap-1 text-xs truncate"
                  style={{ color: isAuto ? '#a78bfa' : '#6ee7b7' }}>
              <MapPin size={10} className="flex-shrink-0" />
              <span className="truncate">{sl.venue}</span>
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col flex-1 pb-20">
      <TopBar
        title="Setlists"
        right={
          <button
            onClick={() => { setCreating(true); setCreateType('manual') }}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white
                       px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            New
          </button>
        }
      />

      {/* ── Create form ── */}
      {creating && (
        <div className="mx-4 mt-4 p-4 bg-slate-800 border border-violet-600 rounded-xl space-y-3">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-slate-700">
            <button
              onClick={() => setCreateType('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors
                          ${createType === 'manual'
                            ? 'bg-emerald-800/60 text-emerald-200'
                            : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ListMusic size={14} />
              Manual
            </button>
            <button
              onClick={() => setCreateType('auto')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors
                          ${createType === 'auto'
                            ? 'bg-violet-700/60 text-violet-200'
                            : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Sparkles size={14} />
              Smart
            </button>
          </div>

          <p className="text-xs text-slate-500">
            {createType === 'auto'
              ? 'Smart setlists auto-populate from filters (genre, language, decade, tags).'
              : 'Manually pick and order songs.'}
          </p>

          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder={createType === 'auto'
              ? 'e.g. 80s Rock Night, Spanish Songs…'
              : 'e.g. Sunday Service, Gig at The Venue…'}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5
                       text-slate-100 placeholder-slate-500 focus:outline-none
                       focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                         disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Create
            </button>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 space-y-5">
        {setlists.length === 0 && !creating && (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <ListMusic size={48} className="mx-auto opacity-30" />
            <p className="text-lg font-medium">No setlists yet</p>
            <p className="text-sm">Create a setlist for your next gig.</p>
          </div>
        )}

        {/* ── Manual setlists ── */}
        {manual.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-emerald-600/80 uppercase tracking-wider flex items-center gap-1.5">
              <ListMusic size={11} />
              Manual
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {manual.map((sl) => <SetlistCard key={sl.id} sl={sl} />)}
            </div>
          </section>
        )}

        {/* ── Smart setlists ── */}
        {auto.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-violet-500/80 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={11} />
              Smart
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {auto.map((sl) => <SetlistCard key={sl.id} sl={sl} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
