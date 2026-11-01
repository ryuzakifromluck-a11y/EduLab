import { describe, expect, it } from 'vitest'
import {
  INDICATORS,
  SUBSTANCES,
  baseFraction,
  hydrogenIon,
  hydroxideIon,
  indicatorById,
  indicatorColor,
  indicatorZone,
  ionCurves,
  nature,
  phFromHydrogen,
  transitionCurves,
  type TwoColourIndicator,
} from './indicators'

describe('pH scale', () => {
  it('pH = −log[H⁺] and [H⁺][OH⁻] = 10⁻¹⁴', () => {
    expect(hydrogenIon(3)).toBeCloseTo(1e-3, 15)
    expect(phFromHydrogen(1e-5)).toBeCloseTo(5, 12)
    for (const pH of [1, 7, 12.5]) expect(hydrogenIon(pH) * hydroxideIon(pH)).toBeCloseTo(1e-14, 25)
  })

  it('one pH unit is a factor of ten in [H⁺]', () => {
    expect(hydrogenIon(3) / hydrogenIon(4)).toBeCloseTo(10, 9)
  })

  it('classifies acidic, neutral and basic solutions', () => {
    expect(nature(2)).toBe('acidic')
    expect(nature(7)).toBe('neutral')
    expect(nature(9)).toBe('basic')
  })

  it('lists substances from most acidic to most basic', () => {
    const pHs = SUBSTANCES.map((s) => s.pH)
    expect([...pHs].sort((a, b) => a - b)).toEqual(pHs)
  })
})

describe('two-colour indicators', () => {
  it('are half in each form at pH = pKa', () => {
    expect(baseFraction(7.1, 7.1)).toBeCloseTo(0.5, 12)
    expect(baseFraction(7.1, 8.1)).toBeCloseTo(10 / 11, 12)
  })

  it('show the acid colour below the range and the base colour above it', () => {
    const btb = indicatorById('bromothymolBlue') as TwoColourIndicator
    expect(indicatorZone(btb, 4)).toBe('acid')
    expect(indicatorZone(btb, 7)).toBe('transition')
    expect(indicatorZone(btb, 10)).toBe('base')
    expect(indicatorColor(btb, 1).hex).toBe(btb.acidColor)
    expect(indicatorColor(btb, 13).hex).toBe(btb.baseColor)
  })

  it('phenolphthalein is colourless in acid and pink in base', () => {
    const php = indicatorById('phenolphthalein')
    expect(indicatorColor(php, 3).alpha).toBeLessThan(0.01)
    expect(indicatorColor(php, 12).alpha).toBeGreaterThan(0.99)
  })
})

describe('mixed indicators', () => {
  it('universal indicator is green at pH 7 and follows its stops', () => {
    const u = indicatorById('universal')
    expect(indicatorColor(u, 7).hex).toBe('#5fb446')
    expect(indicatorColor(u, -1).hex).toBe('#c0162c')
    expect(indicatorColor(u, 20).hex).toBe('#6b2a8c')
  })
})

describe('curves', () => {
  it('has one transition curve per two-colour indicator, rising from 0 to 100 %', () => {
    const rows = transitionCurves(15)
    const twos = INDICATORS.filter((i) => i.kind === 'two')
    for (const ind of twos) {
      expect(rows[0][ind.id]).toBeLessThan(1)
      expect(rows[14][ind.id]).toBeGreaterThan(99)
    }
    expect(ionCurves(15)[7]).toEqual({ pH: 7, logH: -7, logOH: -7 })
  })
})
