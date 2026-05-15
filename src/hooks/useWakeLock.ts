import { useEffect, useRef } from 'react'

/**
 * Requests a screen wake lock while the component is mounted.
 * Silently skips if the Wake Lock API is unavailable (older browsers).
 */
export function useWakeLock(enabled: boolean = true) {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (!('wakeLock' in navigator)) return

    let released = false

    navigator.wakeLock.request('screen').then((lock) => {
      if (released) {
        lock.release()
      } else {
        lockRef.current = lock
      }
    }).catch(() => {
      // Wake lock not granted — silently ignore (e.g. document hidden)
    })

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        navigator.wakeLock.request('screen').then((lock) => {
          lockRef.current = lock
        }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      released = true
      document.removeEventListener('visibilitychange', handleVisibility)
      lockRef.current?.release()
      lockRef.current = null
    }
  }, [enabled])
}
