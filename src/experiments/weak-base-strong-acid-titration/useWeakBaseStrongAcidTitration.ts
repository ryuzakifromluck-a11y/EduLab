import { useCallback, useMemo, useRef, useState } from 'react'
import { INDICATORS, indicatorColor, indicatorState, type IndicatorId } from '../../engines/titration'
import { equivalenceVolume, indicatorEndPoint, titrationCurve, titrationPoint, type WeakBaseParams } from '../../engines/weakBaseStrongAcidTitration'
import { useAnimationFrame, useTicker } from '../../lib/hooks'

export const BURETTE_CAPACITY = 50 // mL
export const DROP_VOLUME = 0.05 // mL
export const ACID_RATE = 0.5 // mL/s at 1×
export const SPEEDS = [0.25, 0.5, 1, 2, 4]

/**
 * NH₃ in the flask, HCl in the burette. Acid is delivered drop by drop while the stopcock is
 * open; every drop recomputes the exact pH from the charge balance.
 */
export function useWeakBaseStrongAcidTitration() {
  const [params, setParamsState] = useState<WeakBaseParams>({ baseConcentration: 0.1, baseVolume: 25, acidConcentration: 0.1 })
  const [indicatorId, setIndicatorId] = useState<IndicatorId>('methylRed')
  const [speed, setSpeed] = useState(1)
  const [dripping, setDripping] = useState(false)
  const added = useRef(0)
  const log = useRef<{ volume: number; pH: number }[]>([{ volume: 0, pH: titrationPoint(params, 0).pH }])
  const drops = useRef<{ t: number }[]>([])
  const nextDrop = useRef(0)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const [, force] = useState(0)

  const addVolume = useCallback((dv: number) => {
    const next = Math.min(BURETTE_CAPACITY, +(added.current + dv).toFixed(4))
    if (next === added.current) return false
    added.current = next
    log.current.push({ volume: next, pH: titrationPoint(paramsRef.current, next).pH })
    if (log.current.length > 5000) log.current.shift()
    return true
  }, [])

  useAnimationFrame((dt) => {
    nextDrop.current -= dt
    const interval = DROP_VOLUME / (ACID_RATE * speed)
    while (nextDrop.current <= 0) {
      nextDrop.current += interval
      if (!addVolume(DROP_VOLUME)) {
        setDripping(false)
        break
      }
      drops.current.push({ t: performance.now() })
      if (drops.current.length > 40) drops.current.shift()
    }
  }, dripping)
  useTicker(12, dripping)

  const restart = useCallback((p: WeakBaseParams) => {
    added.current = 0
    log.current = [{ volume: 0, pH: titrationPoint(p, 0).pH }]
    drops.current = []
    setDripping(false)
    force((n) => n + 1)
  }, [])

  const setParams = (patch: Partial<WeakBaseParams>) => {
    const next = { ...paramsRef.current, ...patch }
    setParamsState(next)
    restart(next)
  }

  const indicator = INDICATORS[indicatorId]
  const point = titrationPoint(params, added.current)
  const veq = equivalenceVolume(params)
  const endPoint = useMemo(() => indicatorEndPoint(params, indicator), [params, indicator])
  const curve = useMemo(() => titrationCurve(params, BURETTE_CAPACITY, 250), [params])

  return {
    params,
    setBaseConcentration: (v: number) => setParams({ baseConcentration: v }),
    setBaseVolume: (v: number) => setParams({ baseVolume: v }),
    setAcidConcentration: (v: number) => setParams({ acidConcentration: v }),
    indicatorId,
    setIndicatorId,
    indicator,
    speed,
    setSpeed,
    dripping,
    toggleDrip: () => {
      if (!dripping && added.current >= BURETTE_CAPACITY) return
      nextDrop.current = 0
      setDripping((d) => !d)
    },
    reset: () => restart(paramsRef.current),
    addDrop: () => {
      if (addVolume(DROP_VOLUME)) drops.current.push({ t: performance.now() })
      force((n) => n + 1)
    },
    addMl: (ml: number) => {
      addVolume(ml)
      drops.current.push({ t: performance.now() })
      force((n) => n + 1)
    },
    addedVolume: added.current,
    addedRef: added,
    point,
    veq,
    endPoint,
    curve,
    reachable: veq <= BURETTE_CAPACITY,
    color: indicatorColor(indicator, point.pH),
    colorState: indicatorState(indicator, point.pH),
    log: log.current.slice(),
    drops,
  }
}

export type WeakBaseController = ReturnType<typeof useWeakBaseStrongAcidTitration>
