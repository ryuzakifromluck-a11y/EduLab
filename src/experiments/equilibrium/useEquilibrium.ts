import { useCallback, useRef, useState } from 'react'
import { EquilibriumSimulation, equilibriumConcentrations } from '../../engines/equilibrium'
import { useSimLoop } from '../shared/lab'

export const SPEEDS = [0.25, 0.5, 1, 2]
export const ADD = 0.01 // mol per button press
export const START_N2O4 = 0.04
export const V_MIN = 0.5
export const V_MAX = 2

export interface EqSample {
  t: number
  n2o4: number
  no2: number
  Q: number
  K: number
}

/** N₂O₄ ⇌ 2NO₂ in a sealed gas syringe; temperature, volume and amounts can be changed while it runs. */
export function useEquilibrium() {
  const [temperature, setTemperatureState] = useState(25)
  const [volume, setVolumeState] = useState(1)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(1)
  const sim = useRef<EquilibriumSimulation>(null as unknown as EquilibriumSimulation)
  if (!sim.current) sim.current = new EquilibriumSimulation(START_N2O4, 1, 25)
  const sample = (s: EquilibriumSimulation): EqSample => ({ t: s.time, n2o4: s.n2o4, no2: s.no2, Q: Math.min(s.Q, 1), K: s.K })
  const log = useRef<EqSample[]>([sample(sim.current)])
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const s = sim.current
    s.advance(Math.min(dt, 0.1) * speed)
    const last = log.current[log.current.length - 1]
    if (s.time - last.t >= 0.1) {
      log.current.push(sample(s))
      if (log.current.length > 600) log.current.shift()
    }
  }, running)

  /** Changes happen instantly; mark them in the log so the chart shows the jump. */
  const change = (fn: (s: EquilibriumSimulation) => void) => {
    const s = sim.current
    log.current.push(sample(s))
    fn(s)
    log.current.push({ ...sample(s), t: s.time + 1e-6 })
    if (!running) setRunning(true)
    force((n) => n + 1)
  }

  const restart = useCallback(() => {
    const s = sim.current
    s.nN2O4 = START_N2O4
    s.nNO2 = 0
    s.volume = 1
    s.tempC = 25
    s.time = 0
    setTemperatureState(25)
    setVolumeState(1)
    log.current = [sample(s)]
    force((n) => n + 1)
  }, [])

  const s = sim.current
  const eq = equilibriumConcentrations(s.nN2O4 + s.nNO2 / 2, s.volume, s.tempC)
  return {
    sim: s,
    temperature,
    setTemperature: (T: number) => {
      setTemperatureState(T)
      change((x) => (x.tempC = T))
    },
    volume,
    setVolume: (V: number) => {
      setVolumeState(V)
      change((x) => (x.volume = V))
    },
    add: (species: 'n2o4' | 'no2') => change((x) => x.add(species, ADD)),
    equilibrate: () => change((x) => x.equilibrate()),
    running,
    togglePlay: () => setRunning((r) => !r),
    reset: restart,
    speed,
    setSpeed,
    time: s.time,
    n2o4: s.n2o4,
    no2: s.no2,
    K: s.K,
    Q: s.Q,
    shift: s.shift,
    pressure: s.pressure,
    dissociation: s.dissociation,
    equilibrium: eq,
    log: log.current.slice(),
  }
}

export type EquilibriumController = ReturnType<typeof useEquilibrium>
