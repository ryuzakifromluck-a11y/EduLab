import { useRef } from 'react'
import type { SpringSystem } from '../../engines/hookesLaw'
import { useAnimationFrame } from '../../lib/hooks'

const K = 230 // px per metre
const TOP = 30

function coil(len: number) {
  const n = 18
  const pts = [`M200 ${TOP}`]
  for (let i = 1; i < n; i++) pts.push(`L${200 + (i % 2 ? -14 : 14)} ${TOP + (len * i) / n}`)
  pts.push(`L200 ${TOP + len}`)
  return pts.join(' ')
}

/** Spring, slotted masses and a ruler in SVG. */
export function HookesLaw2D({ sys, label }: { sys: SpringSystem; label: string }) {
  const path = useRef<SVGPathElement>(null)
  const load = useRef<SVGGElement>(null)
  const pointer = useRef<SVGPathElement>(null)
  const zero = TOP + sys.spring.length * K

  useAnimationFrame(() => {
    const len = (sys.spring.length + Math.max(0, sys.x)) * K
    path.current?.setAttribute('d', coil(len))
    path.current?.setAttribute('stroke', sys.overLimit ? '#d9731a' : 'var(--text)')
    load.current?.setAttribute('transform', `translate(0 ${TOP + len})`)
    pointer.current?.setAttribute('transform', `translate(0 ${TOP + len})`)
    const n = (sys.massKg * 1000) / 50
    load.current?.querySelectorAll('rect').forEach((r, i) => r.setAttribute('opacity', i < n ? '1' : '0'))
  }, true)

  return (
    <svg viewBox="0 0 420 330" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <line x1="120" y1={TOP} x2="230" y2={TOP} stroke="var(--muted)" strokeWidth="6" />
      <path ref={path} fill="none" strokeWidth="2.5" />
      <g ref={load}>
        <line x1="200" y1="0" x2="200" y2="12" stroke="var(--text)" strokeWidth="2" />
        {Array.from({ length: 20 }, (_, i) => (
          <rect key={i} x="180" y={12 + i * 6} width="40" height="5" fill="#c9a24a" />
        ))}
      </g>
      <g>
        <rect x="260" y={zero - 4} width="44" height={K + 8} fill="#f3e7c4" />
        {Array.from({ length: 21 }, (_, i) => (
          <g key={i}>
            <line x1="260" x2={i % 2 ? 268 : 274} y1={zero + (i * 5 * K) / 100} y2={zero + (i * 5 * K) / 100} stroke="#222" />
            {i % 4 === 0 && (
              <text x="278" y={zero + (i * 5 * K) / 100 + 4} fontSize="10" fill="#222">
                {i * 5}
              </text>
            )}
          </g>
        ))}
      </g>
      <path ref={pointer} d="M224 0 L246 -6 L246 6 Z" fill="#e5484d" />
    </svg>
  )
}
