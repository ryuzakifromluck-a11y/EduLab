import { useCallback, useMemo, useRef, useState } from 'react'
import {
  INDICATORS,
  dropFlash,
  equivalenceVolume,
  indicatorColor,
  indicatorEndPoint,
  indicatorState,
  titrationPoint,
  type IndicatorId,
  type TitrationParams,
} from '../../engines/titration'
import { useAnimationFrame, useTicker } from '../../lib/hooks'

export const BURETTE_CAPACITY = 50 // mL
export const DROP_VOLUME = 0.05 // mL, a typical burette drop
export const BASE_RATE = 0.5 // mL/s at 1× speed
export const SPEEDS = [0.25, 0.5, 1, 2, 4]

export interface DropEvent {
  /** performance.now() timestamp when the drop left the tip. */
  t: number
  /** 0–1 strength of the local indicator colour this drop makes where it lands. */
  flash: number
  /** Seconds the local colour takes to fade without swirling. */
  fadeTime: number
}

/** Seconds a drop takes to fall from the burette tip into the flask. */
export const DROP_FALL = 0.32

/**
 * Titration state. Titrant is delivered in discrete drops of DROP_VOLUME while
 * the stopcock is open; every drop recomputes the pH with the equilibrium engine.
 */
export function useTitration({ onDrop }: { onDrop?: () => void } = {}) {
  const [params, setParamsState] = useState<TitrationParams>({
    acidConcentration: 0.1,
    acidVolume: 25,
    baseConcentration: 0.1,
  })
  const [indicatorId, setIndicatorId] = useState<IndicatorId>('phenolphthalein')
  const [speed, setSpeed] = useState(1)
  const [dripping, setDripping] = useState(false)
  const added = useRef(0)
  const log = useRef<{ volume: number; pH: number }[]>([{ volume: 0, pH: titrationPoint(params, 0).pH }])
  const drops = useRef<DropEvent[]>([])
  const timeToNextDrop = useRef(0)
  /** performance.now() of the last swirl; swirling mixes away local colour flashes. */
  const swirledAt = useRef(-Infinity)
  const onDropRef = useRef(onDrop)
  onDropRef.current = onDrop
  const [, force] = useState(0)

  const logPoint = useCallback((v: number, p: TitrationParams) => {
    const last = log.current[log.current.length - 1]
    if (last && Math.abs(last.volume - v) < 1e-9) return
    log.current.push({ volume: +v.toFixed(3), pH: titrationPoint(p, v).pH })
    if (log.current.length > 5000) log.current.shift()
  }, [])

  const paramsRef = useRef(params)
  paramsRef.current = params
  const indicatorRef = useRef(indicatorId)
  indicatorRef.current = indicatorId

  const addVolume = useCallback(
    (dv: number) => {
      const next = Math.min(BURETTE_CAPACITY, +(added.current + dv).toFixed(4))
      if (next === added.current) return false
      added.current = next
      logPoint(next, paramsRef.current)
      return true
    },
    [logPoint],
  )

  const pushDrop = useCallback(() => {
    const f = dropFlash(paramsRef.current, INDICATORS[indicatorRef.current], added.current - DROP_VOLUME)
    drops.current.push({ t: performance.now(), flash: f.permanent ? 0 : f.strength, fadeTime: f.fadeTime })
    if (drops.current.length > 40) drops.current.shift()
    onDropRef.current?.()
  }, [])

  useAnimationFrame((dt) => {
    timeToNextDrop.current -= dt
    const interval = DROP_VOLUME / (BASE_RATE * speed)
    while (timeToNextDrop.current <= 0) {
      timeToNextDrop.current += interval
      if (!addVolume(DROP_VOLUME)) {
        setDripping(false)
        break
      }
      pushDrop()
    }
  }, dripping)
  useTicker(12, dripping)

  const restart = useCallback((p: TitrationParams) => {
    added.current = 0
    log.current = [{ volume: 0, pH: titrationPoint(p, 0).pH }]
    drops.current = []
    setDripping(false)
    force((n) => n + 1)
  }, [])

  const setParams = useCallback(
    (patch: Partial<TitrationParams>) => {
      const next = { ...paramsRef.current, ...patch }
      setParamsState(next)
      restart(next)
    },
    [restart],
  )

  const setAddedVolume = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(BURETTE_CAPACITY, v))
      if (clamped < added.current) {
        // Going back in volume means starting the titration again up to this point.
        log.current = log.current.filter((pt) => pt.volume <= clamped)
      }
      added.current = clamped
      logPoint(clamped, paramsRef.current)
      force((n) => n + 1)
    },
    [logPoint],
  )

  const addDrop = useCallback(() => {
    if (addVolume(DROP_VOLUME)) pushDrop()
    force((n) => n + 1)
  }, [addVolume, pushDrop])

  const addMl = useCallback(
    (ml: number) => {
      if (addVolume(ml)) pushDrop()
      force((n) => n + 1)
    },
    [addVolume, pushDrop],
  )

  const indicator = INDICATORS[indicatorId]
  const point = titrationPoint(params, added.current)
  const veq = equivalenceVolume(params)
  const endPoint = useMemo(() => indicatorEndPoint(params, indicator), [params, indicator])

  /** Strength (0–1) of the local colour flash still visible in the flask right now. */
  const flashNow = (now = performance.now()) => {
    let best = 0
    for (const d of drops.current) {
      if (d.t < swirledAt.current) continue
      const age = (now - d.t) / 1000 - DROP_FALL
      if (age < 0) continue
      best = Math.max(best, d.flash * Math.exp(-age / d.fadeTime))
    }
    return best
  }
  const colorState = indicatorState(indicator, point.pH)
  /** What the student sees: colourless, a flash that fades on swirling, or the permanent end-point colour. */
  const indicatorPhase: 'acid' | 'flash' | 'endPoint' =
    colorState !== 'acid' ? 'endPoint' : flashNow() > 0.15 ? 'flash' : 'acid'

  return {
    params,
    setParams,
    indicatorId,
    setIndicatorId,
    indicator,
    speed,
    setSpeed,
    dripping,
    toggleDrip: () => {
      if (!dripping && added.current >= BURETTE_CAPACITY) return
      timeToNextDrop.current = 0
      setDripping((d) => !d)
    },
    reset: () => restart(paramsRef.current),
    addedVolume: added.current,
    addedRef: added,
    setAddedVolume,
    addDrop,
    addMl,
    point,
    veq,
    endPoint,
    reachable: veq <= BURETTE_CAPACITY,
    color: indicatorColor(indicator, point.pH),
    colorState,
    indicatorPhase,
    flashNow,
    swirledAt,
    /** Swirl the flask: mixes the last drops in, so a local colour flash disappears. */
    swirl: () => {
      swirledAt.current = performance.now()
      force((n) => n + 1)
    },
    log: log.current.slice(),
    logRef: log,
    drops,
  }
}

export type TitrationController = ReturnType<typeof useTitration>
