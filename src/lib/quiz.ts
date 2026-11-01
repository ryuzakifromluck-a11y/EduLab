/**
 * Pure knowledge-check logic: answering, scoring and folding an attempt into
 * a stored result. No React or storage here so it can be unit-tested and
 * reused by any persistence backend.
 */

/** Share of correct answers needed to pass. */
export const PASS_RATIO = 0.7

export const passMark = (total: number) => Math.ceil(total * PASS_RATIO)
export const isPassing = (score: number, total: number) => total > 0 && score >= passMark(total)

export interface QuizRunState {
  index: number
  /** Chosen option per question; `null` while unanswered. */
  answers: (number | null)[]
  finished: boolean
}

export type QuizAction = { type: 'answer'; choice: number } | { type: 'next' } | { type: 'restart' }

export const initialRun = (total: number): QuizRunState => ({ index: 0, answers: Array(total).fill(null), finished: false })

export function quizReducer(state: QuizRunState, action: QuizAction): QuizRunState {
  switch (action.type) {
    case 'answer': {
      if (state.finished || state.answers[state.index] !== null) return state
      const answers = state.answers.slice()
      answers[state.index] = action.choice
      return { ...state, answers }
    }
    case 'next': {
      if (state.finished || state.answers[state.index] === null) return state
      const last = state.index >= state.answers.length - 1
      return last ? { ...state, finished: true } : { ...state, index: state.index + 1 }
    }
    case 'restart':
      return initialRun(state.answers.length)
  }
}

export function scoreAnswers(answers: (number | null)[], correct: number[]): number {
  return answers.reduce<number>((n, a, i) => (a !== null && a === correct[i] ? n + 1 : n), 0)
}

/** What is kept per experiment. Mirrors the progress fields an account backend stores. */
export interface QuizResult {
  experimentId: string
  attempts: number
  bestScore: number
  lastScore: number
  total: number
  passed: boolean
  /** ISO timestamps. */
  firstPassedAt: string | null
  lastAttemptAt: string
}

export function applyAttempt(
  prev: QuizResult | undefined,
  experimentId: string,
  score: number,
  total: number,
  now: Date = new Date(),
): QuizResult {
  const passedNow = isPassing(score, total)
  const at = now.toISOString()
  return {
    experimentId,
    attempts: (prev?.attempts ?? 0) + 1,
    bestScore: Math.max(prev?.bestScore ?? 0, score),
    lastScore: score,
    total,
    passed: (prev?.passed ?? false) || passedNow,
    firstPassedAt: prev?.firstPassedAt ?? (passedNow ? at : null),
    lastAttemptAt: at,
  }
}

/** Combines two result sets (e.g. local and remote), keeping the stronger record per experiment. */
export function mergeResults(a: Record<string, QuizResult>, b: Record<string, QuizResult>): Record<string, QuizResult> {
  const out: Record<string, QuizResult> = { ...a }
  for (const [id, r] of Object.entries(b)) {
    const l = out[id]
    if (!l) {
      out[id] = r
      continue
    }
    const latest = l.lastAttemptAt >= r.lastAttemptAt ? l : r
    const passedAts = [l.firstPassedAt, r.firstPassedAt].filter((x): x is string => !!x).sort()
    out[id] = {
      experimentId: id,
      attempts: Math.max(l.attempts, r.attempts),
      bestScore: Math.max(l.bestScore, r.bestScore),
      lastScore: latest.lastScore,
      total: latest.total,
      passed: l.passed || r.passed,
      firstPassedAt: passedAts[0] ?? null,
      lastAttemptAt: latest.lastAttemptAt,
    }
  }
  return out
}
