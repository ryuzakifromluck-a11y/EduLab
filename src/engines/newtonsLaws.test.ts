import { describe, expect, it } from 'vitest'
import {
  CartSimulation,
  acceleration,
  accelerationVsForce,
  accelerationVsMass,
  frictionForce,
  netForce,
  stepCart,
  timeToCover,
  type CartParams,
} from './newtonsLaws'

const base: CartParams = { force: 10, mass: 2, friction: 0, pushing: true }

describe("Newton's second law", () => {
  it('gives a = F/m without friction', () => {
    expect(acceleration(base)).toBe(5)
    expect(acceleration({ ...base, mass: 4 })).toBe(2.5)
  })

  it('subtracts kinetic friction μmg from the applied force', () => {
    const p = { ...base, friction: 0.2 }
    expect(netForce(p, 1)).toBeCloseTo(10 - 0.2 * 2 * 9.81, 12)
    expect(acceleration(p, 1)).toBeCloseTo((10 - 3.924) / 2, 12)
  })

  it('static friction holds the cart until F exceeds μmg', () => {
    const p = { ...base, force: 3, friction: 0.2 } // μmg = 3.924 N
    expect(frictionForce(p, 0)).toBe(-3)
    expect(acceleration(p, 0)).toBe(0)
    expect(acceleration({ ...p, force: 5 }, 0)).toBeGreaterThan(0)
  })

  it('rejects a non-positive mass', () => {
    expect(() => acceleration({ ...base, mass: 0 })).toThrow(RangeError)
  })
})

describe('cart motion', () => {
  it('matches x = ½at² and v = at under constant force', () => {
    let s = { time: 0, x: 0, v: 0 }
    for (let i = 0; i < 100; i++) s = stepCart(base, s, 0.01)
    expect(s.v).toBeCloseTo(5, 9)
    expect(s.x).toBeCloseTo(2.5, 9)
  })

  it('keeps a constant velocity once the force stops on a frictionless track (first law)', () => {
    const p = { ...base, pushing: false }
    const s = stepCart(p, { time: 0, x: 0, v: 3 }, 2)
    expect(s.v).toBe(3)
    expect(s.x).toBe(6)
  })

  it('friction brings a coasting cart to rest and it does not move backwards', () => {
    const p = { ...base, pushing: false, friction: 0.1 }
    const s = stepCart(p, { time: 0, x: 0, v: 2 }, 10)
    const a = 0.1 * 9.81
    expect(s.v).toBe(0)
    expect(s.x).toBeCloseTo((2 * 2) / (2 * a), 9)
    expect(s.time).toBeCloseTo(10, 9)
  })

  it('the simulation stops exactly at the end of the track', () => {
    const sim = new CartSimulation(base, 10)
    let hit = false
    for (let i = 0; i < 1000 && !hit; i++) hit = sim.advance(0.05)
    expect(hit).toBe(true)
    expect(sim.x).toBe(10)
    expect(sim.time).toBeCloseTo(timeToCover(10, 5), 9)
    expect(sim.v).toBeCloseTo(Math.sqrt(2 * 5 * 10), 9)
    expect(sim.advance(1)).toBe(false)
  })
})

describe('series', () => {
  it('a–F is zero up to μmg and then a straight line of slope 1/m', () => {
    const s = accelerationVsForce(2, 0.2, 40, 41)
    expect(s[3].acceleration).toBe(0)
    expect(s[40].acceleration - s[30].acceleration).toBeCloseTo(10 / 2, 9)
  })

  it('a–m is inversely proportional to m without friction', () => {
    accelerationVsMass(12, 0, 1, 10, 10).forEach((p) => expect(p.acceleration * p.mass).toBeCloseTo(12, 9))
  })
})
