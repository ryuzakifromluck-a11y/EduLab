import { ArrowRight, Lock } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { experimentPath, type Experiment } from '../data/experiments'
import { CompletedBadge } from './lab/CompletionPanel'
import { DifficultyBadge, DurationBadge, SubjectBadge } from './ui/badges'
import { ExperimentIllustration } from './ExperimentIllustration'
import { Badge } from './ui/primitives'
import { SUBJECT_STYLE } from './ui/subjectStyle'
import { clsx } from 'clsx'

export function ExperimentCard({ experiment: e, showSubject = false }: { experiment: Experiment; showSubject?: boolean }) {
  const { t } = useTranslation()
  const available = e.status === 'available'
  const title = t(`catalog.${e.id}.title`)
  const titleId = useId()
  return (
    <article
      aria-labelledby={titleId}
      className={clsx(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition',
        available && 'motion-safe:hover:-translate-y-0.5 hover:border-brand/40',
      )}
    >
      <ExperimentIllustration id={e.illustration} subject={e.subject} className={clsx('h-36', !available && 'opacity-70')} />
      {!available && (
        <Badge className="absolute top-3 right-3 bg-surface text-muted ring-1 ring-line">
          <Lock className="h-3 w-3" aria-hidden />
          {t('library.planned')}
        </Badge>
      )}
      {available && <CompletedBadge experimentId={e.id} className="absolute top-3 right-3 bg-surface/90 text-ok ring-1 ring-line" />}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {showSubject && <SubjectBadge subject={e.subject} />}
          <span className="text-xs font-medium text-muted">{t(`categories.${e.subject}.${e.category}`)}</span>
        </div>
        <h3 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
          {available ? (
            <Link to={experimentPath(e)} className="after:absolute after:inset-0 focus-visible:outline-none">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        <p className="text-sm leading-relaxed text-muted">{t(`catalog.${e.id}.description`)}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <DifficultyBadge difficulty={e.difficulty} />
            <DurationBadge minutes={e.duration} />
          </div>
          {available ? (
            <span
              className={clsx(
                'inline-flex items-center gap-1 text-sm font-semibold',
                SUBJECT_STYLE[e.subject].ink,
              )}
              aria-hidden
            >
              {t('common.start')}
              <ArrowRight className="h-4 w-4 transition motion-safe:group-hover:translate-x-0.5" />
            </span>
          ) : (
            <span className="text-xs text-faint">{t('library.inDevelopment')}</span>
          )}
        </div>
      </div>
    </article>
  )
}
