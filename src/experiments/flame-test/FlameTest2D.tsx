import { wavelengthToRgb } from '../../engines/flameTest'
import type { FlameTestController } from './useFlameTest'

const strip = Array.from({ length: 81 }, (_, i) => {
  const nm = 380 + i * 5
  const [r, g, b] = wavelengthToRgb(nm)
  return { nm, fill: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})` }
})

/** SVG burner and flame, plus the emission lines drawn on a spectroscope strip. */
export function FlameTest2D({ ctl, label }: { ctl: FlameTestController; label: string }) {
  const s = ctl.color.strength
  const h = 120 + 40 * s
  const peaks = ctl.inFlame ? ctl.spectrum.filter((p) => p.I > 0.05) : []
  return (
    <svg viewBox="0 0 420 320" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="140" y="180" width="20" height="90" fill="var(--muted)" />
      <rect x="110" y="268" width="80" height="12" rx="3" fill="var(--muted)" />
      <path d={`M150 180 C120 ${180 - h * 0.4} 140 ${180 - h * 0.8} 150 ${180 - h} C160 ${180 - h * 0.8} 180 ${180 - h * 0.4} 150 180 Z`} fill={ctl.color.hex} opacity={ctl.lit ? 0.55 + 0.4 * s : 0} />
      <path d="M150 180 C140 160 145 150 150 140 C155 150 160 160 150 180 Z" fill="#9db5ff" opacity={ctl.lit ? 0.8 : 0} />
      {ctl.inFlame && <path d="M60 120 L140 128" stroke="#c9ced6" strokeWidth="3" />}
      {ctl.cobaltGlass && <rect x="105" y="40" width="90" height="150" fill="#1f3fbf" opacity="0.3" />}
      {/* spectroscope */}
      <g transform="translate(220 90)">
        {strip.map((p) => (
          <rect key={p.nm} x={(p.nm - 380) * 0.45} y="0" width="2.4" height="60" fill={p.fill} opacity="0.12" />
        ))}
        {peaks.map((p) => (
          <rect key={p.nm} x={(p.nm - 380) * 0.45} y="0" width="2" height="60" fill={strip[Math.round((p.nm - 380) / 5)]?.fill} opacity={p.I} />
        ))}
        <text x="0" y="78" fontSize="11" fill="var(--muted)">400</text>
        <text x="81" y="78" fontSize="11" fill="var(--muted)">580</text>
        <text x="158" y="78" fontSize="11" fill="var(--muted)">750 nm</text>
      </g>
    </svg>
  )
}
