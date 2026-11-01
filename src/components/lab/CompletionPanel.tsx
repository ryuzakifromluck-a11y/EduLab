import { CheckCircle2, Flag, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import type { ProgressSettings } from '../../lib/progressModel'
import { useAuth } from '../../store/auth'
import { useProgress } from '../../store/progress'
import { Badge, Button, ButtonLink } from '../ui/primitives'

export function CompletedBadge({ experimentId, className }: { experimentId: string; className?: string }) {
  const { t } = useTranslation()
  const done = useProgress((s) => !!s.records[experimentId])
  if (!done) return null
  return (
    <Badge className={className ?? 'bg-ok/15 text-ok'}>
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      {t('progress.completedBadge')}
    </Badge>
  )
}

/**
 * End-of-experiment prompt. Signed-in users save a completed run (with the
 * current parameters and an optional score); guests are invited to sign in
 * and are brought back here afterwards.
 */
export function CompletionPanel({
  experimentId,
  settings,
  score,
  onComplete,
}: {
  experimentId: string
  settings?: ProgressSettings
  score?: number | null
  onComplete?: () => void
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const record = useProgress((s) => s.records[experimentId])
  const complete = useProgress((s) => s.complete)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const save = async () => {
    setState('saving')
    try {
      await complete(experimentId, { settings, score })
      setState('saved')
      onComplete?.()
    } catch {
      setState('error')
    }
  }

  const next = encodeURIComponent(location.pathname + location.search)
  const saved = state === 'saved' && record

  return (
    <section
      aria-labelledby="completion-title"
      aria-live="polite"
      className="mt-5 flex flex-col gap-4 rounded-2xl border border-line bg-surface px-5 py-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          {saved ? <CheckCircle2 className="h-5 w-5" aria-hidden /> : <Flag className="h-5 w-5" aria-hidden />}
        </span>
        <div>
          <h2 id="completion-title" className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
            {saved ? t('progress.saved') : t('progress.finishTitle')}
            {!saved && <CompletedBadge experimentId={experimentId} />}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {saved
              ? t('progress.savedText', { count: record.attempts })
              : state === 'error'
                ? <span role="alert" className="text-warn">{t('progress.saveFailed')}</span>
                : isAuthenticated
                  ? t('progress.finishText')
                  : t('progress.finishTextGuest')}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {!isAuthenticated ? (
          <ButtonLink to={`/login?next=${next}`} variant="primary">
            <LogIn className="h-4 w-4" aria-hidden />
            {t('progress.signInToSave')}
          </ButtonLink>
        ) : (
          <>
            {saved && <ButtonLink to="/account">{t('progress.viewAccount')}</ButtonLink>}
            <Button variant={saved ? 'secondary' : 'primary'} onClick={save} disabled={state === 'saving'}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {state === 'saving' ? t('progress.saving') : record ? t('progress.markAgain') : t('progress.markComplete')}
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
