import { useCallback, useEffect, useRef, useState } from 'react'

// Lookahead scheduler constants
const SCHEDULE_AHEAD_SEC = 0.1   // how far ahead to schedule (sec)
const LOOKAHEAD_MS       = 25    // how often to call scheduler (ms)

interface UseMetronomeOptions {
  bpm:      number
  enabled:  boolean
  accentFirstBeat?: boolean
  beatsPerBar?:     number  // default 4
}

export function useMetronome({
  bpm,
  enabled,
  accentFirstBeat = true,
  beatsPerBar     = 4,
}: UseMetronomeOptions) {
  const audioCtxRef   = useRef<AudioContext | null>(null)
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextBeatRef   = useRef<number>(0)
  const beatCountRef  = useRef<number>(0)
  const [beat, setBeat] = useState(0) // 0-indexed beat in bar for UI

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  const scheduleClick = useCallback((audioCtx: AudioContext, time: number, accent: boolean) => {
    const osc  = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.frequency.value = accent ? 1100 : 880
    gain.gain.setValueAtTime(accent ? 0.7 : 0.4, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05)

    osc.start(time)
    osc.stop(time + 0.06)
  }, [])

  const scheduler = useCallback(() => {
    const ctx   = getCtx()
    const ahead = ctx.currentTime + SCHEDULE_AHEAD_SEC

    while (nextBeatRef.current < ahead) {
      const beatInBar = beatCountRef.current % beatsPerBar
      scheduleClick(ctx, nextBeatRef.current, accentFirstBeat && beatInBar === 0)

      // Schedule UI update slightly before the beat
      const delay = Math.max(0, (nextBeatRef.current - ctx.currentTime) * 1000)
      const localBeat = beatInBar
      setTimeout(() => setBeat(localBeat), delay)

      nextBeatRef.current += 60 / bpm
      beatCountRef.current++
    }
  }, [bpm, beatsPerBar, accentFirstBeat, scheduleClick, getCtx])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setBeat(0)
      return
    }

    const ctx        = getCtx()
    // Resume if suspended (required after user gesture)
    if (ctx.state === 'suspended') ctx.resume()

    nextBeatRef.current  = ctx.currentTime + 0.05
    beatCountRef.current = 0
    scheduler()
    intervalRef.current = setInterval(scheduler, LOOKAHEAD_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [enabled, scheduler, getCtx])

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close()
    }
  }, [])

  return { beat }
}
