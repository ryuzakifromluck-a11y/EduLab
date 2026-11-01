import { describe, expect, it } from 'vitest'
import {
  INDICATORS,
  equivalenceVolume,
  indicatorColor,
  indicatorEndPoint,
  indicatorState,
  titrationCurve,
  titrationPoint,
  volumeAtPH,
} from './titration'

// Textbook case: 25.0 mL of 0.100 M HCl titrated with 0.100 M NaOH.
const p = { acidConcentration: 0.1, acidVolume: 25, baseConcentration: 0.1 }

describe('strong acid – strong base titration', () => {
  it('finds the equivalence volume Vb = CaVa/Cb', () => {
    expect(equivalenceVolume(p)).toBeCloseTo(25, 12)
    expect(equivalenceVolume({ ...p, baseConcentration: 0.2 })).toBeCloseTo(12.5, 12)
  })

  it('initial pH equals −log Ca', () => {
    expect(titrationPoint(p, 0).pH).toBeCloseTo(1.0, 6)
    expect(titrationPoint(p, 0).region).toBe('before')
  })

  it('matches textbook values before equivalence', () => {
    // 10.0 mL: excess H⁺ = (2.5 − 1.0) mmol / 35 mL = 0.042857 M → pH 1.368
    expect(titrationPoint(p, 10).pH).toBeCloseTo(1.368, 3)
    // 24.9 mL: (2.5 − 2.49)/49.9 = 2.004e-4 M → pH 3.698
    expect(titrationPoint(p, 24.9).pH).toBeCloseTo(3.698, 3)
  })

  it('gives pH 7.00 at equivalence', () => {
    const pt = titrationPoint(p, 25)
    expect(pt.pH).toBeCloseTo(7, 6)
    expect(pt.region).toBe('equivalence')
  })

  it('matches textbook values after equivalence', () => {
    // 25.1 mL: excess OH⁻ = 0.01 mmol / 50.1 mL → pOH 3.700 → pH 10.300
    expect(titrationPoint(p, 25.1).pH).toBeCloseTo(10.3, 3)
    // 35 mL: 1.0 mmol / 60 mL = 0.016667 M → pH 12.222
    expect(titrationPoint(p, 35).pH).toBeCloseTo(12.222, 3)
    expect(titrationPoint(p, 35).region).toBe('after')
  })

  it('keeps [H⁺][OH⁻] = Kw everywhere and is monotonic', () => {
    const curve = titrationCurve(p, 50)
    for (let i = 1; i < curve.length; i++) expect(curve[i].pH).toBeGreaterThanOrEqual(curve[i - 1].pH)
    for (const v of [0, 12, 25, 26, 50]) {
      const pt = titrationPoint(p, v)
      expect(pt.hydronium * pt.hydroxide).toBeCloseTo(1e-14, 20)
    }
  })

  it('inverts the curve with volumeAtPH', () => {
    for (const v of [5, 20, 24.99, 25.5, 40]) {
      expect(volumeAtPH(p, titrationPoint(p, v).pH)).toBeCloseTo(v, 6)
    }
  })
})

describe('indicators', () => {
  it('phenolphthalein is colourless in acid and pink in base', () => {
    const ind = INDICATORS.phenolphthalein
    expect(indicatorState(ind, 3)).toBe('acid')
    expect(indicatorState(ind, 9)).toBe('transition')
    expect(indicatorState(ind, 12)).toBe('base')
    const acid = indicatorColor(ind, 3)
    const base = indicatorColor(ind, 12)
    expect(acid.a).toBeLessThan(0.5)
    expect(base.r).toBeGreaterThan(base.g)
  })

  it('colour is determined by pH relative to pKa, not by time', () => {
    const ind = INDICATORS.bromothymolBlue
    const atPKa = indicatorColor(ind, ind.pKa)
    expect(atPKa.r).toBe(Math.round((ind.acidColor.r + ind.baseColor.r) / 2))
  })

  it('phenolphthalein end point lies within 0.1 % of equivalence for 0.1 M / 0.1 M', () => {
    const ep = indicatorEndPoint(p, INDICATORS.phenolphthalein)
    expect(ep.volume).not.toBeNull()
    expect(Math.abs(ep.errorPercent!)).toBeLessThan(0.1)
    expect(ep.errorMl!).toBeGreaterThan(0) // changes slightly after equivalence
  })

  it('methyl orange changes before equivalence', () => {
    const ep = indicatorEndPoint(p, INDICATORS.methylOrange)
    expect(ep.errorMl!).toBeLessThan(0)
  })
})
