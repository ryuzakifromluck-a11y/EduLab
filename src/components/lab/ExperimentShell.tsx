import { BookOpen, ChevronRight, ClipboardList, Info, LineChart, MonitorPlay, Pause, Play, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import type { Experiment } from '../../data/experiments'
import { announce } from '../../lib/announce'
import { DifficultyBadge, DurationBadge, SubjectBadge } from '../ui/badges'
import { Button, Container } from '../ui/primitives'
import type { ProgressSettings } from '../../lib/progressModel'
import { CompletedBadge, CompletionPanel } from './CompletionPanel'
import { KnowledgeCheck } from '../quiz/KnowledgeCheck'
import { MeasurementGrid, Panel, type Measurement } from './controls'
import { AIAssistant } from '../ai/AIAssistant'
import { useHypothesisStage } from '../hypothesis/useHypothesisStage'
import { LiveSessionBadge, RemoteBroadcast } from '../student/RemoteBroadcast'
import type { TutorReading } from '../../../server/tutor/types'
import { clsx } from 'clsx'

export interface ExperimentGuide {
  instructions: ReactNode[]
  science: ReactNode
  conclusions: ReactNode
  model: ReactNode
}

export interface PresenterKeys {
  togglePlay?: () => void
  reset?: () => void
  increase?: () => void
  decrease?: () => void
  running?: boolean
}

interface Props {
  experiment: Experiment
  /** Renders the 3D/2D viewport; `large` is true in Presentation Mode. */
  viewport: (large: boolean) => ReactNode
  controls: ReactNode
  presenterControls: ReactNode
  measurements: Measurement[]
  presenterMeasurements?: Measurement[]
  charts: ReactNode
  presenterChart?: ReactNode
  formula: ReactNode
  guide: ExperimentGuide
  keys: PresenterKeys
  notice?: ReactNode
  /** Current parameters, saved with the user's progress when they mark the experiment complete. */
  progressSettings?: ProgressSettings
  /** Optional 0–100 score for the run (e.g. from a knowledge check); the best one is kept. */
  score?: number | null
  /** Called after a completed run has been saved. */
  onComplete?: () => void
  /** Current parameter values shared with the AI tutor as context. */
  tutorParams?: TutorReading[]
}

export function ExperimentShell(props: Props) {
  const [params, setParams] = useSearchParams()
  const presenting = params.get('mode') === 'present'

  const setPresenting = useCallback(
    (on: boolean) => {
      const next = new URLSearchParams(params)
      if (on) next.set('mode', 'present')
      else next.delete('mode')
      // flushSync: router navigations run as transitions, and the simulation's frequent
      // re-renders (useTicker) would otherwise keep interrupting this one indefinitely.
      setParams(next, { replace: false, flushSync: true })
    },
    [params, setParams],
  )

  // After leaving Presentation Mode, focus returns to the button that opened it.
  const presentButton = useRef<HTMLButtonElement>(null)
  const wasPresenting = useRef(presenting)
  useEffect(() => {
    if (wasPresenting.current && !presenting) presentButton.current?.focus()
    wasPresenting.current = presenting
  }, [presenting])

  return (
    <>
      {/* Publishes live state to a teacher's QR Remote Control session, if the student joined one. */}
      <RemoteBroadcast experiment={props.experiment} params={props.tutorParams} measurements={props.measurements} running={props.keys.running} />
      {presenting ? (
        <PresentationMode {...props} onExit={() => setPresenting(false)} />
      ) : (
        <StandardLayout {...props} presentButton={presentButton} onPresent={() => setPresenting(true)} />
      )}
    </>
  )
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** True when a key press should go to the focused control instead of a presenter shortcut. */
function controlOwnsKey(target: HTMLElement, key: string): boolean {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return true
  const role = target.getAttribute('role')
  if (role && ['radio', 'slider', 'tab', 'menuitem', 'application'].includes(role)) return true
  // Space/Enter activate a focused button or link natively.
  if ((key === ' ' || key === 'Enter') && target.closest('button, a[href], [role="switch"]')) return true
  return false
}

function StandardLayout({
  experiment: e,
  viewport,
  controls,
  measurements,
  charts,
  formula,
  guide,
  notice,
  progressSettings,
  score,
  onComplete,
  tutorParams,
  onPresent,
  presentButton,
}: Props & { onPresent: () => void; presentButton: RefObject<HTMLButtonElement | null> }) {
  const { t } = useTranslation()
  const hypothesis = useHypothesisStage(e, progressSettings)
  return (
    <Container className="py-6 sm:py-8">
      {hypothesis.dialog}
      <nav aria-label={t('lab.breadcrumb')} className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to={`/${e.subject}`} className="hover:text-ink">
              {t(`nav.${e.subject}`)}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <Link to={`/${e.subject}?category=${e.category}`} className="hover:text-ink">
              {t(`categories.${e.subject}.${e.category}`)}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span aria-current="page" className="text-ink">
              {t(`catalog.${e.id}.title`)}
            </span>
          </li>
        </ol>
      </nav>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <SubjectBadge subject={e.subject} />
            <DifficultyBadge difficulty={e.difficulty} />
            <DurationBadge minutes={e.duration} />
            <CompletedBadge experimentId={e.id} />
            <LiveSessionBadge />
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{t(`catalog.${e.id}.title`)}</h1>
          <p className="mt-2 text-base leading-relaxed text-muted">{t(`catalog.${e.id}.intro`)}</p>
        </div>
        <Button ref={presentButton} variant="primary" onClick={onPresent} className="self-start lg:self-auto">
          <MonitorPlay className="h-4 w-4" aria-hidden />
          {t('lab.presentationMode')}
        </Button>
      </div>

      {hypothesis.banner && <div className="mt-5">{hypothesis.banner}</div>}
      {notice && <div className="mt-5">{notice}</div>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {viewport(false)}
        <Panel title={t('lab.parameters')} icon={<SlidersHorizontal className="h-4 w-4" />} bodyClassName="flex flex-col gap-5">
          {controls}
        </Panel>
      </div>

      <section aria-label={t('lab.measurements')} className="mt-5">
        <h2 className="sr-only">{t('lab.measurements')}</h2>
        <MeasurementGrid items={measurements} />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {charts}
        {formula}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title={t('lab.instructions')} icon={<ClipboardList className="h-4 w-4" />}>
          <ol className="flex flex-col gap-3 text-sm leading-relaxed text-ink">
            {guide.instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-muted">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title={t('lab.theScience')} icon={<BookOpen className="h-4 w-4" />}>
          <div className="prose-sm flex flex-col gap-3 text-sm leading-relaxed text-muted">{guide.science}</div>
        </Panel>
        <Panel title={t('lab.conclusions')} icon={<LineChart className="h-4 w-4" />}>
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted">{guide.conclusions}</div>
        </Panel>
      </div>
      <div className="mt-5 flex gap-3 rounded-2xl border border-dashed border-line px-5 py-4 text-sm leading-relaxed text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <span className="font-semibold text-ink">{t('lab.modelAssumptions')}: </span>
          {guide.model}
        </div>
      </div>
      {hypothesis.compare}
      <CompletionPanel
        experimentId={e.id}
        settings={progressSettings}
        score={score}
        onComplete={() => {
          onComplete?.()
          hypothesis.onRunComplete()
        }}
      />
      <KnowledgeCheck experimentId={e.id} />
      <AIAssistant experiment={e} params={tutorParams} measurements={measurements} />
    </Container>
  )
}

function PresentationMode({
  experiment: e,
  viewport,
  presenterControls,
  measurements,
  presenterMeasurements,
  presenterChart,
  keys,
  onExit,
}: Props & { onExit: () => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [showGraph, setShowGraph] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const keysHelpId = useId()

  // Enter browser fullscreen when available; leaving fullscreen with Esc exits the mode.
  useEffect(() => {
    const el = ref.current
    let entered = false
    if (el && document.fullscreenEnabled && !document.fullscreenElement) {
      el.requestFullscreen()
        .then(() => (entered = true))
        .catch(() => {})
    }
    const onChange = () => {
      if (entered && !document.fullscreenElement) onExit()
    }
    document.addEventListener('fullscreenchange', onChange)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.body.style.overflow = prevOverflow
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The dialog is portalled to <body>; the rest of the app is made inert so that
  // Tab and screen-reader browsing stay inside it. Focus moves in on open.
  useEffect(() => {
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    ref.current?.focus()
    announce(t('lab.presentationOpened'))
    return () => root?.removeAttribute('inert')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard and presenter-clicker shortcuts (clickers send PageUp/PageDown or arrows).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement
      if (ev.key === 'Tab' && ref.current) {
        // Focus trap (fallback for browsers without `inert`).
        const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.tabIndex >= 0 && el.offsetParent !== null)
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        const active = document.activeElement
        if (ev.shiftKey && (active === first || active === ref.current)) {
          ev.preventDefault()
          last.focus()
        } else if (!ev.shiftKey && (active === last || !ref.current.contains(active))) {
          ev.preventDefault()
          first.focus()
        }
        return
      }
      if (ev.key !== 'Escape' && controlOwnsKey(target, ev.key)) return
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return
      switch (ev.key) {
        case ' ':
        case 'k':
          ev.preventDefault()
          keys.togglePlay?.()
          break
        case 'r':
        case 'R':
          if (keys.reset) {
            keys.reset()
            announce(t('lab.announceReset'))
          }
          break
        case 'ArrowUp':
        case 'ArrowRight':
        case 'PageDown':
          ev.preventDefault()
          keys.increase?.()
          break
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'PageUp':
          ev.preventDefault()
          keys.decrease?.()
          break
        case 'g':
        case 'G':
          setShowGraph((s) => !s)
          break
        case 'c':
        case 'C':
          setShowControls((s) => !s)
          break
        case 'Escape':
          if (!document.fullscreenElement) onExit()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keys, onExit, t])

  const big = 'h-14 px-5 text-lg'
  return createPortal(
    <div
      ref={ref}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-bg text-ink focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-label={`${t('lab.presentationMode')}: ${t(`catalog.${e.id}.title`)}`}
      aria-describedby={keysHelpId}
    >
      <div className="flex items-center gap-4 border-b border-line px-6 py-4">
        <SubjectBadge subject={e.subject} className="px-3 py-1 text-sm" />
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{t(`catalog.${e.id}.title`)}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="subtle" className={big} aria-pressed={showGraph} onClick={() => setShowGraph((s) => !s)}>
            <LineChart className="h-5 w-5" aria-hidden />
            <span className="hidden md:inline">{showGraph ? t('lab.hideGraph') : t('lab.showGraph')}</span>
          </Button>
          <Button variant="subtle" className={big} aria-pressed={showControls} onClick={() => setShowControls((s) => !s)}>
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
            <span className="hidden md:inline">{showControls ? t('lab.hideControls') : t('lab.showControls')}</span>
          </Button>
          <Button variant="secondary" className={big} onClick={onExit}>
            <X className="h-5 w-5" aria-hidden />
            <span className="hidden sm:inline">{t('lab.exitPresentation')}</span>
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-[260px] flex-1">{viewport(true)}</div>
          {showGraph && presenterChart && (
            <div className="h-[34vh] shrink-0" role="figure" aria-label={t('lab.liveGraphs')}>
              {presenterChart}
            </div>
          )}
        </div>
        <aside className="flex shrink-0 flex-col gap-4 xl:w-[380px]" aria-label={t('lab.measurements')}>
          <MeasurementGrid items={presenterMeasurements ?? measurements.slice(0, 4)} large />
        </aside>
      </div>

      {showControls && (
        <div className="flex flex-wrap items-center gap-4 border-t border-line bg-surface px-6 py-4">
          {keys.togglePlay && (
            <Button variant="primary" className="h-16 min-w-40 px-6 text-xl" onClick={keys.togglePlay}>
              {keys.running ? <Pause className="h-6 w-6" aria-hidden /> : <Play className="h-6 w-6" aria-hidden />}
              {keys.running ? t('lab.pause') : t('lab.play')}
            </Button>
          )}
          {keys.reset && (
            <Button
              variant="secondary"
              className="h-16 px-6 text-xl"
              onClick={() => {
                keys.reset?.()
                announce(t('lab.announceReset'))
              }}
            >
              <RotateCcw className="h-6 w-6" aria-hidden />
              {t('lab.reset')}
            </Button>
          )}
          <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-6">{presenterControls}</div>
          <p className={clsx('hidden text-sm text-muted 2xl:block')} aria-hidden>
            {t('lab.presenterKeys')}
          </p>
        </div>
      )}
      <p id={keysHelpId} className="sr-only">
        {t('lab.presenterKeys')}
      </p>
    </div>,
    document.body,
  )
}
