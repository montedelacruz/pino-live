import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  X,
  Search,
  Play,
  Clock,
  Music2,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useSetlistStore } from '../store/setlistStore'
import { useSongStore } from '../store/songStore'
import type { Song } from '../db/db'
import { formatDuration, totalDuration } from '../utils/formatDuration'

// ─── Sortable song row ────────────────────────────────────────────────────────

function SortableSongRow({
  song,
  index,
  onRemove,
}: {
  song: Song
  index: number
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = [song.artist, song.key].filter(Boolean).join(' · ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-3 bg-slate-800 border border-slate-700
                 rounded-xl group"
    >
      {/* Index */}
      <span className="w-6 text-center text-sm text-slate-500 flex-shrink-0">{index + 1}</span>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing
                   text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
        aria-label="Drag to reorder"
      >
        <GripVertical size={18} />
      </button>

      {/* Song info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-100 truncate">{song.title}</p>
        {meta && <p className="text-sm text-slate-400 truncate">{meta}</p>}
      </div>

      {/* Duration */}
      {song.durationSeconds != null && (
        <span className="text-sm text-slate-500 flex-shrink-0">
          {formatDuration(song.durationSeconds)}
        </span>
      )}

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1.5 text-slate-500 hover:text-red-400
                   hover:bg-slate-700 rounded-lg transition-colors"
        aria-label={`Remove ${song.title}`}
      >
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SetlistEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { setlists, updateSetlist } = useSetlistStore()
  const { songs: allSongs } = useSongStore()

  const setlist = setlists.find((sl) => sl.id === id)

  const [name, setName] = useState('')
  const [songIds, setSongIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate local state from store
  useEffect(() => {
    if (setlist) {
      setName(setlist.name)
      setSongIds(setlist.songIds)
    }
  }, [setlist?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = useCallback(
    (nextName: string, nextIds: string[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (id) updateSetlist(id, { name: nextName, songIds: nextIds })
      }, 400)
    },
    [id, updateSetlist]
  )

  const setNameAndSave = (v: string) => {
    setName(v)
    scheduleSave(v, songIds)
  }

  const setSongIdsAndSave = (ids: string[]) => {
    setSongIds(ids)
    scheduleSave(name, ids)
  }

  // DnD sensors — support pointer, touch, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = songIds.indexOf(active.id as string)
    const newIndex = songIds.indexOf(over.id as string)
    setSongIdsAndSave(arrayMove(songIds, oldIndex, newIndex))
  }

  const addSong = (songId: string) => {
    if (songIds.includes(songId)) return
    setSongIdsAndSave([...songIds, songId])
  }

  const removeSong = (songId: string) => {
    setSongIdsAndSave(songIds.filter((id) => id !== songId))
  }

  // Songs currently in setlist, in order
  const setlistSongs = songIds
    .map((sid) => allSongs.find((s) => s.id === sid))
    .filter(Boolean) as Song[]

  // Songs available to add (not already in setlist)
  const searchResults = allSongs.filter((s) => {
    if (songIds.includes(s.id)) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  const total = totalDuration(setlistSongs.map((s) => s.durationSeconds))

  if (!setlist && id) {
    return (
      <div className="flex flex-col flex-1">
        <TopBar title="Setlist not found" showBack />
        <div className="flex-1 flex items-center justify-center text-slate-500">
          This setlist no longer exists.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 pb-8">
      <TopBar
        title="Edit Setlist"
        showBack
        right={
          setlistSongs.length > 0 ? (
            <button
              onClick={() => navigate(`/performance/${id}`)}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500
                         text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Play size={16} />
              Perform
            </button>
          ) : null
        }
      />

      <div className="px-4 pt-4 space-y-5 max-w-2xl w-full mx-auto">

        {/* Setlist name */}
        <input
          value={name}
          onChange={(e) => setNameAndSave(e.target.value)}
          placeholder="Setlist name"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3
                     text-slate-100 text-lg font-semibold placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />

        {/* Stats bar */}
        {setlistSongs.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Music2 size={14} />
              {setlistSongs.length} song{setlistSongs.length !== 1 ? 's' : ''}
            </span>
            {total > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {formatDuration(total)} total
              </span>
            )}
          </div>
        )}

        {/* Song list */}
        {setlistSongs.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={songIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {setlistSongs.map((song, index) => (
                  <SortableSongRow
                    key={song.id}
                    song={song}
                    index={index}
                    onRemove={() => removeSong(song.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
            <Music2 size={32} className="mx-auto mb-2 opacity-40" />
            <p>No songs yet — search below to add some.</p>
          </div>
        )}

        {/* Add songs section */}
        <div className="space-y-3">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300
                       font-medium transition-colors"
          >
            <Search size={16} />
            {showSearch ? 'Hide song search' : 'Add songs…'}
          </button>

          {showSearch && (
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your library…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5
                             text-slate-100 placeholder-slate-500 focus:outline-none
                             focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {searchResults.length === 0 && (
                  <p className="text-sm text-slate-500 py-3 text-center">
                    {searchQuery ? 'No matching songs.' : 'All songs already added.'}
                  </p>
                )}
                {searchResults.map((song) => {
                  const meta = [song.artist, song.key].filter(Boolean).join(' · ')
                  return (
                    <button
                      key={song.id}
                      onClick={() => addSong(song.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                 bg-slate-800 hover:bg-slate-700 border border-slate-700
                                 hover:border-violet-600 text-left transition-colors group"
                    >
                      <div className="w-7 h-7 flex-shrink-0 bg-slate-700 group-hover:bg-violet-900/60
                                      rounded-lg flex items-center justify-center transition-colors">
                        <Music2 size={14} className="text-slate-400 group-hover:text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-100 truncate">{song.title}</p>
                        {meta && <p className="text-xs text-slate-400 truncate">{meta}</p>}
                      </div>
                      {song.durationSeconds != null && (
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {formatDuration(song.durationSeconds)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
