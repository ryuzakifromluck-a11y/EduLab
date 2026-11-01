import { describe, expect, it } from 'vitest'
import {
  CLEAR_UG,
  DEFAULT_SETTINGS,
  DnaExtractionSimulation,
  FILTER_RECOVERY,
  SOURCES,
  SPOOL_EFFICIENCY,
  coldFactor,
  ethanolFactor,
  ethanolFraction,
  extract,
  lysisEfficiency,
  precipitatedAt,
  precipitationTau,
  purityRatio,
  purityVerdict,
  saltFactor,
  temperatureCurve,
} from './dnaExtraction'

describe('cell lysis', () => {
  it('needs detergent to break the membranes', () => {
    expect(lysisEfficiency(0, 120, true)).toBe(0)
    expect(lysisEfficiency(0, 0, false)).toBe(0)
    expect(lysisEfficiency(5, 0, false)).toBeGreaterThan(0.95)
  })

  it('needs mashing only when the cells have a wall', () => {
    expect(lysisEfficiency(3, 0, true)).toBe(0)
    expect(lysisEfficiency(3, 120, true)).toBeGreaterThan(lysisEfficiency(3, 30, true))
    // Cheek cells have no wall: mashing time makes no difference.
    expect(lysisEfficiency(3, 0, false)).toBe(lysisEfficiency(3, 120, false))
  })

  it('stays between 0 and 1', () => {
    for (const d of [0, 1, 3, 10]) for (const t of [0, 30, 300]) {
      const l = lysisEfficiency(d, t, true)
      expect(l).toBeGreaterThanOrEqual(0)
      expect(l).toBeLessThanOrEqual(1)
    }
  })
})

describe('precipitation', () => {
  it('needs salt to shield the phosphate charges', () => {
    expect(saltFactor(0)).toBeCloseTo(0.15)
    expect(saltFactor(0.5)).toBeGreaterThan(saltFactor(0.1))
    expect(saltFactor(1)).toBeLessThan(1)
  })

  it('needs a high enough ethanol fraction', () => {
    expect(ethanolFraction(1)).toBeCloseTo(0.5)
    expect(ethanolFraction(2)).toBeCloseTo(2 / 3)
    expect(ethanolFactor(0.25)).toBeLessThan(0.05)
    expect(ethanolFactor(2)).toBeGreaterThan(0.98)
  })

  it('is more complete and faster in cold ethanol', () => {
    expect(coldFactor(-20)).toBeCloseTo(1)
    expect(coldFactor(25)).toBeCloseTo(0.6)
    expect(precipitationTau(-20)).toBeLessThan(precipitationTau(25))
    const cold = extract({ ...DEFAULT_SETTINGS, ethanolTemp: -20 }).yield
    const warm = extract({ ...DEFAULT_SETTINGS, ethanolTemp: 25 }).yield
    expect(cold).toBeGreaterThan(warm)
    const curve = temperatureCurve(DEFAULT_SETTINGS)
    for (let i = 1; i < curve.length; i++) expect(curve[i].yield).toBeLessThanOrEqual(curve[i - 1].yield)
  })

  it('approaches the final amount exponentially', () => {
    const tau = precipitationTau(0)
    expect(precipitatedAt(100, 0, 0)).toBe(0)
    expect(precipitatedAt(100, tau, 0)).toBeCloseTo(100 * (1 - Math.exp(-1)))
    expect(precipitatedAt(100, 10 * tau, 0)).toBeCloseTo(100, 2)
  })
})

describe('purity A260/A280', () => {
  it('is about 1.85 for pure DNA and 0.57 for pure protein', () => {
    expect(purityRatio(100, 0)).toBeCloseTo(1.85)
    expect(purityRatio(0, 100)).toBeCloseTo(0.57)
  })

  it('drops as protein contaminates the sample', () => {
    expect(purityRatio(100, 200)).toBeLessThan(purityRatio(100, 20))
    expect(purityVerdict(1.85, 10)).toBe('pure')
    expect(purityVerdict(1.5, 10)).toBe('protein')
    expect(purityVerdict(0, 0)).toBe('none')
  })

  it('is better with protease than without', () => {
    const withP = extract({ ...DEFAULT_SETTINGS, protease: true })
    const without = extract({ ...DEFAULT_SETTINGS, protease: false })
    expect(withP.ratio).toBeGreaterThan(without.ratio)
    expect(withP.purity).toBe('pure')
    expect(without.purity).toBe('protein')
    // Protease removes protein, it does not change the amount of DNA.
    expect(withP.yield).toBeCloseTo(without.yield)
  })
})

describe('whole extraction', () => {
  it('chains every step into the yield', () => {
    const r = extract(DEFAULT_SETTINGS)
    expect(r.total).toBe(SOURCES.strawberry.dnaPerUnit * 10)
    expect(r.released).toBeCloseTo(r.total * r.lysis)
    expect(r.filtrate).toBeCloseTo(r.released * FILTER_RECOVERY)
    expect(r.precipitate).toBeCloseTo(r.filtrate * r.precipitable)
    expect(r.yield).toBeCloseTo(r.precipitate * SPOOL_EFFICIENCY)
    expect(r.a260).toBeGreaterThan(0)
  })

  it('gives a clearly visible white precipitate from strawberries', () => {
    const r = extract(DEFAULT_SETTINGS)
    expect(r.precipitate).toBeGreaterThan(CLEAR_UG)
    expect(r.visible).toBe('clear')
  })

  it('gives much less DNA from cheek cells, and nothing without detergent', () => {
    const cheek = extract({ ...DEFAULT_SETTINGS, source: 'cheek', amount: 10 })
    expect(cheek.yield).toBeLessThan(extract(DEFAULT_SETTINGS).yield)
    expect(cheek.visible).not.toBe('none')
    const none = extract({ ...DEFAULT_SETTINGS, detergent: 0 })
    expect(none.yield).toBe(0)
    expect(none.visible).toBe('none')
  })

  it('scales with the amount of sample', () => {
    const a = extract({ ...DEFAULT_SETTINGS, amount: 5 }).yield
    const b = extract({ ...DEFAULT_SETTINGS, amount: 20 }).yield
    expect(b / a).toBeCloseTo(4)
  })
})

describe('DnaExtractionSimulation', () => {
  const runStep = (s: DnaExtractionSimulation) => {
    let guard = 0
    while (!s.advance(0.5) && guard++ < 10_000) {
      /* run the timed step to its end */
    }
  }

  it('walks a strawberry through mash → lyse → filter → precipitate → spool', () => {
    const s = new DnaExtractionSimulation()
    expect(s.stage).toBe('sample')
    expect(s.precipitated).toBe(0)
    s.next()
    expect(s.stage).toBe('mashing')
    runStep(s)
    expect(s.stage).toBe('mashed')
    expect(s.lysed).toBe(0)
    s.next()
    runStep(s)
    expect(s.stage).toBe('lysed')
    expect(s.lysed).toBeCloseTo(s.result.lysis)
    s.next()
    runStep(s)
    expect(s.stage).toBe('filtered')
    s.next()
    expect(s.stage).toBe('precipitating')
    s.advance(precipitationTau(s.settings.ethanolTemp))
    expect(s.precipitated).toBeGreaterThan(0)
    expect(s.precipitated).toBeLessThan(s.result.precipitate)
    runStep(s)
    expect(s.stage).toBe('precipitated')
    expect(s.precipitated).toBeCloseTo(s.result.precipitate)
    expect(s.next()).toBe(true)
    expect(s.stage).toBe('spooled')
    expect(s.next()).toBe(false)
  })

  it('skips mashing for cheek cells and resets cleanly', () => {
    const s = new DnaExtractionSimulation({ ...DEFAULT_SETTINGS, source: 'cheek' })
    s.next()
    expect(s.stage).toBe('lysing')
    s.reset({ source: 'banana' })
    expect(s.stage).toBe('sample')
    expect(s.settings.source).toBe('banana')
    expect(s.advance(1)).toBe(false)
  })
})
