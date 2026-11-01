/**
 * Solubility of salts in water as a function of temperature.
 *
 * Solubility S(T) is tabulated every 10 °C from 0 to 100 °C in grams of
 * anhydrous salt per 100 g of water (CRC Handbook / standard data-book
 * values) and interpolated with a monotone cubic (Fritsch–Carlson), so the
 * curves are smooth and never overshoot the data.
 *
 * Dissolving and crystallising are modelled as first-order approaches to
 * saturation: the dissolved mass m_d moves towards min(m_added, S·m_w/100)
 * with a rate that increases with temperature.
 */

export interface Salt {
  id: 'kno3' | 'nh4cl' | 'kcl' | 'nacl' | 'cuso4'
  formula: string
  /** Solubility at 0, 10, …, 100 °C, g per 100 g water. */
  table: number[]
  /** Solution colour at saturation (for the view), or null if colourless. */
  color: string | null
}

export const SALTS: Salt[] = [
  { id: 'kno3', formula: 'KNO₃', table: [13.3, 20.9, 31.6, 45.8, 63.9, 85.5, 110, 138, 169, 202, 246], color: null },
  { id: 'nh4cl', formula: 'NH₄Cl', table: [29.4, 33.3, 37.2, 41.4, 45.8, 50.4, 55.2, 60.2, 65.6, 71.3, 77.3], color: null },
  { id: 'kcl', formula: 'KCl', table: [28.0, 31.2, 34.2, 37.2, 40.1, 42.6, 45.8, 48.8, 51.3, 53.9, 56.3], color: null },
  { id: 'nacl', formula: 'NaCl', table: [35.7, 35.8, 36.0, 36.3, 36.6, 37.0, 37.3, 37.8, 38.4, 39.0, 39.8], color: null },
  { id: 'cuso4', formula: 'CuSO₄', table: [14.3, 17.4, 20.7, 25.0, 28.5, 33.3, 40.0, 47.0, 55.0, 64.2, 75.4], color: '#2f8fd8' },
]

export const saltById = (id: Salt['id']) => SALTS.find((s) => s.id === id) ?? SALTS[0]

export const T_MIN = 0
export const T_MAX = 100
const STEP = 10

/** Fritsch–Carlson tangents for a monotone cubic Hermite interpolant. */
function tangents(y: number[]): number[] {
  const n = y.length
  const d = Array.from({ length: n - 1 }, (_, i) => (y[i + 1] - y[i]) / STEP)
  const m = new Array<number>(n)
  m[0] = d[0]
  m[n - 1] = d[n - 2]
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * b * d[i]
    }
  }
  return m
}

const TANGENTS = new Map(SALTS.map((s) => [s.id, tangents(s.table)]))

/** Solubility in g per 100 g water at temperature T (°C), clamped to 0–100 °C. */
export function solubility(id: Salt['id'], T: number): number {
  const salt = saltById(id)
  const y = salt.table
  const m = TANGENTS.get(salt.id)!
  const t = Math.min(T_MAX, Math.max(T_MIN, T))
  const i = Math.min(y.length - 2, Math.floor((t - T_MIN) / STEP))
  const u = (t - (T_MIN + i * STEP)) / STEP
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  const h11 = u ** 3 - u ** 2
  return h00 * y[i] + h10 * STEP * m[i] + h01 * y[i + 1] + h11 * STEP * m[i + 1]
}

/** Lowest temperature at which `grams` per 100 g water fully dissolve, or null if never (≤ 100 °C). */
export function saturationTemperature(id: Salt['id'], gramsPer100: number): number | null {
  if (gramsPer100 <= solubility(id, T_MIN)) return T_MIN
  if (gramsPer100 > solubility(id, T_MAX)) return null
  let lo = T_MIN
  let hi = T_MAX
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2
    if (solubility(id, mid) >= gramsPer100) hi = mid
    else lo = mid
  }
  return hi
}

/** Mass fraction of salt in a solution, %. */
export const massPercent = (dissolved: number, water: number) => (100 * dissolved) / (dissolved + water)

export type SolutionState = 'unsaturated' | 'saturated' | 'supersaturated'

export class SolutionSimulation {
  salt: Salt['id']
  /** Mass of water, g. */
  water = 100
  temperature: number
  added = 0
  dissolved = 0
  time = 0

  constructor(salt: Salt['id'], temperature: number) {
    this.salt = salt
    this.temperature = temperature
  }

  get capacity() {
    return (solubility(this.salt, this.temperature) * this.water) / 100
  }
  get undissolved() {
    return Math.max(0, this.added - this.dissolved)
  }
  get target() {
    return Math.min(this.added, this.capacity)
  }
  get state(): SolutionState {
    const cap = this.capacity
    if (this.dissolved > cap * 1.005) return 'supersaturated'
    return this.added >= cap - 1e-6 ? 'saturated' : 'unsaturated'
  }
  /** First-order rate constant, 1/s; faster in warm water. */
  get rate() {
    return 0.25 * Math.pow(2, (this.temperature - 20) / 25)
  }

  add(grams: number) {
    this.added = Math.max(0, this.added + grams)
    this.dissolved = Math.min(this.dissolved, this.added)
  }

  reset(salt = this.salt) {
    this.salt = salt
    this.added = 0
    this.dissolved = 0
    this.time = 0
  }

  advance(dt: number) {
    const target = this.target
    this.dissolved = target + (this.dissolved - target) * Math.exp(-this.rate * dt)
    this.time += dt
  }
}

/** Solubility curves of every salt, one row per temperature. */
export function solubilityCurves(points = 51) {
  return Array.from({ length: points }, (_, i) => {
    const T = T_MIN + ((T_MAX - T_MIN) * i) / (points - 1)
    const row: Record<string, number> = { T }
    for (const s of SALTS) row[s.id] = solubility(s.id, T)
    return row
  })
}
