/**
 * Alkali metal in water:   2 M(s) + 2 H₂O(l) → 2 MOH(aq) + H₂(g)↑      (M = Li, Na, K)
 *
 * Model
 * - The piece is a sphere of radius r that is eaten away at its surface: dr/dt = −v(T), with the
 *   recession speed doubling for every 10 °C of water temperature (v = v₂₀ · 2^((T − 20)/10)).
 *   The reaction rate is then  dn/dt = ρ · 4πr² · v / M  (mol of metal per second).
 * - Heat:  q = n · |ΔH|, with ΔH = ΔfH°(MOH, aq) − ΔfH°(H₂O, l) per mole of metal. All heat goes
 *   into the water (an insulated beaker):  ΔT = q / (m_water · c_water).
 * - Gas:  n(H₂) = n(M)/2, volume at 25 °C and 1 atm with Vm = 24.47 L/mol.
 * - Solution:  [OH⁻] = n(M) / V_water;  pH from [H⁺][OH⁻] = Kw.
 * - Motion: the jet of hydrogen pushes the floating piece around. Thrust ∝ reaction rate, its
 *   direction wanders smoothly; water drag damps the speed; the piece bounces off the glass.
 * - Ignition: the hydrogen catches fire when the heat output exceeds a metal-specific power
 *   (always for K, for Na only for large pieces, never for Li).
 *
 * The recession speeds and ignition powers are rough classroom values chosen to reproduce the
 * familiar behaviour (Li fizzes for about a minute, a pea of Na for 10–20 s, K for a few seconds).
 */

export type AlkaliMetal = 'Li' | 'Na' | 'K'

export interface MetalProps {
  id: AlkaliMetal
  /** g/mol */
  molarMass: number
  /** g/cm³ */
  density: number
  /** °C */
  meltingPoint: number
  /** kJ per mol of metal (negative: exothermic). */
  deltaH: number
  /** Surface recession speed at 20 °C, cm/s. */
  recession20: number
  /** Heat output (W) above which the hydrogen ignites. */
  ignitionPower: number
  /** The heat melts the metal into a shiny ball. */
  meltsOnWater: boolean
  /** Hydrogen burns with the colour of the metal's flame test. */
  flame: 'yellow' | 'lilac' | 'crimson'
}

export const ALKALI: Record<AlkaliMetal, MetalProps> = {
  Li: { id: 'Li', molarMass: 6.94, density: 0.534, meltingPoint: 180.5, deltaH: -222.7, recession20: 0.006, ignitionPower: Infinity, meltsOnWater: false, flame: 'crimson' },
  Na: { id: 'Na', molarMass: 22.99, density: 0.968, meltingPoint: 97.8, deltaH: -184.3, recession20: 0.025, ignitionPower: 600, meltsOnWater: true, flame: 'yellow' },
  K: { id: 'K', molarMass: 39.098, density: 0.862, meltingPoint: 63.5, deltaH: -196.6, recession20: 0.08, ignitionPower: 0, meltsOnWater: true, flame: 'lilac' },
}

export const ALKALI_IDS = Object.keys(ALKALI) as AlkaliMetal[]

export const WATER_C = 4.18 // J/(g·K)
export const MOLAR_VOLUME = 24.47 // L/mol at 25 °C, 1 atm
export const KW = 1e-14

export interface SodiumWaterParams {
  metal: AlkaliMetal
  /** g */
  mass: number
  /** mL (= g) */
  waterVolume: number
  /** °C */
  initialTemp: number
  /** Inner radius of the beaker, cm. */
  beakerRadius: number
}

export interface SodiumWaterState {
  /** s since the metal touched the water. */
  t: number
  /** cm */
  radius: number
  /** mol of metal reacted. */
  reacted: number
  /** °C */
  temp: number
  /** Position on the surface relative to the centre, cm. */
  x: number
  y: number
  vx: number
  vy: number
  burning: boolean
  done: boolean
}

export const sphereRadius = (mass: number, density: number) => Math.cbrt((3 * (mass / density)) / (4 * Math.PI))

export function initialState(p: SodiumWaterParams): SodiumWaterState {
  const m = ALKALI[p.metal]
  return { t: 0, radius: sphereRadius(p.mass, m.density), reacted: 0, temp: p.initialTemp, x: 0, y: 0, vx: 0, vy: 0, burning: false, done: false }
}

export const totalMoles = (p: SodiumWaterParams) => p.mass / ALKALI[p.metal].molarMass

/** Recession speed at a temperature, cm/s. */
export const recessionSpeed = (metal: AlkaliMetal, temp: number) => ALKALI[metal].recession20 * Math.pow(2, (temp - 20) / 10)

/** mol/s of metal reacting for a piece of radius r at temperature T. */
export function reactionRate(metal: AlkaliMetal, radius: number, temp: number) {
  const m = ALKALI[metal]
  return (m.density * 4 * Math.PI * radius * radius * recessionSpeed(metal, temp)) / m.molarMass
}

/** Heat output in W. */
export const heatPower = (metal: AlkaliMetal, radius: number, temp: number) => reactionRate(metal, radius, temp) * Math.abs(ALKALI[metal].deltaH) * 1000

/** Smooth, deterministic wandering direction of the hydrogen jet. */
export function thrustAngle(t: number, seed = 0) {
  return 2.1 * Math.sin(0.9 * t + seed) + 1.7 * Math.sin(2.3 * t + 2 * seed) + 0.9 * Math.sin(5.1 * t + 3 * seed)
}

const DRAG = 3 // 1/s

/** Advances the reaction by dt seconds (pure). */
export function step(s: SodiumWaterState, p: SodiumWaterParams, dt: number, seed = 0): SodiumWaterState {
  if (s.done || dt <= 0) return s
  const m = ALKALI[p.metal]
  const total = totalMoles(p)
  // Sub-steps keep the integration stable for fast metals and large dt.
  const n = Math.max(1, Math.ceil(dt / 0.02))
  const h = dt / n
  let { t, radius, reacted, temp, x, y, vx, vy, burning } = s
  let done = false
  for (let i = 0; i < n; i++) {
    const rate = reactionRate(p.metal, radius, temp)
    const dnRaw = rate * h
    const dn = Math.min(dnRaw, total - reacted)
    reacted += dn
    temp += (dn * Math.abs(m.deltaH) * 1000) / (p.waterVolume * WATER_C)
    radius = Math.max(0, radius - recessionSpeed(p.metal, temp) * h)
    burning = rate * Math.abs(m.deltaH) * 1000 > m.ignitionPower
    // Motion on the surface (cm, cm/s).
    const thrust = Math.min(60, 2500 * rate)
    const a = thrustAngle(t, seed)
    vx += (thrust * Math.cos(a) - DRAG * vx) * h
    vy += (thrust * Math.sin(a) - DRAG * vy) * h
    x += vx * h
    y += vy * h
    const limit = Math.max(0, p.beakerRadius - radius - 0.2)
    const d = Math.hypot(x, y)
    if (d > limit && d > 0) {
      // Bounce off the glass: reflect the outward part of the velocity.
      const nx = x / d
      const ny = y / d
      const vn = vx * nx + vy * ny
      if (vn > 0) {
        vx -= 1.6 * vn * nx
        vy -= 1.6 * vn * ny
      }
      x = nx * limit
      y = ny * limit
    }
    t += h
    if (radius <= 1e-4 || reacted >= total - 1e-12) {
      reacted = total
      radius = 0
      burning = false
      done = true
      break
    }
  }
  return { t, radius, reacted, temp, x, y, vx: done ? 0 : vx, vy: done ? 0 : vy, burning, done }
}

/** Mass of metal left, g. */
export const remainingMass = (s: SodiumWaterState, p: SodiumWaterParams) => Math.max(0, p.mass - s.reacted * ALKALI[p.metal].molarMass)

/** Hydrogen released, mL at 25 °C and 1 atm. */
export const hydrogenVolume = (reacted: number) => (reacted / 2) * MOLAR_VOLUME * 1000

/** Hydroxide concentration, mol/L. */
export const hydroxideConcentration = (reacted: number, waterVolume: number) => reacted / (waterVolume / 1000)

/** pH of the solution (exact for a strong base in water, including water's own ions). */
export function solutionPH(reacted: number, waterVolume: number) {
  const c = hydroxideConcentration(reacted, waterVolume)
  const oh = c / 2 + Math.sqrt((c * c) / 4 + KW)
  return 14 + Math.log10(oh)
}

/** Final temperature once all the metal has reacted (insulated beaker). */
export const finalTemperature = (p: SodiumWaterParams) => p.initialTemp + (totalMoles(p) * Math.abs(ALKALI[p.metal].deltaH) * 1000) / (p.waterVolume * WATER_C)

/** Time for the piece to disappear if the water stayed at its initial temperature, s. */
export const lifetimeAtConstantT = (p: SodiumWaterParams) => sphereRadius(p.mass, ALKALI[p.metal].density) / recessionSpeed(p.metal, p.initialTemp)

/** Runs the whole reaction; returns sampled readings for charts and tests. */
export function simulate(p: SodiumWaterParams, sample = 0.25, tMax = 600) {
  let s = initialState(p)
  const out = [{ t: 0, temp: s.temp, h2: 0, mass: p.mass }]
  while (!s.done && s.t < tMax) {
    s = step(s, p, sample)
    out.push({ t: s.t, temp: s.temp, h2: hydrogenVolume(s.reacted), mass: remainingMass(s, p) })
  }
  return { readings: out, final: s }
}
