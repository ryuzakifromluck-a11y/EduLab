import { useCallback, useRef, useState } from 'react'
import { BALL_MASS, BallisticRig, PENDULUM, heightFromAngle, launchSpeedFromAngle, launcherSpeed, scatter, shot, speedAfter, type Range } from '../../engines/ballisticPendulum'
import { useSimLoop } from '../shared/lab'

export const SPEEDS = [0.05, 0.1, 0.25, 1]

export interface ShotRecord {
  n: number
  range: Range
  blockMass: number
  /** Caught angle, deg. */
  angle: number
  /** Rise of the centre of mass, m. */
  h: number
  /** Launch speed worked out from the swing, m/s. */
  v: number
  /** Speed the gun actually gave the ball, m/s. */
  vTrue: number
}

export function useBallisticPendulum() {
  const [range, setRange] = useState<Range>('medium')
  const [blockMass, setBlockMassState] = useState(PENDULUM.M * 1000) // g
  const [speed, setSpeed] = useState(0.1)
  const [running, setRunning] = useState(false)
  const [shots, setShots] = useState<ShotRecord[]>([])
  const count = useRef(0)
  const rig = useRef<BallisticRig>(null as unknown as BallisticRig)
  if (!rig.current) rig.current = new BallisticRig({ ...PENDULUM })
  const r = rig.current

  const step = useCallback(
    (dt: number) => {
      const before = r.phase
      r.advance(dt * speed)
      if (before !== 'done' && r.phase === 'done') {
        const theta = r.caught
        const rec: ShotRecord = {
          n: count.current,
          range,
          blockMass,
          angle: (theta * 180) / Math.PI,
          h: heightFromAngle(theta, r.p.L),
          v: launchSpeedFromAngle(theta, r.m, r.p.M, r.p.L),
          vTrue: r.v,
        }
        setShots((s) => [...s, rec].slice(-40))
        setRunning(false)
      }
    },
    [r, speed, range, blockMass],
  )
  useSimLoop(step, running, 20)

  const fire = () => {
    count.current += 1
    r.fire(launcherSpeed(range) * scatter(count.current))
    setRunning(true)
  }

  const nominal = shot(launcherSpeed(range), BALL_MASS, r.p)
  const ownShots = shots.filter((s) => s.range === range && s.blockMass === blockMass)
  const average = ownShots.length ? ownShots.reduce((a, s) => a + s.v, 0) / ownShots.length : null
  const last = shots.length ? shots[shots.length - 1] : null
  const theta = r.phase === 'ready' ? 0 : r.caught

  return {
    rig: r,
    range,
    setRange: (x: Range) => {
      setRange(x)
      r.reset()
      setRunning(false)
    },
    blockMass,
    setBlockMass: (g: number) => {
      setBlockMassState(g)
      r.p.M = g / 1000
      r.reset()
      setRunning(false)
    },
    ballMass: BALL_MASS,
    L: r.p.L,
    phase: r.phase,
    fire,
    running,
    togglePlay: () => {
      if (r.phase === 'flying' || r.phase === 'swinging') setRunning((x) => !x)
      else fire()
    },
    speed,
    setSpeed,
    reset: () => {
      r.reset()
      setRunning(false)
    },
    /** Live caught angle in degrees (0 before firing). */
    angle: (theta * 180) / Math.PI,
    height: heightFromAngle(theta, r.p.L),
    V: r.phase === 'swinging' || r.phase === 'done' ? speedAfter(r.m, r.v, r.p.M) : 0,
    vFromSwing: r.phase === 'done' ? launchSpeedFromAngle(r.caught, r.m, r.p.M, r.p.L) : null,
    nominal,
    shots,
    ownShots,
    average,
    last,
    clearShots: () => setShots([]),
  }
}

export type BallisticController = ReturnType<typeof useBallisticPendulum>
