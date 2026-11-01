/**
 * Density measurement, ρ = m / V.
 *
 * Solids: the mass comes from a balance; the volume either from the
 * dimensions of a regular block (V = l·w·h) or by water displacement — the
 * rise of the level in a graduated cylinder (V = V₂ − V₁) or the water that
 * runs out of an overflow (Eureka) can.
 *
 * Liquids: with a pycnometer (density bottle) of fixed volume weighed empty,
 * full of water and full of the liquid,
 *
 *   ρ = (m_liquid − m_empty) / (m_water − m_empty) · ρ_water(T)
 *
 * or with a hydrometer, which floats deeper in a less dense liquid: a bulb of
 * volume V_b and mass M with a stem of cross-section A sinks a length
 * x = (M/ρ − V_b) / A of its stem.
 *
 * Water itself is densest at about 4 °C; ρ_water(T) follows the Tilton–Taylor
 * fit (0–40 °C). Other liquids expand with a constant volume coefficient β.
 */

export interface SolidSample {
  id: 'aluminium' | 'brass' | 'steel' | 'stone' | 'glass' | 'wood' | 'paraffin'
  /** True density, kg/m³. */
  density: number
  /** Volume, cm³. */
  volume: number
  /** Regular samples have measurable dimensions (cm). */
  dims?: [number, number, number]
  color: string
}

export interface LiquidSample {
  id: 'water' | 'saltWater' | 'ethanol' | 'oil' | 'glycerol' | 'milk'
  /** Density at 20 °C, kg/m³. */
  density20: number
  /** Volume expansion coefficient, 1/K. */
  beta: number
  color: string
}

export const SOLIDS: SolidSample[] = [
  { id: 'aluminium', density: 2700, volume: 24, dims: [4, 3, 2], color: '#c8ccd4' },
  { id: 'brass', density: 8500, volume: 12, dims: [3, 2, 2], color: '#c9a24a' },
  { id: 'steel', density: 7850, volume: 16, dims: [4, 2, 2], color: '#8a93a8' },
  { id: 'wood', density: 650, volume: 48, dims: [4, 4, 3], color: '#a8743f' },
  { id: 'stone', density: 2650, volume: 21, color: '#7d7a73' },
  { id: 'glass', density: 2500, volume: 14, color: '#9fd8e0' },
  { id: 'paraffin', density: 900, volume: 30, color: '#efe8d0' },
]

export const LIQUIDS: LiquidSample[] = [
  { id: 'water', density20: 998.2, beta: 2.1e-4, color: '#5aa9e6' },
  { id: 'saltWater', density20: 1025, beta: 2.6e-4, color: '#7cc0d8' },
  { id: 'ethanol', density20: 789.3, beta: 1.1e-3, color: '#d6e9f2' },
  { id: 'oil', density20: 911, beta: 7.0e-4, color: '#d6b84a' },
  { id: 'glycerol', density20: 1261, beta: 5.0e-4, color: '#e9eef0' },
  { id: 'milk', density20: 1030, beta: 3.0e-4, color: '#f4f1e8' },
]

export const solidById = (id: SolidSample['id']) => SOLIDS.find((s) => s.id === id) ?? SOLIDS[0]
export const liquidById = (id: LiquidSample['id']) => LIQUIDS.find((l) => l.id === id) ?? LIQUIDS[0]

/** ρ = m / V. Any consistent units (g/cm³ or kg/m³). */
export function density(mass: number, volume: number): number | null {
  return volume > 0 ? mass / volume : null
}

/** 1 g/cm³ = 1000 kg/m³. */
export const gPerCm3ToKgPerM3 = (rho: number) => rho * 1000
export const kgPerM3ToGPerCm3 = (rho: number) => rho / 1000

/** Volume of a rectangular block, cm³. */
export const blockVolume = (l: number, w: number, h: number) => l * w * h

/** Volume by displacement: the rise in the cylinder reading. */
export const displacementVolume = (before: number, after: number) => Math.max(0, after - before)

/** Mass of a sample, g (volume in cm³, density in kg/m³). */
export const massOf = (s: Pick<SolidSample, 'density' | 'volume'>) => (s.density * s.volume) / 1000

/** Density of pure water (kg/m³) at T °C, Tilton–Taylor fit. Maximum ≈ 999.97 at 3.98 °C. */
export function waterDensity(T: number): number {
  return 1000 * (1 - ((T + 288.9414) / (508929.2 * (T + 68.12963))) * (T - 3.9863) ** 2)
}

/** Density of a liquid (kg/m³) at T °C. */
export function liquidDensity(l: LiquidSample, T: number): number {
  if (l.id === 'water') return waterDensity(T)
  return l.density20 / (1 + l.beta * (T - 20))
}

/** Floats if it is less dense than the liquid. */
export const floats = (rhoObject: number, rhoLiquid: number) => rhoObject < rhoLiquid

/** Fraction of a floating object's volume below the surface, ρ_obj / ρ_liq (capped at 1). */
export const submergedFraction = (rhoObject: number, rhoLiquid: number) => Math.min(1, rhoObject / rhoLiquid)

/** A reading rounded to the instrument resolution. */
export const readInstrument = (value: number, resolution: number) => Math.round(value / resolution) * resolution

export const BALANCE_RESOLUTION = 0.1 // g
export const CYLINDER_RESOLUTION = 1 // mL
export const RULER_RESOLUTION = 0.1 // cm

/**
 * Cylinder reading after lowering a sample (mL). A floating sample displaces
 * only its own mass of water, unless it is pushed under (`sinker`).
 */
export function cylinderReading(start: number, sample: SolidSample, rhoWater = 998.2, pushedUnder = false): number {
  const frac = pushedUnder ? 1 : submergedFraction(sample.density, rhoWater)
  return start + sample.volume * frac
}

/** Pycnometer (density bottle), volume `V` cm³ and empty mass `empty` g. */
export interface Pycnometer {
  volume: number
  empty: number
}
export const PYCNOMETER: Pycnometer = { volume: 50, empty: 32.4 }

/** Masses read with the pycnometer at temperature T (g). */
export function pycnometerMasses(liquid: LiquidSample, T: number, p: Pycnometer = PYCNOMETER) {
  return {
    empty: p.empty,
    water: p.empty + (waterDensity(T) * p.volume) / 1000,
    liquid: p.empty + (liquidDensity(liquid, T) * p.volume) / 1000,
  }
}

/** ρ = (m_liquid − m_empty)/(m_water − m_empty) · ρ_water. */
export function pycnometerDensity(m: { empty: number; water: number; liquid: number }, rhoWater: number): number | null {
  const w = m.water - m.empty
  return w > 0 ? ((m.liquid - m.empty) / w) * rhoWater : null
}

/** Hydrometer: bulb volume (cm³), mass (g), stem cross-section (cm²) and stem length (cm). */
export interface Hydrometer {
  bulb: number
  mass: number
  stemArea: number
  stemLength: number
}
export const HYDROMETER: Hydrometer = { bulb: 26, mass: 28, stemArea: 0.4, stemLength: 15 }

/** Length of stem below the surface (cm); null if it sinks or does not float. */
export function hydrometerDepth(rho: number, h: Hydrometer = HYDROMETER): number | null {
  const displaced = (h.mass / rho) * 1000 // cm³ for rho in kg/m³
  const x = (displaced - h.bulb) / h.stemArea
  if (x < 0 || x > h.stemLength) return null
  return x
}

/** Density the hydrometer scale reads at a stem depth x (inverse of hydrometerDepth). */
export const hydrometerScale = (x: number, h: Hydrometer = HYDROMETER) => (h.mass / (h.bulb + h.stemArea * x)) * 1000

export const percentError = (measured: number, actual: number) => (Math.abs(measured - actual) / actual) * 100
