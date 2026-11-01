import { useCallback, useRef, useState } from 'react'
import { InductionSimulation, peakEmf, type InductionParams } from '../../engines/induction'
import { useReducedMotion } from '../../lib/hooks'
import { useSimLoop } from '../shared/lab'

export const N_MIN = 50
export const N_MAX = 1000
export const MU_MIN = 0.2
export const MU_MAX = 2
export const F_MAX = 3
export const SPEEDS = [0.25, 0.5, 1]
const WINDOW = 6 // seconds of history in the chart

export interface InductionSample {
  t: number
  emf: number
  flux: number
}

const DEFAULTS: InductionParams = { turns: 300, moment: 1, frequency: 1, polarity: 1 }

export function useInduction() {
  const reduced = useReducedMotion()
  const [params, setParams] = useState<InductionParams>(DEFAULTS)
  const [running, setRunning] = useState(!reduced)
  const [speed, setSpeed] = useState(1)
  const sim = useRef<InductionSimulation>(null as unknown as InductionSimulation)
  if (!sim.current) sim.current = new InductionSimulation(DEFAULTS)
  const sample = (s: InductionSimulation): InductionSample => ({ t: s.time, emf: s.emf * 1000, flux: s.flux * 1000 })
  const log = useRef<InductionSample[]>([sample(sim.current)])
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const s = sim.current
    // Small sub-steps keep the EMF trace smooth at high frequencies.
    const total = dt * speed
    const n = Math.max(1, Math.ceil(total / (1 / 240)))
    for (let i = 0; i < n; i++) {
      s.advance(total / n)
      const last = log.current[log.current.length - 1]
      if (s.time - last.t >= 1 / 120) log.current.push(sample(s))
    }
    const cut = s.time - WINDOW
    if (log.current[0].t < cut) log.current = log.current.filter((p) => p.t >= cut)
  }, running)

  const update = useCallback((p: Partial<InductionParams>) => {
    sim.current.setParams(p)
    setParams((old) => ({ ...old, ...p }))
  }, [])

  const s = sim.current
  return {
    sim: s,
    params,
    setTurns: (turns: number) => update({ turns }),
    setMoment: (moment: number) => update({ moment }),
    setFrequency: (frequency: number) => update({ frequency }),
    flip: () => update({ polarity: (sim.current.params.polarity === 1 ? -1 : 1) as 1 | -1 }),
    running,
    togglePlay: () => setRunning((r) => !r),
    reset: () => {
      sim.current.reset()
      update(DEFAULTS)
      log.current = [sample(sim.current)]
      force((n) => n + 1)
    },
    speed,
    setSpeed,
    time: s.time,
    z: s.z,
    v: s.v * speed,
    emf: s.emf,
    flux: s.flux,
    peak: peakEmf(params),
    log: log.current.slice(),
  }
}

export type InductionController = ReturnType<typeof useInduction>
