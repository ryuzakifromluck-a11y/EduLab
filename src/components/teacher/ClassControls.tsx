import { Lock, LockOpen, Send, Undo2 } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUBJECTS, availableExperiments } from '../../data/experiments'
import type { ClassControl, PublicStudent } from '../../lib/remoteCode'
import { useRemoteSession } from '../../store/remoteSession'
import { Button, Card } from '../ui/primitives'

/**
 * The teacher's steering wheel: send one experiment to every student (they can
 * choose to stay where they are) and lock every screen while explaining.
 */
export function ClassControls({ control, students }: { control: ClassControl; students: PublicStudent[] }) {
  const { t } = useTranslation()
  const setControl = useRemoteSession((s) => s.setControl)
  const error = useRemoteSession((s) => s.controlError)
  const [choice, setChoice] = useState(() => control.push?.experimentId ?? availableExperiments()[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const headingId = useId()
  const selectId = useId()

  const run = async (body: Parameters<typeof setControl>[0]) => {
    setBusy(true)
    await setControl(body)
    setBusy(false)
  }

  const push = control.push
  const online = students.filter((s) => s.online)
  const onIt = push ? online.filter((s) => s.state.experimentId === push.experimentId).length : 0

  return (
    <Card as="section" aria-labelledby={headingId} className="flex flex-col gap-4 p-5">
      <h2 id={headingId} className="text-base font-semibold text-ink">
        {t('remote.class.title')}
      </h2>
      <div className="flex flex-col gap-2">
        <label htmlFor={selectId} className="text-sm font-medium text-ink">
          {t('remote.class.pickLabel')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id={selectId}
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-brand"
          >
            {SUBJECTS.map((subject) => (
              <optgroup key={subject} label={t(`nav.${subject}`)}>
                {availableExperiments(subject).map((e) => (
                  <option key={e.id} value={e.id}>
                    {t(`catalog.${e.id}.title`)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Button variant="primary" disabled={busy || !choice} onClick={() => void run({ push: choice })}>
            <Send className="h-4 w-4" aria-hidden />
            {t('remote.class.send')}
          </Button>
        </div>
        <p className="text-xs text-muted">{t('remote.class.sendHint')}</p>
      </div>

      {push && (
        <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-soft/60 px-3 py-2 text-sm">
          <span className="min-w-0 flex-1 text-ink">
            {t('remote.class.sent', { title: t(`catalog.${push.experimentId}.title`, { defaultValue: push.experimentId }) })}{' '}
            <span className="tabular text-muted">{t('remote.class.onIt', { count: onIt, total: online.length })}</span>
          </span>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ push: null })}>
            <Undo2 className="h-4 w-4" aria-hidden />
            {t('remote.class.withdraw')}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button
          variant={control.locked ? 'primary' : 'secondary'}
          aria-pressed={control.locked}
          disabled={busy}
          onClick={() => void run({ locked: !control.locked })}
        >
          {control.locked ? <LockOpen className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
          {control.locked ? t('remote.class.unlock') : t('remote.class.lock')}
        </Button>
        <p role="status" className="min-w-0 flex-1 text-xs text-muted">
          {control.locked ? t('remote.class.lockedHint') : t('remote.class.lockHint')}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {t(`remote.errors.${error}`, { defaultValue: t('remote.errors.network') })}
        </p>
      )}
    </Card>
  )
}
