import { describe, expect, it } from 'vitest'
import {
  PendulumSimulation,
  degToRad,
  energyPerMass,
  exactPeriod,
  isSmallAngleValid,
  maxAngularSpeed,
  rk4Step,
  smallAngleErrorPercent,
  smallAnglePeriod,
} from './pendulum'

const earth = { length: 1, gravity: 9.81 }

describe('pendulum periods', () => {
  it('small-angle period matches 2π√(L/g)', () => {
    expect(smallAnglePeriod(earth)).toBeCloseTo(2.00607, 4)
    expect(smallAnglePeriod({ length: 2.45, gravity: 9.81 })).toBeCloseTo(3.1400, 3)
  })

  it('doubling length multiplies the period by √2', () => {
    const t1 = smallAnglePeriod(earth)
    const t2 = smallAnglePeriod({ ...earth, length: 2 })
    expect(t2 / t1).toBeCloseTo(Math.SQRT2, 10)
  })

  it('exact period converges to the small-angle period as amplitude → 0', () => {
    expect(exactPeriod(earth, 1e-6)).toBeCloseTo(smallAnglePeriod(earth), 9)
  })

  it('exact period matches reference values T/T₀ for large amplitudes', () => {
    // Reference ratios T/T₀ = 2K(k)/π, k = sin(θ₀/2)
    const t0 = smallAnglePeriod(earth)
    expect(exactPeriod(earth, degToRad(30)) / t0).toBeCloseTo(1.017409, 5)
    expect(exactPeriod(earth, degToRad(90)) / t0).toBeCloseTo(1.180341, 5)
    expect(exactPeriod(earth, degToRad(150)) / t0).toBeCloseTo(1.762204, 4)
  })

  it('small-angle approximation is flagged valid only for small amplitudes', () => {
    expect(isSmallAngleValid(earth, degToRad(10))).toBe(true)
    expect(isSmallAngleValid(earth, degToRad(45))).toBe(false)
    expect(smallAngleErrorPercent(earth, degToRad(10))).toBeLessThan(0.2)
  })
})

describe('RK4 integration', () => {
  it('conserves mechanical energy over many periods', () => {
    let s = { theta: degToRad(60), omega: 0 }
    const e0 = energyPerMass(s, earth)
    for (let i = 0; i < 480 * 20; i++) s = rk4Step(s, earth, 1 / 480)
    expect(Math.abs(energyPerMass(s, earth) - e0) / e0).toBeLessThan(1e-7)
  })

  it('reaches the speed predicted by energy conservation at the bottom', () => {
    const sim = new PendulumSimulation(earth, degToRad(40))
    let maxOmega = 0
    sim.advance(3, (_t, s) => (maxOmega = Math.max(maxOmega, Math.abs(s.omega))))
    expect(maxOmega).toBeCloseTo(maxAngularSpeed(earth, degToRad(40)), 3)
  })
})

describe('PendulumSimulation', () => {
  it('measures a period equal to the exact period (nonlinear model)', () => {
    const amp = degToRad(80)
    const sim = new PendulumSimulation(earth, amp)
    sim.advance(10)
    expect(sim.measuredPeriod).not.toBeNull()
    expect(sim.measuredPeriod!).toBeCloseTo(exactPeriod(earth, amp), 4)
  })

  it('counts complete oscillations', () => {
    const sim = new PendulumSimulation(earth, degToRad(10))
    const T = exactPeriod(earth, degToRad(10))
    sim.advance(T * 5 + T * 0.8) // first upward crossing occurs at 3T/4
    expect(sim.oscillations).toBe(6)
  })

  it('reset returns to rest at the new amplitude', () => {
    const sim = new PendulumSimulation(earth, degToRad(10))
    sim.advance(3)
    sim.reset(degToRad(20))
    expect(sim.time).toBe(0)
    expect(sim.oscillations).toBe(0)
    expect(sim.state).toEqual({ theta: degToRad(20), omega: 0 })
  })
})
