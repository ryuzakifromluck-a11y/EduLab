import { describe, expect, it } from 'vitest'
import {
  APPARATUS,
  CAL,
  C_WATER,
  JouleCalorimeter,
  coilCurrent,
  coilPower,
  coilResistance,
  electricalWork,
  fallingWork,
  heatCapacity,
  heatGained,
  mechanicalEquivalent,
  temperatureRise,
} from './joulesExperiment'

const ideal = { ...APPARATUS, efficiency: 1, leakInsulated: 0 }

describe("Joule's experiment", () => {
  it('work of the falling mass is n·m·g·h', () => {
    expect(fallingWork(5, 1.5)).toBeCloseTo(73.575, 9)
    expect(fallingWork(5, 1.5, 20)).toBeCloseTo(1471.5, 9)
  })

  it('heat is (m_w·c + C_can)·ΔT', () => {
    expect(heatCapacity()).toBeCloseTo(0.25 * C_WATER + 80, 9)
    expect(heatGained(2)).toBeCloseTo(2 * (0.25 * 4186 + 80), 9)
  })

  it('temperature rise is proportional to mass and height', () => {
    const a = temperatureRise(fallingWork(5, 1))
    expect(temperatureRise(fallingWork(10, 1))).toBeCloseTo(2 * a, 12)
    expect(temperatureRise(fallingWork(5, 2))).toBeCloseTo(2 * a, 12)
  })

  it('without losses J comes out as 4.186 J/cal', () => {
    const W = fallingWork(8, 1.2, 30)
    const dT = temperatureRise(W, ideal)
    expect(mechanicalEquivalent(W, dT, ideal)).toBeCloseTo(CAL, 9)
    expect(mechanicalEquivalent(100, 0)).toBeNull()
  })

  it('coil resistance, current and power', () => {
    expect(coilResistance(12, 3)).toBe(4)
    expect(coilResistance(12, 0)).toBe(Infinity)
    expect(coilCurrent(12, 4)).toBe(3)
    expect(coilPower(3, 4)).toBe(36)
    expect(electricalWork(12, 3, 60)).toBe(2160)
  })

  it('the calorimeter warms by the delivered work and the drop stops at the floor', () => {
    const c = new JouleCalorimeter(ideal)
    c.drop(5, 1.2)
    expect(c.drop(5, 1.2)).toBe(false) // already falling
    for (let i = 0; i < 100; i++) c.advance(0.1)
    expect(c.falling).toBe(false)
    expect(c.work).toBeCloseTo(fallingWork(5, 1.2), 6)
    expect(c.dT).toBeCloseTo(c.work / heatCapacity(ideal), 6)
    expect(c.measuredJ!).toBeCloseTo(CAL, 6)
  })

  it('a bare can loses heat, so the measured J is too big', () => {
    const run = (insulated: boolean) => {
      const c = new JouleCalorimeter()
      c.insulated = insulated
      c.power = coilPower(coilCurrent(12, 4), 4)
      for (let i = 0; i < 600; i++) c.advance(0.5)
      return c
    }
    const ins = run(true)
    const bare = run(false)
    expect(bare.dT).toBeLessThan(ins.dT)
    expect(bare.measuredJ!).toBeGreaterThan(ins.measuredJ!)
    expect(ins.measuredJ! / CAL).toBeLessThan(1.1)
    expect(ins.work).toBeCloseTo(36 * 300, 3)
  })
})
