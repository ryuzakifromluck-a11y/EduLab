import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../../i18n'
import { clsx } from 'clsx'

export function LanguageSelect({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t, i18n } = useTranslation()
  return (
    <label className={clsx('relative inline-flex items-center', className)}>
      <span className="sr-only">{t('nav.language')}</span>
      <Languages className="pointer-events-none absolute left-2.5 h-4 w-4 text-muted" aria-hidden />
      <select
        value={i18n.resolvedLanguage}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="h-9 appearance-none rounded-lg border border-line bg-surface pr-3 pl-8 text-sm text-ink hover:bg-surface-2"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {compact ? l.short : l.label}
          </option>
        ))}
      </select>
    </label>
  )
}
