import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { reportError } from '../lib/monitoring'
import { Button, ButtonLink, Container } from '../components/ui/primitives'

/** Router-level error screen: reports the error and offers a reload. Rendered without the app layout. */
export default function RouteErrorPage() {
  const error = useRouteError()
  const { t } = useTranslation()

  useEffect(() => {
    if (isRouteErrorResponse(error)) reportError(new Error(`Route error ${error.status}: ${error.statusText}`), 'react')
    else reportError(error, 'react')
  }, [error])

  return (
    <main className="min-h-screen bg-bg">
      <Container className="py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">{t('appError.title')}</h1>
        <p className="mx-auto mt-3 max-w-prose text-muted">{t('appError.text')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="primary" onClick={() => window.location.reload()}>
            {t('appError.reload')}
          </Button>
          <ButtonLink to="/">{t('appError.home')}</ButtonLink>
        </div>
      </Container>
    </main>
  )
}
