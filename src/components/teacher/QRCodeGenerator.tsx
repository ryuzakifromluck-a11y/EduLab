import { Check, Copy, Maximize2, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCode, joinUrl } from '../../lib/remoteCode'
import { Button, IconButton } from '../ui/primitives'

/**
 * The session's QR code and its code in large type, for projecting on the board.
 * The QR is always dark-on-white: phone scanners struggle with inverted codes.
 */
export function QRCodeGenerator({ code }: { code: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [large, setLarge] = useState(false)
  const url = joinUrl(code, window.location.origin)

  useEffect(() => {
    if (!large) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLarge(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [large])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked: the link is visible to copy by hand */
    }
  }

  const qr = (size: number) => (
    <QRCodeSVG value={url} size={size} marginSize={2} level="M" bgColor="#ffffff" fgColor="#0e1525" title={t('remote.teacher.qrAlt', { code: formatCode(code) })} />
  )

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-2xl bg-white p-2 shadow-card">{qr(220)}</div>
      <div>
        <p className="text-xs font-semibold tracking-wide text-faint uppercase">{t('remote.teacher.codeLabel')}</p>
        <p className="tabular mt-1 font-mono text-4xl font-bold tracking-[0.15em] text-ink" aria-label={[...code].join(' ')}>
          {formatCode(code)}
        </p>
      </div>
      <p className="max-w-xs text-sm text-muted">{t('remote.teacher.scanHint')}</p>
      <p className="max-w-full truncate rounded-lg bg-surface-2 px-3 py-1.5 font-mono text-xs text-muted" title={url}>
        {url}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? t('remote.teacher.copied') : t('remote.teacher.copyLink')}
        </Button>
        <Button size="sm" onClick={() => setLarge(true)}>
          <Maximize2 className="h-4 w-4" aria-hidden />
          {t('remote.teacher.showLarge')}
        </Button>
      </div>

      {large && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('remote.teacher.showLarge')}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-6 text-[#0e1525]"
          onClick={() => setLarge(false)}
        >
          <IconButton label={t('remote.teacher.closeLarge')} className="absolute top-4 right-4 text-[#0e1525]" onClick={() => setLarge(false)} autoFocus>
            <X className="h-5 w-5" />
          </IconButton>
          {qr(Math.min(window.innerWidth, window.innerHeight) * 0.62)}
          <p className="font-mono text-6xl font-bold tracking-[0.15em] sm:text-7xl">{formatCode(code)}</p>
          <p className="text-lg">{url.replace(/^https?:\/\//, '')}</p>
        </div>
      )}
    </div>
  )
}
