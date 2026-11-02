import { describe, expect, it } from 'vitest'
import {
  FARADAY,
  MAX_CURRENT,
  TUBE_CAPACITY,
  chargeToFill,
  collected,
  current,
  currentEfficiency,
  decompositionVoltage,
  faraday,
  gasVolumes,
  resistance,
  volumeRatio,
  type ElectrolysisParams,
} from './electrolysisWater'

const BASE: ElectrolysisParams = { voltage: 12, electrolyte: 'na2so4', concentration: 0.5, electrode: 'platinum' }

describe("Faraday's law", () => {
  it('gives two moles of H₂ for every mole of O₂', () => {
    const n = faraday(FARADAY * 4)
    expect(n.H2).toBeCloseTo(2, 12)
    expect(n.O2).toBeCloseTo(1, 12)
  })

  it('collects hydrogen and oxygen in a 2 : 1 volume ratio once the electrolyte is saturated', () => {
    const v = gasVolumes(300, 'platinum')
    expect(volumeRatio(v)!).toBeGreaterThan(1.95)
    expect(volumeRatio(v)!).toBeLessThan(2.05)
    // 300 C → 1.555 mmol H₂ → 38.0 mL at 25 °C (minus a little that dissolved)
    expect(v.h2Theory).toBeCloseTo((300 / (2 * FARADAY)) * 24.47e3, 6)
    expect(v.h2).toBeCloseTo(v.h2Theory - 0.008 * 24.47, 1)
  })

  it('shows a ratio above 2 at first, because oxygen is more soluble than hydrogen', () => {
    const early = gasVolumes(20, 'platinum')
    expect(volumeRatio(early)!).toBeGreaterThan(2.1)
    expect(currentEfficiency(early)).toBeLessThan(1)
  })

  it('stops when the hydrogen tube is full', () => {
    const q = chargeToFill()
    expect(gasVolumes(q * 0.99, 'platinum').full).toBe(false)
    const full = gasVolumes(q * 1.01, 'platinum')
    expect(full.full).toBe(true)
    expect(full.h2).toBe(TUBE_CAPACITY)
    expect(full.o2).toBeCloseTo(TUBE_CAPACITY / 2, 0)
  })
})

describe('cell current', () => {
  it('is zero below the decomposition voltage', () => {
    expect(decompositionVoltage('platinum')).toBeCloseTo(1.73, 2)
    expect(current({ ...BASE, voltage: 1.5 })).toBe(0)
    expect(current({ ...BASE, voltage: 3 })).toBeGreaterThan(0)
  })

  it('needs an electrolyte: distilled water barely conducts', () => {
    expect(current({ ...BASE, electrolyte: 'distilled' })).toBeLessThan(1e-5)
    expect(current(BASE)).toBeGreaterThan(0.3)
  })

  it('grows with concentration and voltage, up to the supply limit', () => {
    expect(current({ ...BASE, concentration: 1 })).toBeGreaterThan(current(BASE))
    expect(current({ ...BASE, voltage: 6 })).toBeLessThan(current(BASE))
    expect(current({ ...BASE, electrolyte: 'h2so4', concentration: 1 })).toBe(MAX_CURRENT)
    expect(resistance({ electrolyte: 'h2so4', concentration: 0.5 })).toBeLessThan(resistance({ electrolyte: 'na2so4', concentration: 0.5 }))
  })

  it('graphite needs a higher voltage than platinum', () => {
    expect(decompositionVoltage('graphite')).toBeGreaterThan(decompositionVoltage('platinum'))
  })
})

describe('electrode material', () => {
  it('a copper anode dissolves instead of making oxygen', () => {
    const v = gasVolumes(300, 'copper')
    expect(v.o2).toBe(0)
    expect(v.h2).toBeGreaterThan(30)
    expect(v.copper).toBeCloseTo(300 / (2 * FARADAY), 12)
    expect(volumeRatio(v)).toBeNull()
  })
})

describe('dissolution', () => {
  it('loses at most the dissolved capacity', () => {
    expect(collected(0, 0.01)).toBe(0)
    expect(collected(1, 0.01)).toBeCloseTo(0.99, 6)
    expect(collected(0.001, 0.01)).toBeLessThan(0.001)
  })
})
