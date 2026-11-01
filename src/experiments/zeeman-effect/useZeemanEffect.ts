import { useCallback, useRef, useState } from 'react'
import { CD_RED, resolved, wavelengthShift, zeemanLines, type Observation } from '../../engines/zeemanEffect'
import { useSimLoop } from '../shared/lab'

export const B_MAX = 1.5 // T
export const B_STEP = 0.05

export type Polariser = 'none' | 'parallel' | 'perpendicular'

export interface ZeemanReading {
  B: number
  /** Measured shift Δλ, pm. */
  shift: number
  mode: Observation
}

/**
 * Owns the electromagnet field (ramped smoothly towards the set value, like a
 * real coil current), the viewing direction and an optional polariser.
 */
export function useZeemanEffect() {
  const [target, setTarget] = useState(0.8)
  const [mode, setMode] = useState<Observation>('transverse')
  const [polariser, setPolariser] = useState<Polariser>('none')
  const [readings, setReadings] = useState<ZeemanReading[]>([])
  const field = useRef(0.8)
  const [, tick] = useState(0)
  const ramping = Math.abs(field.current - target) > 1e-4

  const step = useCallback(
    (dt: number) => {
      const d = target - field.current
      const s = Math.sign(d) * Math.min(Math.abs(d), 0.8 * Math.min(dt, 0.1))
      field.current += s
      if (Math.abs(target - field.current) < 1e-4) {
        field.current = target
        tick((n) => n + 1)
      }
    },
    [target],
  )
  useSimLoop(step, ramping, 20)

  const B = field.current
  const all = zeemanLines(B, mode)
  // A polariser only matters across the field, where every line is linearly polarised.
  const lines =
    mode === 'transverse' && polariser !== 'none'
      ? all.filter((l) => (polariser === 'parallel' ? l.polarisation === 'linearParallel' : l.polarisation === 'linearPerpendicular'))
      : all

  return {
    B,
    target,
    setB: setTarget,
    mode,
    setMode,
    polariser,
    setPolariser,
    lines,
    allLines: all,
    shift: wavelengthShift(B),
    lambda: CD_RED,
    resolved: resolved(B),
    running: ramping,
    togglePlay: () => setTarget((t) => (t > 0 ? 0 : 0.8)),
    reset: () => {
      setTarget(0)
      setMode('transverse')
      setPolariser('none')
    },
    readings,
    record: () => setReadings((r) => [...r, { B, shift: wavelengthShift(B) * 1e12, mode }].slice(-40)),
    clearReadings: () => setReadings([]),
  }
}

export type ZeemanController = ReturnType<typeof useZeemanEffect>
