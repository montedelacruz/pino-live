import { useEffect, useRef } from 'react'

export interface PerformanceKeyMap {
  // Pedal keys — subject to double-click detection (300 ms window)
  onRightSingle: () => void   // PageDown single  → scroll down / next song
  onLeftSingle: () => void    // PageUp single   → scroll up / prev song
  onRightDouble: () => void   // PageDown double → jump +10 songs
  onLeftDouble: () => void    // PageUp double   → jump -10 songs
  // Keyboard-only shortcuts — immediate, no delay
  onNext: () => void          // ArrowRight
  onPrev: () => void          // ArrowLeft
  onScrollDown: () => void    // ArrowDown
  onScrollUp: () => void      // ArrowUp
  onExit: () => void          // Escape
  onFontIncrease: () => void  // + / =
  onFontDecrease: () => void  // -
  onToggleFullscreen: () => void // f / F
}

const DOUBLE_CLICK_MS = 300

/**
 * Keyboard / foot-pedal handler for Performance Mode.
 *
 * Pedal mapping (PageDown = right pedal, PageUp = left pedal):
 *   Single press  → context-aware scroll or song change
 *   Double press  → jump ±10 songs
 *
 * Keyboard shortcuts (immediate):
 *   ArrowRight / ArrowLeft → next / previous song
 *   ArrowDown  / ArrowUp   → scroll lyrics
 *   Escape                 → exit
 *   + / -                  → font size
 *   f                      → fullscreen toggle
 */
export function usePerformanceKeyboard(handlers: PerformanceKeyMap) {
  // Always keep a ref to the latest handlers so the event listener
  // never becomes stale without needing to re-register.
  const handlersRef = useRef(handlers)
  useEffect(() => { handlersRef.current = handlers })

  useEffect(() => {
    // Pending single-click timers for each pedal key
    let rightTimer: ReturnType<typeof setTimeout> | null = null
    let leftTimer: ReturnType<typeof setTimeout> | null = null

    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {

        // ── Right pedal: PageDown or ArrowDown — double-click aware ─────
        case 'PageDown':
        case 'ArrowDown': {
          e.preventDefault()
          if (rightTimer) {
            clearTimeout(rightTimer)
            rightTimer = null
            handlersRef.current.onRightDouble()
          } else {
            rightTimer = setTimeout(() => {
              rightTimer = null
              handlersRef.current.onRightSingle()
            }, DOUBLE_CLICK_MS)
          }
          break
        }

        // ── Left pedal: PageUp or ArrowUp — double-click aware ───────────
        case 'PageUp':
        case 'ArrowUp': {
          e.preventDefault()
          if (leftTimer) {
            clearTimeout(leftTimer)
            leftTimer = null
            handlersRef.current.onLeftDouble()
          } else {
            leftTimer = setTimeout(() => {
              leftTimer = null
              handlersRef.current.onLeftSingle()
            }, DOUBLE_CLICK_MS)
          }
          break
        }

        // ── Keyboard shortcuts — immediate ───────────────────────────────
        case 'ArrowRight':
          e.preventDefault()
          handlersRef.current.onNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlersRef.current.onPrev()
          break
        case 'Escape':
          e.preventDefault()
          handlersRef.current.onExit()
          break
        case '+':
        case '=':
          handlersRef.current.onFontIncrease()
          break
        case '-':
          handlersRef.current.onFontDecrease()
          break
        case 'f':
        case 'F':
          handlersRef.current.onToggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handle)
    return () => {
      window.removeEventListener('keydown', handle)
      // Clean up any pending timers on unmount
      if (rightTimer) clearTimeout(rightTimer)
      if (leftTimer) clearTimeout(leftTimer)
    }
  }, []) // registers once — latest handlers always read via handlersRef
}
