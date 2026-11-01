import { useCallback, useRef, useState } from 'react'
import { EnergySimulation, type EnergyParams } from '../../engines/energyConservation'
import { useSimLoop } from '../shared/lab'

export const H_MIN = 0.5
export const H_MAX = 4
export const SPEEDS = [0.25, 0.5, 1, 2]
export const GRAVITY_PRESETS = [
  { id: 'earth', g: 9.81 },
  { id: 'moon', g: 1.62 },
] as const

export interface EnergySample {
  t: number
  kinetic: number
  potential: number
  thermal: number
  total: number
}

const DEFAULTS: EnergyParams = { height: 3, mass: 50, friction: 0, gravity: 9.81 }
const MAX_LOG = 3000

/** A skater released from rest in a bowl; energies are logged ~20 times a second. */
export function useEnergyConservation() {
  const [params, setParams] = useState<EnergyParams>(DEFAULTS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const sim = useRef<EnergySimulation>(null as unknown as EnergySimulation)
  if (!sim.current) sim.current = new EnergySimulation(DEFAULTS)
  const sample = (s: EnergySimulation): EnergySample => ({ t: s.time, ...s.energies })
  const log = useRef<EnergySample[]>([sample(sim.current)])
  const vMax = useRef(0)
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const s = sim.current
    s.advance(dt * speed)
    vMax.current = Math.max(vMax.current, s.speed)
    const last = log.current[log.current.length - 1]
    if (s.time - last.t >= 0.05) {
      log.current.push(sample(s))
      if (log.current.length > MAX_LOG) log.current.splice(0, log.current.length - MAX_LOG)
    }
    const e = s.energies
    // With friction the skater eventually comes to rest at the bottom.
    if (e.total > 0 && (e.kinetic + e.potential) / e.total < 0.002) setRunning(false)
  }, running)

  const restart = useCallback((p: Partial<EnergyParams> = {}) => {
    sim.current.reset(p)
    log.current = [sample(sim.current)]
    vMax.current = 0
    force((n) => n + 1)
  }, [])

  const set = (p: Partial<EnergyParams>, restartRun: boolean) => {
    setParams((old) => ({ ...old, ...p }))
    if (restartRun) {
      restart(p)
      setRunning(false)
    } else sim.current.setParams(p)
  }

  const s = sim.current
  return {
    sim: s,
    params,
    setHeight: (height: number) => set({ height }, true),
    setMass: (mass: number) => set({ mass }, false),
    setFriction: (friction: number) => set({ friction }, false),
    setGravity: (gravity: number) => set({ gravity }, true),
    running,
    togglePlay: () => {
      const e = sim.current.energies
      if (!running && e.total > 0 && (e.kinetic + e.potential) / e.total < 0.002) restart()
      setRunning((r) => !r)
    },
    reset: () => {
      restart()
      setRunning(false)
    },
    speed,
    setSpeed,
    time: s.time,
    x: s.x,
    height: s.height,
    v: s.speed,
    vMax: vMax.current,
    energies: s.energies,
    log: log.current.slice(),
  }
}

export type EnergyController = ReturnType<typeof useEnergyConservation>
