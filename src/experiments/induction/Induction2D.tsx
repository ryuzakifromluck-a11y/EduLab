import { useRef } from 'react'
import { peakEmf, type InductionSimulation } from '../../engines/induction'
import { useAnimationFrame } from '../../lib/hooks'

const K = 900 // px per metre
const COIL_X = 120

/** Coil, moving magnet and centre-zero meter in SVG. */
export function Induction2D({ sim, label }: { sim: InductionSimulation; label: string }) {
  const magnet = useRef<SVGGElement>(null)
  const needle = useRef<SVGLineElement>(null)

  useAnimationFrame(() => {
    const flip = sim.params.polarity === 1 ? 1 : -1
    magnet.current?.setAttribute('transform', `translate(${COIL_X + sim.z * K} 120) scale(${flip} 1)`)
    const ref = Math.max(1e-6, peakEmf({ ...sim.params, frequency: 1 }, 90))
    const d = Math.max(-1, Math.min(1, sim.emf / (ref * 2.2)))
    const a = -Math.PI / 2 + d * 1.1
    needle.current?.setAttribute('x2', String(300 + 70 * Math.cos(a)))
    needle.current?.setAttribute('y2', String(250 + 70 * Math.sin(a)))
  }, true)

  return (
    <svg viewBox="0 0 460 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      {Array.from({ length: 12 }, (_, i) => (
        <ellipse key={i} cx={COIL_X - 30 + i * 5} cy="120" rx="6" ry="34" fill="none" stroke="#c4682f" strokeWidth="2.5" />
      ))}
      <g ref={magnet}>
        <rect x="-40" y="-10" width="40" height="20" fill="#e5484d" />
        <rect x="0" y="-10" width="40" height="20" fill="#3b6fe0" />
        <text x="-20" y="5" fontSize="12" fontWeight="700" textAnchor="middle" fill="#fff">N</text>
        <text x="20" y="5" fontSize="12" fontWeight="700" textAnchor="middle" fill="#fff">S</text>
      </g>
      <path d={`M${COIL_X - 30} 154 V250 H220 M${COIL_X + 30} 154 V230 H220`} fill="none" stroke="var(--muted)" strokeWidth="2" />
      <path d="M220 250 A80 80 0 0 1 380 250" fill="var(--canvas-bg)" stroke="var(--text)" strokeWidth="2" />
      <line x1="300" y1="250" x2="300" y2="180" stroke="var(--muted)" strokeDasharray="3 3" />
      <line ref={needle} x1="300" y1="250" x2="300" y2="180" stroke="#e5484d" strokeWidth="3" strokeLinecap="round" />
      <circle cx="300" cy="250" r="5" fill="var(--text)" />
    </svg>
  )
}
