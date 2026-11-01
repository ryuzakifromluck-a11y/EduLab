/**
 * Joule's experiment: the mechanical equivalent of heat.
 *
 * Mechanical method: a mass m falls through a height h, turning paddles in an
 * insulated can of water through a string over a pulley. Its potential energy
 * is turned into heat by friction in the water:
 *
 *   W = n · m · g · h                       (n drops)
 *   Q = (m_w · c_w + C_can) · ΔT            (J)
 *   J = W / Q_cal ≈ 4.186 J/cal             (Q_cal = Q / 4.186 in calories)
 *
 * Electrical method: a heating coil of resistance R = V / I in the same can,
 * W = V · I · t = I² R t.
 *
 * A fraction of the work is lost (friction in the pulley, the weight hitting
 * the floor with some kinetic energy) and the can leaks heat to the room by
 * Newton cooling. Insulation makes the leak small; without it the measured J
 * comes out too large.
 */

export const G = 9.81
export const C_WATER = 4186 // J/(kg·K)
export const CAL = 4.186 // J per calorie
export const T_ROOM = 20

export type Method = 'mechanical' | 'electrical'

export interface Apparatus {
  /** Water mass, kg. */
  waterMass: number
  /** Heat capacity of can + paddles + thermometer, J/K. */
  canHeatCapacity: number
  /** Fraction of the mechanical work that reaches the water. */
  efficiency: number
  /** Newton-cooling constant of the can, W/K (insulated vs bare). */
  leakInsulated: number
  leakBare: number
}

export const APPARATUS: Apparatus = { waterMass: 0.25, canHeatCapacity: 80, efficiency: 0.95, leakInsulated: 0.004, leakBare: 0.12 }

/** Total heat capacity of water + can, J/K. */
export const heatCapacity = (a: Apparatus = APPARATUS) => a.waterMass * C_WATER + a.canHeatCapacity

/** Work done by n drops of mass m (kg) through h (m), J. */
export const fallingWork = (m: number, h: number, drops = 1, g = G) => drops * m * g * h

/** Electrical work V·I·t, J. */
export const electricalWork = (V: number, I: number, t: number) => V * I * t

/** Coil resistance from the meters, R = V/I (Ω). */
export const coilResistance = (V: number, I: number) => (I > 0 ? V / I : Infinity)

/** Current through a coil of resistance R at voltage V. */
export const coilCurrent = (V: number, R: number) => (R > 0 ? V / R : 0)

/** Joule heating power I²R, W. */
export const coilPower = (I: number, R: number) => I * I * R

/** Q = mcΔT, J. */
export const heatGained = (dT: number, a: Apparatus = APPARATUS) => heatCapacity(a) * dT

/** Temperature rise if the work W (J) all stays in the can (with efficiency). */
export const temperatureRise = (W: number, a: Apparatus = APPARATUS, efficiency = a.efficiency) => (W * efficiency) / heatCapacity(a)

/** Mechanical equivalent of heat from work (J) and a measured rise, J/cal. */
export function mechanicalEquivalent(W: number, dT: number, a: Apparatus = APPARATUS): number | null {
  const Q = heatGained(dT, a)
  return Q > 0 ? W / (Q / CAL) : null
}

/** Joules per calorie the model would give with no losses (= CAL). */
export const idealJ = () => CAL

/**
 * Live state of the calorimeter. Mechanical drops deliver work at the steady
 * speed of the falling weight; the electrical coil delivers I²R while on.
 */
export class JouleCalorimeter {
  a: Apparatus
  T = T_ROOM
  /** Work delivered by the falling mass or the coil so far, J. */
  work = 0
  /** Heat leaked to the room so far, J. */
  leaked = 0
  time = 0
  insulated = true
  /** Height still to fall in the current drop, m. */
  fallLeft = 0
  dropMass = 0
  drops = 0
  /** Electrical power, W (0 when the coil is off). */
  power = 0
  /** Steady speed of the weight as the paddles brake it, m/s. */
  fallSpeed = 0.6

  constructor(a: Apparatus = APPARATUS) {
    this.a = a
  }

  get leakConstant() {
    return this.insulated ? this.a.leakInsulated : this.a.leakBare
  }
  get dT() {
    return this.T - T_ROOM
  }
  get falling() {
    return this.fallLeft > 1e-9
  }

  drop(massKg: number, height: number) {
    if (this.falling) return false
    this.dropMass = massKg
    this.fallLeft = height
    this.drops += 1
    return true
  }

  advance(dt: number) {
    let left = Math.min(dt, 0.5)
    const C = heatCapacity(this.a)
    while (left > 0) {
      const h = Math.min(left, 1 / 120)
      let P = this.power
      if (this.falling) {
        const dy = Math.min(this.fallLeft, this.fallSpeed * h)
        this.fallLeft -= dy
        const w = this.dropMass * G * dy
        this.work += w
        P += (w / h) * this.a.efficiency
      } else if (this.power > 0) {
        this.work += this.power * h
      }
      const leak = this.leakConstant * (this.T - T_ROOM)
      this.leaked += leak * h
      this.T += ((P - leak) * h) / C
      this.time += h
      left -= h
    }
  }

  /** Measured J from the work and the measured temperature rise. */
  get measuredJ() {
    return mechanicalEquivalent(this.work, this.dT, this.a)
  }

  reset() {
    this.T = T_ROOM
    this.work = 0
    this.leaked = 0
    this.time = 0
    this.fallLeft = 0
    this.drops = 0
    this.power = 0
  }
}
