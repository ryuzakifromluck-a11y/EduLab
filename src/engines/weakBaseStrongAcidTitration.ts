/**
 * Weak base – strong acid titration: aqueous ammonia titrated with hydrochloric acid at 25 °C.
 *
 *   NH₃(aq) + H₃O⁺(aq) → NH₄⁺(aq) + H₂O(l)
 *   NH₃ + H₂O ⇌ NH₄⁺ + OH⁻        Kb = 1.8 × 10⁻⁵   (pKb = 4.74)
 *   NH₄⁺ ⇌ NH₃ + H⁺               Ka = Kw/Kb = 5.6 × 10⁻¹⁰ (pKa = 9.26)
 *
 * The exact pH comes from the charge balance with total ammonia C_N and chloride C_Cl:
 *
 *   [H⁺] + C_N·[H⁺]/([H⁺] + Ka) = Kw/[H⁺] + C_Cl
 *
 * The left side minus the right side increases monotonically with [H⁺], so it is solved by
 * bisection on log[H⁺]. The familiar approximations hold in each region:
 *   start              pOH = ½(pKb − log C_b)
 *   buffer region      pOH = pKb + log([NH₄⁺]/[NH₃])   (Henderson–Hasselbalch)
 *   half-equivalence   [NH₄⁺] = [NH₃] → pOH = pKb, pH = 14 − pKb = pKa
 *   equivalence        only NH₄⁺, a weak acid: [H⁺] = √(Ka·C) → pH < 7
 *   after equivalence  excess H⁺ from HCl: [H⁺] ≈ n(excess)/V
 *
 * Volumes are in mL and concentrations in mol/L (amounts in mmol). Activities = concentrations.
 */

import { INDICATORS, type Indicator, type IndicatorId } from './titration'

export const KW = 1.0e-14
export const KB_NH3 = 1.8e-5
export const PKB = -Math.log10(KB_NH3)
export const KA_NH4 = KW / KB_NH3
export const PKA = -Math.log10(KA_NH4)

export interface WeakBaseParams {
  /** NH₃ concentration in the flask, mol/L. */
  baseConcentration: number
  /** NH₃ volume in the flask, mL. */
  baseVolume: number
  /** HCl concentration in the burette, mol/L. */
  acidConcentration: number
}

export type Region = 'start' | 'buffer' | 'halfEquivalence' | 'equivalence' | 'after'

export interface WeakBasePoint {
  addedVolume: number
  pH: number
  pOH: number
  hydronium: number
  totalVolume: number
  /** [NH₃] and [NH₄⁺], mol/L. */
  nh3: number
  nh4: number
  excessAcidMmol: number
  region: Region
  /** pH from the textbook approximation for this region (for the Formula Explorer). */
  approxPH: number
}

export function equivalenceVolume(p: WeakBaseParams): number {
  return (p.baseConcentration * p.baseVolume) / p.acidConcentration
}

/** Exact [H⁺] from the charge balance. */
export function solveHydronium(cN: number, cCl: number): number {
  const f = (h: number) => h + (cN * h) / (h + KA_NH4) - KW / h - cCl
  let lo = -15
  let hi = 1
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (f(10 ** mid) > 0) hi = mid
    else lo = mid
  }
  return 10 ** ((lo + hi) / 2)
}

export function titrationPoint(p: WeakBaseParams, addedVolume: number): WeakBasePoint {
  const va = Math.max(0, addedVolume)
  const V = p.baseVolume + va
  const nN = p.baseConcentration * p.baseVolume
  const nCl = p.acidConcentration * va
  const cN = nN / V
  const h = solveHydronium(cN, nCl / V)
  const pH = -Math.log10(h)
  const nh4 = (cN * h) / (h + KA_NH4)
  const veq = equivalenceVolume(p)
  const tol = Math.max(1e-9, veq * 1e-6)
  let region: Region
  if (va <= tol) region = 'start'
  else if (Math.abs(va - veq / 2) <= tol) region = 'halfEquivalence'
  else if (Math.abs(va - veq) <= tol) region = 'equivalence'
  else region = va < veq ? 'buffer' : 'after'
  let approxPH: number
  if (region === 'start') approxPH = 14 - 0.5 * (PKB - Math.log10(p.baseConcentration))
  else if (region === 'buffer' || region === 'halfEquivalence') approxPH = 14 - (PKB + Math.log10(nCl / (nN - nCl)))
  else if (region === 'equivalence') approxPH = -Math.log10(Math.sqrt(KA_NH4 * cN))
  else approxPH = -Math.log10((nCl - nN) / V)
  return {
    addedVolume: va,
    pH,
    pOH: 14 - pH,
    hydronium: h,
    totalVolume: V,
    nh3: cN - nh4,
    nh4,
    excessAcidMmol: Math.max(0, nCl - nN),
    region,
    approxPH,
  }
}

export function titrationCurve(p: WeakBaseParams, maxVolume: number, points = 200) {
  const veq = equivalenceVolume(p)
  const vols = new Set<number>()
  for (let i = 0; i <= points; i++) vols.add(+((maxVolume * i) / points).toFixed(4))
  if (veq <= maxVolume) {
    for (let i = -20; i <= 20; i++) {
      const v = veq + (i / 20) * Math.min(1, veq * 0.05)
      if (v >= 0 && v <= maxVolume) vols.add(+v.toFixed(4))
    }
  }
  return [...vols].sort((a, b) => a - b).map((v) => ({ volume: v, pH: titrationPoint(p, v).pH }))
}

/** Volume of acid (mL) at which the pH falls to `pH` (the curve is monotonic). */
export function volumeAtPH(p: WeakBaseParams, pH: number, maxVolume = 200): number | null {
  if (titrationPoint(p, 0).pH < pH || titrationPoint(p, maxVolume).pH > pH) return null
  let lo = 0
  let hi = maxVolume
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (titrationPoint(p, mid).pH > pH) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export type Suitability = 'good' | 'fair' | 'poor'

export const WEAK_BASE_INDICATORS: IndicatorId[] = ['methylOrange', 'methylRed', 'bromothymolBlue', 'phenolphthalein']

/** End point of an indicator (colour half changed, pH = pKIn) and how far it is from equivalence. */
export function indicatorEndPoint(p: WeakBaseParams, ind: Indicator) {
  const veq = equivalenceVolume(p)
  const volume = volumeAtPH(p, ind.pKa)
  const error = volume === null ? null : volume - veq
  const rel = error === null ? Infinity : Math.abs(error) / veq
  const suitability: Suitability = rel <= 0.005 ? 'good' : rel <= 0.015 ? 'fair' : 'poor'
  return { volume, error, suitability }
}

/** The best indicator for these conditions: smallest end-point error. */
export function bestIndicator(p: WeakBaseParams): IndicatorId {
  let best: IndicatorId = WEAK_BASE_INDICATORS[0]
  let bestErr = Infinity
  for (const id of WEAK_BASE_INDICATORS) {
    const e = indicatorEndPoint(p, INDICATORS[id]).error
    if (e !== null && Math.abs(e) < bestErr) {
      bestErr = Math.abs(e)
      best = id
    }
  }
  return best
}
