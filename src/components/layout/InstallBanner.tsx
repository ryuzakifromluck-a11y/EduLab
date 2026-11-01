import { Download, RefreshCw, Share, SquarePlus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  applyUpdate,
  dismissUpdate,
  installBannerAllowed,
  promptInstall,
  readInstallDismissed,
  rememberInstallDismissed,
  useInstallMode,
  useUpdateAvailable,
} from '../../lib/pwa'
import { Button, IconButton } from '../ui/primitives'

const card =
  'fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4'

/**
 * "Install EduLab" banner. On Chrome, Edge and Android it opens the browser's install
 * dialog; on iPhone/iPad Safari, which has no install API, it explains "Share → Add to
 * Home Screen". Hidden once installed, and for 30 days after "Not now". The same install
 * action stays available from the footer (`InstallButton`) after a dismissal.
 */
export function InstallBanner() {
  const { t } = useTranslation()
  const mode = useInstallMode()
  const [hidden, setHidden] = useState(() => !installBannerAllowed(readInstallDismissed(), Date.now()))
  const [iosOpen, setIosOpen] = useState(false)
  const update = useUpdateAvailable()

  // A waiting update matters more than installing, and both would sit in the same corner.
  if (update) return <UpdateBanner />
  if (!mode || hidden) return null

  const dismiss = () => {
    rememberInstallDismissed()
    setHidden(true)
  }
  const install = async () => {
    if (mode === 'ios') return setIosOpen((o) => !o)
    const outcome = await promptInstall()
    if (outcome === 'dismissed') dismiss()
  }

  return (
    <div role="region" aria-label={t('pwa.title')} className={`${card} flex-wrap`}>
      <img src="/icons/icon-192.png" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{t('pwa.title')}</p>
        <p className="text-xs text-muted">{t('pwa.text')}</p>
      </div>
      <Button variant="primary" size="sm" onClick={install} aria-expanded={mode === 'ios' ? iosOpen : undefined}>
        <Download className="h-4 w-4" aria-hidden />
        {t('pwa.install')}
      </Button>
      <IconButton label={t('pwa.dismiss')} onClick={dismiss}>
        <X className="h-4 w-4" />
      </IconButton>
      {mode === 'ios' && iosOpen && <IosSteps />}
    </div>
  )
}

function IosSteps() {
  const { t } = useTranslation()
  return (
    <ol className="basis-full space-y-1.5 border-t border-line pt-3 text-xs text-muted">
      <li className="flex items-center gap-2">
        <Share className="h-4 w-4 shrink-0 text-brand" aria-hidden />
        {t('pwa.iosStep1')}
      </li>
      <li className="flex items-center gap-2">
        <SquarePlus className="h-4 w-4 shrink-0 text-brand" aria-hidden />
        {t('pwa.iosStep2')}
      </li>
    </ol>
  )
}

/** "A new version is ready" with a Reload button that activates the waiting service worker. */
function UpdateBanner() {
  const { t } = useTranslation()
  return (
    <div role="status" className={card}>
      <RefreshCw className="h-5 w-5 shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-ink">{t('pwa.updateReady')}</p>
      <Button variant="primary" size="sm" onClick={applyUpdate}>
        {t('pwa.reload')}
      </Button>
      <IconButton label={t('pwa.dismiss')} onClick={dismissUpdate}>
        <X className="h-4 w-4" />
      </IconButton>
    </div>
  )
}

/** Footer "Install app" link: always available while the app can be installed, even after the banner was dismissed. */
export function InstallButton({ className }: { className?: string }) {
  const { t } = useTranslation()
  const mode = useInstallMode()
  const [iosOpen, setIosOpen] = useState(false)
  if (!mode) return null
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => (mode === 'ios' ? setIosOpen((o) => !o) : void promptInstall())}
        aria-expanded={mode === 'ios' ? iosOpen : undefined}
        className="inline-flex items-center gap-1.5 text-muted hover:text-ink"
      >
        <Download className="h-4 w-4" aria-hidden />
        {t('pwa.installApp')}
      </button>
      {mode === 'ios' && iosOpen && (
        <div className="mt-2 flex flex-wrap">
          <IosSteps />
        </div>
      )}
    </div>
  )
}
