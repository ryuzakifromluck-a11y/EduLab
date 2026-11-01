import { clsx } from 'clsx'
import { Loader2, RotateCcw, SendHorizontal, Sparkles, Square, WifiOff, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TutorLanguage, TutorReading } from '../../../server/tutor/types'
import type { Experiment } from '../../data/experiments'
import { useOnline } from '../../lib/hooks'
import { askTutor, checkTutorAvailable, TutorRequestError, type TutorContext, type TutorFailure } from '../../services/tutor'
import { HISTORY_LIMIT, remainingToday, useTutor } from '../../store/tutor'
import type { Measurement } from '../lab/controls'
import { Button, IconButton } from '../ui/primitives'

const SUGGESTED = new Set(['pendulum', 'ohms-law', 'titration', 'projectile-motion', 'reaction-rate'])
const EMPTY: never[] = []
const MAX_QUESTION = 600

interface Props {
  experiment: Experiment
  /** Current parameter values, already formatted for display. */
  params?: TutorReading[]
  measurements: Measurement[]
}

interface ChatError {
  code: TutorFailure | 'rate_limited_day'
  text: string
  /** Seconds to wait before a retry is allowed (rate limits). */
  retryAfter?: number
}

function toReadings(measurements: Measurement[]): TutorReading[] {
  return measurements.flatMap((m) => (typeof m.label === 'string' ? [{ label: m.label, value: m.value, unit: m.unit }] : []))
}

/** Seconds left of the error's wait, counting down from when the error appeared. */
function useCountdown(error: ChatError | null): number {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!error?.retryAfter) return
    const until = Date.now() + error.retryAfter * 1000
    const tick = () => {
      const s = Math.max(0, Math.ceil((until - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) window.clearInterval(id)
    }
    const id = window.setInterval(tick, 250)
    tick()
    return () => {
      window.clearInterval(id)
      setLeft(0)
    }
  }, [error])
  return error?.retryAfter ? left : 0
}

/** Collapsible tutor chat, docked bottom-right on experiment pages. */
export function AIAssistant({ experiment: e, params = EMPTY, measurements }: Props) {
  const { t, i18n } = useTranslation()
  const { open, setOpen, chats, append, setChat, clearChat, countMessage, setServerRemaining, quizResults, available, setAvailable } = useTutor()
  const remaining = useTutor(remainingToday)
  const online = useOnline()
  const messages = chats[e.id] ?? EMPTY
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ChatError | null>(null)
  const wait = useCountdown(error)
  const abort = useRef<AbortController | null>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const panelId = useId()
  const statusId = useId()

  const language = (['en', 'uz', 'ru'].includes(i18n.resolvedLanguage ?? '') ? i18n.resolvedLanguage : 'en') as TutorLanguage
  const unavailable = available === false
  const blocked = !online || unavailable || remaining === 0
  const canSend = !blocked && !pending && wait === 0

  // Latest experiment state, read when a message is sent rather than on every simulation tick.
  const context = useRef<TutorContext>(null as unknown as TutorContext)
  context.current = {
    experimentId: e.id,
    subject: e.subject,
    title: t(`catalog.${e.id}.title`),
    params,
    readings: toReadings(measurements),
    quiz: quizResults[e.id],
  }

  useEffect(() => () => abort.current?.abort(), [e.id])

  // Ask the server once whether the tutor is set up, the first time the panel opens while online.
  useEffect(() => {
    if (!open || !online || available !== null) return
    const ctrl = new AbortController()
    void checkTutorAvailable(ctrl.signal).then((ok) => ok !== null && !ctrl.signal.aborted && setAvailable(ok))
    return () => ctrl.abort()
  }, [open, online, available, setAvailable])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight })
  }, [messages.length, pending, error])

  // Return focus to the launcher when the panel closes.
  const wasOpen = useRef(open)
  useEffect(() => {
    if (wasOpen.current && !open) launcher.current?.focus()
    wasOpen.current = open
  }, [open])

  const close = useCallback(() => setOpen(false), [setOpen])

  useEffect(() => {
    if (!open) return
    const onKey = (ev: globalThis.KeyboardEvent) => {
      if (ev.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const stop = () => abort.current?.abort()

  const send = async (text: string) => {
    const question = text.trim().slice(0, MAX_QUESTION)
    if (!question || !canSend) return
    setError(null)
    setDraft('')
    input.current?.focus()
    const before = messages
    const history = [...before, { role: 'user' as const, content: question }]
    append(e.id, history[history.length - 1])
    setPending(true)
    const ctrl = new AbortController()
    abort.current = ctrl
    try {
      const { reply, remaining: left } = await askTutor(language, context.current, history.slice(-HISTORY_LIMIT), ctrl.signal)
      append(e.id, { role: 'assistant', content: reply })
      countMessage()
      if (Number.isFinite(left)) setServerRemaining(left)
    } catch (err) {
      // Take the unanswered question back out so the learner can retry or edit it.
      setChat(e.id, before)
      setDraft(question)
      if ((err as Error).name === 'AbortError') return
      const failure = err instanceof TutorRequestError ? err : new TutorRequestError('upstream')
      if (failure.code === 'not_configured') setAvailable(false)
      if (failure.code === 'rate_limited' && failure.limit === 'day') {
        setServerRemaining(0)
        setError({ code: 'rate_limited_day', text: question })
      } else {
        setError({ code: failure.code, text: question, retryAfter: failure.code === 'rate_limited' ? (failure.retryAfter ?? 30) : undefined })
      }
    } finally {
      if (abort.current === ctrl) {
        abort.current = null
        setPending(false)
      }
    }
  }

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    void send(draft)
  }

  const onInputKey = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    if (ev.key === 'Enter' && !ev.shiftKey && !ev.nativeEvent.isComposing) {
      ev.preventDefault()
      void send(draft)
    }
  }

  const suggestionKey = SUGGESTED.has(e.id) ? e.id : 'generic'
  const suggestions = [1, 2, 3].map((i) => t(`ai.suggest.${suggestionKey}.q${i}`))

  // One notice explains why the learner cannot type right now; errors from a send are shown separately.
  const notice = !online ? t('ai.offlineNotice') : unavailable ? t('ai.error.not_configured') : remaining === 0 ? t('ai.limitReached') : null
  const showError = error && !(error.code === 'offline' && !online) && !(error.code === 'not_configured' && unavailable)
  const retryable = error && !['not_configured', 'bad_request', 'rate_limited_day'].includes(error.code)
  const charsLeft = MAX_QUESTION - draft.length

  if (!open) {
    return (
      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls={panelId}
        className="fixed right-4 bottom-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-strong sm:right-6 sm:bottom-6 dark:text-[#0a0e17]"
      >
        {online ? <Sparkles className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
        {t('ai.open')}
        {!online && <span className="sr-only">({t('ai.offlineShort')})</span>}
      </button>
    )
  }

  return (
    <section
      id={panelId}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed inset-x-2 bottom-2 z-40 flex h-[min(600px,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span
            className={clsx('absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface', online && !unavailable ? 'bg-ok' : 'bg-faint')}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            {t('ai.title')}
          </h2>
          <p className="truncate text-xs text-muted">{context.current.title}</p>
        </div>
        {messages.length > 0 && (
          <IconButton label={t('ai.clear')} onClick={() => clearChat(e.id)} disabled={pending}>
            <RotateCcw className="h-4 w-4" aria-hidden />
          </IconButton>
        )}
        <IconButton label={t('ai.close')} onClick={close}>
          <X className="h-4 w-4" aria-hidden />
        </IconButton>
      </header>

      {notice && (
        <p id={statusId} role="status" className="flex items-center gap-2 border-b border-line bg-warn-soft px-4 py-2.5 text-sm text-warn">
          {!online && <WifiOff className="h-4 w-4 shrink-0" aria-hidden />}
          {notice}
        </p>
      )}

      <div
        ref={log}
        role="log"
        aria-live="polite"
        aria-busy={pending}
        aria-label={t('ai.conversation')}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 && !pending && (
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-muted">{t('ai.intro')}</p>
            <ul className="flex flex-col gap-2" aria-label={t('ai.suggestions')}>
              {suggestions.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => void send(q)}
                    disabled={!canSend}
                    className="w-full rounded-xl border border-line px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.length > 0 && <p className="text-center text-[11px] text-faint">{t('ai.historyNote', { count: HISTORY_LIMIT })}</p>}
        {messages.map((m, i) => (
          <div
            key={i}
            className={clsx(
              'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
              m.role === 'user' ? 'self-end rounded-br-md bg-brand text-white dark:text-[#0a0e17]' : 'self-start rounded-bl-md bg-surface-2 text-ink',
            )}
          >
            <span className="sr-only">{m.role === 'user' ? t('ai.you') : t('ai.tutor')}: </span>
            {m.content}
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-3 self-start" role="status">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3.5" aria-hidden>
              {[0, 150, 300].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
            <span className="text-xs text-muted">{t('ai.thinking')}</span>
          </div>
        )}
        {showError && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl bg-warn-soft px-3.5 py-3 text-sm text-warn">
            <p>{t(`ai.error.${error.code}`)}</p>
            {retryable && (
              <Button size="sm" variant="secondary" className="self-start" onClick={() => void send(error.text)} disabled={!canSend}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                {wait > 0 ? t('ai.retryIn', { count: wait }) : t('ai.retry')}
              </Button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line px-3 pt-3 pb-2">
        <div className="flex items-end gap-2">
          <label htmlFor={`${panelId}-input`} className="sr-only">
            {t('ai.placeholder')}
          </label>
          <textarea
            id={`${panelId}-input`}
            ref={input}
            rows={2}
            maxLength={MAX_QUESTION}
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={onInputKey}
            placeholder={t('ai.placeholder')}
            disabled={blocked}
            aria-describedby={notice ? statusId : undefined}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />
          {pending ? (
            <Button variant="secondary" className="h-11 w-11 shrink-0 px-0" onClick={stop} aria-label={t('ai.stop')} title={t('ai.stop')}>
              <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            </Button>
          ) : (
            <Button type="submit" variant="primary" className="h-11 w-11 shrink-0 px-0" disabled={!canSend || !draft.trim()} aria-label={t('ai.send')}>
              <SendHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
        <p className="mt-1.5 flex justify-between gap-2 px-1 text-[11px] text-faint">
          {pending ? (
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
              {t('ai.sending')}
            </span>
          ) : charsLeft < 100 ? (
            <span className={clsx('tabular', charsLeft < 20 && 'text-warn')}>{t('ai.charsLeft', { count: charsLeft })}</span>
          ) : (
            <span>{t('ai.disclaimer')}</span>
          )}
          <span className="tabular shrink-0">{t('ai.remaining', { count: remaining })}</span>
        </p>
      </form>
    </section>
  )
}
