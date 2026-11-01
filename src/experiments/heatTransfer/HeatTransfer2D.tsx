import { useRef } from 'react'
import type { Rod } from '../../engines/heatTransfer'
import { useAnimationFrame } from '../../lib/hooks'
import { heatColor } from '../shared/lab'
import { T_COLD } from './useHeatTransfer'

const X0 = 80
const W = 280

/** Two rods drawn as colour strips between the baths. */
export function HeatTransfer2D({ a, b, tHot, label, names }: { a: Rod; b: Rod; tHot: number; label: string; names: [string, string] }) {
  const cells = useRef<(SVGRectElement | null)[][]>([[], []])
  const probes = useRef<(SVGTextElement | null)[]>([])

  useAnimationFrame(() => {
    ;[a, b].forEach((rod, r) => {
      cells.current[r].forEach((el, i) => el?.setAttribute('fill', heatColor((rod.temps[i] + rod.temps[i + 1]) / 2, T_COLD, tHot)))
      const p = probes.current[r]
      if (p) p.textContent = `${rod.at(0.5).toFixed(1)} °C`
    })
  }, true)

  const n = a.segments
  return (
    <svg viewBox="0 0 440 260" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="20" y="50" width="60" height="170" rx="6" fill={heatColor(tHot, T_COLD, 100)} />
      <rect x={X0 + W} y="50" width="60" height="170" rx="6" fill="#5c8fe0" />
      {[0, 1].map((r) => (
        <g key={r}>
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} ref={(el) => void (cells.current[r][i] = el)} x={X0 + (W * i) / n} y={r ? 160 : 90} width={W / n + 0.5} height="20" />
          ))}
          <text x={X0 + W / 2} y={r ? 152 : 82} fontSize="12" textAnchor="middle" fill="var(--text)">
            {names[r]}
          </text>
          <text ref={(el) => void (probes.current[r] = el)} x={X0 + W / 2} y={r ? 198 : 128} fontSize="12" textAnchor="middle" fontWeight="600" fill="var(--text)" />
        </g>
      ))}
    </svg>
  )
}
