/**
 * Exothermic and endothermic processes in a coffee-cup calorimeter.
 *
 * A solid is dissolved in water in an insulated polystyrene cup. The enthalpy
 * of solution ΔH (kJ/mol) sets the heat given out to (ΔH < 0) or taken from
 * (ΔH > 0) the water:
 *
 *   q = −ΔH · n,       ΔT = q / (m c)        (ideal, no heat loss)
 *
 * The solid dissolves gradually (first order, time constant τ_d) and the cup
 * slowly exchanges heat with the room (Newton's law of cooling, τ_loss), so
 * the measured peak ΔT is slightly smaller than the ideal one:
 *
 *   dξ/dt = (1 − ξ)/τ_d
 *   dT/dt = (−ΔH · n / C) dξ/dt − (T − T_room)/τ_loss
 *
 * C = m_water · c_water is the heat capacity of the solution (the cup and the
 * dissolved solid are ignored, as in a school calorimetry calculation).
 */

export const C_WATER = 4.18 // J/(g·K)
export const TAU_DISSOLVE = 12 // s
export const TAU_LOSS = 1500 // s
export const ROOM_T = 20 // °C

export interface Substance {
  id: 'naoh' | 'cacl2' | 'nh4no3' | 'kcl'
  formula: string
  /** Molar mass, g/mol. */
  molarMass: number
  /** Enthalpy of solution at infinite dilution, kJ/mol (negative = exothermic). */
  dH: number
}

export const SUBSTANCES: Substance[] = [
  { id: 'naoh', formula: 'NaOH', molarMass: 40.0, dH: -44.5 },
  { id: 'cacl2', formula: 'CaCl₂', molarMass: 110.98, dH: -81.3 },
  { id: 'nh4no3', formula: 'NH₄NO₃', molarMass: 80.04, dH: 25.7 },
  { id: 'kcl', formula: 'KCl', molarMass: 74.55, dH: 17.2 },
]

export const substanceById = (id: Substance['id']) => SUBSTANCES.find((s) => s.id === id) ?? SUBSTANCES[0]

export interface CalorimetryParams {
  substance: Substance['id']
  /** Mass of solid added, g. */
  mass: number
  /** Volume of water, mL (= g). */
  water: number
  /** Starting temperature of the water, °C. */
  startT: number
}

export const moles = (p: Pick<CalorimetryParams, 'substance' | 'mass'>) => p.mass / substanceById(p.substance).molarMass

/** Heat released to the water, J (negative when heat is absorbed). */
export const heatReleased = (p: CalorimetryParams) => -substanceById(p.substance).dH * 1000 * moles(p)

/** Ideal temperature change with no heat loss, K. */
export const idealDeltaT = (p: CalorimetryParams) => heatReleased(p) / (p.water * C_WATER)

export const isExothermic = (id: Substance['id']) => substanceById(id).dH < 0

/** ΔH (kJ/mol) worked out from a measured temperature change: −m c ΔT / n. */
export function enthalpyFromMeasurement(water: number, deltaT: number, n: number): number {
  return n > 0 ? (-water * C_WATER * deltaT) / n / 1000 : NaN
}

export class CalorimeterSimulation {
  params: CalorimetryParams
  time = 0
  /** Fraction of the solid dissolved, 0–1. */
  extent = 0
  temperature: number
  started = false
  /** Largest |T − T_start| so far, signed. */
  peakDelta = 0

  constructor(params: CalorimetryParams) {
    this.params = { ...params }
    this.temperature = params.startT
  }

  reset(p: Partial<CalorimetryParams> = {}) {
    this.params = { ...this.params, ...p }
    this.time = 0
    this.extent = 0
    this.temperature = this.params.startT
    this.started = false
    this.peakDelta = 0
  }

  /** Drops the solid into the water. */
  start() {
    this.started = true
  }

  get deltaT() {
    return this.temperature - this.params.startT
  }

  advance(dt: number) {
    if (!this.started) return
    const h = 0.05
    const total = idealDeltaT(this.params)
    let left = dt
    while (left > 1e-12) {
      const s = Math.min(h, left)
      // Exact dissolution over the sub-step; heat follows it.
      const newExtent = 1 - (1 - this.extent) * Math.exp(-s / TAU_DISSOLVE)
      const heatStep = total * (newExtent - this.extent)
      this.extent = newExtent
      this.temperature += heatStep - ((this.temperature - ROOM_T) / TAU_LOSS) * s
      left -= s
      this.time += s
      if (Math.abs(this.deltaT) > Math.abs(this.peakDelta)) this.peakDelta = this.deltaT
    }
  }
}

/** Ideal ΔT for a range of masses (straight line through the origin). */
export function deltaTVsMass(p: CalorimetryParams, mMax: number, points = 21) {
  return Array.from({ length: points }, (_, i) => {
    const mass = (mMax * i) / (points - 1)
    return { mass, deltaT: idealDeltaT({ ...p, mass }) }
  })
}

/** Schematic enthalpy profile along the reaction path (kJ/mol, reactants at 0). */
export function energyProfile(dH: number, points = 61) {
  const Ea = Math.max(dH, 0) + 40
  return Array.from({ length: points }, (_, i) => {
    const s = i / (points - 1)
    // Smooth step from 0 to ΔH plus a hump that peaks at Ea (above the reactants) at s = 0.5.
    const step = dH * (0.5 - 0.5 * Math.cos(Math.PI * s))
    const hump = (Ea - dH / 2) * Math.exp(-(((s - 0.5) / 0.14) ** 2))
    return { s, H: step + hump }
  })
}
