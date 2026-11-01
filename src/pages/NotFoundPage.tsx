import { useTranslation } from 'react-i18next'
import { ButtonLink, Container } from '../components/ui/primitives'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Container className="py-24 text-center">
      <p className="tabular text-sm font-semibold text-brand">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{t('notFound.title')}</h1>
      <p className="mt-3 text-muted">{t('notFound.text')}</p>
      <ButtonLink to="/" variant="primary" className="mt-8">
        {t('notFound.cta')}
      </ButtonLink>
    </Container>
  )
}
