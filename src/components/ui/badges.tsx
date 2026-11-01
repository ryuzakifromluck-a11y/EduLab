import { Clock, Gauge } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Difficulty, Subject } from '../../data/experiments'
import { Badge } from './primitives'
import { SUBJECT_STYLE } from './subjectStyle'
import { clsx } from 'clsx'

export function SubjectBadge({ subject, className }: { subject: Subject; className?: string }) {
  const { t } = useTranslation()
  const Icon = SUBJECT_STYLE[subject].icon
  return (
    <Badge className={clsx(SUBJECT_STYLE[subject].chip, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {t(`nav.${subject}`)}
    </Badge>
  )
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useTranslation()
  const bars = difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <Gauge className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{t('library.difficulty')}: </span>
      {t(`difficulty.${difficulty}`)}
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={clsx('h-2.5 w-1 rounded-full', i <= bars ? 'bg-ink/60' : 'bg-line')} />
        ))}
      </span>
    </span>
  )
}

export function DurationBadge({ minutes }: { minutes: number }) {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {t('common.minutes', { count: minutes })}
    </span>
  )
}
