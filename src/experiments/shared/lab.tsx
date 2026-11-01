import { Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChartTheme } from '../../components/lab/chartTheme'
import { Button } from '../../components/ui/primitives'
import { useAnimationFrame, useTicker } from '../../lib/hooks'

/** Recharts axis-title props in the style used by every experiment. */
export function axisLabels(c: ChartTheme) {
  return {
    x: (value: string) => ({ value, position: 'insideBottom' as const, offset: -10, fill: c.text, fontSize: 12 }),
    y: (value: string) => ({
      value,
      angle: -90,
      position: 'insideLeft' as const,
      offset: 12,
      fill: c.text,
      fontSize: 12,
      style: { textAnchor: 'middle' as const },
    }),
    yRight: (value: string) => ({
      value,
      angle: 90,
      position: 'insideRight' as const,
      offset: 12,
      fill: c.text,
      fontSize: 12,
      style: { textAnchor: 'middle' as const },
    }),
  }
}

export const CHART_MARGIN = { top: 8, right: 16, bottom: 20, left: 4 }

/**
 * Advances a simulation every animation frame while running and re-renders
 * the page at `hz` so measurements and charts follow along.
 */
export function useSimLoop(step: (dt: number) => void, running: boolean, hz = 12) {
  useAnimationFrame(step, running)
  useTicker(hz, running)
}

/** "N readings · [Record] [Clear]" box shown under the parameter sliders. */
export function RecordBox({
  count,
  title,
  hint,
  onRecord,
  onClear,
  recordLabel,
  disabled,
}: {
  count: number
  title: ReactNode
  hint?: ReactNode
  onRecord?: () => void
  onClear: () => void
  recordLabel?: ReactNode
  disabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{title}</span>
        <div className="flex gap-1">
          {onRecord && (
            <Button size="sm" variant="secondary" onClick={onRecord} disabled={disabled}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {recordLabel ?? t('lab.record')}
            </Button>
          )}
          {count > 0 && (
            <Button size="sm" variant="ghost" onClick={onClear} aria-label={t('lab.clearReadings')}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

/** Small legend chip used in viewport overlays. */
export function OverlayNote({ children }: { children: ReactNode }) {
  return (
    <p className="pointer-events-none absolute top-3 left-3 max-w-[70%] rounded-lg bg-surface/85 px-3 py-1.5 text-xs text-muted ring-1 ring-line">
      {children}
    </p>
  )
}

export const SPEEDS_DEFAULT = [0.25, 0.5, 1, 2]

/** Linear interpolation between two hex colours (sRGB, for display only). */
export function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const u = Math.min(1, Math.max(0, t))
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - u) + ((pb >> shift) & 255) * u)
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`
}

/** Colour for a temperature on a blue → red scale between tMin and tMax. */
export function heatColor(T: number, tMin: number, tMax: number): string {
  const f = (T - tMin) / Math.max(1e-9, tMax - tMin)
  return f < 0.5 ? lerpColor('#2f6fd6', '#f2d24b', f * 2) : lerpColor('#f2d24b', '#e0342a', (f - 0.5) * 2)
}
