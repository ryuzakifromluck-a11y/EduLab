import { clsx } from 'clsx'
import { CheckCircle2, CircleHelp, FlaskConical, Lightbulb, Pencil, RotateCcw, Scale, XCircle } from 'lucide-react'
import { forwardRef, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  compareHypothesis,
  MAX_TEXT,
  SELF_ASSESSMENTS,
  type HypothesisComparison,
  type HypothesisRecord,
  type HypothesisSpec,
  type SelfAssessment,
  type Verdict,
} from '../../lib/hypothesis'
import type { ProgressSettings } from '../../lib/progressModel'
import { fmt, fmtSig } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { Badge, Button, ButtonLink } from '../ui/primitives'
import { directionIcon } from './directionIcon'
import { HypothesisStatement } from './HypothesisPanel'

const VERDICT_STYLE: Record<Verdict, string> = {
  confirmed: 'bg-ok/15 text-ok',
  partly: 'bg-warn-soft text-warn',
  refuted: 'bg-danger/15 text-danger',
}

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const { t } = useTranslation()
  const Icon = verdict === 'confirmed' ? CheckCircle2 : verdict === 'partly' ? CircleHelp : XCircle
  return (
    <Badge className={clsx(VERDICT_STYLE[verdict], className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {t(`hypothesis.verdict.${verdict}`)}
    </Badge>
  )
}

const outcomeValue = (v: number | null, digits: number) => (v === null ? '∞' : Math.abs(v) > 0 && Math.abs(v) < 0.01 ? fmtSig(v, 3) : fmt(v, digits))

/**
 * Strip under the experiment title: the current hypothesis, or a prompt to make one.
 */
export function HypothesisBanner({
  spec,
  record,
  onMake,
  onEdit,
  onCompare,
}: {
  spec: HypothesisSpec
  record: HypothesisRecord | undefined
  onMake: () => void
  onEdit: () => void
  onCompare: () => void
}) {
  const { t } = useTranslation()
  const tested = !!record?.result
  return (
    <section
      aria-label={t('hypothesis.yours')}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Lightbulb className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            {record ? (tested ? t('hypothesis.lastTested') : t('hypothesis.yours')) : t('hypothesis.none')}
            {record?.result && <VerdictBadge verdict={record.result.verdict} />}
          </h2>
          {record ? (
            <HypothesisStatement spec={spec} draft={record.draft} className="mt-1.5 text-sm" />
          ) : (
            <p className="mt-1 text-sm text-muted">{t('hypothesis.noneText')}</p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {!record || tested ? (
          <>
            {tested && <Button size="sm" onClick={onCompare}>{t('hypothesis.showResult')}</Button>}
            <Button size="sm" variant="primary" onClick={onMake}>
              <FlaskConical className="h-4 w-4" aria-hidden />
              {tested ? t('hypothesis.new') : t('hypothesis.make')}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="h-4 w-4" aria-hidden />
              {t('hypothesis.edit')}
            </Button>
            <Button size="sm" variant="primary" onClick={onCompare}>
              <Scale className="h-4 w-4" aria-hidden />
              {t('hypothesis.compareCta')}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}

/**
 * End-of-run comparison: the hypothesis next to what happened, an automatic
 * check against the experiment's model, and the student's own judgement.
 */
export const HypothesisComparePanel = forwardRef<
  HTMLElement,
  {
    spec: HypothesisSpec
    record: HypothesisRecord
    settings: ProgressSettings
    onSave: (comparison: HypothesisComparison, self: SelfAssessment, reflection: string) => void
    onNew: () => void
  }
>(function HypothesisComparePanel({ spec, record, settings, onSave, onNew }, ref) {
  const { t } = useTranslation()
  const uid = useId()
  const signedIn = useAuth((s) => s.isAuthenticated)
  const saved = record.result
  // Experiments pass a fresh settings object on every animation frame: only recompute when a value changes.
  const settingsKey = JSON.stringify(settings)
  const live = useMemo(
    () => compareHypothesis(spec, record.draft, record.baseline, JSON.parse(settingsKey) as ProgressSettings),
    [spec, record.draft, record.baseline, settingsKey],
  )
  const c: HypothesisComparison = saved ?? live
  const [self, setSelf] = useState<SelfAssessment | null>(null)
  const [reflection, setReflection] = useState('')
  const [missingSelf, setMissingSelf] = useState(false)

  const variable = spec.variables.find((v) => v.id === c.variable)!
  const varLabel = t(variable.labelKey)
  const varValue = (x: number) => `${fmt(x, variable.digits)}${variable.unit ? ` ${variable.unit}` : ''}`
  const label = (id: string) => {
    const key = spec.variables.find((v) => v.id === id)?.labelKey
    return key ? t(key) : id
  }

  const save = () => {
    if (!self) {
      setMissingSelf(true)
      document.getElementById(`${uid}-self`)?.focus()
      return
    }
    onSave(live, self, reflection)
  }

  return (
    <section ref={ref} tabIndex={-1} aria-labelledby={`${uid}-title`} className="mt-5 rounded-2xl border border-line bg-surface shadow-card focus:outline-none">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id={`${uid}-title`} className="flex items-center gap-2 text-base font-semibold text-ink">
          <Scale className="h-5 w-5 text-muted" aria-hidden />
          {t('hypothesis.compareTitle')}
        </h2>
        <VerdictBadge verdict={c.verdict} className="px-3 py-1 text-sm" />
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink">{t('hypothesis.youPredicted')}</h3>
          <HypothesisStatement spec={spec} draft={record.draft} className="text-sm" />
          {record.draft.plan && (
            <p className="text-sm text-muted">
              <span className="font-medium text-ink">{t('hypothesis.planShort')}: </span>
              {record.draft.plan}
            </p>
          )}
          <blockquote className="rounded-xl border-l-4 border-brand bg-surface-2 px-4 py-2 text-sm italic text-ink">{record.draft.prediction}</blockquote>
          <p className="text-xs text-muted">
            {t('hypothesis.youPicked', { list: record.draft.affected.map((id) => t(spec.outcomes.find((o) => o.id === id)?.labelKey ?? id)).join(', ') })}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink">{t('hypothesis.whatHappened')}</h3>
          <p className="text-sm leading-relaxed text-muted">
            {c.source === 'run'
              ? t('hypothesis.sourceRun', { variable: varLabel, from: varValue(c.from), to: varValue(c.to) })
              : t('hypothesis.sourceModel', { variable: varLabel, from: varValue(c.from), to: varValue(c.to) })}
          </p>
          {c.confounded.length > 0 && (
            <p className="rounded-xl bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
              {t('hypothesis.confounded', { list: c.confounded.map(label).join(', ') })}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <caption className="sr-only">{t('hypothesis.tableCaption')}</caption>
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 pr-3 font-medium">{t('hypothesis.columns.value')}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t('hypothesis.columns.before')}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t('hypothesis.columns.after')}</th>
                  <th scope="col" className="py-2 pr-3 font-medium">{t('hypothesis.columns.result')}</th>
                  <th scope="col" className="py-2 font-medium">{t('hypothesis.columns.you')}</th>
                </tr>
              </thead>
              <tbody>
                {c.outcomes.map((o) => {
                  const spec_ = spec.outcomes.find((x) => x.id === o.id)
                  const unit = spec_?.unit ? ` ${spec_.unit}` : ''
                  const main = o.id === record.draft.outcome
                  const pickedChange = record.draft.affected.includes(o.id)
                  const pickRight = pickedChange === (o.direction !== 'same')
                  const mainRight = main && o.direction === record.draft.expected
                  return (
                    <tr key={o.id} className={clsx('border-b border-line last:border-0', main && 'bg-brand-soft/40')}>
                      <th scope="row" className="py-2 pr-3 font-medium text-ink">
                        {t(spec_?.labelKey ?? o.id)}
                        {main && <span className="ml-1.5 text-xs font-normal text-brand">{t('hypothesis.mainPrediction')}</span>}
                      </th>
                      <td className="tabular py-2 pr-3 text-muted">{outcomeValue(o.from, spec_?.digits ?? 2)}{unit}</td>
                      <td className="tabular py-2 pr-3 text-ink">{outcomeValue(o.to, spec_?.digits ?? 2)}{unit}</td>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1 text-ink">
                          {directionIcon(o.direction)}
                          {t(`hypothesis.direction.${o.direction}`)}
                        </span>
                      </td>
                      <td className="py-2">
                        {main ? (
                          <Mark ok={mainRight} label={t(`hypothesis.expected.${record.draft.expected}`)} />
                        ) : (
                          <Mark ok={pickRight} label={pickedChange ? t('hypothesis.pickedChange') : t('hypothesis.pickedSame')} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-ink">
            {c.predictionCorrect ? t('hypothesis.predictionRight') : t('hypothesis.predictionWrong')}{' '}
            {t('hypothesis.affectedScore', { correct: c.affectedCorrect, total: c.affectedTotal })}
          </p>
          <p className="text-sm leading-relaxed text-muted">{t(`hypothesis.verdictText.${c.verdict}`)}</p>
        </div>
      </div>

      <div className="border-t border-line px-5 py-4" aria-live="polite">
        {saved ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />
                {t('hypothesis.resultSaved')}
              </p>
              <p className="mt-1 text-muted">
                {t('hypothesis.youSaid', { answer: t(`hypothesis.self.${saved.selfAssessment}`) })}
                {saved.reflection && <> · “{saved.reflection}”</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {signedIn && <ButtonLink to="/account">{t('hypothesis.viewAccount')}</ButtonLink>}
              <Button variant="primary" onClick={onNew}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                {t('hypothesis.new')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <fieldset
              id={`${uid}-self`}
              tabIndex={-1}
              aria-describedby={missingSelf ? `${uid}-self-error` : undefined}
              className="flex flex-col gap-2 focus:outline-none"
            >
              <legend className="text-sm font-semibold text-ink">{t('hypothesis.selfQuestion')}</legend>
              <div className="flex flex-wrap gap-2">
                {SELF_ASSESSMENTS.map((s) => (
                  <label
                    key={s}
                    className={clsx(
                      'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm',
                      self === s ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-2',
                    )}
                  >
                    <input
                      type="radio"
                      name={`${uid}-self`}
                      checked={self === s}
                      onChange={() => {
                        setSelf(s)
                        setMissingSelf(false)
                      }}
                      className="h-4 w-4 accent-[var(--brand)]"
                    />
                    {t(`hypothesis.self.${s}`)}
                  </label>
                ))}
              </div>
              {missingSelf && (
                <p id={`${uid}-self-error`} className="text-xs font-medium text-warn">
                  {t('hypothesis.errors.self')}
                </p>
              )}
            </fieldset>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
              {t('hypothesis.reflectionLabel')}
              <textarea
                className="min-h-[64px] w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal text-ink placeholder:text-faint focus:border-brand"
                maxLength={MAX_TEXT}
                value={reflection}
                placeholder={t('hypothesis.reflectionPlaceholder')}
                onChange={(e) => setReflection(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted">{signedIn ? t('hypothesis.saveNoteAccount') : t('hypothesis.saveNoteGuest')}</p>
              <Button variant="primary" onClick={save}>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {t('hypothesis.saveResult')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
})

function Mark({ ok, label }: { ok: boolean; label: string }) {
  const { t } = useTranslation()
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', ok ? 'text-ok' : 'text-danger')}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <XCircle className="h-3.5 w-3.5" aria-hidden />}
      <span className="sr-only">{ok ? t('hypothesis.right') : t('hypothesis.wrong')}: </span>
      {label}
    </span>
  )
}
