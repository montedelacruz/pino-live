import { useState, useEffect, useRef } from 'react'
import { X, Search, ExternalLink, ChevronDown, ChevronUp, Loader2, KeyRound, Check } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { searchTracks, fetchLyrics, fetchLyricsOvh } from '../utils/lyricsSearch'
import type { HappiTrack } from '../utils/lyricsSearch'

interface Props {
  initialQuery?: string
  onSelect: (lyrics: string) => void
  onClose: () => void
}

export function LyricsSearchModal({ initialQuery = '', onSelect, onClose }: Props) {
  const { happiApiKey, setHappiApiKey } = useSettingsStore()

  const [view, setView] = useState<'setup' | 'search'>(happiApiKey ? 'search' : 'setup')

  // --- Setup state ---
  const [keyDraft, setKeyDraft] = useState(happiApiKey)
  const [keySaved, setKeySaved] = useState(false)

  // --- Search state ---
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<HappiTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // --- Expanded preview state ---
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loadingLyrics, setLoadingLyrics] = useState<number | null>(null)
  const [previewLyrics, setPreviewLyrics] = useState<Record<number, string>>({})
  const [lyricsError, setLyricsError] = useState<Record<number, string>>({})

  const queryRef = useRef(query)
  queryRef.current = query

  // Auto-search when modal opens with a query and key exists
  useEffect(() => {
    if (happiApiKey && initialQuery.trim()) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveKey = () => {
    if (!keyDraft.trim()) return
    setHappiApiKey(keyDraft.trim())
    setKeySaved(true)
    setTimeout(() => {
      setView('search')
      setKeySaved(false)
      if (initialQuery.trim()) handleSearchWithKey(keyDraft.trim())
    }, 700)
  }

  const handleSearch = () => handleSearchWithKey(happiApiKey)

  const handleSearchWithKey = async (key: string) => {
    const q = queryRef.current.trim()
    if (!q || !key) return
    setSearching(true)
    setSearchError(null)
    setResults([])
    setExpandedId(null)
    try {
      const tracks = await searchTracks(q, key)
      setResults(tracks)
      if (tracks.length === 0) setSearchError('No results found.')
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleTogglePreview = async (track: HappiTrack) => {
    if (expandedId === track.id_track) {
      setExpandedId(null)
      return
    }

    setExpandedId(track.id_track)

    // Already loaded
    if (previewLyrics[track.id_track]) return

    setLoadingLyrics(track.id_track)
    try {
      let lyrics: string
      if (track.haslyrics) {
        // Try Happi first
        lyrics = await fetchLyrics(track.api_lyrics, happiApiKey)
      } else {
        // Happi has no lyrics — fall back to lyrics.ovh
        lyrics = await fetchLyricsOvh(track.artist, track.track)
      }
      setPreviewLyrics((p) => ({ ...p, [track.id_track]: lyrics }))
    } catch (err) {
      setLyricsError((p) => ({
        ...p,
        [track.id_track]: err instanceof Error ? err.message : 'Could not load lyrics.',
      }))
    } finally {
      setLoadingLyrics(null)
    }
  }

  const handleUseLyrics = (trackId: number) => {
    const lyrics = previewLyrics[trackId]
    if (lyrics) {
      onSelect(lyrics)
      onClose()
    }
  }

  const geniusUrl = `https://genius.com/search?q=${encodeURIComponent(query)}`

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
            <p className="text-xs text-slate-500 mt-0.5">
              {view === 'setup' ? 'Powered by Happi.dev' : 'happi.dev • tap a result to preview'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {view === 'search' && (
              <button
                onClick={() => setView('setup')}
                title="API key settings"
                className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <KeyRound size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── SETUP VIEW ── */}
        {view === 'setup' && (
          <div className="flex flex-col gap-5 px-5 py-6">
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 space-y-2">
              <p className="font-medium text-slate-200">Get a free API key</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Visit <a href="https://happi.dev" target="_blank" rel="noreferrer"
                  className="text-violet-400 underline underline-offset-2 hover:text-violet-300">happi.dev</a> and sign up for free</li>
                <li>Copy your API key from the dashboard</li>
                <li>Paste it below — it's stored only on this device</li>
              </ol>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Your Happi.dev API Key</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                  placeholder="Paste key here…"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5
                             text-slate-100 placeholder-slate-500 focus:outline-none
                             focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
                />
                <button
                  onClick={handleSaveKey}
                  disabled={!keyDraft.trim()}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                             text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {keySaved ? <Check size={16} /> : 'Save'}
                </button>
              </div>
            </div>

            {happiApiKey && (
              <button
                onClick={() => setView('search')}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors text-left"
              >
                ← Back to search
              </button>
            )}
          </div>
        )}

        {/* ── SEARCH VIEW ── */}
        {view === 'search' && (
          <>
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
                  <a
                    href={geniusUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300
                               underline underline-offset-2"
                  >
                    <ExternalLink size={14} />
                    Search on Genius instead
                  </a>
                </div>
              )}

              {!searching && results.length > 0 && results.map((track) => {
                const isExpanded = expandedId === track.id_track
                const isLoadingThis = loadingLyrics === track.id_track
                const lyrics = previewLyrics[track.id_track]
                const lyricErr = lyricsError[track.id_track]

                return (
                  <div
                    key={track.id_track}
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
                      {/* Cover art */}
                      {track.cover ? (
                        <img
                          src={track.cover}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-700"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex-shrink-0" />
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-100 truncate">{track.track}</p>
                        <p className="text-xs text-slate-400 truncate">{track.artist}
                          {track.album ? <span className="text-slate-600"> · {track.album}</span> : null}
                        </p>
                      </div>

                      {/* Badges + chevron */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!track.haslyrics && !isLoadingThis && !isExpanded && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-500">
                            Try anyway
                          </span>
                        )}
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
                          <p className="text-sm text-red-400">{lyricErr}</p>
                        )}

                        {lyrics && !isLoadingThis && (
                          <>
                            <div className="max-h-48 overflow-y-auto mb-3">
                              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                                {lyrics.slice(0, 600)}{lyrics.length > 600 ? '\n…' : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => handleUseLyrics(track.id_track)}
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

              {/* Footer: Genius fallback always visible after search */}
              {!searching && results.length > 0 && (
                <div className="pt-2 pb-1 flex justify-center">
                  <a
                    href={geniusUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <ExternalLink size={12} />
                    Not what you're looking for? Search on Genius
                  </a>
                </div>
              )}

              {/* Empty state before any search */}
              {!searching && results.length === 0 && !searchError && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                  <Search size={32} className="text-slate-700" />
                  <p className="text-sm">Enter a song title or artist and tap Search</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
