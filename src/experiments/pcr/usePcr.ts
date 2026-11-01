import { useCallback, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, PcrSimulation, findTarget, outcome, recommendedAnneal, type PcrSettings } from '../../engines/pcr'
import { useSimLoop } from '../shared/lab'

/** Simulated seconds per real second: a 30-cycle run (~75 min) takes about a minute at 60×. */
export const SPEEDS = [20, 60, 120]

export interface PcrReading {
  n: number
  target: PcrSettings['target']
  cycles: number
  annealTemp: number
  copies: number
  ng: number
}

/** Thermal cycler: owns the settings, runs the cycles and keeps a log of finished runs. */
export function usePcr() {
  const [settings, setSettings] = useState<PcrSettings>(DEFAULT_SETTINGS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(60)
  const [readings, setReadings] = useState<PcrReading[]>([])
  const sim = useRef<PcrSimulation>(null as unknown as PcrSimulation)
  if (!sim.current) sim.current = new PcrSimulation(DEFAULT_SETTINGS)
  const count = useRef(0)
  const [, force] = useState(0)

  useSimLoop((dt) => {
    if (sim.current.advance(dt * speed)) setRunning(false)
  }, running)

  const restart = useCallback((p: Partial<PcrSettings> = {}) => {
    sim.current.reset(p)
    setRunning(false)
    force((n) => n + 1)
  }, [])

  const update = (p: Partial<PcrSettings>) => {
    setSettings((old) => {
      const next = { ...old, ...p }
      // A new target comes with its own primers: start from their recommended annealing temperature.
      if (p.target && p.target !== old.target) next.annealTemp = recommendedAnneal(findTarget(p.target))
      restart(next)
      return next
    })
  }

  const s = sim.current
  const togglePlay = () => {
    if (s.done) {
      restart()
      setRunning(true)
    } else setRunning((r) => !r)
  }

  return {
    sim: s,
    settings,
    set: update,
    running,
    togglePlay,
    reset: () => restart(),
    speed,
    setSpeed,
    cycle: s.cycle,
    copies: s.copies,
    state: s.state,
    done: s.done,
    history: s.history,
    outcome: outcome(settings),
    readings,
    record: () => {
      count.current += 1
      const n = count.current
      const o = outcome(settings)
      setReadings((rs) => [...rs, { n, target: settings.target, cycles: settings.cycles, annealTemp: settings.annealTemp, copies: o.copies, ng: o.ng }].slice(-30))
    },
    clearReadings: () => setReadings([]),
  }
}

export type PcrController = ReturnType<typeof usePcr>
