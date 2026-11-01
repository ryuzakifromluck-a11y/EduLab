/**
 * Ballistic pendulum.
 *
 * A ball of mass m leaves a spring gun with speed v and sticks in a pendulum
 * block of mass M (a perfectly inelastic collision). Momentum is conserved
 * during the very short impact:
 *
 *   m v = (M + m) V          →  V = m v / (M + m)
 *
 * Afterwards the pendulum swings up and kinetic energy turns into potential
 * energy:
 *
 *   ½ (M + m) V² = (M + m) g h   →  h = V² / 2g
 *
 * With the pendulum arm of length L (pivot to centre of mass), h = L(1 − cos θ).
 * Putting both together gives the launch speed from the measured swing:
 *
 *   v = (M + m)/m · √(2 g h)
 *
 * The gun has three settings (short, medium and long range). Kinetic energy is
 * not conserved in the impact: only the fraction m/(M + m) survives.
 */

export const G = 9.81

export type Range = 'short' | 'medium' | 'long'

export interface Launcher {
  id: Range
  /** Nominal muzzle speed, m/s. */
  speed: number
}

export const LAUNCHER: Launcher[] = [
  { id: 'short', speed: 3.0 },
  { id: 'medium', speed: 4.5 },
  { id: 'long', speed: 6.0 },
]
export const launcherSpeed = (r: Range) => LAUNCHER.find((l) => l.id === r)?.speed ?? 4.5

export interface Pendulum {
  /** Block (catcher) mass, kg. */
  M: number
  /** Pivot to centre of mass, m. */
  L: number
}
export const PENDULUM: Pendulum = { M: 0.25, L: 0.3 }
export const BALL_MASS = 0.065 // kg

/** Speed of block + ball just after impact. */
export const speedAfter = (m: number, v: number, M: number) => (m * v) / (M + m)

/** Rise of the centre of mass for a speed V after impact. */
export const riseFor = (V: number, g = G) => (V * V) / (2 * g)

/** Height from the swing angle θ (rad) for arm length L. */
export const heightFromAngle = (theta: number, L: number) => L * (1 - Math.cos(theta))

/** Swing angle (rad) for a rise h, or π/2+ if the pendulum would go over the top of the scale. */
export function angleFromHeight(h: number, L: number): number {
  const c = 1 - h / L
  if (c <= -1) return Math.PI
  return Math.acos(Math.max(-1, Math.min(1, c)))
}

/** v = (M + m)/m · √(2 g h). */
export const launchSpeedFromHeight = (h: number, m: number, M: number, g = G) => ((M + m) / m) * Math.sqrt(2 * g * Math.max(0, h))

export const launchSpeedFromAngle = (theta: number, m: number, M: number, L: number, g = G) =>
  launchSpeedFromHeight(heightFromAngle(theta, L), m, M, g)

/** Fraction of the ball's kinetic energy kept after the inelastic impact, m/(M+m). */
export const keptFraction = (m: number, M: number) => m / (M + m)

export interface Shot {
  v: number
  V: number
  h: number
  theta: number
  keBefore: number
  keAfter: number
}

export function shot(v: number, m = BALL_MASS, p: Pendulum = PENDULUM, g = G): Shot {
  const V = speedAfter(m, v, p.M)
  const h = riseFor(V, g)
  return { v, V, h, theta: angleFromHeight(h, p.L), keBefore: 0.5 * m * v * v, keAfter: 0.5 * (p.M + m) * V * V }
}

/** Small reproducible shot-to-shot scatter of a spring gun (±spread), from a seed. */
export function scatter(seed: number, spread = 0.02): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return 1 + spread * (2 * (x - Math.floor(x)) - 1)
}

/**
 * Pendulum swing after impact (θ'' = −g/L sin θ, light damping) with the
 * ratchet that holds the highest angle reached, as on a real apparatus.
 */
export class BallisticRig {
  p: Pendulum
  m = BALL_MASS
  theta = 0
  omega = 0
  /** Highest angle the ratchet has caught, rad. */
  caught = 0
  /** Ball position along the flight path: 0 at muzzle, 1 at the block; null when loaded. */
  flight: number | null = null
  v = 0
  /** Distance from muzzle to block, m. */
  gap = 0.25
  phase: 'ready' | 'flying' | 'swinging' | 'done' = 'ready'
  gravity = G

  constructor(p: Pendulum = PENDULUM) {
    this.p = p
  }

  fire(v: number) {
    this.reset()
    this.v = v
    this.flight = 0
    this.phase = 'flying'
  }

  reset() {
    this.theta = 0
    this.omega = 0
    this.caught = 0
    this.flight = null
    this.phase = 'ready'
  }

  advance(dt: number) {
    let left = Math.min(dt, 0.25)
    const h = 1 / 1000
    while (left > 0) {
      const step = Math.min(h, left)
      if (this.phase === 'flying' && this.flight !== null) {
        this.flight += (this.v * step) / this.gap
        if (this.flight >= 1) {
          this.flight = 1
          this.omega = speedAfter(this.m, this.v, this.p.M) / this.p.L
          this.phase = 'swinging'
        }
      } else if (this.phase === 'swinging') {
        const a = -(this.gravity / this.p.L) * Math.sin(this.theta) - 0.15 * this.omega
        this.omega += a * step
        this.theta += this.omega * step
        if (this.theta > this.caught) this.caught = this.theta
        // The ratchet catches the pendulum at the top of the swing.
        if (this.omega <= 0 && this.caught > 0) {
          this.theta = this.caught
          this.omega = 0
          this.phase = 'done'
        }
      }
      left -= step
    }
  }
}
