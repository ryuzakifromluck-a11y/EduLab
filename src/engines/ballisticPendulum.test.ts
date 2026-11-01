import { describe, expect, it } from 'vitest'
import {
  BALL_MASS,
  BallisticRig,
  G,
  LAUNCHER,
  PENDULUM,
  angleFromHeight,
  heightFromAngle,
  keptFraction,
  launchSpeedFromAngle,
  launchSpeedFromHeight,
  launcherSpeed,
  riseFor,
  scatter,
  shot,
  speedAfter,
} from './ballisticPendulum'

const { M, L } = PENDULUM
const m = BALL_MASS

describe('ballistic pendulum', () => {
  it('conserves momentum in the impact: m v = (M + m) V', () => {
    const V = speedAfter(m, 5, M)
    expect(m * 5).toBeCloseTo((M + m) * V, 12)
  })

  it('conserves energy in the swing: h = V²/2g', () => {
    expect(riseFor(1)).toBeCloseTo(1 / (2 * G), 12)
    expect(heightFromAngle(angleFromHeight(0.05, L), L)).toBeCloseTo(0.05, 12)
  })

  it('recovers the launch speed from the swing height and angle', () => {
    for (const l of LAUNCHER) {
      const s = shot(l.speed)
      expect(launchSpeedFromHeight(s.h, m, M)).toBeCloseTo(l.speed, 9)
      expect(launchSpeedFromAngle(s.theta, m, M, L)).toBeCloseTo(l.speed, 9)
    }
  })

  it('the impact is perfectly inelastic: only m/(M + m) of the energy is kept', () => {
    const s = shot(6)
    expect(s.keAfter / s.keBefore).toBeCloseTo(keptFraction(m, M), 12)
    expect(s.keAfter).toBeLessThan(s.keBefore)
  })

  it('three ranges swing progressively higher', () => {
    expect(LAUNCHER.map((l) => l.id)).toEqual(['short', 'medium', 'long'])
    const angles = LAUNCHER.map((l) => shot(l.speed).theta)
    expect(angles[0]).toBeLessThan(angles[1])
    expect(angles[1]).toBeLessThan(angles[2])
    expect(angles[2]).toBeLessThan(Math.PI / 2)
    expect(launcherSpeed('long')).toBe(6)
  })

  it('angle is capped when the pendulum would loop over', () => {
    expect(angleFromHeight(2 * L + 0.1, L)).toBe(Math.PI)
  })

  it('scatter is reproducible and small', () => {
    expect(scatter(3)).toBe(scatter(3))
    for (let i = 0; i < 50; i++) expect(Math.abs(scatter(i) - 1)).toBeLessThanOrEqual(0.02)
  })

  it('the simulated rig catches the swing near the predicted angle', () => {
    const rig = new BallisticRig()
    rig.fire(4.5)
    for (let i = 0; i < 40 && rig.phase !== 'done'; i++) rig.advance(0.05)
    expect(rig.phase).toBe('done')
    const predicted = shot(4.5).theta
    // light damping during the swing loses a little height
    expect(rig.caught).toBeLessThan(predicted)
    expect(rig.caught / predicted).toBeGreaterThan(0.93)
  })
})
