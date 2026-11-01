import { Clock, QrCode, RadioTower, UsersRound, WifiOff, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { REMOTE_POLL_MS } from '../../lib/remoteCode'
import { useRemoteSession } from '../../store/remoteSession'
import { Button, Card } from '../ui/primitives'
import { QRCodeGenerator } from './QRCodeGenerator'
import { StudentGrid } from './StudentGrid'

/** Re-renders every second for countdowns and "seconds ago" labels. */
function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function TeacherDashboard() {
  const { t } = useTranslation()
  const { teacher, classView, teacherStatus, teacherError, openSession, refreshClass, closeSession, dismissTeacher } = useRemoteSession()
  const [opening, setOpening] = useState(false)
  const live = !!teacher && teacherStatus !== 'ended'
  const now = useNow(live)

  // Poll the class every 2 seconds while the session is open and the tab is visible.
  useEffect(() => {
    if (!live) return
    void refreshClass()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshClass()
    }, REMOTE_POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && void refreshClass()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [live, teacher?.code, refreshClass])

  const open = async () => {
    setOpening(true)
    await openSession()
    setOpening(false)
  }

  if (!teacher) {
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-5 p-8 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <QrCode className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-ink">{t('remote.teacher.startTitle')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('remote.teacher.startText')}</p>
        </div>
        <ol className="flex w-full flex-col gap-2 text-left text-sm text-muted">
          {(['step1', 'step2', 'step3'] as const).map((k, i) => (
            <li key={k} className="flex gap-3">
              <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">{i + 1}</span>
              <span>{t(`remote.teacher.${k}`)}</span>
            </li>
          ))}
        </ol>
        <Button variant="primary" size="lg" onClick={open} disabled={opening}>
          <RadioTower className="h-5 w-5" aria-hidden />
          {opening ? t('common.loading') : t('remote.teacher.open')}
        </Button>
        {teacherError && (
          <p role="alert" className="text-sm text-danger">
            {t(`remote.errors.${teacherError}`, { defaultValue: t('remote.errors.network') })}
          </p>
        )}
      </Card>
    )
  }

  if (teacherStatus === 'ended') {
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <XCircle className="h-10 w-10 text-faint" aria-hidden />
        <h2 className="text-xl font-semibold text-ink">{t('remote.teacher.ended')}</h2>
        <p className="text-sm text-muted">{t('remote.teacher.endedText')}</p>
        <Button variant="primary" onClick={dismissTeacher}>
          {t('remote.teacher.openNew')}
        </Button>
      </Card>
    )
  }

  const students = classView?.students ?? []
  const online = students.filter((s) => s.online).length
  const left = teacher.expiresAt - now
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card as="aside" className="flex flex-col gap-5 self-start p-6">
        <QRCodeGenerator code={teacher.code} />
        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
          <div>
            <dt className="flex items-center gap-1.5 text-muted">
              <UsersRound className="h-4 w-4" aria-hidden />
              {t('remote.teacher.joined')}
            </dt>
            <dd className="tabular mt-1 text-lg font-semibold text-ink">
              {online}
              <span className="text-sm font-normal text-muted"> / {students.length}</span>
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-muted">
              <Clock className="h-4 w-4" aria-hidden />
              {t('remote.teacher.closesIn')}
            </dt>
            <dd className="tabular mt-1 text-lg font-semibold text-ink">{mmss(left)}</dd>
          </div>
        </dl>
        <Button variant="secondary" onClick={() => void closeSession()}>
          <XCircle className="h-4 w-4" aria-hidden />
          {t('remote.teacher.close')}
        </Button>
      </Card>
      <section aria-labelledby="remote-students-heading" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="remote-students-heading" className="text-lg font-semibold text-ink">
            {t('remote.teacher.students')}
          </h2>
          {teacherStatus === 'offline' ? (
            <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
              <WifiOff className="h-3.5 w-3.5" aria-hidden />
              {t('remote.teacher.reconnecting')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-ok" aria-hidden />
              {t('remote.teacher.liveHint')}
            </span>
          )}
        </div>
        <StudentGrid students={students} now={now} />
      </section>
    </div>
  )
}
