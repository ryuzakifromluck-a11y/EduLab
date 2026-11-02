import { describe, expect, it } from 'vitest'
import {
  ALKALI,
  finalTemperature,
  heatPower,
  hydrogenVolume,
  initialState,
  lifetimeAtConstantT,
  remainingMass,
  simulate,
  solutionPH,
  sphereRadius,
  step,
  totalMoles,
  type SodiumWaterParams,
} from './sodiumWater'

const NA: SodiumWaterParams = { metal: 'Na', mass: 0.25, waterVolume: 100, initialTemp: 20, beakerRadius: 3.4 }

describe('sodium + water stoichiometry', () => {
  it('releases one mole of H₂ for every two moles of sodium', () => {
    const { final } = simulate(NA)
    const n = totalMoles(NA)
    expect(final.done).toBe(true)
    expect(final.reacted).toBeCloseTo(n, 10)
    // 0.25 g Na = 0.01087 mol → 0.005437 mol H₂ → 133 mL at 25 °C.
    expect(hydrogenVolume(final.reacted)).toBeCloseTo((n / 2) * 24.47 * 1000, 6)
    expect(hydrogenVolume(final.reacted)).toBeCloseTo(133.0, 0)
  })

  it('is exothermic: q = n·|ΔH| warms the water by q/(m·c)', () => {
    const { final } = simulate(NA)
    const expected = 20 + (totalMoles(NA) * 184.3 * 1000) / (100 * 4.18)
    expect(final.temp).toBeCloseTo(expected, 6)
    expect(finalTemperature(NA)).toBeCloseTo(expected, 9)
    expect(final.temp - 20).toBeCloseTo(4.79, 1)
  })

  it('makes a strongly basic solution of NaOH', () => {
    // 0.01087 mol in 0.1 L → [OH⁻] = 0.109 M → pH ≈ 13.04
    expect(solutionPH(totalMoles(NA), 100)).toBeCloseTo(13.04, 2)
    expect(solutionPH(0, 100)).toBeCloseTo(7, 6)
  })

  it('conserves mass of metal at every step', () => {
    let s = initialState(NA)
    for (let i = 0; i < 40; i++) {
      s = step(s, NA, 0.25)
      const left = remainingMass(s, NA)
      expect(left + s.reacted * ALKALI.Na.molarMass).toBeCloseTo(NA.mass, 9)
      expect(left).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('reactivity down group 1', () => {
  it('K reacts faster than Na, which reacts faster than Li', () => {
    const t = (metal: 'Li' | 'Na' | 'K') => simulate({ ...NA, metal }).final.t
    expect(t('K')).toBeLessThan(t('Na'))
    expect(t('Na')).toBeLessThan(t('Li'))
    expect(t('Na')).toBeGreaterThan(5)
    expect(t('Na')).toBeLessThan(25)
    expect(t('K')).toBeLessThan(8)
    expect(t('Li')).toBeGreaterThan(25)
  })

  it('reacts faster in warmer water', () => {
    expect(simulate({ ...NA, initialTemp: 40 }).final.t).toBeLessThan(simulate(NA).final.t)
    expect(lifetimeAtConstantT({ ...NA, initialTemp: 30 })).toBeCloseTo(lifetimeAtConstantT(NA) / 2, 9)
  })

  it('ignites the hydrogen for potassium and large pieces of sodium only', () => {
    const burnsAtStart = (p: SodiumWaterParams) => step(initialState(p), p, 0.02).burning
    expect(burnsAtStart({ ...NA, metal: 'K' })).toBe(true)
    expect(burnsAtStart(NA)).toBe(false)
    expect(burnsAtStart({ ...NA, mass: 0.8 })).toBe(true)
    expect(burnsAtStart({ ...NA, metal: 'Li', mass: 1 })).toBe(false)
    expect(heatPower('Na', sphereRadius(0.8, ALKALI.Na.density), 20)).toBeGreaterThan(ALKALI.Na.ignitionPower)
  })
})

describe('motion on the surface', () => {
  it('darts around but stays inside the beaker', () => {
    let s = initialState(NA)
    let maxSpeed = 0
    while (!s.done) {
      s = step(s, NA, 0.05, 1.3)
      expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(NA.beakerRadius + 1e-9)
      maxSpeed = Math.max(maxSpeed, Math.hypot(s.vx, s.vy))
    }
    expect(maxSpeed).toBeGreaterThan(1)
    expect(s.vx).toBe(0)
  })

  it('does nothing once finished or for dt = 0', () => {
    const s = initialState(NA)
    expect(step(s, NA, 0)).toBe(s)
    const done = simulate(NA).final
    expect(step(done, NA, 1)).toBe(done)
  })
})
