import { GEL_LENGTH } from '../../engines/gelElectrophoresis'

export interface GelLane {
  label: string
  bands: { distance: number; intensity: number; key?: string | number }[]
}

/**
 * An agarose gel seen from above, wells at the top (cathode, −) and the anode
 * (+) at the bottom. Under UV the stained DNA glows; without UV only the blue
 * loading dye shows. Shared by the electrophoresis experiment and the PCR result.
 */
export function GelImage({
  lanes,
  uv,
  dye,
  bandWidth = 0.15,
  highlight,
  label,
  className = 'h-full w-full',
}: {
  lanes: GelLane[]
  uv: boolean
  /** Dye front distance, cm (hidden when undefined or off the gel). */
  dye?: number
  /** Band thickness, cm. */
  bandWidth?: number
  /** Index of a lane to outline. */
  highlight?: number
  label: string
  className?: string
}) {
  const W = 60 + lanes.length * 100
  const top = 56
  const H = 300
  const scale = (H - top - 20) / GEL_LENGTH
  const y = (cm: number) => top + 8 + cm * scale
  return (
    <svg viewBox={`0 0 ${W} ${H + 18}`} className={className} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
      <rect x="30" y={top} width={W - 60} height={H - top} rx="6" fill={uv ? '#1b0f2e' : '#cfe0ea'} opacity={uv ? 1 : 0.85} />
      <text x="16" y={top + 14} fontSize="16" fontWeight="700" fill="var(--text)">−</text>
      <text x="14" y={H - 4} fontSize="16" fontWeight="700" fill="var(--text)">+</text>
      {lanes.map((lane, i) => {
        const cx = 80 + i * 100
        return (
          <g key={lane.label}>
            {highlight === i && <rect x={cx - 34} y={top + 2} width="68" height={H - top - 4} rx="4" fill="none" stroke="var(--biology)" strokeWidth="2" strokeDasharray="4 3" />}
            <rect x={cx - 20} y={top + 4} width="40" height="5" rx="1" fill={uv ? '#3a2b55' : '#9db4c4'} />
            {uv &&
              lane.bands
                .filter((b) => b.distance >= 0 && b.distance <= GEL_LENGTH && b.intensity > 0.02)
                .map((b, j) => (
                  <rect
                    key={b.key ?? j}
                    x={cx - 19}
                    y={y(b.distance) - (bandWidth * scale) / 2}
                    width="38"
                    height={Math.max(2, bandWidth * scale)}
                    rx="2"
                    fill="#ffb347"
                    opacity={Math.min(1, 0.25 + 0.75 * b.intensity)}
                    style={{ filter: 'drop-shadow(0 0 3px #ff9a2e)' }}
                  />
                ))}
            {dye !== undefined && dye > 0 && dye <= GEL_LENGTH && (
              <rect x={cx - 19} y={y(dye) - 3} width="38" height="6" rx="2" fill="#3c55d8" opacity={uv ? 0.45 : 0.85} />
            )}
            <text x={cx} y={H + 14} fontSize="13" textAnchor="middle" fill="var(--muted)">
              {lane.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
