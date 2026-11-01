/**
 * Reaction-rate engine for the "disappearing cross" experiment:
 *
 *   Na₂S₂O₃(aq) + 2 HCl(aq) → 2 NaCl(aq) + S(s) + SO₂(g) + H₂O(l)
 *
 * Model: hydrochloric acid is in large excess, so the reaction is treated as
 * pseudo-first-order in thiosulfate:
 *
 *   rate = −d[S₂O₃²⁻]/dt = k(T) · [S₂O₃²⁻]      →   [S₂O₃²⁻](t) = c₀ · e^(−k t)
 *
 * The rate constant follows the Arrhenius equation k = A · e^(−Eₐ / RT),
 * written relative to a reference temperature so the numbers stay readable:
 *
 *   k(T) = k_ref · exp(−(Eₐ / R) · (1/T − 1/T_ref))
 *
 * Colloidal sulfur makes the solution cloudy. The cross under the flask
 * disappears once the sulfur formed reaches a fixed amount (S_CROSS), so the
 * time to the cross vanishing is t = −ln(1 − S_CROSS / c₀) / k. For small
 * S_CROSS / c₀ this is ≈ S_CROSS / (k c₀): 1/t is proportional to c₀.
 */

/** Gas constant, J/(mol·K). */
export const R = 8.314
/** Activation energy, J/mol (about 55 kJ/mol: the rate roughly doubles every 10 °C near room temperature). */
export const ACTIVATION_ENERGY = 55_000
/** Reference temperature, K (25 °C). */
export const T_REF = 298.15
/** Pseudo-first-order rate constant at T_REF, 1/s. */
export const K_REF = 8.0e-4
/** Sulfur concentration (mol/L) at which the cross can no longer be seen. */
export const S_CROSS = 0.005

export interface ReactionParams {
  /** Initial sodium thiosulfate concentration, mol/L. */
  concentration: number
  /** Temperature, °C. */
  temperatureC: number
}

export const celsiusToKelvin = (c: number) => c + 273.15

/** Arrhenius rate constant k(T) in 1/s. */
export function rateConstant(temperatureC: number, ea = ACTIVATION_ENERGY): number {
  const T = celsiusToKelvin(temperatureC)
  return K_REF * Math.exp(-(ea / R) * (1 / T - 1 / T_REF))
}

/** Pre-exponential factor A (1/s) implied by K_REF and Eₐ. */
export function preExponential(ea = ACTIVATION_ENERGY): number {
  return K_REF * Math.exp(ea / (R * T_REF))
}

/** Thiosulfate concentration at time t, mol/L. */
export function thiosulfateAt(p: ReactionParams, t: number): number {
  return p.concentration * Math.exp(-rateConstant(p.temperatureC) * Math.max(0, t))
}

/** Sulfur formed at time t, mol/L (1 mol S per mol S₂O₃²⁻). */
export function sulfurAt(p: ReactionParams, t: number): number {
  return p.concentration - thiosulfateAt(p, t)
}

/** Instantaneous rate −d[S₂O₃²⁻]/dt at time t, mol/(L·s). */
export function rateAt(p: ReactionParams, t: number): number {
  return rateConstant(p.temperatureC) * thiosulfateAt(p, t)
}

/** Half-life ln 2 / k, seconds. */
export function halfLife(temperatureC: number): number {
  return Math.LN2 / rateConstant(temperatureC)
}

/** Time (s) until the cross disappears; Infinity if the solution can never become cloudy enough. */
export function crossTime(p: ReactionParams, threshold = S_CROSS): number {
  if (p.concentration <= threshold) return Infinity
  return -Math.log(1 - threshold / p.concentration) / rateConstant(p.temperatureC)
}

/** How well the cross can be seen, from 1 (clear) to 0 (gone), as the sulfur builds up. */
export function crossVisibility(p: ReactionParams, t: number, threshold = S_CROSS): number {
  return Math.max(0, 1 - sulfurAt(p, t) / threshold)
}

/** Cloudiness of the solution, 0 (clear) to 1 (opaque), saturating a little after the cross vanishes. */
export function turbidity(p: ReactionParams, t: number, threshold = S_CROSS): number {
  return 1 - Math.exp(-2.5 * (sulfurAt(p, t) / threshold))
}

/** Concentration–time series for charts. */
export function concentrationSeries(p: ReactionParams, tMax: number, points = 120) {
  return Array.from({ length: points }, (_, i) => {
    const t = (tMax * i) / (points - 1)
    return { t, thiosulfate: thiosulfateAt(p, t), sulfur: sulfurAt(p, t) }
  })
}

/** 1/t (the "rate" measured in class) against initial concentration at a fixed temperature. */
export function rateVsConcentration(temperatureC: number, concentrations: number[]) {
  return concentrations.map((c) => {
    const t = crossTime({ concentration: c, temperatureC })
    return { concentration: c, inverseTime: Number.isFinite(t) ? 1 / t : 0 }
  })
}

/** Arrhenius plot points: ln k against 1/T (1/K). */
export function arrheniusSeries(temperaturesC: number[]) {
  return temperaturesC.map((c) => ({
    temperatureC: c,
    inverseT: 1 / celsiusToKelvin(c),
    lnK: Math.log(rateConstant(c)),
  }))
}

/**
 * Stateful run used by the UI. The concentrations come from the closed-form
 * solution, so the simulation only keeps time and notices when the cross vanishes.
 */
export class ReactionSimulation {
  params: ReactionParams
  time = 0
  /** Time at which the cross disappeared in this run (null until then). */
  crossVanishedAt: number | null = null

  constructor(params: ReactionParams) {
    this.params = { ...params }
  }

  reset(params: Partial<ReactionParams> = {}) {
    this.params = { ...this.params, ...params }
    this.time = 0
    this.crossVanishedAt = null
  }

  /** Advance by `elapsed` seconds; returns true on the step in which the cross disappears. */
  advance(elapsed: number): boolean {
    const before = this.time
    this.time += elapsed
    if (this.crossVanishedAt === null) {
      const tc = crossTime(this.params)
      if (tc <= this.time && tc > before - 1e-12) {
        this.crossVanishedAt = tc
        return true
      }
    }
    return false
  }

  get thiosulfate() {
    return thiosulfateAt(this.params, this.time)
  }
  get sulfur() {
    return sulfurAt(this.params, this.time)
  }
  get rate() {
    return rateAt(this.params, this.time)
  }
  get visibility() {
    return crossVisibility(this.params, this.time)
  }
  get turbidity() {
    return turbidity(this.params, this.time)
  }
}
