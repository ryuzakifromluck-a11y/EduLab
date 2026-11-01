/**
 * Charging a capacitor through a resistor (series RC circuit).
 *
 * Closing the switch at t = 0 on an uncharged capacitor:
 *
 *   V_C(t) = V₀ (1 − e^(−t/RC))
 *   I(t)   = (V₀/R) e^(−t/RC)
 *   Q(t)   = C V₀ (1 − e^(−t/RC))
 *   τ = RC
 *
 * After one τ the capacitor is at 63 % of V₀, after 5τ at 99.3 %. The battery
 * supplies C V₀² in total; half is stored in the capacitor (½CV₀²) and half
 * is dissipated as heat in the resistor, whatever R is.
 */

/** Time constant τ = RC, s (R in Ω, C in F). */
export const timeConstant = (R: number, C: number) => R * C

export const capacitorVoltage = (t: number, V0: number, R: number, C: number) => (t <= 0 ? 0 : V0 * (1 - Math.exp(-t / (R * C))))

export const chargingCurrent = (t: number, V0: number, R: number, C: number) => (t < 0 ? 0 : (V0 / R) * Math.exp(-t / (R * C)))

export const charge = (t: number, V0: number, R: number, C: number) => C * capacitorVoltage(t, V0, R, C)

/** Voltage across the resistor: V₀ − V_C. */
export const resistorVoltage = (t: number, V0: number, R: number, C: number) => V0 - capacitorVoltage(t, V0, R, C)

/** Energy stored in the capacitor at time t, ½ C V_C². */
export const storedEnergy = (t: number, V0: number, R: number, C: number) => 0.5 * C * capacitorVoltage(t, V0, R, C) ** 2

/** Energy delivered by the battery up to t: V₀ · Q(t). */
export const batteryEnergy = (t: number, V0: number, R: number, C: number) => V0 * charge(t, V0, R, C)

/** Energy turned into heat in the resistor up to t. */
export const resistorHeat = (t: number, V0: number, R: number, C: number) => batteryEnergy(t, V0, R, C) - storedEnergy(t, V0, R, C)

/** Fraction of V₀ reached after n time constants. */
export const fractionAfter = (n: number) => 1 - Math.exp(-n)

/** Time to reach a fraction f (0 < f < 1) of V₀. */
export const timeToFraction = (f: number, R: number, C: number) => -R * C * Math.log(1 - f)

/** τ from a measured (t, V_C) point: τ = −t / ln(1 − V_C/V₀). */
export function tauFromReading(t: number, Vc: number, V0: number): number | null {
  const f = Vc / V0
  if (t <= 0 || f <= 0 || f >= 1) return null
  return -t / Math.log(1 - f)
}

/** Sampled curves over `span` seconds for plotting. */
export function chargingCurve(V0: number, R: number, C: number, span: number, points = 121) {
  return Array.from({ length: points }, (_, i) => {
    const t = (span * i) / (points - 1)
    return { t, Vc: capacitorVoltage(t, V0, R, C), I: chargingCurrent(t, V0, R, C) * 1000, Q: charge(t, V0, R, C) * 1e6 }
  })
}
