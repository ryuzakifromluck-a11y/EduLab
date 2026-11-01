import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ProjectileSimulation,
  TENNIS_BALL_DRAG,
  analyticPath,
  apexTime,
  flightTime,
  maxHeight,
  optimalAngleDeg,
  range,
  simulateFlight,
  type ProjectileParams,
  type ProjectileSample,
} from '../../engines/projectile'
import { useAnimationFrame, useTicker } from '../../lib/hooks'

export const GRAVITY_PRESETS = [
  { id: 'earth', g: 9.81 },
  { id: 'moon', g: 1.62 },
  { id: 'mars', g: 3.71 },
  { id: 'jupiter', g: 24.79 },
] as const

export const SPEEDS = [0.25, 0.5, 1, 2, 4]

const SAMPLE_DT = 1 / 60 // seconds of simulated time between path samples

export interface Shot {
  n: number
  speed: number
  angleDeg: number
  height: number
  gravity: number
  drag: boolean
  range: number
  maxHeight: number
  flightTime: number
}

/**
 * Owns the projectile simulation. The integrator runs every animation frame;
 * React re-renders at ~15 Hz for numbers and charts while the 3D/2D views read
 * `sim` directly. Any parameter change puts the projectile back on the launcher.
 */
export function useProjectile() {
  const [speed, setSpeedState] = useState(18)
  const [angleDeg, setAngleState] = useState(45)
  const [height, setHeightState] = useState(0)
  const [gravity, setGravityState] = useState(9.81)
  const [airResistance, setAirState] = useState(false)
  const [simSpeed, setSimSpeed] = useState(1)
  const [showPrediction, setShowPrediction] = useState(true)
  const [running, setRunning] = useState(false)
  const [shots, setShots] = useState<Shot[]>([])

  const params: ProjectileParams = useMemo(
    () => ({ speed, angleDeg, height, gravity, drag: airResistance ? TENNIS_BALL_DRAG : 0 }),
    [speed, angleDeg, height, gravity, airResistance],
  )

  const sim = useRef<ProjectileSimulation>(null as unknown as ProjectileSimulation)
  if (!sim.current) sim.current = new ProjectileSimulation(params)
  const log = useRef<ProjectileSample[]>([{ t: 0, ...sim.current.state }])
  const nextSample = useRef(SAMPLE_DT)
  const shotCount = useRef(0)
  const [, force] = useState(0)

  const restart = useCallback((p: ProjectileParams) => {
    sim.current.reset(p)
    log.current = [{ t: 0, ...sim.current.state }]
    nextSample.current = SAMPLE_DT
    setRunning(false)
    force((n) => n + 1)
  }, [])

  useAnimationFrame((dt) => {
    const s = sim.current
    const wasLanded = s.landed
    s.advance(dt * simSpeed, (t, st) => {
      if (t >= nextSample.current || s.landed) {
        nextSample.current += SAMPLE_DT
        log.current.push({ t, ...st })
      }
    })
    if (s.landed) setRunning(false)
    if (s.landed && !wasLanded) {
      shotCount.current += 1
      const n = shotCount.current
      const p = s.params
      setShots((xs) =>
        [
          ...xs,
          {
            n,
            speed: p.speed,
            angleDeg: p.angleDeg,
            height: p.height,
            gravity: p.gravity,
            drag: p.drag > 0,
            range: s.state.x,
            maxHeight: s.peak,
            flightTime: s.time,
          },
        ].slice(-30),
      )
    }
  }, running)
  useTicker(15, running)

  const launch = useCallback(() => {
    if (sim.current.landed) {
      sim.current.reset()
      log.current = [{ t: 0, ...sim.current.state }]
      nextSample.current = SAMPLE_DT
    }
    setRunning(true)
  }, [])

  const togglePlay = useCallback(() => {
    if (running) setRunning(false)
    else launch()
  }, [running, launch])

  const update = (patch: Partial<ProjectileParams>) => restart({ ...params, ...patch })

  // Prediction for the current settings (drag-free closed form, or a full integration with drag).
  const prediction = useMemo(() => {
    if (params.drag > 0) {
      const f = simulateFlight(params, 1 / 240, 1 / 30)
      return { range: f.range, maxHeight: f.maxHeight, flightTime: f.flightTime, path: f.path }
    }
    return { range: range(params), maxHeight: maxHeight(params), flightTime: flightTime(params), path: analyticPath(params) }
  }, [params])

  const s = sim.current
  return {
    sim: s,
    params,
    running,
    togglePlay,
    launch,
    reset: () => restart(params),
    simSpeed,
    setSimSpeed,
    showPrediction,
    setShowPrediction,
    speed,
    setSpeed: (v: number) => {
      setSpeedState(v)
      update({ speed: v })
    },
    angleDeg,
    setAngle: (v: number) => {
      setAngleState(v)
      update({ angleDeg: v })
    },
    height,
    setHeight: (v: number) => {
      setHeightState(v)
      update({ height: v })
    },
    gravity,
    setGravity: (v: number) => {
      setGravityState(v)
      update({ gravity: v })
    },
    airResistance,
    setAirResistance: (on: boolean) => {
      setAirState(on)
      update({ drag: on ? TENNIS_BALL_DRAG : 0 })
    },
    shots,
    clearShots: () => setShots([]),
    // derived
    time: s.time,
    x: s.state.x,
    y: s.state.y,
    vx: s.state.vx,
    vy: s.state.vy,
    velocity: Math.hypot(s.state.vx, s.state.vy),
    landed: s.landed,
    peak: s.peak,
    prediction,
    apexTime: apexTime(params),
    optimalAngle: optimalAngleDeg(params),
    path: log.current.slice(),
    fullLog: log,
  }
}

export type ProjectileController = ReturnType<typeof useProjectile>
