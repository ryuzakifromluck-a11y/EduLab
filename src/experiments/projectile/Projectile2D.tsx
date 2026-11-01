import { useRef, type RefObject } from 'react'
import type { ProjectileSample, ProjectileSimulation } from '../../engines/projectile'
import { useAnimationFrame } from '../../lib/hooks'
import { niceStep, viewScale } from './sceneScale'

const OX = 36 // px of the launch point
const OY = 228 // px of the ground
const PX = 40 // px per view unit

/** SVG view for devices without WebGL; reads the same simulation and flight log each frame. */
export function Projectile2D({
  sim,
  log,
  prediction,
  showPrediction,
  accent,
}: {
  sim: ProjectileSimulation
  log: RefObject<ProjectileSample[]>
  prediction: { range: number; maxHeight: number; path: ProjectileSample[] }
  showPrediction: boolean
  accent: string
}) {
  const k = viewScale(prediction.range, prediction.maxHeight) * PX
  const ball = useRef<SVGCircleElement>(null)
  const trail = useRef<SVGPolylineElement>(null)
  const sx = (x: number) => OX + x * k
  const sy = (y: number) => OY - y * k

  useAnimationFrame(() => {
    const { x, y } = sim.state
    ball.current?.setAttribute('cx', String(sx(x)))
    ball.current?.setAttribute('cy', String(sy(y) - 5))
    const pts = log.current.map((p) => `${sx(p.x).toFixed(1)},${(sy(p.y) - 5).toFixed(1)}`)
    pts.push(`${sx(x).toFixed(1)},${(sy(y) - 5).toFixed(1)}`)
    trail.current?.setAttribute('points', pts.join(' '))
  }, true)

  const step = niceStep(Math.max(prediction.range, 1) * 1.1)
  const ticks: number[] = []
  for (let m = 0; sx(m) <= 390; m += step) ticks.push(m)
  const a = (sim.params.angleDeg * Math.PI) / 180
  const h0 = sy(sim.params.height)

  return (
    <svg viewBox="0 0 400 260" className="h-full max-h-[480px] w-full" role="img" aria-label="Projectile launch (2D view)">
      <line x1="0" y1={OY} x2="400" y2={OY} stroke="var(--muted)" strokeWidth="2" />
      {ticks.map((m) => (
        <g key={m}>
          <line x1={sx(m)} y1={OY} x2={sx(m)} y2={OY + 5} stroke="var(--muted)" />
          <text x={sx(m)} y={OY + 17} fontSize="9" textAnchor="middle" fill="var(--muted)">
            {+m.toPrecision(4)} m
          </text>
        </g>
      ))}
      {sim.params.height > 0 && <rect x={OX - 26} y={h0} width="26" height={OY - h0} fill="var(--faint)" />}
      <line x1={OX} y1={h0 - 5} x2={OX - 18 * Math.cos(a)} y2={h0 - 5 + 18 * Math.sin(a)} stroke="var(--text)" strokeWidth="7" strokeLinecap="round" />
      {showPrediction && (
        <>
          <polyline
            points={prediction.path.map((p) => `${sx(p.x).toFixed(1)},${(sy(p.y) - 5).toFixed(1)}`).join(' ')}
            fill="none"
            stroke="#f0a85c"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <circle cx={sx(prediction.range)} cy={OY} r="4" fill="none" stroke="#f0a85c" strokeWidth="2" />
        </>
      )}
      <polyline ref={trail} fill="none" stroke={accent} strokeWidth="2" />
      <circle ref={ball} cx={OX} cy={h0 - 5} r="5" fill={accent} />
    </svg>
  )
}
