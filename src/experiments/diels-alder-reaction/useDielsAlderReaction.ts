import { useCallback, useMemo, useRef, useState } from 'react'
import { analyse, conversion, type DieneId, type DienophileId } from '../../engines/dielsAlderReaction'
import { useSimLoop } from '../shared/lab'

/** Simulated seconds per real second. */
export const SPEEDS = [1, 10, 100, 1000]
/** The run stops after one simulated hour. */
export const MAX_TIME = 3600
export const T_MIN = 0
export const T_MAX = 200

export interface DaSample {
  t: number
  X: number
}

/**
 * Diene + dienophile in solution at equal concentrations. Time runs while "react" is on and the
 * conversion follows the second-order rate law; changing a reagent or the conditions restarts.
 */
export function useDielsAlderReaction() {
  const [dieneId, setDieneState] = useState<DieneId>('cyclopentadiene')
  const [dienophileId, setDienophileState] = useState<DienophileId>('maleicAnhydride')
  const [temperature, setTemperatureState] = useState(25)
  const [concentration, setConcentrationState] = useState(0.5)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const time = useRef(0)
  const log = useRef<DaSample[]>([{ t: 0, X: 0 }])
  const [, force] = useState(0)

  const a = useMemo(() => analyse(dieneId, dienophileId, temperature, concentration), [dieneId, dienophileId, temperature, concentration])
  const aRef = useRef(a)
  aRef.current = a

  useSimLoop((dt) => {
    const next = Math.min(MAX_TIME, time.current + Math.min(dt, 0.1) * speed)
    time.current = next
    const X = conversion(aRef.current.k, concentration, next)
    const last = log.current[log.current.length - 1]
    if (next - last.t >= MAX_TIME / 2000 || next >= MAX_TIME) {
      log.current.push({ t: next, X })
      if (log.current.length > 2500) log.current.shift()
    }
    if (next >= MAX_TIME || X > 0.9999) setRunning(false)
  }, running)

  const restart = useCallback(() => {
    time.current = 0
    log.current = [{ t: 0, X: 0 }]
    setRunning(false)
    force((n) => n + 1)
  }, [])

  const X = conversion(a.k, concentration, time.current)
  return {
    dieneId,
    setDiene: (d: DieneId) => {
      setDieneState(d)
      restart()
    },
    dienophileId,
    setDienophile: (d: DienophileId) => {
      setDienophileState(d)
      restart()
    },
    temperature,
    setTemperature: (T: number) => {
      setTemperatureState(T)
      restart()
    },
    concentration,
    setConcentration: (c: number) => {
      setConcentrationState(c)
      restart()
    },
    running,
    togglePlay: () => {
      if (!running && (time.current >= MAX_TIME || X > 0.9999)) restart()
      setRunning((r) => !r)
    },
    reset: restart,
    speed,
    setSpeed,
    time: time.current,
    /** Live conversion (0–1), read by the 3D scene every frame. */
    progress: useCallback(() => conversion(aRef.current.k, concentration, time.current), [concentration]),
    conversion: X,
    analysis: a,
    log: log.current.slice(),
  }
}

export type DielsAlderController = ReturnType<typeof useDielsAlderReaction>
