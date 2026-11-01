import { describe, expect, it } from 'vitest'
import {
  applyResult,
  compareHypothesis,
  createRecord,
  directionOf,
  editRecord,
  emptyDraft,
  mergeRecords,
  sanitizeRecord,
  validateDraft,
  completeDraft,
  type HypothesisDraft,
  type HypothesisSpec,
} from './hypothesis'

/** y = a·x, z = b (does not depend on x), w = x²/a — a toy experiment with known answers. */
const spec: HypothesisSpec = {
  experimentId: 'toy',
  variables: [
    { id: 'x', labelKey: 'x', unit: '', min: 0, max: 10, digits: 1 },
    { id: 'a', labelKey: 'a', unit: '', min: 1, max: 5, digits: 1 },
  ],
  outcomes: [
    { id: 'y', labelKey: 'y', unit: '', digits: 2 },
    { id: 'z', labelKey: 'z', unit: '', digits: 2 },
    { id: 'w', labelKey: 'w', unit: '', digits: 2 },
  ],
  defaults: { x: 2, a: 2, b: 7 },
  evaluate: (s) => {
    const x = Number(s.x)
    const a = Number(s.a)
    return { y: a * x, z: Number(s.b), w: (x * x) / a }
  },
}

const draft = (over: Partial<HypothesisDraft> = {}): HypothesisDraft => ({
  variable: 'x',
  change: 'increase',
  plan: 'Move x up',
  outcome: 'y',
  expected: 'increase',
  prediction: 'y grows with x',
  affected: ['y', 'w'],
  ...over,
})

describe('validateDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateDraft(spec, draft())).toEqual([])
  })

  it('reports every missing answer in form order', () => {
    expect(validateDraft(spec, emptyDraft())).toEqual(['variable', 'change', 'outcome', 'expected', 'prediction', 'affected'])
    expect(validateDraft(spec, { ...draft(), variable: 'nope', outcome: 'nope' })).toEqual(['variable', 'outcome'])
  })

  it('only completes a valid draft', () => {
    expect(completeDraft(spec, emptyDraft())).toBeNull()
    expect(completeDraft(spec, draft())).toEqual(draft())
  })

  it('rejects unknown outcomes in the affected list and whitespace-only predictions', () => {
    expect(validateDraft(spec, draft({ affected: ['y', 'q'], prediction: '   ' }))).toEqual(['prediction', 'affected'])
  })
})

describe('directionOf', () => {
  it('detects increases, decreases and tiny changes', () => {
    expect(directionOf(1, 2)).toBe('increase')
    expect(directionOf(2, 1)).toBe('decrease')
    expect(directionOf(100, 100.5)).toBe('same')
    expect(directionOf(0, 0)).toBe('same')
    expect(directionOf(0, 0.1)).toBe('increase')
  })

  it('treats null and Infinity as "never"', () => {
    expect(directionOf(null, 5)).toBe('decrease')
    expect(directionOf(5, null)).toBe('increase')
    expect(directionOf(null, Infinity)).toBe('same')
  })
})

describe('compareHypothesis', () => {
  it('uses the run when the student changed the variable as planned', () => {
    const c = compareHypothesis(spec, draft(), { x: 2, a: 2 }, { x: 6, a: 2 })
    expect(c.source).toBe('run')
    expect([c.from, c.to]).toEqual([2, 6])
    expect(c.outcomes).toEqual([
      { id: 'y', from: 4, to: 12, direction: 'increase' },
      { id: 'z', from: 7, to: 7, direction: 'same' },
      { id: 'w', from: 2, to: 18, direction: 'increase' },
    ])
    expect(c.predictionCorrect).toBe(true)
    expect([c.affectedCorrect, c.affectedTotal]).toEqual([3, 3])
    expect(c.verdict).toBe('confirmed')
    expect(c.confounded).toEqual([])
  })

  it('falls back to the model when the variable was not changed, staying inside its range', () => {
    const c = compareHypothesis(spec, draft(), { x: 9, a: 2 }, { x: 9, a: 2 })
    expect(c.source).toBe('model')
    expect(c.to).toBeCloseTo(10)
    expect(c.from).toBeCloseTo(7.5)
    const down = compareHypothesis(spec, draft({ change: 'decrease' }), { x: 1 }, { x: 1 })
    expect(down.source).toBe('model')
    expect([down.from, down.to]).toEqual([2.5, 0])
  })

  it('also uses the model when the student moved the variable the other way', () => {
    expect(compareHypothesis(spec, draft(), { x: 6 }, { x: 3 }).source).toBe('model')
  })

  it('isolates the chosen variable and lists the other variables that changed', () => {
    const c = compareHypothesis(spec, draft(), { x: 2, a: 1 }, { x: 4, a: 4 })
    expect(c.confounded).toEqual(['a'])
    // Both points use a = 4 (the end value), so only x differs.
    expect(c.outcomes[0]).toMatchObject({ from: 8, to: 16 })
  })

  it('grades a wrong main prediction and wrong "will change" picks', () => {
    const partly = compareHypothesis(spec, draft({ expected: 'decrease' }), { x: 2 }, { x: 6 })
    expect(partly.predictionCorrect).toBe(false)
    expect(partly.verdict).toBe('partly')
    const refuted = compareHypothesis(spec, draft({ expected: 'same', affected: ['z'] }), { x: 2 }, { x: 6 })
    expect(refuted.affectedCorrect).toBe(0)
    expect(refuted.verdict).toBe('refuted')
  })

  it('fills missing settings from the defaults', () => {
    const c = compareHypothesis(spec, draft({ variable: 'a', outcome: 'w', expected: 'decrease', affected: ['y', 'w'] }), {}, { a: 4 })
    expect(c.source).toBe('run')
    expect(c.outcomes.find((o) => o.id === 'w')).toMatchObject({ from: 2, to: 1, direction: 'decrease' })
    expect(c.verdict).toBe('confirmed')
  })
})

describe('records', () => {
  const t0 = new Date('2026-01-01T10:00:00.000Z')
  const t1 = new Date('2026-01-01T10:05:00.000Z')
  const t2 = new Date('2026-01-01T10:09:00.000Z')

  it('creates, tests and re-tests a hypothesis, counting each hypothesis once', () => {
    const r0 = createRecord(undefined, 'toy', draft({ prediction: '  y grows  ' }), { x: 2 }, t0)
    expect(r0).toMatchObject({ tested: 0, confirmed: 0, result: null, createdAt: t0.toISOString() })
    expect(r0.draft.prediction).toBe('y grows')

    const c = compareHypothesis(spec, r0.draft, r0.baseline, { x: 6 })
    const r1 = applyResult(r0, c, 'yes', ' learned ', t1)
    expect(r1).toMatchObject({ tested: 1, confirmed: 1, updatedAt: t1.toISOString() })
    expect(r1.result).toMatchObject({ verdict: 'confirmed', selfAssessment: 'yes', reflection: 'learned' })

    const worse = compareHypothesis(spec, draft({ expected: 'decrease' }), { x: 2 }, { x: 6 })
    const r2 = applyResult(r1, worse, 'no', '', t2)
    expect(r2).toMatchObject({ tested: 1, confirmed: 0 })

    const next = createRecord(r2, 'toy', draft(), { x: 6 }, t2)
    expect(next).toMatchObject({ tested: 1, confirmed: 0, result: null })
  })

  it('edits the wording without restarting the run', () => {
    const r0 = createRecord(undefined, 'toy', draft(), { x: 2 }, t0)
    const r1 = editRecord(r0, draft({ plan: 'new plan' }), t1)
    expect(r1).toMatchObject({ createdAt: t0.toISOString(), updatedAt: t1.toISOString(), baseline: { x: 2 } })
    expect(r1.draft.plan).toBe('new plan')
  })

  it('merges two devices by keeping the most recently updated record', () => {
    const a = createRecord(undefined, 'toy', draft(), {}, t0)
    const b = createRecord(undefined, 'toy', draft({ plan: 'newer' }), {}, t1)
    const other = createRecord(undefined, 'other', draft(), {}, t0)
    expect(mergeRecords({ toy: a }, { toy: b, other })).toEqual({ toy: b, other })
    expect(mergeRecords({ toy: b }, { toy: a })).toEqual({ toy: b })
  })
})

describe('sanitizeRecord', () => {
  it('round-trips a real record', () => {
    const r0 = createRecord(undefined, 'toy', draft(), { x: 2 }, new Date('2026-01-01T10:00:00.000Z'))
    const r1 = applyResult(r0, compareHypothesis(spec, r0.draft, r0.baseline, { x: 6 }), 'partly', 'hm')
    const json = JSON.parse(JSON.stringify(r1))
    expect(sanitizeRecord(json, 'toy')).toEqual(r1)
  })

  it('rejects junk and strips oversized or unknown values', () => {
    expect(sanitizeRecord(null, 'toy')).toBeNull()
    expect(sanitizeRecord({ draft: { variable: 'x', change: 'sideways', outcome: 'y', expected: 'increase' } }, 'toy')).toBeNull()
    const r = sanitizeRecord(
      {
        experimentId: 'spoofed',
        draft: { variable: 'x', change: 'increase', outcome: 'y', expected: 'same', prediction: 'p'.repeat(2000), affected: ['y', 'y', '<b>'] },
        baseline: { x: 1, nested: { evil: true } },
        tested: -4,
        confirmed: 9,
        createdAt: 'yesterday',
        result: { verdict: 'confirmed' },
      },
      'toy',
      new Date('2026-02-02T00:00:00.000Z'),
    )!
    expect(r.experimentId).toBe('toy')
    expect(r.draft.prediction).toHaveLength(500)
    expect(r.draft.affected).toEqual(['y'])
    expect(r.baseline).toEqual({ x: 1 })
    expect([r.tested, r.confirmed]).toEqual([0, 0])
    expect(r.createdAt).toBe('2026-02-02T00:00:00.000Z')
    expect(r.result).toBeNull()
  })
})
