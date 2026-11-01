import type { IndicatorId } from '../../engines/indicators'
import { TUBE_ORDER, tubeColor } from './tubes'

/** The same rack of test tubes, in SVG. */
export function PhIndicators2D({ pH, selected, names, label }: { pH: number; selected: IndicatorId; names: Record<IndicatorId, string>; label: string }) {
  return (
    <svg viewBox="0 0 560 320" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <text x="280" y="34" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">
        pH {pH.toFixed(1)}
      </text>
      {TUBE_ORDER.map((ind, i) => {
        const x = 50 + i * 76
        const y = ind.id === selected ? 50 : 70
        return (
          <g key={ind.id}>
            <path d={`M${x - 16} ${y + 130} V${y + 190} a16 16 0 0 0 32 0 V${y + 130} Z`} fill={tubeColor(ind, pH)} style={{ transition: 'fill 0.5s' }} />
            <path d={`M${x - 16} ${y} V${y + 190} a16 16 0 0 0 32 0 V${y}`} fill="none" stroke="var(--text)" strokeWidth="2" />
            <text x={x} y="300" textAnchor="middle" fontSize="11" fontWeight={ind.id === selected ? 700 : 400} fill="var(--text)">
              {names[ind.id]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
