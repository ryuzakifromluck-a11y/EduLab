import { useCallback, useRef, useState } from 'react'
import { timeConstant } from '../../engines/rcCircuitCharging'
import { useSimLoop } from '../shared/lab'
import type { RcLive } from './RcBoard'

export const SPEEDS = [0.5, 1, 2, 5]

export interface RcSample {
  t: number
  Vc: number
  /** mA */
  I: number
}

export interface RcReading extends RcSample {
  R: number
  C: number
  V0: number
}

/**
 * Series RC charging circuit. The capacitor voltage is integrated exactly
 * step by step, V_C ← V₀ + (V_C − V₀)e^(−dt/RC), so changing R, C or V₀ in
 * the middle of a run carries on smoothly from the present charge.
 */
export function useRcCircuitCharging() {
  const [V0, setV0State] = useState(9)
  const [Rk, setRkState] = useState(10) // kΩ
  const [CuF, setCuFState] = useState(470) // µF
  const [closed, setClosed] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [readings, setReadings] = useState<RcReading[]>([])
  const sim = useRef({ Vc: 0, t: 0, trace: [] as RcSample[], lastSample: -1 })

  const R = Rk * 1000
  const C = CuF * 1e-6
  const tau = timeConstant(R, C)
  const params = useRef({ R, C, V0, closed })
  params.current = { R, C, V0, closed }

  const step = useCallback(
    (dt: number) => {
      const p = params.current
      const s = sim.current
      if (!p.closed) return
      const h = Math.min(dt, 0.1) * speed
      s.Vc = p.V0 + (s.Vc - p.V0) * Math.exp(-h / (p.R * p.C))
      s.t += h
      const tau = p.R * p.C
      if (s.t - s.lastSample >= Math.min(0.25, tau / 40) && s.t <= 8 * tau) {
        s.lastSample = s.t
        s.trace.push({ t: s.t, Vc: s.Vc, I: ((p.V0 - s.Vc) / p.R) * 1000 })
        if (s.trace.length > 400) s.trace.splice(0, s.trace.length - 400)
      }
    },
    [speed],
  )

  useSimLoop(step, closed, 15)

  const s = sim.current
  const I = closed ? (V0 - s.Vc) / R : 0

  const live = useCallback((): RcLive => {
    const p = params.current
    const Vc = sim.current.Vc
    return { Vc, I: p.closed ? (p.V0 - Vc) / p.R : 0, Imax: p.V0 / p.R, V0: p.V0, switched: p.closed }
  }, [])

  const discharge = () => {
    s.Vc = 0
    s.t = 0
    s.trace = [{ t: 0, Vc: 0, I: closed ? (V0 / R) * 1000 : 0 }]
    s.lastSample = 0
  }

  return {
    V0,
    Rk,
    CuF,
    R,
    C,
    tau,
    setV0: (v: number) => setV0State(v),
    setRk: (v: number) => setRkState(v),
    setCuF: (v: number) => setCuFState(v),
    closed,
    toggleSwitch: () => {
      if (!closed && s.t === 0) s.trace = [{ t: 0, Vc: s.Vc, I: ((V0 - s.Vc) / R) * 1000 }]
      setClosed((c) => !c)
    },
    running: closed,
    togglePlay: () => {
      if (!closed && s.t === 0) s.trace = [{ t: 0, Vc: s.Vc, I: ((V0 - s.Vc) / R) * 1000 }]
      setClosed((c) => !c)
    },
    speed,
    setSpeed,
    reset: () => {
      setClosed(false)
      discharge()
      s.trace = []
    },
    t: s.t,
    Vc: s.Vc,
    I,
    Q: C * s.Vc,
    energy: 0.5 * C * s.Vc * s.Vc,
    percent: (s.Vc / V0) * 100,
    trace: s.trace,
    live,
    readings,
    record: () => setReadings((rs) => [...rs, { t: s.t, Vc: s.Vc, I: I * 1000, R: Rk, C: CuF, V0 }].slice(-40)),
    clearReadings: () => setReadings([]),
  }
}

export type RcChargingController = ReturnType<typeof useRcCircuitCharging>
