import { START_VOLUME, type DensityController } from './useDensityMeasurement'

const ML = 1.8 // px per mL

/** Balance, graduated cylinder (or overflow can) and the sample, or the liquid apparatus. */
export function DensityMeasurement2D({ c, label }: { c: DensityController; label: string }) {
  if (c.mode === 'liquid') {
    const fill = c.bottle === 'empty' ? 'none' : c.bottle === 'water' ? '#5aa9e6' : c.liquid.color
    const depth = c.hydroDepth
    return (
      <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
        {c.liquidMethod === 'pycnometer' ? (
          <>
            <rect x="60" y="220" width="150" height="40" rx="6" fill="var(--surface-2)" stroke="var(--text)" />
            <rect x="95" y="232" width="80" height="18" fill="#0f1a14" />
            <text x="135" y="246" fontSize="12" fill="#7dffb2" textAnchor="middle">
              {c.bottleReading.toFixed(2)} g
            </text>
            <circle cx="135" cy="180" r="34" fill={fill} fillOpacity="0.6" stroke="var(--text)" />
            <rect x="128" y="130" width="14" height="20" fill="none" stroke="var(--text)" />
          </>
        ) : (
          <>
            <rect x="160" y="40" width="100" height="220" fill="none" stroke="var(--text)" strokeWidth="2" />
            <rect x="162" y="80" width="96" height="178" fill={c.liquid.color} opacity="0.5" />
            <g transform={`translate(210 ${depth === null ? 200 : 80 - depth * 6 + 110})`}>
              <ellipse cx="0" cy="0" rx="12" ry="40" fill="#eef3f8" stroke="var(--text)" />
              <rect x="-3" y="-130" width="6" height="90" fill="#f7f3e3" stroke="var(--text)" strokeWidth="0.5" />
            </g>
            <text x="280" y="90" fontSize="13" fill="var(--text)">
              {c.hydroReading === null ? '—' : `${c.hydroReading} kg/m³`}
            </text>
          </>
        )}
        <line x1="10" y1="261" x2="410" y2="261" stroke="var(--muted)" strokeWidth="2" />
      </svg>
    )
  }
  const level = c.cylinderLevel
  const overflow = c.volumeMethod === 'overflow'
  const onBalance = c.place === 'balance' && c.anim >= 1
  const inWater = c.place === 'water' && c.anim >= 1
  const sx = onBalance ? 115 : inWater ? (overflow ? 250 : 300) : 60
  const sy = onBalance ? 205 : inWater ? 235 : 245
  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="60" y="220" width="110" height="40" rx="6" fill="var(--surface-2)" stroke="var(--text)" />
      <rect x="80" y="232" width="70" height="18" fill="#0f1a14" />
      <text x="115" y="246" fontSize="12" fill="#7dffb2" textAnchor="middle">
        {c.balanceReading.toFixed(1)} g
      </text>
      {c.volumeMethod !== 'ruler' &&
        (overflow ? (
          <>
            <rect x="215" y="150" width="70" height="110" fill="none" stroke="var(--text)" strokeWidth="2" />
            <rect x="217" y="162" width="66" height="96" fill="#5aa9e6" opacity="0.45" />
            <line x1="285" y1="160" x2="312" y2="175" stroke="var(--text)" strokeWidth="2" />
            <rect x="320" y={260 - 100 * ML} width="40" height={100 * ML} fill="none" stroke="var(--text)" strokeWidth="2" />
            <rect x="322" y={258 - level * ML} width="36" height={level * ML} fill="#5aa9e6" opacity="0.5" />
            <text x="340" y="70" fontSize="12" fill="var(--text)" textAnchor="middle">
              {level.toFixed(0)} mL
            </text>
          </>
        ) : (
          <>
            <rect x="280" y={260 - 100 * ML} width="40" height={100 * ML} fill="none" stroke="var(--text)" strokeWidth="2" />
            <rect x="282" y={258 - level * ML} width="36" height={level * ML} fill="#5aa9e6" opacity="0.5" />
            <line x1="276" y1={258 - START_VOLUME * ML} x2="286" y2={258 - START_VOLUME * ML} stroke="var(--text)" />
            <text x="300" y="70" fontSize="12" fill="var(--text)" textAnchor="middle">
              {level.toFixed(0)} mL
            </text>
          </>
        ))}
      <rect x={sx - 12} y={sy - 12} width="24" height="20" rx={c.regular ? 1 : 8} fill={c.solid.color} stroke="var(--text)" strokeWidth="0.6" />
      <line x1="10" y1="261" x2="410" y2="261" stroke="var(--muted)" strokeWidth="2" />
    </svg>
  )
}
