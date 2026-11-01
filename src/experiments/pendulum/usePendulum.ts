import { useCallback, useMemo, useRef, useState } from 'react'
import {
  PendulumSimulation,
  degToRad,
  exactPeriod,
  isSmallAngleValid,
  radToDeg,
  smallAngleErrorPercent,
  smallAnglePeriod,
  type PendulumSample,
} from '../../engines/pendulum'
import { useAnimationFrame, useReducedMotion, useTicker } from '../../lib/hooks'

export const GRAVITY_PRESETS = [
  { id: 'earth', g: 9.81 },
  { id: 'moon', g: 1.62 },
  { id: 'mars', g: 3.71 },
  { id: 'jupiter', g: 24.79 },
] as const

export const SPEEDS = [0.25, 0.5, 1, 1.5, 2]

const SAMPLE_DT = 1 / 30 // seconds of simulated time between graph samples
const WINDOW = 12 // seconds visible in the live time-series charts
const MAX_LOG = 30 * 60 * 10 // ~10 min of samples kept for CSV export

/**
 * Owns the pendulum simulation. The integrator runs every animation frame
 * (independent of rendering); React re-renders at ~15 Hz to refresh numbers
 * and charts, while the 3D/2D views read `sim` directly each frame.
 */
export function usePendulum() {
  const reducedMotion = useReducedMotion()
  const [length, setLengthState] = useState(1.0)
  const [angleDeg, setAngleState] = useState(25)
  const [gravity, setGravityState] = useState(9.81)
  const [speed, setSpeed] = useState(1)
  const [trail, setTrail] = useState(true)
  const [running, setRunning] = useState(!reducedMotion)

  const sim = useRef<PendulumSimulation>(null as unknown as PendulumSimulation)
  if (!sim.current) sim.current = new PendulumSimulation({ length, gravity }, degToRad(angleDeg))
  const log = useRef<PendulumSample[]>([{ t: 0, thetaDeg: angleDeg, omega: 0 }])
  const nextSample = useRef(SAMPLE_DT)
  const [, force] = useState(0)

  useAnimationFrame((dt) => {
    sim.current.advance(dt * speed, (t, s) => {
      if (t >= nextSample.current) {
        nextSample.current += SAMPLE_DT
        log.current.push({ t, thetaDeg: radToDeg(s.theta), omega: s.omega })
        if (log.current.length > MAX_LOG) log.current.splice(0, log.current.length - MAX_LOG)
      }
    })
  }, running)
  useTicker(15, running)

  const clearLog = (theta: number) => {
    log.current = [{ t: 0, thetaDeg: theta, omega: 0 }]
    nextSample.current = SAMPLE_DT
  }

  const reset = useCallback(() => {
    sim.current.reset()
    clearLog(radToDeg(sim.current.amplitude))
    force((n) => n + 1)
  }, [])

  const setAngle = useCallback((deg: number) => {
    setAngleState(deg)
    sim.current.reset(degToRad(deg))
    clearLog(deg)
  }, [])

  const setLength = useCallback((L: number) => {
    setLengthState(L)
    sim.current.setParams({ length: L })
  }, [])

  const setGravity = useCallback((g: number) => {
    setGravityState(g)
    sim.current.setParams({ gravity: g })
  }, [])

  const s = sim.current
  const amplitude = degToRad(angleDeg)
  const params = { length, gravity }
  const T0 = smallAnglePeriod(params)
  const T = exactPeriod(params, amplitude)
  const lastT = log.current[log.current.length - 1].t
  const windowData = useMemo(
    () => log.current.filter((p) => p.t >= lastT - WINDOW),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastT, log.current.length],
  )

  return {
    sim: s,
    running,
    setRunning,
    togglePlay: () => setRunning((r) => !r),
    reset,
    speed,
    setSpeed,
    trail,
    setTrail,
    length,
    setLength,
    angleDeg,
    setAngle,
    gravity,
    setGravity,
    // derived
    theta: s.state.theta,
    omega: s.state.omega,
    time: s.time,
    oscillations: s.oscillations,
    measuredPeriod: s.measuredPeriod,
    smallAnglePeriod: T0,
    exactPeriod: T,
    frequency: 1 / T,
    smallAngleError: smallAngleErrorPercent(params, amplitude),
    smallAngleValid: isSmallAngleValid(params, amplitude),
    windowData,
    fullLog: log,
  }
}

export type PendulumController = ReturnType<typeof usePendulum>
