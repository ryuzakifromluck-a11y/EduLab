import type { AspirinController } from './useSynthesisOfAspirin'

/** SVG bench: flask in the water bath, filter with crystals, FeCl₃ tube and melting point. */
export function SynthesisOfAspirin2D({ ctl, label, texts }: { ctl: AspirinController; label: string; texts: { fecl3: string; mp: string } }) {
  const r = ctl.result
  const crystals = r ? Math.min(40, Math.round((r.productMass / 3) * 40)) : 0
  return (
    <svg viewBox="0 0 460 280" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      {/* hot plate + bath */}
      <rect x="30" y="220" width="130" height="20" rx="4" fill={ctl.running ? '#ff7a4a' : 'var(--muted)'} opacity="0.8" />
      <rect x="40" y="130" width="110" height="90" fill="#8ec5ff" opacity="0.25" stroke="var(--muted)" />
      <path d="M85 90 V120 L60 210 H130 L105 120 V90" fill="none" stroke="var(--text)" strokeWidth="2" />
      <path d="M66 190 L62 210 H128 L124 190 Z" fill="#f2efe6" opacity={0.4 + 0.5 * ctl.conversion} />
      <text x="95" y="265" textAnchor="middle" fontSize="13" fill="var(--text)">
        {ctl.params.tempC} °C · {ctl.minutes.toFixed(1)} min · {(ctl.conversion * 100).toFixed(0)} %
      </text>
      {/* filter */}
      <path d="M190 120 H290 L260 170 H220 Z" fill="none" stroke="var(--text)" strokeWidth="2" />
      <line x1="240" y1="170" x2="240" y2="200" stroke="var(--text)" strokeWidth="2" />
      {Array.from({ length: crystals }, (_, i) => (
        <rect key={i} x={200 + ((i * 37) % 80)} y={112 - ((i * 7) % 10)} width="6" height="3" fill="var(--text)" opacity="0.7" />
      ))}
      <text x="240" y="230" textAnchor="middle" fontSize="13" fill="var(--text)">{r ? `${r.productMass.toFixed(2)} g · ${r.percentYield.toFixed(0)} %` : '—'}</text>
      {/* FeCl₃ tube */}
      <path d="M335 80 V190 a12 12 0 0 0 24 0 V80" fill="none" stroke="var(--text)" strokeWidth="2" />
      <path d="M337 140 V190 a10 10 0 0 0 20 0 V140 Z" fill={r ? r.fecl3Color : '#f1d78a'} opacity={r ? 0.9 : 0.35} />
      <text x="347" y="230" textAnchor="middle" fontSize="12" fill="var(--text)">{texts.fecl3}</text>
      <text x="420" y="140" textAnchor="middle" fontSize="12" fill="var(--muted)">{texts.mp}</text>
      <text x="420" y="160" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--text)">{r ? `${r.meltingRange[0].toFixed(0)}–${r.meltingRange[1].toFixed(0)} °C` : '—'}</text>
    </svg>
  )
}
