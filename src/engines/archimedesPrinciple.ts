/**
 * Archimedes' principle.
 *
 * A body immersed in a fluid feels an upward buoyant force equal to the
 * weight of the fluid it displaces:
 *
 *   F_b = ρ_fluid · g · V_displaced
 *
 * Hung from a spring balance, it seems lighter by exactly that amount:
 *
 *   W_app = W − F_b
 *
 * Fully immersed, the loss of weight gives the relative density (specific
 * gravity) of a solid, SG = ρ_obj/ρ_water = W / (W − W_water), and the loss
 * in another liquid compared with the loss in water gives that liquid's
 * relative density, SG_liquid = (W − W_liquid) / (W − W_water).
 *
 * A body less dense than the fluid floats with the fraction ρ_obj/ρ_fluid of
 * its volume submerged; the string then goes slack and the balance reads zero.
 */

export const G = 9.81
export const RHO_WATER = 1000

export interface Body {
  id: 'aluminium' | 'brass' | 'stone' | 'glass' | 'nylon' | 'wood'
  /** kg/m³ */
  density: number
  /** cm³ */
  volume: number
  /** Height of the (cylindrical) body, cm. */
  height: number
  color: string
}

export interface Fluid {
  id: 'water' | 'saltWater' | 'oil' | 'ethanol' | 'glycerol'
  density: number
  color: string
}

export const BODIES: Body[] = [
  { id: 'aluminium', density: 2700, volume: 50, height: 6, color: '#c8ccd4' },
  { id: 'brass', density: 8500, volume: 20, height: 4, color: '#c9a24a' },
  { id: 'stone', density: 2600, volume: 60, height: 5, color: '#7d7a73' },
  { id: 'glass', density: 2500, volume: 40, height: 5, color: '#9fd8e0' },
  { id: 'nylon', density: 1150, volume: 80, height: 6, color: '#ece6da' },
  { id: 'wood', density: 600, volume: 120, height: 6, color: '#a8743f' },
]

export const FLUIDS: Fluid[] = [
  { id: 'water', density: 1000, color: '#5aa9e6' },
  { id: 'saltWater', density: 1200, color: '#78b8cf' },
  { id: 'oil', density: 900, color: '#d6b84a' },
  { id: 'ethanol', density: 790, color: '#d6e9f2' },
  { id: 'glycerol', density: 1260, color: '#e3eaee' },
]

export const bodyById = (id: Body['id']) => BODIES.find((b) => b.id === id) ?? BODIES[0]
export const fluidById = (id: Fluid['id']) => FLUIDS.find((f) => f.id === id) ?? FLUIDS[0]

const CM3 = 1e-6

/** Buoyant force F_b = ρ g V (V in m³), N. */
export const buoyantForce = (rhoFluid: number, Vdisplaced: number, g = G) => rhoFluid * g * Vdisplaced

/** True weight of a body, N. */
export const bodyWeight = (b: Pick<Body, 'density' | 'volume'>, g = G) => b.density * b.volume * CM3 * g

/** Apparent weight W − F_b (never below zero: the string cannot push). */
export const apparentWeight = (W: number, Fb: number) => Math.max(0, W - Fb)

/** Relative density (specific gravity) ρ_obj / ρ_fluid. */
export const specificGravity = (rhoObject: number, rhoReference = RHO_WATER) => rhoObject / rhoReference

/** SG of a solid from its weight in air and fully immersed in water. */
export function sgFromWeights(Wair: number, Wwater: number): number | null {
  const loss = Wair - Wwater
  return loss > 0 ? Wair / loss : null
}

/** SG of a liquid from the losses of weight in it and in water. */
export function liquidSgFromWeights(Wair: number, Wliquid: number, Wwater: number): number | null {
  const lw = Wair - Wwater
  return lw > 0 ? (Wair - Wliquid) / lw : null
}

export const floats = (rhoObject: number, rhoFluid: number) => rhoObject < rhoFluid

/** Submerged fraction of a free-floating body. */
export const floatingFraction = (rhoObject: number, rhoFluid: number) => Math.min(1, rhoObject / rhoFluid)

export interface Reading {
  /** Fraction of the body's height the balance has lowered below the surface (0…1). */
  lowered: number
  /** Fraction actually submerged (a floating body stops at its floating depth). */
  submerged: number
  /** Displaced volume, cm³. */
  displaced: number
  weight: number
  buoyancy: number
  apparent: number
  /** Mass of liquid caught from the overflow can, g. */
  overflowMass: number
  floating: boolean
}

/** Balance reading with the body lowered by `lowered` of its height into the fluid. */
export function immerse(b: Body, f: Fluid, lowered: number, g = G): Reading {
  const W = bodyWeight(b, g)
  const want = Math.min(1, Math.max(0, lowered))
  const floatAt = floatingFraction(b.density, f.density)
  const isFloating = floats(b.density, f.density) && want >= floatAt
  const sub = isFloating ? floatAt : want
  const V = b.volume * sub
  const Fb = buoyantForce(f.density, V * CM3, g)
  return {
    lowered: want,
    submerged: sub,
    displaced: V,
    weight: W,
    buoyancy: Fb,
    apparent: apparentWeight(W, Fb),
    overflowMass: (f.density * V * CM3) * 1000,
    floating: isFloating,
  }
}

/** Apparent weight as a function of immersion depth, for charts. */
export function immersionCurve(b: Body, f: Fluid, points = 41, g = G) {
  return Array.from({ length: points }, (_, i) => {
    const r = immerse(b, f, i / (points - 1), g)
    return { depth: (i / (points - 1)) * b.height, apparent: r.apparent, buoyancy: r.buoyancy }
  })
}
