import { CloudCheck, CloudUpload, WifiOff } from 'lucide-react'
import { Suspense, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router-dom'
import { announce } from '../../lib/announce'
import { useOnline } from '../../lib/hooks'
import { useOutbox, usePendingCount } from '../../store/outbox'
import { LiveAnnouncer } from '../LiveAnnouncer'
import { SEO } from '../../seo/useSEO'
import { Footer } from './Footer'
import { Header } from './Header'
import { InstallBanner } from './InstallBanner'
import { ClassControlLayer } from '../student/ClassControlLayer'
import { PageLoader } from '../PageLoader'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

/**
 * Client-side navigation does not move focus or announce anything, so keyboard and
 * screen-reader users would stay on the link they activated. After a route change,
 * wait for the new page's heading (lazy pages keep the old page on screen while they
 * load), then move focus to <main> and announce the heading.
 */
function RouteFocus() {
  const { pathname } = useLocation()
  const first = useRef(true)
  const lastHeading = useRef<{ el: Element | null; text: string }>({ el: null, text: '' })
  useEffect(() => {
    const main = document.getElementById('main')
    const current = () => main?.querySelector('h1') ?? null
    // On the first load, only remember the heading (no focus move, the page just opened).
    const initial = first.current
    first.current = false
    const prev = lastHeading.current
    let tries = 0
    const id = window.setInterval(() => {
      const h1 = current()
      const text = h1?.textContent ?? ''
      const changed = !!h1 && !!text && (h1 !== prev.el || text !== prev.text)
      if (!changed && ++tries < 60) return
      window.clearInterval(id)
      lastHeading.current = { el: h1, text }
      if (initial) return
      main?.focus({ preventScroll: true })
      if (changed) announce(text)
    }, 50)
    return () => window.clearInterval(id)
  }, [pathname])
  return null
}

/**
 * Connectivity strip under the skip link: offline notice (with how many results are
 * waiting to be saved), "saving…" while queued progress is sent, and a short
 * confirmation once it reached the account.
 */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnline()
  const pending = usePendingCount()
  const syncing = useOutbox((s) => s.syncing)
  const lastSynced = useOutbox((s) => s.lastSynced)

  const strip = 'flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-sm'
  if (!online) {
    return (
      <div role="status" className={`${strip} bg-warn-soft text-warn`}>
        <WifiOff className="h-4 w-4" aria-hidden />
        <span>{t('common.offline')}</span>
        {pending > 0 && <span className="font-medium">{t('pwa.pending', { count: pending })}</span>}
      </div>
    )
  }
  if (syncing && pending > 0) {
    return (
      <div role="status" className={`${strip} bg-brand-soft text-brand`}>
        <CloudUpload className="h-4 w-4" aria-hidden />
        {t('pwa.syncing', { count: pending })}
      </div>
    )
  }
  if (pending > 0) {
    // Online as far as the browser knows, but the server could not be reached yet (e.g. Wi-Fi without internet).
    return (
      <div role="status" className={`${strip} bg-brand-soft text-brand`}>
        <CloudUpload className="h-4 w-4" aria-hidden />
        {t('pwa.waiting', { count: pending })}
      </div>
    )
  }
  if (lastSynced) {
    return (
      // Not a live region: the outbox announces the save itself, so screen readers hear it once.
      <div className={`${strip} bg-ok/10 text-ok`}>
        <CloudCheck className="h-4 w-4" aria-hidden />
        {t('pwa.synced', { count: lastSynced.count })}
      </div>
    )
  }
  return null
}

export function AppLayout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand px-4 py-2 text-white focus:not-sr-only dark:text-[#0a0e17] focus:fixed focus:top-3 focus:left-3"
      >
        {t('nav.skip')}
      </a>
      <ScrollToTop />
      <RouteFocus />
      <LiveAnnouncer />
      <SEO />
      <OfflineBanner />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <InstallBanner />
      <ClassControlLayer />
    </div>
  )
}
