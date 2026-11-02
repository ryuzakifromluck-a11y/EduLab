import { TUBE_CAPACITY } from '../../engines/electrolysisWater'
import type { ElectrolysisController } from './useElectrolysis'

/** Front view of the Hofmann voltameter with the gas volumes in both tubes. */
export function Electrolysis2D({ ctl, label }: { ctl: ElectrolysisController; label: string }) {
  const top = 40
  const len = 200
  const tube = (x: number, ml: number, name: string) => {
    const gas = (Math.min(ml, TUBE_CAPACITY) / TUBE_CAPACITY) * len
    return (
      <g>
        <rect x={x - 14} y={top} width={28} height={len + 30} rx={6} fill="none" stroke="var(--muted)" strokeWidth={2} />
        <rect x={x - 12} y={top + gas} width={24} height={len + 28 - gas} fill="#cfe1f7" opacity={0.8} />
        <text x={x} y={top - 10} textAnchor="middle" fontSize="13" fill="var(--ink)">
          {name} {ml.toFixed(1)} mL
        </text>
        {ctl.current > 0 && [0, 1, 2].map((i) => <circle key={i} cx={x - 5 + i * 5} cy={top + len + 10 - ((ctl.time * 40 + i * 30) % 60)} r={2} fill="white" />)}
      </g>
    )
  }
  return (
    <svg viewBox="0 0 420 320" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      {tube(140, ctl.volumes.h2, 'H₂')}
      {tube(280, ctl.volumes.o2, 'O₂')}
      <rect x={140} y={top + len + 22} width={140} height={14} fill="#cfe1f7" opacity={0.8} />
      <rect x={170} y={285} width={80} height={26} rx={4} fill="#2f3644" />
      <text x={210} y={302} textAnchor="middle" fontSize="12" fill="#fff">
        {ctl.voltage.toFixed(1)} V
      </text>
    </svg>
  )
}
