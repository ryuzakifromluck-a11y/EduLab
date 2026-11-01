import { useCallback, useRef, useState } from 'react'
import { energies, frequency, maxima, period, stateAt, type ShmParams } from '../../engines/harmonicMotion'
import { useSimLoop } from '../shared/lab'

export const M_MIN = 0.1
export const M_MAX = 2
export const K_MIN = 5
export const K_MAX = 100
export const A_MAX = 0.3
export const SPEEDS = [0.1, 0.25, 0.5, 1]

const DEFAULTS: ShmParams = { mass: 0.5, k: 20, amplitude: 0.15, damping: 0, phaseDeg: 0 }

/**
 * The motion is analytic, so the hook only keeps a clock. Changing a
 * parameter starts the oscillation again from t = 0 with the new values.
 */
export function useHarmonicMotion() {
  const [params, setParams] = useState<ShmParams>(DEFAULTS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(0.5)
  const clock = useRef({ t: 0, params: DEFAULTS })
  const [, force] = useState(0)

  useSimLoop((dt) => {
    clock.current.t += dt * speed
  }, running)

  const update = useCallback((p: Partial<ShmParams>) => {
    setParams((old) => {
      const next = { ...old, ...p }
      clock.current = { t: 0, params: next }
      return next
    })
    force((n) => n + 1)
  }, [])

  const t = clock.current.t
  const s = stateAt(params, t)
  const e = energies(params, s)
  return {
    clock,
    params,
    setMass: (mass: number) => update({ mass }),
    setK: (k: number) => update({ k }),
    setAmplitude: (amplitude: number) => update({ amplitude }),
    setDamping: (damping: number) => update({ damping }),
    setPhase: (phaseDeg: number) => update({ phaseDeg }),
    running,
    togglePlay: () => setRunning((r) => !r),
    reset: () => {
      clock.current = { t: 0, params }
      setRunning(false)
      force((n) => n + 1)
    },
    speed,
    setSpeed,
    t,
    ...s,
    energy: e,
    period: period(params),
    frequency: frequency(params),
    ...maxima(params),
  }
}

export type ShmController = ReturnType<typeof useHarmonicMotion>
