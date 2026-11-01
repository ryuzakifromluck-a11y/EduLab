import { describe, expect, it } from 'vitest'
import {
  MP_PURE,
  M_ASA,
  conversion,
  conversionCurves,
  fecl3Test,
  isolate,
  meltingRange,
  rateConstant,
  stoichiometry,
} from './synthesisOfAspirin'

// Standard teaching scale: 2.00 g salicylic acid + 5.0 mL acetic anhydride + H₃PO₄, 85 °C.
const p = { saMass: 2, ac2oVolume: 5, catalyst: 'phosphoric' as const, tempC: 85 }

describe('aspirin synthesis', () => {
  it('finds the limiting reagent (1 : 1 stoichiometry)', () => {
    const s = stoichiometry(p)
    expect(s.nSA).toBeCloseTo(0.01448, 5) // 2.00 / 138.12
    expect(s.nAc2O).toBeCloseTo(0.0529, 4) // 5.0 × 1.08 / 102.09
    expect(s.limiting).toBe('salicylicAcid')
    expect(s.theoretical).toBeCloseTo(2.609, 3) // 0.014480 × 180.16
    const s2 = stoichiometry({ saMass: 5, ac2oVolume: 2 })
    expect(s2.limiting).toBe('aceticAnhydride')
    expect(s2.theoretical).toBeCloseTo(((2 * 1.08) / 102.09) * M_ASA, 9)
  })

  it('needs a catalyst: H₃PO₄ at 85 °C gives ~95 % in 15 min, no catalyst very little', () => {
    expect(conversion('phosphoric', 85, 15)).toBeCloseTo(0.95, 2)
    expect(conversion('none', 85, 15)).toBeLessThan(0.15)
    expect(conversion('sulfuric', 85, 15)).toBeGreaterThan(conversion('phosphoric', 85, 15))
    expect(rateConstant('phosphoric', 95)).toBeGreaterThan(rateConstant('phosphoric', 85))
    expect(conversion('phosphoric', 85, 0)).toBe(0)
  })

  it('reports a realistic percent yield below 100 %', () => {
    const r = isolate(p, 15, false)
    expect(r.percentYield).toBeGreaterThan(70)
    expect(r.percentYield).toBeLessThan(100)
    expect(r.productMass).toBeCloseTo(r.aspirinMass + r.saImpurity, 12)
    expect(r.percentYield).toBeCloseTo((r.productMass / r.stoich.theoretical) * 100, 9)
  })

  it('pure aspirin melts sharply near 135 °C; impurities depress and broaden it', () => {
    const [lo, hi] = meltingRange(0)
    expect(hi).toBe(MP_PURE)
    expect(hi - lo).toBeCloseTo(1, 9)
    const [lo2, hi2] = meltingRange(0.05)
    expect(hi2).toBeCloseTo(135 - 46.3 * 0.05, 0)
    expect(hi2 - lo2).toBeGreaterThan(hi - lo)
  })

  it('FeCl₃ turns violet only when salicylic acid is left', () => {
    expect(fecl3Test(0).result).toBe('negative')
    expect(fecl3Test(0.01).result).toBe('faint')
    expect(fecl3Test(0.2).result).toBe('positive')
    expect(fecl3Test(1).color).toBe('#5b1f86')
    expect(fecl3Test(0).color).toBe('#f1d78a')
  })

  it('short heating leaves salicylic acid; recrystallisation purifies at a lower yield', () => {
    const short = isolate(p, 2, false)
    expect(short.fecl3).toBe('positive')
    expect(short.meltingRange[1]).toBeLessThan(130)
    const long = isolate(p, 30, false)
    const pure = isolate(p, 30, true)
    expect(pure.purity).toBeGreaterThan(long.purity)
    expect(pure.percentYield).toBeLessThan(long.percentYield)
    expect(pure.fecl3).toBe('negative')
    expect(pure.meltingRange[1]).toBeGreaterThan(134.9)
  })

  it('samples conversion curves for each catalyst', () => {
    const c = conversionCurves(85, 10, 1)
    expect(c).toHaveLength(11)
    expect(c[10].sulfuric).toBeGreaterThan(c[10].phosphoric)
    expect(c[10].phosphoric).toBeGreaterThan(c[10].none)
  })
})
