import { useCallback, useRef, useState } from 'react'
import {
  ReactionSimulation,
  crossTime,
  halfLife,
  rateConstant,
  type ReactionParams,
} from '../../engines/reactionRate'
import { useAnimationFrame, useTicker } from '../../lib/hooks'

export const SPEEDS = [1, 2, 5, 10, 20]
export const C_MIN = 0.02
export const C_MAX = 0.25
export const T_MIN = 10
export const T_MAX = 60

const MAX_LOG = 4000

export interface ReactionSample {
  t: number
  thiosulfate: number
  sulfur: number
  visibility: number
}

export interface Trial {
  n: number
  concentration: number
  temperatureC: number
  time: number
}

/**
 * Owns one run of the disappearing-cross reaction. Time advances every
 * animation frame (scaled by the playback speed); React re-renders at ~12 Hz.
 * When the cross vanishes the run is recorded as a trial; the run pauses by
 * itself once the reaction has gone on for three times that long.
 */
export function useReactionRate() {
  const [concentration, setConcentrationState] = useState(0.15)
  const [temperatureC, setTemperatureState] = useState(25)
  const [speed, setSpeed] = useState(2)
  const [running, setRunning] = useState(false)
  const [trials, setTrials] = useState<Trial[]>([])

  const sim = useRef<ReactionSimulation>(null as unknown as ReactionSimulation)
  if (!sim.current) sim.current = new ReactionSimulation({ concentration, temperatureC })
  const sample = (s: ReactionSimulation): ReactionSample => ({
    t: s.time,
    thiosulfate: s.thiosulfate,
    sulfur: s.sulfur,
    visibility: s.visibility,
  })
  const log = useRef<ReactionSample[]>([sample(sim.current)])
  const trialCount = useRef(0)
  const [, force] = useState(0)

  const sampleInterval = (p: ReactionParams) => {
    const tc = crossTime(p)
    return Math.max(0.05, (Number.isFinite(tc) ? tc : halfLife(p.temperatureC)) / 150)
  }

  useAnimationFrame((dt) => {
    const s = sim.current
    const vanished = s.advance(dt * speed)
    const last = log.current[log.current.length - 1]
    if (vanished || s.time - last.t >= sampleInterval(s.params)) {
      log.current.push(sample(s))
      if (log.current.length > MAX_LOG) log.current.splice(0, log.current.length - MAX_LOG)
    }
    if (vanished) {
      trialCount.current += 1
      const n = trialCount.current
      const { concentration: c, temperatureC: T } = s.params
      setTrials((ts) => [...ts, { n, concentration: c, temperatureC: T, time: s.crossVanishedAt! }].slice(-40))
    }
    const tc = crossTime(s.params)
    const stopAt = Number.isFinite(tc) ? tc * 3 : halfLife(s.params.temperatureC) * 3
    if (s.time >= stopAt) setRunning(false)
  }, running)
  useTicker(12, running)

  const restart = useCallback((p: Partial<ReactionParams> = {}) => {
    sim.current.reset(p)
    log.current = [sample(sim.current)]
    setRunning(false)
    force((n) => n + 1)
  }, [])

  const togglePlay = useCallback(() => {
    const s = sim.current
    const tc = crossTime(s.params)
    // Finished runs start again from fresh solutions.
    if (!running && Number.isFinite(tc) && s.time >= tc * 3) restart()
    setRunning((r) => !r)
  }, [running, restart])

  const s = sim.current
  const tc = crossTime(s.params)
  return {
    sim: s,
    running,
    togglePlay,
    reset: () => restart(),
    speed,
    setSpeed,
    concentration,
    setConcentration: (c: number) => {
      setConcentrationState(c)
      restart({ concentration: c })
    },
    temperatureC,
    setTemperature: (T: number) => {
      setTemperatureState(T)
      restart({ temperatureC: T })
    },
    trials,
    clearTrials: () => setTrials([]),
    // derived
    time: s.time,
    thiosulfate: s.thiosulfate,
    sulfur: s.sulfur,
    rate: s.rate,
    visibility: s.visibility,
    turbidity: s.turbidity,
    crossVanishedAt: s.crossVanishedAt,
    predictedCrossTime: tc,
    k: rateConstant(s.params.temperatureC),
    halfLife: halfLife(s.params.temperatureC),
    log: log.current.slice(),
    fullLog: log,
  }
}

export type ReactionRateController = ReturnType<typeof useReactionRate>
