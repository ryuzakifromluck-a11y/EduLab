/**
 * Electromagnetic induction: a bar magnet moving along the axis of a coil.
 *
 * The magnet is modelled as a point magnetic dipole with moment μ (A·m²).
 * The flux through one circular turn of radius a, at axial distance z from
 * the dipole, is
 *
 *   Φ(z) = μ₀ μ a² / (2 (a² + z²)^{3/2})
 *
 * Faraday's law gives the EMF across the N-turn coil:
 *
 *   ε = −N dΦ/dt = −N (dΦ/dz) · v
 *
 * The magnet moves in and out of the coil as z(t) = z₀ + A sin(2πft). The
 * coil's resistance is ignored (no induced current loads the magnet).
 */

export const MU0 = 4 * Math.PI * 1e-7
/** Coil radius, m. */
export const COIL_RADIUS = 0.03
/** Centre of the magnet's travel, m from the coil centre. */
export const REST_OFFSET = 0.12
/** Amplitude of the magnet's travel, m. */
export const TRAVEL = 0.12

export interface InductionParams {
  /** Number of turns. */
  turns: number
  /** Magnetic dipole moment, A·m². */
  moment: number
  /** Frequency of the in-and-out motion, Hz (0 = magnet held still). */
  frequency: number
  /** +1: north pole faces the coil; −1: south pole faces it. */
  polarity: 1 | -1
}

/** Flux through one turn, Wb. */
export function fluxPerTurn(moment: number, z: number, a = COIL_RADIUS): number {
  return (MU0 * moment * a * a) / (2 * Math.pow(a * a + z * z, 1.5))
}

/** dΦ/dz for one turn, Wb/m. */
export function fluxGradient(moment: number, z: number, a = COIL_RADIUS): number {
  return (-3 * MU0 * moment * a * a * z) / (2 * Math.pow(a * a + z * z, 2.5))
}

/** Magnet position (m from the coil centre) and velocity (m/s) at time t. */
export function magnetMotion(frequency: number, t: number) {
  const w = 2 * Math.PI * frequency
  return { z: REST_OFFSET + TRAVEL * Math.sin(w * t), v: TRAVEL * w * Math.cos(w * t) }
}

/** Linked flux NΦ (Wb-turns), signed by the polarity. */
export function linkedFlux(p: InductionParams, z: number): number {
  return p.polarity * p.turns * fluxPerTurn(p.moment, z)
}

/** Induced EMF in volts for a magnet at z moving with velocity v. */
export function emf(p: InductionParams, z: number, v: number): number {
  return -p.polarity * p.turns * fluxGradient(p.moment, z) * v
}

export function emfAt(p: InductionParams, t: number) {
  const { z, v } = magnetMotion(p.frequency, t)
  return { z, v, flux: linkedFlux(p, z), emf: emf(p, z, v) }
}

/** Largest |EMF| over one cycle (numerically sampled). */
export function peakEmf(p: InductionParams, samples = 720): number {
  if (p.frequency <= 0) return 0
  const T = 1 / p.frequency
  let best = 0
  for (let i = 0; i < samples; i++) best = Math.max(best, Math.abs(emfAt(p, (T * i) / samples).emf))
  return best
}

/** Peak EMF as a function of frequency for the current coil and magnet (linear in f). */
export function peakVsFrequency(p: InductionParams, fMax: number, points = 21) {
  const unit = peakEmf({ ...p, frequency: 1 })
  return Array.from({ length: points }, (_, i) => {
    const f = (fMax * i) / (points - 1)
    return { frequency: f, peak: unit * f }
  })
}

/** Time-stepped magnet with a phase accumulator, so frequency changes are smooth. */
export class InductionSimulation {
  params: InductionParams
  time = 0
  phase = 0

  constructor(params: InductionParams) {
    this.params = { ...params }
  }

  setParams(p: Partial<InductionParams>) {
    this.params = { ...this.params, ...p }
  }

  reset() {
    this.time = 0
    this.phase = 0
  }

  advance(dt: number) {
    this.time += dt
    this.phase = (this.phase + 2 * Math.PI * this.params.frequency * dt) % (2 * Math.PI)
  }

  get z() {
    return REST_OFFSET + TRAVEL * Math.sin(this.phase)
  }
  get v() {
    return TRAVEL * 2 * Math.PI * this.params.frequency * Math.cos(this.phase)
  }
  get flux() {
    return linkedFlux(this.params, this.z)
  }
  get emf() {
    return emf(this.params, this.z, this.v)
  }
}
