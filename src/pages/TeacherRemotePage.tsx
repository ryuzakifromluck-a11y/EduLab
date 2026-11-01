import { Presentation } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TeacherDashboard } from '../components/teacher/TeacherDashboard'
import { Container } from '../components/ui/primitives'

export default function TeacherRemotePage() {
  const { t } = useTranslation()
  return (
    <Container className="py-10 sm:py-14">
      <div className="mb-8 flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Presentation className="h-6 w-6" aria-hidden />
        </span>
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{t('remote.teacher.title')}</h1>
          <p className="mt-2 text-base leading-relaxed text-muted">{t('remote.teacher.intro')}</p>
        </div>
      </div>
      <TeacherDashboard />
    </Container>
  )
}
