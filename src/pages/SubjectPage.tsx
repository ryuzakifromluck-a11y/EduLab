import { Search, X } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { ExperimentCard } from '../components/ExperimentCard'
import { Segmented } from '../components/lab/controls'
import { Button, Container } from '../components/ui/primitives'
import { SUBJECT_STYLE } from '../components/ui/subjectStyle'
import { CATEGORIES, DIFFICULTY_RANK, experimentsBySubject, type Difficulty, type Subject } from '../data/experiments'
import { clsx } from 'clsx'

type DurationFilter = 'any' | 'short' | 'medium' | 'long'
type SortKey = 'recommended' | 'title' | 'duration' | 'difficulty'
type StatusFilter = 'all' | 'available' | 'planned'

const matchesDuration = (d: number, f: DurationFilter) =>
  f === 'any' || (f === 'short' && d <= 15) || (f === 'medium' && d > 15 && d <= 25) || (f === 'long' && d > 25)

export default function SubjectPage({ subject }: { subject: Subject }) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = params.get('category') ?? 'all'
  const difficulty = (params.get('difficulty') ?? 'any') as Difficulty | 'any'
  const duration = (params.get('duration') ?? 'any') as DurationFilter
  const sort = (params.get('sort') ?? 'recommended') as SortKey
  const status = (params.get('status') ?? 'all') as StatusFilter

  const set = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const all = experimentsBySubject(subject)
  const style = SUBJECT_STYLE[subject]
  const Icon = style.icon

  const results = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase()
    const list = all.filter((e) => {
      if (category !== 'all' && e.category !== category) return false
      if (difficulty !== 'any' && e.difficulty !== difficulty) return false
      if (!matchesDuration(e.duration, duration)) return false
      if (status !== 'all' && e.status !== status) return false
      if (needle) {
        const hay = [t(`catalog.${e.id}.title`), t(`catalog.${e.id}.description`), t(`categories.${subject}.${e.category}`)]
          .join(' ')
          .toLocaleLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
    const byStatus = (a: (typeof list)[0], b: (typeof list)[0]) => (a.status === b.status ? 0 : a.status === 'available' ? -1 : 1)
    return list.sort((a, b) => {
      const s = byStatus(a, b)
      if (s) return s
      switch (sort) {
        case 'title':
          return t(`catalog.${a.id}.title`).localeCompare(t(`catalog.${b.id}.title`))
        case 'duration':
          return a.duration - b.duration
        case 'difficulty':
          return DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]
        default:
          return a.order - b.order
      }
    })
  }, [all, q, category, difficulty, duration, sort, status, subject, t])

  const available = all.filter((e) => e.status === 'available')
  // Once every experiment of a subject is built, the status filter and the "planned" note have nothing to say.
  const hasPlanned = available.length < all.length
  const filtersActive = q || category !== 'all' || difficulty !== 'any' || duration !== 'any' || status !== 'all'
  const selectClass = 'h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink'

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          className={clsx('pointer-events-none absolute inset-0', style.glow)}
          aria-hidden
        />
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <Container className="relative py-14 sm:py-16">
          <span
            className={clsx('inline-flex h-12 w-12 items-center justify-center rounded-2xl', style.chip)}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{t(`subject.${subject}.title`)}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{t(`subject.${subject}.intro`)}</p>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-xs text-muted">{t('subject.availableNow')}</dt>
              <dd className="tabular text-2xl font-semibold text-ink">{available.length}</dd>
            </div>
            {hasPlanned && (
              <div>
                <dt className="text-xs text-muted">{t('subject.inDevelopment')}</dt>
                <dd className="tabular text-2xl font-semibold text-ink">{all.length - available.length}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-muted">{t('subject.categories')}</dt>
              <dd className="tabular text-2xl font-semibold text-ink">{CATEGORIES[subject].length}</dd>
            </div>
          </dl>
        </Container>
      </section>

      {/* Featured strip */}
      <section className="py-12" aria-labelledby="subject-featured">
        <Container>
          <h2 id="subject-featured" className="text-xl font-semibold tracking-tight text-ink">
            {t('subject.featured')}
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {available
              .filter((e) => e.featured)
              .map((e) => (
                <ExperimentCard key={e.id} experiment={e} />
              ))}
          </div>
        </Container>
      </section>

      {/* Library */}
      <section className="pb-8" aria-labelledby="library-heading">
        <Container>
          <div className="flex flex-col gap-1">
            <h2 id="library-heading" className="text-xl font-semibold tracking-tight text-ink">
              {t('library.title', { subject: t(`nav.${subject}`) })}
            </h2>
            <p className="text-sm text-muted">{hasPlanned ? t('library.subtitle') : t('library.subtitleAll')}</p>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="relative flex-1">
                <span className="sr-only">{t('library.search')}</span>
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => set('q', e.target.value, '')}
                  placeholder={t('library.searchPlaceholder', { subject: t(`nav.${subject}`) })}
                  className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-faint"
                />
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
                <label className="flex flex-col">
                  <span className="sr-only">{t('library.difficulty')}</span>
                  <select className={selectClass} value={difficulty} onChange={(e) => set('difficulty', e.target.value, 'any')}>
                    <option value="any">{t('library.anyDifficulty')}</option>
                    {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map((d) => (
                      <option key={d} value={d}>
                        {t(`difficulty.${d}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col">
                  <span className="sr-only">{t('library.duration')}</span>
                  <select className={selectClass} value={duration} onChange={(e) => set('duration', e.target.value, 'any')}>
                    {(['any', 'short', 'medium', 'long'] as DurationFilter[]).map((d) => (
                      <option key={d} value={d}>
                        {t(`library.durations.${d}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="col-span-2 flex flex-col sm:col-span-1">
                  <span className="sr-only">{t('library.sort')}</span>
                  <select className={selectClass} value={sort} onChange={(e) => set('sort', e.target.value, 'recommended')}>
                    {(['recommended', 'title', 'duration', 'difficulty'] as SortKey[]).map((s) => (
                      <option key={s} value={s}>
                        {t('library.sortBy', { key: t(`library.sorts.${s}`) })}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('library.categories')}>
                {['all', ...CATEGORIES[subject]].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={category === cat}
                    onClick={() => set('category', cat, 'all')}
                    className={clsx(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      category === cat ? style.chipActive : 'border-line text-muted hover:text-ink',
                    )}
                  >
                    {cat === 'all' ? t('library.allCategories') : t(`categories.${subject}.${cat}`)}
                  </button>
                ))}
              </div>
              {hasPlanned && (
                <Segmented
                  label={t('library.status')}
                  value={status}
                  onChange={(v) => set('status', v, 'all')}
                  options={(['all', 'available', 'planned'] as StatusFilter[]).map((s) => ({ value: s, label: t(`library.statuses.${s}`) }))}
                />
              )}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-muted" aria-live="polite">
            <span>{t('library.results', { count: results.length })}</span>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
                <X className="h-3.5 w-3.5" aria-hidden />
                {t('library.clear')}
              </Button>
            )}
          </div>

          {results.length ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((e) => (
                <ExperimentCard key={e.id} experiment={e} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-line px-6 py-16 text-center text-sm text-muted">
              {t('library.empty')}
            </div>
          )}
          {hasPlanned && <p className="mt-6 text-xs text-faint">{t('library.plannedNote')}</p>}
        </Container>
      </section>
    </>
  )
}
