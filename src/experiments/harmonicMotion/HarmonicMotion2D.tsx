import { useRef, type RefObject } from 'react'
import { dampedAngularFrequency, decayRate, phaseRad, stateAt, type ShmParams } from '../../engines/harmonicMotion'
import { useAnimationFrame } from '../../lib/hooks'

const K = 500 // px per metre
const EQ = 330
const WALL = 60
const Y = 220

function springPath(x1: number) {
  const n = 16
  const len = x1 - WALL
  const pts = [`M${WALL} ${Y}`]
  for (let i = 1; i < n; i++) pts.push(`L${WALL + (len * i) / n} ${Y + (i % 2 ? -12 : 12)}`)
  pts.push(`L${x1} ${Y}`)
  return pts.join(' ')
}

/** Spring, block and reference circle drawn in SVG. */
export function HarmonicMotion2D({ clock, label }: { clock: RefObject<{ t: number; params: ShmParams }>; label: string }) {
  const spring = useRef<SVGPathElement>(null)
  const block = useRef<SVGRectElement>(null)
  const ring = useRef<SVGEllipseElement>(null)
  const dot = useRef<SVGCircleElement>(null)
  const drop = useRef<SVGLineElement>(null)

  useAnimationFrame(() => {
    const { t, params } = clock.current
    const s = stateAt(params, t)
    const x = EQ + s.x * K
    spring.current?.setAttribute('d', springPath(x - 22))
    block.current?.setAttribute('x', String(x - 22))
    const r = params.amplitude * Math.exp(-decayRate(params) * t) * K
    const a = dampedAngularFrequency(params) * t + phaseRad(params)
    const cx = EQ + r * Math.cos(a)
    const cy = 100 - r * Math.sin(a) * 0.5
    ring.current?.setAttribute('rx', String(Math.max(0, r)))
    ring.current?.setAttribute('ry', String(Math.max(0, r / 2)))
    dot.current?.setAttribute('cx', String(cx))
    dot.current?.setAttribute('cy', String(cy))
    drop.current?.setAttribute('x1', String(cx))
    drop.current?.setAttribute('x2', String(cx))
    drop.current?.setAttribute('y1', String(cy))
  }, true)

  return (
    <svg viewBox="0 0 560 280" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x={WALL - 12} y={Y - 40} width="12" height="66" fill="var(--muted)" />
      <line x1={WALL} x2="540" y1={Y + 23} y2={Y + 23} stroke="var(--muted)" strokeWidth="3" />
      <line x1={EQ} x2={EQ} y1={Y + 26} y2={Y + 36} stroke="#f0a85c" strokeWidth="2" />
      <path ref={spring} fill="none" stroke="var(--text)" strokeWidth="2" />
      <rect ref={block} y={Y - 22} width="44" height="44" rx="4" fill="#3b5bdb" />
      <ellipse ref={ring} cx={EQ} cy="100" fill="none" stroke="var(--muted)" />
      <circle ref={dot} r="6" fill="#f0a85c" />
      <line ref={drop} y2={Y - 22} stroke="#f0a85c" strokeDasharray="4 4" />
    </svg>
  )
}
