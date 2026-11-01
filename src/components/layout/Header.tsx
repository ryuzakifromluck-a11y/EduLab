import { LogIn, Menu, Moon, Sun, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import { ButtonLink, Container, IconButton } from '../ui/primitives'
import { LanguageSelect } from './LanguageSelect'
import { Logo } from './Logo'
import { clsx } from 'clsx'

const NAV = [
  { to: '/', key: 'home', end: true },
  { to: '/physics', key: 'physics' },
  { to: '/chemistry', key: 'chemistry' },
  { to: '/biology', key: 'biology' },
  { to: '/about', key: 'about' },
  { to: '/impact', key: 'impact' },
] as const

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useUi()
  return (
    <IconButton label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')} onClick={toggleTheme}>
      {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </IconButton>
  )
}

export function Header() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const user = useAuth((s) => s.user)
  const location = useLocation()
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => setOpen(false), [location.pathname])
  // Escape closes the mobile menu and returns focus to its button.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      menuButton.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'text-ink bg-surface-2' : 'text-muted hover:text-ink',
    )

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-md">
      <Container className="flex h-16 items-center gap-4">
        <Link to="/" className="shrink-0 rounded-lg" aria-label={t('nav.homeAria')}>
          <Logo />
        </Link>
        <nav aria-label={t('nav.main')} className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={'end' in n} className={linkClass}>
              {t(`nav.${n.key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSelect className="hidden sm:inline-flex" />
          <ThemeToggle />
          {user ? (
            <NavLink
              to="/account"
              className={({ isActive }) =>
                clsx(
                  'hidden h-9 max-w-44 items-center gap-2 rounded-lg px-3 text-sm font-medium sm:inline-flex',
                  isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink',
                )
              }
            >
              <UserRound className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{user.name.split(' ')[0] || t('nav.account')}</span>
            </NavLink>
          ) : (
            <span className="hidden items-center gap-1.5 sm:inline-flex">
              <NavLink
                to="/login"
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted hover:text-ink"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {t('nav.signIn')}
              </NavLink>
              <ButtonLink to="/signup" variant="primary" size="sm">
                {t('nav.signUp')}
              </ButtonLink>
            </span>
          )}
          <IconButton
            ref={menuButton}
            label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            className="lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </IconButton>
        </div>
      </Container>
      {open && (
        <div id="mobile-nav" className="border-t border-line bg-bg lg:hidden">
          <Container className="flex flex-col gap-1 py-3">
            <nav aria-label={t('nav.main')} className="flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={'end' in n} className={linkClass}>
                  {t(`nav.${n.key}`)}
                </NavLink>
              ))}
              {user ? (
                <NavLink to="/account" className={linkClass}>
                  {t('nav.account')}
                </NavLink>
              ) : (
                <>
                  <NavLink to="/login" className={linkClass}>
                    {t('nav.signIn')}
                  </NavLink>
                  <NavLink to="/signup" className={linkClass}>
                    {t('nav.signUp')}
                  </NavLink>
                </>
              )}
            </nav>
            <LanguageSelect className="mt-2 sm:hidden" />
          </Container>
        </div>
      )}
    </header>
  )
}
