import { CheckCircle2, CircleDashed } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Container } from '../components/ui/primitives'

const IMPLEMENTED = [
  'experiments',
  'models',
  'graphs',
  'formula',
  'presentation',
  'languages',
  'themes',
  'fallback',
  'csv',
  'accounts',
  'quiz',
  'hypothesis',
  'remote',
  'pwa',
  'ai',
] as const
const PLANNED = ['hypothesisAll', 'remoteRooms', 'analytics'] as const

export default function AboutPage() {
  const { t } = useTranslation()
  const section = 'scroll-mt-24 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8'
  return (
    <Container className="py-14">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-brand uppercase">{t('nav.about')}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{t('about.title')}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{t('about.intro')}</p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <section id="open" className={section}>
          <h2 className="text-xl font-semibold text-ink">{t('about.missionTitle')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t('about.missionText')}</p>
          <ul className="mt-4 flex flex-col gap-2 text-sm text-ink">
            {(['free', 'noLogin', 'anyDevice', 'classroom'] as const).map((k) => (
              <li key={k} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                {t(`about.principles.${k}`)}
              </li>
            ))}
          </ul>
        </section>
        <section className={section}>
          <h2 className="text-xl font-semibold text-ink">{t('about.accuracyTitle')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t('about.accuracyText')}</p>
        </section>
        <section className={section}>
          <h2 className="text-xl font-semibold text-ink">{t('about.statusTitle')}</h2>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-faint uppercase">{t('about.implemented')}</h3>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-ink">
            {IMPLEMENTED.map((k) => (
              <li key={k} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                {t(`about.features.${k}`)}
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-xs font-semibold tracking-wide text-faint uppercase">{t('about.planned')}</h3>
          <ul className="mt-2 flex flex-col gap-2 text-sm text-muted">
            {PLANNED.map((k) => (
              <li key={k} className="flex gap-2">
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t(`about.features.${k}`)}
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col gap-5">
          <section id="privacy" className={section}>
            <h2 className="text-xl font-semibold text-ink">{t('footer.privacy')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t('about.privacyText')}</p>
          </section>
          <section id="contact" className={section}>
            <h2 className="text-xl font-semibold text-ink">{t('footer.contact')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t('about.contactText')}</p>
          </section>
        </div>
      </div>
    </Container>
  )
}
