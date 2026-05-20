import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, SlidersHorizontal, Settings2 } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { SearchBar } from '../components/SearchBar'
import { SongCard } from '../components/SongCard'
import { DataModal } from '../components/DataModal'
import { useSongStore } from '../store/songStore'
import { usePerformanceKeyboard } from '../hooks/useKeyboard'
import type { Song } from '../db/db'

type SortKey = 'updatedAt' | 'titleAZ' | 'titleZA' | 'artist' | 'language' | 'genre' | 'key'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updatedAt', label: 'Recently Updated' },
  { value: 'titleAZ', label: 'Title A → Z' },
  { value: 'titleZA', label: 'Title Z → A' },
  { value: 'artist', label: 'Artist' },
  { value: 'language', label: 'Language' },
  { value: 'genre', label: 'Genre' },
  { value: 'key', label: 'Key' },
]

function sortSongs(songs: Song[], key: SortKey): Song[] {
  const sorted = [...songs]
  switch (key) {
    case 'titleAZ': return sorted.sort((a, b) => a.title.localeCompare(b.title))
    case 'titleZA': return sorted.sort((a, b) => b.title.localeCompare(a.title))
    case 'artist':  return sorted.sort((a, b) => a.artist.localeCompare(b.artist))
    case 'language': return sorted.sort((a, b) => a.language.localeCompare(b.language))
    case 'genre':   return sorted.sort((a, b) => a.genre.localeCompare(b.genre))
    case 'key':     return sorted.sort((a, b) => a.key.localeCompare(b.key))
    case 'updatedAt': return sorted.sort((a, b) => b.updatedAt - a.updatedAt)
    default: return sorted
  }
}

function filterSongs(songs: Song[], query: string): Song[] {
  if (!query.trim()) return songs
  const q = query.toLowerCase()
  return songs.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)) ||
      s.lyrics.toLowerCase().includes(q)
  )
}

export function LibraryPage() {
  const navigate = useNavigate()
  const { songs, loading } = useSongStore()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [showSort, setShowSort] = useState(false)
  const [showDataModal, setShowDataModal] = useState(false)

  const displayedSongs = useMemo(
    () => sortSongs(filterSongs(songs, search), sortKey),
    [songs, search, sortKey]
  )

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? 'Sort'

  // Open a song from the current list and carry the full list as browse context
  const openSong = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(displayedSongs.length - 1, index))
    const song = displayedSongs[clamped]
    if (!song) return
    navigate(`/songs/${song.id}`, {
      state: { songIds: displayedSongs.map((s) => s.id), index: clamped },
    })
  }, [displayedSongs, navigate])

  // Pedal support: down = open first song (or jump into list), double = jump ±10
  usePerformanceKeyboard({
    onRightSingle:      () => openSong(0),
    onLeftSingle:       () => openSong(displayedSongs.length - 1),
    onRightDouble:      () => openSong(10),
    onLeftDouble:       () => openSong(displayedSongs.length - 11),
    onNext:             () => openSong(0),
    onPrev:             () => openSong(displayedSongs.length - 1),
    onScrollDown:       () => window.scrollBy({ top: 300, behavior: 'smooth' }),
    onScrollUp:         () => window.scrollBy({ top: -300, behavior: 'smooth' }),
    onExit:             () => navigate('/'),
    onFontIncrease:     () => {},
    onFontDecrease:     () => {},
    onToggleFullscreen: () => {},
  })

  return (
    <div className="flex flex-col flex-1 pb-20">
      <TopBar
        title="Library"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDataModal(true)}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Import / Export"
            >
              <Settings2 size={20} />
            </button>
            <button
              onClick={() => navigate('/songs/new')}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white
                         px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={18} />
              Add Song
            </button>
          </div>
        }
      />
      {showDataModal && <DataModal onClose={() => setShowDataModal(false)} />}

      <div className="px-4 pt-4 pb-3 space-y-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search songs, artists, tags, lyrics…"
        />

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            {loading ? 'Loading…' : `${displayedSongs.length} song${displayedSongs.length !== 1 ? 's' : ''}`}
          </p>
          <div className="relative">
            <button
              onClick={() => setShowSort((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-slate-100
                         bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <SlidersHorizontal size={15} />
              {sortLabel}
            </button>
            {showSort && (
              <div className="absolute right-0 mt-1 w-52 bg-slate-800 border border-slate-700
                              rounded-xl shadow-xl z-20 overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortKey(opt.value); setShowSort(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${sortKey === opt.value
                        ? 'bg-violet-700/40 text-violet-300'
                        : 'text-slate-300 hover:bg-slate-700'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 space-y-2">
        {!loading && displayedSongs.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            {search ? 'No songs match your search.' : 'No songs yet. Add your first song!'}
          </div>
        )}
        {displayedSongs.map((song, i) => (
          <SongCard
            key={song.id}
            song={song}
            onClick={() =>
              navigate(`/songs/${song.id}`, {
                state: { songIds: displayedSongs.map((s) => s.id), index: i },
              })
            }
          />
        ))}
      </div>
    </div>
  )
}
