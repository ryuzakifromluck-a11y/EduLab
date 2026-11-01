/**
 * Chemical equilibrium: N₂O₄(g) ⇌ 2 NO₂(g)   (colourless ⇌ brown)
 *
 *   Kc = [NO₂]² / [N₂O₄]          Kc(25 °C) = 4.6 × 10⁻³ mol/L
 *   ΔH° = +57.2 kJ/mol            (the forward reaction is endothermic)
 *
 * The temperature dependence of Kc comes from the van 't Hoff equation
 *
 *   ln(K₂/K₁) = −(ΔH°/R)(1/T₂ − 1/T₁)
 *
 * and the approach to equilibrium from elementary rate laws
 *
 *   rate_f = k_f [N₂O₄],  rate_r = k_r [NO₂]²,  k_r = k_f / Kc
 *   d[N₂O₄]/dt = −rate_f + rate_r,   d[NO₂]/dt = 2(rate_f − rate_r)
 *
 * with k_f following the Arrhenius equation (illustrative values chosen so
 * that the system settles in a few seconds). Changing the volume changes all
 * concentrations at once (amounts stay the same), which is how pressure
 * shifts the equilibrium.
 */

export const R = 8.314
export const K_298 = 4.6e-3
export const DELTA_H = 57_200 // J/mol
export const KF_298 = 0.35 // 1/s
export const EA_FORWARD = 50_000 // J/mol
export const T_REF = 298.15

export const toKelvin = (c: number) => c + 273.15

/** Equilibrium constant Kc (mol/L) at temperature T (°C). */
export function equilibriumConstant(tempC: number): number {
  const T = toKelvin(tempC)
  return K_298 * Math.exp((-DELTA_H / R) * (1 / T - 1 / T_REF))
}

/** Forward rate constant (1/s) at temperature T (°C). */
export function forwardRateConstant(tempC: number): number {
  const T = toKelvin(tempC)
  return KF_298 * Math.exp((-EA_FORWARD / R) * (1 / T - 1 / T_REF))
}

/** Reaction quotient Q = [NO₂]² / [N₂O₄]. */
export function reactionQuotient(n2o4: number, no2: number): number {
  return n2o4 > 0 ? (no2 * no2) / n2o4 : Infinity
}

/**
 * Equilibrium concentrations for a mixture holding `nitrogen` mol of N₂O₄
 * "units" (i.e. moles of N₂O₄ if all NO₂ were dimerised) in V litres.
 * Solves 4x² + Kc·x − Kc·c₀ = 0 for x = [N₂O₄] dissociated.
 */
export function equilibriumConcentrations(nitrogen: number, volume: number, tempC: number) {
  const c0 = nitrogen / volume
  const K = equilibriumConstant(tempC)
  const x = (-K + Math.sqrt(K * K + 16 * K * c0)) / 8
  return { n2o4: c0 - x, no2: 2 * x }
}

export type Shift = 'forward' | 'reverse' | 'equilibrium'

export function shiftDirection(Q: number, K: number, tolerance = 0.02): Shift {
  if (!Number.isFinite(Q)) return 'reverse'
  const r = Math.log(Q / K)
  if (Math.abs(r) < tolerance) return 'equilibrium'
  return Q < K ? 'forward' : 'reverse'
}

export interface EquilibriumSample {
  t: number
  n2o4: number
  no2: number
  Q: number
  K: number
}

export class EquilibriumSimulation {
  /** Amounts in mol. */
  nN2O4: number
  nNO2: number
  volume: number
  tempC: number
  time = 0

  constructor(nN2O4: number, volume: number, tempC: number) {
    this.nN2O4 = nN2O4
    this.nNO2 = 0
    this.volume = volume
    this.tempC = tempC
  }

  get n2o4() {
    return this.nN2O4 / this.volume
  }
  get no2() {
    return this.nNO2 / this.volume
  }
  get K() {
    return equilibriumConstant(this.tempC)
  }
  get Q() {
    return reactionQuotient(this.n2o4, this.no2)
  }
  get shift(): Shift {
    return shiftDirection(this.Q, this.K)
  }
  /** Total pressure (ideal gas), kPa. */
  get pressure() {
    return ((this.nN2O4 + this.nNO2) * R * toKelvin(this.tempC)) / (this.volume * 1e-3) / 1000
  }
  /** Fraction of N₂O₄ units dissociated, 0–1. */
  get dissociation() {
    const total = this.nN2O4 + this.nNO2 / 2
    return total > 0 ? this.nNO2 / 2 / total : 0
  }

  add(species: 'n2o4' | 'no2', mol: number) {
    if (species === 'n2o4') this.nN2O4 += mol
    else this.nNO2 += mol
  }

  /** Jumps straight to equilibrium at the current conditions. */
  equilibrate() {
    const { n2o4, no2 } = equilibriumConcentrations(this.nN2O4 + this.nNO2 / 2, this.volume, this.tempC)
    this.nN2O4 = n2o4 * this.volume
    this.nNO2 = no2 * this.volume
  }

  advance(dt: number) {
    const kf = forwardRateConstant(this.tempC)
    const kr = kf / this.K
    // Classic RK4 on the concentrations; the step is far below the fastest relaxation time.
    const h = 1 / 400
    const f = (a: number, b: number) => kf * a - kr * b * b
    let a = this.n2o4
    let b = this.no2
    let left = dt
    while (left > 1e-12) {
      const s = Math.min(h, left)
      const r1 = f(a, b)
      const r2 = f(a - (s / 2) * r1, b + s * r1)
      const r3 = f(a - (s / 2) * r2, b + s * r2)
      const r4 = f(a - s * r3, b + 2 * s * r3)
      const r = (r1 + 2 * r2 + 2 * r3 + r4) / 6
      a = Math.max(0, a - s * r)
      b = Math.max(0, b + 2 * s * r)
      left -= s
      this.time += s
    }
    this.nN2O4 = a * this.volume
    this.nNO2 = b * this.volume
  }
}

/** Kc across a temperature range (for the van 't Hoff chart). */
export function kVsTemperature(tMin: number, tMax: number, points = 51) {
  return Array.from({ length: points }, (_, i) => {
    const T = tMin + ((tMax - tMin) * i) / (points - 1)
    return { T, K: equilibriumConstant(T) }
  })
}
