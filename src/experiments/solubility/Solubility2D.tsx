import { useRef } from 'react'
import { saltById, type SolutionSimulation } from '../../engines/solubility'
import { useAnimationFrame } from '../../lib/hooks'

/** Beaker with a pile of undissolved salt, in SVG. */
export function Solubility2D({ sim, label }: { sim: SolutionSimulation; label: string }) {
  const pile = useRef<SVGPathElement>(null)
  const liquid = useRef<SVGRectElement>(null)
  const text = useRef<SVGTextElement>(null)

  useAnimationFrame(() => {
    const h = Math.min(70, Math.sqrt(sim.undissolved) * 6)
    pile.current?.setAttribute('d', h > 0.5 ? `M120 250 Q210 ${250 - 2 * h} 300 250 Z` : 'M0 0')
    const salt = saltById(sim.salt)
    const op = salt.color ? Math.min(0.85, 0.25 + sim.dissolved / 50) : 0.5
    liquid.current?.setAttribute('fill', salt.color ?? '#cfe3f2')
    liquid.current?.setAttribute('opacity', String(op))
    if (text.current) text.current.textContent = `${sim.temperature.toFixed(0)} °C · ${sim.dissolved.toFixed(1)} g`
  }, true)

  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect ref={liquid} x="112" y="120" width="196" height="130" fill="#cfe3f2" opacity="0.5" />
      <path ref={pile} d="M0 0" fill={saltById(sim.salt).color ?? '#ffffff'} stroke="var(--muted)" />
      <path d="M110 60 V252 H310 V60" fill="none" stroke="var(--text)" strokeWidth="3" />
      <rect x="90" y="254" width="240" height="20" rx="4" fill="var(--muted)" opacity="0.5" />
      <text ref={text} x="210" y="40" textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--text)" />
    </svg>
  )
}
