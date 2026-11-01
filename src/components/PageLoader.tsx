import { useTranslation } from 'react-i18next'

export function PageLoader({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden />
      {label ?? t('common.loading')}
    </div>
  )
}
