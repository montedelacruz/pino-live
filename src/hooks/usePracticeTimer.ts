import { useCallback, useEffect, useRef, useState } from 'react'

interface UsePracticeTimerOptions {
  /** When > 0, counts down between songs and calls onCountdownEnd when it hits 0 */
  countdownSeconds: number
  onCountdownEnd?: () => void
}

interface PracticeTimerState {
  /** Total elapsed seconds for the whole session */
  elapsedSeconds:   number
  /** Remaining seconds in the current between-song countdown (0 = not counting down) */
  countdownLeft:    number
  /** True while counting down between songs */
  isCounting:       boolean
  /** Start or resume the session clock */
  startSession:     () => void
  /** Pause the session clock */
  pauseSession:     () => void
  /** Trigger a countdown before the next song */
  startCountdown:   () => void
  /** Abort any in-progress countdown */
  cancelCountdown:  () => void
  /** Reset everything (call between sessions) */
  resetAll:         () => void
}

export function usePracticeTimer({
  countdownSeconds,
  onCountdownEnd,
}: UsePracticeTimerOptions): PracticeTimerState {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [countdownLeft,  setCountdownLeft]  = useState(0)
  const [isCounting,     setIsCounting]     = useState(false)
  const [running,        setRunning]        = useState(false)

  const sessionIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onCountdownEndRef    = useRef(onCountdownEnd)
  onCountdownEndRef.current  = onCountdownEnd

  // ── Session clock ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) {
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current)
      return
    }
    sessionIntervalRef.current = setInterval(() => {
      setElapsedSeconds((n) => n + 1)
    }, 1000)
    return () => { if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current) }
  }, [running])

  // ── Countdown clock ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isCounting) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      return
    }
    countdownIntervalRef.current = setInterval(() => {
      setCountdownLeft((n) => {
        if (n <= 1) {
          clearInterval(countdownIntervalRef.current!)
          setIsCounting(false)
          onCountdownEndRef.current?.()
          return 0
        }
        return n - 1
      })
    }, 1000)
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current) }
  }, [isCounting])

  const startSession = useCallback(() => setRunning(true), [])
  const pauseSession = useCallback(() => setRunning(false), [])

  const startCountdown = useCallback(() => {
    if (countdownSeconds <= 0) {
      onCountdownEndRef.current?.()
      return
    }
    setCountdownLeft(countdownSeconds)
    setIsCounting(true)
  }, [countdownSeconds])

  const cancelCountdown = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    setIsCounting(false)
    setCountdownLeft(0)
  }, [])

  const resetAll = useCallback(() => {
    setRunning(false)
    setElapsedSeconds(0)
    setIsCounting(false)
    setCountdownLeft(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    if (sessionIntervalRef.current)   clearInterval(sessionIntervalRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
  }, [])

  return {
    elapsedSeconds,
    countdownLeft,
    isCounting,
    startSession,
    pauseSession,
    startCountdown,
    cancelCountdown,
    resetAll,
  }
}
