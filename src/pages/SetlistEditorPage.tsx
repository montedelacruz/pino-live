import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
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
  ListPlus,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useSetlistStore } from '../store/setlistStore'
import { useSongStore } from '../store/songStore'
import type { Song, AutoFilters } from '../db/db'
import { formatDuration, totalDuration } from '../utils/formatDuration'
import { computeAutoSongIds, availableDecades, decadeLabel } from '../utils/autoSetlist'

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

// ─── Auto filters panel ───────────────────────────────────────────────────────

function Chip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                  ${active
                    ? 'bg-violet-700/60 border-violet-500 text-violet-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
    >
      {label}
    </button>
  )
}

function AutoFiltersPanel({
  filters,
  onChange,
  allSongs,
}: {
  filters: AutoFilters
  onChange: (f: AutoFilters) => void
  allSongs: Song[]
}) {
  const genres    = useMemo(() => [...new Set(allSongs.map((s) => s.genre).filter(Boolean))].sort(), [allSongs])
  const languages = useMemo(() => [...new Set(allSongs.map((s) => s.language).filter(Boolean))].sort(), [allSongs])
  const decades   = useMemo(() => availableDecades(allSongs), [allSongs])
  const allTags   = useMemo(() => [...new Set(allSongs.flatMap((s) => s.tags))].sort(), [allSongs])

  const toggle = <K extends 'genres' | 'languages' | 'decades' | 'tags'>(
    key: K, value: K extends 'decades' ? number : string
  ) => {
    const current = (filters[key] ?? []) as (string | number)[]
    const next = current.includes(value as never)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onChange({ ...filters, [key]: next.length ? next : undefined })
  }

  const setSort = (sort: AutoFilters['sort']) => onChange({ ...filters, sort })

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{children}</p>
  )

  return (
    <div className="bg-slate-800/60 border border-violet-700/40 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-violet-400" />
        <span className="text-sm font-semibold text-violet-300">Smart Filters</span>
        <span className="text-xs text-slate-500 ml-auto">Songs matching ALL active filters</span>
      </div>

      {/* Genre */}
      {genres.length > 0 && (
        <div>
          <SectionLabel>Genre</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {genres.map((g) => (
              <Chip key={g} label={g} active={filters.genres?.includes(g) ?? false}
                onClick={() => toggle('genres', g)} />
            ))}
          </div>
        </div>
      )}

      {/* Language */}
      {languages.length > 0 && (
        <div>
          <SectionLabel>Language</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {languages.map((l) => (
              <Chip key={l} label={l} active={filters.languages?.includes(l) ?? false}
                onClick={() => toggle('languages', l)} />
            ))}
          </div>
        </div>
      )}

      {/* Decade */}
      {decades.length > 0 && (
        <div>
          <SectionLabel>Decade</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {decades.map((d) => (
              <Chip key={d} label={decadeLabel(d)} active={filters.decades?.includes(d) ?? false}
                onClick={() => toggle('decades', d)} />
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {allTags.length > 0 && (
        <div>
          <SectionLabel>Tags <span className="normal-case font-normal">(match any)</span></SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => (
              <Chip key={t} label={t} active={filters.tags?.includes(t) ?? false}
                onClick={() => toggle('tags', t)} />
            ))}
          </div>
        </div>
      )}

      {/* Sort */}
      <div>
        <SectionLabel>Sort order</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {(['titleAZ', 'artist', 'yearAsc', 'yearDesc'] as AutoFilters['sort'][]).map((s) => {
            const labels: Record<string, string> = {
              titleAZ: 'Title A→Z', artist: 'Artist', yearAsc: 'Year ↑', yearDesc: 'Year ↓',
            }
            return (
              <Chip key={s} label={labels[s!]} active={(filters.sort ?? 'titleAZ') === s}
                onClick={() => setSort(s)} />
            )
          })}
        </div>
      </div>
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

  // Auto-setlist filters
  const [autoFilters, setAutoFilters] = useState<AutoFilters>({})
  const isAuto = setlist?.type === 'auto'

  // UI state
  const [showDetails,  setShowDetails]  = useState(false)
  const [showAddSong,  setShowAddSong]  = useState(false)
  const [addSongQuery, setAddSongQuery] = useState('')

  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addSongRef = useRef<HTMLDivElement>(null)

  // Close the add-song dropdown when clicking outside
  useEffect(() => {
    if (!showAddSong) return
    const handler = (e: MouseEvent) => {
      if (addSongRef.current && !addSongRef.current.contains(e.target as Node)) {
        setShowAddSong(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAddSong])

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
      setAutoFilters(setlist.autoFilters ?? {})

      // Auto-expand details if any are filled in
      const hasDetails = !!(setlist.venue || setlist.date || setlist.contactPerson || setlist.contactPhone || setlist.notes)
      setShowDetails(hasDetails)
    }
  }, [setlist?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = useCallback(
    (fields: {
      nextName: string; nextIds: string[]; nextVenue: string; nextDate: string
      nextContactPerson: string; nextContactPhone: string; nextNotes: string
      nextAutoFilters: AutoFilters
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
          autoFilters:   fields.nextAutoFilters,
        })
      }, 400)
    },
    [id, updateSetlist]
  )

  const saveAll = useCallback(
    (overrides: Partial<{
      name: string; songIds: string[]; venue: string; date: string
      contactPerson: string; contactPhone: string; notes: string
      autoFilters: AutoFilters
    }>) => {
      scheduleSave({
        nextName:          overrides.name          ?? name,
        nextIds:           overrides.songIds       ?? songIds,
        nextVenue:         overrides.venue         ?? venue,
        nextDate:          overrides.date          ?? date,
        nextContactPerson: overrides.contactPerson ?? contactPerson,
        nextContactPhone:  overrides.contactPhone  ?? contactPhone,
        nextNotes:         overrides.notes         ?? notes,
        nextAutoFilters:   overrides.autoFilters   ?? autoFilters,
      })
    },
    [scheduleSave, name, songIds, venue, date, contactPerson, contactPhone, notes, autoFilters]
  )

  // Handle auto-filter changes: recompute songIds and save
  const handleFiltersChange = useCallback((newFilters: AutoFilters) => {
    setAutoFilters(newFilters)
    const newIds = computeAutoSongIds(allSongs, newFilters)
    setSongIds(newIds)
    saveAll({ autoFilters: newFilters, songIds: newIds })
  }, [allSongs, saveAll])

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

  // Songs available to add (sorted A→Z, filtered by search query)
  const searchResults = useMemo(() => {
    const q = addSongQuery.trim().toLowerCase()
    return allSongs
      .filter((s) => {
        if (songIds.includes(s.id)) return false
        if (!q) return true
        return (
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [allSongs, songIds, addSongQuery])

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
    <div className="flex flex-col flex-1 pb-28">
      <TopBar
        title={
          <span className="flex items-center gap-2">
            {isAuto && <Sparkles size={14} className="text-violet-400 flex-shrink-0" />}
            {isAuto ? 'Smart Setlist' : 'Edit Setlist'}
          </span>
        }
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

        {/* ── Event details + Add song row ── */}
        <div className={`gap-3 items-start ${isAuto ? 'flex' : 'grid grid-cols-2'}`}>

          {/* Event Details collapsible */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-visible">
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-3
                         text-sm font-medium text-slate-300 hover:text-slate-100
                         hover:bg-slate-700/40 transition-colors rounded-xl"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <CalendarDays size={14} className={hasEventDetails ? 'text-violet-400 flex-shrink-0' : 'text-slate-500 flex-shrink-0'} />
                <span className="truncate">Event Details</span>
                {hasEventDetails && (
                  <span className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-violet-700/40 text-violet-300 rounded-full">
                    filled
                  </span>
                )}
              </span>
              {showDetails ? <ChevronUp size={15} className="text-slate-500 flex-shrink-0 ml-1" /> : <ChevronDown size={15} className="text-slate-500 flex-shrink-0 ml-1" />}
            </button>
          </div>

          {/* Add Song to Setlist dropdown (manual only) */}
          {!isAuto && <div className="relative" ref={addSongRef}>
            <button
              onClick={() => { setShowAddSong((v) => !v); setAddSongQuery('') }}
              className="w-full flex items-center justify-between gap-1.5 px-3 py-3
                         bg-slate-800/60 border border-slate-700 rounded-xl
                         text-sm font-medium text-slate-300 hover:text-slate-100
                         hover:bg-slate-700/40 transition-colors"
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <ListPlus size={14} className="text-violet-400 flex-shrink-0" />
                <span className="truncate">Add Song to Setlist</span>
              </span>
              <ChevronDown size={15} className={`text-slate-500 flex-shrink-0 transition-transform ${showAddSong ? 'rotate-180' : ''}`} />
            </button>

            {showAddSong && (
              <div className="absolute left-0 right-0 mt-1 z-30 bg-slate-850 bg-slate-900
                              border border-slate-700 rounded-xl shadow-2xl overflow-hidden
                              min-w-[260px]">
                {/* Search input */}
                <div className="p-2 border-b border-slate-700/60">
                  <div className="relative flex items-center">
                    <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                    <input
                      autoFocus
                      value={addSongQuery}
                      onChange={(e) => setAddSongQuery(e.target.value)}
                      placeholder="Search songs…"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2
                                 text-slate-100 placeholder-slate-500 text-sm
                                 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                {/* Song list */}
                <div className="max-h-64 overflow-y-auto">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      {addSongQuery ? 'No matching songs.' : 'All songs already added.'}
                    </p>
                  ) : (
                    searchResults.map((song) => {
                      const meta = [song.artist, song.key].filter(Boolean).join(' · ')
                      return (
                        <button
                          key={song.id}
                          onClick={() => { addSong(song.id) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5
                                     hover:bg-violet-900/30 text-left transition-colors
                                     border-b border-slate-700/40 last:border-0"
                        >
                          <div className="flex-shrink-0 w-6 h-6 bg-slate-700 rounded flex items-center justify-center">
                            <Music2 size={12} className="text-slate-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-100 text-sm truncate">{song.title}</p>
                            {meta && <p className="text-xs text-slate-500 truncate">{meta}</p>}
                          </div>
                          {song.durationSeconds != null && (
                            <span className="text-xs text-slate-500 flex-shrink-0">
                              {formatDuration(song.durationSeconds)}
                            </span>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>}
        </div>

        {/* Event details expanded panel (renders below the row) */}
        {showDetails && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 pb-4 space-y-3 -mt-2">
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

        {/* ── Smart filters panel (auto setlists only) ── */}
        {isAuto && (
          <AutoFiltersPanel
            filters={autoFilters}
            onChange={handleFiltersChange}
            allSongs={allSongs}
          />
        )}

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
            {isAuto && (
              <button
                onClick={() => handleFiltersChange(autoFilters)}
                className="ml-auto flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                title="Refresh matched songs"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            )}
          </div>
        )}

        {/* ── Song list ── */}
        {setlistSongs.length > 0 ? (
          isAuto ? (
            /* Auto setlist: read-only ordered list */
            <div className="space-y-2">
              {setlistSongs.map((song, index) => {
                const meta = [song.artist, song.key].filter(Boolean).join(' · ')
                return (
                  <div key={song.id}
                    className="flex items-center gap-3 px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl">
                    <span className="w-6 text-center text-sm text-slate-500 flex-shrink-0">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100 truncate">{song.title}</p>
                      {meta && <p className="text-sm text-slate-400 truncate">{meta}</p>}
                    </div>
                    {song.year && <span className="text-xs text-slate-500 flex-shrink-0">{song.year}</span>}
                    {song.durationSeconds != null && (
                      <span className="text-sm text-slate-500 flex-shrink-0">{formatDuration(song.durationSeconds)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* Manual setlist: drag-and-drop */
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={songIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {setlistSongs.map((song, index) => (
                    <SortableSongRow key={song.id} song={song} index={index}
                      onRemove={() => removeSong(song.id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        ) : (
          <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
            <Music2 size={32} className="mx-auto mb-2 opacity-40" />
            {isAuto
              ? <p>No songs match the current filters yet.</p>
              : <p>No songs yet — use Add Song to Setlist above.</p>}
          </div>
        )}


      </div>
    </div>
  )
}
