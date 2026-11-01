/**
 * DNA extraction from plant tissue or cheek cells.
 *
 * 1. Mash the tissue (plant cells have a cell wall; cheek cells do not).
 * 2. Extraction buffer: detergent dissolves the lipid membranes (lysis), salt
 *    (Na⁺) shields the negative phosphate backbone so DNA strands can clump.
 * 3. Filter out the pulp. Optional protease digests histones and enzymes.
 * 4. Layer ice-cold ethanol on top. DNA is insoluble once the ethanol fraction
 *    is high enough and comes out as white strands at the interface.
 * 5. Spool the strands on a rod, redissolve in 1 mL and check purity with the
 *    absorbance ratio A260/A280 (pure DNA ≈ 1.8; protein lowers it).
 *
 * Yields are teaching estimates of the right order of magnitude, not lab data.
 */

export type DnaSource = 'strawberry' | 'banana' | 'cheek'

export interface SourceInfo {
  /** Extractable DNA per gram of fruit or per mL of cheek-cell mouthwash, µg. */
  dnaPerUnit: number
  /** Soluble protein per unit, µg. */
  proteinPerUnit: number
  /** Plant cells need mashing to break the cell wall. */
  cellWall: boolean
  unit: 'g' | 'mL'
  amount: { min: number; max: number; default: number }
}

export const SOURCES: Record<DnaSource, SourceInfo> = {
  // Cultivated strawberries are octoploid: eight copies of each chromosome.
  strawberry: { dnaPerUnit: 40, proteinPerUnit: 7000, cellWall: true, unit: 'g', amount: { min: 2, max: 30, default: 10 } },
  banana: { dnaPerUnit: 15, proteinPerUnit: 11000, cellWall: true, unit: 'g', amount: { min: 2, max: 30, default: 10 } },
  cheek: { dnaPerUnit: 3, proteinPerUnit: 300, cellWall: false, unit: 'mL', amount: { min: 2, max: 20, default: 10 } },
}

export interface DnaExtractionSettings {
  source: DnaSource
  /** Grams of fruit or mL of mouthwash. */
  amount: number
  /** Mashing time, s (ignored for cheek cells). */
  mashTime: number
  /** Detergent in the extraction buffer, % v/v. */
  detergent: number
  /** NaCl in the extraction buffer, mol/L. */
  salt: number
  protease: boolean
  /** Ethanol temperature, °C. */
  ethanolTemp: number
  /** Ethanol volume ÷ filtrate volume. */
  ethanolRatio: number
}

export const DEFAULT_SETTINGS: DnaExtractionSettings = {
  source: 'strawberry',
  amount: 10,
  mashTime: 60,
  detergent: 3,
  salt: 0.5,
  protease: true,
  ethanolTemp: -20,
  ethanolRatio: 1.5,
}

/** Share of DNA left behind in the filter pulp. */
export const FILTER_RECOVERY = 0.85
/** Share of the precipitate that winds onto the rod. */
export const SPOOL_EFFICIENCY = 0.8
/** Below this mass (µg) the precipitate cannot be seen; above CLEAR it forms obvious white strands. */
export const VISIBLE_UG = 10
export const CLEAR_UG = 50

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Fraction of cells broken open: detergent dissolves membranes; plant cell walls must be mashed first. */
export function lysisEfficiency(detergentPct: number, mashSeconds: number, cellWall: boolean): number {
  const membranes = 1 - Math.exp(-Math.max(0, detergentPct) / 1.5)
  const walls = cellWall ? 1 - Math.exp(-Math.max(0, mashSeconds) / 30) : 1
  return membranes * walls
}

/** Share of DNA able to aggregate: Na⁺ neutralises the phosphate charges (a little salt is already in the cells). */
export const saltFactor = (molar: number) => 0.15 + (0.85 * Math.max(0, molar)) / (Math.max(0, molar) + 0.1)

/** Volume fraction of ethanol after layering r volumes on one volume of filtrate. */
export const ethanolFraction = (ratio: number) => Math.max(0, ratio) / (1 + Math.max(0, ratio))

/** Share of DNA that is insoluble at that ethanol fraction (DNA comes out above roughly 40–50 % ethanol). */
export const ethanolFactor = (ratio: number) => 1 / (1 + Math.exp(-(ethanolFraction(ratio) - 0.45) / 0.04))

/** Cold ethanol gives a more complete precipitate: 1 at −20 °C, 0.6 at room temperature (25 °C). */
export const coldFactor = (tempC: number) => 0.6 + 0.4 * clamp01((25 - tempC) / 45)

/** Time constant of precipitation, s: faster in colder ethanol. */
export const precipitationTau = (tempC: number) => 8 + 0.6 * (Math.min(40, Math.max(-20, tempC)) + 20)

/** A260 per µg/mL for double-stranded DNA (A260 = 1 ↔ 50 µg/mL) and the matching A280. */
const DNA_A260 = 1 / 50
const DNA_A280 = DNA_A260 / 1.85
/** Protein: A280 = 1 ↔ 1 mg/mL, with A260/A280 ≈ 0.57. */
const PROTEIN_A280 = 1 / 1000
const PROTEIN_A260 = PROTEIN_A280 * 0.57

/** Absorbance ratio A260/A280 for a mixture of DNA and protein (masses in the same volume). */
export function purityRatio(dnaUg: number, proteinUg: number): number {
  const a260 = DNA_A260 * dnaUg + PROTEIN_A260 * proteinUg
  const a280 = DNA_A280 * dnaUg + PROTEIN_A280 * proteinUg
  return a280 > 0 ? a260 / a280 : 0
}

export type Purity = 'pure' | 'protein' | 'none'

/** 1.7–2.0 is accepted as clean DNA; below that protein is present. */
export const purityVerdict = (ratio: number, dnaUg: number): Purity => (dnaUg <= 0 ? 'none' : ratio >= 1.7 ? 'pure' : 'protein')

/** Share of the protein that ends up in the DNA precipitate. */
export const proteinCarryOver = (protease: boolean) => (protease ? 0.0006 : 0.008)

export type Visibility = 'none' | 'faint' | 'clear'
export const visibility = (ug: number): Visibility => (ug >= CLEAR_UG ? 'clear' : ug >= VISIBLE_UG ? 'faint' : 'none')

export interface ExtractionResult {
  /** DNA in the sample, µg. */
  total: number
  lysis: number
  /** DNA released into the buffer, µg. */
  released: number
  /** DNA in the filtrate, µg. */
  filtrate: number
  /** Share of the filtrate's DNA that precipitates. */
  precipitable: number
  /** DNA that comes out of solution, µg. */
  precipitate: number
  /** DNA wound onto the rod, µg. */
  yield: number
  /** Protein carried into the spooled DNA, µg. */
  protein: number
  /** A260 of the spooled DNA redissolved in 1 mL. */
  a260: number
  ratio: number
  purity: Purity
  visible: Visibility
}

export function extract(s: DnaExtractionSettings): ExtractionResult {
  const src = SOURCES[s.source]
  const total = src.dnaPerUnit * s.amount
  const lysis = lysisEfficiency(s.detergent, s.mashTime, src.cellWall)
  const released = total * lysis
  const filtrate = released * FILTER_RECOVERY
  const precipitable = saltFactor(s.salt) * ethanolFactor(s.ethanolRatio) * coldFactor(s.ethanolTemp)
  const precipitate = filtrate * precipitable
  const dna = precipitate * SPOOL_EFFICIENCY
  const protein = src.proteinPerUnit * s.amount * lysis * proteinCarryOver(s.protease)
  const ratio = purityRatio(dna, protein)
  return {
    total,
    lysis,
    released,
    filtrate,
    precipitable,
    precipitate,
    yield: dna,
    protein,
    a260: DNA_A260 * dna + PROTEIN_A260 * protein,
    ratio,
    purity: purityVerdict(ratio, dna),
    visible: visibility(precipitate),
  }
}

/** DNA out of solution t seconds after the ethanol was added, µg. */
export const precipitatedAt = (precipitate: number, t: number, tempC: number) => precipitate * (1 - Math.exp(-Math.max(0, t) / precipitationTau(tempC)))

/** Yield (µg) against ethanol temperature for the chart. */
export function temperatureCurve(s: DnaExtractionSettings, points = 31) {
  return Array.from({ length: points }, (_, i) => {
    const T = -20 + (45 * i) / (points - 1)
    return { temp: T, yield: extract({ ...s, ethanolTemp: T }).yield }
  })
}

/** DNA precipitating over time after the ethanol is layered on. */
export function precipitationCurve(s: DnaExtractionSettings, points = 41) {
  const r = extract(s)
  const end = 5 * precipitationTau(s.ethanolTemp)
  return Array.from({ length: points }, (_, i) => {
    const t = (end * i) / (points - 1)
    return { t, dna: precipitatedAt(r.precipitate, t, s.ethanolTemp) }
  })
}

export type DnaStage =
  | 'sample'
  | 'mashing'
  | 'mashed'
  | 'lysing'
  | 'lysed'
  | 'filtering'
  | 'filtered'
  | 'precipitating'
  | 'precipitated'
  | 'spooled'

/** Simulated durations of the timed steps, s. */
export const LYSIS_TIME = 10
export const FILTER_TIME = 8

/**
 * Walks through the procedure. Timed steps (mashing, lysing, filtering,
 * precipitating) run with `advance`; `next` starts the following step.
 */
export class DnaExtractionSimulation {
  settings: DnaExtractionSettings
  stage: DnaStage = 'sample'
  /** Time spent in the current timed step, s. */
  elapsed = 0

  constructor(settings: DnaExtractionSettings = DEFAULT_SETTINGS) {
    this.settings = { ...settings }
  }

  get result() {
    return extract(this.settings)
  }

  get cellWall() {
    return SOURCES[this.settings.source].cellWall
  }

  reset(settings: Partial<DnaExtractionSettings> = {}) {
    this.settings = { ...this.settings, ...settings }
    this.stage = 'sample'
    this.elapsed = 0
  }

  /** Length of the current timed step, s (0 for a waiting step). */
  get duration(): number {
    switch (this.stage) {
      case 'mashing':
        return Math.max(1, this.settings.mashTime)
      case 'lysing':
        return LYSIS_TIME
      case 'filtering':
        return FILTER_TIME
      case 'precipitating':
        return 5 * precipitationTau(this.settings.ethanolTemp)
      default:
        return 0
    }
  }

  get running() {
    return this.duration > 0
  }

  /** Progress through the current timed step, 0–1 (1 once it is done). */
  get progress() {
    const d = this.duration
    return d > 0 ? Math.min(1, this.elapsed / d) : 1
  }

  /** Starts the next step. Returns false once the DNA has been spooled. */
  next(): boolean {
    const order: Partial<Record<DnaStage, DnaStage>> = {
      sample: this.cellWall ? 'mashing' : 'lysing',
      mashed: 'lysing',
      lysed: 'filtering',
      filtered: 'precipitating',
      precipitated: 'spooled',
    }
    const to = order[this.stage]
    if (!to) return false
    this.stage = to
    this.elapsed = 0
    return true
  }

  /** Advances a timed step; returns true when it finishes. */
  advance(dt: number): boolean {
    if (!this.running) return false
    this.elapsed += dt
    if (this.elapsed < this.duration) return false
    const done: Partial<Record<DnaStage, DnaStage>> = { mashing: 'mashed', lysing: 'lysed', filtering: 'filtered', precipitating: 'precipitated' }
    this.stage = done[this.stage]!
    this.elapsed = 0
    return true
  }

  /** Cells broken so far, 0–1 (grows while mashing and lysing). */
  get lysed(): number {
    const s = this.settings
    const wall = this.cellWall
    const order: DnaStage[] = ['sample', 'mashing', 'mashed', 'lysing', 'lysed']
    const i = order.indexOf(this.stage)
    if (i < 0) return lysisEfficiency(s.detergent, s.mashTime, wall)
    if (i <= 2) return 0
    // During lysis the detergent acts gradually.
    const k = this.stage === 'lysing' ? this.progress : 1
    return lysisEfficiency(s.detergent, s.mashTime, wall) * k
  }

  /** DNA visible out of solution, µg. */
  get precipitated(): number {
    const r = this.result
    if (this.stage === 'precipitating') return precipitatedAt(r.precipitate, this.elapsed, this.settings.ethanolTemp)
    if (this.stage === 'precipitated' || this.stage === 'spooled') return r.precipitate
    return 0
  }
}
