import { describe, expect, it } from 'vitest'
import {
  ProjectileSimulation,
  TENNIS_BALL_DRAG,
  apexTime,
  energyPerMass,
  flightTime,
  initialState,
  maxHeight,
  optimalAngleDeg,
  range,
  rangeVsAngle,
  rk4Step,
  simulateFlight,
  stateAt,
  type ProjectileParams,
} from './projectile'

const base: ProjectileParams = { speed: 20, angleDeg: 45, height: 0, gravity: 9.81, drag: 0 }

describe('drag-free closed-form results', () => {
  it('range from the ground equals v₀² sin 2θ / g', () => {
    expect(range(base)).toBeCloseTo((20 * 20) / 9.81, 9)
    expect(range({ ...base, angleDeg: 30 })).toBeCloseTo((400 * Math.sin(Math.PI / 3)) / 9.81, 9)
  })

  it('complementary angles give the same range from the ground', () => {
    expect(range({ ...base, angleDeg: 20 })).toBeCloseTo(range({ ...base, angleDeg: 70 }), 9)
  })

  it('flight time and maximum height match 2v₀sinθ/g and (v₀sinθ)²/2g', () => {
    const vy = 20 * Math.SQRT1_2
    expect(flightTime(base)).toBeCloseTo((2 * vy) / 9.81, 9)
    expect(maxHeight(base)).toBeCloseTo((vy * vy) / (2 * 9.81), 9)
    expect(apexTime(base)).toBeCloseTo(flightTime(base) / 2, 9)
  })

  it('a horizontal launch from a height falls for √(2h/g)', () => {
    const p = { ...base, angleDeg: 0, height: 20 }
    expect(flightTime(p)).toBeCloseTo(Math.sqrt((2 * 20) / 9.81), 9)
    expect(range(p)).toBeCloseTo(20 * Math.sqrt((2 * 20) / 9.81), 9)
    expect(maxHeight(p)).toBe(20)
  })

  it('the position at the flight time is back on the ground', () => {
    const p = { ...base, angleDeg: 62, height: 7 }
    const s = stateAt(p, flightTime(p))
    expect(s.y).toBeCloseTo(0, 9)
    expect(s.x).toBeCloseTo(range(p), 9)
  })

  it('45° is optimal from the ground and the optimum drops below 45° from a height', () => {
    expect(optimalAngleDeg(base)).toBeCloseTo(45, 9)
    const high = { ...base, height: 15 }
    const best = optimalAngleDeg(high)
    expect(best).toBeLessThan(45)
    const r = (a: number) => range({ ...high, angleDeg: a })
    expect(r(best)).toBeGreaterThan(r(best - 1))
    expect(r(best)).toBeGreaterThan(r(best + 1))
  })
})

describe('RK4 integration', () => {
  it('conserves mechanical energy without drag', () => {
    let s = initialState(base)
    const e0 = energyPerMass(s, base.gravity)
    for (let i = 0; i < 480 * 2; i++) s = rk4Step(s, base, 1 / 480)
    expect(Math.abs(energyPerMass(s, base.gravity) - e0) / e0).toBeLessThan(1e-10)
  })

  it('loses energy with drag', () => {
    const p = { ...base, drag: TENNIS_BALL_DRAG }
    let s = initialState(p)
    const e0 = energyPerMass(s, p.gravity)
    for (let i = 0; i < 480; i++) s = rk4Step(s, p, 1 / 480)
    expect(energyPerMass(s, p.gravity)).toBeLessThan(e0)
  })
})

describe('ProjectileSimulation', () => {
  it('lands at the analytic range and time without drag', () => {
    for (const angleDeg of [15, 45, 75]) {
      for (const height of [0, 10]) {
        const p = { ...base, angleDeg, height }
        const f = simulateFlight(p)
        expect(f.range).toBeCloseTo(range(p), 6)
        expect(f.flightTime).toBeCloseTo(flightTime(p), 6)
        expect(f.maxHeight).toBeCloseTo(maxHeight(p), 3)
      }
    }
  })

  it('stops at the ground and ignores further time', () => {
    const sim = new ProjectileSimulation(base)
    sim.advance(10)
    expect(sim.landed).toBe(true)
    const { x } = sim.state
    sim.advance(5)
    expect(sim.state.x).toBe(x)
    expect(sim.state.y).toBe(0)
  })

  it('air resistance shortens the range and lowers the optimum angle', () => {
    const p = { ...base, speed: 30, drag: TENNIS_BALL_DRAG }
    expect(simulateFlight(p).range).toBeLessThan(range(p))
    const curve = rangeVsAngle(p, 1)
    const best = curve.reduce((a, b) => (b.range > a.range ? b : a))
    expect(best.angle).toBeLessThan(45)
  })

  it('reset relaunches with new parameters', () => {
    const sim = new ProjectileSimulation(base)
    sim.advance(1)
    sim.reset({ angleDeg: 30, height: 5 })
    expect(sim.time).toBe(0)
    expect(sim.landed).toBe(false)
    expect(sim.state.y).toBe(5)
    expect(sim.state.vy).toBeCloseTo(10, 9)
  })
})
