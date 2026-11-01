import { describe, expect, it } from 'vitest'
import { EnergySimulation, bottomSpeed, energyVsPosition, releaseX, trackHeight, X_MAX, type EnergyParams } from './energyConservation'

const base: EnergyParams = { height: 3, mass: 50, friction: 0, gravity: 9.81 }

describe('track', () => {
  it('releases the skater at the requested height on the left', () => {
    const x = releaseX(3)
    expect(x).toBeLessThan(0)
    expect(trackHeight(x)).toBeCloseTo(3, 12)
    expect(trackHeight(X_MAX)).toBe(4)
  })
})

describe('frictionless motion', () => {
  it('conserves kinetic + potential energy', () => {
    const sim = new EnergySimulation(base)
    const E0 = sim.energies.total
    expect(E0).toBeCloseTo(50 * 9.81 * 3, 9)
    for (let i = 0; i < 40; i++) {
      sim.advance(0.25)
      const { kinetic, potential } = sim.energies
      expect((kinetic + potential) / E0).toBeCloseTo(1, 6)
    }
  })

  it('reaches √(2gh) at the bottom and the release height on the other side', () => {
    const sim = new EnergySimulation(base)
    let vMax = 0
    let xMax = -Infinity
    for (let i = 0; i < 4000; i++) {
      sim.advance(1 / 480)
      vMax = Math.max(vMax, sim.speed)
      xMax = Math.max(xMax, sim.x)
    }
    expect(vMax).toBeCloseTo(bottomSpeed(9.81, 3), 2)
    expect(trackHeight(xMax)).toBeCloseTo(3, 3)
  })

  it('motion does not depend on the mass', () => {
    const a = new EnergySimulation(base)
    const b = new EnergySimulation({ ...base, mass: 5 })
    a.advance(1.7)
    b.advance(1.7)
    expect(a.x).toBeCloseTo(b.x, 12)
  })
})

describe('with friction', () => {
  it('turns mechanical energy into thermal energy, keeping the total', () => {
    const sim = new EnergySimulation({ ...base, friction: 0.2 })
    sim.advance(5)
    const e = sim.energies
    expect(e.thermal).toBeGreaterThan(0)
    expect(e.kinetic + e.potential + e.thermal).toBeCloseTo(e.total, 9)
    sim.advance(60)
    expect(sim.energies.thermal / e.total).toBeGreaterThan(0.99)
  })
})

describe('energy vs position', () => {
  it('kinetic energy is total − potential where the skater can go', () => {
    const s = energyVsPosition(base, 9)
    const mid = s[4]
    expect(mid.x).toBe(0)
    expect(mid.kinetic).toBeCloseTo(mid.total, 9)
    expect(s[0].kinetic).toBeNull()
  })
})
