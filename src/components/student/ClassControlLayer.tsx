import { ArrowRight, Lock, LogOut, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { experimentPath } from '../../data/experiments'
import { announce } from '../../lib/announce'
import type { PushTarget } from '../../lib/remoteCode'
import { useRemoteSession } from '../../store/remoteSession'
import { Button } from '../ui/primitives'

const pushPath = (p: PushTarget) => experimentPath({ subject: p.subject, id: p.experimentId })

/** Seconds before a pushed experiment opens by itself, unless the student chooses first. */
export const PUSH_COUNTDOWN_S = 10

/**
 * Mounted once in the app layout. For a student in a class session it shows
 * what the teacher asked for: an experiment sent to everyone (with a way to
 * stay put) and the "eyes on me" screen lock. Renders nothing otherwise.
 */
export function ClassControlLayer() {
  const ticket = useRemoteSession((s) => s.ticket)
  const control = useRemoteSession((s) => s.control)
  const pushSeen = useRemoteSession((s) => s.pushSeen)
  const acknowledgePush = useRemoteSession((s) => s.acknowledgePush)
  const { pathname } = useLocation()

  const push = ticket ? control?.push : null
  const pending = !!push && push.seq > pushSeen
  const alreadyThere = !!push && pathname === pushPath(push)

  // Someone already on the pushed experiment has nothing to decide.
  useEffect(() => {
    if (push && pending && alreadyThere) acknowledgePush(push.seq)
  }, [pending, alreadyThere, push, acknowledgePush])

  if (!ticket) return null
  return (
    <>
      {push && pending && !alreadyThere && !control?.locked && <PushPrompt key={push.seq} push={push} />}
      {control?.locked && <LockOverlay />}
    </>
  )
}

function PushPrompt({ push }: { push: PushTarget }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const acknowledgePush = useRemoteSession((s) => s.acknowledgePush)
  const [left, setLeft] = useState(PUSH_COUNTDOWN_S)
  const [paused, setPaused] = useState(false)
  const titleId = useId()
  const title = t(`catalog.${push.experimentId}.title`, { defaultValue: push.experimentId })

  const go = () => {
    acknowledgePush(push.seq)
    navigate(pushPath(push))
  }
  const stay = () => {
    acknowledgePush(push.seq)
    announce(t('remote.class.stayed'))
  }

  useEffect(() => {
    announce(t('remote.class.pushAnnounce', { title, count: PUSH_COUNTDOWN_S }), 'assertive')
    // Announce once per push.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The countdown waits while the student is using the prompt (keyboard focus or pointer over it).
  useEffect(() => {
    if (paused) return
    if (left <= 0) {
      go()
      return
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, paused])

  return (
    <div
      role="region"
      aria-labelledby={titleId}
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-lg sm:inset-x-auto sm:right-6"
      onFocus={() => setPaused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setPaused(false)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Send className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p id={titleId} className="font-semibold text-ink">
            {t('remote.class.pushTitle', { title })}
          </p>
          <p className="tabular mt-1 text-sm text-muted">{paused ? t('remote.class.pushPaused') : t('remote.class.pushCountdown', { count: left })}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={stay}>
          <X className="h-4 w-4" aria-hidden />
          {t('remote.class.stay')}
        </Button>
        <Button variant="primary" size="sm" onClick={go}>
          {t('remote.class.openNow')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

/**
 * Full-screen "eyes on your teacher" screen, as a native modal dialog: it goes
 * to the top layer (above any other open dialog) and makes the rest of the page
 * inert (no clicks, no keyboard focus, hidden from screen readers) until the
 * teacher unlocks. Escape does not close it. Leaving the session is always
 * possible: joining was the student's choice.
 */
function LockOverlay() {
  const { t } = useTranslation()
  const leave = useRemoteSession((s) => s.leave)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const textId = useId()

  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    announce(t('remote.class.lockedAnnounce'), 'assertive')
    return () => {
      if (dialog?.open) dialog.close()
      previous?.focus?.()
      announce(t('remote.class.unlockedAnnounce'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={textId}
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Lock className="h-7 w-7" aria-hidden />
        </span>
        <h2 id={titleId} className="text-xl font-semibold text-ink">
          {t('remote.class.lockedTitle')}
        </h2>
        <p id={textId} className="text-sm leading-relaxed text-muted">
          {t('remote.class.lockedText')}
        </p>
        <Button variant="ghost" size="sm" onClick={() => void leave()}>
          <LogOut className="h-4 w-4" aria-hidden />
          {t('remote.student.leave')}
        </Button>
      </div>
    </dialog>,
    document.body,
  )
}
