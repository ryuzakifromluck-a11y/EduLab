import { describe, expect, it, vi } from 'vitest'
import type { QuizResult } from '../lib/quiz'
import type { ProgressRecord } from '../lib/progressModel'
import { connectQuizResults, scorePercent, type QuizSyncDeps } from './quizSync'

const result = (over: Partial<QuizResult> = {}): QuizResult => ({
  experimentId: 'pendulum',
  attempts: 1,
  bestScore: 4,
  lastScore: 4,
  total: 5,
  passed: true,
  firstPassedAt: '2026-10-31T00:00:00.000Z',
  lastAttemptAt: '2026-10-31T00:00:00.000Z',
  ...over,
})

function setup(over: Partial<QuizSyncDeps> = {}) {
  let listener: Parameters<QuizSyncDeps['onAttempt']>[0] = () => {}
  const deps = {
    results: () => ({}),
    onAttempt: (fn: typeof listener) => ((listener = fn), () => {}),
    reportToTutor: vi.fn(),
    isSignedIn: () => true,
    accountRecord: () => undefined,
    saveToAccount: vi.fn(async () => ({})),
    trackCompleted: vi.fn(),
    ...over,
  } satisfies QuizSyncDeps
  const sync = connectQuizResults(deps)
  return { deps, sync, attempt: (score: number, total: number, id = 'pendulum') => listener(result({ experimentId: id, lastScore: score, total }), { score, total }) }
}

describe('quiz result wiring', () => {
  it('rounds the score to a percentage', () => {
    expect(scorePercent(4, 5)).toBe(80)
    expect(scorePercent(2, 3)).toBe(67)
    expect(scorePercent(0, 0)).toBe(0)
  })

  it('seeds the tutor with stored results', () => {
    const { deps } = setup({ results: () => ({ pendulum: result({ lastScore: 2 }) }) })
    expect(deps.reportToTutor).toHaveBeenCalledWith('pendulum', { score: 2, total: 5, passed: false })
  })

  it('reports every attempt to the tutor but saves only passes to the account', () => {
    const { deps, attempt } = setup()
    attempt(2, 5)
    expect(deps.reportToTutor).toHaveBeenLastCalledWith('pendulum', { score: 2, total: 5, passed: false })
    expect(deps.saveToAccount).not.toHaveBeenCalled()
    attempt(4, 5)
    expect(deps.saveToAccount).toHaveBeenCalledWith('pendulum', { score: 80 })
  })

  it('does not save for guests, and counts a completed session once per experiment', () => {
    const { deps, attempt } = setup({ isSignedIn: () => false })
    attempt(5, 5)
    attempt(5, 5)
    expect(deps.saveToAccount).not.toHaveBeenCalled()
    expect(deps.trackCompleted).toHaveBeenCalledTimes(1)
    expect(deps.trackCompleted).toHaveBeenCalledWith('physics', 'pendulum')
  })

  it('uploads guest passes the account is missing or has a lower score for', () => {
    const records: Record<string, ProgressRecord> = {
      'ohms-law': { experimentId: 'ohms-law', completedAt: '', lastCompletedAt: '', attempts: 1, bestScore: 100, settings: {} },
    }
    const { deps, sync } = setup({
      results: () => ({
        pendulum: result(),
        'ohms-law': result({ experimentId: 'ohms-law', bestScore: 4 }),
        titration: result({ experimentId: 'titration', bestScore: 1, passed: false }),
      }),
      accountRecord: (id) => records[id],
    })
    sync.syncLocalPasses()
    expect(deps.saveToAccount).toHaveBeenCalledTimes(1)
    expect(deps.saveToAccount).toHaveBeenCalledWith('pendulum', { score: 80 })
  })
})
