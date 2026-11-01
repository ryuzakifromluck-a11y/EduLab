/**
 * Heat conduction along an insulated rod held between a hot and a cold bath.
 *
 * One-dimensional heat equation, solved with an explicit finite-difference
 * scheme (FTCS) on N segments; the time step is kept below the stability
 * limit Δt ≤ Δx²/(2α) by sub-stepping:
 *
 *   ∂T/∂t = α ∂²T/∂x²,      α = k / (ρ c)
 *
 * The ends are fixed at T_hot (x = 0) and T_cold (x = L). The rod starts at
 * T_cold. At steady state the profile is a straight line and the heat flow
 * through the cross-section A is Fourier's law:
 *
 *   P = k A (T_hot − T_cold) / L
 *
 * Convection and radiation from the sides are neglected.
 */

export interface Material {
  id: 'copper' | 'aluminium' | 'steel' | 'glass' | 'wood'
  /** Thermal conductivity, W/(m·K). */
  k: number
  /** Density, kg/m³. */
  rho: number
  /** Specific heat capacity, J/(kg·K). */
  c: number
}

export const MATERIALS: Material[] = [
  { id: 'copper', k: 401, rho: 8960, c: 385 },
  { id: 'aluminium', k: 237, rho: 2700, c: 897 },
  { id: 'steel', k: 50, rho: 7850, c: 490 },
  { id: 'glass', k: 1.0, rho: 2500, c: 840 },
  { id: 'wood', k: 0.15, rho: 600, c: 1700 },
]

export const materialById = (id: Material['id']) => MATERIALS.find((m) => m.id === id) ?? MATERIALS[0]

/** Thermal diffusivity α = k/(ρc), m²/s. */
export const diffusivity = (m: Material) => m.k / (m.rho * m.c)

/** Rod cross-section: 1 cm². */
export const AREA = 1e-4
export const SEGMENTS = 40

/** Steady-state heat flow, W. */
export function steadyHeatFlow(m: Material, length: number, tHot: number, tCold: number, area = AREA): number {
  if (!(length > 0)) throw new RangeError('Length must be greater than zero')
  return (m.k * area * (tHot - tCold)) / length
}

/** Steady-state temperature at distance x from the hot end (linear profile). */
export function steadyTemperature(x: number, length: number, tHot: number, tCold: number): number {
  return tHot + ((tCold - tHot) * x) / length
}

/** Time constant of the slowest mode, L²/(π²α): roughly how long the rod takes to warm up. */
export function timeConstant(m: Material, length: number): number {
  return (length * length) / (Math.PI * Math.PI * diffusivity(m))
}

/**
 * Exact temperature at the middle of the rod at time t (Fourier series of the
 * heat equation with these boundary conditions and a uniform T_cold start).
 */
export function exactMidTemperature(m: Material, length: number, tHot: number, tCold: number, t: number, terms = 200): number {
  const a = diffusivity(m)
  const x = length / 2
  let sum = 0
  for (let n = 1; n <= terms; n++) {
    sum += (Math.sin((n * Math.PI * x) / length) / n) * Math.exp(-(((n * Math.PI) / length) ** 2) * a * t)
  }
  return steadyTemperature(x, length, tHot, tCold) - ((2 * (tHot - tCold)) / Math.PI) * sum
}

export class Rod {
  temps: Float64Array
  time = 0
  private next: Float64Array

  constructor(
    public material: Material,
    public length: number,
    public tHot: number,
    public tCold: number,
    readonly segments = SEGMENTS,
  ) {
    this.temps = new Float64Array(segments + 1)
    this.next = new Float64Array(segments + 1)
    this.reset()
  }

  reset() {
    this.temps.fill(this.tCold)
    this.temps[0] = this.tHot
    this.time = 0
  }

  get dx() {
    return this.length / this.segments
  }

  /** Largest stable explicit time step (with a safety margin). */
  get maxStep() {
    return (0.45 * this.dx * this.dx) / diffusivity(this.material)
  }

  advance(dt: number) {
    const a = diffusivity(this.material)
    const steps = Math.max(1, Math.ceil(dt / this.maxStep))
    const h = dt / steps
    const r = (a * h) / (this.dx * this.dx)
    const T = this.temps
    const N = this.segments
    for (let s = 0; s < steps; s++) {
      this.next[0] = this.tHot
      this.next[N] = this.tCold
      for (let i = 1; i < N; i++) this.next[i] = T[i] + r * (T[i + 1] - 2 * T[i] + T[i - 1])
      T.set(this.next)
    }
    this.time += dt
  }

  /** Temperature at a fraction 0–1 along the rod (linear interpolation). */
  at(fraction: number): number {
    const p = Math.min(1, Math.max(0, fraction)) * this.segments
    const i = Math.min(this.segments - 1, Math.floor(p))
    const f = p - i
    return this.temps[i] * (1 - f) + this.temps[i + 1] * f
  }

  /** Heat flowing into the cold bath right now, W (from the gradient at the cold end). */
  get heatOut() {
    const N = this.segments
    return (this.material.k * AREA * (this.temps[N - 1] - this.temps[N])) / this.dx
  }

  profile() {
    return Array.from(this.temps, (T, i) => ({ x: (i * this.length) / this.segments, T }))
  }
}
