import { useState, useEffect, useRef } from 'react'
import { X, Search, ChevronDown, ChevronUp, Loader2, Check } from 'lucide-react'
import { searchTracks, fetchLyrics } from '../utils/lyricsSearch'
import type { ItunesTrack } from '../utils/lyricsSearch'

export interface LyricsSearchResult {
  lyrics: string
  title: string
  artist: string
  durationSeconds?: number
}

interface Props {
  initialQuery?: string
  onSelect: (result: LyricsSearchResult) => void
  onClose: () => void
}

export function LyricsSearchModal({ initialQuery = '', onSelect, onClose }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<ItunesTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loadingLyrics, setLoadingLyrics] = useState<number | null>(null)
  const [previewLyrics, setPreviewLyrics] = useState<Record<number, string>>({})
  const [lyricsError, setLyricsError] = useState<Record<number, string>>({})

  const queryRef = useRef(query)
  queryRef.current = query

  // Auto-search on open if we have an initial query
  useEffect(() => {
    if (initialQuery.trim()) handleSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async () => {
    const q = queryRef.current.trim()
    if (!q) return
    setSearching(true)
    setSearchError(null)
    setResults([])
    setExpandedId(null)
    try {
      const tracks = await searchTracks(q)
      setResults(tracks)
      if (tracks.length === 0) setSearchError('No results found. Try a different search.')
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleTogglePreview = async (track: ItunesTrack) => {
    if (expandedId === track.trackId) {
      setExpandedId(null)
      return
    }
    setExpandedId(track.trackId)
    if (previewLyrics[track.trackId]) return

    setLoadingLyrics(track.trackId)
    try {
      const lyrics = await fetchLyrics(track.artistName, track.trackName, track.trackTimeMillis)
      setPreviewLyrics((p) => ({ ...p, [track.trackId]: lyrics }))
    } catch (err) {
      setLyricsError((p) => ({
        ...p,
        [track.trackId]: err instanceof Error ? err.message : 'Could not load lyrics.',
      }))
    } finally {
      setLoadingLyrics(null)
    }
  }

  const handleUseLyrics = (track: ItunesTrack) => {
    const lyrics = previewLyrics[track.trackId]
    if (!lyrics) return
    onSelect({
      lyrics,
      title: track.trackName,
      artist: track.artistName,
      durationSeconds: track.trackTimeMillis
        ? Math.round(track.trackTimeMillis / 1000)
        : undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-2xl bg-slate-900 border border-slate-700
                      rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92vh] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Search Lyrics</h2>
            <p className="text-xs text-slate-500 mt-0.5">iTunes search · LRCLIB · no account needed</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Song title, artist…"
              autoFocus
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5
                         text-slate-100 placeholder-slate-500 focus:outline-none
                         focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                         text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {searching
                ? <Loader2 size={16} className="animate-spin" />
                : <Search size={16} />}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">

          {searching && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
              <Loader2 size={28} className="animate-spin text-violet-400" />
              <p className="text-sm">Searching…</p>
            </div>
          )}

          {searchError && !searching && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-slate-400">
              <p className="text-sm">{searchError}</p>
            </div>
          )}

          {!searching && results.map((track) => {
            const isExpanded = expandedId === track.trackId
            const isLoadingThis = loadingLyrics === track.trackId
            const lyrics = previewLyrics[track.trackId]
            const lyricErr = lyricsError[track.trackId]

            return (
              <div
                key={track.trackId}
                className={`border rounded-xl overflow-hidden transition-colors
                            ${isExpanded
                              ? 'border-violet-500/50 bg-slate-800/80'
                              : 'border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/70'}`}
              >
                {/* Track row */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => handleTogglePreview(track)}
                >
                  {track.artworkUrl100 ? (
                    <img src={track.artworkUrl100} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{track.trackName}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {track.artistName}
                      {track.collectionName && (
                        <span className="text-slate-600"> · {track.collectionName}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isLoadingThis
                      ? <Loader2 size={16} className="animate-spin text-violet-400" />
                      : isExpanded
                        ? <ChevronUp size={16} className="text-violet-400" />
                        : <ChevronDown size={16} className="text-slate-500" />
                    }
                  </div>
                </button>

                {/* Expanded lyrics preview */}
                {isExpanded && (
                  <div className="border-t border-slate-700/60 px-4 pb-4 pt-3">
                    {isLoadingThis && (
                      <div className="flex justify-center py-6">
                        <Loader2 size={20} className="animate-spin text-violet-400" />
                      </div>
                    )}
                    {lyricErr && !isLoadingThis && (
                      <div className="flex flex-col items-center gap-3 py-3">
                        <p className="text-sm text-slate-500">{lyricErr}</p>
                      </div>
                    )}
                    {lyrics && !isLoadingThis && (
                      <>
                        <div className="max-h-48 overflow-y-auto mb-3">
                          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                            {lyrics.slice(0, 600)}{lyrics.length > 600 ? '\n…' : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUseLyrics(track)}
                          className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white
                                     rounded-xl font-medium text-sm transition-colors flex items-center
                                     justify-center gap-2"
                        >
                          <Check size={15} />
                          Use These Lyrics
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}


          {/* Empty state */}
          {!searching && results.length === 0 && !searchError && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
              <Search size={32} className="text-slate-700" />
              <p className="text-sm">Enter a song title or artist and tap Search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
