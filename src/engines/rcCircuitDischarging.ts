/**
 * Discharging a capacitor through a resistor.
 *
 * A capacitor charged to V₀ is switched across a resistor R at t = 0:
 *
 *   V_C(t) = V₀ e^(−t/RC)
 *   I(t)   = −(V₀/R) e^(−t/RC)     (negative: opposite to the charging current)
 *   Q(t)   = C V₀ e^(−t/RC)
 *   τ = RC
 *
 * After one τ the voltage has fallen to 37 % (1/e), after 5τ to 0.67 %. All of
 * the stored energy ½CV₀² ends up as heat in the resistor:
 *
 *   E_R(t) = ½ C V₀² (1 − e^(−2t/RC))
 */

export const timeConstant = (R: number, C: number) => R * C

export const dischargeVoltage = (t: number, V0: number, R: number, C: number) => (t <= 0 ? V0 : V0 * Math.exp(-t / (R * C)))

/** Signed current: negative, i.e. it flows out of the + plate, against the charging direction. */
export const dischargeCurrent = (t: number, V0: number, R: number, C: number) => (t < 0 ? 0 : -(V0 / R) * Math.exp(-t / (R * C)))

export const dischargeCharge = (t: number, V0: number, R: number, C: number) => C * dischargeVoltage(t, V0, R, C)

/** Energy stored in a capacitor, ½ C V². */
export const capacitorEnergy = (C: number, V: number) => 0.5 * C * V * V

/** Energy still stored at time t. */
export const remainingEnergy = (t: number, V0: number, R: number, C: number) => capacitorEnergy(C, dischargeVoltage(t, V0, R, C))

/** Energy dissipated in the resistor up to t, ½CV₀²(1 − e^(−2t/RC)). */
export const dissipatedEnergy = (t: number, V0: number, R: number, C: number) =>
  t <= 0 ? 0 : capacitorEnergy(C, V0) * (1 - Math.exp((-2 * t) / (R * C)))

/** Instantaneous power in the resistor, I²R. */
export const resistorPower = (t: number, V0: number, R: number, C: number) => dischargeCurrent(t, V0, R, C) ** 2 * R

/** Fraction of V₀ left after n time constants. */
export const fractionLeft = (n: number) => Math.exp(-n)

/** Half-life of the voltage, τ ln 2. */
export const halfTime = (R: number, C: number) => R * C * Math.LN2

/** τ from a measured (t, V) point: τ = t / ln(V₀/V). */
export function tauFromReading(t: number, V: number, V0: number): number | null {
  if (t <= 0 || V <= 0 || V >= V0) return null
  return t / Math.log(V0 / V)
}

export function dischargeCurve(V0: number, R: number, C: number, span: number, points = 121) {
  return Array.from({ length: points }, (_, i) => {
    const t = (span * i) / (points - 1)
    return {
      t,
      Vc: dischargeVoltage(t, V0, R, C),
      I: dischargeCurrent(t, V0, R, C) * 1000,
      E: remainingEnergy(t, V0, R, C) * 1000,
      heat: dissipatedEnergy(t, V0, R, C) * 1000,
    }
  })
}
