import { describe, expect, it } from 'vitest'
import {
  DilutionSimulation,
  absorbance,
  calibrationLine,
  concentrationCurve,
  diluted,
  dilutionFactor,
  molesIn,
  stockVolumeNeeded,
  transmittance,
} from './dilution'

describe('C₁V₁ = C₂V₂', () => {
  it('computes the diluted concentration', () => {
    expect(diluted(1, 10, 100)).toBeCloseTo(0.1, 12)
    expect(diluted(0.5, 25, 250)).toBeCloseTo(0.05, 12)
  })

  it('keeps the amount of solute', () => {
    expect(molesIn(diluted(0.8, 20, 100), 100)).toBeCloseTo(molesIn(0.8, 20), 15)
  })

  it('finds the stock volume needed', () => {
    expect(stockVolumeNeeded(1, 0.2, 250)).toBeCloseTo(50, 12)
    expect(() => stockVolumeNeeded(0, 0.2, 250)).toThrow(RangeError)
    expect(() => diluted(1, 10, 0)).toThrow(RangeError)
  })

  it('dilution factor is V₂/V₁', () => {
    expect(dilutionFactor(10, 100)).toBe(10)
  })

  it('concentration falls as 1/V while water is added', () => {
    const s = concentrationCurve(1, 10, 100, 10)
    s.forEach((p) => expect(p.concentration * p.volume).toBeCloseTo(10, 9))
  })
})

describe('Beer–Lambert law', () => {
  it('absorbance is proportional to concentration', () => {
    expect(absorbance(0.1)).toBeCloseTo(1.2, 12)
    expect(absorbance(0.2) / absorbance(0.1)).toBeCloseTo(2, 12)
    expect(calibrationLine(0.2, 3)[2].absorbance).toBeCloseTo(2.4, 12)
  })

  it('absorbance 1 lets 10 % of the light through', () => {
    expect(transmittance(1)).toBeCloseTo(0.1, 12)
    expect(transmittance(0)).toBe(1)
  })
})

describe('procedure', () => {
  it('pipettes, fills to the mark and mixes', () => {
    const sim = new DilutionSimulation(1, 10, 100)
    expect(sim.moles).toBe(0)
    sim.pipette()
    expect(sim.concentration).toBe(1)
    let steps = 0
    while (sim.stage !== 'mark' && steps++ < 10000) sim.advance(0.05)
    expect(sim.volume).toBe(100)
    expect(sim.concentration).toBeCloseTo(0.1, 12)
    expect(sim.mixing).toBeLessThan(1)
    while (sim.stage !== 'mixed' && steps++ < 20000) sim.advance(0.05)
    expect(sim.stage).toBe('mixed')
    expect(sim.moles).toBeCloseTo(0.01, 15)
    expect(sim.advance(1)).toBe(false)
  })
})
