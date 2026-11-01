/**
 * Agarose gel electrophoresis of DNA fragments.
 *
 * DNA's phosphate backbone carries one negative charge per nucleotide, so in
 * an electric field every fragment moves toward the anode (+). Charge and
 * friction both grow with length, so in free solution all sizes move at the
 * same speed; it is the agarose mesh that holds long fragments back. Smaller
 * fragments travel further.
 *
 * Mobility model (a Ferguson-style retardation that grows with log size):
 *   μ(bp, C) = μ₀ · [exp(−C · (0.3 + 0.9 · log₁₀(bp/100))) + 0.04 · e^(−C)]
 * where C is the agarose concentration in % and μ₀ the free-solution mobility.
 * The small second term lets very long fragments squeeze through end-on
 * (reptation), which is why they bunch up near the wells.
 *
 * Distance travelled: d = μ · E · t,  E = V / L (electrode spacing).
 *
 * Sizing: the ladder's bands give a standard curve log(d) vs log(bp), close to
 * a straight line over the useful range; an unknown band's distance is read
 * off that line.
 */

/** Free-solution mobility of DNA, cm²/(V·s). */
export const MU0 = 3.75e-4
/** Distance between the electrodes, cm. */
export const BOX_LENGTH = 12
/** Length of the gel from the wells to the far end, cm. */
export const GEL_LENGTH = 8
/** Bromophenol blue runs with fragments of about this size (in a 1 % gel). */
export const DYE_BP = 300

export const LADDER = [100, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 5000, 10000]

export type SampleId = 'ladder' | 'pcr' | 'plasmid' | 'unknownA' | 'unknownB'

export const SAMPLES: Record<SampleId, number[]> = {
  ladder: LADDER,
  // GFP gene fragment from the PCR experiment
  pcr: [720],
  // Plasmid cut with a restriction enzyme into three pieces
  plasmid: [500, 1200, 3000],
  unknownA: [650],
  unknownB: [250, 1800],
}

/** Lane order in the gel, from left to right. */
export const LANES: SampleId[] = ['ladder', 'pcr', 'plasmid', 'unknownA', 'unknownB']

export type Polarity = 'normal' | 'reversed'

export interface GelSettings {
  /** Agarose concentration, % w/v. */
  agarose: number
  voltage: number
  polarity: Polarity
}

export const DEFAULT_SETTINGS: GelSettings = { agarose: 1, voltage: 100, polarity: 'normal' }

/** Electrophoretic mobility, cm²/(V·s). */
export function mobility(bp: number, agarosePct: number): number {
  const c = Math.max(0, agarosePct)
  const sieve = Math.exp(-c * (0.3 + 0.9 * Math.log10(Math.max(1, bp) / 100)))
  const reptation = 0.04 * Math.exp(-c)
  return MU0 * (sieve + reptation)
}

/** Field strength between the electrodes, V/cm. */
export const fieldStrength = (volts: number, length = BOX_LENGTH) => volts / length

/**
 * Distance from the well, cm, after `seconds` of running. Positive is toward
 * the anode. With the leads swapped the DNA leaves the well backwards.
 */
export function migrationDistance(bp: number, s: GelSettings, seconds: number): number {
  const d = mobility(bp, s.agarose) * fieldStrength(s.voltage) * Math.max(0, seconds)
  return s.polarity === 'normal' ? d : -d
}

/** Where the loading dye front is (cm), used to judge when to stop. */
export const dyeFront = (s: GelSettings, seconds: number) => migrationDistance(DYE_BP, s, seconds)

/** Band thickness, cm: the well width plus diffusion over time, plus smearing when the gel heats at high voltage. */
export function bandWidth(seconds: number, volts: number): number {
  return 0.12 + 0.025 * Math.sqrt(Math.max(0, seconds) / 60) + 0.0015 * Math.max(0, volts - 120)
}

export type BandState = 'onGel' | 'ranOff' | 'lost'

export const bandState = (distance: number): BandState => (distance < 0 ? 'lost' : distance > GEL_LENGTH ? 'ranOff' : 'onGel')

export interface Band {
  bp: number
  distance: number
  state: BandState
}

export function bands(sample: SampleId, s: GelSettings, seconds: number): Band[] {
  return SAMPLES[sample].map((bp) => {
    const distance = migrationDistance(bp, s, seconds)
    return { bp, distance, state: bandState(distance) }
  })
}

export interface StandardCurve {
  /** log₁₀(d) = intercept + slope · log₁₀(bp) */
  slope: number
  intercept: number
  r2: number
  /** Ladder sizes used for the fit (the range where sizing is reliable). */
  min: number
  max: number
  points: { bp: number; distance: number }[]
}

/** Least-squares line through log₁₀(distance) vs log₁₀(bp). Needs at least two bands. */
export function fitStandardCurve(points: { bp: number; distance: number }[]): StandardCurve | null {
  const usable = points.filter((p) => p.distance > 0 && p.bp > 0)
  if (usable.length < 2) return null
  const xs = usable.map((p) => Math.log10(p.bp))
  const ys = usable.map((p) => Math.log10(p.distance))
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let sxx = 0
  let sxy = 0
  let syy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2
    sxy += (xs[i] - mx) * (ys[i] - my)
    syy += (ys[i] - my) ** 2
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const intercept = my - slope * mx
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy)
  const sizes = usable.map((p) => p.bp)
  return { slope, intercept, r2, min: Math.min(...sizes), max: Math.max(...sizes), points: usable }
}

/** Standard curve from the ladder bands that are on the gel and clear of the wells (> 0.3 cm). */
export function ladderCurve(s: GelSettings, seconds: number): StandardCurve | null {
  return fitStandardCurve(bands('ladder', s, seconds).filter((b) => b.state === 'onGel' && b.distance > 0.3))
}

/** Fragment size read off the standard curve for a band at `distance` cm. */
export function estimateSize(distance: number, curve: StandardCurve): number {
  if (!(distance > 0)) return NaN
  return Math.pow(10, (Math.log10(distance) - curve.intercept) / curve.slope)
}

/** True when the estimate needs the line extended past the ladder's bands. */
export const isExtrapolated = (bp: number, curve: StandardCurve) => bp < curve.min * 0.95 || bp > curve.max * 1.05

/** Smallest relative gap between neighbouring ladder bands, as a check of how well a gel resolves. */
export function resolution(bpA: number, bpB: number, s: GelSettings, seconds: number): number {
  const a = migrationDistance(bpA, s, seconds)
  const b = migrationDistance(bpB, s, seconds)
  return Math.abs(a - b) / bandWidth(seconds, s.voltage)
}

/** Distance (cm) against size for the chart, log-spaced. */
export function migrationCurve(s: GelSettings, seconds: number, points = 40) {
  return Array.from({ length: points }, (_, i) => {
    const bp = Math.pow(10, 1.9 + (2.2 * i) / (points - 1))
    return { bp, distance: migrationDistance(bp, s, seconds) }
  })
}

/**
 * Runs the gel in simulated time. Positions are integrated step by step, so
 * the voltage or polarity can be changed mid-run like on a real power supply.
 */
export class GelSimulation {
  settings: GelSettings
  /** Running time, s. */
  time = 0
  private offset = new Map<number, number>()

  constructor(settings: GelSettings = DEFAULT_SETTINGS) {
    this.settings = { ...settings }
  }

  /** Loads fresh samples (all bands back in the wells). */
  reset(settings: Partial<GelSettings> = {}) {
    this.settings = { ...this.settings, ...settings }
    this.time = 0
    this.offset.clear()
  }

  /** Changes settings without restarting the run. */
  update(settings: Partial<GelSettings>) {
    this.settings = { ...this.settings, ...settings }
  }

  advance(dt: number) {
    for (const bp of ALL_SIZES) this.offset.set(bp, this.position(bp) + migrationDistance(bp, this.settings, dt))
    this.time += dt
  }

  /** Distance of a fragment from its well, cm (negative: it left the well backwards). */
  position(bp: number): number {
    return this.offset.get(bp) ?? 0
  }

  get dye() {
    return this.position(DYE_BP)
  }

  bands(sample: SampleId): Band[] {
    return SAMPLES[sample].map((bp) => {
      const distance = this.position(bp)
      return { bp, distance, state: bandState(distance) }
    })
  }

  /** Standard curve from the ladder as it is now. */
  get curve(): StandardCurve | null {
    return fitStandardCurve(this.bands('ladder').filter((b) => b.state === 'onGel' && b.distance > 0.3))
  }

  get width() {
    return bandWidth(this.time, this.settings.voltage)
  }
}

const ALL_SIZES = [...new Set([...Object.values(SAMPLES).flat(), DYE_BP])]
