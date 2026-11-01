import { clsx } from 'clsx'
import { ArrowRight, FlaskConical, X } from 'lucide-react'
import { directionIcon } from './directionIcon'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CHANGES,
  DIRECTIONS,
  completeDraft,
  MAX_TEXT,
  validateDraft,
  type DraftInput,
  type DraftField,
  type HypothesisDraft,
  type HypothesisSpec,
} from '../../lib/hypothesis'
import { Button } from '../ui/primitives'


/** "Length ↑ → Period ↑": the hypothesis in one line, independent of language grammar. */
export function HypothesisStatement({ spec, draft, className }: { spec: HypothesisSpec; draft: DraftInput; className?: string }) {
  const { t } = useTranslation()
  const variable = spec.variables.find((v) => v.id === draft.variable)
  const outcome = spec.outcomes.find((o) => o.id === draft.outcome)
  if (!variable || !outcome || !draft.change || !draft.expected) return null
  return (
    <p className={clsx('flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink', className)}>
      <span className="sr-only">{t('hypothesis.statementSr', {
        variable: t(variable.labelKey),
        change: t(`hypothesis.change.${draft.change}`),
        outcome: t(outcome.labelKey),
        expected: t(`hypothesis.expected.${draft.expected}`),
      })}</span>
      <span aria-hidden className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-0.5">
        {t(variable.labelKey)} {directionIcon(draft.change)}
      </span>
      <ArrowRight aria-hidden className="h-4 w-4 text-muted" />
      <span aria-hidden className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-0.5 text-brand">
        {t(outcome.labelKey)} {directionIcon(draft.expected)}
      </span>
    </p>
  )
}

function Choice({
  type = 'radio',
  name,
  checked,
  onChange,
  children,
}: {
  type?: 'radio' | 'checkbox'
  name: string
  checked: boolean
  onChange: () => void
  children: ReactNode
}) {
  return (
    <label
      className={clsx(
        'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
        checked ? 'border-brand bg-brand-soft text-ink' : 'border-line bg-surface text-ink hover:bg-surface-2',
      )}
    >
      <input type={type} name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-[var(--brand)]" />
      {children}
    </label>
  )
}

function Question({
  n,
  title,
  hint,
  error,
  children,
  id,
}: {
  n: number
  title: string
  hint?: string
  error?: string
  children: ReactNode
  id: string
}) {
  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={error ? `${id}-error` : undefined} className="flex flex-col gap-3 rounded-2xl border border-line p-4 focus:outline-none">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-ink">
        <span className="tabular inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white dark:text-[#0a0e17]">{n}</span>
        {title}
      </legend>
      {hint && <p className="-mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-warn">
          {error}
        </p>
      )}
    </fieldset>
  )
}

/**
 * The hypothesis form, shown as a modal dialog when the student opens an
 * experiment. Three questions: what will you do, what do you expect, and
 * which values will change. Escape or "Skip for now" closes it without saving.
 */
export function HypothesisPanel({
  spec,
  open,
  initial,
  editing,
  onSubmit,
  onSkip,
}: {
  spec: HypothesisSpec
  open: boolean
  initial: DraftInput
  /** Rewording the current hypothesis rather than starting a new one. */
  editing?: boolean
  onSubmit: (draft: HypothesisDraft) => void
  onSkip: () => void
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const uid = useId()
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<DraftField[]>([])
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      setDraft(initial)
      setErrors([])
      setTried(false)
      el.showModal()
    } else if (!open && el.open) el.close()
    // `initial` is read when the dialog opens only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const update = (patch: Partial<DraftInput>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (tried) setErrors(validateDraft(spec, next))
  }

  const submit = () => {
    const found = validateDraft(spec, draft)
    setTried(true)
    setErrors(found)
    const complete = completeDraft(spec, draft)
    if (!complete) {
      const first = found[0] === 'change' ? 'variable' : found[0] === 'expected' ? 'outcome' : found[0]
      document.getElementById(`${uid}-${first}`)?.focus()
      return
    }
    onSubmit(complete)
  }

  const err = (...fields: DraftField[]) => {
    const f = fields.find((x) => errors.includes(x))
    return f ? t(`hypothesis.errors.${f}`) : undefined
  }
  const q = (f: string) => `${uid}-${f}`
  const textarea = 'min-h-[72px] w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-brand'

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${uid}-title`}
      aria-describedby={`${uid}-intro`}
      onCancel={(ev) => {
        ev.preventDefault()
        onSkip()
      }}
      className="m-auto max-h-[92vh] w-[min(720px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-line bg-bg p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      <form
        method="dialog"
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault()
          submit()
        }}
        className="flex max-h-[92vh] flex-col"
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <FlaskConical className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${uid}-title`} className="text-lg font-semibold tracking-tight">
              {editing ? t('hypothesis.editTitle') : t('hypothesis.title')}
            </h2>
            <p id={`${uid}-intro`} className="mt-1 text-sm leading-relaxed text-muted">
              {t('hypothesis.intro')}
            </p>
          </div>
          <button type="button" onClick={onSkip} aria-label={t('hypothesis.close')} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5 sm:px-6">
          <Question n={1} id={q('variable')} title={t('hypothesis.q1')} hint={t('hypothesis.q1Hint')} error={err('variable', 'change')}>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('hypothesis.variableLabel')}>
              {spec.variables.map((v) => (
                <Choice key={v.id} name={q('var')} checked={draft.variable === v.id} onChange={() => update({ variable: v.id })}>
                  {t(v.labelKey)}
                  {v.unit && <span className="text-xs text-muted">({v.unit})</span>}
                </Choice>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('hypothesis.changeLabel')}>
              {CHANGES.map((c) => (
                <Choice key={c} name={q('chg')} checked={draft.change === c} onChange={() => update({ change: c })}>
                  {directionIcon(c)}
                  {t(`hypothesis.change.${c}`)}
                </Choice>
              ))}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              {t('hypothesis.planLabel')}
              <textarea
                className={textarea}
                maxLength={MAX_TEXT}
                value={draft.plan}
                placeholder={t('hypothesis.planPlaceholder')}
                onChange={(e) => update({ plan: e.target.value })}
              />
            </label>
          </Question>

          <Question n={2} id={q('outcome')} title={t('hypothesis.q2')} hint={t('hypothesis.q2Hint')} error={err('outcome', 'expected')}>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('hypothesis.outcomeLabel')}>
              {spec.outcomes.map((o) => (
                <Choice key={o.id} name={q('out')} checked={draft.outcome === o.id} onChange={() => update({ outcome: o.id })}>
                  {t(o.labelKey)}
                </Choice>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('hypothesis.expectedLabel')}>
              {DIRECTIONS.map((d) => (
                <Choice key={d} name={q('exp')} checked={draft.expected === d} onChange={() => update({ expected: d })}>
                  {directionIcon(d)}
                  {t(`hypothesis.expected.${d}`)}
                </Choice>
              ))}
            </div>
          </Question>

          <div id={q('prediction')} tabIndex={-1} className="-mt-2 flex flex-col gap-1.5 px-1 focus:outline-none">
            <label htmlFor={q('prediction-input')} className="text-sm font-medium text-ink">
              {t('hypothesis.predictionLabel')}
            </label>
            <textarea
              id={q('prediction-input')}
              className={clsx(textarea, errors.includes('prediction') && 'border-warn')}
              maxLength={MAX_TEXT}
              value={draft.prediction}
              placeholder={t('hypothesis.predictionPlaceholder')}
              aria-invalid={errors.includes('prediction') || undefined}
              aria-describedby={errors.includes('prediction') ? q('prediction-error') : undefined}
              onChange={(e) => update({ prediction: e.target.value })}
            />
            {errors.includes('prediction') && (
              <p id={q('prediction-error')} className="text-xs font-medium text-warn">
                {t('hypothesis.errors.prediction')}
              </p>
            )}
          </div>

          <Question n={3} id={q('affected')} title={t('hypothesis.q3')} hint={t('hypothesis.q3Hint')} error={err('affected')}>
            <div className="flex flex-wrap gap-2">
              {spec.outcomes.map((o) => {
                const on = draft.affected.includes(o.id)
                return (
                  <Choice
                    key={o.id}
                    type="checkbox"
                    name={q('aff')}
                    checked={on}
                    onChange={() => update({ affected: on ? draft.affected.filter((x) => x !== o.id) : [...draft.affected, o.id] })}
                  >
                    {t(o.labelKey)}
                  </Choice>
                )
              })}
            </div>
          </Question>

          {draft.variable && draft.change && draft.outcome && draft.expected && (
            <div className="rounded-2xl bg-surface-2 px-4 py-3">
              <p className="text-xs font-medium text-muted">{t('hypothesis.preview')}</p>
              <HypothesisStatement spec={spec} draft={draft} className="mt-1.5 text-sm" />
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button onClick={onSkip}>{editing ? t('hypothesis.cancel') : t('hypothesis.skip')}</Button>
          <Button type="submit" variant="primary">
            {editing ? t('hypothesis.saveEdit') : t('hypothesis.save')}
          </Button>
        </footer>
      </form>
    </dialog>
  )
}
