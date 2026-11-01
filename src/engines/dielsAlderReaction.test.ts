import { describe, expect, it } from 'vitest'
import {
  DIENES,
  DIENOPHILES,
  activationEnergy,
  addFormulas,
  analyse,
  conversion,
  endoFraction,
  formatFormula,
  molarMass,
  rateConstant,
  rateVsTemperature,
} from './dielsAlderReaction'

describe('Diels–Alder [4+2] cycloaddition', () => {
  it('keeps every atom: the product formula is the sum of both reactants', () => {
    expect(formatFormula(analyse('butadiene', 'ethylene', 25, 1).product)).toBe('C₆H₁₀') // cyclohexene
    expect(formatFormula(analyse('cyclopentadiene', 'maleicAnhydride', 25, 1).product)).toBe('C₉H₈O₃')
    expect(formatFormula(analyse('butadiene', 'maleicAnhydride', 25, 1).product)).toBe('C₈H₈O₃')
    expect(addFormulas({ C: 1, H: 2 }, { O: 1 })).toEqual({ C: 1, H: 2, O: 1 })
  })

  it('computes molar masses', () => {
    expect(molarMass({ C: 6, H: 10 })).toBeCloseTo(82.14, 1)
    expect(analyse('cyclopentadiene', 'maleicAnhydride', 25, 1).productMass).toBeCloseTo(164.16, 1)
  })

  it('always forms one new six-membered ring with two new σ bonds', () => {
    const a = analyse('dimethylbutadiene', 'methylAcrylate', 80, 1)
    expect(a.ringSize).toBe(6)
    expect(a.newSigmaBonds).toBe(2)
    expect(a.skeleton).toBe('cyclohexene')
    expect(analyse('cyclopentadiene', 'ethylene', 80, 1).skeleton).toBe('norbornene')
  })

  it('electron-withdrawing groups on the dienophile lower the gap, Ea and speed the reaction', () => {
    const e = analyse('butadiene', 'ethylene', 100, 1)
    const ma = analyse('butadiene', 'methylAcrylate', 100, 1)
    const mah = analyse('butadiene', 'maleicAnhydride', 100, 1)
    expect(e.gap).toBeGreaterThan(ma.gap)
    expect(ma.gap).toBeGreaterThan(mah.gap)
    expect(e.ea).toBeGreaterThan(ma.ea)
    expect(mah.k / e.k).toBeGreaterThan(1e6)
  })

  it('electron-donating groups on the diene raise the HOMO and speed the reaction', () => {
    expect(DIENES.dimethylbutadiene.homo).toBeGreaterThan(DIENES.butadiene.homo)
    expect(rateConstant(DIENES.dimethylbutadiene, DIENOPHILES.methylAcrylate, 50)).toBeGreaterThan(
      rateConstant(DIENES.butadiene, DIENOPHILES.methylAcrylate, 50),
    )
  })

  it('a ring-locked s-cis diene reacts fastest; rate is proportional to the s-cis fraction', () => {
    const cp = { ...DIENES.butadiene, sCis: 1 }
    expect(rateConstant(cp, DIENOPHILES.ethylene, 25) / rateConstant(DIENES.butadiene, DIENOPHILES.ethylene, 25)).toBeCloseTo(1 / 0.03, 6)
    expect(analyse('cyclopentadiene', 'maleicAnhydride', 25, 1).halfLife).toBeLessThan(5)
    expect(analyse('butadiene', 'ethylene', 25, 1).halfLife).toBeGreaterThan(1e9)
  })

  it('follows the Arrhenius equation and the linear FMO fit', () => {
    expect(activationEnergy(7.6)).toBeCloseTo(35, 9)
    expect(activationEnergy(8.6)).toBeCloseTo(61.7, 9)
    const k1 = rateConstant(DIENES.cyclopentadiene, DIENOPHILES.methylAcrylate, 25)
    const k2 = rateConstant(DIENES.cyclopentadiene, DIENOPHILES.methylAcrylate, 35)
    const ea = analyse('cyclopentadiene', 'methylAcrylate', 25, 1).ea * 1000
    expect(Math.log(k2 / k1)).toBeCloseTo((ea / 8.314) * (1 / 298.15 - 1 / 308.15), 9)
    const curve = rateVsTemperature('butadiene', 0, 100, 10)
    expect(curve).toHaveLength(11)
    for (let i = 1; i < curve.length; i++) expect(curve[i].ethylene).toBeGreaterThan(curve[i - 1].ethylene)
  })

  it('second-order conversion: 50 % at t½ = 1/(k·c₀), approaching 100 %', () => {
    const a = analyse('cyclopentadiene', 'methylAcrylate', 25, 0.5)
    expect(conversion(a.k, 0.5, a.halfLife)).toBeCloseTo(0.5, 12)
    expect(conversion(a.k, 0.5, 0)).toBe(0)
    expect(conversion(a.k, 0.5, a.halfLife * 99)).toBeCloseTo(0.99, 9)
  })

  it('endo rule: endo is the major kinetic product with an acceptor group on a cyclic diene', () => {
    const a = analyse('cyclopentadiene', 'maleicAnhydride', 25, 1)
    expect(a.stereoDistinct).toBe(true)
    expect(a.major).toBe('endo')
    expect(a.endoFraction).toBeGreaterThan(0.97)
    // Higher temperature lowers the selectivity.
    expect(endoFraction(10, 150)).toBeLessThan(a.endoFraction)
    // A smaller secondary-orbital effect gives about 3 : 1 endo : exo (methyl acrylate).
    expect(analyse('cyclopentadiene', 'methylAcrylate', 25, 1).endoFraction).toBeCloseTo(0.75, 1)
  })

  it('endo/exo are not distinct for open-chain dienes or ethylene', () => {
    expect(analyse('butadiene', 'maleicAnhydride', 25, 1).major).toBeNull()
    expect(analyse('cyclopentadiene', 'ethylene', 25, 1).stereoDistinct).toBe(false)
  })
})
