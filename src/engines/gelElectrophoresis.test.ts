import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  GEL_LENGTH,
  GelSimulation,
  LADDER,
  SAMPLES,
  bandState,
  bandWidth,
  bands,
  estimateSize,
  fieldStrength,
  fitStandardCurve,
  isExtrapolated,
  ladderCurve,
  migrationDistance,
  mobility,
  resolution,
} from './gelElectrophoresis'

const RUN = 40 * 60 // a 40-minute run, s

describe('migration', () => {
  it('moves DNA toward the anode, and out of the wells backwards when the leads are swapped', () => {
    expect(migrationDistance(500, DEFAULT_SETTINGS, RUN)).toBeGreaterThan(0)
    expect(migrationDistance(500, { ...DEFAULT_SETTINGS, polarity: 'reversed' }, RUN)).toBeLessThan(0)
    expect(bandState(-0.5)).toBe('lost')
  })

  it('carries smaller fragments further', () => {
    const d = LADDER.map((bp) => migrationDistance(bp, DEFAULT_SETTINGS, RUN))
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeLessThan(d[i - 1])
  })

  it('is proportional to field strength and time', () => {
    expect(fieldStrength(120, 12)).toBe(10)
    const a = migrationDistance(1000, DEFAULT_SETTINGS, RUN)
    expect(migrationDistance(1000, { ...DEFAULT_SETTINGS, voltage: 200 }, RUN)).toBeCloseTo(2 * a)
    expect(migrationDistance(1000, DEFAULT_SETTINGS, 2 * RUN)).toBeCloseTo(2 * a)
  })

  it('is slower in a denser gel, which spreads small fragments apart', () => {
    expect(mobility(1000, 2)).toBeLessThan(mobility(1000, 1))
    const spread = (c: number) => mobility(100, c) / mobility(500, c)
    expect(spread(2)).toBeGreaterThan(spread(1))
  })

  it('runs the smallest fragments off the end of a long run', () => {
    const long = bands('ladder', DEFAULT_SETTINGS, 120 * 60)
    expect(long[0].state).toBe('ranOff')
    expect(long.at(-1)!.state).toBe('onGel')
  })

  it('widens bands with time and at high voltage', () => {
    expect(bandWidth(RUN, 100)).toBeGreaterThan(bandWidth(60, 100))
    expect(bandWidth(RUN, 150)).toBeGreaterThan(bandWidth(RUN, 100))
  })
})

describe('sizing from the ladder', () => {
  it('fits an exact power law exactly', () => {
    const pts = [100, 1000, 10000].map((bp) => ({ bp, distance: 50 * Math.pow(bp, -0.5) }))
    const c = fitStandardCurve(pts)!
    expect(c.slope).toBeCloseTo(-0.5)
    expect(c.intercept).toBeCloseTo(Math.log10(50))
    expect(c.r2).toBeCloseTo(1)
    expect(estimateSize(50 * Math.pow(400, -0.5), c)).toBeCloseTo(400)
  })

  it('needs two usable bands', () => {
    expect(fitStandardCurve([{ bp: 100, distance: 3 }])).toBeNull()
    expect(fitStandardCurve([{ bp: 100, distance: 0 }, { bp: 200, distance: -1 }])).toBeNull()
  })

  it('gives a nearly straight log–log line for the ladder', () => {
    const c = ladderCurve(DEFAULT_SETTINGS, RUN)!
    expect(c.slope).toBeLessThan(0)
    expect(c.r2).toBeGreaterThan(0.98)
  })

  it('estimates every sample band within 15 % of its true size', () => {
    const c = ladderCurve(DEFAULT_SETTINGS, RUN)!
    for (const id of ['pcr', 'plasmid', 'unknownA', 'unknownB'] as const) {
      for (const b of bands(id, DEFAULT_SETTINGS, RUN)) {
        const est = estimateSize(b.distance, c)
        expect(Math.abs(est - b.bp) / b.bp, `${id} ${b.bp}`).toBeLessThan(0.15)
        expect(isExtrapolated(est, c)).toBe(false)
      }
    }
    expect(estimateSize(0, c)).toBeNaN()
  })

  it('separates close fragments better after a longer run', () => {
    expect(resolution(500, 700, DEFAULT_SETTINGS, RUN)).toBeGreaterThan(resolution(500, 700, DEFAULT_SETTINGS, 10 * 60))
  })
})

describe('GelSimulation', () => {
  it('integrates positions so settings can change mid-run', () => {
    const sim = new GelSimulation()
    for (let i = 0; i < 40; i++) sim.advance(60)
    expect(sim.time).toBe(RUN)
    expect(sim.position(720)).toBeCloseTo(migrationDistance(720, DEFAULT_SETTINGS, RUN))
    expect(sim.bands('pcr')[0].state).toBe('onGel')
    expect(sim.dye).toBeGreaterThan(0)
    expect(sim.dye).toBeLessThan(GEL_LENGTH)
    const before = sim.position(720)
    sim.update({ voltage: 0 })
    sim.advance(600)
    expect(sim.position(720)).toBeCloseTo(before)
    expect(sim.curve).not.toBeNull()
    sim.reset()
    expect(sim.position(720)).toBe(0)
    expect(sim.curve).toBeNull()
  })

  it('loses the DNA into the buffer with reversed leads', () => {
    const sim = new GelSimulation({ ...DEFAULT_SETTINGS, polarity: 'reversed' })
    sim.advance(600)
    expect(sim.bands('ladder').every((b) => b.state === 'lost')).toBe(true)
  })

  it('has samples with known sizes', () => {
    expect(SAMPLES.pcr).toEqual([720])
    expect(SAMPLES.ladder).toBe(LADDER)
  })
})
