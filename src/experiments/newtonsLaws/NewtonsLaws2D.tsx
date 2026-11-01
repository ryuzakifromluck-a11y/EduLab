import { useRef } from 'react'
import { appliedForce, frictionForce, type CartSimulation } from '../../engines/newtonsLaws'
import { useAnimationFrame } from '../../lib/hooks'
import { TRACK } from './useNewtonsLaws'

const X0 = 30
const W = 520
const K = W / TRACK
const FORCE_PX = 90 / 40

/** Side view of the track and cart with the horizontal forces drawn to scale. */
export function NewtonsLaws2D({ sim, label }: { sim: CartSimulation; label: string }) {
  const cart = useRef<SVGGElement>(null)
  const push = useRef<SVGLineElement>(null)
  const fric = useRef<SVGLineElement>(null)

  useAnimationFrame(() => {
    const x = X0 + sim.x * K
    cart.current?.setAttribute('transform', `translate(${x} 0)`)
    const F = appliedForce(sim.params) * FORCE_PX
    const f = (sim.finished ? 0 : frictionForce(sim.params, sim.v)) * FORCE_PX
    if (push.current) {
      push.current.setAttribute('x1', String(-F - 4))
      push.current.setAttribute('opacity', F > 1 ? '1' : '0')
    }
    if (fric.current) {
      fric.current.setAttribute('x2', String(30 + f))
      fric.current.setAttribute('opacity', Math.abs(f) > 1 ? '1' : '0')
    }
  }, true)

  return (
    <svg viewBox="0 0 600 260" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <defs>
        <marker id="nl-g" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#2fbf71" />
        </marker>
        <marker id="nl-r" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#e5484d" />
        </marker>
      </defs>
      <rect x={X0 - 10} y="170" width={W + 40} height="10" fill="var(--muted)" opacity="0.5" />
      <rect x={X0 + W + 30} y="130" width="8" height="40" fill="#e5484d" />
      {Array.from({ length: TRACK / 2 + 1 }, (_, i) => (
        <g key={i}>
          <line x1={X0 + i * 2 * K} y1="180" x2={X0 + i * 2 * K} y2="188" stroke="var(--muted)" />
          <text x={X0 + i * 2 * K} y="202" fontSize="11" textAnchor="middle" fill="var(--muted)">
            {i * 2} m
          </text>
        </g>
      ))}
      <g ref={cart}>
        <rect x="0" y="128" width="60" height="30" rx="4" fill="#3b5bdb" />
        <circle cx="14" cy="162" r="8" fill="var(--text)" />
        <circle cx="46" cy="162" r="8" fill="var(--text)" />
        <line ref={push} x1="-40" y1="143" x2="-4" y2="143" stroke="#2fbf71" strokeWidth="5" markerEnd="url(#nl-g)" />
        <line ref={fric} x1="30" y1="176" x2="10" y2="176" stroke="#e5484d" strokeWidth="4" markerEnd="url(#nl-r)" />
      </g>
    </svg>
  )
}
