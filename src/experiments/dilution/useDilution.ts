import { useCallback, useRef, useState } from 'react'
import { DilutionSimulation, absorbance, diluted, dilutionFactor, molesIn, transmittance, type DilutionStage, type FlaskVolume } from '../../engines/dilution'
import { useSimLoop } from '../shared/lab'

export const SPEEDS = [1, 2, 4]
export const C1_MAX = 2

export interface DilutionParams {
  c1: number
  v1: number
  v2: FlaskVolume
}

export interface DilutionReading {
  n: number
  c1: number
  v1: number
  v2: number
  c2: number
  A: number
}

const DEFAULTS: DilutionParams = { c1: 1, v1: 10, v2: 100 }

/** Colour intensity (0–1) of copper(II) sulfate solution at concentration c. */
export const blueness = (c: number) => 1 - Math.exp(-c * 2.2)

/** Making a standard solution: pipette stock into a volumetric flask, fill to the mark, invert to mix. */
export function useDilution() {
  const [params, setParams] = useState<DilutionParams>(DEFAULTS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [readings, setReadings] = useState<DilutionReading[]>([])
  const sim = useRef<DilutionSimulation>(null as unknown as DilutionSimulation)
  if (!sim.current) sim.current = new DilutionSimulation(DEFAULTS.c1, DEFAULTS.v1, DEFAULTS.v2)
  const count = useRef(0)
  const [, force] = useState(0)

  useSimLoop((dt) => {
    // A finished stage waits for the next button press.
    if (sim.current.advance(dt * speed)) setRunning(false)
  }, running)

  const restart = useCallback((p: Partial<DilutionParams> = {}) => {
    sim.current.reset(p)
    setRunning(false)
    force((n) => n + 1)
  }, [])

  const update = (p: Partial<DilutionParams>) => {
    setParams((old) => {
      const next = { ...old, ...p }
      // The pipetted volume has to fit in the flask with room to spare.
      next.v1 = Math.min(next.v1, next.v2 / 2)
      restart(next)
      return next
    })
  }

  /** The one button that walks through the procedure. */
  const next = () => {
    const s = sim.current
    if (s.stage === 'empty') {
      s.pipette()
      force((n) => n + 1)
    } else if (s.stage === 'stock' || s.stage === 'filling' || s.stage === 'mark') setRunning(true)
    else restart()
  }

  const s = sim.current
  const c2 = diluted(params.c1, params.v1, params.v2)
  const A = absorbance(s.stage === 'mixed' ? c2 : s.concentration)
  return {
    sim: s,
    params,
    setC1: (c1: number) => update({ c1 }),
    setV1: (v1: number) => update({ v1 }),
    setV2: (v2: FlaskVolume) => update({ v2 }),
    stage: s.stage as DilutionStage,
    next,
    running,
    togglePlay: () => {
      if (s.stage === 'empty' || s.stage === 'mixed') next()
      else setRunning((r) => !r)
    },
    reset: () => restart(),
    speed,
    setSpeed,
    readings,
    record: () => {
      count.current += 1
      const n = count.current
      setReadings((rs) => [...rs, { n, ...params, c2, A: absorbance(c2) }].slice(-40))
    },
    clearReadings: () => setReadings([]),
    volume: s.volume,
    concentration: s.concentration,
    moles: s.moles,
    totalMoles: molesIn(params.c1, params.v1),
    mixing: s.mixing,
    c2,
    factor: dilutionFactor(params.v1, params.v2),
    absorbance: A,
    transmittance: transmittance(A),
  }
}

export type DilutionController = ReturnType<typeof useDilution>
