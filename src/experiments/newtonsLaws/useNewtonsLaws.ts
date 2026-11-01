import { useCallback, useRef, useState } from 'react'
import { CartSimulation, acceleration, appliedForce, frictionForce, netForce, type CartParams } from '../../engines/newtonsLaws'
import { useSimLoop } from '../shared/lab'

export const F_MAX = 40
export const M_MIN = 0.5
export const M_MAX = 10
export const MU_MAX = 0.5
export const TRACK = 12
export const SPEEDS = [0.25, 0.5, 1, 2]

export interface CartSample {
  t: number
  x: number
  v: number
}

export interface CartRun {
  n: number
  force: number
  mass: number
  friction: number
  /** Time to reach the end of the track, s. */
  time: number
  /** Measured acceleration from x = ½at² (valid for a constant push from rest). */
  acceleration: number
  /** Whether the push acted for the whole run. */
  steady: boolean
}

const DEFAULTS: CartParams = { force: 10, mass: 2, friction: 0.05, pushing: true }

/** One cart on a 12 m track. Runs are logged when the cart reaches the buffer. */
export function useNewtonsLaws() {
  const [, setParamsState] = useState<CartParams>(DEFAULTS)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [runs, setRuns] = useState<CartRun[]>([])
  const sim = useRef<CartSimulation>(null as unknown as CartSimulation)
  if (!sim.current) sim.current = new CartSimulation(DEFAULTS, TRACK)
  const log = useRef<CartSample[]>([{ t: 0, x: 0, v: 0 }])
  const steady = useRef(true)
  const runCount = useRef(0)
  const [, force] = useState(0)

  useSimLoop((dt) => {
    const s = sim.current
    const hit = s.advance(dt * speed)
    const last = log.current[log.current.length - 1]
    if (hit || s.time - last.t >= 0.05) log.current.push({ t: s.time, x: s.x, v: s.v })
    if (hit) {
      runCount.current += 1
      const p = s.params
      const n = runCount.current
      setRuns((rs) =>
        [
          ...rs,
          { n, force: p.force, mass: p.mass, friction: p.friction, time: s.time, acceleration: (2 * TRACK) / (s.time * s.time), steady: steady.current },
        ].slice(-40),
      )
      setRunning(false)
    }
    // A cart that has stopped and is not being pushed hard enough will never move again.
    if (!hit && s.v === 0 && s.time > 0 && acceleration(s.params, 0) === 0) setRunning(false)
  }, running)

  const restart = useCallback(() => {
    sim.current.reset()
    log.current = [{ t: 0, x: 0, v: 0 }]
    steady.current = sim.current.params.pushing
    setRunning(false)
    force((n) => n + 1)
  }, [])

  const update = (p: Partial<CartParams>) => {
    const next = { ...sim.current.params, ...p }
    sim.current.setParams(next)
    if (sim.current.time > 0 && (p.force !== undefined || p.mass !== undefined || p.friction !== undefined || p.pushing === false)) steady.current = false
    setParamsState(next)
  }

  const togglePlay = () => {
    const s = sim.current
    if (!running && (s.finished || (s.v === 0 && s.time > 0))) {
      restart()
      setRunning(true)
      return
    }
    if (!running && s.time === 0) steady.current = s.params.pushing
    setRunning((r) => !r)
  }

  const s = sim.current
  const p = s.params
  return {
    sim: s,
    params: p,
    setForce: (force: number) => update({ force }),
    setMass: (mass: number) => update({ mass }),
    setFriction: (friction: number) => update({ friction }),
    setPushing: (pushing: boolean) => update({ pushing }),
    running,
    togglePlay,
    reset: restart,
    speed,
    setSpeed,
    runs,
    clearRuns: () => setRuns([]),
    time: s.time,
    x: s.x,
    v: s.v,
    a: acceleration(p, s.v),
    applied: appliedForce(p),
    friction: frictionForce(p, s.v),
    net: netForce(p, s.v),
    finished: s.finished,
    log: log.current.slice(),
  }
}

export type NewtonsController = ReturnType<typeof useNewtonsLaws>
