/**
 * Newton's laws engine: a cart on a straight, level track.
 *
 *   F_net = F − f        a = F_net / m        (second law)
 *
 * Friction is a simple Coulomb model with one coefficient μ for both the
 * static and the kinetic case:
 *   - at rest, friction cancels the applied force up to μmg, so the cart only
 *     starts to move once F > μmg;
 *   - while moving, friction has the constant size μmg and opposes the motion.
 * With no applied force and no friction the cart keeps its velocity (first law).
 * Within a step the acceleration is constant, so the motion is integrated
 * exactly; a step in which friction would reverse the cart is split at the
 * moment it stops.
 */

export const G = 9.81

export interface CartParams {
  /** Applied (pushing) force in newtons, along +x. */
  force: number
  /** Mass of the cart and its load, kg (> 0). */
  mass: number
  /** Coefficient of friction between the wheels and the track (0 = frictionless). */
  friction: number
  /** Whether the applied force is currently acting. */
  pushing: boolean
  gravity?: number
}

export interface CartState {
  time: number
  x: number
  v: number
}

const EPS = 1e-9

/** Largest friction force the track can provide, μ·m·g. */
export function maxFriction(p: Pick<CartParams, 'mass' | 'friction' | 'gravity'>): number {
  return p.friction * p.mass * (p.gravity ?? G)
}

/** Applied force actually acting (0 while not pushing). */
export function appliedForce(p: CartParams): number {
  return p.pushing ? p.force : 0
}

/** Friction force (signed, along x) for a cart moving with velocity v. */
export function frictionForce(p: CartParams, v: number): number {
  const fMax = maxFriction(p)
  const F = appliedForce(p)
  if (Math.abs(v) > EPS) return -Math.sign(v) * fMax
  // Static: cancels the applied force as long as it can.
  if (Math.abs(F) <= fMax) return -F
  return -Math.sign(F) * fMax
}

export function netForce(p: CartParams, v = 0): number {
  return appliedForce(p) + frictionForce(p, v)
}

/** Acceleration a = F_net / m. */
export function acceleration(p: CartParams, v = 0): number {
  if (!(p.mass > 0)) throw new RangeError('Mass must be greater than zero')
  return netForce(p, v) / p.mass
}

/** Advances the cart by dt seconds; returns the new state. */
export function stepCart(p: CartParams, s: CartState, dt: number): CartState {
  let { time, x, v } = s
  let left = dt
  // At most two segments: moving until friction stops the cart, then at rest.
  for (let i = 0; i < 3 && left > 0; i++) {
    const a = acceleration(p, v)
    if (Math.abs(v) > EPS && Math.sign(a) !== Math.sign(v) && a !== 0) {
      const tStop = -v / a
      if (tStop < left) {
        x += v * tStop + 0.5 * a * tStop * tStop
        time += tStop
        left -= tStop
        v = 0
        continue
      }
    }
    x += v * left + 0.5 * a * left * left
    v += a * left
    time += left
    left = 0
  }
  return { time, x, v }
}

export interface CartSample extends CartState {
  a: number
}

/** A cart on a track of fixed length; it stops at the buffer at the far end. */
export class CartSimulation {
  params: CartParams
  state: CartState = { time: 0, x: 0, v: 0 }
  finished = false

  constructor(
    params: CartParams,
    readonly trackLength = 12,
  ) {
    this.params = { ...params }
  }

  get time() {
    return this.state.time
  }
  get x() {
    return this.state.x
  }
  get v() {
    return this.state.v
  }
  get a() {
    return this.finished ? 0 : acceleration(this.params, this.state.v)
  }

  setParams(p: Partial<CartParams>) {
    this.params = { ...this.params, ...p }
  }

  reset(p: Partial<CartParams> = {}) {
    this.setParams(p)
    this.state = { time: 0, x: 0, v: 0 }
    this.finished = false
  }

  /** Returns true on the step in which the cart reaches the end of the track. */
  advance(dt: number): boolean {
    if (this.finished || dt <= 0) return false
    const next = stepCart(this.params, this.state, dt)
    if (next.x >= this.trackLength) {
      // Solve for the moment the front reaches the buffer.
      const a = acceleration(this.params, this.state.v)
      const d = this.trackLength - this.state.x
      const v0 = this.state.v
      const tHit = Math.abs(a) < EPS ? d / v0 : (-v0 + Math.sqrt(Math.max(0, v0 * v0 + 2 * a * d))) / a
      this.state = { time: this.state.time + tHit, x: this.trackLength, v: v0 + a * tHit }
      this.finished = true
      return true
    }
    this.state = next.x < 0 ? { ...next, x: 0, v: 0 } : next
    return false
  }
}

/** a–F line for a fixed mass and friction (a = 0 until F exceeds μmg). */
export function accelerationVsForce(mass: number, friction: number, fMax: number, points = 41) {
  return Array.from({ length: points }, (_, i) => {
    const F = (fMax * i) / (points - 1)
    return { force: F, acceleration: acceleration({ force: F, mass, friction, pushing: true }, 0) }
  })
}

/** a–m curve for a fixed applied force and friction. */
export function accelerationVsMass(force: number, friction: number, mMin: number, mMax: number, points = 60) {
  return Array.from({ length: points }, (_, i) => {
    const m = mMin + ((mMax - mMin) * i) / (points - 1)
    return { mass: m, acceleration: acceleration({ force, mass: m, friction, pushing: true }, 0) }
  })
}

/** Time to cover distance d from rest under constant acceleration a (Infinity if a ≤ 0). */
export function timeToCover(distance: number, a: number): number {
  return a > 0 ? Math.sqrt((2 * distance) / a) : Infinity
}
