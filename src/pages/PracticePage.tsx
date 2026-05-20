import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight, Shuffle, Type, AlignLeft, Edit2 } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { useRehearsalStore } from '../store/rehearsalStore'
import { useSettingsStore } from '../store/settingsStore'
import { useWakeLock } from '../hooks/useWakeLock'
import { usePerformanceKeyboard } from '../hooks/useKeyboard'
import { useSwipe } from '../hooks/useSwipe'
import type { Song } from '../db/db'

const SCROLL_STEP = 120
const JUMP_SIZE = 10
const AT_EDGE_THRESHOLD = 20

export function PracticePage() {
  const navigate = useNavigate()
  const { songs: allSongs } = useSongStore()
  const { songIds, shuffle } = useRehearsalStore()
  const {
    fontSize, fontMode,
    increaseFontSize, decreaseFontSize, toggleFontMode,
  } = useSettingsStore()

  const songs: Song[] = songIds
    .map((id) => allSongs.find((s) => s.id === id))
    .filter(Boolean) as Song[]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useWakeLock(true)

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }
  }, [])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => {
    resetControlsTimer()
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current) }
  }, [resetControlsTimer])

  const handleExit = useCallback(() => navigate('/rehearsal'), [navigate])

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(songs.length - 1, index))
    setCurrentIndex(clamped)
    lyricsRef.current?.scrollTo({ top: 0 })
    resetControlsTimer()
  }, [songs.length, resetControlsTimer])

  const handleShuffle = useCallback(() => {
    shuffle(allSongs)
    setCurrentIndex(0)
    lyricsRef.current?.scrollTo({ top: 0 })
    resetControlsTimer()
  }, [shuffle, allSongs, resetControlsTimer])

  const handleRightSingle = useCallback(() => {
    const el = lyricsRef.current
    if (el) {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= AT_EDGE_THRESHOLD
      if (!atBottom) { el.scrollBy({ top: SCROLL_STEP, behavior: 'smooth' }); resetControlsTimer(); return }
    }
    goTo(currentIndex + 1)
  }, [currentIndex, goTo, resetControlsTimer])

  const handleLeftSingle = useCallback(() => {
    const el = lyricsRef.current
    if (el && el.scrollTop > AT_EDGE_THRESHOLD) {
      el.scrollBy({ top: -SCROLL_STEP, behavior: 'smooth' }); resetControlsTimer(); return
    }
    goTo(currentIndex - 1)
  }, [currentIndex, goTo, resetControlsTimer])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {})
    else document.exitFullscreen?.().catch(() => {})
  }, [])

  const swipeHandlers = useSwipe({
    onSwipeLeft:  () => goTo(currentIndex + 1),
    onSwipeRight: () => goTo(currentIndex - 1),
  })

  usePerformanceKeyboard({
    onRightSingle: handleRightSingle,
    onLeftSingle: handleLeftSingle,
    onRightDouble: () => { goTo(currentIndex + JUMP_SIZE); resetControlsTimer() },
    onLeftDouble:  () => { goTo(currentIndex - JUMP_SIZE); resetControlsTimer() },
    onNext:    () => goTo(currentIndex + 1),
    onPrev:    () => goTo(currentIndex - 1),
    onScrollDown: () => lyricsRef.current?.scrollBy({ top: SCROLL_STEP, behavior: 'smooth' }),
    onScrollUp:   () => lyricsRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: 'smooth' }),
    onExit: handleExit,
    onFontIncrease: () => { increaseFontSize(); resetControlsTimer() },
    onFontDecrease: () => { decreaseFontSize(); resetControlsTimer() },
    onToggleFullscreen: toggleFullscreen,
  })

  if (songs.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <p className="text-xl">No songs to practice.</p>
        <button onClick={handleExit} className="px-6 py-3 bg-slate-800 rounded-xl text-slate-200 hover:bg-slate-700 transition-colors">
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
      onTouchStart={(e) => { resetControlsTimer(); swipeHandlers.onTouchStart(e) }}
      onTouchEnd={swipeHandlers.onTouchEnd}
      onClick={resetControlsTimer}
    >
      {/* Top bar */}
      <div className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between
                       px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent
                       transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* Counter + rehearsal badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-700/60 text-emerald-300 rounded-full">
            Rehearsal
          </span>
          <span className="text-slate-400 text-sm tabular-nums">
            {currentIndex + 1} / {songs.length}
          </span>
        </div>

        {/* Song title */}
        <div className="text-center flex-1 mx-3 min-w-0">
          <p className="text-slate-200 font-semibold truncate">{song.title}</p>
          {song.artist && <p className="text-slate-400 text-sm truncate">{song.artist}</p>}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button onClick={handleShuffle} title="Re-shuffle"
            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded-lg transition-colors">
            <Shuffle size={18} />
          </button>
          <button onClick={toggleFontMode}
            className={`p-2 rounded-lg transition-colors ${fontMode === 'monospace' ? 'bg-violet-700/50 text-violet-300' : 'text-slate-400 hover:text-slate-100'}`}>
            {fontMode === 'monospace' ? <Type size={18} /> : <AlignLeft size={18} />}
          </button>
          <button onClick={decreaseFontSize} className="p-2 text-slate-400 hover:text-slate-100 rounded-lg text-sm font-bold">A-</button>
          <button onClick={increaseFontSize} className="p-2 text-slate-400 hover:text-slate-100 rounded-lg font-bold">A+</button>
          <button onClick={() => navigate(`/songs/${song.id}/edit`)}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg transition-colors"
            title="Edit song">
            <Edit2 size={18} />
          </button>
          <button onClick={handleExit} className="p-2 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Lyrics */}
      <div ref={lyricsRef} className="flex-1 overflow-y-auto px-6 pt-16 pb-24" style={{ scrollbarWidth: 'none' }}>
        <div
          className={`whitespace-pre-wrap leading-relaxed text-slate-100 max-w-3xl mx-auto ${fontMode === 'monospace' ? 'font-mono' : ''}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {song.lyrics || <span className="text-slate-600 italic">No lyrics.</span>}
        </div>
        <div className="h-16" />
      </div>

      {/* Bottom nav */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between
                       px-4 py-4 bg-gradient-to-t from-slate-950/90 to-transparent
                       transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
          className="flex items-center gap-1 px-4 py-3 rounded-xl bg-slate-800/80
                     text-slate-300 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Prev</span>
        </button>

        {song.key && (
          <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700 rounded-full text-slate-300 text-sm font-mono">
            {song.key}
          </span>
        )}

        <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === songs.length - 1}
          className="flex items-center gap-1 px-4 py-3 rounded-xl bg-slate-800/80
                     text-slate-300 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <span className="text-sm font-medium">Next</span>
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
