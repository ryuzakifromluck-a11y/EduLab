import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  DETECTION_NG,
  EXTENSION_TEMP,
  MAX_COPIES,
  PcrSimulation,
  TARGETS,
  amplify,
  ampliconSize,
  annealingEfficiency,
  copiesToNg,
  cycleEfficiency,
  cycleProfile,
  denaturationEfficiency,
  extensionEfficiency,
  findTarget,
  gcContent,
  idealCopies,
  nonspecificFraction,
  outcome,
  pairTm,
  polymeraseActivity,
  primerTm,
  profileCurve,
  recommendedAnneal,
  temperatureAt,
} from './pcr'

describe('primer melting temperature', () => {
  it('uses the Wallace rule for short primers', () => {
    // 4 A/T and 4 G/C: 2·4 + 4·4 = 24 °C
    expect(primerTm('ATATGCGC')).toBe(24)
  })

  it('uses the GC formula for primers of 14 nt and more', () => {
    const seq = 'CAAGGGCGAGGAGCTGTTCACC' // 22 nt, 14 G/C
    expect(primerTm(seq)).toBeCloseTo(64.9 + (41 * (14 - 16.4)) / 22)
    expect(gcContent(seq)).toBeCloseTo(14 / 22)
  })

  it('rises with GC content', () => {
    expect(primerTm('GCGCGCGCGCGCGCGCGCGC')).toBeGreaterThan(primerTm('ATATATATATATATATATAT'))
  })

  it('gives the teaching targets a Tm in the usual 55–65 °C window and an anneal 5 °C below', () => {
    for (const t of TARGETS) {
      expect(pairTm(t)).toBeGreaterThan(55)
      expect(pairTm(t)).toBeLessThan(65)
      expect(recommendedAnneal(t)).toBe(Math.round(pairTm(t) - 5))
    }
  })
})

describe('amplicon', () => {
  it('runs from the start of the forward primer to the end of the reverse primer', () => {
    expect(ampliconSize({ start: 101, end: 820 })).toBe(720)
    expect(ampliconSize(findTarget('actin'))).toBe(250)
    expect(ampliconSize(findTarget('rrna16s'))).toBe(1465)
  })
})

describe('the three steps of a cycle', () => {
  it('denatures the template only when hot enough (94–98 °C)', () => {
    expect(denaturationEfficiency(95)).toBeGreaterThan(0.95)
    expect(denaturationEfficiency(98)).toBeGreaterThan(0.99)
    expect(denaturationEfficiency(85)).toBeLessThan(0.01)
  })

  it('anneals the primers below their Tm, and misprimes when far too cold', () => {
    const tm = 60
    expect(annealingEfficiency(55, tm)).toBeGreaterThan(0.95)
    expect(annealingEfficiency(65, tm)).toBeLessThan(0.01)
    expect(nonspecificFraction(55, tm)).toBeLessThan(0.02)
    expect(nonspecificFraction(42, tm)).toBeGreaterThan(0.8)
  })

  it('needs enough extension time for the product (~1 kb per minute)', () => {
    expect(extensionEfficiency(60, 720)).toBe(1)
    expect(extensionEfficiency(30, 1000)).toBeCloseTo(0.5)
    expect(extensionEfficiency(0, 500)).toBe(0)
  })

  it('keeps heat-stable Taq active, but the E. coli enzyme is destroyed at 95 °C', () => {
    expect(polymeraseActivity('taq', 95, 30)).toBeGreaterThan(0.75)
    expect(polymeraseActivity('ecoli', 95, 1)).toBeLessThan(0.01)
    expect(polymeraseActivity('taq', 98, 30)).toBeLessThan(polymeraseActivity('taq', 95, 30))
  })
})

describe('amplification', () => {
  it('doubles the copies each cycle when every step is perfect (2ⁿ)', () => {
    expect(idealCopies(1, 10)).toBe(1024)
    expect(idealCopies(100, 3)).toBe(800)
    const run = amplify({ ...DEFAULT_SETTINGS, cycles: 10 })
    for (let k = 1; k < run.length; k++) {
      const ratio = run[k].copies / run[k - 1].copies
      expect(ratio).toBeGreaterThan(1.8)
      expect(ratio).toBeLessThanOrEqual(2)
      expect(run[k].ideal).toBe(run[k - 1].ideal * 2)
    }
  })

  it('levels off at a plateau as primers and dNTPs run out', () => {
    const run = amplify({ ...DEFAULT_SETTINGS, cycles: 40, templateCopies: 1e6 })
    const last = run[run.length - 1]
    expect(last.copies).toBeLessThanOrEqual(MAX_COPIES)
    expect(last.copies).toBeGreaterThan(0.9 * MAX_COPIES)
    expect(last.copies).toBeLessThan(last.ideal)
  })

  it('gives a visible band under good conditions and none without a heat-stable enzyme', () => {
    const good = outcome(DEFAULT_SETTINGS)
    expect(good.ng).toBeGreaterThan(DETECTION_NG)
    expect(good.visible).toBe(true)
    expect(good.amplicon).toBe(720)
    const ecoli = outcome({ ...DEFAULT_SETTINGS, polymerase: 'ecoli' })
    expect(ecoli.fold).toBeLessThan(2)
    expect(ecoli.visible).toBe(false)
  })

  it('fails when the annealing temperature is above the primers’ Tm', () => {
    const hot = outcome({ ...DEFAULT_SETTINGS, annealTemp: 68 })
    expect(hot.visible).toBe(false)
    expect(cycleEfficiency({ ...DEFAULT_SETTINGS, annealTemp: 68 }, 1)).toBeLessThan(0.01)
  })

  it('converts copies to mass', () => {
    // 1e9 copies of 1000 bp: 1e9 · 1000 · 650 / 6.022e23 g ≈ 1.08 ng
    expect(copiesToNg(1e9, 1000)).toBeCloseTo(1.079, 2)
  })
})

describe('thermal profile', () => {
  it('holds each step at its temperature with ramps between', () => {
    const s = DEFAULT_SETTINGS
    const { segments, duration } = cycleProfile(s)
    expect(segments).toHaveLength(6)
    expect(duration).toBeGreaterThan(30 + 30 + s.extensionTime)
    const hold = (phase: string) => segments.find((g) => g.phase === phase && g.from === g.to)!
    expect(hold('denature').from).toBe(s.denatureTemp)
    expect(hold('anneal').from).toBe(s.annealTemp)
    expect(hold('extend').from).toBe(EXTENSION_TEMP)
    const mid = (g: { start: number; end: number }) => (g.start + g.end) / 2
    expect(temperatureAt(s, mid(hold('anneal')))).toMatchObject({ temp: s.annealTemp, phase: 'anneal' })
    expect(temperatureAt(s, hold('extend').end - 0.01).stepProgress).toBeCloseTo(1, 3)
    expect(profileCurve(s, 2).at(-1)!.t).toBeCloseTo(2 * duration)
  })
})

describe('PcrSimulation', () => {
  it('counts cycles and updates the copies as it runs', () => {
    const sim = new PcrSimulation({ ...DEFAULT_SETTINGS, cycles: 5 })
    expect(sim.state.phase).toBe('idle')
    sim.advance(1)
    expect(sim.state.phase).toBe('denature')
    sim.advance(sim.cycleDuration)
    expect(sim.cycle).toBe(1)
    expect(sim.copies).toBeGreaterThan(DEFAULT_SETTINGS.templateCopies)
    let finished = false
    for (let i = 0; i < 100 && !finished; i++) finished = sim.advance(sim.cycleDuration / 3)
    expect(finished).toBe(true)
    expect(sim.cycle).toBe(5)
    expect(sim.history).toHaveLength(6)
    expect(sim.state.phase).toBe('hold')
    sim.reset({ cycles: 10 })
    expect(sim.cycle).toBe(0)
    expect(sim.copies).toBe(DEFAULT_SETTINGS.templateCopies)
  })
})
