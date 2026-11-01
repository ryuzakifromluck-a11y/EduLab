import { useCallback, useRef, useState } from 'react'
import { SolutionSimulation, massPercent, saturationTemperature, solubility, type Salt } from '../../engines/solubility'
import { useSimLoop } from '../shared/lab'

export const SPEEDS = [1, 2, 5]
export const ADD_MAX = 300 // g per 100 g water

export interface SolSample {
  t: number
  dissolved: number
  capacity: number
}

export interface SolReading {
  n: number
  salt: Salt['id']
  T: number
  /** Dissolved mass in 100 g of water when the solution was saturated. */
  solubility: number
}

/** 100 g of water in a beaker on a hot plate; the salt is added spoon by spoon. */
export function useSolubility() {
  const [salt, setSaltState] = useState<Salt['id']>('kno3')
  const [temperature, setTemperatureState] = useState(20)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [readings, setReadings] = useState<SolReading[]>([])
  const sim = useRef<SolutionSimulation>(null as unknown as SolutionSimulation)
  if (!sim.current) sim.current = new SolutionSimulation('kno3', 20)
  const log = useRef<SolSample[]>([{ t: 0, dissolved: 0, capacity: sim.current.capacity }])
  const count = useRef(0)
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const s = sim.current
    s.advance(dt * speed)
    const last = log.current[log.current.length - 1]
    if (s.time - last.t >= 0.25) {
      log.current.push({ t: s.time, dissolved: s.dissolved, capacity: s.capacity })
      if (log.current.length > 600) log.current.shift()
    }
  }, running)

  const restart = useCallback((id?: Salt['id']) => {
    sim.current.reset(id)
    log.current = [{ t: 0, dissolved: 0, capacity: sim.current.capacity }]
    force((n) => n + 1)
  }, [])

  const s = sim.current
  return {
    sim: s,
    salt,
    setSalt: (id: Salt['id']) => {
      setSaltState(id)
      restart(id)
      setRunning(true)
    },
    temperature,
    setTemperature: (T: number) => {
      s.temperature = T
      setTemperatureState(T)
    },
    add: (g: number) => {
      s.add(g)
      if (!running) setRunning(true)
      force((n) => n + 1)
    },
    running,
    togglePlay: () => setRunning((r) => !r),
    reset: () => restart(),
    speed,
    setSpeed,
    readings,
    record: () => {
      count.current += 1
      const n = count.current
      setReadings((rs) => [...rs, { n, salt: s.salt, T: s.temperature, solubility: (s.dissolved * 100) / s.water }].slice(-60))
    },
    clearReadings: () => setReadings([]),
    added: s.added,
    dissolved: s.dissolved,
    undissolved: s.undissolved,
    capacity: s.capacity,
    solubility: solubility(salt, temperature),
    state: s.state,
    percent: massPercent(s.dissolved, s.water),
    saturationT: s.added > 0 ? saturationTemperature(salt, (s.added * 100) / s.water) : null,
    /** A solution is saturated (and a reading is meaningful) once solid stays undissolved and the amount has settled. */
    settled: s.undissolved > 0.05 && Math.abs(s.dissolved - s.target) < 0.05,
    time: s.time,
    log: log.current.slice(),
  }
}

export type SolubilityController = ReturnType<typeof useSolubility>
