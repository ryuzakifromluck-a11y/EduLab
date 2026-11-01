import { describe, expect, it } from 'vitest'
import {
  batteryEnergy,
  capacitorVoltage,
  charge,
  chargingCurrent,
  chargingCurve,
  fractionAfter,
  resistorHeat,
  resistorVoltage,
  storedEnergy,
  tauFromReading,
  timeConstant,
  timeToFraction,
} from './rcCircuitCharging'

const V0 = 9
const R = 10_000
const C = 470e-6
const tau = R * C

describe('RC charging', () => {
  it('τ = RC', () => {
    expect(timeConstant(R, C)).toBeCloseTo(4.7, 12)
  })

  it('starts empty and reaches 63 % after one τ, 99.3 % after 5τ', () => {
    expect(capacitorVoltage(0, V0, R, C)).toBe(0)
    expect(capacitorVoltage(tau, V0, R, C) / V0).toBeCloseTo(0.632, 3)
    expect(capacitorVoltage(5 * tau, V0, R, C) / V0).toBeCloseTo(0.9933, 4)
    expect(fractionAfter(1)).toBeCloseTo(0.632, 3)
    expect(capacitorVoltage(1000 * tau, V0, R, C)).toBeCloseTo(V0, 9)
  })

  it('current starts at V₀/R and decays to 37 % after τ', () => {
    expect(chargingCurrent(0, V0, R, C)).toBeCloseTo(V0 / R, 12)
    expect(chargingCurrent(tau, V0, R, C) / (V0 / R)).toBeCloseTo(Math.exp(-1), 12)
  })

  it('Kirchhoff: V_R + V_C = V₀ and Q = C·V_C', () => {
    for (const t of [0.5, 2, 9]) {
      expect(resistorVoltage(t, V0, R, C) + capacitorVoltage(t, V0, R, C)).toBeCloseTo(V0, 12)
      expect(resistorVoltage(t, V0, R, C)).toBeCloseTo(chargingCurrent(t, V0, R, C) * R, 9)
      expect(charge(t, V0, R, C)).toBeCloseTo(C * capacitorVoltage(t, V0, R, C), 15)
    }
  })

  it('half the battery energy ends up in the capacitor, half as heat', () => {
    const t = 50 * tau
    expect(storedEnergy(t, V0, R, C)).toBeCloseTo(0.5 * C * V0 * V0, 9)
    expect(batteryEnergy(t, V0, R, C)).toBeCloseTo(C * V0 * V0, 9)
    expect(resistorHeat(t, V0, R, C)).toBeCloseTo(0.5 * C * V0 * V0, 9)
  })

  it('bigger R or C charges more slowly', () => {
    expect(capacitorVoltage(2, V0, 2 * R, C)).toBeLessThan(capacitorVoltage(2, V0, R, C))
    expect(capacitorVoltage(2, V0, R, 2 * C)).toBeLessThan(capacitorVoltage(2, V0, R, C))
    expect(timeToFraction(0.5, R, C)).toBeCloseTo(tau * Math.LN2, 12)
  })

  it('recovers τ from a single reading', () => {
    expect(tauFromReading(3, capacitorVoltage(3, V0, R, C), V0)).toBeCloseTo(tau, 9)
    expect(tauFromReading(0, 1, V0)).toBeNull()
    expect(tauFromReading(3, V0, V0)).toBeNull()
  })

  it('samples a curve in V, mA and µC', () => {
    const c = chargingCurve(V0, R, C, 5 * tau, 6)
    expect(c[0]).toEqual({ t: 0, Vc: 0, I: 0.9, Q: 0 })
    expect(c[1].Vc).toBeCloseTo(V0 * (1 - Math.exp(-1)), 12)
  })
})
