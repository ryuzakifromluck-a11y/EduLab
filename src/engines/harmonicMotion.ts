/**
 * Simple harmonic motion of a mass on a horizontal spring, with optional
 * viscous damping. Closed-form (no integrator needed):
 *
 *   m ẍ + b ẋ + k x = 0,   ω₀ = √(k/m),   ζ = b / (2√(km)),   γ = ζω₀
 *   x(t) = A e^(−γt) cos(ω_d t + φ),       ω_d = ω₀ √(1 − ζ²)
 *
 * Only the under-damped case (ζ < 1) is modelled. With ζ = 0 this is ideal
 * SHM: x = A cos(ωt + φ), the projection of uniform circular motion.
 */

export interface ShmParams {
  /** Mass in kg (> 0). */
  mass: number
  /** Spring constant in N/m (> 0). */
  k: number
  /** Amplitude in metres. */
  amplitude: number
  /** Damping ratio ζ, 0 ≤ ζ < 1. */
  damping: number
  /** Initial phase φ in degrees. */
  phaseDeg: number
}

export interface ShmState {
  x: number
  v: number
  a: number
}

export const angularFrequency = (p: Pick<ShmParams, 'mass' | 'k'>) => {
  if (!(p.mass > 0) || !(p.k > 0)) throw new RangeError('Mass and spring constant must be greater than zero')
  return Math.sqrt(p.k / p.mass)
}

/** Period of the undamped oscillator T = 2π√(m/k). */
export const period = (p: Pick<ShmParams, 'mass' | 'k'>) => (2 * Math.PI) / angularFrequency(p)
export const frequency = (p: Pick<ShmParams, 'mass' | 'k'>) => 1 / period(p)

export function dampedAngularFrequency(p: ShmParams): number {
  const z = Math.min(Math.max(p.damping, 0), 0.999)
  return angularFrequency(p) * Math.sqrt(1 - z * z)
}

export function decayRate(p: ShmParams): number {
  return Math.max(0, p.damping) * angularFrequency(p)
}

export const phaseRad = (p: Pick<ShmParams, 'phaseDeg'>) => (p.phaseDeg * Math.PI) / 180

/** Position, velocity and acceleration at time t. */
export function stateAt(p: ShmParams, t: number): ShmState {
  const g = decayRate(p)
  const wd = dampedAngularFrequency(p)
  const phi = phaseRad(p)
  const env = p.amplitude * Math.exp(-g * t)
  const c = Math.cos(wd * t + phi)
  const s = Math.sin(wd * t + phi)
  const x = env * c
  const v = env * (-g * c - wd * s)
  const w0 = angularFrequency(p)
  // From the equation of motion: a = −(k x + b v)/m = −ω₀² x − 2γ v.
  const a = -w0 * w0 * x - 2 * g * v
  return { x, v, a }
}

/** Kinetic, elastic potential and total mechanical energy in joules. */
export function energies(p: ShmParams, s: Pick<ShmState, 'x' | 'v'>) {
  const kinetic = 0.5 * p.mass * s.v * s.v
  const potential = 0.5 * p.k * s.x * s.x
  return { kinetic, potential, total: kinetic + potential }
}

/** Energy of the undamped motion, ½kA². */
export const totalEnergy = (p: ShmParams) => 0.5 * p.k * p.amplitude * p.amplitude

/** Largest speed and acceleration of the undamped motion: Aω and Aω². */
export function maxima(p: ShmParams) {
  const w = angularFrequency(p)
  return { vMax: p.amplitude * w, aMax: p.amplitude * w * w }
}

/** x, v, a samples over [t0, t0 + span]. */
export function timeSeries(p: ShmParams, t0: number, span: number, points = 200) {
  return Array.from({ length: points }, (_, i) => {
    const t = t0 + (span * i) / (points - 1)
    return { t, ...stateAt(p, t) }
  })
}

/** Period as a function of mass for a fixed spring. */
export function periodVsMass(k: number, mMin: number, mMax: number, points = 50) {
  return Array.from({ length: points }, (_, i) => {
    const m = mMin + ((mMax - mMin) * i) / (points - 1)
    return { mass: m, period: period({ mass: m, k }) }
  })
}
