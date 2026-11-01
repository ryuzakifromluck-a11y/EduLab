/**
 * Diels–Alder reaction: a concerted [4+2] cycloaddition.
 *
 *   conjugated diene (4 π electrons, s-cis) + dienophile (2 π electrons) → cyclohexene ring
 *
 * Three π bonds break and two new σ bonds plus one new π bond form in a single step,
 * so every atom of both reactants ends up in the product (molecular formulas add).
 *
 * Rate (frontier molecular orbital model). The main interaction is diene HOMO → dienophile
 * LUMO. Electron-donating groups (EDG) raise the diene HOMO, electron-withdrawing groups (EWG)
 * lower the dienophile LUMO; both shrink the gap and lower the activation energy:
 *
 *   gap = E(LUMO, dienophile) − E(HOMO, diene)            (eV)
 *   Ea  = EA_REF + EA_PER_EV · (gap − GAP_REF)              (kJ/mol, illustrative linear FMO fit)
 *   k   = A · f(s-cis) · e^(−Ea/RT)                          (L mol⁻¹ s⁻¹)
 *
 * Only the s-cis conformer can react, so k is scaled by the s-cis fraction (1 for a ring-locked
 * diene such as cyclopentadiene). With equal starting concentrations c₀ the second-order
 * integrated rate law gives the conversion X(t) = k·c₀·t / (1 + k·c₀·t) and t½ = 1/(k·c₀).
 *
 * Stereochemistry. The reaction is suprafacial on both components, so cis substituents on the
 * dienophile stay cis in the product. With a cyclic diene, a dienophile carrying a π-acceptor
 * group (C=O, C≡N) can sit under the diene (endo) or point away (exo). Secondary orbital
 * overlap lowers the endo transition state by ΔΔG‡, so under kinetic control
 *   endo : exo = e^(ΔΔG‡/RT)  (Alder endo rule).
 * The exo adduct is the more stable one; reversal (retro-Diels–Alder) at high temperature is
 * not modelled.
 *
 * HOMO/LUMO energies are approximate literature values (eV); A, EA_REF and EA_PER_EV were chosen
 * so that cyclopentadiene + maleic anhydride is fast at room temperature and butadiene + ethylene
 * is negligibly slow below 200 °C, as observed.
 */

export const R = 8.314
export const A_FACTOR = 1.4e6 // L mol⁻¹ s⁻¹
export const GAP_REF = 7.6 // eV (cyclopentadiene + maleic anhydride)
export const EA_REF = 35 // kJ/mol at GAP_REF
export const EA_PER_EV = 26.7 // kJ/mol per eV of HOMO–LUMO gap

export type Formula = Partial<Record<'C' | 'H' | 'N' | 'O', number>>

export type DieneId = 'butadiene' | 'dimethylbutadiene' | 'cyclopentadiene'
export type DienophileId = 'ethylene' | 'methylAcrylate' | 'maleicAnhydride'

export interface Diene {
  id: DieneId
  formula: Formula
  /** HOMO energy, eV. */
  homo: number
  /** Fraction of molecules in the reactive s-cis conformation at 25 °C. */
  sCis: number
  /** Ring-locked s-cis diene (gives a bicyclic, bridged product). */
  cyclic: boolean
  /** Number of electron-donating substituents. */
  edg: number
}

export interface Dienophile {
  id: DienophileId
  formula: Formula
  /** LUMO energy, eV. */
  lumo: number
  /** Number of electron-withdrawing (π-acceptor) groups. */
  ewg: number
  /** Endo stabilisation from secondary orbital overlap, kJ/mol. */
  endoBias: number
}

export const DIENES: Record<DieneId, Diene> = {
  butadiene: { id: 'butadiene', formula: { C: 4, H: 6 }, homo: -9.1, sCis: 0.03, cyclic: false, edg: 0 },
  dimethylbutadiene: { id: 'dimethylbutadiene', formula: { C: 6, H: 10 }, homo: -8.7, sCis: 0.12, cyclic: false, edg: 2 },
  cyclopentadiene: { id: 'cyclopentadiene', formula: { C: 5, H: 6 }, homo: -8.6, sCis: 1, cyclic: true, edg: 0 },
}

export const DIENOPHILES: Record<DienophileId, Dienophile> = {
  ethylene: { id: 'ethylene', formula: { C: 2, H: 4 }, lumo: 1.5, ewg: 0, endoBias: 0 },
  methylAcrylate: { id: 'methylAcrylate', formula: { C: 4, H: 6, O: 2 }, lumo: 0, ewg: 1, endoBias: 2.7 },
  maleicAnhydride: { id: 'maleicAnhydride', formula: { C: 4, H: 2, O: 3 }, lumo: -1.0, ewg: 2, endoBias: 10 },
}

const ATOMIC_MASS = { C: 12.011, H: 1.008, N: 14.007, O: 15.999 } as const
const ORDER = ['C', 'H', 'N', 'O'] as const

export function addFormulas(a: Formula, b: Formula): Formula {
  const out: Formula = {}
  for (const el of ORDER) {
    const n = (a[el] ?? 0) + (b[el] ?? 0)
    if (n) out[el] = n
  }
  return out
}

const SUB = '₀₁₂₃₄₅₆₇₈₉'
/** Hill-order formula string with subscripts, e.g. C₉H₈O₃. */
export function formatFormula(f: Formula): string {
  return ORDER.filter((el) => f[el])
    .map((el) => el + (f[el] === 1 ? '' : String(f[el]).replace(/\d/g, (d) => SUB[+d])))
    .join('')
}

export function molarMass(f: Formula): number {
  return ORDER.reduce((m, el) => m + (f[el] ?? 0) * ATOMIC_MASS[el], 0)
}

export type ProductSkeleton = 'cyclohexene' | 'norbornene'
export type Stereo = 'endo' | 'exo'

export interface DielsAlderAnalysis {
  diene: Diene
  dienophile: Dienophile
  /** HOMO(diene)–LUMO(dienophile) gap, eV. */
  gap: number
  /** Activation energy, kJ/mol. */
  ea: number
  /** Second-order rate constant, L mol⁻¹ s⁻¹. */
  k: number
  /** Half-life at c₀, s. */
  halfLife: number
  product: Formula
  productMass: number
  skeleton: ProductSkeleton
  /** Endo and exo are different products (cyclic diene and an acceptor group on the dienophile). */
  stereoDistinct: boolean
  /** Kinetic endo fraction (0–1); 1 when endo/exo are not distinct. */
  endoFraction: number
  major: Stereo | null
  /** Ring size of the newly formed ring (always 6). */
  ringSize: 6
  newSigmaBonds: 2
}

export const toKelvin = (c: number) => c + 273.15

export function activationEnergy(gap: number): number {
  return EA_REF + EA_PER_EV * (gap - GAP_REF)
}

export function rateConstant(diene: Diene, dienophile: Dienophile, tempC: number): number {
  const ea = activationEnergy(dienophile.lumo - diene.homo)
  return A_FACTOR * diene.sCis * Math.exp((-ea * 1000) / (R * toKelvin(tempC)))
}

/** Kinetic endo fraction from ΔΔG‡ (kJ/mol). */
export function endoFraction(endoBias: number, tempC: number): number {
  return 1 / (1 + Math.exp((-endoBias * 1000) / (R * toKelvin(tempC))))
}

export function analyse(dieneId: DieneId, dienophileId: DienophileId, tempC: number, c0: number): DielsAlderAnalysis {
  const diene = DIENES[dieneId]
  const dienophile = DIENOPHILES[dienophileId]
  const gap = dienophile.lumo - diene.homo
  const ea = activationEnergy(gap)
  const k = rateConstant(diene, dienophile, tempC)
  const product = addFormulas(diene.formula, dienophile.formula)
  const stereoDistinct = diene.cyclic && dienophile.ewg > 0
  const endo = stereoDistinct ? endoFraction(dienophile.endoBias, tempC) : 1
  return {
    diene,
    dienophile,
    gap,
    ea,
    k,
    halfLife: 1 / (k * c0),
    product,
    productMass: molarMass(product),
    skeleton: diene.cyclic ? 'norbornene' : 'cyclohexene',
    stereoDistinct,
    endoFraction: endo,
    major: stereoDistinct ? (endo >= 0.5 ? 'endo' : 'exo') : null,
    ringSize: 6,
    newSigmaBonds: 2,
  }
}

/** Conversion of a second-order A + B reaction with equal starting concentrations. */
export function conversion(k: number, c0: number, t: number): number {
  const x = k * c0 * Math.max(0, t)
  return x / (1 + x)
}

/** Rate constant against temperature for the given pair (for the Arrhenius chart). */
export function rateVsTemperature(dieneId: DieneId, tMin = 0, tMax = 200, step = 5) {
  const out: { T: number; ethylene: number; methylAcrylate: number; maleicAnhydride: number }[] = []
  for (let T = tMin; T <= tMax + 1e-9; T += step) {
    out.push({
      T,
      ethylene: rateConstant(DIENES[dieneId], DIENOPHILES.ethylene, T),
      methylAcrylate: rateConstant(DIENES[dieneId], DIENOPHILES.methylAcrylate, T),
      maleicAnhydride: rateConstant(DIENES[dieneId], DIENOPHILES.maleicAnhydride, T),
    })
  }
  return out
}
