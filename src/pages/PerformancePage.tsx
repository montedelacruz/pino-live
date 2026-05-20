import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, Type, AlignLeft } from 'lucide-react'
import { useSetlistStore } from '../store/setlistStore'
import { useSongStore } from '../store/songStore'
import { useSettingsStore } from '../store/settingsStore'
import { useWakeLock } from '../hooks/useWakeLock'
import { usePerformanceKeyboard } from '../hooks/useKeyboard'
import type { Song } from '../db/db'

const SCROLL_STEP = 120       // px per arrow/scroll action
const JUMP_SIZE   = 10        // songs per double-click
const AT_EDGE_THRESHOLD = 20  // px — how close to top/bottom counts as "at edge"

export function PerformancePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { setlists } = useSetlistStore()
  const { songs: allSongs } = useSongStore()
  const {
    fontSize,
    lineHeight,
    fontMode,
    increaseFontSize,
    decreaseFontSize,
    increaseLineHeight,
    decreaseLineHeight,
    toggleFontMode,
  } = useSettingsStore()

  const setlist = setlists.find((sl) => sl.id === id)

  const songs: Song[] = (setlist?.songIds ?? [])
    .map((sid) => allSongs.find((s) => s.id === sid))
    .filter(Boolean) as Song[]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep screen awake during performance
  useWakeLock(true)

  // Request fullscreen on mount
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [])

  // Auto-hide controls after 3s of inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => {
    resetControlsTimer()
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current) }
  }, [resetControlsTimer])

  const handleExit = useCallback(() => {
    navigate(-1)
  }, [navigate])

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(songs.length - 1, index))
    setCurrentIndex(clamped)
    // Scroll lyrics back to top on song change
    lyricsRef.current?.scrollTo({ top: 0 })
    resetControlsTimer()
  }, [songs.length, resetControlsTimer])

  const scrollLyrics = useCallback((direction: 'up' | 'down') => {
    lyricsRef.current?.scrollBy({
      top: direction === 'down' ? SCROLL_STEP : -SCROLL_STEP,
      behavior: 'smooth',
    })
    resetControlsTimer()
  }, [resetControlsTimer])

  /**
   * Context-aware right pedal (single press):
   * - If lyrics are scrollable and NOT at the bottom → scroll down
   * - If at the bottom (or song fits on screen) → go to next song
   */
  const handleRightSingle = useCallback(() => {
    const el = lyricsRef.current
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= AT_EDGE_THRESHOLD
      if (!atBottom) {
        el.scrollBy({ top: SCROLL_STEP, behavior: 'smooth' })
        resetControlsTimer()
        return
      }
    }
    goTo(currentIndex + 1)
  }, [currentIndex, goTo, resetControlsTimer])

  /**
   * Context-aware left pedal (single press):
   * - If lyrics are scrollable and NOT at the top → scroll up
   * - If at the top → go to previous song
   */
  const handleLeftSingle = useCallback(() => {
    const el = lyricsRef.current
    if (el && el.scrollTop > AT_EDGE_THRESHOLD) {
      el.scrollBy({ top: -SCROLL_STEP, behavior: 'smooth' })
      resetControlsTimer()
      return
    }
    goTo(currentIndex - 1)
  }, [currentIndex, goTo, resetControlsTimer])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [])

  // Keyboard / foot pedal handlers
  usePerformanceKeyboard({
    // Pedal — double-click aware
    onRightSingle: handleRightSingle,
    onLeftSingle:  handleLeftSingle,
    onRightDouble: () => { goTo(currentIndex + JUMP_SIZE); resetControlsTimer() },
    onLeftDouble:  () => { goTo(currentIndex - JUMP_SIZE); resetControlsTimer() },
    // Keyboard — immediate
    onNext:             () => goTo(currentIndex + 1),
    onPrev:             () => goTo(currentIndex - 1),
    onScrollDown:       () => scrollLyrics('down'),
    onScrollUp:         () => scrollLyrics('up'),
    onExit:             handleExit,
    onFontIncrease:     () => { increaseFontSize(); resetControlsTimer() },
    onFontDecrease:     () => { decreaseFontSize(); resetControlsTimer() },
    onToggleFullscreen: toggleFullscreen,
  })

  // Guard: setlist not found or empty
  if (!setlist || songs.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <p className="text-xl">No songs in this setlist.</p>
        <button
          onClick={handleExit}
          className="px-6 py-3 bg-slate-800 rounded-xl text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  const song = songs[currentIndex]

  return (
    <div
      className="fixed inset-0 bg-slate-950 flex flex-col select-none"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      {/* ── Top bar (auto-hides) ── */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between
                    px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent
                    transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Song counter */}
        <span className="text-slate-400 text-sm font-medium tabular-nums">
          {currentIndex + 1} / {songs.length}
        </span>

        {/* Song title + artist */}
        <div className="text-center flex-1 mx-4 min-w-0">
          <p className="text-slate-200 font-semibold truncate">{song.title}</p>
          {song.artist && (
            <p className="text-slate-400 text-sm truncate">{song.artist}</p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFontMode}
            title={fontMode === 'monospace' ? 'Normal font' : 'Chord/mono font'}
            className={`p-2 rounded-lg transition-colors ${
              fontMode === 'monospace'
                ? 'bg-violet-700/50 text-violet-300'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {fontMode === 'monospace' ? <Type size={18} /> : <AlignLeft size={18} />}
          </button>

          {/* Font size */}
          <button
            onClick={decreaseFontSize}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg text-sm font-bold"
            title="Smaller text (,)"
          >
            A-
          </button>
          <button
            onClick={increaseFontSize}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg font-bold"
            title="Larger text (.)"
          >
            A+
          </button>

          {/* Divider */}
          <span className="w-px h-5 bg-slate-700 mx-1" />

          {/* Line spacing */}
          <button
            onClick={decreaseLineHeight}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg"
            title="Tighter line spacing"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect x="2" y="2" width="14" height="2" rx="1"/>
              <rect x="2" y="8" width="14" height="2" rx="1"/>
              <rect x="2" y="14" width="14" height="2" rx="1"/>
              <path d="M15 5.5L16.5 4L15 2.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12.5L16.5 11L15 9.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={increaseLineHeight}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg"
            title="Looser line spacing"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect x="2" y="2" width="14" height="2" rx="1"/>
              <rect x="2" y="9" width="14" height="2" rx="1"/>
              <rect x="2" y="16" width="14" height="2" rx="1"/>
              <path d="M15 6L16.5 7.5L15 9" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 13L16.5 11.5L15 10" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button
            onClick={handleExit}
            className="p-2 text-slate-400 hover:text-red-400 rounded-lg transition-colors ml-1"
            title="Exit (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── Lyrics ── */}
      <div
        ref={lyricsRef}
        className="flex-1 overflow-y-auto px-6 pt-16 pb-24"
        style={{ scrollbarWidth: 'none' }}
      >
        <div
          className={`whitespace-pre-wrap text-slate-100 max-w-3xl mx-auto
                      ${fontMode === 'monospace' ? 'font-mono' : ''}`}
          style={{ fontSize: `${fontSize}px`, lineHeight }}
        >
          {song.lyrics || (
            <span className="text-slate-600 italic">No lyrics.</span>
          )}
        </div>
        {/* Bottom padding so last line is fully readable above the nav */}
        <div className="h-16" />
      </div>

      {/* ── Bottom nav (auto-hides) ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between
                    px-4 py-4 bg-gradient-to-t from-slate-950/90 to-transparent
                    transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Prev */}
        <button
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-4 py-3 rounded-xl bg-slate-800/80
                     text-slate-300 hover:text-slate-100 disabled:opacity-30
                     disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Prev</span>
        </button>

        {/* Key badge */}
        {song.key && (
          <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700
                           rounded-full text-slate-300 text-sm font-mono">
            {song.key}
          </span>
        )}

        {/* Next */}
        <button
          onClick={() => goTo(currentIndex + 1)}
          disabled={currentIndex === songs.length - 1}
          className="flex items-center gap-1 px-4 py-3 rounded-xl bg-slate-800/80
                     text-slate-300 hover:text-slate-100 disabled:opacity-30
                     disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-sm font-medium">Next</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
