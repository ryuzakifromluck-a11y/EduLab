import { AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { axisProps, tooltipProps, useChartTheme } from '../components/lab/chartTheme'
import { Panel } from '../components/lab/controls'
import { Container } from '../components/ui/primitives'
import { fmt, fmtInt } from '../lib/format'
import { analytics, type ImpactStats } from '../services/analytics'
import { optionalTile, StatSource, StatsSourceBadge, type StatTile } from './HomePage'
import { PageLoader } from '../components/PageLoader'
import { clsx } from 'clsx'
import { EXPERIMENTS } from '../data/experiments'

export default function ImpactPage() {
  const { t, i18n } = useTranslation()
  const c = useChartTheme()
  const [stats, setStats] = useState<ImpactStats | null>(null)
  useEffect(() => {
    analytics.getImpactStats().then(setStats)
  }, [])
  if (!stats) return <PageLoader />

  const tiles: StatTile[] = [
    { label: t('impact.totalExperiments'), value: fmtInt(stats.totalExperiments), sub: t('impact.plannedCount', { count: stats.plannedExperiments }), catalog: true },
    { label: t('impact.totalSessions'), value: fmtInt(stats.totalSessions) },
    optionalTile(t('impact.countries'), stats.countriesReached, fmtInt),
    { label: t('impact.completed'), value: fmtInt(stats.completedSessions) },
    optionalTile(t('impact.rating'), stats.averageRating, (v) => `${fmt(v, 1)} / 5`),
  ]
  const sourceTag = <span className={clsx('ml-1 text-xs font-medium', stats.isDemo ? 'text-warn' : 'text-ok')}>({t(stats.isDemo ? 'impact.demoBadge' : 'impact.liveBadge')})</span>
  const subjectOf = (id: string) => EXPERIMENTS.find((e) => e.id === id)?.subject
  const empty = <p className="flex h-full items-center justify-center text-sm text-muted">{t('impact.noData')}</p>
  const popular = stats.popularExperiments.map((p) => ({ name: t(`catalog.${p.id}.title`), sessions: p.sessions }))
  const subjects = stats.subjectDistribution.map((s) => ({ name: t(`nav.${s.subject}`), value: s.share, color: c[s.subject] }))
  const monthFmt = new Intl.DateTimeFormat(i18n.language, { month: 'short' })
  const monthly = stats.monthlySessions.map((m) => ({ month: monthFmt.format(new Date(m.month + '-01T00:00:00')), sessions: m.sessions }))
  const ttip = tooltipProps(c)

  return (
    <Container className="py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">{t('nav.impact')}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">{t('impact.title')}</h1>
          <p className="mt-3 text-lg leading-relaxed text-muted">{t('impact.intro')}</p>
        </div>
        <StatsSourceBadge stats={stats} />
      </div>

      {stats.isDemo ? (
        <div role="note" className="mt-8 flex items-start gap-3 rounded-2xl border border-warn/30 bg-warn-soft px-5 py-4 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{t('impact.demoExplain')}</p>
        </div>
      ) : (
        <p role="note" className="mt-8 text-sm text-muted">{t('impact.liveExplain')}</p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {tiles.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface px-5 py-5 shadow-card">
            <dt className="text-xs font-medium text-muted">{s.label}</dt>
            <dd className="tabular mt-1 text-3xl font-semibold tracking-tight text-ink">{s.value}</dd>
            {s.sub && <dd className="text-xs text-muted">{s.sub}</dd>}
            <StatSource tile={s} stats={stats} className="mt-2 text-[11px] font-semibold" />
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Panel title={<>{t('impact.popular')} {sourceTag}</>} className="lg:col-span-2">
          <div className="h-64" role="figure" aria-label={t('impact.popular')}>
            {popular.length === 0 ? empty : <ResponsiveContainer width="100%" height="100%">
              <BarChart data={popular} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid stroke={c.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickFormatter={(v) => fmtInt(v)} {...axisProps(c)} />
                <YAxis type="category" dataKey="name" width={150} {...axisProps(c)} />
                <Tooltip {...ttip} formatter={(v) => [fmtInt(Number(v)), t('impact.sessions')]} cursor={{ fill: c.band }} />
                <Bar dataKey="sessions" radius={[0, 6, 6, 0]} isAnimationActive={false}>
                  {stats.popularExperiments.map((p) => (
                    <Cell key={p.id} fill={c[subjectOf(p.id) ?? 'physics']} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
          </div>
        </Panel>
        <Panel title={<>{t('impact.bySubject')} {sourceTag}</>}>
          <div className="h-64" role="figure" aria-label={t('impact.bySubject')}>
            {subjects.length === 0 ? empty : <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subjects} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={3} isAnimationActive={false} stroke="none">
                  {subjects.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip {...ttip} formatter={(v, n) => [`${fmt(Number(v) * 100, 0)} %`, n]} />
              </PieChart>
            </ResponsiveContainer>}
          </div>
          <ul className="mt-2 flex justify-center gap-5 text-sm">
            {subjects.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-muted">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.name} <span className="tabular font-semibold text-ink">{fmt(s.value * 100, 0)} %</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={<>{t('impact.monthly')} {sourceTag}</>} className="lg:col-span-3">
          <div className="h-64" role="figure" aria-label={t('impact.monthly')}>
            {monthly.length === 0 ? empty : <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" {...axisProps(c)} />
                <YAxis width={60} allowDecimals={false} tickFormatter={(v) => fmtInt(v)} {...axisProps(c)} />
                <Tooltip {...ttip} formatter={(v) => [fmtInt(Number(v)), t('impact.sessions')]} cursor={{ fill: c.band }} />
                <Bar dataKey="sessions" fill={c.physics} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>}
          </div>
        </Panel>
      </div>

      {stats.isDemo && (
        <section className="mt-10 rounded-2xl border border-line bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink">{t('impact.roadmapTitle')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('impact.roadmapText')}</p>
        </section>
      )}
    </Container>
  )
}
