/**
 * Hooke's law engine: a vertical spring loaded with slotted masses.
 *
 *   F = k x       (up to the elastic limit F_e)
 *
 * Beyond the elastic limit the spring is modelled as elastic–linear-hardening:
 * while the load grows past F_e the extension increases with a smaller
 * stiffness k_p = k/2, and unloading follows the original stiffness k from
 * the largest load reached. So after overloading the spring keeps a permanent
 * extension (permanent set) of
 *
 *   x_p = (F_max − F_e) · (1/k_p − 1/k)
 *
 * The bobbing motion when a mass is added is a lightly damped oscillation
 * about the new equilibrium, for the animation only.
 */

export const G = 9.81
export const PLASTIC_RATIO = 0.5

export interface Spring {
  id: 'soft' | 'medium' | 'stiff'
  /** Spring constant, N/m. */
  k: number
  /** Elastic limit, N. */
  limit: number
  /** Unstretched length, m. */
  length: number
}

export const SPRINGS: Spring[] = [
  { id: 'soft', k: 15, limit: 4.5, length: 0.15 },
  { id: 'medium', k: 30, limit: 6.5, length: 0.15 },
  { id: 'stiff', k: 60, limit: 8.5, length: 0.15 },
]

export const springById = (id: Spring['id']) => SPRINGS.find((s) => s.id === id) ?? SPRINGS[1]

export const weight = (massKg: number, gravity = G) => massKg * gravity

/** Permanent extension after the spring has carried at most `maxForce`. */
export function permanentSet(spring: Spring, maxForce: number): number {
  const over = Math.max(0, maxForce - spring.limit)
  return over * (1 / (spring.k * PLASTIC_RATIO) - 1 / spring.k)
}

/**
 * Static extension (m) under `force`, given the largest force the spring has
 * carried so far (including this one).
 */
export function extension(spring: Spring, force: number, maxForce = force): number {
  const fMax = Math.max(force, maxForce)
  return permanentSet(spring, fMax) + force / spring.k
}

/** Elastic potential energy ½kx² stored for a (linear) extension x. */
export const elasticEnergy = (k: number, x: number) => 0.5 * k * x * x

/** Spring constant from two readings, k = ΔF/Δx. */
export function stiffnessFrom(readings: { force: number; extension: number }[]): number | null {
  // Least-squares slope through the origin: k = Σ F x / Σ x².
  let sxx = 0
  let sfx = 0
  for (const r of readings) {
    sxx += r.extension * r.extension
    sfx += r.force * r.extension
  }
  return sxx > 0 ? sfx / sxx : null
}

/** Force–extension curve for loading from 0 to fMax on a fresh spring. */
export function loadingCurve(spring: Spring, fMax: number, points = 60) {
  return Array.from({ length: points }, (_, i) => {
    const F = (fMax * i) / (points - 1)
    return { force: F, extension: extension(spring, F) }
  })
}

/** Lightly damped bobbing of the hanging mass about its equilibrium. */
export class SpringSystem {
  spring: Spring
  massKg = 0
  maxForce = 0
  /** Current extension and its rate of change. */
  x = 0
  v = 0
  gravity = G

  constructor(spring: Spring) {
    this.spring = spring
  }

  get force() {
    return weight(this.massKg, this.gravity)
  }
  get equilibrium() {
    return extension(this.spring, this.force, this.maxForce)
  }
  get overLimit() {
    return this.maxForce > this.spring.limit + 1e-9
  }
  get set() {
    return permanentSet(this.spring, this.maxForce)
  }

  setMass(massKg: number) {
    this.massKg = Math.max(0, massKg)
    this.maxForce = Math.max(this.maxForce, this.force)
  }

  /** A fresh spring of the given kind, unloaded. */
  replace(spring: Spring) {
    this.spring = spring
    this.maxForce = this.force
    this.x = this.equilibrium
    this.v = 0
  }

  advance(dt: number) {
    const m = Math.max(this.massKg, 0.02) + 0.01 // hanger
    const w = Math.sqrt(this.spring.k / m)
    const zeta = 0.08
    let left = Math.min(dt, 0.25)
    const h = 1 / 600
    while (left > 0) {
      const step = Math.min(h, left)
      const a = -w * w * (this.x - this.equilibrium) - 2 * zeta * w * this.v
      this.v += a * step
      this.x += this.v * step
      left -= step
    }
  }

  settle() {
    this.x = this.equilibrium
    this.v = 0
  }
}
