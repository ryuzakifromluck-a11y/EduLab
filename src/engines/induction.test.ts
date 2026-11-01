import { describe, expect, it } from 'vitest'
import {
  COIL_RADIUS,
  InductionSimulation,
  MU0,
  emf,
  emfAt,
  fluxGradient,
  fluxPerTurn,
  linkedFlux,
  peakEmf,
  peakVsFrequency,
  type InductionParams,
} from './induction'

const base: InductionParams = { turns: 200, moment: 1, frequency: 1, polarity: 1 }

describe('flux', () => {
  it('is μ₀μ/(2a) at the centre of a turn and falls off with distance', () => {
    expect(fluxPerTurn(1, 0)).toBeCloseTo((MU0 * 1) / (2 * COIL_RADIUS), 15)
    expect(fluxPerTurn(1, 0.1)).toBeLessThan(fluxPerTurn(1, 0.05))
  })

  it('fluxGradient is the derivative of the flux', () => {
    const h = 1e-7
    for (const z of [0.01, 0.03, 0.1]) {
      const num = (fluxPerTurn(1, z + h) - fluxPerTurn(1, z - h)) / (2 * h)
      expect(fluxGradient(1, z) / num).toBeCloseTo(1, 6)
    }
  })
})

describe("Faraday's law", () => {
  it('gives ε = −N dΦ/dt', () => {
    const t = 0.37
    const h = 1e-6
    const dPhi = (emfAt(base, t + h).flux - emfAt(base, t - h).flux) / (2 * h)
    expect(emfAt(base, t).emf).toBeCloseTo(-dPhi, 6)
  })

  it('a stationary magnet induces nothing', () => {
    expect(Math.abs(emf(base, 0.05, 0))).toBe(0)
    expect(peakEmf({ ...base, frequency: 0 })).toBe(0)
  })

  it('scales linearly with the number of turns, the magnet strength and the speed', () => {
    const p0 = peakEmf(base)
    expect(peakEmf({ ...base, turns: 400 }) / p0).toBeCloseTo(2, 9)
    expect(peakEmf({ ...base, moment: 0.5 }) / p0).toBeCloseTo(0.5, 9)
    expect(peakEmf({ ...base, frequency: 2 }) / p0).toBeCloseTo(2, 3)
    const s = peakVsFrequency(base, 2, 3)
    expect(s[2].peak).toBeCloseTo(2 * s[1].peak, 9)
  })

  it('reverses the EMF when the magnet is turned round (Lenz)', () => {
    const north = emfAt(base, 0.1).emf
    const south = emfAt({ ...base, polarity: -1 }, 0.1).emf
    expect(south).toBeCloseTo(-north, 15)
    expect(linkedFlux({ ...base, polarity: -1 }, 0.05)).toBeLessThan(0)
  })

  it('moving in and moving out give opposite signs', () => {
    const inward = emf(base, 0.05, -1)
    const outward = emf(base, 0.05, 1)
    expect(Math.sign(inward)).toBe(-Math.sign(outward))
  })
})

describe('simulation', () => {
  it('matches the closed form', () => {
    const sim = new InductionSimulation(base)
    for (let i = 0; i < 37; i++) sim.advance(0.01)
    expect(sim.emf).toBeCloseTo(emfAt(base, 0.37).emf, 9)
  })
})
