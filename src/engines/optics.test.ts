import { describe, expect, it } from 'vitest'
import { angleSweep, criticalAngle, lightSpeed, mediumById, reflectance, refractionAngle, traceRay } from './optics'

const rad = (d: number) => (d * Math.PI) / 180

describe("Snell's law", () => {
  it('n₁ sin θ₁ = n₂ sin θ₂', () => {
    for (const a of [10, 30, 60, 80]) {
      const t = refractionAngle(1, 1.5, a)!
      expect(1 * Math.sin(rad(a))).toBeCloseTo(1.5 * Math.sin(rad(t)), 12)
    }
  })

  it('bends towards the normal entering a denser medium and away from it leaving', () => {
    expect(refractionAngle(1, 1.333, 40)!).toBeLessThan(40)
    expect(refractionAngle(1.333, 1, 40)!).toBeGreaterThan(40)
  })

  it('a ray along the normal is not deviated', () => {
    expect(refractionAngle(1, 2.417, 0)).toBe(0)
  })
})

describe('total internal reflection', () => {
  it('has a critical angle of about 41.1° for glass to air', () => {
    expect(criticalAngle(1.52, 1)).toBeCloseTo(41.14, 2)
    expect(criticalAngle(1, 1.52)).toBeNull()
  })

  it('reflects everything beyond the critical angle', () => {
    const r = traceRay(1.52, 1, 50)
    expect(r.totalInternal).toBe(true)
    expect(r.refraction).toBeNull()
    expect(r.reflected).toBe(1)
  })
})

describe('Fresnel reflectance', () => {
  it('is ((n₁ − n₂)/(n₁ + n₂))² at normal incidence', () => {
    expect(reflectance(1, 1.5, 0).r).toBeCloseTo(0.04, 12)
  })

  it('p-polarised reflection vanishes at Brewster’s angle', () => {
    const brewster = (Math.atan(1.5) * 180) / Math.PI
    expect(reflectance(1, 1.5, brewster).rp).toBeCloseTo(0, 12)
  })

  it('reflected and transmitted shares add up to 100 %', () => {
    angleSweep(1, 1.333, 10).forEach((p) => expect(p.reflected + p.transmitted).toBeCloseTo(100, 9))
  })

  it('grows towards grazing incidence', () => {
    expect(reflectance(1, 1.5, 85).r).toBeGreaterThan(reflectance(1, 1.5, 30).r)
  })
})

describe('media', () => {
  it('light is slower in denser media', () => {
    expect(lightSpeed(mediumById('water').n)).toBeCloseTo(299792458 / 1.333, 3)
    expect(lightSpeed(mediumById('diamond').n)).toBeLessThan(lightSpeed(mediumById('glass').n))
  })
})
