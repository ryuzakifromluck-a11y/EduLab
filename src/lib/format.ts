import i18n from '../i18n'

/** Locale-aware number formatting with a fixed number of fraction digits. */
export function fmt(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

/** Format with engineering-friendly significant figures (for currents spanning mA–A). */
export function fmtSig(value: number, sig = 3): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return fmt(0, sig - 1)
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(value))))
  return fmt(value, Math.min(digits, 6))
}

export function fmtInt(value: number): string {
  return new Intl.NumberFormat(i18n.language).format(Math.round(value))
}
