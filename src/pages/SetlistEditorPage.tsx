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
  MapPin,
  CalendarDays,
  User,
  Phone,
  FileText,
  ChevronDown,
  ChevronUp,
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

// ─── Small labelled input ─────────────────────────────────────────────────────

function FieldInput({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: React.ElementType
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs text-slate-400 font-medium uppercase tracking-wide">
        <Icon size={12} />
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5
                   text-slate-100 placeholder-slate-500 text-sm
                   focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
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

  // Core fields
  const [name, setName]       = useState('')
  const [songIds, setSongIds] = useState<string[]>([])

  // Event detail fields
  const [venue,         setVenue]         = useState('')
  const [date,          setDate]          = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [contactPhone,  setContactPhone]  = useState('')
  const [notes,         setNotes]         = useState('')

  // UI state
  const [searchQuery,  setSearchQuery]  = useState('')
  const [showSearch,   setShowSearch]   = useState(false)
  const [showDetails,  setShowDetails]  = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate local state from store
  useEffect(() => {
    if (setlist) {
      setName(setlist.name)
      setSongIds(setlist.songIds)
      setVenue(setlist.venue ?? '')
      setDate(setlist.date ?? '')
      setContactPerson(setlist.contactPerson ?? '')
      setContactPhone(setlist.contactPhone ?? '')
      setNotes(setlist.notes ?? '')

      // Auto-expand details if any are filled in
      const hasDetails = !!(setlist.venue || setlist.date || setlist.contactPerson || setlist.contactPhone || setlist.notes)
      setShowDetails(hasDetails)
    }
  }, [setlist?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = useCallback(
    (fields: {
      nextName: string
      nextIds: string[]
      nextVenue: string
      nextDate: string
      nextContactPerson: string
      nextContactPhone: string
      nextNotes: string
    }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        if (!id) return
        updateSetlist(id, {
          name:          fields.nextName,
          songIds:       fields.nextIds,
          venue:         fields.nextVenue         || undefined,
          date:          fields.nextDate          || undefined,
          contactPerson: fields.nextContactPerson || undefined,
          contactPhone:  fields.nextContactPhone  || undefined,
          notes:         fields.nextNotes         || undefined,
        })
      }, 400)
    },
    [id, updateSetlist]
  )

  // Helper so each field just passes its new value; the rest come from current state
  const saveAll = useCallback(
    (overrides: Partial<{
      name: string; songIds: string[]; venue: string; date: string
      contactPerson: string; contactPhone: string; notes: string
    }>) => {
      scheduleSave({
        nextName:          overrides.name          ?? name,
        nextIds:           overrides.songIds       ?? songIds,
        nextVenue:         overrides.venue         ?? venue,
        nextDate:          overrides.date          ?? date,
        nextContactPerson: overrides.contactPerson ?? contactPerson,
        nextContactPhone:  overrides.contactPhone  ?? contactPhone,
        nextNotes:         overrides.notes         ?? notes,
      })
    },
    [scheduleSave, name, songIds, venue, date, contactPerson, contactPhone, notes]
  )

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = songIds.indexOf(active.id as string)
    const newIndex = songIds.indexOf(over.id as string)
    const next = arrayMove(songIds, oldIndex, newIndex)
    setSongIds(next)
    saveAll({ songIds: next })
  }

  const addSong = (songId: string) => {
    if (songIds.includes(songId)) return
    const next = [...songIds, songId]
    setSongIds(next)
    saveAll({ songIds: next })
  }

  const removeSong = (songId: string) => {
    const next = songIds.filter((i) => i !== songId)
    setSongIds(next)
    saveAll({ songIds: next })
  }

  // Songs in setlist (ordered)
  const setlistSongs = songIds
    .map((sid) => allSongs.find((s) => s.id === sid))
    .filter(Boolean) as Song[]

  // Songs available to add
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

  const hasEventDetails = !!(venue || date || contactPerson || contactPhone || notes)

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

        {/* ── Setlist name ── */}
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); saveAll({ name: e.target.value }) }}
          placeholder="Setlist name"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3
                     text-slate-100 text-lg font-semibold placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />

        {/* ── Event details collapsible ── */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3
                       text-sm font-medium text-slate-300 hover:text-slate-100
                       hover:bg-slate-700/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              <CalendarDays size={15} className={hasEventDetails ? 'text-violet-400' : 'text-slate-500'} />
              Event Details
              {hasEventDetails && (
                <span className="text-xs px-1.5 py-0.5 bg-violet-700/40 text-violet-300 rounded-full">
                  filled
                </span>
              )}
            </span>
            {showDetails ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
          </button>

          {showDetails && (
            <div className="px-4 pb-4 space-y-3 border-t border-slate-700/60">
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldInput
                  icon={CalendarDays}
                  label="Date"
                  type="date"
                  value={date}
                  onChange={(v) => { setDate(v); saveAll({ date: v }) }}
                />
                <FieldInput
                  icon={MapPin}
                  label="Venue"
                  value={venue}
                  onChange={(v) => { setVenue(v); saveAll({ venue: v }) }}
                  placeholder="Club, church, event name…"
                />
                <FieldInput
                  icon={User}
                  label="Contact Person"
                  value={contactPerson}
                  onChange={(v) => { setContactPerson(v); saveAll({ contactPerson: v }) }}
                  placeholder="Booking agent, coordinator…"
                />
                <FieldInput
                  icon={Phone}
                  label="Contact Info"
                  value={contactPhone}
                  onChange={(v) => { setContactPhone(v); saveAll({ contactPhone: v }) }}
                  placeholder="Phone, email, or handle…"
                />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 font-medium uppercase tracking-wide">
                  <FileText size={12} />
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => { setNotes(e.target.value); saveAll({ notes: e.target.value }) }}
                  placeholder="Load-in time, dress code, set length, payment details…"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5
                             text-slate-100 placeholder-slate-500 text-sm resize-none
                             focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Stats bar ── */}
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

        {/* ── Song list ── */}
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

        {/* ── Add songs ── */}
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
