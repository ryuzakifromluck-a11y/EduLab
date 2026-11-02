/**
 * Electrolysis of water in a Hofmann voltameter.
 *
 *   cathode (−):  4 H₂O + 4 e⁻ → 2 H₂ + 4 OH⁻
 *   anode   (+):  2 H₂O → O₂ + 4 H⁺ + 4 e⁻          (inert Pt or graphite electrodes)
 *   overall:      2 H₂O → 2 H₂ + O₂                  E° = 1.23 V
 *
 * Model
 * - Gas only forms above the decomposition voltage Ed = 1.23 V + overpotential (depends on the
 *   electrode material). Above it the current is ohmic:  I = (U − Ed) / R,  with the electrolyte
 *   resistance R = k_cell / κ and conductivity κ ≈ Λ·c (linear in concentration; pure water
 *   barely conducts). The power supply limits the current to 2 A.
 * - Faraday's law:  n(H₂) = Q / 2F,  n(O₂) = Q / 4F  → volumes in a 2 : 1 ratio.
 * - A little of each gas dissolves in the electrolyte before bubbles survive; oxygen is about
 *   twice as soluble as hydrogen, so early on the measured ratio is slightly above 2.
 * - A copper anode is not inert: it dissolves (Cu → Cu²⁺ + 2e⁻) instead of making oxygen, and the
 *   solution around it turns blue.
 * - Gases are collected at 25 °C and 1 atm (Vm = 24.47 L/mol); each tube holds 50 mL.
 */

export const FARADAY = 96485 // C/mol
export const E_REV = 1.23 // V
export const MOLAR_VOLUME = 24.47 // L/mol at 25 °C, 1 atm
export const TUBE_CAPACITY = 50 // mL
export const MAX_CURRENT = 2 // A
/** Cell constant of the voltameter, 1/m: R = K_CELL / κ. */
export const K_CELL = 100

export type Electrolyte = 'distilled' | 'na2so4' | 'h2so4' | 'naoh'
export type ElectrodeMaterial = 'platinum' | 'graphite' | 'copper'

/** Conductivity per mol/L, S/m. Distilled water is a fixed tiny conductivity. */
export const ELECTROLYTES: Record<Electrolyte, { formula: string; molarConductivity: number }> = {
  distilled: { formula: 'H₂O', molarConductivity: 0 },
  na2so4: { formula: 'Na₂SO₄', molarConductivity: 10 },
  h2so4: { formula: 'H₂SO₄', molarConductivity: 40 },
  naoh: { formula: 'NaOH', molarConductivity: 18 },
}
export const ELECTROLYTE_IDS = Object.keys(ELECTROLYTES) as Electrolyte[]

export const ELECTRODES: Record<ElectrodeMaterial, { overpotential: number; inertAnode: boolean; color: string }> = {
  platinum: { overpotential: 0.5, inertAnode: true, color: '#c9ccd2' },
  graphite: { overpotential: 0.8, inertAnode: true, color: '#3b3d42' },
  // Copper oxidises at the anode before water does (Cu²⁺/Cu E° = +0.34 V).
  copper: { overpotential: 0.5, inertAnode: false, color: '#c47a45' },
}
export const ELECTRODE_IDS = Object.keys(ELECTRODES) as ElectrodeMaterial[]

/** Conductivity of pure water, S/m. */
export const PURE_WATER_CONDUCTIVITY = 5.5e-6

/** mmol of each gas that dissolves before bubbles are collected. */
export const DISSOLVED = { H2: 0.008, O2: 0.016 }

export interface ElectrolysisParams {
  /** Supply voltage, V. */
  voltage: number
  electrolyte: Electrolyte
  /** mol/L (ignored for distilled water). */
  concentration: number
  electrode: ElectrodeMaterial
}

export function conductivity(p: Pick<ElectrolysisParams, 'electrolyte' | 'concentration'>) {
  return PURE_WATER_CONDUCTIVITY + ELECTROLYTES[p.electrolyte].molarConductivity * (p.electrolyte === 'distilled' ? 0 : p.concentration)
}

export const resistance = (p: Pick<ElectrolysisParams, 'electrolyte' | 'concentration'>) => K_CELL / conductivity(p)

/** Voltage below which no gas forms. With a copper anode the anode reaction needs less. */
export function decompositionVoltage(electrode: ElectrodeMaterial) {
  const e = ELECTRODES[electrode]
  // Cathode: H₂ evolution (0 V); anode: O₂ (1.23 V) or Cu dissolution (0.34 V).
  return (e.inertAnode ? E_REV : 0.34) + e.overpotential
}

/** Current through the cell, A. */
export function current(p: ElectrolysisParams) {
  const drive = p.voltage - decompositionVoltage(p.electrode)
  if (drive <= 0) return 0
  return Math.min(MAX_CURRENT, drive / resistance(p))
}

/** Theoretical amounts (mol) produced by a charge Q (C). */
export function faraday(charge: number) {
  return { H2: charge / (2 * FARADAY), O2: charge / (4 * FARADAY), Cu: charge / (2 * FARADAY) }
}

/** Amount (mmol) that reaches the tube after some dissolves in the electrolyte. */
export function collected(produced: number, dissolvedCapacity: number) {
  if (produced <= 0) return 0
  return Math.max(0, produced - dissolvedCapacity * (1 - Math.exp(-produced / dissolvedCapacity)))
}

export const mmolToMl = (mmol: number) => mmol * MOLAR_VOLUME

export interface GasVolumes {
  /** mL collected over each electrode (capped at the tube's capacity). */
  h2: number
  o2: number
  /** Theoretical mL from Faraday's law without losses. */
  h2Theory: number
  o2Theory: number
  /** mol of copper dissolved from a copper anode. */
  copper: number
  /** The hydrogen tube is full: the experiment stops. */
  full: boolean
}

/** Gas collected after a charge Q has passed. */
export function gasVolumes(charge: number, electrode: ElectrodeMaterial): GasVolumes {
  const n = faraday(charge)
  const inert = ELECTRODES[electrode].inertAnode
  const h2Theory = mmolToMl(n.H2 * 1000)
  const o2Theory = inert ? mmolToMl(n.O2 * 1000) : 0
  const h2 = mmolToMl(collected(n.H2 * 1000, DISSOLVED.H2))
  const o2 = inert ? mmolToMl(collected(n.O2 * 1000, DISSOLVED.O2)) : 0
  return {
    h2: Math.min(TUBE_CAPACITY, h2),
    o2: Math.min(TUBE_CAPACITY, o2),
    h2Theory,
    o2Theory,
    copper: inert ? 0 : n.Cu,
    full: h2 >= TUBE_CAPACITY,
  }
}

/** Charge (C) at which the hydrogen tube is full. */
export function chargeToFill(): number {
  // Invert collected() numerically (it is monotonic).
  let lo = 0
  let hi = 1e5
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (gasVolumes(mid, 'platinum').h2 >= TUBE_CAPACITY) hi = mid
    else lo = mid
  }
  return hi
}

/** Measured volume ratio H₂ : O₂ (null when there is no oxygen yet). */
export const volumeRatio = (v: GasVolumes) => (v.o2 > 1e-6 ? v.h2 / v.o2 : null)

/** Fraction of the charge that ended up as collected gas (both gases weighted by electrons). */
export function currentEfficiency(v: GasVolumes) {
  return v.h2Theory > 0 ? v.h2 / v.h2Theory : 0
}

/** Electrical energy used per mL of hydrogen, J/mL. */
export const energyPerMl = (voltage: number, charge: number, h2: number) => (h2 > 0 ? (voltage * charge) / h2 : 0)
