import { describe, expect, it } from 'vitest'
import {
  COMPOUNDS,
  COMPOUND_IDS,
  MATCH_THRESHOLD,
  MIXTURES,
  OPTIMUM_FLOW,
  basePeak,
  chromatogram,
  detectPeaks,
  elutions,
  holdUpTime,
  matchLibrary,
  molecularIon,
  plateNumber,
  resolution,
  retentionTime,
  runTime,
  spectrumAt,
} from './gcMsAnalysis'

const nonpolar = { column: 'nonpolar' as const, tempC: 60, flow: 1 }
const polar = { column: 'polar' as const, tempC: 80, flow: 1 }

describe('gas chromatography', () => {
  it('t_R = t_M(1 + k): every compound elutes after the unretained gas', () => {
    expect(holdUpTime(1)).toBeCloseTo(1.5, 12)
    expect(holdUpTime(2)).toBeCloseTo(0.75, 12)
    for (const id of COMPOUND_IDS) expect(retentionTime(COMPOUNDS[id], nonpolar)).toBeGreaterThan(holdUpTime(1))
  })

  it('on a non-polar column compounds elute roughly in order of boiling point', () => {
    const order = elutions(MIXTURES.A, nonpolar).map((e) => e.id)
    expect(order).toEqual(['acetone', 'ethanol', 'toluene'])
  })

  it('a polar column holds polar compounds longer and changes the order', () => {
    const np = elutions(MIXTURES.C, nonpolar).map((e) => e.id)
    const p = elutions(MIXTURES.C, polar).map((e) => e.id)
    expect(np.indexOf('ethanol')).toBeLessThan(np.indexOf('hexane'))
    expect(p.indexOf('ethanol')).toBeGreaterThan(p.indexOf('hexane'))
    expect(p[p.length - 1]).toBe('butanol')
  })

  it('a hotter column or a faster carrier gas shortens retention times', () => {
    const c = COMPOUNDS.toluene
    expect(retentionTime(c, { ...nonpolar, tempC: 100 })).toBeLessThan(retentionTime(c, nonpolar))
    expect(retentionTime(c, { ...nonpolar, flow: 2 })).toBeCloseTo(retentionTime(c, nonpolar) / 2, 9)
  })

  it('has the most plates at the van Deemter optimum flow', () => {
    expect(OPTIMUM_FLOW).toBeCloseTo(1.195, 3)
    expect(plateNumber(OPTIMUM_FLOW)).toBeCloseTo(20_000, 6)
    expect(plateNumber(0.5)).toBeLessThan(plateNumber(OPTIMUM_FLOW))
    expect(plateNumber(3)).toBeLessThan(plateNumber(OPTIMUM_FLOW))
  })

  it('computes resolution; toluene and 1-butanol co-elute on the non-polar column only', () => {
    const np = elutions({ toluene: 1, butanol: 1 }, nonpolar)
    const p = elutions({ toluene: 1, butanol: 1 }, polar)
    expect(resolution(np[0], np[1])).toBeLessThan(1.5)
    expect(resolution(p[0], p[1])).toBeGreaterThan(1.5)
  })

  it('finds one chromatogram peak per resolved compound', () => {
    const els = elutions(MIXTURES.C, polar)
    const peaks = detectPeaks(els, runTime(els))
    expect(peaks).toHaveLength(6)
    peaks.forEach((p, i) => expect(p.t).toBeCloseTo(els[i].tR, 1))
    const trace = chromatogram(els, runTime(els), 300)
    expect(trace).toHaveLength(301)
    expect(trace[0].signal).toBeLessThan(1e-6)
  })
})

describe('mass spectrometry and library search', () => {
  it('reports the base peak and molecular ion', () => {
    const els = elutions({ toluene: 1 }, polar)
    const spec = spectrumAt(els, els[0].tR)
    expect(basePeak(spec)!.mz).toBe(91) // tropylium C₇H₇⁺
    expect(basePeak(spec)!.I).toBeCloseTo(100, 9)
    expect(molecularIon(spec)!.mz).toBe(92) // M⁺• = molar mass
    expect(COMPOUNDS.acetone.ions[43]).toBe('CH₃CO⁺')
  })

  it('identifies each pure compound from its spectrum', () => {
    for (const id of COMPOUND_IDS) {
      const els = elutions({ [id]: 1 }, polar)
      const hits = matchLibrary(spectrumAt(els, els[0].tR))
      expect(hits[0].id).toBe(id)
      expect(hits[0].score).toBeCloseTo(1, 9)
      expect(hits[1].score).toBeLessThan(MATCH_THRESHOLD)
    }
  })

  it('co-eluting peaks give a mixed spectrum and a poor library match', () => {
    const els = elutions({ toluene: 0.5, butanol: 0.6 }, { ...nonpolar, tempC: 80 })
    const peaks = detectPeaks(els, runTime(els))
    expect(peaks).toHaveLength(1)
    expect(matchLibrary(spectrumAt(els, peaks[0].t))[0].score).toBeLessThan(MATCH_THRESHOLD)
  })

  it('returns an empty spectrum when nothing is eluting', () => {
    expect(spectrumAt([], 1)).toEqual([])
    expect(basePeak([])).toBeNull()
    expect(molecularIon([])).toBeNull()
  })
})
