import { CheckCircle2, GraduationCap } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'
import { getQuiz } from '../../data/quizzes'
import { passMark } from '../../lib/quiz'
import { useQuiz } from '../../store/quiz'
import { Button } from '../ui/primitives'
import { QuizPanel } from './QuizPanel'

/** End-of-experiment card that opens the quiz. Renders nothing for experiments without questions. */
export function KnowledgeCheck({ experimentId }: { experimentId: string }) {
  const { t, i18n } = useTranslation()
  const questions = useMemo(() => getQuiz(experimentId, i18n.language), [experimentId, i18n.language])
  const result = useQuiz((s) => s.results[experimentId])
  const passedNow = useQuiz((s) => s.passedThisSession.includes(experimentId))
  const recordAttempt = useQuiz((s) => s.recordAttempt)
  const [open, setOpen] = useState(false)

  const onFinish = useCallback((score: number, total: number) => recordAttempt(experimentId, score, total), [experimentId, recordAttempt])

  if (!questions) return null
  const total = questions.length
  const title = t(`catalog.${experimentId}.title`)

  return (
    <section
      aria-labelledby={`quiz-${experimentId}`}
      className={clsx(
        'mt-5 flex flex-col gap-4 rounded-2xl border px-5 py-5 sm:flex-row sm:items-center sm:px-6',
        passedNow ? 'border-line bg-surface' : 'border-brand/30 bg-brand-soft/60',
      )}
    >
      <span
        className={clsx(
          'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          passedNow ? 'bg-chemistry-soft text-chemistry-ink' : 'bg-surface text-brand',
        )}
      >
        {passedNow ? <CheckCircle2 className="h-6 w-6" aria-hidden /> : <GraduationCap className="h-6 w-6" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`quiz-${experimentId}`} className="text-base font-semibold text-ink">
            {t('quiz.title')}
          </h2>
          {result && (
            <span
              className={clsx(
                'rounded-full px-2.5 py-0.5 text-xs font-medium',
                result.passed ? 'bg-chemistry-soft text-chemistry-ink' : 'bg-surface-2 text-muted',
              )}
            >
              {result.passed ? t('quiz.passedBadge') : t('quiz.notPassedBadge')}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {t('quiz.intro', { count: total })} {t('quiz.passMark', { mark: passMark(total), total })}
        </p>
        {result && (
          <p className="tabular mt-1 text-xs text-muted">
            {t('quiz.best', { score: result.bestScore, total: result.total })} · {t('quiz.attempts', { count: result.attempts })}
          </p>
        )}
      </div>
      <Button variant={passedNow ? 'secondary' : 'primary'} onClick={() => setOpen(true)} className="self-start sm:self-auto">
        {result ? t('quiz.retake') : t('quiz.take')}
      </Button>
      {open && <QuizPanel title={title} questions={questions} onClose={() => setOpen(false)} onFinish={onFinish} />}
    </section>
  )
}
