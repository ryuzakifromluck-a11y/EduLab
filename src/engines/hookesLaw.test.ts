import { describe, expect, it } from 'vitest'
import { PLASTIC_RATIO, SPRINGS, SpringSystem, elasticEnergy, extension, loadingCurve, permanentSet, springById, stiffnessFrom, weight } from './hookesLaw'

const medium = springById('medium')

describe("Hooke's law", () => {
  it('extension is F/k below the elastic limit', () => {
    expect(extension(medium, 5)).toBeCloseTo(5 / 30, 12)
    expect(extension(medium, 0)).toBe(0)
  })

  it('weight is m·g', () => {
    expect(weight(0.2)).toBeCloseTo(1.962, 12)
  })

  it('stretches more steeply beyond the elastic limit and keeps a permanent set', () => {
    const fl = medium.limit
    const x1 = extension(medium, fl)
    const x2 = extension(medium, fl + 1)
    expect(x2 - x1).toBeCloseTo(1 / (medium.k * PLASTIC_RATIO), 12)
    expect(permanentSet(medium, fl)).toBe(0)
    const set = permanentSet(medium, fl + 2)
    expect(set).toBeGreaterThan(0)
    // Unloaded after the overload, the spring does not return to zero.
    expect(extension(medium, 0, fl + 2)).toBeCloseTo(set, 12)
  })

  it('elastic energy is ½kx²', () => {
    expect(elasticEnergy(25, 0.2)).toBeCloseTo(0.5, 12)
  })

  it('recovers k from readings by least squares', () => {
    const readings = [1, 2, 3, 4].map((f) => ({ force: f, extension: extension(medium, f) }))
    expect(stiffnessFrom(readings)).toBeCloseTo(30, 9)
    expect(stiffnessFrom([])).toBeNull()
  })

  it('softer springs have lower k and limits', () => {
    expect(SPRINGS.map((s) => s.k)).toEqual([15, 30, 60])
    const curve = loadingCurve(springById('soft'), 4.5, 5)
    expect(curve[4].extension).toBeCloseTo(0.3, 12)
  })
})

describe('spring system', () => {
  it('settles at the static extension after a mass is added', () => {
    const s = new SpringSystem(medium)
    s.setMass(0.3)
    for (let i = 0; i < 200; i++) s.advance(0.1)
    expect(s.x).toBeCloseTo((0.3 * 9.81) / 30, 4)
  })

  it('remembers an overload until the spring is replaced', () => {
    const s = new SpringSystem(medium)
    s.setMass(1) // 9.81 N > 6.5 N
    expect(s.overLimit).toBe(true)
    s.setMass(0)
    expect(s.equilibrium).toBeGreaterThan(0)
    s.replace(medium)
    expect(s.overLimit).toBe(false)
    expect(s.equilibrium).toBe(0)
  })
})
