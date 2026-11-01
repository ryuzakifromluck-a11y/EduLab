import { Radio, WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import type { Experiment } from '../../data/experiments'
import { formatCode } from '../../lib/remoteCode'
import { toRemoteReadings } from '../../lib/remoteReport'
import { IDLE_REPORT, useRemoteSession } from '../../store/remoteSession'

interface ReadingLike {
  label: unknown
  value: string
  unit?: string
}

/**
 * Mounted by every experiment page. When the student has joined a teacher's
 * session it publishes the experiment's parameters and readings; the reporter
 * in `store/remoteSession` sends them every 2 s. Renders nothing.
 */
export function RemoteBroadcast({
  experiment,
  params,
  measurements,
  running,
}: {
  experiment: Experiment
  params?: readonly ReadingLike[]
  measurements: readonly ReadingLike[]
  running?: boolean
}) {
  const ticket = useRemoteSession((s) => s.ticket)
  const setReport = useRemoteSession((s) => s.setReport)

  // The page re-renders ~15×/s while a simulation runs; setReport ignores unchanged reports.
  const active = !!ticket
  const p = toRemoteReadings(params)
  const r = toRemoteReadings(measurements, 6)
  const key = active ? JSON.stringify([experiment.id, p, r, !!running]) : ''
  useEffect(() => {
    if (!active) return
    setReport({ experimentId: experiment.id, subject: experiment.subject, params: p, readings: r, running: !!running })
    // `key` captures every value used above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  useEffect(() => () => useRemoteSession.getState().setReport(IDLE_REPORT), [])

  return null
}

/** A small "live with teacher" chip for the experiment header; nothing when not in a session. */
export function LiveSessionBadge() {
  const { t } = useTranslation()
  const ticket = useRemoteSession((s) => s.ticket)
  const status = useRemoteSession((s) => s.studentStatus)
  if (!ticket) return null
  const offline = status === 'offline'
  return (
    <Link
      to={`/student/remote/${formatCode(ticket.code)}`}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        offline ? 'bg-warn-soft text-warn' : 'bg-brand-soft text-brand',
      )}
      title={t('remote.student.liveTitle')}
    >
      {offline ? <WifiOff className="h-3.5 w-3.5" aria-hidden /> : <Radio className="h-3.5 w-3.5" aria-hidden />}
      {offline ? t('remote.student.reconnecting') : t('remote.student.liveBadge', { code: formatCode(ticket.code) })}
    </Link>
  )
}
