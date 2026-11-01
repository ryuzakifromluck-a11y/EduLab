import { useCallback, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, DnaExtractionSimulation, SOURCES, extract, type DnaExtractionSettings, type DnaSource, type DnaStage } from '../../engines/dnaExtraction'
import { useSimLoop } from '../shared/lab'

export const SPEEDS = [1, 2, 4]

export interface DnaReading {
  n: number
  source: DnaSource
  ethanolTemp: number
  protease: boolean
  yield: number
  ratio: number
}

/** Colour of the filtrate for each source (display only). */
export const FILTRATE_COLOR: Record<DnaSource, string> = { strawberry: '#e0687a', banana: '#efe2a2', cheek: '#e6e1d6' }
export const SAMPLE_COLOR: Record<DnaSource, string> = { strawberry: '#d22c44', banana: '#f2dc72', cheek: '#dcd6c8' }

/** Extraction procedure: one button walks mash → lyse → filter → ethanol → spool. */
export function useDnaExtraction() {
  const [settings, setSettings] = useState<DnaExtractionSettings>(DEFAULT_SETTINGS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [readings, setReadings] = useState<DnaReading[]>([])
  const sim = useRef<DnaExtractionSimulation>(null as unknown as DnaExtractionSimulation)
  if (!sim.current) sim.current = new DnaExtractionSimulation(DEFAULT_SETTINGS)
  const count = useRef(0)
  const [, force] = useState(0)

  useSimLoop((dt) => {
    // Mashing and precipitation are sped up so a run takes about a minute.
    if (sim.current.advance(dt * speed * 4)) setRunning(false)
  }, running)

  const restart = useCallback((p: Partial<DnaExtractionSettings> = {}) => {
    sim.current.reset(p)
    setRunning(false)
    force((n) => n + 1)
  }, [])

  const update = (p: Partial<DnaExtractionSettings>) => {
    setSettings((old) => {
      const next = { ...old, ...p }
      if (p.source && p.source !== old.source) next.amount = SOURCES[p.source].amount.default
      restart(next)
      return next
    })
  }

  const s = sim.current
  /** Starts the next step, or a fresh extraction after spooling. */
  const next = () => {
    if (s.stage === 'spooled') return restart()
    if (s.running) return setRunning(true)
    s.next()
    setRunning(s.running)
    force((n) => n + 1)
  }

  const result = extract(settings)
  return {
    sim: s,
    settings,
    set: update,
    stage: s.stage as DnaStage,
    progress: s.progress,
    next,
    running,
    togglePlay: () => {
      if (s.running) setRunning((r) => !r)
      else next()
    },
    reset: () => restart(),
    speed,
    setSpeed,
    result,
    lysed: s.lysed,
    precipitated: s.precipitated,
    readings,
    record: () => {
      count.current += 1
      const n = count.current
      setReadings((rs) =>
        [...rs, { n, source: settings.source, ethanolTemp: settings.ethanolTemp, protease: settings.protease, yield: result.yield, ratio: result.ratio }].slice(-30),
      )
    },
    clearReadings: () => setReadings([]),
  }
}

export type DnaExtractionController = ReturnType<typeof useDnaExtraction>
