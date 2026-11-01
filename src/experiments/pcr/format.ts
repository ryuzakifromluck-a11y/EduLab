import { fmt, fmtInt } from '../../lib/format'

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'

/** Integer as superscript digits, e.g. 12 → ¹². */
export const sup = (n: number) => [...String(Math.round(n))].map((d) => SUP[+d]).join('')

/** "1.2 × 10⁹" style, for copy numbers spanning many orders of magnitude. */
export function sci(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  const e = Math.floor(Math.log10(n))
  if (e < 4) return fmtInt(n)
  const m = n / Math.pow(10, e)
  return `${fmt(m, 1)} × 10${sup(e)}`
}
