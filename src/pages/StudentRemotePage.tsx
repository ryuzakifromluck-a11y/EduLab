import { Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ConnectedView, JoinSession } from '../components/student/JoinSession'
import { QRScanner } from '../components/student/QRScanner'
import { Card, Container } from '../components/ui/primitives'
import { formatCode, isValidCode, normalizeCode } from '../lib/remoteCode'
import { useRemoteSession } from '../store/remoteSession'

/** `/student/remote` (scan or type a code) and `/student/remote/:code` (the link inside the QR code). */
export default function StudentRemotePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { code: param } = useParams()
  const ticket = useRemoteSession((s) => s.ticket)
  const status = useRemoteSession((s) => s.studentStatus)
  const code = param ? normalizeCode(param) : null

  const goTo = (c: string) => navigate(`/student/remote/${formatCode(c)}`)
  const reset = () => navigate('/student/remote')

  let body
  if (ticket && (!code || code === ticket.code)) body = <ConnectedView />
  else if (code && isValidCode(code)) body = <JoinSession key={code} code={code} onChangeCode={reset} />
  else
    body = (
      <Card className="mx-auto w-full max-w-md p-6">
        {code && (
          <p role="alert" className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            {t('remote.errors.invalidCode')}
          </p>
        )}
        <QRScanner onCode={goTo} />
      </Card>
    )

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto mb-8 flex max-w-3xl flex-col items-center gap-3 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Smartphone className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t('remote.student.title')}</h1>
        <p className="text-base leading-relaxed text-muted">{t('remote.student.intro')}</p>
        {status === 'ended' && !ticket && (
          <p role="status" className="rounded-xl bg-warn-soft px-4 py-2 text-sm text-warn">
            {t('remote.student.ended')}
          </p>
        )}
      </div>
      {body}
    </Container>
  )
}
