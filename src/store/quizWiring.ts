import { analytics } from '../services/analytics'
import { useAuth } from './auth'
import { useProgress } from './progress'
import { onQuizAttempt, useQuiz } from './quiz'
import { connectQuizResults } from './quizSync'
import { useTutor } from './tutor'

/** Side-effect module (imported from main.tsx): quiz results → AI tutor, account progress and analytics. */
const sync = connectQuizResults({
  results: () => useQuiz.getState().results,
  onAttempt: onQuizAttempt,
  reportToTutor: (id, r) => useTutor.getState().reportQuizResult(id, r),
  isSignedIn: () => useAuth.getState().isAuthenticated,
  accountRecord: (id) => useProgress.getState().records[id],
  saveToAccount: (id, input) => useProgress.getState().complete(id, input),
  trackCompleted: (subject, id) => analytics.trackExperimentCompleted?.(subject, id),
})

useProgress.subscribe((s, prev) => {
  if (s.status === 'ready' && prev.status !== 'ready') sync.syncLocalPasses()
})
