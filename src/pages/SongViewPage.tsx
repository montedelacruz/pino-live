import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Edit2, Type, AlignLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useSongStore } from '../store/songStore'
import { useSettingsStore } from '../store/settingsStore'
import { usePerformanceKeyboard } from '../hooks/useKeyboard'

const AT_EDGE_THRESHOLD = 20   // px
const PEDAL_OVERLAP     = 0.75
const JUMP_SIZE         = 10

interface BrowseState {
  songIds: string[]
  index: number
}

export function SongViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const browse = (location.state ?? null) as BrowseState | null

  const { songs } = useSongStore()
  const {
    fontSize, lineHeight, fontMode,
    increaseFontSize, decreaseFontSize,
    increaseLineHeight, decreaseLineHeight,
    toggleFontMode,
  } = useSettingsStore()

  const song = songs.find((s) => s.id === id)

  // ── Browse session state ──────────────────────────────────────────────────
  const browseIds  = browse?.songIds ?? null
  const [browseIndex, setBrowseIndex] = useState(browse?.index ?? 0)

  // ── Scroll container ref (used when in browse mode — fixed layout) ────────
  const scrollRef = useRef<HTMLDivElement>(null)
  const [atTop,    setAtTop]    = useState(true)
  const [atBottom, setAtBottom] = useState(false)

  const updateEdgeState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setAtTop(el.scrollTop <= AT_EDGE_THRESHOLD)
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight <= AT_EDGE_THRESHOLD)
  }, [])

  // Reset scroll to top whenever the song changes
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: 0 })
    const t = setTimeout(updateEdgeState, 80)
    return () => clearTimeout(t)
  }, [id, updateEdgeState])

  // ── Navigation within the browse list ────────────────────────────────────
  const goTo = useCallback((newIndex: number) => {
    if (!browseIds) return
    const clamped = Math.max(0, Math.min(browseIds.length - 1, newIndex))
    setBrowseIndex(clamped)
    navigate(`/songs/${browseIds[clamped]}`, {
      state: { songIds: browseIds, index: clamped },
      replace: true,
    })
  }, [browseIds, navigate])

  // ── Pedal handlers ────────────────────────────────────────────────────────
  const handleRightSingle = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= AT_EDGE_THRESHOLD
      if (!isAtBottom) {
        el.scrollBy({ top: Math.round(el.clientHeight * PEDAL_OVERLAP), behavior: 'smooth' })
        return
      }
    }
    goTo(browseIndex + 1)
  }, [browseIndex, goTo])

  const handleLeftSingle = useCallback(() => {
    const el = scrollRef.current
    if (el && el.scrollTop > AT_EDGE_THRESHOLD) {
      el.scrollBy({ top: -Math.round(el.clientHeight * PEDAL_OVERLAP), behavior: 'smooth' })
      return
    }
    goTo(browseIndex - 1)
  }, [browseIndex, goTo])

  // ── Keyboard / pedal hook ─────────────────────────────────────────────────
  usePerformanceKeyboard({
    onRightSingle:      handleRightSingle,
    onLeftSingle:       handleLeftSingle,
    onRightDouble:      () => goTo(browseIndex + JUMP_SIZE),
    onLeftDouble:       () => goTo(browseIndex - JUMP_SIZE),
    onNext:             () => goTo(browseIndex + 1),
    onPrev:             () => goTo(browseIndex - 1),
    onScrollDown:       handleRightSingle,
    onScrollUp:         handleLeftSingle,
    onExit:             () => navigate(-1),
    onFontIncrease:     increaseFontSize,
    onFontDecrease:     decreaseFontSize,
    onToggleFullscreen: () => {},
  })

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!song) {
    return (
      <div className="flex flex-col flex-1 pb-20">
        <TopBar title="Song not found" showBack />
        <div className="flex-1 flex items-center justify-center text-slate-500">
          This song no longer exists.
        </div>
      </div>
    )
  }

  const meta = [song.artist, song.key, song.language, song.genre].filter(Boolean).join(' · ')
  const hasPrev = browseIds !== null && browseIndex > 0
  const hasNext = browseIds !== null && browseIndex < browseIds.length - 1

  // ── Shared top-bar controls ───────────────────────────────────────────────
  const topBarRight = (
    <div className="flex items-center gap-1">
      <button onClick={toggleFontMode} title="Toggle font mode"
        className={`p-2 rounded-lg transition-colors ${fontMode === 'monospace' ? 'bg-violet-700/40 text-violet-300' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`}>
        {fontMode === 'monospace' ? <Type size={18} /> : <AlignLeft size={18} />}
      </button>
      <button onClick={decreaseFontSize} title="Smaller text"
        className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg font-bold text-sm">A-</button>
      <button onClick={increaseFontSize} title="Larger text"
        className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg font-bold">A+</button>
      <button onClick={decreaseLineHeight} title="Tighter spacing"
        className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor">
          <rect x="2" y="2" width="14" height="2" rx="1"/><rect x="2" y="8" width="14" height="2" rx="1"/><rect x="2" y="14" width="14" height="2" rx="1"/>
        </svg>
      </button>
      <button onClick={increaseLineHeight} title="Looser spacing"
        className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg">
        <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor">
          <rect x="2" y="2" width="14" height="2" rx="1"/><rect x="2" y="9" width="14" height="2" rx="1"/><rect x="2" y="16" width="14" height="2" rx="1"/>
        </svg>
      </button>
      <button onClick={() => navigate(`/songs/${song.id}/edit`)} title="Edit song"
        className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg">
        <Edit2 size={18} />
      </button>
    </div>
  )

  // ── Shared lyrics content ─────────────────────────────────────────────────
  const lyricsContent = (
    <div className="space-y-3 max-w-2xl w-full mx-auto">
      {meta && <p className="text-sm text-slate-400">{meta}</p>}
      {song.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {song.tags.map((tag) => (
            <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">{tag}</span>
          ))}
        </div>
      )}
      <div
        className={`whitespace-pre-wrap text-slate-100 pt-1 ${fontMode === 'monospace' ? 'font-mono' : ''}`}
        style={{ fontSize: `${fontSize}px`, lineHeight }}
      >
        {song.lyrics || <span className="text-slate-500 italic">No lyrics added yet.</span>}
      </div>
      {song.notes && (
        <div className="mt-4 p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Notes (private)</p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{song.notes}</p>
        </div>
      )}
    </div>
  )

  // ── Browse mode: fixed full-screen layout (reliable ref-based scrolling) ──
  if (browseIds) {
    return (
      <div className="fixed inset-0 z-20 bg-slate-900 flex flex-col">
        <TopBar title={song.title} showBack right={topBarRight} />

        {/* Scrollable lyrics area — ref-based, no window dependency */}
        <div
          ref={scrollRef}
          onScroll={updateEdgeState}
          className="flex-1 overflow-y-auto px-4 pt-4"
          style={{ paddingBottom: '7rem', scrollbarWidth: 'none' }}
        >
          {lyricsContent}
        </div>

        {/* Browse bar */}
        <div className="flex items-center justify-between px-4 py-3
                        bg-slate-900 border-t border-slate-800">
          <button
            onClick={() => goTo(browseIndex - 1)}
            disabled={!hasPrev}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-colors
                        disabled:opacity-30 disabled:cursor-not-allowed
                        ${atTop && hasPrev
                          ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50'
                          : 'bg-slate-800 text-slate-300 hover:text-slate-100'}`}
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Prev</span>
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-slate-500 tabular-nums">
              {browseIndex + 1} / {browseIds.length}
            </span>
            {song.key && (
              <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded-full">
                {song.key}
              </span>
            )}
          </div>

          <button
            onClick={() => goTo(browseIndex + 1)}
            disabled={!hasNext}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-colors
                        disabled:opacity-30 disabled:cursor-not-allowed
                        ${atBottom && hasNext
                          ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50'
                          : 'bg-slate-800 text-slate-300 hover:text-slate-100'}`}
          >
            <span className="text-sm font-medium">Next</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // ── Normal mode: standard scrollable page ─────────────────────────────────
  return (
    <div className="flex flex-col flex-1 pb-20">
      <TopBar title={song.title} showBack right={topBarRight} />
      <div className="px-4 pt-4">
        {lyricsContent}
      </div>
    </div>
  )
}
