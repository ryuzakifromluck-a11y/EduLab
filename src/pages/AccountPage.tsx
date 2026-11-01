import { ArrowRight, CheckCircle2, Lightbulb, LogOut, RotateCcw, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { RequireAuth } from '../components/auth/RouteGuards'
import { VerdictBadge } from '../components/hypothesis/HypothesisCompare'
import { HypothesisStatement } from '../components/hypothesis/HypothesisPanel'
import { hypothesisSpec } from '../data/hypotheses'
import { SubjectBadge } from '../components/ui/badges'
import { Button, ButtonLink, Card, Container } from '../components/ui/primitives'
import { EXPERIMENTS, availableExperiments, experimentPath } from '../data/experiments'
import type { ProgressSettings } from '../lib/progressModel'
import { useAuth } from '../store/auth'
import { useHypotheses } from '../store/hypothesis'
import { useProgress } from '../store/progress'

const formatSettings = (s: ProgressSettings, locale: string) =>
  Object.entries(s)
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toLocaleString(locale, { maximumFractionDigits: 3 }) : String(v)}`)
    .join(', ')

function AccountDashboard() {
  const { t, i18n } = useTranslation()
  const user = useAuth((s) => s.user)!
  const logout = useAuth((s) => s.logout)
  const { records, status, load } = useProgress()

  // Always show fresh data when the page opens (progress may have been saved on another device).
  useEffect(() => {
    void load()
  }, [load])

  const date = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' })
  const rows = Object.values(records)
    .map((r) => ({ record: r, experiment: EXPERIMENTS.find((e) => e.id === r.experimentId) }))
    .filter((r) => r.experiment)
    .sort((a, b) => b.record.lastCompletedAt.localeCompare(a.record.lastCompletedAt))
  const attempts = rows.reduce((n, r) => n + r.record.attempts, 0)
  const scores = rows.map((r) => r.record.bestScore).filter((s): s is number => s !== null)
  const available = availableExperiments().length
  const stats = [
    { id: 'completed', value: String(rows.length) },
    { id: 'attempts', value: String(attempts) },
    { id: 'bestScore', value: scores.length ? `${Math.max(...scores)}%` : t('account.noScore') },
    { id: 'coverage', value: available ? `${Math.round((rows.filter((r) => r.experiment!.status === 'available').length / available) * 100)}%` : '—' },
  ] as const

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <UserRound className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{t('account.greeting', { name: user.name })}</h1>
            <p className="text-sm text-muted">
              {user.email} · {t('account.memberSince', { date: date(user.createdAt) })}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={logout} className="self-start sm:self-auto">
          <LogOut className="h-4 w-4" aria-hidden />
          {t('nav.signOut')}
        </Button>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.id} className="p-5">
            <dt className="text-xs font-medium text-muted">{t(`account.stats.${s.id}`)}</dt>
            <dd className="tabular mt-1 text-2xl font-semibold text-ink">{s.value}</dd>
          </Card>
        ))}
      </dl>

      <Card as="section" className="mt-6 overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-base font-semibold text-ink">{t('account.completedTitle')}</h2>
        {status === 'loading' && !rows.length ? (
          <p className="px-5 py-8 text-sm text-muted">{t('account.loading')}</p>
        ) : status === 'error' && !rows.length ? (
          <div className="flex flex-col items-start gap-3 px-5 py-8 text-sm text-muted">
            <p role="alert">{t('account.loadError')}</p>
            <Button size="sm" onClick={() => void load()}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              {t('account.retry')}
            </Button>
          </div>
        ) : !rows.length ? (
          <div className="flex flex-col items-start gap-4 px-5 py-8 text-sm text-muted">
            <p>{t('account.empty')}</p>
            <ButtonLink to="/#subjects" variant="primary">
              {t('account.browse')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  {(['experiment', 'first', 'last', 'attempts', 'bestScore', 'settings'] as const).map((c) => (
                    <th key={c} scope="col" className="px-5 py-3 font-medium">
                      {t(`account.columns.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ record: r, experiment: e }) => (
                  <tr key={r.experimentId} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-hidden />
                        <Link to={experimentPath(e!)} className="font-medium text-ink hover:underline">
                          {t(`catalog.${e!.id}.title`)}
                        </Link>
                        <SubjectBadge subject={e!.subject} />
                      </div>
                    </td>
                    <td className="tabular px-5 py-3.5 text-muted">{date(r.completedAt)}</td>
                    <td className="tabular px-5 py-3.5 text-muted">{date(r.lastCompletedAt)}</td>
                    <td className="tabular px-5 py-3.5 text-ink">{r.attempts}</td>
                    <td className="tabular px-5 py-3.5 text-ink">{r.bestScore === null ? t('account.noScore') : `${r.bestScore}%`}</td>
                    <td className="px-5 py-3.5 text-xs text-muted">{formatSettings(r.settings, i18n.language) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <HypothesesSection date={date} />
    </Container>
  )
}

/** Every experiment's latest hypothesis and how it compared with the result. */
function HypothesesSection({ date }: { date: (iso: string) => string }) {
  const { t } = useTranslation()
  const records = useHypotheses((s) => s.records)
  const rows = Object.values(records)
    .map((r) => ({ record: r, experiment: EXPERIMENTS.find((e) => e.id === r.experimentId), spec: hypothesisSpec(r.experimentId) }))
    .filter((r) => r.experiment && r.spec)
    .sort((a, b) => b.record.updatedAt.localeCompare(a.record.updatedAt))
  const tested = rows.reduce((n, r) => n + r.record.tested, 0)
  const confirmed = rows.reduce((n, r) => n + r.record.confirmed, 0)

  return (
    <Card as="section" className="mt-6 overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Lightbulb className="h-4 w-4 text-muted" aria-hidden />
          {t('account.hypotheses.title')}
        </h2>
        {tested > 0 && <p className="text-sm text-muted">{t('account.hypotheses.summary', { confirmed, count: tested })}</p>}
      </div>
      {!rows.length ? (
        <p className="px-5 py-8 text-sm text-muted">{t('account.hypotheses.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                {(['experiment', 'hypothesis', 'result', 'tested', 'date'] as const).map((c) => (
                  <th key={c} scope="col" className="px-5 py-3 font-medium">
                    {t(`account.hypotheses.columns.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ record: r, experiment: e, spec }) => (
                <tr key={r.experimentId} className="border-b border-line align-top last:border-0">
                  <td className="px-5 py-3.5">
                    <Link to={experimentPath(e!)} className="font-medium text-ink hover:underline">
                      {t(`catalog.${e!.id}.title`)}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <HypothesisStatement spec={spec!} draft={r.draft} className="text-xs" />
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{r.draft.prediction}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {r.result ? (
                      <div className="flex flex-col items-start gap-1">
                        <VerdictBadge verdict={r.result.verdict} />
                        <span className="text-xs text-muted">{t('hypothesis.youSaid', { answer: t(`hypothesis.self.${r.result.selfAssessment}`) })}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">{t('account.hypotheses.pending')}</span>
                    )}
                  </td>
                  <td className="tabular px-5 py-3.5 text-ink">{t('account.hypotheses.testedValue', { confirmed: r.confirmed, tested: r.tested })}</td>
                  <td className="tabular px-5 py-3.5 text-muted">{date(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountDashboard />
    </RequireAuth>
  )
}
