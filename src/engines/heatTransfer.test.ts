import { describe, expect, it } from 'vitest'
import { MATERIALS, Rod, diffusivity, exactMidTemperature, materialById, steadyHeatFlow, steadyTemperature, timeConstant } from './heatTransfer'

const copper = materialById('copper')
const steel = materialById('steel')

describe("Fourier's law", () => {
  it('P = kAΔT/L', () => {
    expect(steadyHeatFlow(copper, 0.2, 100, 20)).toBeCloseTo((401 * 1e-4 * 80) / 0.2, 12)
  })

  it('halving the length doubles the heat flow', () => {
    expect(steadyHeatFlow(steel, 0.1, 100, 20) / steadyHeatFlow(steel, 0.2, 100, 20)).toBeCloseTo(2, 12)
  })

  it('rejects a zero length', () => {
    expect(() => steadyHeatFlow(steel, 0, 100, 20)).toThrow(RangeError)
  })

  it('orders the materials from best to worst conductor', () => {
    const ks = MATERIALS.map((m) => m.k)
    expect([...ks].sort((a, b) => b - a)).toEqual(ks)
  })
})

describe('heat equation', () => {
  it('approaches the linear steady-state profile', () => {
    const rod = new Rod(copper, 0.2, 100, 20)
    rod.advance(timeConstant(copper, 0.2) * 12)
    for (const f of [0.25, 0.5, 0.75]) expect(rod.at(f)).toBeCloseTo(steadyTemperature(f * 0.2, 0.2, 100, 20), 2)
    expect(rod.heatOut).toBeCloseTo(steadyHeatFlow(copper, 0.2, 100, 20), 1)
  })

  it('matches the exact Fourier-series solution while warming up', () => {
    const rod = new Rod(steel, 0.2, 100, 20)
    const t = 300
    for (let i = 0; i < 60; i++) rod.advance(t / 60)
    expect(rod.at(0.5)).toBeCloseTo(exactMidTemperature(steel, 0.2, 100, 20, t), 0)
    expect(Math.abs(rod.at(0.5) - exactMidTemperature(steel, 0.2, 100, 20, t))).toBeLessThan(0.3)
  })

  it('a better conductor warms up faster', () => {
    const a = new Rod(copper, 0.2, 100, 20)
    const b = new Rod(steel, 0.2, 100, 20)
    a.advance(60)
    b.advance(60)
    expect(a.at(0.5)).toBeGreaterThan(b.at(0.5))
    expect(diffusivity(copper)).toBeGreaterThan(diffusivity(steel))
  })

  it('keeps the ends at the bath temperatures and stays stable for large steps', () => {
    const rod = new Rod(copper, 0.1, 90, 10)
    rod.advance(5000)
    expect(rod.temps[0]).toBe(90)
    expect(rod.temps[rod.segments]).toBe(10)
    for (const T of rod.temps) expect(T).toBeGreaterThanOrEqual(10 - 1e-9)
  })
})
