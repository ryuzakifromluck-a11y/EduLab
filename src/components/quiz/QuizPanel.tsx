import { Check, RotateCcw, Trophy, X } from 'lucide-react'
import { useEffect, useId, useMemo, useReducer, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'
import type { QuizQuestion } from '../../data/quizzes'
import { initialRun, isPassing, passMark, quizReducer, scoreAnswers } from '../../lib/quiz'
import { Button, buttonClass } from '../ui/primitives'

interface Props {
  title: string
  questions: QuizQuestion[]
  onClose: () => void
  /** Called once when the last question is confirmed. */
  onFinish: (score: number, total: number) => void
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Modal multiple-choice quiz: one question at a time, immediate feedback, then a results screen. */
export function QuizPanel({ title, questions, onClose, onFinish }: Props) {
  const { t } = useTranslation()
  const [run, dispatch] = useReducer(quizReducer, questions.length, initialRun)
  const dialogRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const nextRef = useRef<HTMLButtonElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const feedbackId = useId()

  const total = questions.length
  const q = questions[run.index]
  const chosen = run.answers[run.index]
  const answered = chosen !== null
  const score = useMemo(() => scoreAnswers(run.answers, questions.map((x) => x.correctIndex)), [run.answers, questions])
  const passed = isPassing(score, total)

  // Lock page scroll and restore focus to the opener when the dialog closes.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [])

  // Move focus to whatever the learner needs next.
  useEffect(() => {
    if (run.finished) resultRef.current?.focus()
    else if (answered) nextRef.current?.focus()
    else optionRefs.current[0]?.focus()
  }, [run.index, run.finished, answered])

  const choose = (i: number) => {
    if (answered || run.finished) return
    dispatch({ type: 'answer', choice: i })
  }

  const next = () => {
    if (!answered) return
    if (run.index === total - 1) onFinish(score, total)
    dispatch({ type: 'next' })
  }

  const onKeyDown = (ev: ReactKeyboardEvent<HTMLDivElement>) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation()
      onClose()
      return
    }
    if (ev.key === 'Tab') {
      const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault()
        last.focus()
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault()
        first.focus()
      }
      return
    }
    if (run.finished) return
    const n = Number(ev.key)
    if (!answered && Number.isInteger(n) && n >= 1 && n <= q.options.length) {
      ev.preventDefault()
      choose(n - 1)
      return
    }
    if (!answered && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
      const current = optionRefs.current.indexOf(document.activeElement as HTMLButtonElement)
      const step = ev.key === 'ArrowDown' ? 1 : -1
      const target = current < 0 ? 0 : (current + step + q.options.length) % q.options.length
      ev.preventDefault()
      optionRefs.current[target]?.focus()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('quiz.dialogLabel', { title })}
        onKeyDown={onKeyDown}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-surface text-ink shadow-card sm:rounded-3xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">{t('quiz.title')}</p>
            <p className="truncate text-sm text-muted">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('quiz.close')}
            title={t('quiz.close')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          {!run.finished ? (
            <>
              <div className="flex items-center justify-between gap-3 text-sm text-muted">
                <span className="tabular">{t('quiz.progress', { current: run.index + 1, total })}</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={run.index + (answered ? 1 : 0)}
                aria-label={t('quiz.progress', { current: run.index + 1, total })}
              >
                <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${((run.index + (answered ? 1 : 0)) / total) * 100}%` }} />
              </div>

              <h2 id={headingId} className="mt-5 text-lg leading-snug font-semibold sm:text-xl">
                {q.question}
              </h2>

              <div role="group" aria-labelledby={headingId} aria-describedby={answered ? feedbackId : undefined} className="mt-4 flex flex-col gap-2.5">
                {q.options.map((opt, i) => {
                  const isCorrect = i === q.correctIndex
                  const isChosen = i === chosen
                  return (
                    <button
                      key={`${q.id}-${i}`}
                      ref={(el) => {
                        optionRefs.current[i] = el
                      }}
                      type="button"
                      onClick={() => choose(i)}
                      aria-disabled={answered || undefined}
                      aria-pressed={isChosen}
                      className={clsx(
                        'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors sm:text-base',
                        !answered && 'border-line hover:border-brand/50 hover:bg-surface-2',
                        answered && isCorrect && 'border-chemistry bg-chemistry-soft text-chemistry-ink',
                        answered && isChosen && !isCorrect && 'border-warn bg-warn-soft text-warn',
                        answered && !isCorrect && !isChosen && 'border-line opacity-60',
                        answered && 'cursor-default',
                      )}
                    >
                      <span
                        className={clsx(
                          'tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          answered && (isCorrect || isChosen) ? 'bg-surface/70' : 'bg-surface-2 text-muted',
                        )}
                        aria-hidden
                      >
                        {answered && isCorrect ? <Check className="h-3.5 w-3.5" /> : answered && isChosen ? <X className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  )
                })}
              </div>

              <div id={feedbackId} role="status" aria-live="polite" className="mt-4">
                {answered && (
                  <div className={clsx('rounded-xl px-4 py-3 text-sm leading-relaxed', chosen === q.correctIndex ? 'bg-chemistry-soft text-chemistry-ink' : 'bg-warn-soft text-warn')}>
                    <p className="font-semibold">
                      {chosen === q.correctIndex ? t('quiz.correct') : t('quiz.incorrect')}
                      {chosen !== q.correctIndex && <> {t('quiz.correctAnswer', { answer: q.options[q.correctIndex] })}</>}
                    </p>
                    <p className="mt-1 text-ink/80 dark:text-ink/85">{q.explanation}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <p className="hidden text-xs text-muted sm:block">{t('quiz.keysHint', { count: q.options.length })}</p>
                <button ref={nextRef} type="button" onClick={next} disabled={!answered} className={buttonClass('primary', 'md', 'ml-auto')}>
                  {run.index === total - 1 ? t('quiz.seeResults') : t('quiz.next')}
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <span
                  className={clsx(
                    'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
                    passed ? 'bg-chemistry-soft text-chemistry-ink' : 'bg-warn-soft text-warn',
                  )}
                >
                  {passed ? <Trophy className="h-7 w-7" aria-hidden /> : <RotateCcw className="h-7 w-7" aria-hidden />}
                </span>
                <div>
                  <h2 ref={resultRef} tabIndex={-1} className="text-sm font-medium text-muted focus-visible:outline-none">
                    {t('quiz.resultsTitle')}
                  </h2>
                  <p className="tabular text-3xl font-semibold tracking-tight">
                    {score}/{total}
                    <span className="sr-only"> ({t('quiz.scoreLabel', { score, total })})</span>
                  </p>
                </div>
              </div>
              <p role="status" className={clsx('mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed', passed ? 'bg-chemistry-soft text-chemistry-ink' : 'bg-warn-soft text-warn')}>
                {passed ? t('quiz.passed') : t('quiz.failed', { mark: passMark(total), total })}
              </p>

              <h3 className="mt-6 text-sm font-semibold">{t('quiz.review')}</h3>
              <ol className="mt-2 flex flex-col gap-2">
                {questions.map((qq, i) => {
                  const ok = run.answers[i] === qq.correctIndex
                  return (
                    <li key={qq.id} className="flex gap-3 rounded-xl border border-line px-4 py-3 text-sm">
                      <span
                        className={clsx(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                          ok ? 'bg-chemistry-soft text-chemistry-ink' : 'bg-warn-soft text-warn',
                        )}
                      >
                        {ok ? <Check className="h-3 w-3" aria-label={t('quiz.correct')} /> : <X className="h-3 w-3" aria-label={t('quiz.incorrect')} />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-ink">{qq.question}</p>
                        {!ok && (
                          <p className="mt-1 text-muted">
                            {t('quiz.correctAnswer', { answer: qq.options[qq.correctIndex] })}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Button variant="secondary" onClick={() => dispatch({ type: 'restart' })}>
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  {t('quiz.retry')}
                </Button>
                <Button variant="primary" onClick={onClose}>
                  {t('quiz.backToExperiment')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
