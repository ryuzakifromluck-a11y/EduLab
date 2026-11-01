import { CD_RED, spectrumProfile, type SpectralLine } from '../../engines/zeemanEffect'
import { B_MAX } from './useZeemanEffect'

/**
 * Left: the spectrum seen on the detector at the present field. Right: line
 * positions against field strength (the Zeeman "fan").
 */
export function ZeemanEffect2D({ B, lines, label }: { B: number; lines: SpectralLine[]; label: string }) {
  const prof = spectrumProfile(lines, 40e-12, 161)
  const max = Math.max(...prof.map((p) => p.I), 0.001)
  const W = 190
  const x = (pm: number) => 15 + ((pm + 40) / 80) * W
  const path = prof.map((p, i) => `${i ? 'L' : 'M'}${x(p.offset).toFixed(1)} ${(250 - (p.I / max) * 150).toFixed(1)}`).join(' ')
  const shiftPerT = (CD_RED * CD_RED * 9.2740100783e-24) / (6.62607015e-34 * 299792458) * 1e12
  const fx = (pm: number) => 250 + ((pm + 40) / 80) * 155
  const fy = (b: number) => 260 - (b / B_MAX) * 200
  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="15" y="40" width={W} height="40" fill="#05070c" />
      {lines.map((l) => (
        <rect key={l.kind} x={x(l.shift * 1e12) - 2} y="42" width="4" height="36" fill={l.kind === 'pi' ? '#ff3b2f' : '#ff7a4a'} opacity={0.3 + 0.7 * (l.intensity / 0.5)} />
      ))}
      <path d={path} fill="none" stroke="#e5484d" strokeWidth="2" />
      <line x1="15" y1="250" x2={15 + W} y2="250" stroke="var(--muted)" />
      <text x={15 + W / 2} y="270" fontSize="11" fill="var(--text)" textAnchor="middle">
        Δλ (pm)
      </text>
      {[-40, -20, 0, 20, 40].map((v) => (
        <text key={v} x={x(v)} y="262" fontSize="10" fill="var(--muted)" textAnchor="middle">
          {v}
        </text>
      ))}
      <line x1="250" y1="260" x2="405" y2="260" stroke="var(--muted)" />
      <line x1="250" y1="60" x2="250" y2="260" stroke="var(--muted)" />
      {[-1, 0, 1].map((s) => (
        <line key={s} x1={fx(0)} y1={fy(0)} x2={fx(s * shiftPerT * B_MAX)} y2={fy(B_MAX)} stroke={s === 0 ? '#ff3b2f' : '#ff7a4a'} strokeWidth="1.5" />
      ))}
      <line x1="250" y1={fy(B)} x2="405" y2={fy(B)} stroke="var(--brand)" strokeDasharray="4 3" />
      <text x="255" y="52" fontSize="11" fill="var(--text)">
        B (T)
      </text>
      <text x="400" y={fy(B) - 4} fontSize="11" fill="var(--text)" textAnchor="end">
        {B.toFixed(2)} T
      </text>
    </svg>
  )
}
