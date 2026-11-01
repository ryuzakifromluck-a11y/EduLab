/**
 * Preparing a solution by dilution, and measuring it with a colorimeter.
 *
 * A volume V₁ of copper(II) sulfate stock solution (concentration C₁) is
 * pipetted into a volumetric flask and water is added up to the mark V₂. The
 * amount of solute does not change, so
 *
 *   n = C₁V₁ = C₂V₂      C₂ = C₁V₁ / V₂      dilution factor = V₂ / V₁
 *
 * The blue colour is measured with the Beer–Lambert law at 810 nm:
 *
 *   A = ε l c,     T = 10^(−A)
 *
 * with ε ≈ 12 L/(mol·cm) for Cu²⁺(aq) and a 1 cm cuvette.
 */

export const EPSILON = 12 // L/(mol·cm)
export const PATH = 1 // cm
export const FLASKS = [50, 100, 250] as const
export type FlaskVolume = (typeof FLASKS)[number]

/** Concentration after dilution, mol/L. */
export function diluted(c1: number, v1: number, v2: number): number {
  if (!(v2 > 0)) throw new RangeError('Final volume must be greater than zero')
  return (c1 * v1) / v2
}

/** Stock volume needed to make volume v2 at concentration c2 (same units as v2). */
export function stockVolumeNeeded(c1: number, c2: number, v2: number): number {
  if (!(c1 > 0)) throw new RangeError('Stock concentration must be greater than zero')
  return (c2 * v2) / c1
}

export const dilutionFactor = (v1: number, v2: number) => v2 / v1

/** Moles of solute in volume v (mL) at concentration c (mol/L). */
export const molesIn = (c: number, vMl: number) => (c * vMl) / 1000

export const absorbance = (c: number, epsilon = EPSILON, path = PATH) => epsilon * path * c
export const transmittance = (A: number) => Math.pow(10, -A)

/** Concentration while water is being added: C(V) = C₁V₁ / V. */
export function concentrationCurve(c1: number, v1: number, v2: number, points = 60) {
  return Array.from({ length: points }, (_, i) => {
    const v = v1 + ((v2 - v1) * i) / (points - 1)
    return { volume: v, concentration: diluted(c1, v1, v) }
  })
}

/** Beer–Lambert calibration line up to cMax. */
export function calibrationLine(cMax: number, points = 21) {
  return Array.from({ length: points }, (_, i) => {
    const c = (cMax * i) / (points - 1)
    return { concentration: c, absorbance: absorbance(c) }
  })
}

export type DilutionStage = 'empty' | 'stock' | 'filling' | 'mark' | 'mixed'

/**
 * Steps through the procedure: pipette the stock, fill with water to the
 * mark, then invert to mix. The solution is only uniform after mixing; until
 * then `mixing` (0–1) tells the view how far the colour has spread.
 */
export class DilutionSimulation {
  c1: number
  v1: number
  v2: FlaskVolume
  volume = 0
  mixing = 0
  stage: DilutionStage = 'empty'
  /** Water flow while filling, mL/s. */
  flow = 20

  constructor(c1: number, v1: number, v2: FlaskVolume) {
    this.c1 = c1
    this.v1 = v1
    this.v2 = v2
  }

  reset(p: Partial<Pick<DilutionSimulation, 'c1' | 'v1' | 'v2'>> = {}) {
    Object.assign(this, p)
    this.volume = 0
    this.mixing = 0
    this.stage = 'empty'
  }

  pipette() {
    this.volume = this.v1
    this.mixing = 1
    this.stage = 'stock'
  }

  get moles() {
    return this.stage === 'empty' ? 0 : molesIn(this.c1, this.v1)
  }

  /** Average concentration of what is in the flask now, mol/L. */
  get concentration() {
    return this.volume > 0 ? (this.c1 * this.v1) / this.volume : 0
  }

  get atMark() {
    return this.volume >= this.v2 - 1e-9
  }

  /** Advances filling or mixing. Returns true when the current stage has just finished. */
  advance(dt: number): boolean {
    if (this.stage === 'stock' || this.stage === 'filling') {
      this.stage = 'filling'
      // Slow down near the mark, like adding the last drops with a dropper.
      const left = this.v2 - this.volume
      const rate = Math.max(1, Math.min(this.flow, left * 1.5 + 0.5))
      this.volume = Math.min(this.v2, this.volume + rate * dt)
      this.mixing = Math.min(this.mixing, this.v1 / this.volume)
      if (this.atMark) {
        this.stage = 'mark'
        return true
      }
    } else if (this.stage === 'mark') {
      this.mixing = Math.min(1, this.mixing + dt / 2.5)
      if (this.mixing >= 1) {
        this.stage = 'mixed'
        return true
      }
    }
    return false
  }
}
