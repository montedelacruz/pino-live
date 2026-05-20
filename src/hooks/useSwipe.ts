import { useRef, useCallback } from 'react'

/**
 * Detects horizontal swipe gestures on a touch screen.
 * Returns onTouchStart / onTouchEnd handlers to spread onto any element.
 *
 * A gesture is treated as a horizontal swipe only when:
 *  • the horizontal travel exceeds `minDistance` (default 60 px)
 *  • the horizontal travel is at least 1.5× the vertical travel
 *    (so ordinary vertical scrolling is never accidentally triggered)
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 60,
}: {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  minDistance?: number
}) {
  const start = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!start.current) return
    const dx = e.changedTouches[0].clientX - start.current.x
    const dy = e.changedTouches[0].clientY - start.current.y
    start.current = null

    // Must travel far enough horizontally
    if (Math.abs(dx) < minDistance) return
    // Horizontal travel must dominate (not a diagonal/vertical scroll)
    if (Math.abs(dy) > Math.abs(dx) / 1.5) return

    if (dx < 0) onSwipeLeft?.()
    else         onSwipeRight?.()
  }, [onSwipeLeft, onSwipeRight, minDistance])

  return { onTouchStart, onTouchEnd }
}
