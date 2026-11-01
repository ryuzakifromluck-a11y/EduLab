import { useRef } from 'react'
import type { JouleCalorimeter, Method } from '../../engines/joulesExperiment'
import { useAnimationFrame } from '../../lib/hooks'
import { heatColor } from '../shared/lab'

/** Side view: calorimeter, paddle (or coil), pulley, falling weight and thermometer. */
export function JoulesExperiment2D({ cal, method, height, label }: { cal: JouleCalorimeter; method: Method; height: number; label: string }) {
  const water = useRef<SVGRectElement>(null)
  const weight = useRef<SVGGElement>(null)
  const string = useRef<SVGLineElement>(null)
  const column = useRef<SVGRectElement>(null)
  const temp = useRef<SVGTextElement>(null)
  const paddle = useRef<SVGGElement>(null)
  const angle = useRef(0)
  const travel = 150 * (height / 2)

  useAnimationFrame((dt) => {
    const fallen = cal.falling ? (height - cal.fallLeft) / height : 0
    const y = 60 + fallen * travel
    weight.current?.setAttribute('transform', `translate(0 ${y})`)
    string.current?.setAttribute('y2', String(y))
    water.current?.setAttribute('fill', heatColor(cal.T, 15, 35))
    const f = Math.min(1, Math.max(0.02, (cal.T - 10) / 40))
    column.current?.setAttribute('height', String(150 * f))
    column.current?.setAttribute('y', String(230 - 150 * f))
    if (temp.current) temp.current.textContent = `${cal.T.toFixed(2)} °C`
    if (cal.falling || cal.power > 0) angle.current += dt * 200
    paddle.current?.setAttribute('transform', `translate(140 200) scale(${Math.cos((angle.current * Math.PI) / 180)} 1)`)
  }, true)

  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="70" y="140" width="140" height="120" rx="6" fill="none" stroke="var(--text)" strokeWidth="2" />
      <rect ref={water} x="74" y="160" width="132" height="96" opacity="0.55" />
      {method === 'mechanical' ? (
        <>
          <line x1="140" y1="100" x2="140" y2="250" stroke="var(--text)" strokeWidth="2" />
          <g ref={paddle}>
            <rect x="-50" y="-10" width="100" height="20" fill="#b08d3a" />
            <rect x="-50" y="25" width="100" height="20" fill="#b08d3a" />
          </g>
          <line x1="140" y1="100" x2="330" y2="40" stroke="var(--muted)" />
          <circle cx="340" cy="40" r="14" fill="none" stroke="var(--text)" strokeWidth="2" />
          <line ref={string} x1="354" y1="40" x2="354" y2="60" stroke="var(--muted)" />
          <g ref={weight}>
            <rect x="340" y="0" width="28" height="24" fill="#5a6275" />
          </g>
          <line x1="385" y1="72" x2="385" y2={72 + travel} stroke="var(--muted)" strokeDasharray="4 3" />
        </>
      ) : (
        <>
          <path d="M120 250 q10 -10 20 0 t20 0 t20 0 M130 250 V110 M170 250 V110" fill="none" stroke="#d9731a" strokeWidth="3" />
          <rect x="280" y="120" width="90" height="60" rx="6" fill="none" stroke="var(--text)" />
          <path d="M130 110 H300 V120 M170 110 V100 H350 V120" fill="none" stroke="var(--muted)" />
          <g ref={paddle} />
        </>
      )}
      <rect x="40" y="70" width="12" height="165" rx="6" fill="none" stroke="var(--text)" />
      <rect ref={column} x="43" y="200" width="6" height="30" fill="#d33" />
      <circle cx="46" cy="240" r="9" fill="#d33" />
      <text ref={temp} x="20" y="60" fontSize="13" fill="var(--text)" />
    </svg>
  )
}
