import { Beaker, FlaskConical, Search, X } from 'lucide-react'
import { lazy, Suspense, useMemo, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageLoader } from '../components/PageLoader'
import { ExperimentCard } from '../components/ExperimentCard'
import { Segmented } from '../components/lab/controls'
import { Button, Container } from '../components/ui/primitives'
import { SUBJECT_STYLE } from '../components/ui/subjectStyle'
import { CATEGORIES, DIFFICULTY_RANK, experimentsBySubject, type Difficulty, type Subject } from '../data/experiments'
import { clsx } from 'clsx'

type DurationFilter = 'any' | 'short' | 'medium' | 'long'
type SortKey = 'recommended' | 'title' | 'duration' | 'difficulty'
type StatusFilter = 'all' | 'available' | 'planned'

const ChemistryItemsPage = lazy(() => import('./ChemistryItemsPage'))

export type SubjectTab = 'experiments' | 'items'

/** Subjects with an Items (lab equipment) tab next to their experiments. */
const SUBJECT_TABS: Partial<Record<Subject, SubjectTab[]>> = { chemistry: ['experiments', 'items'] }

const tabPath = (subject: Subject, tab: SubjectTab) => (tab === 'experiments' ? `/${subject}` : `/${subject}/${tab}`)

const matchesDuration = (d: number, f: DurationFilter) =>
  f === 'any' || (f === 'short' && d <= 15) || (f === 'medium' && d > 15 && d <= 25) || (f === 'long' && d > 25)

export default function SubjectPage({ subject, tab = 'experiments' }: { subject: Subject; tab?: SubjectTab }) {
  const { t } = useTranslation()
  const tabs = SUBJECT_TABS[subject]
  const activeTab = tabs?.includes(tab) ? tab : 'experiments'
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

      {tabs && <SubjectTabs subject={subject} tabs={tabs} active={activeTab} />}

      {activeTab === 'items' ? (
        <section className="py-8 sm:py-10" {...(tabs ? tabPanelProps('items') : {})}>
          <Container>
            <div className="mb-6 flex flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight text-ink">{t('chemItems.title')}</h2>
              <p className="max-w-3xl text-sm text-muted">{t('chemItems.intro')}</p>
            </div>
            <Suspense fallback={<PageLoader />}>
              <ChemistryItemsPage />
            </Suspense>
          </Container>
        </section>
      ) : (
        <div {...(tabs ? tabPanelProps('experiments') : {})}>
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
        </div>
      )}
    </>
  )
}

const tabId = (tab: SubjectTab) => `subject-tab-${tab}`
const panelId = (tab: SubjectTab) => `subject-panel-${tab}`
const tabPanelProps = (tab: SubjectTab) => ({ role: 'tabpanel', id: panelId(tab), 'aria-labelledby': tabId(tab), tabIndex: -1 })

const TAB_ICON = { experiments: FlaskConical, items: Beaker } as const

/**
 * Experiments | Items switcher (WAI-ARIA tabs). Each tab has its own URL (/chemistry and
 * /chemistry/items) so the Items view can be linked; arrow keys, Home and End move between tabs.
 */
function SubjectTabs({ subject, tabs, active }: { subject: Subject; tabs: SubjectTab[]; active: SubjectTab }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const style = SUBJECT_STYLE[subject]

  const go = (tab: SubjectTab) => {
    if (tab !== active) navigate(tabPath(subject, tab), { preventScrollReset: true })
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.indexOf(active)
    const last = tabs.length - 1
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1
    if (next < 0) return
    e.preventDefault()
    go(tabs[next])
    refs.current[next]?.focus()
  }

  return (
    <div className="sticky top-16 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <Container>
        <div role="tablist" aria-label={t('subject.tabs.label', { subject: t(`nav.${subject}`) })} className="flex gap-1" onKeyDown={onKeyDown}>
          {tabs.map((tab, i) => {
            const Icon = TAB_ICON[tab]
            const selected = tab === active
            return (
              <button
                key={tab}
                ref={(el) => {
                  refs.current[i] = el
                }}
                type="button"
                role="tab"
                id={tabId(tab)}
                aria-selected={selected}
                aria-controls={panelId(tab)}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(tab)}
                className={clsx(
                  '-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                  selected ? clsx('border-current', style.ink) : 'border-transparent text-muted hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {t(`subject.tabs.${tab}`)}
              </button>
            )
          })}
        </div>
      </Container>
    </div>
  )
}
