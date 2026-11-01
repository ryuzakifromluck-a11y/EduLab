import { useMemo, useRef } from 'react'
import { trackHeight, X_MAX, type EnergySimulation } from '../../engines/energyConservation'
import { useAnimationFrame } from '../../lib/hooks'

const SX = (x: number) => 200 + x * 42
const SY = (h: number) => 240 - h * 42
const BAR_H = 170

/** Side view of the bowl with energy bars; animated from the same simulation. */
export function EnergyConservation2D({ sim, label, names }: { sim: EnergySimulation; label: string; names: [string, string, string] }) {
  const ball = useRef<SVGCircleElement>(null)
  const bars = useRef<(SVGRectElement | null)[]>([])
  const path = useMemo(
    () =>
      Array.from({ length: 81 }, (_, i) => {
        const x = -X_MAX + (2 * X_MAX * i) / 80
        return `${i ? 'L' : 'M'}${SX(x).toFixed(1)} ${SY(trackHeight(x)).toFixed(1)}`
      }).join(' '),
    [],
  )

  useAnimationFrame(() => {
    ball.current?.setAttribute('cx', String(SX(sim.x)))
    ball.current?.setAttribute('cy', String(SY(sim.height) - 9))
    const e = sim.energies
    ;[e.kinetic, e.potential, e.thermal].forEach((v, i) => {
      const r = bars.current[i]
      if (!r) return
      const h = e.total > 0 ? (v / e.total) * BAR_H : 0
      r.setAttribute('height', String(h))
      r.setAttribute('y', String(240 - h))
    })
  }, true)

  const colors = ['#2fbf71', '#4c8dff', '#f0a85c']
  return (
    <svg viewBox="0 0 560 280" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <path d={path} fill="none" stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />
      <line x1={SX(-X_MAX)} x2={SX(X_MAX)} y1={SY(sim.params.height)} y2={SY(sim.params.height)} stroke="#f0a85c" strokeDasharray="6 5" />
      <circle ref={ball} r="9" fill="#e5484d" />
      {colors.map((c, i) => (
        <g key={i}>
          <rect x={400 + i * 50} y={240 - BAR_H} width="36" height={BAR_H} fill="var(--muted)" opacity="0.15" />
          <rect ref={(el) => void (bars.current[i] = el)} x={400 + i * 50} y="240" width="36" height="0" fill={c} />
          <text x={418 + i * 50} y="260" fontSize="11" textAnchor="middle" fill="var(--muted)">
            {names[i]}
          </text>
        </g>
      ))}
    </svg>
  )
}
