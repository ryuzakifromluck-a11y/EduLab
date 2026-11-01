import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mql = window.matchMedia?.(query)
    if (!mql) return
    const on = () => setMatches(mql.matches)
    on()
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [query])
  return matches
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** Live `prefers-reduced-motion` value for components (re-renders when the OS setting changes). */
export const useReducedMotion = () => useMediaQuery(REDUCED_MOTION)

/** One-off check for non-React code, e.g. before starting a celebration/confetti effect. */
export const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_MOTION).matches

/** Calls `callback(dtSeconds)` every animation frame while `active`. dt is clamped to avoid jumps after tab switches. */
export function useAnimationFrame(callback: (dt: number) => void, active: boolean) {
  const cb = useRef(callback)
  cb.current = callback
  useEffect(() => {
    if (!active) return
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      cb.current(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])
}

/** Re-render at most `hz` times per second while `active` (for publishing simulation snapshots to the UI). */
export function useTicker(hz: number, active: boolean): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000 / hz)
    return () => window.clearInterval(id)
  }, [hz, active])
  return tick
}

export function useFullscreen<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const on = () => setIsFullscreen(document.fullscreenElement === ref.current && !!ref.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [ref])
  const supported = typeof document !== 'undefined' && !!document.fullscreenEnabled
  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await ref.current?.requestFullscreen()
    } catch {
      /* fullscreen refused (e.g. iOS Safari); the layout still works without it */
    }
  }, [ref])
  return { isFullscreen, toggle, supported }
}

/** Re-exported from the PWA module, which tracks connectivity once for the whole app. */
export { useOnline } from './pwa'
