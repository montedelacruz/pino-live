import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, ChevronLeft, ChevronRight, Type, AlignLeft, Edit2,
  CheckCircle2, RotateCcw, Activity,
} from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { useRehearsalStore } from '../store/rehearsalStore'
import { usePracticeHistoryStore } from '../store/practiceHistoryStore'
import { useSettingsStore } from '../store/settingsStore'
import { useWakeLock } from '../hooks/useWakeLock'
import { usePerformanceKeyboard } from '../hooks/useKeyboard'
import { useSwipe } from '../hooks/useSwipe'
import { usePracticeTimer } from '../hooks/usePracticeTimer'
import { LyricsRenderer } from '../components/LyricsRenderer'
import { PracticeResultBar } from '../components/PracticeResultBar'
import { MetronomeControl } from '../components/MetronomeControl'
import type { Song, PracticeEntry } from '../db/db'

const SCROLL_STEP       = 120
const JUMP_SIZE         = 10
const AT_EDGE_THRESHOLD = 20

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Session-complete overlay ───────────────────────────────────────────────────
function SessionComplete({
  results, songs, onRestart, onExit,
}: {
  results: Record<string, PracticeEntry['result']>
  songs:   Song[]
  onRestart: () => void
  onExit:    () => void
}) {
  const nailed    = Object.values(results).filter((r) => r === 'nailed').length
  const needsWork = Object.values(results).filter((r) => r === 'needs_work').length
  const skipped   = Object.values(results).filter((r) => r === 'skipped').length

  return (
    <div className="fixed inset-0 bg-slate-950/95 flex flex-col items-center justify-center gap-6 px-8 text-center z-50">
      <CheckCircle2 size={64} className="text-emerald-400" />
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Session complete!</h2>
        <p className="text-slate-400 text-sm">{songs.length} songs practiced</p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        <div className="flex flex-col items-center gap-1 p-3 bg-emerald-900/30 border border-emerald-700/40 rounded-xl">
          <span className="text-2xl font-bold text-emerald-300">{nailed}</span>
          <span className="text-xs text-slate-400">Nailed</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 bg-amber-900/30 border border-amber-700/40 rounded-xl">
          <span className="text-2xl font-bold text-amber-300">{needsWork}</span>
          <span className="text-xs text-slate-400">Needs work</span>
        </div>
        <div className="flex flex-col items-center gap-1 p-3 bg-slate-800 border border-slate-700 rounded-xl">
          <span className="text-2xl font-bold text-slate-300">{skipped}</span>
          <span className="text-xs text-slate-400">Skipped</span>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onRestart}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                     bg-slate-800 border border-slate-700 text-slate-200
                     hover:border-slate-500 transition-colors text-sm font-medium"
        >
          <RotateCcw size={16} />
          Practice again
        </button>
        <button
          onClick={onExit}
          className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500
                     text-white text-sm font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ── Countdown overlay ─────────────────────────────────────────────────────────
function CountdownOverlay({ seconds }: { seconds: number }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div className="w-24 h-24 rounded-full bg-slate-900/90 border-2 border-emerald-500
                      flex items-center justify-center shadow-xl shadow-emerald-900/40">
        <span className="text-5xl font-bold text-emerald-300 tabular-nums">{seconds}</span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function PracticePage() {
  const navigate   = useNavigate()
  const { songs: allSongs } = useSongStore()
  const { songIds, sessionId, config } = useRehearsalStore()
  const { addEntry }         = usePracticeHistoryStore()
  const {
    fontSize, fontMode,
    increaseFontSize, decreaseFontSize, toggleFontMode,
  } = useSettingsStore()

  const songs: Song[] = songIds
    .map((id) => allSongs.find((s) => s.id === id))
    .filter(Boolean) as Song[]

  const [currentIndex, setCurrentIndex] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [showMetronome, setShowMetronome] = useState(false)
  const [results, setResults] = useState<Record<string, PracticeEntry['result']>>({})
  const [sessionDone, setSessionDone] = useState(false)

  const lyricsRef     = useRef<HTMLDivElement>(null)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useWakeLock(true)

  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {})
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }
  }, [])

  // ── Timer ──────────────────────────────────────────────────────────────────
  const handleCountdownEnd = useCallback(() => {
    // Auto-advance to next index after countdown
    setCurrentIndex((prev) => {
      const next = prev + 1
      if (next >= songs.length) {
        setSessionDone(true)
        return prev
      }
      lyricsRef.current?.scrollTo({ top: 0 })
      return next
    })
  }, [songs.length])

  const {
    elapsedSeconds, countdownLeft, isCounting,
    startSession, startCountdown, cancelCountdown, resetAll: resetTimer,
  } = usePracticeTimer({ countdownSeconds: config.countdownSeconds, onCountdownEnd: handleCountdownEnd })

  // Start session clock when we land on the page
  useEffect(() => {
    startSession()
    return resetTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]) // re-run when session is rebuilt

  // ── Controls hide timer ────────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  useEffect(() => {
    resetControlsTimer()
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current) }
  }, [resetControlsTimer])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(songs.length - 1, index))
    setCurrentIndex(clamped)
    lyricsRef.current?.scrollTo({ top: 0 })
    resetControlsTimer()
  }, [songs.length, resetControlsTimer])

  const advanceAfterResult = useCallback((nextIndex: number) => {
    if (nextIndex >= songs.length) {
      setSessionDone(true)
      return
    }
    if (config.countdownSeconds > 0) {
      // Show countdown overlay, then auto-advance
      startCountdown()
      // Visually move to next index so user can peek at the next song during countdown
      setCurrentIndex(nextIndex)
      lyricsRef.current?.scrollTo({ top: 0 })
    } else {
      setCurrentIndex(nextIndex)
      lyricsRef.current?.scrollTo({ top: 0 })
    }
    resetControlsTimer()
  }, [songs.length, config.countdownSeconds, startCountdown, resetControlsTimer])

  // ── Result handlers ────────────────────────────────────────────────────────
  const recordResult = useCallback(async (result: PracticeEntry['result']) => {
    const song = songs[currentIndex]
    if (!song) return

    setResults((prev) => ({ ...prev, [song.id]: result }))
    await addEntry({
      songId:      song.id,
      sessionId,
      result,
      practicedAt: Date.now(),
    })

    advanceAfterResult(currentIndex + 1)
  }, [songs, currentIndex, sessionId, addEntry, advanceAfterResult])

  const handleNailed    = useCallback(() => recordResult('nailed'),     [recordResult])
  const handleNeedsWork = useCallback(() => recordResult('needs_work'), [recordResult])
  const handleSkip      = useCallback(() => recordResult('skipped'),    [recordResult])

  const handleExit = useCallback(() => navigate('/rehearsal'), [navigate])

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
    onLeftSingle:  handleLeftSingle,
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

  // ── Empty state ────────────────────────────────────────────────────────────
  if (songs.length === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-400">
        <p className="text-xl">No songs to practice.</p>
        <button onClick={handleExit}
          className="px-6 py-3 bg-slate-800 rounded-xl text-slate-200 hover:bg-slate-700 transition-colors">
          Go Back
        </button>
      </div>
    )
  }

  const song = songs[currentIndex]
  const songResult = results[song.id]
  const progress   = Object.keys(results).length

  // ── Session complete ───────────────────────────────────────────────────────
  if (sessionDone) {
    return (
      <SessionComplete
        results={results}
        songs={songs}
        onRestart={() => { setResults({}); setCurrentIndex(0); setSessionDone(false); resetTimer(); startSession() }}
        onExit={handleExit}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950 flex flex-col select-none"
      onMouseMove={resetControlsTimer}
      onTouchStart={(e) => { resetControlsTimer(); swipeHandlers.onTouchStart(e) }}
      onTouchEnd={swipeHandlers.onTouchEnd}
      onClick={resetControlsTimer}
    >

      {/* Countdown overlay */}
      {isCounting && <CountdownOverlay seconds={countdownLeft} />}

      {/* ── Top bar ── */}
      <div className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between
                       px-4 py-3 bg-gradient-to-b from-slate-950/90 to-transparent
                       transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* Left: counter + timer */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-700/60 text-emerald-300 rounded-full">
            {currentIndex + 1} / {songs.length}
          </span>
          <span className="text-slate-500 text-xs tabular-nums">{formatTime(elapsedSeconds)}</span>
          {progress > 0 && (
            <span className="text-xs text-slate-500 tabular-nums">{progress} done</span>
          )}
        </div>

        {/* Centre: title */}
        <div className="text-center flex-1 mx-3 min-w-0">
          <p className="text-slate-200 font-semibold truncate text-sm">{song.title}</p>
          {song.artist && <p className="text-slate-400 text-xs truncate">{song.artist}</p>}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => setShowMetronome((v) => !v)}
            className={`p-2 rounded-lg transition-colors
                        ${showMetronome ? 'bg-emerald-700/40 text-emerald-300' : 'text-slate-500 hover:text-slate-200'}`}
            title="Metronome">
            <Activity size={17} />
          </button>
          <button onClick={toggleFontMode}
            className={`p-2 rounded-lg transition-colors ${fontMode === 'monospace' ? 'bg-violet-700/50 text-violet-300' : 'text-slate-400 hover:text-slate-100'}`}>
            {fontMode === 'monospace' ? <Type size={17} /> : <AlignLeft size={17} />}
          </button>
          <button onClick={decreaseFontSize} className="p-2 text-slate-400 hover:text-slate-100 rounded-lg text-sm font-bold">A-</button>
          <button onClick={increaseFontSize} className="p-2 text-slate-400 hover:text-slate-100 rounded-lg font-bold">A+</button>
          <button onClick={() => navigate(`/songs/${song.id}/edit`)}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg transition-colors" title="Edit song">
            <Edit2 size={17} />
          </button>
          <button onClick={handleExit} className="p-2 text-slate-400 hover:text-red-400 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Metronome strip */}
      {showMetronome && (
        <div className="absolute top-14 left-0 right-0 z-20 flex justify-center py-2 px-4
                        bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
          <MetronomeControl initialBpm={100} />
        </div>
      )}

      {/* ── Progress bar ── */}
      {songs.length > 1 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 z-30">
          <div
            className="h-full bg-emerald-500/60 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / songs.length) * 100}%` }}
          />
        </div>
      )}

      {/* ── Lyrics ── */}
      <div
        ref={lyricsRef}
        className="flex-1 overflow-y-auto px-6 pb-4"
        style={{
          paddingTop: showMetronome ? '108px' : '68px',
          scrollbarWidth: 'none',
        }}
      >
        {/* Key badge + needs-work indicator */}
        <div className="flex items-center gap-2 mb-3 max-w-3xl mx-auto">
          {song.key && (
            <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-slate-300 text-xs font-mono">
              {song.key}
            </span>
          )}
          {(song.needsWork || songResult === 'needs_work') && (
            <span className="px-2 py-0.5 bg-amber-900/50 border border-amber-700/50 text-amber-300 text-[10px] rounded-full">
              needs work
            </span>
          )}
          {songResult === 'nailed' && (
            <span className="px-2 py-0.5 bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 text-[10px] rounded-full">
              ✓ nailed
            </span>
          )}
        </div>

        <div
          className={`whitespace-pre-wrap leading-relaxed text-slate-100 max-w-3xl mx-auto ${fontMode === 'monospace' ? 'font-mono' : ''}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          <LyricsRenderer
            lyrics={song.lyrics}
            showChords={true}
            fallback={<span className="text-slate-600 italic">No lyrics.</span>}
          />
        </div>
        <div className="h-8" />
      </div>

      {/* ── Result bar ── */}
      <div className={`transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <PracticeResultBar
          onNailed={handleNailed}
          onNeedsWork={handleNeedsWork}
          onSkip={handleSkip}
        />
      </div>

      {/* ── Bottom nav (prev/next) ── */}
      <div className={`absolute z-20 flex items-center justify-between
                       px-4 py-3
                       transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
           style={{ bottom: '72px', left: 0, right: 0 }}>
        <button
          onClick={() => { cancelCountdown(); goTo(currentIndex - 1) }}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800/80
                     text-slate-300 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm">
          <ChevronLeft size={18} />
          Prev
        </button>
        <button
          onClick={() => { cancelCountdown(); goTo(currentIndex + 1) }}
          disabled={currentIndex === songs.length - 1}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800/80
                     text-slate-300 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm">
          Next
          <ChevronRight size={18} />
        </button>
      </div>

    </div>
  )
}
