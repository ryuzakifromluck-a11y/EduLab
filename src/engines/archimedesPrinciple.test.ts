import { describe, expect, it } from 'vitest'
import {
  BODIES,
  G,
  apparentWeight,
  bodyById,
  bodyWeight,
  buoyantForce,
  floatingFraction,
  floats,
  fluidById,
  immerse,
  immersionCurve,
  liquidSgFromWeights,
  sgFromWeights,
  specificGravity,
} from './archimedesPrinciple'

const water = fluidById('water')
const al = bodyById('aluminium')

describe("Archimedes' principle", () => {
  it('F_b = ρ g V', () => {
    expect(buoyantForce(1000, 50e-6)).toBeCloseTo(50e-6 * 1000 * G, 12)
    expect(buoyantForce(1000, 0)).toBe(0)
  })

  it('apparent weight is the true weight minus the buoyant force', () => {
    const r = immerse(al, water, 1)
    expect(r.weight).toBeCloseTo(2700 * 50e-6 * G, 12)
    expect(r.apparent).toBeCloseTo(r.weight - r.buoyancy, 12)
    expect(r.weight - r.apparent).toBeCloseTo(r.buoyancy, 12)
    expect(apparentWeight(1, 2)).toBe(0)
  })

  it('the loss of weight equals the weight of the overflowed liquid', () => {
    const r = immerse(al, water, 1)
    expect(r.overflowMass).toBeCloseTo(50, 9)
    expect((r.overflowMass / 1000) * G).toBeCloseTo(r.buoyancy, 12)
  })

  it('buoyancy grows with depth until fully immersed, then stays constant', () => {
    const half = immerse(al, water, 0.5)
    const full = immerse(al, water, 1)
    expect(half.buoyancy).toBeCloseTo(full.buoyancy / 2, 12)
    expect(immerse(al, water, 1.5).buoyancy).toBeCloseTo(full.buoyancy, 12)
    const curve = immersionCurve(al, water, 11)
    expect(curve[0].apparent).toBeCloseTo(full.weight, 12)
    expect(curve[10].apparent).toBeCloseTo(full.apparent, 12)
  })

  it('denser liquids push up harder', () => {
    expect(immerse(al, fluidById('saltWater'), 1).buoyancy).toBeGreaterThan(immerse(al, water, 1).buoyancy)
    expect(immerse(al, fluidById('ethanol'), 1).apparent).toBeGreaterThan(immerse(al, water, 1).apparent)
  })

  it('specific gravity from weights in air and in water', () => {
    for (const b of BODIES.filter((x) => !floats(x.density, 1000))) {
      const Wa = bodyWeight(b)
      const Ww = immerse(b, water, 1).apparent
      expect(sgFromWeights(Wa, Ww)).toBeCloseTo(specificGravity(b.density), 9)
    }
    expect(sgFromWeights(1, 1)).toBeNull()
  })

  it('relative density of a liquid from losses of weight', () => {
    const Wa = bodyWeight(al)
    const Ww = immerse(al, water, 1).apparent
    const Wo = immerse(al, fluidById('oil'), 1).apparent
    expect(liquidSgFromWeights(Wa, Wo, Ww)).toBeCloseTo(0.9, 9)
  })

  it('a less dense body floats with ρ_obj/ρ_fluid submerged and the balance reads zero', () => {
    const wood = bodyById('wood')
    expect(floats(wood.density, 1000)).toBe(true)
    const r = immerse(wood, water, 1)
    expect(r.floating).toBe(true)
    expect(r.submerged).toBeCloseTo(floatingFraction(600, 1000), 12)
    expect(r.apparent).toBeCloseTo(0, 12)
    expect(r.buoyancy).toBeCloseTo(r.weight, 12)
    expect(immerse(wood, water, 0.3).floating).toBe(false)
  })
})
