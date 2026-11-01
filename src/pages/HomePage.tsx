import { Activity, ArrowRight, BarChart3, Info, MousePointerClick, SlidersHorizontal, Telescope } from 'lucide-react'
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ExperimentCard } from '../components/ExperimentCard'
import { ExperimentIllustration } from '../components/ExperimentIllustration'
import { Badge, ButtonLink, Container, SectionHeading } from '../components/ui/primitives'
import { SUBJECT_STYLE } from '../components/ui/subjectStyle'
import { EXPERIMENTS, SUBJECTS, availableExperiments, experimentsBySubject, type IllustrationId, type Subject } from '../data/experiments'
import { useReducedMotion } from '../lib/hooks'
import { hasWebGL } from '../lib/webgl'
import { fmt, fmtInt } from '../lib/format'
import { analytics, type ImpactStats } from '../services/analytics'
import { clsx } from 'clsx'

const HeroScene = lazy(() => import('../components/home/HeroScene'))

class Quiet extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function HeroVisual() {
  const reduced = useReducedMotion()
  const fallback = (
    <div className="grid h-full grid-cols-2 gap-4 p-6">
      <ExperimentIllustration id="pendulum" subject="physics" className="rounded-2xl" />
      <ExperimentIllustration id="titration" subject="chemistry" className="rounded-2xl" />
    </div>
  )
  if (!hasWebGL()) return fallback
  return (
    <Quiet fallback={fallback}>
      <Suspense fallback={null}>
        <HeroScene animate={!reduced} />
      </Suspense>
    </Quiet>
  )
}

const SUBJECT_ART: Record<Subject, IllustrationId> = { physics: 'pendulum', chemistry: 'titration', biology: 'dna' }

function SubjectCard({ subject }: { subject: Subject }) {
  const { t } = useTranslation()
  const all = experimentsBySubject(subject)
  const available = all.filter((e) => e.status === 'available').length
  const planned = all.length - available
  const style = SUBJECT_STYLE[subject]
  const Icon = style.icon
  return (
    <Link
      to={`/${subject}`}
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-7 shadow-card transition motion-safe:hover:-translate-y-0.5 sm:p-9',
        style.hoverBorder,
      )}
    >
      <div
        className={clsx(
          'pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-60 blur-3xl',
          style.soft,
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-6">
        <div>
          <span
            className={clsx('inline-flex h-12 w-12 items-center justify-center rounded-2xl', style.chip)}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <h3 className="mt-5 text-sm font-semibold tracking-[0.18em] text-muted uppercase">{t(`nav.${subject}`)}</h3>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{t(`home.subjects.${subject}.tagline`)}</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{t(`home.subjects.${subject}.description`)}</p>
        </div>
        <ExperimentIllustration
          id={SUBJECT_ART[subject]}
          subject={subject}
          className="hidden h-28 w-36 shrink-0 rounded-2xl sm:flex lg:hidden 2xl:flex"
        />
      </div>
      <div className="relative mt-auto flex flex-wrap items-center justify-between gap-4 pt-8">
        <p className="text-sm text-muted">
          <span className="text-ink font-semibold">{t('home.subjects.available', { count: available })}</span>
          {planned > 0 && (
            <>
              {' · '}
              {t('home.subjects.planned', { count: planned })}
            </>
          )}
        </p>
        <span className={clsx('inline-flex items-center gap-1.5 text-sm font-semibold', style.ink)}>
          {t(`home.subjects.${subject}.cta`)}
          <ArrowRight className="h-4 w-4 transition motion-safe:group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

export function DemoBadge() {
  const { t } = useTranslation()
  return (
    <Badge className="bg-warn-soft text-warn ring-1 ring-warn/30">
      <Info className="h-3 w-3" aria-hidden />
      {t('impact.demoBadge')}
    </Badge>
  )
}

export function LiveBadge() {
  const { t } = useTranslation()
  return (
    <Badge className="bg-surface-2 text-ok ring-1 ring-ok/30">
      <Activity className="h-3 w-3" aria-hidden />
      {t('impact.liveBadge')}
    </Badge>
  )
}

/** Live or demo badge, depending on where the stats came from. */
export function StatsSourceBadge({ stats }: { stats: ImpactStats }) {
  return stats.isDemo ? <DemoBadge /> : <LiveBadge />
}

export interface StatTile {
  label: string
  value: string
  sub?: string
  /** Counted from the catalog, so real even when the rest is demo data. */
  catalog?: boolean
  /** The provider does not measure this figure. */
  missing?: boolean
}

/** Builds a tile for a figure the backend may not measure (`null`). */
export function optionalTile(label: string, value: number | null, format: (v: number) => string): StatTile {
  return value === null ? { label, value: '—', missing: true } : { label, value: format(value) }
}

/** Label under a stat tile: catalog figures are always real, the rest follow the provider. */
export function StatSource({ tile, stats, className }: { tile: StatTile; stats: ImpactStats; className?: string }) {
  const { t } = useTranslation()
  if (tile.missing) return <dd className={clsx(className, 'text-muted')}>{t('impact.notMeasured')}</dd>
  const real = tile.catalog || !stats.isDemo
  const label = tile.catalog ? t('impact.liveFromCatalog') : stats.isDemo ? t('impact.demoValue') : t('impact.liveValue')
  return <dd className={clsx(className, real ? 'text-ok' : 'text-warn')}>{label}</dd>
}

function ImpactTeaser() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<ImpactStats | null>(null)
  useEffect(() => {
    analytics.getImpactStats().then(setStats)
  }, [])
  if (!stats) return null
  const items: StatTile[] = [
    { label: t('impact.totalExperiments'), value: fmtInt(stats.totalExperiments), catalog: true },
    { label: t('impact.totalSessions'), value: fmtInt(stats.totalSessions) },
    optionalTile(t('impact.countries'), stats.countriesReached, fmtInt),
    { label: t('impact.completed'), value: fmtInt(stats.completedSessions) },
    optionalTile(t('impact.rating'), stats.averageRating, (v) => `${fmt(v, 1)} / 5`),
  ]
  return (
    <section className="py-20" aria-labelledby="impact-heading">
      <Container>
        <div className="rounded-3xl border border-line bg-surface p-7 shadow-card sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading id="impact-heading" eyebrow={t('home.impact.eyebrow')} title={t('home.impact.title')} description={t('home.impact.description')} />
            <StatsSourceBadge stats={stats} />
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
            {items.map((s) => (
              <div key={s.label} className="rounded-2xl bg-surface-2 px-5 py-4">
                <dt className="text-xs font-medium text-muted">{s.label}</dt>
                <dd className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">{s.value}</dd>
                <StatSource tile={s} stats={stats} className="mt-1 text-[11px] font-medium" />
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-xs leading-relaxed text-muted">{t(stats.isDemo ? 'impact.demoExplain' : 'impact.liveExplain')}</p>
            <ButtonLink to="/impact" variant="secondary" size="sm">
              {t('home.impact.cta')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  const featured = (subject: Subject) => availableExperiments(subject).filter((e) => e.featured)
  const steps = [
    { icon: MousePointerClick, key: 'choose' },
    { icon: SlidersHorizontal, key: 'adjust' },
    { icon: Telescope, key: 'observe' },
    { icon: BarChart3, key: 'analyze' },
  ]
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_75%_20%,color-mix(in_srgb,var(--physics)_16%,transparent),transparent_70%),radial-gradient(45%_60%_at_95%_90%,color-mix(in_srgb,var(--chemistry)_14%,transparent),transparent_70%)]"
          aria-hidden
        />
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <Badge className="bg-surface text-muted ring-1 ring-line">
              <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden />
              {t('home.hero.badge')}
            </Badge>
            <h1 className="mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {t('home.hero.title')}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{t('home.hero.subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/#subjects" variant="primary" size="lg">
                {t('home.hero.primary')}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink to="/#how-it-works" variant="secondary" size="lg">
                {t('home.hero.secondary')}
              </ButtonLink>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {['noAccount', 'realModels', 'languages'].map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-brand" aria-hidden />
                  {t(`home.hero.points.${k}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative h-[320px] sm:h-[400px] lg:h-[460px]">
            <HeroVisual />
          </div>
        </Container>
      </section>

      {/* Subjects */}
      <section id="subjects" className="scroll-mt-20 py-20" aria-labelledby="subjects-heading">
        <Container>
          <SectionHeading id="subjects-heading" eyebrow={t('home.subjects.eyebrow')} title={t('home.subjects.title')} description={t('home.subjects.description')} />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {SUBJECTS.map((s) => (
              <SubjectCard key={s} subject={s} />
            ))}
          </div>
        </Container>
      </section>

      {/* Featured */}
      <section className="border-y border-line bg-surface-2/50 py-20" aria-labelledby="featured-heading">
        <Container>
          <SectionHeading id="featured-heading" eyebrow={t('home.featured.eyebrow')} title={t('home.featured.title')} description={t('home.featured.description')} />
          {SUBJECTS.map((s) => {
            const SubjectIcon = SUBJECT_STYLE[s].icon
            return (
            <div key={s} className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em] text-muted uppercase">
                  <SubjectIcon className={clsx('h-4 w-4', SUBJECT_STYLE[s].text)} aria-hidden />
                  {t(`nav.${s}`)}
                </h3>
                <Link to={`/${s}`} className="text-sm font-medium text-muted hover:text-ink">
                  {t('home.featured.viewAll', { subject: t(`nav.${s}`) })} →
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featured(s).map((e) => (
                  <ExperimentCard key={e.id} experiment={e} showSubject />
                ))}
              </div>
            </div>
            )
          })}
        </Container>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 py-20" aria-labelledby="how-heading">
        <Container>
          <SectionHeading id="how-heading" eyebrow={t('home.how.eyebrow')} title={t('home.how.title')} description={t('home.how.description')} />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, key }, i) => (
              <li key={key} className="relative rounded-2xl border border-line bg-surface p-6 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="tabular text-sm font-semibold text-faint">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-semibold text-ink">{t(`home.how.steps.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`home.how.steps.${key}.text`)}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <ImpactTeaser />

      {/* Mission strip */}
      <section className="pb-4">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-[#0e1525] px-7 py-12 text-white sm:px-12">
            <div className="hero-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
            <div className="relative max-w-3xl">
              <p className="text-sm font-semibold tracking-[0.18em] text-[#9aadff] uppercase">{t('brand.slogan')}</p>
              <p className="mt-4 text-2xl leading-snug font-semibold tracking-tight sm:text-3xl">{t('home.mission.title')}</p>
              <p className="mt-4 text-base leading-relaxed text-white/70">
                {t('home.mission.text', { count: EXPERIMENTS.length })}
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}
