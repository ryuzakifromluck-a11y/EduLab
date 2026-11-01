import { useCallback, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, GEL_LENGTH, GelSimulation, estimateSize, type GelSettings, type SampleId } from '../../engines/gelElectrophoresis'
import { useSimLoop } from '../shared/lab'

/** Simulated seconds per real second: a 40-minute run takes 40 s at 60×. */
export const SPEEDS = [30, 60, 120]

export interface GelReading {
  n: number
  sample: SampleId
  distance: number
  estimate: number
  actual: number
}

/** Gel tank and power supply: agarose % is fixed once the gel is cast; voltage and leads can change mid-run. */
export function useGelElectrophoresis() {
  const [settings, setSettings] = useState<GelSettings>(DEFAULT_SETTINGS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(60)
  const [uv, setUv] = useState(false)
  const [lane, setLane] = useState<Exclude<SampleId, 'ladder'>>('pcr')
  const [readings, setReadings] = useState<GelReading[]>([])
  const sim = useRef<GelSimulation>(null as unknown as GelSimulation)
  if (!sim.current) sim.current = new GelSimulation(DEFAULT_SETTINGS)
  const count = useRef(0)
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const s = sim.current
    s.advance(dt * speed)
    // Like a real run, stop before the dye (and the smallest fragments) run off the end.
    if (s.dye >= GEL_LENGTH * 0.92) setRunning(false)
  }, running)

  const restart = useCallback((p: Partial<GelSettings> = {}) => {
    sim.current.reset(p)
    setRunning(false)
    force((n) => n + 1)
  }, [])

  const s = sim.current
  const curve = s.curve
  const laneBands = s.bands(lane).map((b) => ({ ...b, estimate: curve ? estimateSize(b.distance, curve) : NaN }))

  return {
    sim: s,
    settings,
    /** Recasting the gel at a new concentration starts again with fresh samples. */
    setAgarose: (agarose: number) => {
      setSettings((old) => ({ ...old, agarose }))
      restart({ agarose })
    },
    setVoltage: (voltage: number) => {
      setSettings((old) => ({ ...old, voltage }))
      s.update({ voltage })
      force((n) => n + 1)
    },
    setPolarity: (polarity: GelSettings['polarity']) => {
      setSettings((old) => ({ ...old, polarity }))
      s.update({ polarity })
      force((n) => n + 1)
    },
    uv,
    setUv,
    lane,
    setLane,
    laneBands,
    curve,
    running,
    togglePlay: () => {
      if (!running && s.dye >= GEL_LENGTH * 0.92) restart()
      setRunning((r) => !r)
    },
    reset: () => restart(),
    speed,
    setSpeed,
    time: s.time,
    dye: s.dye,
    readings,
    record: () => {
      setReadings((rs) => {
        const next = [...rs]
        for (const b of laneBands.filter((b) => b.state === 'onGel' && Number.isFinite(b.estimate))) {
          count.current += 1
          next.push({ n: count.current, sample: lane, distance: b.distance, estimate: b.estimate, actual: b.bp })
        }
        return next.slice(-30)
      })
    },
    clearReadings: () => setReadings([]),
  }
}

export type GelController = ReturnType<typeof useGelElectrophoresis>
