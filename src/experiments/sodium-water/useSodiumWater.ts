import { useCallback, useRef, useState } from 'react'
import {
  ALKALI,
  hydrogenVolume,
  initialState,
  reactionRate,
  remainingMass,
  solutionPH,
  step,
  totalMoles,
  type AlkaliMetal,
  type SodiumWaterParams,
  type SodiumWaterState,
} from '../../engines/sodiumWater'
import { INDICATORS, indicatorColor } from '../../engines/titration'
import { useSimLoop } from '../shared/lab'

export const SPEEDS = [0.25, 0.5, 1, 2]
/** Inner radius of the 250 mL beaker, cm. */
export const BEAKER_RADIUS = 3.4
/** Seconds for the piece to fall from the spatula to the water. */
export const FALL_TIME = 0.45
const LOG_EVERY = 0.2

export type Phase = 'ready' | 'falling' | 'reacting' | 'done'

export interface Reading {
  t: number
  temp: number
  h2: number
  mass: number
}

/**
 * A piece of alkali metal is dropped from a spatula into a beaker of water. The engine advances
 * the reaction; this hook adds the drop, play/pause/speed and a log of readings for the charts.
 */
export function useSodiumWater() {
  const [metal, setMetalState] = useState<AlkaliMetal>('Na')
  const [mass, setMassState] = useState(0.25)
  const [waterVolume, setWaterVolumeState] = useState(100)
  const [initialTemp, setInitialTempState] = useState(20)
  const [phenolphthalein, setPhenolphthalein] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('ready')
  const [everBurned, setEverBurned] = useState(false)

  const params: SodiumWaterParams = { metal, mass, waterVolume, initialTemp, beakerRadius: BEAKER_RADIUS }
  const paramsRef = useRef(params)
  paramsRef.current = params
  const sim = useRef<SodiumWaterState>(initialState(params))
  const fall = useRef(0)
  const seed = useRef(Math.random() * 10)
  const log = useRef<Reading[]>([])
  const nextLog = useRef(0)
  const [, force] = useState(0)

  const restart = useCallback((p: SodiumWaterParams) => {
    sim.current = initialState(p)
    fall.current = 0
    log.current = []
    nextLog.current = 0
    seed.current = Math.random() * 10
    setPhase('ready')
    setRunning(false)
    setEverBurned(false)
    force((n) => n + 1)
  }, [])

  useSimLoop((dt) => {
    const h = dt * speed
    if (phase === 'falling') {
      fall.current += h
      if (fall.current >= FALL_TIME) {
        fall.current = FALL_TIME
        log.current = [{ t: 0, temp: sim.current.temp, h2: 0, mass: paramsRef.current.mass }]
        nextLog.current = LOG_EVERY
        setPhase('reacting')
      }
      return
    }
    if (phase !== 'reacting') return
    const p = paramsRef.current
    sim.current = step(sim.current, p, h, seed.current)
    if (sim.current.burning) setEverBurned(true)
    while (sim.current.t >= nextLog.current || sim.current.done) {
      log.current.push({ t: +sim.current.t.toFixed(2), temp: sim.current.temp, h2: hydrogenVolume(sim.current.reacted), mass: remainingMass(sim.current, p) })
      nextLog.current += LOG_EVERY
      if (sim.current.done) break
    }
    if (sim.current.done) {
      setPhase('done')
      setRunning(false)
    }
  }, running)

  const s = sim.current
  const pH = solutionPH(s.reacted, waterVolume)
  const color = phenolphthalein ? indicatorColor(INDICATORS.phenolphthalein, pH) : { r: 214, g: 228, b: 245, a: 0.45 }
  const rate = phase === 'reacting' ? reactionRate(metal, s.radius, s.temp) : 0

  const reconfigure = <T,>(setter: (v: T) => void, key: keyof SodiumWaterParams) => (v: T) => {
    setter(v)
    restart({ ...paramsRef.current, [key]: v })
  }

  return {
    params,
    metal,
    setMetal: reconfigure(setMetalState, 'metal'),
    mass,
    setMass: reconfigure(setMassState, 'mass'),
    waterVolume,
    setWaterVolume: reconfigure(setWaterVolumeState, 'waterVolume'),
    initialTemp,
    setInitialTemp: reconfigure(setInitialTempState, 'initialTemp'),
    phenolphthalein,
    setPhenolphthalein,
    speed,
    setSpeed,
    running,
    phase,
    /** 0–1 progress of the fall from the spatula. */
    fallProgress: () => fall.current / FALL_TIME,
    sim,
    state: s,
    drop: () => {
      if (phase !== 'ready') return
      setPhase('falling')
      setRunning(true)
    },
    togglePlay: () => {
      if (phase === 'ready') {
        setPhase('falling')
        setRunning(true)
      } else if (phase !== 'done') setRunning((r) => !r)
    },
    reset: () => restart(paramsRef.current),
    temp: s.temp,
    h2: hydrogenVolume(s.reacted),
    massLeft: remainingMass(s, params),
    fractionReacted: s.reacted / totalMoles(params),
    pH,
    rate,
    burning: phase === 'reacting' && s.burning,
    everBurned,
    molten: phase === 'reacting' && ALKALI[metal].meltsOnWater,
    color,
    log: log.current.slice(),
  }
}

export type SodiumWaterController = ReturnType<typeof useSodiumWater>
