import { describe, expect, it } from 'vitest'
import {
  ACTIVATION_ENERGY,
  K_REF,
  R,
  ReactionSimulation,
  S_CROSS,
  arrheniusSeries,
  celsiusToKelvin,
  crossTime,
  crossVisibility,
  halfLife,
  preExponential,
  rateAt,
  rateConstant,
  rateVsConcentration,
  sulfurAt,
  thiosulfateAt,
  turbidity,
} from './reactionRate'

const room = { concentration: 0.15, temperatureC: 25 }

describe('Arrhenius rate constant', () => {
  it('equals the reference value at 25 °C', () => {
    expect(rateConstant(25)).toBeCloseTo(K_REF, 12)
  })

  it('roughly doubles for a 10 °C rise near room temperature', () => {
    const ratio = rateConstant(35) / rateConstant(25)
    expect(ratio).toBeGreaterThan(1.8)
    expect(ratio).toBeLessThan(2.2)
  })

  it('matches k = A·e^(−Eₐ/RT)', () => {
    const A = preExponential()
    for (const c of [10, 40, 60]) {
      expect(rateConstant(c)).toBeCloseTo(A * Math.exp(-ACTIVATION_ENERGY / (R * celsiusToKelvin(c))), 12)
    }
  })

  it('gives a straight Arrhenius plot with slope −Eₐ/R', () => {
    const [a, b] = arrheniusSeries([15, 55])
    const slope = (b.lnK - a.lnK) / (b.inverseT - a.inverseT)
    expect(slope).toBeCloseTo(-ACTIVATION_ENERGY / R, 6)
  })
})

describe('first-order kinetics', () => {
  it('thiosulfate decays exponentially and sulfur forms 1:1', () => {
    const k = rateConstant(25)
    expect(thiosulfateAt(room, 0)).toBe(0.15)
    expect(thiosulfateAt(room, 100)).toBeCloseTo(0.15 * Math.exp(-100 * k), 12)
    expect(thiosulfateAt(room, 100) + sulfurAt(room, 100)).toBeCloseTo(0.15, 12)
  })

  it('halves after one half-life, independent of the starting concentration', () => {
    const t = halfLife(25)
    expect(thiosulfateAt(room, t)).toBeCloseTo(0.075, 12)
    expect(thiosulfateAt({ ...room, concentration: 0.04 }, t)).toBeCloseTo(0.02, 12)
  })

  it('initial rate is proportional to concentration', () => {
    expect(rateAt({ ...room, concentration: 0.2 }, 0) / rateAt({ ...room, concentration: 0.1 }, 0)).toBeCloseTo(2, 12)
  })
})

describe('disappearing cross', () => {
  it('vanishes exactly when the sulfur reaches the threshold', () => {
    const t = crossTime(room)
    expect(sulfurAt(room, t)).toBeCloseTo(S_CROSS, 12)
    expect(crossVisibility(room, t)).toBeCloseTo(0, 9)
    expect(crossVisibility(room, 0)).toBe(1)
  })

  it('takes a realistic school-lab time at room temperature', () => {
    const t = crossTime(room)
    expect(t).toBeGreaterThan(20)
    expect(t).toBeLessThan(90)
  })

  it('1/t is nearly proportional to concentration (half the concentration ≈ twice the time)', () => {
    const [low, high] = rateVsConcentration(25, [0.1, 0.2])
    expect(high.inverseTime / low.inverseTime).toBeGreaterThan(1.95)
    expect(high.inverseTime / low.inverseTime).toBeLessThan(2.05)
  })

  it('is faster when warmer', () => {
    expect(crossTime({ ...room, temperatureC: 45 })).toBeLessThan(crossTime(room) / 3)
  })

  it('never vanishes when there is too little thiosulfate', () => {
    expect(crossTime({ ...room, concentration: S_CROSS / 2 })).toBe(Infinity)
  })

  it('turbidity rises monotonically from 0 towards 1', () => {
    expect(turbidity(room, 0)).toBe(0)
    let prev = 0
    for (let t = 10; t < 600; t += 10) {
      const v = turbidity(room, t)
      expect(v).toBeGreaterThan(prev)
      expect(v).toBeLessThan(1)
      prev = v
    }
  })
})

describe('ReactionSimulation', () => {
  it('reports the cross vanishing once, at the right time', () => {
    const sim = new ReactionSimulation(room)
    const tc = crossTime(room)
    let hits = 0
    for (let i = 0; i < 2000; i++) if (sim.advance(0.1)) hits++
    expect(hits).toBe(1)
    expect(sim.crossVanishedAt).toBeCloseTo(tc, 12)
  })

  it('reset starts a new run with new conditions', () => {
    const sim = new ReactionSimulation(room)
    sim.advance(500)
    sim.reset({ temperatureC: 50 })
    expect(sim.time).toBe(0)
    expect(sim.crossVanishedAt).toBeNull()
    expect(sim.thiosulfate).toBe(0.15)
    expect(sim.params.temperatureC).toBe(50)
  })
})
