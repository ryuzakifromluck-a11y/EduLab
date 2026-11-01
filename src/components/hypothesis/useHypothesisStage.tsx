import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Experiment } from '../../data/experiments'
import { hypothesisSpec } from '../../data/hypotheses'
import { announce } from '../../lib/announce'
import { emptyDraft } from '../../lib/hypothesis'
import type { ProgressSettings } from '../../lib/progressModel'
import { useHypotheses } from '../../store/hypothesis'
import { HypothesisBanner, HypothesisComparePanel } from './HypothesisCompare'
import { HypothesisPanel } from './HypothesisPanel'

/**
 * The hypothesis stage of an experiment page:
 *   1. on entry, a dialog asks for a hypothesis (unless one is already being tested,
 *      or the student skipped it in this browser session);
 *   2. a banner keeps the hypothesis in view while experimenting;
 *   3. at the end ("compare", or after marking the experiment complete) a panel
 *      compares the hypothesis with what happened and saves the result.
 *
 * Returns the three pieces for `ExperimentShell` to place, or nulls for
 * experiments without a hypothesis spec.
 */
export function useHypothesisStage(experiment: Experiment, settings: ProgressSettings = {}) {
  const { t } = useTranslation()
  const spec = experiment.hasHypothesis ? hypothesisSpec(experiment.id) : undefined
  const record = useHypotheses((s) => s.records[experiment.id])
  const { save, edit, recordResult, skip } = useHypotheses.getState()
  // Ask first: the form is open when the page opens, unless a hypothesis is in progress
  // or was skipped in this session. (Each experiment page mounts its own shell.)
  const [dialog, setDialog] = useState<null | 'new' | 'edit'>(() => {
    if (!spec) return null
    const { records, skipped } = useHypotheses.getState()
    const current = records[experiment.id]
    return !skipped.includes(experiment.id) && (!current || current.result) ? 'new' : null
  })
  const [compareOpen, setCompareOpen] = useState(false)
  const compareRef = useRef<HTMLElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  const open = (mode: 'new' | 'edit') => {
    opener.current = document.activeElement as HTMLElement | null
    setDialog(mode)
  }

  const close = () => {
    setDialog(null)
    // Return focus to whatever opened the dialog (the browser does this only for showModal's own trigger).
    requestAnimationFrame(() => opener.current?.focus?.())
  }

  const showCompare = () => {
    setCompareOpen(true)
    requestAnimationFrame(() => {
      compareRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      compareRef.current?.focus({ preventScroll: true })
    })
  }

  /** Called after the run is marked complete: compare if there is an untested hypothesis. */
  const onRunComplete = () => {
    const current = useHypotheses.getState().records[experiment.id]
    if (current && !current.result) showCompare()
  }

  if (!spec) return { dialog: null, banner: null, compare: null, onRunComplete }

  const dialogEl = (
    <HypothesisPanel
      spec={spec}
      open={dialog !== null}
      editing={dialog === 'edit'}
      initial={dialog === 'edit' && record ? record.draft : emptyDraft()}
      onSkip={() => {
        if (dialog === 'new') skip(experiment.id)
        close()
      }}
      onSubmit={(draft) => {
        if (dialog === 'edit' && record && !record.result) edit(experiment.id, draft)
        else {
          save(experiment.id, draft, settings)
          setCompareOpen(false)
        }
        announce(t('hypothesis.savedAnnounce'))
        close()
      }}
    />
  )

  const banner = <HypothesisBanner spec={spec} record={record} onMake={() => open('new')} onEdit={() => open('edit')} onCompare={showCompare} />

  const compare =
    compareOpen && record ? (
      <HypothesisComparePanel
        key={record.createdAt}
        ref={compareRef}
        spec={spec}
        record={record}
        settings={settings}
        onSave={(comparison, self, reflection) => {
          recordResult(experiment.id, comparison, self, reflection)
          announce(t('hypothesis.resultSavedAnnounce', { verdict: t(`hypothesis.verdict.${comparison.verdict}`) }))
        }}
        onNew={() => open('new')}
      />
    ) : null

  return { dialog: dialogEl, banner, compare, onRunComplete }
}
