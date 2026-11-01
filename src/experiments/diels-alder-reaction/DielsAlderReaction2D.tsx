import { useRef } from 'react'
import type { DielsAlderAnalysis } from '../../engines/dielsAlderReaction'
import { useAnimationFrame } from '../../lib/hooks'

const CX = 220
const CY = 150
const R = 60
const pt = (i: number) => {
  const a = ((30 + 60 * i) * Math.PI) / 180
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) }
}

/**
 * Skeletal formula in SVG: the dienophile drops in from above, old double bonds fade and the
 * new ring bonds (teal) appear as the conversion rises.
 */
export function DielsAlderReaction2D({ analysis, progress, label }: { analysis: DielsAlderAnalysis; progress: () => number; label: string }) {
  const dienophile = useRef<SVGGElement>(null)
  const fading = useRef<SVGGElement>(null)
  const growing = useRef<SVGGElement>(null)
  const text = useRef<SVGTextElement>(null)
  const P = [0, 1, 2, 3, 4, 5].map(pt)

  useAnimationFrame(() => {
    const g = Math.min(1, Math.max(0, progress()))
    dienophile.current?.setAttribute('transform', `translate(0 ${(-70 * (1 - g) ** 1.5).toFixed(2)})`)
    fading.current?.setAttribute('opacity', String(1 - g))
    growing.current?.setAttribute('opacity', String(g))
    if (text.current) text.current.textContent = `${(g * 100).toFixed(1)} %`
  }, true)

  // Inner line of a double bond, pulled 8 px towards the ring centre.
  const inner = (i: number, j: number, dy = 0) => {
    const k = 8 / R
    const a = { x: P[i].x + (CX - P[i].x) * k, y: P[i].y + dy + (CY - P[i].y) * k }
    const b = { x: P[j].x + (CX - P[j].x) * k, y: P[j].y + dy + (CY - P[j].y) * k }
    const s = 0.15
    return `M${a.x + (b.x - a.x) * s} ${a.y + (b.y - a.y) * s} L${b.x - (b.x - a.x) * s} ${b.y - (b.y - a.y) * s}`
  }
  const line = (i: number, j: number) => `M${P[i].x} ${P[i].y} L${P[j].x} ${P[j].y}`

  return (
    <svg viewBox="0 0 440 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <g stroke="#4f7cff" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d={`${line(0, 1)} ${line(1, 2)} ${line(2, 3)}`} />
        {analysis.diene.cyclic && <path d={`M${P[0].x} ${P[0].y} Q${CX} ${CY - 20} ${P[3].x} ${P[3].y}`} strokeDasharray="2 6" />}
      </g>
      <g ref={fading} stroke="#4f7cff" strokeWidth="3" strokeLinecap="round">
        <path d={`${inner(0, 1)} ${inner(2, 3)}`} />
      </g>
      <g ref={growing} stroke="#2ccfb5" strokeWidth="4" strokeLinecap="round">
        <path d={`${inner(1, 2)} ${line(3, 4)} ${line(5, 0)}`} />
      </g>
      <g ref={dienophile} stroke="#f59f3a" strokeWidth="4" strokeLinecap="round">
        <path d={line(4, 5)} />
        <path d={inner(4, 5)} opacity={0.6} />
        {analysis.dienophile.ewg > 0 && <circle cx={P[4].x} cy={P[4].y - 24} r="9" fill="#e04848" stroke="none" />}
        {analysis.dienophile.ewg > 1 && <circle cx={P[5].x} cy={P[5].y - 24} r="9" fill="#e04848" stroke="none" />}
      </g>
      <text ref={text} x={CX} y="270" textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--text)" />
    </svg>
  )
}
