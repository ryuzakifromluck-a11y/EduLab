import { Crown, Pause, Play, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'
import type { PublicStudent, RemoteReading, RoomSummary } from '../../lib/remoteCode'
import { SubjectBadge } from '../ui/badges'

const reading = (r: RemoteReading) => `${r.value}${r.unit ? ` ${r.unit}` : ''}`

function ReadingList({ items, title }: { items: RemoteReading[]; title: string }) {
  if (!items.length) return null
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">{title}</p>
      <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-xs">
        {items.map((r) => (
          <div key={r.label} className="contents">
            <dt className="truncate text-muted" title={r.label}>
              {r.label}
            </dt>
            <dd className="tabular text-right font-semibold text-ink">{reading(r)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** One small card per student with what they have open and their live values. */
export function StudentGrid({ students, rooms = [], now }: { students: PublicStudent[]; rooms?: RoomSummary[]; now: number }) {
  const { t } = useTranslation()
  const controllers = new Set(rooms.flatMap((r) => (r.controllerId ? [r.controllerId] : [])))
  if (!students.length) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line p-8 text-center">
        <UsersRound className="h-8 w-8 text-faint" aria-hidden />
        <p className="font-medium text-ink">{t('remote.teacher.waiting')}</p>
        <p className="max-w-sm text-sm text-muted">{t('remote.teacher.waitingHint')}</p>
      </div>
    )
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={t('remote.teacher.students')}>
      {students.map((s) => {
        const { experimentId, subject, running, params, readings, updatedAt } = s.state
        const ago = Math.max(0, Math.round((now - updatedAt) / 1000))
        return (
          <li key={s.id} className={clsx('flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card', !s.online && 'opacity-60')}>
            <div className="flex items-center gap-2">
              <span
                className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', s.online ? 'bg-ok' : 'bg-faint')}
                role="img"
                aria-label={s.online ? t('remote.teacher.online') : t('remote.teacher.offline')}
              />
              <p className="min-w-0 flex-1 truncate font-semibold text-ink" title={s.name}>
                {s.name}
              </p>
              <span className="tabular shrink-0 text-xs text-faint">{s.online ? t('remote.teacher.secondsAgo', { count: ago }) : t('remote.teacher.offline')}</span>
            </div>
            {s.roomCode && (
              <p className="inline-flex items-center gap-1.5 self-start rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                {controllers.has(s.id) && <Crown className="h-3 w-3 text-brand" aria-hidden />}
                {controllers.has(s.id) ? t('remote.teacher.roomController', { code: s.roomCode }) : t('remote.teacher.roomMember', { code: s.roomCode })}
              </p>
            )}
            {experimentId && subject ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <SubjectBadge subject={subject} />
                  <span className="min-w-0 truncate text-sm font-medium text-ink">{t(`catalog.${experimentId}.title`, { defaultValue: experimentId })}</span>
                  <span className={clsx('ml-auto inline-flex items-center gap-1 text-xs', running ? 'text-ok' : 'text-muted')}>
                    {running ? <Play className="h-3 w-3" aria-hidden /> : <Pause className="h-3 w-3" aria-hidden />}
                    {running ? t('remote.teacher.running') : t('remote.teacher.paused')}
                  </span>
                </div>
                <ReadingList title={t('remote.teacher.parameters')} items={params.slice(0, 5)} />
                <ReadingList title={t('remote.teacher.readings')} items={readings.slice(0, 4)} />
              </>
            ) : (
              <p className="text-sm text-muted">{t('remote.teacher.browsing')}</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
