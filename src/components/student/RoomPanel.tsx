import { ArrowRight, Crown, Hand, LogOut, Plus, UsersRound } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import type { Experiment } from '../../data/experiments'
import { experimentPath } from '../../data/experiments'
import { announce } from '../../lib/announce'
import { ROOM_CODE_LENGTH, normalizeCode, type RemoteReading, type RoomView } from '../../lib/remoteCode'
import { useRemoteSession } from '../../store/remoteSession'
import { Button, Card } from '../ui/primitives'

const reading = (r: RemoteReading) => `${r.value}${r.unit ? ` ${r.unit}` : ''}`

function useRoomError() {
  const { t } = useTranslation()
  const err = useRemoteSession((s) => s.roomError)
  return err ? t(`remote.errors.${err}`, { defaultValue: t('remote.errors.network') }) : null
}

/** Says out loud when control of the room changes hands. */
function useControlAnnouncer(room: RoomView | null, me: string | undefined) {
  const { t } = useTranslation()
  const last = useRef(room?.controllerId)
  useEffect(() => {
    const id = room?.controllerId
    if (!room || id === last.current) return
    last.current = id
    const name = room.members.find((m) => m.id === id)?.name
    if (id === me) announce(t('remote.room.youControlAnnounce'))
    else if (name) announce(t('remote.room.controlsAnnounce', { name }))
  }, [room, me, t])
}

/**
 * On the student's session page: start a shared room, join one by its code,
 * or manage the one they are in (who controls, hand over, leave).
 */
export function RoomPanel() {
  const { t } = useTranslation()
  const ticket = useRemoteSession((s) => s.ticket)
  const room = useRemoteSession((s) => s.room)
  const locked = useRemoteSession((s) => !!s.control?.locked)
  const roomAction = useRemoteSession((s) => s.roomAction)
  const error = useRoomError()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const headingId = useId()
  const codeId = useId()
  const errorId = useId()
  const me = ticket?.studentId
  useControlAnnouncer(room, me)

  const run = async (req: Parameters<typeof roomAction>[0]) => {
    setBusy(true)
    const ok = await roomAction(req)
    setBusy(false)
    return ok
  }
  const join = async (e: FormEvent) => {
    e.preventDefault()
    if (await run({ action: 'join', roomCode: code })) setCode('')
  }

  return (
    <Card as="section" aria-labelledby={headingId} className="flex flex-col gap-4 p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <UsersRound className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-semibold text-ink">
            {room ? t('remote.room.inRoom', { code: room.code }) : t('remote.room.title')}
          </h2>
          <p className="mt-1 text-sm text-muted">{room ? t('remote.room.inRoomText') : t('remote.room.intro')}</p>
        </div>
      </div>

      {room ? (
        <>
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line" aria-label={t('remote.room.members')}>
            {room.members.map((m) => {
              const controls = m.id === room.controllerId
              const asked = room.requests.includes(m.id)
              return (
                <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span
                    className={clsx('h-2 w-2 shrink-0 rounded-full', m.online ? 'bg-ok' : 'bg-faint')}
                    role="img"
                    aria-label={m.online ? t('remote.teacher.online') : t('remote.teacher.offline')}
                  />
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {m.name}
                    {m.id === me && <span className="text-muted"> {t('remote.room.you')}</span>}
                  </span>
                  {controls && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                      <Crown className="h-3 w-3" aria-hidden />
                      {t('remote.room.controller')}
                    </span>
                  )}
                  {asked && !controls && <span className="text-xs text-muted">{t('remote.room.asked')}</span>}
                  {room.controllerId === me && !controls && (
                    <Button size="sm" variant="subtle" disabled={busy || locked} onClick={() => void run({ action: 'handover', to: m.id })}>
                      {t('remote.room.giveControl')}
                      <span className="sr-only"> {m.name}</span>
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-muted">{t('remote.room.shareCode', { code: room.code })}</p>
          <div className="flex flex-wrap gap-2">
            <ControlRequestButton room={room} me={me} busy={busy} run={run} />
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void run({ action: 'leave' })}>
              <LogOut className="h-4 w-4" aria-hidden />
              {t('remote.room.leave')}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Button variant="primary" disabled={busy || locked} onClick={() => void run({ action: 'create' })}>
            <Plus className="h-4 w-4" aria-hidden />
            {t('remote.room.create')}
          </Button>
          <form onSubmit={join} className="flex flex-1 flex-col gap-1.5" noValidate>
            <label htmlFor={codeId} className="text-sm font-medium text-ink">
              {t('remote.room.codeLabel')}
            </label>
            <div className="flex gap-2">
              <input
                id={codeId}
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value).slice(0, ROOM_CODE_LENGTH))}
                maxLength={ROOM_CODE_LENGTH}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-describedby={error ? errorId : undefined}
                className="h-10 w-28 rounded-xl border border-line bg-surface px-3 font-mono tracking-[0.2em] text-ink uppercase focus:border-brand"
              />
              <Button type="submit" variant="secondary" disabled={busy || locked || code.length !== ROOM_CODE_LENGTH}>
                {t('remote.room.join')}
              </Button>
            </div>
          </form>
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  )
}

function ControlRequestButton({
  room,
  me,
  busy,
  run,
}: {
  room: RoomView
  me: string | undefined
  busy: boolean
  run: (req: { action: 'request' | 'claim' }) => Promise<boolean>
}) {
  const { t } = useTranslation()
  const locked = useRemoteSession((s) => !!s.control?.locked)
  if (!me || room.controllerId === me) return null
  const holder = room.members.find((m) => m.id === room.controllerId)
  if (!holder || !holder.online) {
    return (
      <Button variant="primary" size="sm" disabled={busy || locked} onClick={() => void run({ action: 'claim' })}>
        <Crown className="h-4 w-4" aria-hidden />
        {t('remote.room.takeControl')}
      </Button>
    )
  }
  const asked = room.requests.includes(me)
  return (
    <Button variant="subtle" size="sm" disabled={busy || asked || locked} onClick={() => void run({ action: 'request' })}>
      <Hand className="h-4 w-4" aria-hidden />
      {asked ? t('remote.room.asked') : t('remote.room.askControl')}
    </Button>
  )
}

/** The room strip on an experiment page: who controls, and what to do about it. Nothing outside a room. */
export function RoomBar({ experiment, following, statusId }: { experiment: Experiment; following: boolean; statusId?: string }) {
  const { t } = useTranslation()
  const room = useRemoteSession((s) => s.room)
  const me = useRemoteSession((s) => s.ticket?.studentId)
  const roomAction = useRemoteSession((s) => s.roomAction)
  const error = useRoomError()
  const [busy, setBusy] = useState(false)
  useControlAnnouncer(room, me)
  if (!room) return null

  const run = async (req: Parameters<typeof roomAction>[0]) => {
    setBusy(true)
    const ok = await roomAction(req)
    setBusy(false)
    return ok
  }
  const shared = room.shared
  const holder = room.members.find((m) => m.id === room.controllerId)
  const iControl = room.controllerId === me
  const elsewhere = !iControl && shared.experimentId && shared.subject && shared.experimentId !== experiment.id
  const sameUnsupported = !iControl && !following && shared.experimentId === experiment.id
  const askers = iControl ? room.members.filter((m) => room.requests.includes(m.id)) : []

  let status: string
  if (iControl) status = t('remote.room.youControl', { count: room.members.length - 1 })
  else if (!holder) status = t('remote.room.noController')
  else if (following) status = t('remote.room.following', { name: holder.name })
  else if (elsewhere) status = t('remote.room.elsewhere', { name: holder.name, title: t(`catalog.${shared.experimentId}.title`, { defaultValue: shared.experimentId }) })
  else if (sameUnsupported) status = t('remote.room.sameUnsupported', { name: holder.name })
  else status = t('remote.room.notStarted', { name: holder.name })

  return (
    <section aria-label={t('remote.room.inRoom', { code: room.code })} className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand-soft/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
          <UsersRound className="h-4 w-4 text-brand" aria-hidden />
          {t('remote.room.inRoom', { code: room.code })}
        </span>
        <p id={statusId} className="order-last min-w-0 basis-full text-sm text-muted sm:order-none sm:basis-0 sm:flex-1">
          {status}
        </p>
        <div className="flex flex-wrap gap-2">
          {elsewhere && shared.subject && (
            <Link
              to={experimentPath({ subject: shared.subject, id: shared.experimentId! })}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-medium text-white hover:bg-brand-strong dark:text-[#0a0e17]"
            >
              {t('remote.room.goThere')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
          <ControlRequestButton room={room} me={me} busy={busy} run={run} />
          {askers.map((m) => (
            <Button key={m.id} size="sm" variant="subtle" disabled={busy} onClick={() => void run({ action: 'handover', to: m.id })}>
              <Hand className="h-4 w-4" aria-hidden />
              {t('remote.room.giveTo', { name: m.name })}
            </Button>
          ))}
        </div>
      </div>
      {sameUnsupported && (shared.params.length > 0 || shared.readings.length > 0) && (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 text-xs sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
          {[...shared.params, ...shared.readings].map((r) => (
            <div key={r.label} className="contents">
              <dt className="truncate text-muted" title={r.label}>
                {r.label}
              </dt>
              <dd className="tabular text-right font-semibold text-ink">{reading(r)}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  )
}
