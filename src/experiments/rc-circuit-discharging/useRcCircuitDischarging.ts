import { useCallback, useRef, useState } from 'react'
import { capacitorEnergy, timeConstant } from '../../engines/rcCircuitDischarging'
import { useSimLoop } from '../shared/lab'
import type { RcLive } from '../rc-circuit-charging/RcBoard'

export const SPEEDS = [0.5, 1, 2, 5]

export interface RcDischargeSample {
  t: number
  Vc: number
  /** mA, negative while discharging */
  I: number
}

export interface RcDischargeReading extends RcDischargeSample {
  R: number
  C: number
  V0: number
}

/**
 * Two-way switch: at A the battery holds the capacitor at V₀; at B the
 * capacitor discharges through R, V_C ← V_C·e^(−dt/RC) each step.
 */
export function useRcCircuitDischarging() {
  const [V0, setV0State] = useState(9)
  const [Rk, setRkState] = useState(10)
  const [CuF, setCuFState] = useState(470)
  const [discharging, setDischarging] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [readings, setReadings] = useState<RcDischargeReading[]>([])
  const sim = useRef({ Vc: 9, t: 0, start: 9, heat: 0, trace: [] as RcDischargeSample[], lastSample: -1 })

  const R = Rk * 1000
  const C = CuF * 1e-6
  const tau = timeConstant(R, C)
  const params = useRef({ R, C, V0, discharging })
  params.current = { R, C, V0, discharging }

  const step = useCallback(
    (dt: number) => {
      const p = params.current
      const s = sim.current
      if (!p.discharging) return
      const h = Math.min(dt, 0.1) * speed
      const before = s.Vc
      s.Vc = s.Vc * Math.exp(-h / (p.R * p.C))
      s.heat += 0.5 * p.C * (before * before - s.Vc * s.Vc)
      s.t += h
      const tau = p.R * p.C
      if (s.t - s.lastSample >= Math.min(0.25, tau / 40) && s.t <= 8 * tau) {
        s.lastSample = s.t
        s.trace.push({ t: s.t, Vc: s.Vc, I: (-s.Vc / p.R) * 1000 })
        if (s.trace.length > 400) s.trace.splice(0, s.trace.length - 400)
      }
    },
    [speed],
  )
  useSimLoop(step, discharging, 15)

  const s = sim.current
  const I = discharging ? -s.Vc / R : 0

  const live = useCallback((): RcLive => {
    const p = params.current
    const Vc = sim.current.Vc
    return { Vc, I: p.discharging ? -Vc / p.R : 0, Imax: sim.current.start / p.R, V0: p.V0, switched: p.discharging }
  }, [])

  /** Switch to A: the battery recharges the capacitor (instantly; no resistor in that loop). */
  const toA = (v = V0) => {
    s.Vc = v
    s.start = v
    s.t = 0
    s.heat = 0
    s.trace = []
    s.lastSample = -1
    setDischarging(false)
  }
  const toB = () => {
    s.start = s.Vc
    s.t = 0
    s.heat = 0
    s.trace = [{ t: 0, Vc: s.Vc, I: (-s.Vc / R) * 1000 }]
    s.lastSample = 0
    setDischarging(true)
  }
  const flip = () => (discharging ? toA() : toB())

  return {
    V0,
    Rk,
    CuF,
    R,
    C,
    tau,
    setV0: (v: number) => {
      setV0State(v)
      if (!discharging) toA(v)
    },
    setRk: (v: number) => setRkState(v),
    setCuF: (v: number) => setCuFState(v),
    discharging,
    flip,
    running: discharging,
    togglePlay: flip,
    speed,
    setSpeed,
    reset: () => toA(),
    t: s.t,
    Vc: s.Vc,
    start: s.start,
    I,
    Q: C * s.Vc,
    energy: capacitorEnergy(C, s.Vc),
    initialEnergy: capacitorEnergy(C, s.start),
    heat: s.heat,
    percent: s.start > 0 ? (s.Vc / s.start) * 100 : 0,
    trace: s.trace,
    live,
    readings,
    record: () => setReadings((rs) => [...rs, { t: s.t, Vc: s.Vc, I: I * 1000, R: Rk, C: CuF, V0: s.start }].slice(-40)),
    clearReadings: () => setReadings([]),
  }
}
