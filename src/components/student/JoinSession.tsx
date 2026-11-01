import { ArrowRight, CheckCircle2, LogOut, WifiOff } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { availableExperiments, experimentPath } from '../../data/experiments'
import { formatCode } from '../../lib/remoteCode'
import { ApiError } from '../../services/api'
import { remoteApi } from '../../services/remoteApi'
import { useAuth } from '../../store/auth'
import { useRemoteSession } from '../../store/remoteSession'
import { SubjectBadge } from '../ui/badges'
import { Button, Card } from '../ui/primitives'

const NAME_KEY = 'edulab-remote-name'

function storedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

/** Shown once a student is in a session: the experiments to open, and a way out. */
export function ConnectedView() {
  const { t } = useTranslation()
  const ticket = useRemoteSession((s) => s.ticket)!
  const status = useRemoteSession((s) => s.studentStatus)
  const leave = useRemoteSession((s) => s.leave)
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <CheckCircle2 className="h-10 w-10 shrink-0 text-ok" aria-hidden />
        <div className="min-w-0 flex-1" role="status">
          <h2 className="text-lg font-semibold text-ink">{t('remote.student.connected', { name: ticket.name })}</h2>
          <p className="mt-1 text-sm text-muted">{t('remote.student.connectedText', { code: formatCode(ticket.code) })}</p>
          {status === 'offline' && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-warn">
              <WifiOff className="h-4 w-4" aria-hidden />
              {t('remote.student.reconnecting')}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => void leave()} className="self-start sm:self-auto">
          <LogOut className="h-4 w-4" aria-hidden />
          {t('remote.student.leave')}
        </Button>
      </Card>
      <section aria-labelledby="remote-pick-heading">
        <h2 id="remote-pick-heading" className="text-base font-semibold text-ink">
          {t('remote.student.pick')}
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {availableExperiments().map((e) => (
            <li key={e.id}>
              <Link to={experimentPath(e)} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-brand">
                <SubjectBadge subject={e.subject} />
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{t(`catalog.${e.id}.title`)}</span>
                <ArrowRight className="h-4 w-4 text-muted group-hover:text-brand" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/** Name entry for a session code that came from the QR link or the scanner. */
export function JoinSession({ code, onChangeCode }: { code: string; onChangeCode: () => void }) {
  const { t } = useTranslation()
  const user = useAuth((s) => s.user)
  const join = useRemoteSession((s) => s.join)
  const [name, setName] = useState(() => storedName() || user?.name || '')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const nameId = useId()
  const errorId = useId()

  // Tell the student straight away if the code is wrong or the session has ended.
  // (The page keys this component by code, so state starts fresh for each code.)
  useEffect(() => {
    let cancelled = false
    remoteApi
      .sessionInfo(code)
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.code : 'network'))
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [code])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('nameRequired')
    setBusy(true)
    setError(null)
    try {
      await join(code, name)
      try {
        localStorage.setItem(NAME_KEY, name.trim())
      } catch {
        /* optional */
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.code : 'network')
    } finally {
      setBusy(false)
    }
  }

  const fatal = error === 'sessionNotFound' || error === 'invalidCode' || error === 'sessionFull'
  return (
    <Card className="mx-auto flex w-full max-w-md flex-col gap-5 p-6">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-wide text-faint uppercase">{t('remote.teacher.codeLabel')}</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-[0.15em] text-ink">{formatCode(code)}</p>
      </div>
      {fatal ? (
        <>
          <p role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            {t(`remote.errors.${error}`)}
          </p>
          <Button variant="primary" onClick={onChangeCode}>
            {t('remote.student.tryAnother')}
          </Button>
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <label htmlFor={nameId} className="text-sm font-medium text-ink">
            {t('remote.student.yourName')}
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoComplete="name"
            autoFocus
            aria-invalid={error === 'nameRequired'}
            aria-describedby={`${nameId}-hint${error ? ` ${errorId}` : ''}`}
            className="h-11 rounded-xl border border-line bg-surface px-3 text-ink focus:border-brand"
          />
          <p id={`${nameId}-hint`} className="text-xs text-muted">
            {t('remote.student.nameHint')}
          </p>
          {error && (
            <p id={errorId} role="alert" className="text-sm text-danger">
              {t(`remote.errors.${error}`, { defaultValue: t('remote.errors.network') })}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" disabled={busy || checking}>
            {busy ? t('common.loading') : t('remote.student.join')}
          </Button>
          <button type="button" onClick={onChangeCode} className="text-sm text-muted hover:text-ink">
            {t('remote.student.tryAnother')}
          </button>
        </form>
      )}
    </Card>
  )
}
