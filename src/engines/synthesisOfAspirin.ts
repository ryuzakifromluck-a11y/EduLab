/**
 * Synthesis of aspirin (acetylsalicylic acid) by esterification of the phenol group of
 * salicylic acid with acetic anhydride, catalysed by a few drops of strong acid:
 *
 *   C₇H₆O₃ (salicylic acid) + C₄H₆O₃ (acetic anhydride) → C₉H₈O₄ (aspirin) + C₂H₄O₂ (acetic acid)
 *
 * Stoichiometry is 1 : 1, so the reagent with fewer moles is limiting and fixes the
 * theoretical yield. Acetic anhydride is normally used in excess.
 *
 * Kinetics. With excess anhydride the reaction is pseudo-first-order in the limiting reagent:
 *   X(t) = 1 − e^(−k·t),   k = k_ref · catalyst factor · e^(−Ea/R · (1/T − 1/T_ref))
 * k_ref is chosen so that H₃PO₄ at 85 °C for 15 min reaches about 95 % conversion, as in the
 * usual teaching procedure; without a catalyst the reaction barely starts.
 *
 * Isolation. Cold water hydrolyses the leftover anhydride and aspirin crystallises; a fraction
 * stays in the filtrate (recovery). Unreacted salicylic acid co-precipitates; recrystallisation
 * removes most of it at the cost of a lower recovery.
 *
 * Purity tests.
 *  • Melting point: pure aspirin melts at about 135 °C. Impurities depress and broaden the
 *    range (ideal freezing-point depression ΔT = R·Tm²/ΔH_fus · x_impurity).
 *  • FeCl₃ test: Fe³⁺ forms a violet complex with phenols. Salicylic acid has a free phenol −OH,
 *    aspirin does not, so a violet colour means unreacted salicylic acid.
 */

export const R = 8.314
export const M_SA = 138.12 // g/mol salicylic acid C₇H₆O₃
export const M_AC2O = 102.09 // g/mol acetic anhydride C₄H₆O₃
export const M_ASA = 180.16 // g/mol aspirin C₉H₈O₄
export const M_ACOH = 60.05 // g/mol acetic acid
export const RHO_AC2O = 1.08 // g/mL
export const MP_PURE = 135 // °C
export const DH_FUS = 29_800 // J/mol, aspirin
export const EA = 60_000 // J/mol (illustrative)
export const K_REF = 0.2 // 1/min with H₃PO₄ at 85 °C
export const T_REF = 85

export type CatalystId = 'none' | 'phosphoric' | 'sulfuric'
export const CATALYST_FACTOR: Record<CatalystId, number> = { none: 0.04, phosphoric: 1, sulfuric: 1.6 }

/** Fraction of aspirin recovered from the mother liquor. */
export const RECOVERY = { crude: 0.85, recrystallised: 0.72 }
/** Fraction of the leftover salicylic acid that ends up in the solid. */
export const SA_CARRYOVER = { crude: 0.6, recrystallised: 0.05 }

export interface AspirinParams {
  /** Mass of salicylic acid, g. */
  saMass: number
  /** Volume of acetic anhydride, mL. */
  ac2oVolume: number
  catalyst: CatalystId
  /** Water-bath temperature, °C. */
  tempC: number
}

export interface Stoichiometry {
  nSA: number
  nAc2O: number
  limiting: 'salicylicAcid' | 'aceticAnhydride'
  nLimiting: number
  /** Excess of the other reagent, mol. */
  nExcess: number
  /** Theoretical yield of aspirin, g. */
  theoretical: number
}

export function stoichiometry(p: Pick<AspirinParams, 'saMass' | 'ac2oVolume'>): Stoichiometry {
  const nSA = p.saMass / M_SA
  const nAc2O = (p.ac2oVolume * RHO_AC2O) / M_AC2O
  const limiting = nSA <= nAc2O ? 'salicylicAcid' : 'aceticAnhydride'
  const nLimiting = Math.min(nSA, nAc2O)
  return { nSA, nAc2O, limiting, nLimiting, nExcess: Math.abs(nSA - nAc2O), theoretical: nLimiting * M_ASA }
}

export function rateConstant(catalyst: CatalystId, tempC: number): number {
  const T = tempC + 273.15
  return K_REF * CATALYST_FACTOR[catalyst] * Math.exp((-EA / R) * (1 / T - 1 / (T_REF + 273.15)))
}

/** Fraction of the limiting reagent converted after `minutes` of heating. */
export function conversion(catalyst: CatalystId, tempC: number, minutes: number): number {
  return 1 - Math.exp(-rateConstant(catalyst, tempC) * Math.max(0, minutes))
}

export type FeCl3Result = 'negative' | 'faint' | 'positive'

export interface AspirinResult {
  stoich: Stoichiometry
  conversion: number
  /** Aspirin formed in the flask, g. */
  formed: number
  /** Aspirin in the dried solid, g. */
  aspirinMass: number
  /** Salicylic acid impurity in the dried solid, g. */
  saImpurity: number
  /** Mass of dried product weighed, g. */
  productMass: number
  percentYield: number
  /** Mass fraction of aspirin in the product. */
  purity: number
  /** Mole fraction of impurity. */
  xImpurity: number
  meltingRange: [number, number]
  fecl3: FeCl3Result
  /** Hex colour of the FeCl₃ test solution. */
  fecl3Color: string
}

export function meltingRange(xImpurity: number): [number, number] {
  const Tm = MP_PURE + 273.15
  const depression = ((R * Tm * Tm) / DH_FUS) * xImpurity
  const top = MP_PURE - depression
  const width = 1 + 60 * xImpurity
  return [top - width, top]
}

/** FeCl₃ test: pale yellow-orange with no phenol, deep violet with salicylic acid. */
export function fecl3Test(saFraction: number): { result: FeCl3Result; color: string } {
  const result: FeCl3Result = saFraction < 0.005 ? 'negative' : saFraction < 0.03 ? 'faint' : 'positive'
  const u = Math.min(1, saFraction / 0.06)
  const a = [0xf1, 0xd7, 0x8a] // FeCl₃(aq), yellow
  const b = [0x5b, 0x1f, 0x86] // iron(III)–phenolate complex, violet
  const hex = a.map((v, i) => Math.round(v + (b[i] - v) * Math.sqrt(u)).toString(16).padStart(2, '0')).join('')
  return { result, color: `#${hex}` }
}

export function isolate(p: AspirinParams, minutes: number, recrystallise: boolean): AspirinResult {
  const stoich = stoichiometry(p)
  const X = conversion(p.catalyst, p.tempC, minutes)
  const nFormed = stoich.nLimiting * X
  const formed = nFormed * M_ASA
  const mode = recrystallise ? 'recrystallised' : 'crude'
  const aspirinMass = formed * RECOVERY[mode]
  // Leftover salicylic acid (all of it if it is in excess, otherwise the unreacted part).
  const nSAleft = stoich.nSA - nFormed
  const saImpurity = Math.max(0, nSAleft) * M_SA * SA_CARRYOVER[mode]
  const productMass = aspirinMass + saImpurity
  const purity = productMass > 0 ? aspirinMass / productMass : 0
  const nA = aspirinMass / M_ASA
  const nI = saImpurity / M_SA
  const xImpurity = nA + nI > 0 ? nI / (nA + nI) : 0
  const fe = fecl3Test(productMass > 0 ? saImpurity / productMass : 0)
  return {
    stoich,
    conversion: X,
    formed,
    aspirinMass,
    saImpurity,
    productMass,
    percentYield: stoich.theoretical > 0 ? (productMass / stoich.theoretical) * 100 : 0,
    purity,
    xImpurity,
    meltingRange: meltingRange(xImpurity),
    fecl3: fe.result,
    fecl3Color: fe.color,
  }
}

/** Conversion curves for every catalyst at one temperature (for the chart). */
export function conversionCurves(tempC: number, maxMinutes = 30, step = 0.5) {
  const out: { t: number; none: number; phosphoric: number; sulfuric: number }[] = []
  for (let t = 0; t <= maxMinutes + 1e-9; t += step) {
    out.push({ t, none: conversion('none', tempC, t), phosphoric: conversion('phosphoric', tempC, t), sulfuric: conversion('sulfuric', tempC, t) })
  }
  return out
}
