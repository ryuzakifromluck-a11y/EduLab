import { describe, expect, it } from 'vitest'
import {
  EquilibriumSimulation,
  K_298,
  equilibriumConcentrations,
  equilibriumConstant,
  kVsTemperature,
  reactionQuotient,
  shiftDirection,
} from './equilibrium'

describe('equilibrium constant', () => {
  it('is 4.6 × 10⁻³ at 25 °C and rises with temperature (endothermic)', () => {
    expect(equilibriumConstant(25)).toBeCloseTo(K_298, 12)
    expect(equilibriumConstant(80)).toBeGreaterThan(equilibriumConstant(25))
    expect(equilibriumConstant(0)).toBeLessThan(equilibriumConstant(25))
  })

  it('follows the van ’t Hoff equation', () => {
    const k1 = equilibriumConstant(25)
    const k2 = equilibriumConstant(75)
    expect(Math.log(k2 / k1)).toBeCloseTo((-57200 / 8.314) * (1 / 348.15 - 1 / 298.15), 9)
    const curve = kVsTemperature(0, 100, 3)
    expect(curve[1].K).toBeCloseTo(equilibriumConstant(50), 12)
  })
})

describe('equilibrium concentrations', () => {
  it('satisfy Kc = [NO₂]²/[N₂O₄] and conserve nitrogen', () => {
    const { n2o4, no2 } = equilibriumConcentrations(0.04, 1, 25)
    expect(reactionQuotient(n2o4, no2)).toBeCloseTo(K_298, 12)
    expect(n2o4 + no2 / 2).toBeCloseTo(0.04, 12)
    expect(no2).toBeCloseTo(0.01247, 4)
  })

  it('compressing the gas shifts it towards fewer molecules (N₂O₄)', () => {
    const big = equilibriumConcentrations(0.04, 2, 25)
    const small = equilibriumConcentrations(0.04, 0.5, 25)
    const fracBig = big.no2 / 2 / (big.n2o4 + big.no2 / 2)
    const fracSmall = small.no2 / 2 / (small.n2o4 + small.no2 / 2)
    expect(fracSmall).toBeLessThan(fracBig)
  })
})

describe('direction of change', () => {
  it('compares Q with K', () => {
    expect(shiftDirection(1e-3, 4.6e-3)).toBe('forward')
    expect(shiftDirection(1e-2, 4.6e-3)).toBe('reverse')
    expect(shiftDirection(4.6e-3, 4.6e-3)).toBe('equilibrium')
    expect(shiftDirection(Infinity, 4.6e-3)).toBe('reverse')
  })
})

describe('simulation', () => {
  it('relaxes to the analytic equilibrium from pure N₂O₄', () => {
    const sim = new EquilibriumSimulation(0.04, 1, 25)
    expect(sim.shift).toBe('forward')
    sim.advance(30)
    const eq = equilibriumConcentrations(0.04, 1, 25)
    expect(sim.no2).toBeCloseTo(eq.no2, 6)
    expect(sim.shift).toBe('equilibrium')
  })

  it('warming makes the gas browner (more NO₂) — Le Chatelier', () => {
    const sim = new EquilibriumSimulation(0.04, 1, 25)
    sim.equilibrate()
    const before = sim.no2
    sim.tempC = 80
    expect(sim.shift).toBe('forward')
    sim.advance(20)
    expect(sim.no2).toBeGreaterThan(before)
    expect(sim.no2).toBeCloseTo(equilibriumConcentrations(0.04, 1, 80).no2, 5)
  })

  it('adding NO₂ shifts the equilibrium back towards N₂O₄', () => {
    const sim = new EquilibriumSimulation(0.04, 1, 25)
    sim.equilibrate()
    const n2o4 = sim.n2o4
    sim.add('no2', 0.02)
    expect(sim.shift).toBe('reverse')
    sim.advance(30)
    expect(sim.n2o4).toBeGreaterThan(n2o4)
    expect(sim.Q).toBeCloseTo(sim.K, 6)
  })

  it('stays stable at the hottest, most compressed setting', () => {
    const sim = new EquilibriumSimulation(0.2, 0.5, 100)
    sim.add('no2', 0.1)
    sim.advance(30)
    expect(Number.isFinite(sim.no2)).toBe(true)
    expect(sim.Q / sim.K).toBeCloseTo(1, 4)
    expect(sim.pressure).toBeGreaterThan(0)
  })
})
