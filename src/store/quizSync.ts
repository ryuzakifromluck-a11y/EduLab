import { EXPERIMENTS, type Subject } from '../data/experiments'
import { isPassing, type QuizResult } from '../lib/quiz'
import type { CompletionInput, ProgressRecord } from '../lib/progressModel'
import type { TutorQuizResult } from '../../server/tutor/types'

/**
 * Connects knowledge-check results to the rest of the app:
 * - the AI tutor sees the latest score for the experiment as context;
 * - a passed quiz saves the experiment as completed in the signed-in user's
 *   account, with the score as a percentage (the account keeps the best one);
 * - quizzes passed as a guest are saved to the account after signing in;
 * - the first pass per experiment and page load counts as a completed session
 *   in the anonymous analytics.
 *
 * Kept free of store imports so it can be unit-tested; `quizWiring.ts` passes
 * the real stores in.
 */

export interface QuizSyncDeps {
  results: () => Record<string, QuizResult>
  onAttempt: (fn: (result: QuizResult, attempt: { score: number; total: number }) => void) => () => void
  reportToTutor: (experimentId: string, result: TutorQuizResult) => void
  isSignedIn: () => boolean
  accountRecord: (experimentId: string) => ProgressRecord | undefined
  saveToAccount: (experimentId: string, input: CompletionInput) => Promise<unknown>
  trackCompleted?: (subject: Subject, experimentId: string) => void
}

export const scorePercent = (score: number, total: number) => (total > 0 ? Math.round((100 * score) / total) : 0)

export function connectQuizResults(deps: QuizSyncDeps) {
  // Give the tutor what is already known from earlier visits.
  for (const r of Object.values(deps.results())) {
    deps.reportToTutor(r.experimentId, { score: r.lastScore, total: r.total, passed: isPassing(r.lastScore, r.total) })
  }

  const counted = new Set<string>()
  const unsubscribe = deps.onAttempt((result, { score, total }) => {
    const passed = isPassing(score, total)
    deps.reportToTutor(result.experimentId, { score, total, passed })
    if (!passed) return
    if (deps.isSignedIn()) void deps.saveToAccount(result.experimentId, { score: scorePercent(score, total) }).catch(() => {})
    if (!counted.has(result.experimentId)) {
      counted.add(result.experimentId)
      const subject = EXPERIMENTS.find((e) => e.id === result.experimentId)?.subject
      if (subject) deps.trackCompleted?.(subject, result.experimentId)
    }
  })

  /** Call once the signed-in user's progress has loaded: saves local passes the account does not have yet. */
  const syncLocalPasses = () => {
    if (!deps.isSignedIn()) return
    for (const r of Object.values(deps.results())) {
      if (!r.passed) continue
      const best = scorePercent(r.bestScore, r.total)
      const record = deps.accountRecord(r.experimentId)
      if (record && (record.bestScore ?? -1) >= best) continue
      void deps.saveToAccount(r.experimentId, { score: best }).catch(() => {})
    }
  }

  return { unsubscribe, syncLocalPasses }
}
