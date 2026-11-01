import { useCallback, useRef, useState } from 'react'
import { CalorimeterSimulation, ROOM_T, enthalpyFromMeasurement, heatReleased, idealDeltaT, moles, type CalorimetryParams, type Substance } from '../../engines/calorimetry'
import { useSimLoop } from '../shared/lab'

export const SPEEDS = [1, 2, 5, 10]
export const MASS_MAX = 15
export const RUN_LENGTH = 240 // s of simulated time per run

export interface CalSample {
  t: number
  T: number
}

export interface CalRun {
  n: number
  substance: Substance['id']
  mass: number
  water: number
  deltaT: number
  dH: number
}

const DEFAULTS: CalorimetryParams = { substance: 'naoh', mass: 5, water: 100, startT: ROOM_T }

export function useExoEndo() {
  const [params, setParams] = useState<CalorimetryParams>(DEFAULTS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [runs, setRuns] = useState<CalRun[]>([])
  const sim = useRef<CalorimeterSimulation>(null as unknown as CalorimeterSimulation)
  if (!sim.current) sim.current = new CalorimeterSimulation(DEFAULTS)
  const log = useRef<CalSample[]>([{ t: 0, T: ROOM_T }])
  const recorded = useRef(false)
  const runCount = useRef(0)
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const s = sim.current
    s.advance(dt * speed)
    const last = log.current[log.current.length - 1]
    if (s.time - last.t >= 0.5) log.current.push({ t: s.time, T: s.temperature })
    if (s.time >= RUN_LENGTH) {
      setRunning(false)
      if (!recorded.current) {
        recorded.current = true
        runCount.current += 1
        const p = s.params
        const n = runCount.current
        const dT = s.peakDelta
        setRuns((rs) => [...rs, { n, substance: p.substance, mass: p.mass, water: p.water, deltaT: dT, dH: enthalpyFromMeasurement(p.water, dT, moles(p)) }].slice(-40))
      }
    }
  }, running)

  const restart = useCallback((p: Partial<CalorimetryParams> = {}) => {
    sim.current.reset(p)
    log.current = [{ t: 0, T: sim.current.temperature }]
    recorded.current = false
    setRunning(false)
    force((n) => n + 1)
  }, [])

  const update = (p: Partial<CalorimetryParams>) => {
    setParams((old) => ({ ...old, ...p }))
    restart(p)
  }

  const start = () => {
    const s = sim.current
    if (s.time >= RUN_LENGTH) restart()
    sim.current.start()
    setRunning(true)
  }

  const s = sim.current
  return {
    sim: s,
    params,
    setSubstance: (substance: Substance['id']) => update({ substance }),
    setMass: (mass: number) => update({ mass }),
    setWater: (water: number) => update({ water }),
    running,
    started: s.started,
    finished: s.time >= RUN_LENGTH,
    start,
    togglePlay: () => {
      if (!s.started || s.time >= RUN_LENGTH) start()
      else setRunning((r) => !r)
    },
    reset: () => restart(),
    speed,
    setSpeed,
    runs,
    clearRuns: () => setRuns([]),
    time: s.time,
    temperature: s.temperature,
    deltaT: s.deltaT,
    peak: s.peakDelta,
    extent: s.extent,
    idealDeltaT: idealDeltaT(params),
    heat: heatReleased(params),
    moles: moles(params),
    log: log.current.slice(),
  }
}

export type ExoEndoController = ReturnType<typeof useExoEndo>
