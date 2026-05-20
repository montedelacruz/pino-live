import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ListMusic, ChevronRight, Trash2, Copy, Clock, MapPin, CalendarDays } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useSetlistStore } from '../store/setlistStore'
import { useSongStore } from '../store/songStore'
import { formatDuration, totalDuration } from '../utils/formatDuration'

export function SetlistsPage() {
  const navigate = useNavigate()
  const { setlists, addSetlist, deleteSetlist, duplicateSetlist } = useSetlistStore()
  const { songs } = useSongStore()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    const sl = await addSetlist(name)
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

  return (
    <div className="flex flex-col flex-1 pb-20">
      <TopBar
        title="Setlists"
        right={
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white
                       px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            New Setlist
          </button>
        }
      />

      {/* New setlist inline form */}
      {creating && (
        <div className="mx-4 mt-4 p-4 bg-slate-800 border border-violet-600 rounded-xl space-y-3">
          <p className="text-sm font-medium text-slate-300">Name your setlist</p>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="e.g. Sunday Service, Gig at The Venue…"
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

      <div className="px-4 pt-4 space-y-2">
        {setlists.length === 0 && !creating && (
          <div className="text-center py-16 text-slate-500 space-y-2">
            <ListMusic size={48} className="mx-auto opacity-30" />
            <p className="text-lg font-medium">No setlists yet</p>
            <p className="text-sm">Create a setlist for your next gig.</p>
          </div>
        )}

        {setlists.map((sl) => {
          const slSongs = sl.songIds
            .map((id) => songs.find((s) => s.id === id))
            .filter(Boolean) as typeof songs
          const total = totalDuration(slSongs.map((s) => s.durationSeconds))

          return (
            <button
              key={sl.id}
              onClick={() => navigate(`/setlists/${sl.id}/edit`)}
              className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-800 hover:bg-slate-750
                         border border-slate-700 rounded-xl text-left transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center
                              group-hover:bg-violet-900/60 transition-colors">
                <ListMusic size={18} className="text-slate-400 group-hover:text-violet-400 transition-colors" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-100 truncate">{sl.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <span className="text-sm text-slate-400">
                    {sl.songIds.length} song{sl.songIds.length !== 1 ? 's' : ''}
                  </span>
                  {total > 0 && (
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <Clock size={13} />
                      {formatDuration(total)}
                    </span>
                  )}
                  {sl.date && (
                    <span className="flex items-center gap-1 text-sm text-slate-500">
                      <CalendarDays size={13} />
                      {new Date(sl.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {sl.venue && (
                    <span className="flex items-center gap-1 text-sm text-violet-400/80 truncate max-w-[160px]">
                      <MapPin size={12} />
                      {sl.venue}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => handleDuplicate(sl.id, e)}
                  className="p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Duplicate"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={(e) => handleDelete(sl.id, sl.name, e)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <ChevronRight size={18} className="text-slate-500 flex-shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
