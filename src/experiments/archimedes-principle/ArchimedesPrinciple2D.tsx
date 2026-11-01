import type { Body, Fluid, Reading } from '../../engines/archimedesPrinciple'

const U = 9 // px per cm

/** Side view: spring balance, string, body, overflow can and catch beaker. */
export function ArchimedesPrinciple2D({ body, fluid, reading, lowered, label }: { body: Body; fluid: Fluid; reading: Reading; lowered: number; label: string }) {
  const surface = 200
  const r = Math.sqrt(body.volume / (Math.PI * body.height)) * U
  const h = body.height * U
  const virtualBottom = surface + Math.min(lowered, body.height + 2) * U
  const bottom = reading.floating ? surface + reading.submerged * h : virtualBottom
  const hook = virtualBottom - h - 16
  const springLen = 24 + reading.apparent * 30
  const top = hook - springLen
  const caught = Math.min(1, reading.displaced / 160) * 60
  const coil = Array.from({ length: 13 }, (_, i) => `L${160 + (i % 2 ? -8 : 8)} ${top + (springLen * (i + 1)) / 14}`).join(' ')
  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="140" y={top - 12} width="40" height={springLen + 18} rx="6" fill="none" stroke="var(--muted)" />
      <line x1="160" y1="0" x2="160" y2={top - 12} stroke="var(--muted)" />
      <path d={`M160 ${top} ${coil} L160 ${hook}`} fill="none" stroke="var(--text)" strokeWidth="1.5" />
      <line x1="160" y1={hook} x2="160" y2={reading.floating ? hook + 8 : bottom - h} stroke="var(--muted)" />
      <text x="190" y={top + 10} fontSize="13" fill="var(--text)">
        {reading.apparent.toFixed(2)} N
      </text>
      <rect x={160 - r} y={bottom - h} width={2 * r} height={h} fill={body.color} stroke="var(--text)" strokeWidth="0.5" />
      <rect x="100" y={surface} width="120" height="80" fill={fluid.color} opacity="0.45" />
      <path d={`M100 ${surface - 10} V280 H220 V${surface - 10} M220 ${surface + 2} l30 14`} fill="none" stroke="var(--text)" strokeWidth="2" />
      <rect x="250" y={280 - caught} width="50" height={caught} fill={fluid.color} opacity="0.7" />
      <path d="M250 210 V280 H300 V210" fill="none" stroke="var(--text)" strokeWidth="2" />
      <text x="250" y="200" fontSize="12" fill="var(--text)">
        {reading.overflowMass.toFixed(1)} g
      </text>
      <line x1="10" y1="281" x2="410" y2="281" stroke="var(--muted)" strokeWidth="2" />
    </svg>
  )
}
