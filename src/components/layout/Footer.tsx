import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Container } from '../ui/primitives'
import { InstallButton } from './InstallBanner'
import { LanguageSelect } from './LanguageSelect'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  const col = 'flex flex-col gap-2.5 text-sm'
  const link = 'text-muted hover:text-ink'
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">{t('footer.mission')}</p>
          <p className="mt-3 text-sm font-medium text-ink">{t('brand.slogan')}</p>
        </div>
        <div className={col}>
          <h2 className="text-xs font-semibold tracking-wide text-faint uppercase">{t('footer.explore')}</h2>
          <Link to="/physics" className={link}>{t('nav.physics')}</Link>
          <Link to="/chemistry" className={link}>{t('nav.chemistry')}</Link>
          <Link to="/biology" className={link}>{t('nav.biology')}</Link>
          <Link to="/impact" className={link}>{t('nav.impact')}</Link>
          <Link to="/teacher/remote" className={link}>{t('nav.teacherRemote')}</Link>
          <Link to="/student/remote" className={link}>{t('nav.joinClass')}</Link>
        </div>
        <div className={col}>
          <h2 className="text-xs font-semibold tracking-wide text-faint uppercase">{t('footer.edulab')}</h2>
          <Link to="/about" className={link}>{t('nav.about')}</Link>
          <Link to="/about#contact" className={link}>{t('footer.contact')}</Link>
          <Link to="/about#privacy" className={link}>{t('footer.privacy')}</Link>
          <Link to="/about#open" className={link}>{t('footer.openMission')}</Link>
        </div>
        <div className={col}>
          <h2 className="text-xs font-semibold tracking-wide text-faint uppercase">{t('nav.language')}</h2>
          <LanguageSelect className="self-start" />
          <InstallButton className="mt-2" />
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} EduLab · {t('footer.free')}</span>
          <span>{t('brand.tagline')}</span>
        </Container>
      </div>
    </footer>
  )
}
