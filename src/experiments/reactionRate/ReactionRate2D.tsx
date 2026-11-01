import { useRef } from 'react'
import type { ReactionSimulation } from '../../engines/reactionRate'
import { useAnimationFrame } from '../../lib/hooks'

/**
 * SVG view for devices without WebGL: the flask from the side and, as the
 * student sees it, the cross looking down through the solution.
 */
export function ReactionRate2D({ sim, labels }: { sim: ReactionSimulation; labels: { side: string; top: string } }) {
  const side = useRef<SVGPathElement>(null)
  const top = useRef<SVGCircleElement>(null)
  const cross = useRef<SVGGElement>(null)
  const clock = useRef<SVGTextElement>(null)

  useAnimationFrame(() => {
    const turb = sim.turbidity
    const fill = `rgba(242, 231, 168, ${(0.2 + 0.78 * turb).toFixed(3)})`
    side.current?.setAttribute('fill', fill)
    top.current?.setAttribute('fill', fill)
    cross.current?.setAttribute('opacity', (0.08 + 0.92 * sim.visibility).toFixed(3))
    if (clock.current) clock.current.textContent = `${sim.time.toFixed(1)} s`
  }, true)

  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label="Disappearing cross reaction (2D view)">
      {/* Side view */}
      <rect x="20" y="246" width="170" height="8" fill="#f7f7f4" stroke="var(--line)" />
      <path ref={side} d="M56 245 L154 245 L127 188 L83 188 Z" fill="rgba(242,231,168,0.2)" />
      <path d="M93 120 V160 L52 246 H158 L117 160 V120" fill="none" stroke="var(--text)" strokeWidth="2" />
      <text x="105" y="280" fontSize="11" textAnchor="middle" fill="var(--muted)">{labels.side}</text>

      {/* Looking down through the flask */}
      <rect x="230" y="60" width="170" height="170" rx="6" fill="#f7f7f4" stroke="var(--line)" />
      <g ref={cross} stroke="#111318" strokeWidth="12" strokeLinecap="round">
        <line x1="275" y1="105" x2="355" y2="185" />
        <line x1="355" y1="105" x2="275" y2="185" />
      </g>
      <circle ref={top} cx="315" cy="145" r="72" fill="rgba(242,231,168,0.2)" />
      <circle cx="315" cy="145" r="72" fill="none" stroke="var(--text)" strokeWidth="2" />
      <text x="315" y="280" fontSize="11" textAnchor="middle" fill="var(--muted)">{labels.top}</text>
      <text ref={clock} x="20" y="40" fontSize="22" fontWeight="600" fill="var(--text)" className="tabular">0.0 s</text>
    </svg>
  )
}
