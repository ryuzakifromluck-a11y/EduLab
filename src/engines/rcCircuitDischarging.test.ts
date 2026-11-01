import { describe, expect, it } from 'vitest'
import {
  capacitorEnergy,
  dischargeCharge,
  dischargeCurrent,
  dischargeCurve,
  dischargeVoltage,
  dissipatedEnergy,
  fractionLeft,
  halfTime,
  remainingEnergy,
  resistorPower,
  tauFromReading,
  timeConstant,
} from './rcCircuitDischarging'

const V0 = 12
const R = 4700
const C = 1000e-6
const tau = R * C

describe('RC discharging', () => {
  it('τ = RC and the voltage falls to 1/e after one τ', () => {
    expect(timeConstant(R, C)).toBeCloseTo(4.7, 12)
    expect(dischargeVoltage(0, V0, R, C)).toBe(V0)
    expect(dischargeVoltage(tau, V0, R, C) / V0).toBeCloseTo(Math.exp(-1), 12)
    expect(fractionLeft(1)).toBeCloseTo(0.368, 3)
  })

  it('is practically empty after 5τ', () => {
    expect(dischargeVoltage(5 * tau, V0, R, C) / V0).toBeCloseTo(0.0067, 4)
    expect(dischargeVoltage(5 * tau, V0, R, C) / V0).toBeLessThan(0.01)
  })

  it('current is negative (reversed) and starts at −V₀/R', () => {
    expect(dischargeCurrent(0, V0, R, C)).toBeCloseTo(-V0 / R, 12)
    expect(dischargeCurrent(2, V0, R, C)).toBeLessThan(0)
    expect(-dischargeCurrent(3, V0, R, C) * R).toBeCloseTo(dischargeVoltage(3, V0, R, C), 9)
  })

  it('stored energy ½CV² all ends up as heat in the resistor', () => {
    expect(capacitorEnergy(C, V0)).toBeCloseTo(0.072, 12)
    for (const t of [1, 4, 10]) {
      expect(remainingEnergy(t, V0, R, C) + dissipatedEnergy(t, V0, R, C)).toBeCloseTo(capacitorEnergy(C, V0), 12)
    }
    expect(dissipatedEnergy(100 * tau, V0, R, C)).toBeCloseTo(capacitorEnergy(C, V0), 12)
    expect(dissipatedEnergy(0, V0, R, C)).toBe(0)
  })

  it('dissipated energy is the integral of I²R', () => {
    let E = 0
    const dt = 0.001
    for (let t = 0; t < 6; t += dt) E += resistorPower(t + dt / 2, V0, R, C) * dt
    expect(E).toBeCloseTo(dissipatedEnergy(6, V0, R, C), 5)
  })

  it('half-time and τ from a reading', () => {
    expect(dischargeVoltage(halfTime(R, C), V0, R, C)).toBeCloseTo(V0 / 2, 12)
    expect(tauFromReading(2, dischargeVoltage(2, V0, R, C), V0)).toBeCloseTo(tau, 9)
    expect(tauFromReading(2, V0, V0)).toBeNull()
    expect(dischargeCharge(0, V0, R, C)).toBeCloseTo(C * V0, 15)
  })

  it('samples a curve', () => {
    const c = dischargeCurve(V0, R, C, 5 * tau, 6)
    expect(c[0].Vc).toBe(V0)
    expect(c[5].Vc / V0).toBeCloseTo(Math.exp(-5), 12)
    expect(c[0].I).toBeCloseTo((-V0 / R) * 1000, 12)
  })
})
