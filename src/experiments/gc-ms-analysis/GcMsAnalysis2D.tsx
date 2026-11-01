import type { GcMsController } from './useGcMsAnalysis'

/** SVG view: chromatogram recorded so far (peaks numbered) and the selected peak's mass spectrum. */
export function GcMsAnalysis2D({ ctl, label }: { ctl: GcMsController; label: string }) {
  const max = Math.max(1e-9, ...ctl.fullTrace.map((p) => p.signal))
  const x = (t: number) => 30 + (t / ctl.tEnd) * 400
  const y = (s: number) => 150 - (s / max) * 110
  const path = ctl.trace.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)} ${y(p.signal).toFixed(1)}`).join(' ')
  const spec = ctl.peak?.spectrum ?? []
  return (
    <svg viewBox="0 0 460 330" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="30" y="30" width="400" height="120" fill="none" stroke="var(--muted)" />
      <path d={path} fill="none" stroke="#2ccfb5" strokeWidth="2" />
      {ctl.peaks.map((p, i) => (
        <text key={i} x={x(p.t)} y={y(p.height) - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill={i === ctl.selected ? 'var(--text)' : '#d9731a'}>
          {i + 1}
        </text>
      ))}
      <text x="430" y="168" textAnchor="end" fontSize="11" fill="var(--muted)">
        {ctl.time.toFixed(2)} / {ctl.tEnd.toFixed(1)} min
      </text>
      <rect x="30" y="190" width="400" height="110" fill="none" stroke="var(--muted)" />
      {spec.map((p) => (
        <g key={p.mz}>
          <rect x={30 + (p.mz / 100) * 400 - 2} y={300 - (p.I / 100) * 100} width="4" height={(p.I / 100) * 100} fill="#7b93ff" />
          {p.I > 25 && (
            <text x={30 + (p.mz / 100) * 400} y={296 - (p.I / 100) * 100} textAnchor="middle" fontSize="10" fill="var(--text)">
              {p.mz}
            </text>
          )}
        </g>
      ))}
      <text x="430" y="318" textAnchor="end" fontSize="11" fill="var(--muted)">m/z</text>
    </svg>
  )
}
