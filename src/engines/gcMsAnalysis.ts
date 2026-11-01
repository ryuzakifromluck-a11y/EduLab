/**
 * Gas chromatography – mass spectrometry (GC/MS) of a volatile mixture.
 *
 * Gas chromatography. The sample is vaporised and carried by helium through a long capillary
 * column. Each compound partitions between the gas and the liquid stationary phase on the wall;
 * the retention factor k says how long it spends in the stationary phase:
 *
 *   t_R = t_M · (1 + k)         t_M = hold-up time (unretained gas), ∝ 1/flow
 *   k   = e^((T_b,eff − T_column)/θ + k₀)
 *
 * Less volatile compounds (higher boiling point T_b) are retained longer; a hotter column
 * shortens all retention times. "Like dissolves like": on a polar stationary phase (PEG/WAX)
 * polar compounds are held more strongly, so T_b,eff = T_b + P·polarity·(column polarity − ¼).
 * Peaks are Gaussian with σ = t_R/√N, and the plate number N follows a van Deemter curve in the
 * carrier-gas flow (best near 1.2 mL/min). Two peaks are baseline-resolved when
 * R_s = Δt_R / (2(σ₁ + σ₂)) ≥ 1.5.
 *
 * Mass spectrometry. Molecules leaving the column are ionised by 70 eV electrons. The molecular
 * ion M⁺• (m/z = molar mass) partly breaks into fragment ions; the tallest peak is the base peak
 * (100 %). The pattern is a fingerprint, so the spectrum at each chromatographic peak is matched
 * against a library by cosine similarity. Co-eluting compounds give a mixed spectrum and a poor
 * match. Spectra are simplified from NIST EI reference spectra (major ions only).
 */

export type CompoundId = 'acetone' | 'ethanol' | 'hexane' | 'ethylAcetate' | 'toluene' | 'butanol'
export type ColumnId = 'nonpolar' | 'polar'
export type MixtureId = 'A' | 'B' | 'C'

export interface Compound {
  id: CompoundId
  formula: string
  /** Molar mass, g/mol (nominal = m/z of M⁺•). */
  M: number
  /** Boiling point, °C. */
  bp: number
  /** 0 (non-polar) – 1 (very polar). */
  polarity: number
  /** Relative abundance (%) per m/z. */
  spectrum: Record<number, number>
  /** Ion assignments for the main peaks. */
  ions: Record<number, string>
}

export const COMPOUNDS: Record<CompoundId, Compound> = {
  acetone: {
    id: 'acetone',
    formula: 'C₃H₆O',
    M: 58,
    bp: 56,
    polarity: 0.55,
    spectrum: { 15: 20, 42: 8, 43: 100, 58: 30 },
    ions: { 15: 'CH₃⁺', 43: 'CH₃CO⁺', 58: 'M⁺•' },
  },
  ethanol: {
    id: 'ethanol',
    formula: 'C₂H₆O',
    M: 46,
    bp: 78,
    polarity: 0.65,
    spectrum: { 27: 20, 29: 25, 31: 100, 45: 50, 46: 20 },
    ions: { 29: 'CHO⁺', 31: 'CH₂OH⁺', 45: '[M−H]⁺', 46: 'M⁺•' },
  },
  hexane: {
    id: 'hexane',
    formula: 'C₆H₁₄',
    M: 86,
    bp: 69,
    polarity: 0,
    spectrum: { 27: 30, 29: 45, 41: 65, 42: 35, 43: 80, 56: 40, 57: 100, 71: 10, 86: 15 },
    ions: { 29: 'C₂H₅⁺', 43: 'C₃H₇⁺', 57: 'C₄H₉⁺', 71: 'C₅H₁₁⁺', 86: 'M⁺•' },
  },
  ethylAcetate: {
    id: 'ethylAcetate',
    formula: 'C₄H₈O₂',
    M: 88,
    bp: 77,
    polarity: 0.4,
    spectrum: { 29: 30, 43: 100, 45: 18, 61: 15, 70: 12, 73: 5, 88: 10 },
    ions: { 29: 'C₂H₅⁺', 43: 'CH₃CO⁺', 61: 'CH₃C(OH)₂⁺', 70: '[M−H₂O]⁺•', 88: 'M⁺•' },
  },
  toluene: {
    id: 'toluene',
    formula: 'C₇H₈',
    M: 92,
    bp: 111,
    polarity: 0.1,
    spectrum: { 39: 8, 51: 5, 65: 12, 91: 100, 92: 60 },
    ions: { 65: 'C₅H₅⁺', 91: 'C₇H₇⁺', 92: 'M⁺•' },
  },
  butanol: {
    id: 'butanol',
    formula: 'C₄H₁₀O',
    M: 74,
    bp: 118,
    polarity: 0.6,
    spectrum: { 27: 40, 29: 30, 31: 90, 41: 60, 42: 30, 43: 55, 56: 100, 74: 1 },
    ions: { 31: 'CH₂OH⁺', 41: 'C₃H₅⁺', 43: 'C₃H₇⁺', 56: '[M−H₂O]⁺•', 74: 'M⁺•' },
  },
}

export const COMPOUND_IDS = Object.keys(COMPOUNDS) as CompoundId[]

/** Unknown mixtures (relative amounts). */
export const MIXTURES: Record<MixtureId, Partial<Record<CompoundId, number>>> = {
  A: { acetone: 1, ethanol: 0.8, toluene: 0.6 },
  B: { hexane: 0.9, ethylAcetate: 1, butanol: 0.7 },
  C: { acetone: 0.8, ethanol: 0.7, hexane: 0.6, ethylAcetate: 0.9, toluene: 0.5, butanol: 0.6 },
}

export const COLUMN_POLARITY: Record<ColumnId, number> = { nonpolar: 0, polar: 1 }
export const THETA = 30 // °C per e-fold in k
export const K0 = 0.5
export const POLARITY_WEIGHT = 60 // °C
export const TM_AT_1ML = 1.5 // min hold-up time at 1 mL/min
export const N_MAX = 20_000

export interface GcConditions {
  column: ColumnId
  /** Isothermal oven temperature, °C. */
  tempC: number
  /** Carrier-gas (He) flow, mL/min. */
  flow: number
}

export const holdUpTime = (flow: number) => TM_AT_1ML / flow

export function effectiveBoilingPoint(c: Compound, column: ColumnId): number {
  return c.bp + POLARITY_WEIGHT * c.polarity * (COLUMN_POLARITY[column] - 0.25)
}

export function retentionFactor(c: Compound, cond: GcConditions): number {
  return Math.exp((effectiveBoilingPoint(c, cond.column) - cond.tempC) / THETA + K0)
}

export function retentionTime(c: Compound, cond: GcConditions): number {
  return holdUpTime(cond.flow) * (1 + retentionFactor(c, cond))
}

/** Van Deemter: H = A + B/u + C·u (arbitrary units, flow as u). */
export function plateHeight(flow: number): number {
  return 0.3 + 0.5 / flow + 0.35 * flow
}
export const OPTIMUM_FLOW = Math.sqrt(0.5 / 0.35)
export function plateNumber(flow: number): number {
  return (N_MAX * plateHeight(OPTIMUM_FLOW)) / plateHeight(flow)
}

export function peakSigma(tR: number, flow: number): number {
  return tR / Math.sqrt(plateNumber(flow))
}

export interface Elution {
  id: CompoundId
  amount: number
  tR: number
  sigma: number
}

export function elutions(mixture: Partial<Record<CompoundId, number>>, cond: GcConditions): Elution[] {
  return (Object.entries(mixture) as [CompoundId, number][])
    .map(([id, amount]) => {
      const tR = retentionTime(COMPOUNDS[id], cond)
      return { id, amount, tR, sigma: peakSigma(tR, cond.flow) }
    })
    .sort((a, b) => a.tR - b.tR)
}

const gauss = (t: number, e: Elution) => (e.amount / (e.sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-((t - e.tR) ** 2) / (2 * e.sigma ** 2))

/** Total-ion-current signal at time t (min). */
export function signalAt(els: Elution[], t: number): number {
  let s = 0
  for (const e of els) s += gauss(t, e)
  return s
}

/** End of the run: a little after the last peak, capped at 60 min. */
export function runTime(els: Elution[]): number {
  const last = els.length ? els[els.length - 1] : null
  return Math.min(60, last ? last.tR + 6 * last.sigma + 0.5 : 5)
}

export function chromatogram(els: Elution[], tEnd: number, points = 600) {
  const out: { t: number; signal: number }[] = []
  for (let i = 0; i <= points; i++) {
    const t = (tEnd * i) / points
    out.push({ t, signal: signalAt(els, t) })
  }
  return out
}

/** Resolution between two adjacent peaks. */
export function resolution(a: Elution, b: Elution): number {
  return Math.abs(b.tR - a.tR) / (2 * (a.sigma + b.sigma))
}

/** Apexes of the TIC (local maxima above 2 % of the tallest peak) up to time tEnd. */
export function detectPeaks(els: Elution[], tEnd: number): { t: number; height: number }[] {
  if (!els.length) return []
  const minSigma = Math.min(...els.map((e) => e.sigma))
  const dt = minSigma / 8
  const maxH = Math.max(...els.map((e) => signalAt(els, e.tR)))
  const peaks: { t: number; height: number }[] = []
  let prev = signalAt(els, 0)
  let cur = signalAt(els, dt)
  for (let t = dt; t + dt <= tEnd; t += dt) {
    const next = signalAt(els, t + dt)
    if (cur > prev && cur >= next && cur > 0.02 * maxH) peaks.push({ t, height: cur })
    prev = cur
    cur = next
  }
  return peaks
}

export interface SpectrumPeak {
  mz: number
  I: number
}

/** Mass spectrum (base peak = 100) recorded at time t: the sum of whatever is eluting. */
export function spectrumAt(els: Elution[], t: number): SpectrumPeak[] {
  const acc = new Map<number, number>()
  for (const e of els) {
    const w = gauss(t, e)
    if (w <= 0) continue
    for (const [mz, I] of Object.entries(COMPOUNDS[e.id].spectrum)) acc.set(+mz, (acc.get(+mz) ?? 0) + w * I)
  }
  const max = Math.max(0, ...acc.values())
  if (max <= 0) return []
  return [...acc.entries()].map(([mz, I]) => ({ mz, I: (I / max) * 100 })).filter((p) => p.I >= 0.5).sort((a, b) => a.mz - b.mz)
}

export function basePeak(spec: SpectrumPeak[]): SpectrumPeak | null {
  return spec.length ? spec.reduce((a, b) => (b.I > a.I ? b : a)) : null
}

/** Highest m/z in the spectrum, taken as the molecular ion. */
export function molecularIon(spec: SpectrumPeak[]): SpectrumPeak | null {
  return spec.length ? spec[spec.length - 1] : null
}

/**
 * Weighted cosine similarity between a spectrum and a library entry (0–1). Peaks are weighted
 * by m/z·√I, as in library search algorithms, so heavier, more characteristic ions count more.
 */
export function similarity(spec: SpectrumPeak[], c: Compound): number {
  const a = new Map(spec.map((p) => [p.mz, p.I]))
  const keys = new Set([...a.keys(), ...Object.keys(c.spectrum).map(Number)])
  let dot = 0
  let na = 0
  let nb = 0
  for (const k of keys) {
    const x = k * Math.sqrt(a.get(k) ?? 0)
    const y = k * Math.sqrt(c.spectrum[k] ?? 0)
    dot += x * y
    na += x * x
    nb += y * y
  }
  return na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : 0
}

export function matchLibrary(spec: SpectrumPeak[]): { id: CompoundId; score: number }[] {
  return COMPOUND_IDS.map((id) => ({ id, score: similarity(spec, COMPOUNDS[id]) })).sort((a, b) => b.score - a.score)
}

/** A library hit is trusted above this similarity. */
export const MATCH_THRESHOLD = 0.9
