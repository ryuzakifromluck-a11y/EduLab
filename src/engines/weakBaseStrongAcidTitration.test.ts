import { describe, expect, it } from 'vitest'
import { INDICATORS } from './titration'
import {
  PKA,
  PKB,
  bestIndicator,
  equivalenceVolume,
  indicatorEndPoint,
  titrationCurve,
  titrationPoint,
  volumeAtPH,
} from './weakBaseStrongAcidTitration'

// Textbook case: 25.0 mL of 0.100 M NH₃ titrated with 0.100 M HCl.
const p = { baseConcentration: 0.1, baseVolume: 25, acidConcentration: 0.1 }

describe('weak base – strong acid titration (NH₃ + HCl)', () => {
  it('uses Kb = 1.8 × 10⁻⁵', () => {
    expect(PKB).toBeCloseTo(4.745, 3)
    expect(PKA).toBeCloseTo(9.255, 3)
  })

  it('finds the equivalence volume', () => {
    expect(equivalenceVolume(p)).toBeCloseTo(25, 12)
    expect(equivalenceVolume({ ...p, acidConcentration: 0.2 })).toBeCloseTo(12.5, 12)
  })

  it('starts at the pH of 0.1 M ammonia (≈ 11.12)', () => {
    const s = titrationPoint(p, 0)
    expect(s.pH).toBeCloseTo(11.12, 2)
    expect(s.region).toBe('start')
    expect(s.approxPH).toBeCloseTo(s.pH, 2)
  })

  it('follows Henderson–Hasselbalch in the buffer region', () => {
    // 10 mL: [NH₄⁺]/[NH₃] = 1.0/1.5 → pOH = 4.745 + log(2/3) = 4.569 → pH 9.431
    const b = titrationPoint(p, 10)
    expect(b.region).toBe('buffer')
    expect(b.pH).toBeCloseTo(9.431, 2)
    expect(b.approxPH).toBeCloseTo(b.pH, 2)
  })

  it('at half-equivalence pOH = pKb, so pH = 14 − pKb', () => {
    const h = titrationPoint(p, 12.5)
    expect(h.region).toBe('halfEquivalence')
    expect(h.pOH).toBeCloseTo(PKB, 2)
    expect(h.pH).toBeCloseTo(14 - PKB, 2)
  })

  it('is acidic at equivalence because NH₄⁺ hydrolyses (pH ≈ 5.28)', () => {
    const e = titrationPoint(p, 25)
    expect(e.region).toBe('equivalence')
    expect(e.pH).toBeLessThan(7)
    expect(e.pH).toBeCloseTo(5.28, 2)
    expect(e.approxPH).toBeCloseTo(e.pH, 2)
    expect(e.nh4).toBeCloseTo(0.05, 4)
  })

  it('after equivalence the excess H⁺ sets the pH', () => {
    // 30 mL: 0.5 mmol excess in 55 mL → [H⁺] = 9.09 × 10⁻³ → pH 2.04
    const a = titrationPoint(p, 30)
    expect(a.region).toBe('after')
    expect(a.excessAcidMmol).toBeCloseTo(0.5, 9)
    expect(a.pH).toBeCloseTo(2.04, 2)
  })

  it('the curve falls monotonically with the steepest drop at equivalence', () => {
    const c = titrationCurve(p, 50)
    for (let i = 1; i < c.length; i++) expect(c[i].pH).toBeLessThanOrEqual(c[i - 1].pH + 1e-9)
    expect(volumeAtPH(p, titrationPoint(p, 25).pH)!).toBeCloseTo(25, 3)
    expect(volumeAtPH(p, 13)).toBeNull()
  })

  it('methyl red / methyl orange suit the acidic equivalence point; phenolphthalein does not', () => {
    expect(indicatorEndPoint(p, INDICATORS.methylRed).suitability).toBe('good')
    expect(indicatorEndPoint(p, INDICATORS.methylOrange).suitability).toBe('good')
    expect(indicatorEndPoint(p, INDICATORS.bromothymolBlue).suitability).toBe('fair')
    expect(indicatorEndPoint(p, INDICATORS.phenolphthalein).suitability).toBe('poor')
    expect(indicatorEndPoint(p, INDICATORS.bromothymolBlue).error!).toBeLessThan(0)
    expect(bestIndicator(p)).toBe('methylRed')
  })
})
