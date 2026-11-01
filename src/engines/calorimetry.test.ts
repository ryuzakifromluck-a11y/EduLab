import { describe, expect, it } from 'vitest'
import {
  C_WATER,
  CalorimeterSimulation,
  deltaTVsMass,
  energyProfile,
  enthalpyFromMeasurement,
  heatReleased,
  idealDeltaT,
  isExothermic,
  moles,
  type CalorimetryParams,
} from './calorimetry'

const naoh: CalorimetryParams = { substance: 'naoh', mass: 4, water: 100, startT: 20 }

describe('calorimetry', () => {
  it('q = −ΔH·n and ΔT = q/(mc)', () => {
    expect(moles(naoh)).toBeCloseTo(0.1, 12)
    expect(heatReleased(naoh)).toBeCloseTo(4450, 9)
    expect(idealDeltaT(naoh)).toBeCloseTo(4450 / (100 * C_WATER), 9)
  })

  it('exothermic solids warm the water, endothermic ones cool it', () => {
    expect(isExothermic('naoh')).toBe(true)
    expect(isExothermic('nh4no3')).toBe(false)
    expect(idealDeltaT({ ...naoh, substance: 'nh4no3' })).toBeLessThan(0)
  })

  it('twice the mass or half the water doubles ΔT', () => {
    expect(idealDeltaT({ ...naoh, mass: 8 }) / idealDeltaT(naoh)).toBeCloseTo(2, 12)
    expect(idealDeltaT({ ...naoh, water: 50 }) / idealDeltaT(naoh)).toBeCloseTo(2, 12)
    const s = deltaTVsMass(naoh, 10, 3)
    expect(s[0].deltaT).toBeCloseTo(0, 12)
    expect(s[2].deltaT).toBeCloseTo(2 * s[1].deltaT, 12)
  })

  it('recovers ΔH from a measured temperature change', () => {
    expect(enthalpyFromMeasurement(100, idealDeltaT(naoh), moles(naoh))).toBeCloseTo(-44.5, 9)
  })
})

describe('calorimeter simulation', () => {
  it('does nothing until the solid is added', () => {
    const sim = new CalorimeterSimulation(naoh)
    sim.advance(30)
    expect(sim.temperature).toBe(20)
  })

  it('reaches a peak slightly below the ideal ΔT and then cools back towards the room', () => {
    const sim = new CalorimeterSimulation(naoh)
    sim.start()
    sim.advance(120)
    const ideal = idealDeltaT(naoh)
    expect(sim.peakDelta).toBeGreaterThan(ideal * 0.9)
    expect(sim.peakDelta).toBeLessThan(ideal)
    expect(sim.extent).toBeGreaterThan(0.99)
    const afterPeak = sim.deltaT
    sim.advance(3000)
    expect(sim.deltaT).toBeLessThan(afterPeak)
  })

  it('an endothermic solid gives a negative peak', () => {
    const sim = new CalorimeterSimulation({ ...naoh, substance: 'kcl', mass: 7.455 })
    sim.start()
    sim.advance(120)
    expect(sim.peakDelta).toBeLessThan(0)
    expect(sim.peakDelta).toBeGreaterThan(idealDeltaT({ ...naoh, substance: 'kcl', mass: 7.455 }))
  })
})

describe('energy profile', () => {
  it('starts at 0, ends at ΔH and peaks at Eₐ above the reactants', () => {
    for (const dH of [-44.5, 25.7]) {
      const p = energyProfile(dH, 61)
      expect(p[0].H).toBeCloseTo(0, 2)
      expect(p[60].H).toBeCloseTo(dH, 2)
      expect(p[30].H).toBeCloseTo(Math.max(dH, 0) + 40, 6)
    }
  })
})
