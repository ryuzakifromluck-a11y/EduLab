import { create } from 'zustand'
import { applyAttempt, isPassing, mergeResults, type QuizResult } from '../lib/quiz'

/**
 * Knowledge-check results. Saved to localStorage by default; an account
 * backend can take over by calling `setQuizStorage` and/or listening with
 * `onQuizAttempt`, and can pull remote results in with `mergeRemote`.
 */

export interface QuizStorage {
  load(): Record<string, QuizResult>
  save(results: Record<string, QuizResult>): void
}

const RESULTS_KEY = 'edulab-quiz-results'
const SESSION_KEY = 'edulab-quiz-passed-session'

export const localQuizStorage: QuizStorage = {
  load() {
    try {
      const raw = localStorage.getItem(RESULTS_KEY)
      const parsed = raw ? JSON.parse(raw) : {}
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  },
  save(results) {
    try {
      localStorage.setItem(RESULTS_KEY, JSON.stringify(results))
    } catch {
      /* storage unavailable */
    }
  },
}

function loadSessionPassed(): string[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveSessionPassed(ids: string[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

let storage: QuizStorage = localQuizStorage

type AttemptListener = (result: QuizResult, attempt: { score: number; total: number }) => void
const listeners = new Set<AttemptListener>()

interface QuizState {
  results: Record<string, QuizResult>
  /** Experiments passed during this browser session (used to avoid re-prompting). */
  passedThisSession: string[]
  recordAttempt: (experimentId: string, score: number, total: number) => QuizResult
  mergeRemote: (remote: Record<string, QuizResult>) => void
}

export const useQuiz = create<QuizState>((set, get) => ({
  results: storage.load(),
  passedThisSession: loadSessionPassed(),
  recordAttempt: (experimentId, score, total) => {
    const result = applyAttempt(get().results[experimentId], experimentId, score, total)
    const results = { ...get().results, [experimentId]: result }
    storage.save(results)
    let passedThisSession = get().passedThisSession
    // Only a passing attempt made now counts for the session, not one from an earlier visit.
    if (isPassing(score, total) && !passedThisSession.includes(experimentId)) {
      passedThisSession = [...passedThisSession, experimentId]
      saveSessionPassed(passedThisSession)
    }
    set({ results, passedThisSession })
    listeners.forEach((fn) => fn(result, { score, total }))
    return result
  },
  mergeRemote: (remote) => {
    const results = mergeResults(get().results, remote)
    storage.save(results)
    set({ results })
  },
}))

/** Swap the persistence backend (e.g. a signed-in user's progress record). Reloads results from it. */
export function setQuizStorage(next: QuizStorage) {
  storage = next
  useQuiz.setState({ results: next.load() })
}

/** Called after every finished attempt with the updated result. Returns an unsubscribe function. */
export function onQuizAttempt(fn: AttemptListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
