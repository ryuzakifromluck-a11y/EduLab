/**
 * Conventional polymerase chain reaction (PCR).
 *
 * Each thermal cycle has three steps:
 *   denaturation (94–98 °C)  the two strands of the template separate,
 *   annealing    (50–65 °C)  the primers bind either side of the target,
 *   extension    (72 °C)     the polymerase copies the target from each primer.
 *
 * With every step working, the number of target copies doubles each cycle:
 *   N(n) = N₀ · 2ⁿ
 * In practice the efficiency E (0–1) of a cycle is the product of the three
 * steps and of how much polymerase is still active, and the reaction slows
 * down as primers and dNTPs run out (plateau):
 *   N(n+1) = N(n) · (1 + E · (1 − N(n)/N_max))
 *
 * Primer melting temperature uses the basic rule for primers of 14 nt and more,
 *   Tm = 64.9 + 41 · (G+C − 16.4) / N,
 * and the Wallace rule, Tm = 2(A+T) + 4(G+C), for shorter ones.
 */

export const DENATURE_RANGE = { min: 85, max: 100 }
export const ANNEAL_RANGE = { min: 40, max: 72 }
export const EXTENSION_TEMP = 72
/** Hold times of the denaturation and annealing steps, s. */
export const DENATURE_TIME = 30
export const ANNEAL_TIME = 30
/** Heating/cooling rate of the block, °C/s. */
export const RAMP_RATE = 3
/** Taq synthesis rate used for planning extension times: about 1 kb per minute. */
export const EXTENSION_RATE = 1000 / 60
/** Copies the reaction can make before primers and dNTPs run out. */
export const MAX_COPIES = 2e12
/** Average mass of one base pair, g/mol. */
const BP_MASS = 650
const AVOGADRO = 6.022e23

export type Polymerase = 'taq' | 'ecoli'

export interface PcrTarget {
  id: 'actin' | 'gfp' | 'rrna16s'
  forward: string
  /** Reverse primer, written 5′→3′ (it binds the other strand). */
  reverse: string
  /** First base of the forward primer and last base covered by the reverse primer on the template. */
  start: number
  end: number
}

/** Teaching targets. The primer sequences are illustrative, chosen to have Tm ≈ 57–60 °C. */
export const TARGETS: PcrTarget[] = [
  { id: 'actin', forward: 'CCTGGCACCCAGCACAATGAAG', reverse: 'GCCGATCCACACGGAGTACTTG', start: 1241, end: 1490 },
  { id: 'gfp', forward: 'CAAGGGCGAGGAGCTGTTCACC', reverse: 'GTCCATGCCGAGAGTGATCCCG', start: 101, end: 820 },
  { id: 'rrna16s', forward: 'AGAGTTTGATCCTGGCTCAGGAC', reverse: 'GGCTACCTTGTTACGACTTCACCC', start: 8, end: 1472 },
]

export const findTarget = (id: PcrTarget['id']) => TARGETS.find((t) => t.id === id) ?? TARGETS[0]

/** Size of the product, bp: from the start of the forward primer to the end of the reverse primer. */
export const ampliconSize = (t: Pick<PcrTarget, 'start' | 'end'>) => t.end - t.start + 1

export function gcCount(seq: string): number {
  return [...seq.toUpperCase()].filter((b) => b === 'G' || b === 'C').length
}

export const gcContent = (seq: string) => (seq.length ? gcCount(seq) / seq.length : 0)

/** Primer melting temperature, °C. */
export function primerTm(seq: string): number {
  const s = seq.toUpperCase().replace(/[^ACGT]/g, '')
  const n = s.length
  if (!n) return 0
  const gc = gcCount(s)
  if (n < 14) return 2 * (n - gc) + 4 * gc
  return 64.9 + (41 * (gc - 16.4)) / n
}

/** The pair anneals no better than its weaker primer. */
export const pairTm = (t: PcrTarget) => Math.min(primerTm(t.forward), primerTm(t.reverse))

/** Recommended annealing temperature: about 5 °C below the primers' Tm. */
export const recommendedAnneal = (t: PcrTarget) => Math.round(pairTm(t) - 5)

/** Fraction of templates whose strands separate at the denaturation temperature. */
export const denaturationEfficiency = (tempC: number) => 1 / (1 + Math.exp(-(tempC - 91) / 1.0))

/** Fraction of targets with primers bound: primers fall off when the annealing temperature reaches their Tm. */
export const annealingEfficiency = (annealC: number, tm: number) => 1 / (1 + Math.exp((annealC - (tm - 1.5)) / 1.0))

/** Share of primers binding to the wrong places when annealing is far too cold (gives extra bands). */
export const nonspecificFraction = (annealC: number, tm: number) => 1 / (1 + Math.exp((annealC - (tm - 12)) / 1.5))

/** Fraction of strands copied all the way to the end in the extension time. */
export const extensionEfficiency = (seconds: number, bp: number) => Math.min(1, (Math.max(0, seconds) * EXTENSION_RATE) / bp)

/** Half-life of the enzyme at a temperature, min. Taq (from a hot-spring bacterium) survives ~40 min at 95 °C. */
export function polymeraseHalfLife(p: Polymerase, tempC: number): number {
  const at95 = p === 'taq' ? 40 : 0.05
  return at95 * Math.pow(2, -(tempC - 95) / 1.1)
}

/** Share of the enzyme still active after `cycles` denaturation steps. */
export function polymeraseActivity(p: Polymerase, denatureC: number, cycles: number): number {
  const minutes = (cycles * DENATURE_TIME) / 60
  return Math.exp((-Math.LN2 * minutes) / polymeraseHalfLife(p, denatureC))
}

export interface PcrSettings {
  cycles: number
  denatureTemp: number
  annealTemp: number
  /** Extension hold time, s. */
  extensionTime: number
  target: PcrTarget['id']
  /** Template copies at the start. */
  templateCopies: number
  polymerase: Polymerase
}

export const DEFAULT_SETTINGS: PcrSettings = {
  cycles: 30,
  denatureTemp: 95,
  annealTemp: 55,
  extensionTime: 60,
  target: 'gfp',
  templateCopies: 1e4,
  polymerase: 'taq',
}

/** Efficiency of cycle k (1-based): every step must work and the enzyme must still be active. */
export function cycleEfficiency(s: PcrSettings, k: number): number {
  const t = findTarget(s.target)
  return (
    denaturationEfficiency(s.denatureTemp) *
    annealingEfficiency(s.annealTemp, pairTm(t)) *
    extensionEfficiency(s.extensionTime, ampliconSize(t)) *
    // The enzyme has been through k denaturation steps by the time it extends in cycle k.
    polymeraseActivity(s.polymerase, s.denatureTemp, k)
  )
}

export const idealCopies = (n0: number, cycles: number) => n0 * Math.pow(2, cycles)

export interface CyclePoint {
  cycle: number
  copies: number
  ideal: number
  efficiency: number
}

/** Copies after each cycle, from cycle 0 (the template) to `s.cycles`. */
export function amplify(s: PcrSettings): CyclePoint[] {
  const out: CyclePoint[] = [{ cycle: 0, copies: s.templateCopies, ideal: s.templateCopies, efficiency: 0 }]
  let n = s.templateCopies
  for (let k = 1; k <= s.cycles; k++) {
    const e = cycleEfficiency(s, k)
    n = n * (1 + e * Math.max(0, 1 - n / MAX_COPIES))
    out.push({ cycle: k, copies: n, ideal: idealCopies(s.templateCopies, k), efficiency: e })
  }
  return out
}

/** Mass of DNA, ng, for a number of double-stranded copies of a given length. */
export const copiesToNg = (copies: number, bp: number) => ((copies * bp * BP_MASS) / AVOGADRO) * 1e9

/** About 5 ng of DNA in a band is the least ethidium bromide or a safe stain shows. */
export const DETECTION_NG = 5

export interface PcrOutcome {
  target: PcrTarget
  amplicon: number
  tm: number
  copies: number
  ng: number
  /** Fold increase over the template. */
  fold: number
  /** Mean efficiency over the run, 0–1. */
  meanEfficiency: number
  visible: boolean
  /** Extra bands from mispriming, as a share of the product. */
  nonspecific: number
}

export function outcome(s: PcrSettings): PcrOutcome {
  const target = findTarget(s.target)
  const run = amplify(s)
  const last = run[run.length - 1]
  const amplicon = ampliconSize(target)
  const ng = copiesToNg(last.copies, amplicon)
  const tm = pairTm(target)
  const fold = last.copies / s.templateCopies
  return {
    target,
    amplicon,
    tm,
    copies: last.copies,
    ng,
    fold,
    meanEfficiency: s.cycles > 0 ? Math.pow(fold, 1 / s.cycles) - 1 : 0,
    visible: ng >= DETECTION_NG,
    nonspecific: nonspecificFraction(s.annealTemp, tm),
  }
}

export type PcrPhase = 'denature' | 'anneal' | 'extend'

/** Block temperature over one cycle, with ramps between the holds. */
export function cycleProfile(s: PcrSettings) {
  const holds: { phase: PcrPhase; temp: number; time: number }[] = [
    { phase: 'denature', temp: s.denatureTemp, time: DENATURE_TIME },
    { phase: 'anneal', temp: s.annealTemp, time: ANNEAL_TIME },
    { phase: 'extend', temp: EXTENSION_TEMP, time: s.extensionTime },
  ]
  const segments: { phase: PcrPhase; from: number; to: number; start: number; end: number }[] = []
  let t = 0
  let prev = EXTENSION_TEMP
  for (const h of holds) {
    const ramp = Math.abs(h.temp - prev) / RAMP_RATE
    segments.push({ phase: h.phase, from: prev, to: h.temp, start: t, end: t + ramp })
    t += ramp
    segments.push({ phase: h.phase, from: h.temp, to: h.temp, start: t, end: t + h.time })
    t += h.time
    prev = h.temp
  }
  return { segments, duration: t }
}

/** Block temperature, step and progress through that step (ramp + hold, 0–1) at time `t` into a cycle. */
export function temperatureAt(s: PcrSettings, t: number): { temp: number; phase: PcrPhase; stepProgress: number } {
  const { segments, duration } = cycleProfile(s)
  const tt = ((t % duration) + duration) % duration
  const seg = segments.find((g) => tt < g.end) ?? segments[segments.length - 1]
  const f = seg.end > seg.start ? (tt - seg.start) / (seg.end - seg.start) : 1
  const step = segments.filter((g) => g.phase === seg.phase)
  const start = step[0].start
  const end = step[step.length - 1].end
  return { temp: seg.from + (seg.to - seg.from) * f, phase: seg.phase, stepProgress: end > start ? (tt - start) / (end - start) : 1 }
}

/** Points for a temperature-vs-time chart of a few cycles. */
export function profileCurve(s: PcrSettings, cycles = 2) {
  const { segments, duration } = cycleProfile(s)
  const out: { t: number; temp: number }[] = []
  for (let c = 0; c < cycles; c++) {
    for (const g of segments) {
      out.push({ t: c * duration + g.start, temp: g.from })
      out.push({ t: c * duration + g.end, temp: g.to })
    }
  }
  return out
}

/**
 * Runs the thermal cycler in simulated time. `copies` changes when a cycle's
 * extension step finishes.
 */
export class PcrSimulation {
  settings: PcrSettings
  /** Time into the run, s. */
  time = 0
  /** Cycles completed. */
  cycle = 0
  copies: number
  private run: CyclePoint[]

  constructor(settings: PcrSettings = DEFAULT_SETTINGS) {
    this.settings = { ...settings }
    this.copies = settings.templateCopies
    this.run = amplify(this.settings)
  }

  reset(settings: Partial<PcrSettings> = {}) {
    this.settings = { ...this.settings, ...settings }
    this.time = 0
    this.cycle = 0
    this.run = amplify(this.settings)
    this.copies = this.settings.templateCopies
  }

  get cycleDuration() {
    return cycleProfile(this.settings).duration
  }

  get done() {
    return this.cycle >= this.settings.cycles
  }

  get history() {
    return this.run.slice(0, this.cycle + 1)
  }

  /** Current block temperature and step (room temperature before the start and after the end). */
  get state(): { temp: number; phase: PcrPhase | 'idle' | 'hold'; progress: number; stepProgress: number } {
    if (this.done) return { temp: 4, phase: 'hold', progress: 1, stepProgress: 1 }
    if (this.time === 0) return { temp: 25, phase: 'idle', progress: 0, stepProgress: 0 }
    const into = this.time - this.cycle * this.cycleDuration
    const { temp, phase, stepProgress } = temperatureAt(this.settings, into)
    return { temp, phase, progress: into / this.cycleDuration, stepProgress }
  }

  /** Advances the run; returns true when the last cycle finishes. */
  advance(dt: number): boolean {
    if (this.done) return false
    this.time += dt
    const d = this.cycleDuration
    while (!this.done && this.time >= (this.cycle + 1) * d) {
      this.cycle += 1
      this.copies = this.run[this.cycle].copies
    }
    if (this.done) {
      this.time = this.settings.cycles * d
      return true
    }
    return false
  }
}
