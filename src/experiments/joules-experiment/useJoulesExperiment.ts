import { useCallback, useRef, useState } from 'react'
import { APPARATUS, CAL, JouleCalorimeter, coilCurrent, coilPower, fallingWork, heatCapacity, temperatureRise, type Method } from '../../engines/joulesExperiment'
import { useSimLoop } from '../shared/lab'

export const SPEEDS = [1, 2, 5, 10]

export interface JouleSample {
  /** Work done so far, J. */
  W: number
  /** Water temperature, °C. */
  T: number
  t: number
}

export interface JouleRun {
  method: Method
  insulated: boolean
  work: number
  dT: number
  J: number | null
  label: string
}

/**
 * Joule's paddle-wheel calorimeter. While running, the weight falls at a
 * steady speed, is wound back up at the floor and dropped again; in the
 * electrical method a heater coil delivers I²R instead.
 */
export function useJoulesExperiment() {
  const [method, setMethodState] = useState<Method>('mechanical')
  const [mass, setMass] = useState(10) // kg
  const [height, setHeight] = useState(1.5) // m
  const [voltage, setVoltage] = useState(12)
  const [resistance, setResistance] = useState(4)
  const [insulated, setInsulatedState] = useState(true)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [runs, setRuns] = useState<JouleRun[]>([])
  const cal = useRef<JouleCalorimeter>(null as unknown as JouleCalorimeter)
  if (!cal.current) cal.current = new JouleCalorimeter()
  const trace = useRef<JouleSample[]>([{ W: 0, T: cal.current.T, t: 0 }])
  const params = useRef({ method, mass, height, voltage, resistance })
  params.current = { method, mass, height, voltage, resistance }
  const c = cal.current

  const step = useCallback(
    (dt: number) => {
      const p = params.current
      const h = Math.min(dt, 0.1) * speed
      if (p.method === 'mechanical') {
        c.power = 0
        if (!c.falling) c.drop(p.mass, p.height)
      } else {
        c.power = coilPower(coilCurrent(p.voltage, p.resistance), p.resistance)
      }
      c.advance(h)
      const last = trace.current[trace.current.length - 1]
      if (c.time - last.t > 0.5) {
        trace.current.push({ W: c.work, T: c.T, t: c.time })
        if (trace.current.length > 600) trace.current.splice(1, 1)
      }
    },
    [c, speed],
  )
  useSimLoop(step, running, 12)

  const stop = () => {
    c.power = 0
    setRunning(false)
  }
  const fresh = () => {
    c.reset()
    trace.current = [{ W: 0, T: c.T, t: 0 }]
  }

  const I = coilCurrent(voltage, resistance)
  return {
    cal: c,
    method,
    setMethod: (m: Method) => {
      stop()
      fresh()
      setMethodState(m)
    },
    mass,
    setMass,
    height,
    setHeight,
    voltage,
    setVoltage,
    resistance,
    setResistance,
    insulated,
    setInsulated: (v: boolean) => {
      c.insulated = v
      setInsulatedState(v)
    },
    running,
    togglePlay: () => (running ? stop() : setRunning(true)),
    speed,
    setSpeed,
    reset: () => {
      stop()
      fresh()
    },
    T: c.T,
    dT: c.dT,
    work: c.work,
    drops: c.drops,
    time: c.time,
    /** Fall still to go in the current drop, as a fraction of the height. */
    fallFraction: c.falling ? 1 - c.fallLeft / height : 0,
    measuredJ: c.measuredJ,
    heat: heatCapacity(APPARATUS) * c.dT,
    current: I,
    power: coilPower(I, resistance),
    perDrop: fallingWork(mass, height),
    risePerDrop: temperatureRise(fallingWork(mass, height)),
    trace: trace.current,
    runs,
    saveRun: () => {
      if (c.work <= 0) return
      const label =
        method === 'mechanical' ? `${mass} kg × ${height} m × ${c.drops}` : `${voltage} V, ${resistance} Ω, ${Math.round(c.time)} s`
      setRuns((rs) => [...rs, { method, insulated, work: c.work, dT: c.dT, J: c.measuredJ, label }].slice(-12))
    },
    clearRuns: () => setRuns([]),
    CAL,
  }
}

export type JouleController = ReturnType<typeof useJoulesExperiment>
