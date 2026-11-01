import { describe, expect, it } from 'vitest'
import { angularFrequency, energies, frequency, maxima, period, periodVsMass, stateAt, totalEnergy, type ShmParams } from './harmonicMotion'

const base: ShmParams = { mass: 0.5, k: 20, amplitude: 0.1, damping: 0, phaseDeg: 0 }

describe('ideal SHM', () => {
  it('has ω = √(k/m) and T = 2π√(m/k)', () => {
    expect(angularFrequency(base)).toBeCloseTo(Math.sqrt(40), 12)
    expect(period(base)).toBeCloseTo(2 * Math.PI * Math.sqrt(0.5 / 20), 12)
    expect(frequency(base)).toBeCloseTo(1 / period(base), 12)
  })

  it('returns to the same state after one period', () => {
    const T = period(base)
    const a = stateAt(base, 0.3)
    const b = stateAt(base, 0.3 + T)
    expect(b.x).toBeCloseTo(a.x, 12)
    expect(b.v).toBeCloseTo(a.v, 12)
  })

  it('satisfies a = −ω²x', () => {
    const w2 = 20 / 0.5
    for (const t of [0, 0.1, 0.37, 1.2]) {
      const s = stateAt(base, t)
      expect(s.a).toBeCloseTo(-w2 * s.x, 10)
    }
  })

  it('velocity is the derivative of position', () => {
    const h = 1e-6
    const t = 0.42
    const dx = (stateAt(base, t + h).x - stateAt(base, t - h).x) / (2 * h)
    expect(stateAt(base, t).v).toBeCloseTo(dx, 6)
  })

  it('conserves ½kA² and reaches vmax = Aω at the centre', () => {
    for (const t of [0, 0.2, 0.55]) {
      const s = stateAt(base, t)
      expect(energies(base, s).total).toBeCloseTo(totalEnergy(base), 12)
    }
    const quarter = period(base) / 4
    expect(Math.abs(stateAt(base, quarter).v)).toBeCloseTo(maxima(base).vMax, 10)
  })

  it('starts at x = A cos φ', () => {
    expect(stateAt({ ...base, phaseDeg: 90 }, 0).x).toBeCloseTo(0, 12)
    expect(stateAt({ ...base, phaseDeg: 180 }, 0).x).toBeCloseTo(-0.1, 12)
  })

  it('rejects zero mass or stiffness', () => {
    expect(() => period({ mass: 0, k: 1 })).toThrow(RangeError)
  })
})

describe('damping', () => {
  it('makes the energy decay as e^(−2γt)', () => {
    const p = { ...base, damping: 0.1 }
    const T = period(p)
    const e0 = energies(p, stateAt(p, 0)).total
    const e = energies(p, stateAt(p, 3 * T)).total
    expect(e).toBeLessThan(e0 * 0.2)
  })

  it('satisfies the damped equation of motion m a + b v + k x = 0', () => {
    const p = { ...base, damping: 0.2 }
    const b = 2 * 0.2 * Math.sqrt(p.k * p.mass)
    const s = stateAt(p, 0.8)
    expect(p.mass * s.a + b * s.v + p.k * s.x).toBeCloseTo(0, 10)
  })
})

describe('period vs mass', () => {
  it('grows with √m', () => {
    const s = periodVsMass(20, 0.5, 2, 2)
    expect(s[1].period / s[0].period).toBeCloseTo(2, 12)
  })
})
