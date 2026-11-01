/**
 * Simple pendulum engine.
 *
 * Model: an ideal point mass on a massless, inextensible string, no air resistance.
 * Equation of motion (nonlinear):   θ'' + (g / L) · sin θ = 0
 * Integrated with classic 4th-order Runge–Kutta (RK4), which keeps the energy
 * error tiny at the fixed step sizes used by the simulation (≤ 1/240 s).
 *
 * Periods:
 *  - small-angle approximation: T₀ = 2π √(L / g)
 *  - exact (any amplitude θ₀ < π): T = 2π √(L / g) / AGM(1, cos(θ₀ / 2))
 *    (equivalent to 4 √(L/g) · K(sin(θ₀/2)), computed with the arithmetic–geometric mean)
 */

export interface PendulumParams {
  /** String length in metres. */
  length: number
  /** Gravitational acceleration in m/s². */
  gravity: number
}

export interface PendulumState {
  /** Angle from vertical in radians (positive = to the right). */
  theta: number
  /** Angular velocity in rad/s. */
  omega: number
}

export const degToRad = (deg: number) => (deg * Math.PI) / 180
export const radToDeg = (rad: number) => (rad * 180) / Math.PI

/** Angular acceleration θ'' = −(g/L) sin θ. */
export function angularAcceleration(theta: number, p: PendulumParams): number {
  return -(p.gravity / p.length) * Math.sin(theta)
}

/** Advance the state by dt seconds with one RK4 step. */
export function rk4Step(s: PendulumState, p: PendulumParams, dt: number): PendulumState {
  const k1t = s.omega
  const k1w = angularAcceleration(s.theta, p)
  const k2t = s.omega + (dt / 2) * k1w
  const k2w = angularAcceleration(s.theta + (dt / 2) * k1t, p)
  const k3t = s.omega + (dt / 2) * k2w
  const k3w = angularAcceleration(s.theta + (dt / 2) * k2t, p)
  const k4t = s.omega + dt * k3w
  const k4w = angularAcceleration(s.theta + dt * k3t, p)
  return {
    theta: s.theta + (dt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t),
    omega: s.omega + (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w),
  }
}

/** Small-angle period T₀ = 2π√(L/g), in seconds. */
export function smallAnglePeriod(p: PendulumParams): number {
  return 2 * Math.PI * Math.sqrt(p.length / p.gravity)
}

/** Arithmetic–geometric mean of a and b. */
export function agm(a: number, b: number): number {
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15 * a; i++) {
    const an = (a + b) / 2
    b = Math.sqrt(a * b)
    a = an
  }
  return a
}

/** Exact period for release from rest at amplitude θ₀ (radians, 0 ≤ θ₀ < π). */
export function exactPeriod(p: PendulumParams, amplitude: number): number {
  const a = Math.min(Math.abs(amplitude), Math.PI - 1e-9)
  return smallAnglePeriod(p) / agm(1, Math.cos(a / 2))
}

/** Relative error (%) of the small-angle period compared with the exact period. */
export function smallAngleErrorPercent(p: PendulumParams, amplitude: number): number {
  const exact = exactPeriod(p, amplitude)
  return ((exact - smallAnglePeriod(p)) / exact) * 100
}

/** Small-angle approximation is considered valid when its period error is below 1 % (θ₀ ≲ 23°). */
export function isSmallAngleValid(p: PendulumParams, amplitude: number, tolerancePercent = 1): boolean {
  return smallAngleErrorPercent(p, amplitude) < tolerancePercent
}

/** Mechanical energy per unit mass (J/kg), with the pivot as reference height. */
export function energyPerMass(s: PendulumState, p: PendulumParams): number {
  const kinetic = 0.5 * (p.length * s.omega) ** 2
  const potential = p.gravity * p.length * (1 - Math.cos(s.theta))
  return kinetic + potential
}

/** Maximum angular speed reached at the bottom for release from rest at θ₀ (energy conservation). */
export function maxAngularSpeed(p: PendulumParams, amplitude: number): number {
  return Math.sqrt((2 * p.gravity * (1 - Math.cos(amplitude))) / p.length)
}

export interface PendulumSample {
  t: number
  thetaDeg: number
  omega: number
}

/**
 * Stateful simulation used by the UI: fixed-step RK4 integration,
 * oscillation counting and measured period (time between successive
 * upward zero crossings).
 */
export class PendulumSimulation {
  params: PendulumParams
  state: PendulumState
  amplitude: number
  time = 0
  oscillations = 0
  measuredPeriod: number | null = null
  private lastCrossing: number | null = null
  private accumulator = 0
  readonly fixedDt: number

  constructor(params: PendulumParams, amplitude: number, fixedDt = 1 / 480) {
    this.params = { ...params }
    this.amplitude = amplitude
    this.state = { theta: amplitude, omega: 0 }
    this.fixedDt = fixedDt
  }

  reset(amplitude = this.amplitude) {
    this.amplitude = amplitude
    this.state = { theta: amplitude, omega: 0 }
    this.time = 0
    this.oscillations = 0
    this.measuredPeriod = null
    this.lastCrossing = null
    this.accumulator = 0
  }

  setParams(params: Partial<PendulumParams>) {
    this.params = { ...this.params, ...params }
    // A new length or gravity gives a new period: restart the period measurement.
    this.lastCrossing = null
    this.measuredPeriod = null
  }

  /** Advance simulated time by `elapsed` seconds; calls onSample at each fixed step. */
  advance(elapsed: number, onStep?: (t: number, s: PendulumState) => void) {
    this.accumulator += elapsed
    while (this.accumulator >= this.fixedDt) {
      const prev = this.state
      const next = rk4Step(prev, this.params, this.fixedDt)
      const tNext = this.time + this.fixedDt
      // Upward zero crossing: θ goes from negative to non-negative while moving right.
      if (prev.theta < 0 && next.theta >= 0) {
        const frac = prev.theta / (prev.theta - next.theta)
        const tc = this.time + frac * this.fixedDt
        if (this.lastCrossing !== null) this.measuredPeriod = tc - this.lastCrossing
        this.lastCrossing = tc
        this.oscillations += 1
      }
      this.state = next
      this.time = tNext
      this.accumulator -= this.fixedDt
      onStep?.(this.time, this.state)
    }
  }
}

/** Period-vs-length table for charts. */
export function periodVsLength(gravity: number, amplitude: number, lengths: number[]) {
  return lengths.map((L) => ({
    length: L,
    smallAngle: smallAnglePeriod({ length: L, gravity }),
    exact: exactPeriod({ length: L, gravity }, amplitude),
  }))
}
