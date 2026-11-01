/**
 * Conservation of energy on a U-shaped track (a skate bowl).
 *
 * The track height is h(x) = a·x² for |x| ≤ X_MAX. A point mass slides along
 * it under gravity and, optionally, a friction-like drag that removes energy
 * in proportion to the speed:
 *
 *   s̈ = −g·sin φ − b·ṡ,     sin φ = h′ / √(1 + h′²),     ṡ = √(1 + h′²)·ẋ
 *
 * Written in terms of x this becomes
 *
 *   ẍ = (s̈ − h′h″ẋ² / √(1 + h′²)) / √(1 + h′²)
 *
 * which is integrated with classic RK4. With b = 0 kinetic + potential energy
 * is conserved; with b > 0 the difference shows up as thermal energy.
 */

export const X_MAX = 4
/** Bowl coefficient: the rim (x = ±4 m) is 4 m high. */
export const BOWL = 0.25
export const RK4_DT = 1 / 480

export interface EnergyParams {
  /** Release height above the bottom, m (0 < h₀ ≤ 4). */
  height: number
  /** Mass in kg. */
  mass: number
  /** Drag coefficient b in 1/s (0 = no friction). */
  friction: number
  gravity: number
}

export interface TrackState {
  x: number
  /** dx/dt in m/s. */
  vx: number
}

export const trackHeight = (x: number) => BOWL * x * x
const slope = (x: number) => 2 * BOWL * x
const curvature = () => 2 * BOWL

/** Release point on the left side for a given height. */
export function releaseX(height: number): number {
  return -Math.sqrt(Math.max(0, Math.min(height, trackHeight(X_MAX))) / BOWL)
}

/** Speed along the track, m/s. */
export function speed(s: TrackState): number {
  return Math.abs(s.vx) * Math.sqrt(1 + slope(s.x) ** 2)
}

function deriv(p: EnergyParams, s: TrackState): [number, number] {
  const hp = slope(s.x)
  const root = Math.sqrt(1 + hp * hp)
  const sDot = root * s.vx
  const sDdot = (-p.gravity * hp) / root - p.friction * sDot
  const ax = (sDdot - (hp * curvature() * s.vx * s.vx) / root) / root
  return [s.vx, ax]
}

export function rk4Step(p: EnergyParams, s: TrackState, dt: number): TrackState {
  const [k1x, k1v] = deriv(p, s)
  const [k2x, k2v] = deriv(p, { x: s.x + (dt / 2) * k1x, vx: s.vx + (dt / 2) * k1v })
  const [k3x, k3v] = deriv(p, { x: s.x + (dt / 2) * k2x, vx: s.vx + (dt / 2) * k2v })
  const [k4x, k4v] = deriv(p, { x: s.x + dt * k3x, vx: s.vx + dt * k3v })
  return {
    x: s.x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x),
    vx: s.vx + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v),
  }
}

export interface Energies {
  kinetic: number
  potential: number
  thermal: number
  total: number
}

export function kineticEnergy(mass: number, v: number) {
  return 0.5 * mass * v * v
}
export function potentialEnergy(mass: number, gravity: number, h: number) {
  return mass * gravity * h
}

/** Speed at the bottom without friction: v = √(2gh). */
export function bottomSpeed(gravity: number, height: number) {
  return Math.sqrt(2 * gravity * height)
}

export class EnergySimulation {
  params: EnergyParams
  time = 0
  state: TrackState
  private acc = 0

  constructor(params: EnergyParams) {
    this.params = { ...params }
    this.state = { x: releaseX(params.height), vx: 0 }
  }

  reset(p: Partial<EnergyParams> = {}) {
    this.params = { ...this.params, ...p }
    this.state = { x: releaseX(this.params.height), vx: 0 }
    this.time = 0
    this.acc = 0
  }

  /** Changes mass/friction/gravity without moving the skater. */
  setParams(p: Partial<EnergyParams>) {
    this.params = { ...this.params, ...p }
  }

  advance(dt: number) {
    this.acc += dt
    let n = 0
    while (this.acc >= RK4_DT && n < 20000) {
      this.state = rk4Step(this.params, this.state, RK4_DT)
      this.acc -= RK4_DT
      this.time += RK4_DT
      n++
    }
  }

  get x() {
    return this.state.x
  }
  get height() {
    return trackHeight(this.state.x)
  }
  get speed() {
    return speed(this.state)
  }

  /** Energies in joules; total is the initial mechanical energy mgh₀. */
  get energies(): Energies {
    const { mass, gravity, height } = this.params
    const kinetic = kineticEnergy(mass, this.speed)
    const potential = potentialEnergy(mass, gravity, this.height)
    const total = potentialEnergy(mass, gravity, Math.min(height, trackHeight(X_MAX)))
    return { kinetic, potential, thermal: Math.max(0, total - kinetic - potential), total }
  }
}

/** Track profile for drawing and charts. */
export function trackProfile(points = 81) {
  return Array.from({ length: points }, (_, i) => {
    const x = -X_MAX + (2 * X_MAX * i) / (points - 1)
    return { x, h: trackHeight(x) }
  })
}

/** Frictionless kinetic and potential energy as a function of position. */
export function energyVsPosition(p: EnergyParams, points = 81) {
  const total = potentialEnergy(p.mass, p.gravity, p.height)
  const xr = Math.abs(releaseX(p.height))
  return trackProfile(points).map(({ x, h }) => {
    const potential = potentialEnergy(p.mass, p.gravity, h)
    const reachable = Math.abs(x) <= xr + 1e-9
    return { x, potential, kinetic: reachable ? Math.max(0, total - potential) : null, total }
  })
}
