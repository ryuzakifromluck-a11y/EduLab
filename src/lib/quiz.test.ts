import { describe, expect, it } from 'vitest'
import { applyAttempt, initialRun, isPassing, mergeResults, passMark, quizReducer, scoreAnswers, type QuizResult } from './quiz'

describe('quiz scoring', () => {
  it('needs 70 % to pass, rounded up', () => {
    expect(passMark(5)).toBe(4)
    expect(passMark(10)).toBe(7)
    expect(isPassing(4, 5)).toBe(true)
    expect(isPassing(3, 5)).toBe(false)
    expect(isPassing(0, 0)).toBe(false)
  })

  it('counts only answers that match the correct index', () => {
    expect(scoreAnswers([1, 2, null, 0], [1, 0, 2, 0])).toBe(2)
  })
})

describe('quizReducer', () => {
  it('locks the first answer and only advances once answered', () => {
    let s = initialRun(2)
    s = quizReducer(s, { type: 'next' })
    expect(s.index).toBe(0)
    s = quizReducer(s, { type: 'answer', choice: 3 })
    s = quizReducer(s, { type: 'answer', choice: 1 })
    expect(s.answers[0]).toBe(3)
    s = quizReducer(s, { type: 'next' })
    expect(s.index).toBe(1)
  })

  it('finishes after the last question and restarts clean', () => {
    let s = initialRun(1)
    s = quizReducer(s, { type: 'answer', choice: 0 })
    s = quizReducer(s, { type: 'next' })
    expect(s.finished).toBe(true)
    expect(quizReducer(s, { type: 'answer', choice: 2 })).toBe(s)
    expect(quizReducer(s, { type: 'restart' })).toEqual(initialRun(1))
  })
})

describe('applyAttempt', () => {
  const t1 = new Date('2026-01-01T10:00:00Z')
  const t2 = new Date('2026-01-02T10:00:00Z')

  it('creates a record on the first attempt', () => {
    expect(applyAttempt(undefined, 'pendulum', 3, 5, t1)).toEqual({
      experimentId: 'pendulum',
      attempts: 1,
      bestScore: 3,
      lastScore: 3,
      total: 5,
      passed: false,
      firstPassedAt: null,
      lastAttemptAt: t1.toISOString(),
    })
  })

  it('keeps the best score and first pass time across attempts', () => {
    const a = applyAttempt(undefined, 'pendulum', 5, 5, t1)
    const b = applyAttempt(a, 'pendulum', 2, 5, t2)
    expect(b.attempts).toBe(2)
    expect(b.bestScore).toBe(5)
    expect(b.lastScore).toBe(2)
    expect(b.passed).toBe(true)
    expect(b.firstPassedAt).toBe(t1.toISOString())
    expect(b.lastAttemptAt).toBe(t2.toISOString())
  })
})

describe('mergeResults', () => {
  const r = (over: Partial<QuizResult>): QuizResult => ({
    experimentId: 'titration',
    attempts: 1,
    bestScore: 2,
    lastScore: 2,
    total: 5,
    passed: false,
    firstPassedAt: null,
    lastAttemptAt: '2026-01-01T00:00:00.000Z',
    ...over,
  })

  it('keeps the stronger record from each side', () => {
    const local = { titration: r({ attempts: 3, bestScore: 3 }) }
    const remote = {
      titration: r({ attempts: 2, bestScore: 5, lastScore: 5, passed: true, firstPassedAt: '2026-01-05T00:00:00.000Z', lastAttemptAt: '2026-01-05T00:00:00.000Z' }),
      pendulum: r({ experimentId: 'pendulum' }),
    }
    const m = mergeResults(local, remote)
    expect(m.titration).toMatchObject({ attempts: 3, bestScore: 5, lastScore: 5, passed: true, firstPassedAt: '2026-01-05T00:00:00.000Z' })
    expect(m.pendulum).toBeDefined()
  })
})
