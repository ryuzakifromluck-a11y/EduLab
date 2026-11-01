/**
 * Strong acid – strong base titration engine (e.g. HCl titrated with NaOH) at 25 °C.
 *
 *   H₃O⁺(aq) + OH⁻(aq) → 2 H₂O(l)          Kw = [H⁺][OH⁻] = 1.0 × 10⁻¹⁴
 *
 * Both electrolytes dissociate completely, so the only equilibrium is water
 * autoionisation. The charge balance gives
 *
 *   [H⁺] − [OH⁻] = (n_acid − n_base) / V_total = D
 *   [H⁺] = (D + √(D² + 4Kw)) / 2
 *
 * which is exact in all three regions:
 *   before equivalence  (D > 0): [H⁺] ≈ excess acid / V_total
 *   at equivalence      (D = 0): [H⁺] = √Kw → pH 7.00
 *   after equivalence   (D < 0): [OH⁻] ≈ excess base / V_total
 *
 * Volumes are in millilitres and concentrations in mol/L, so amounts are in mmol.
 * Activity coefficients are taken as 1 (ideal dilute solution).
 */

export const KW = 1.0e-14

export interface TitrationParams {
  /** Acid concentration, mol/L. */
  acidConcentration: number
  /** Acid (analyte) volume in the flask, mL. */
  acidVolume: number
  /** Base (titrant) concentration in the burette, mol/L. */
  baseConcentration: number
}

export type TitrationRegion = 'before' | 'equivalence' | 'after'

export interface TitrationPoint {
  addedVolume: number
  pH: number
  pOH: number
  hydronium: number
  hydroxide: number
  totalVolume: number
  excessAcidMmol: number
  excessBaseMmol: number
  region: TitrationRegion
}

/** Volume of base (mL) needed to reach equivalence: Vb = Ca·Va / Cb. */
export function equivalenceVolume(p: TitrationParams): number {
  return (p.acidConcentration * p.acidVolume) / p.baseConcentration
}

/** pH after adding `addedVolume` mL of base. */
export function titrationPoint(p: TitrationParams, addedVolume: number): TitrationPoint {
  const vb = Math.max(0, addedVolume)
  const nAcid = p.acidConcentration * p.acidVolume // mmol
  const nBase = p.baseConcentration * vb // mmol
  const totalVolume = p.acidVolume + vb // mL
  const D = (nAcid - nBase) / totalVolume // mmol/mL = mol/L
  // Numerically stable roots of h² − D·h − Kw = 0 for both signs of D.
  const root = Math.sqrt(D * D + 4 * KW)
  const hydronium = D >= 0 ? (D + root) / 2 : (2 * KW) / (root - D)
  const hydroxide = KW / hydronium
  const pH = -Math.log10(hydronium)
  const veq = equivalenceVolume(p)
  const tol = Math.max(1e-9, veq * 1e-6)
  const region: TitrationRegion = Math.abs(vb - veq) <= tol ? 'equivalence' : vb < veq ? 'before' : 'after'
  return {
    addedVolume: vb,
    pH,
    pOH: 14 - pH,
    hydronium,
    hydroxide,
    totalVolume,
    excessAcidMmol: Math.max(0, nAcid - nBase),
    excessBaseMmol: Math.max(0, nBase - nAcid),
    region,
  }
}

/** Sample the titration curve from 0 to maxVolume mL, densifying around equivalence. */
export function titrationCurve(p: TitrationParams, maxVolume: number, points = 200) {
  const veq = equivalenceVolume(p)
  const vols = new Set<number>()
  for (let i = 0; i <= points; i++) vols.add(+((maxVolume * i) / points).toFixed(4))
  if (veq <= maxVolume) {
    for (let i = -20; i <= 20; i++) {
      const v = veq + (i / 20) * Math.min(1, veq * 0.05)
      if (v >= 0 && v <= maxVolume) vols.add(+v.toFixed(4))
    }
    vols.add(+veq.toFixed(4))
  }
  return [...vols].sort((a, b) => a - b).map((v) => ({ volume: v, pH: titrationPoint(p, v).pH }))
}

/* ---------------------------------------------------------------------------
 * Indicators
 * Colour follows the indicator's acid/base forms. Inside the transition range
 * the fraction of base form is estimated with Henderson–Hasselbalch around the
 * indicator's pKa:  f = 1 / (1 + 10^(pKa − pH)).
 * ------------------------------------------------------------------------- */

export type IndicatorId = 'phenolphthalein' | 'bromothymolBlue' | 'methylOrange' | 'methylRed'

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface Indicator {
  id: IndicatorId
  /** Transition range [low, high] in pH units. */
  range: [number, number]
  pKa: number
  acidColor: RGBA
  baseColor: RGBA
}

export const INDICATORS: Record<IndicatorId, Indicator> = {
  phenolphthalein: {
    id: 'phenolphthalein',
    range: [8.2, 10.0],
    pKa: 9.3,
    acidColor: { r: 214, g: 228, b: 245, a: 0.45 }, // colourless (water-clear)
    baseColor: { r: 222, g: 49, b: 140, a: 0.85 }, // pink / magenta
  },
  bromothymolBlue: {
    id: 'bromothymolBlue',
    range: [6.0, 7.6],
    pKa: 7.1,
    acidColor: { r: 230, g: 200, b: 40, a: 0.8 }, // yellow
    baseColor: { r: 35, g: 85, b: 200, a: 0.85 }, // blue
  },
  methylOrange: {
    id: 'methylOrange',
    range: [3.1, 4.4],
    pKa: 3.7,
    acidColor: { r: 215, g: 40, b: 40, a: 0.85 }, // red
    baseColor: { r: 240, g: 190, b: 40, a: 0.8 }, // yellow
  },
  methylRed: {
    id: 'methylRed',
    range: [4.4, 6.2],
    pKa: 5.1,
    acidColor: { r: 215, g: 40, b: 60, a: 0.85 }, // red
    baseColor: { r: 240, g: 200, b: 40, a: 0.8 }, // yellow
  },
}

/** Fraction of indicator in its base (In⁻) form at a given pH. */
export function baseFormFraction(ind: Indicator, pH: number): number {
  return 1 / (1 + Math.pow(10, ind.pKa - pH))
}

export type IndicatorState = 'acid' | 'transition' | 'base'

export function indicatorState(ind: Indicator, pH: number): IndicatorState {
  if (pH < ind.range[0]) return 'acid'
  if (pH > ind.range[1]) return 'base'
  return 'transition'
}

/** Visible colour of the solution with this indicator at this pH. */
export function indicatorColor(ind: Indicator, pH: number): RGBA {
  const f = baseFormFraction(ind, pH)
  const mix = (a: number, b: number) => a + (b - a) * f
  return {
    r: Math.round(mix(ind.acidColor.r, ind.baseColor.r)),
    g: Math.round(mix(ind.acidColor.g, ind.baseColor.g)),
    b: Math.round(mix(ind.acidColor.b, ind.baseColor.b)),
    a: mix(ind.acidColor.a, ind.baseColor.a),
  }
}

export const rgbaToCss = (c: RGBA) => `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a.toFixed(3)})`
export const rgbToHex = (c: RGBA) =>
  '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')

/**
 * Inverse of the curve: volume of base (mL) at which the solution reaches `pH`.
 * From D = [H⁺] − Kw/[H⁺] and D = (Ca·Va − Cb·Vb)/(Va + Vb):
 *   Vb = (Ca·Va − D·Va) / (Cb + D)
 * Returns null when the pH is never reached (e.g. above the base's own pH).
 */
export function volumeAtPH(p: TitrationParams, pH: number): number | null {
  const h = Math.pow(10, -pH)
  const D = h - KW / h
  const denom = p.baseConcentration + D
  if (denom <= 0) return null
  const v = (p.acidConcentration * p.acidVolume - D * p.acidVolume) / denom
  return v >= 0 ? v : null
}

/**
 * Indicator end point: the volume where the colour change is half complete (pH = pKa).
 * The difference from the equivalence volume is the titration (indicator) error.
 */
export function indicatorEndPoint(p: TitrationParams, ind: Indicator) {
  const volume = volumeAtPH(p, ind.pKa)
  const veq = equivalenceVolume(p)
  return {
    volume,
    errorMl: volume === null ? null : volume - veq,
    errorPercent: volume === null ? null : ((volume - veq) / veq) * 100,
  }
}
