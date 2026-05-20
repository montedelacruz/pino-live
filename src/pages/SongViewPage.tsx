import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { Edit2, Type, AlignLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { TopBar } from '../components/TopBar'
import { useSongStore } from '../store/songStore'
import { useSettingsStore } from '../store/settingsStore'
import { usePerformanceKeyboard } from '../hooks/useKeyboard'

const AT_EDGE_THRESHOLD = 20  // px
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

  // ── Scroll-edge tracking (uses window, since this is a normal page) ───────
  const [atTop,    setAtTop]    = useState(true)
  const [atBottom, setAtBottom] = useState(false)

  const updateEdgeState = useCallback(() => {
    const scrollTop    = window.scrollY
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = window.innerHeight
    setAtTop(scrollTop <= AT_EDGE_THRESHOLD)
    setAtBottom(scrollHeight - scrollTop - clientHeight <= AT_EDGE_THRESHOLD)
  }, [])

  // Listen to page scroll
  useEffect(() => {
    window.addEventListener('scroll', updateEdgeState, { passive: true })
    return () => window.removeEventListener('scroll', updateEdgeState)
  }, [updateEdgeState])

  // Reset scroll to top and re-evaluate edges whenever the song changes
  useEffect(() => {
    window.scrollTo({ top: 0 })
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
    const scrollTop    = window.scrollY
    const scrollHeight = document.documentElement.scrollHeight
    const clientHeight = window.innerHeight
    const isAtBottom   = scrollHeight - scrollTop - clientHeight <= AT_EDGE_THRESHOLD
    if (!isAtBottom) {
      window.scrollBy({ top: Math.round(clientHeight * PEDAL_OVERLAP), behavior: 'smooth' })
      return
    }
    goTo(browseIndex + 1)
  }, [browseIndex, goTo])

  const handleLeftSingle = useCallback(() => {
    const isAtTop = window.scrollY <= AT_EDGE_THRESHOLD
    if (!isAtTop) {
      window.scrollBy({ top: -Math.round(window.innerHeight * PEDAL_OVERLAP), behavior: 'smooth' })
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

  // ── Guards ────────────────────────────────────────────────────────────────
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

  const meta = [song.artist, song.key, song.language, song.genre]
    .filter(Boolean)
    .join(' · ')

  const hasPrev = browseIds !== null && browseIndex > 0
  const hasNext = browseIds !== null && browseIndex < browseIds.length - 1

  return (
    // Extra bottom padding when browse bar is visible
    <div className={`flex flex-col flex-1 ${browseIds ? 'pb-36' : 'pb-20'}`}>
      <TopBar
        title={song.title}
        showBack
        right={
          <div className="flex items-center gap-1">
            {/* Font mode toggle */}
            <button
              onClick={toggleFontMode}
              title={fontMode === 'normal' ? 'Switch to chord/monospace mode' : 'Switch to normal mode'}
              className={`p-2 rounded-lg transition-colors ${
                fontMode === 'monospace'
                  ? 'bg-violet-700/40 text-violet-300'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              {fontMode === 'monospace' ? <Type size={18} /> : <AlignLeft size={18} />}
            </button>

            {/* Font size */}
            <button
              onClick={decreaseFontSize}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors font-bold text-sm"
              title="Decrease font size"
            >A-</button>
            <button
              onClick={increaseFontSize}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors font-bold"
              title="Increase font size"
            >A+</button>

            {/* Line spacing */}
            <button
              onClick={decreaseLineHeight}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Tighter line spacing"
            >
              <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor">
                <rect x="2" y="2" width="14" height="2" rx="1"/>
                <rect x="2" y="8" width="14" height="2" rx="1"/>
                <rect x="2" y="14" width="14" height="2" rx="1"/>
              </svg>
            </button>
            <button
              onClick={increaseLineHeight}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Looser line spacing"
            >
              <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor">
                <rect x="2" y="2" width="14" height="2" rx="1"/>
                <rect x="2" y="9" width="14" height="2" rx="1"/>
                <rect x="2" y="16" width="14" height="2" rx="1"/>
              </svg>
            </button>

            {/* Edit */}
            <button
              onClick={() => navigate(`/songs/${song.id}/edit`)}
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit song"
            >
              <Edit2 size={18} />
            </button>
          </div>
        }
      />

      <div className="px-4 pt-4 space-y-3 max-w-2xl w-full mx-auto">
        {/* Meta */}
        {meta && <p className="text-sm text-slate-400">{meta}</p>}
        {song.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {song.tags.map((tag) => (
              <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Lyrics */}
        <div
          className={`whitespace-pre-wrap text-slate-100 pt-2 ${fontMode === 'monospace' ? 'font-mono' : ''}`}
          style={{ fontSize: `${fontSize}px`, lineHeight }}
        >
          {song.lyrics || <span className="text-slate-500 italic">No lyrics added yet.</span>}
        </div>

        {/* Notes */}
        {song.notes && (
          <div className="mt-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Notes (private)</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{song.notes}</p>
          </div>
        )}
      </div>

      {/* ── Browse bar — only shown when opened from the library ── */}
      {browseIds && (
        <div className="fixed bottom-16 left-0 right-0 z-20
                        flex items-center justify-between px-4 py-3
                        bg-slate-950/95 border-t border-slate-800 backdrop-blur-sm">
          {/* Prev */}
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

          {/* Counter + song key */}
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

          {/* Next */}
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
      )}
    </div>
  )
}
