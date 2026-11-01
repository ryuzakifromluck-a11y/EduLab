import type { PcrSimulation } from '../../engines/pcr'
import { heatColor } from '../shared/lab'
import { strandPose } from './strands'

/** Thermal block temperature, the template strands in the current step, and the copy count. */
export function Pcr2D({ sim, label, phaseLabel, copiesLabel }: { sim: PcrSimulation; label: string; phaseLabel: string; copiesLabel: string }) {
  const st = sim.state
  const pose = strandPose(st.phase, st.stepProgress, sim.settings)
  const fill = (st.temp - 4) / 96
  const half = 8 + 26 * pose.gap
  const len = 220
  const x0 = 150
  const yTop = 120 - half
  const yBot = 120 + half
  const built = (len - 40) * pose.built
  return (
    <svg viewBox="0 -40 420 340" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      {/* Thermometer */}
      <rect x="40" y="40" width="26" height="200" rx="13" fill="var(--surface-3)" />
      <rect x="40" y={40 + 200 * (1 - fill)} width="26" height={200 * fill} rx="13" fill={heatColor(st.temp, 4, 100)} />
      <text x="53" y="262" fontSize="15" fontWeight="600" textAnchor="middle" fill="var(--text)">
        {st.temp.toFixed(0)} °C
      </text>
      <text x="53" y="282" fontSize="12" textAnchor="middle" fill="var(--muted)">
        {phaseLabel}
      </text>
      {/* Template strands */}
      <line x1={x0} x2={x0 + len} y1={yTop} y2={yTop} stroke="#4c7be0" strokeWidth="7" strokeLinecap="round" />
      <line x1={x0} x2={x0 + len} y1={yBot} y2={yBot} stroke="#4c7be0" strokeWidth="7" strokeLinecap="round" />
      {pose.gap < 0.5 &&
        Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1={x0 + 10 + i * 18} x2={x0 + 10 + i * 18} y1={yTop} y2={yBot} stroke="#4c7be0" strokeWidth="2" opacity={1 - pose.gap * 2} />
        ))}
      {pose.primers > 0 && (
        <g fill="#f0a85c" opacity={pose.primers}>
          <rect x={x0} y={yTop + 7} width="34" height="7" rx="2" />
          <rect x={x0 + len - 34} y={yBot - 14} width="34" height="7" rx="2" />
        </g>
      )}
      {built > 1 && (
        <g fill="#7cc24a">
          <rect x={x0 + 34} y={yTop + 7} width={built} height="7" rx="2" />
          <rect x={x0 + len - 34 - built} y={yBot - 14} width={built} height="7" rx="2" />
        </g>
      )}
      <text x={x0 + len / 2} y="210" fontSize="22" fontWeight="700" textAnchor="middle" fill="var(--text)">
        {copiesLabel}
      </text>
      <text x={x0 + len / 2} y="236" fontSize="13" textAnchor="middle" fill="var(--muted)">
        {sim.cycle} / {sim.settings.cycles}
      </text>
    </svg>
  )
}
