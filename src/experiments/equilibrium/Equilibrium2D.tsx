import { useRef } from 'react'
import type { EquilibriumSimulation } from '../../engines/equilibrium'
import { useAnimationFrame } from '../../lib/hooks'
import { V_MAX } from './useEquilibrium'

/** Gas syringe in SVG: the barrel darkens with the NO₂ concentration. */
export function Equilibrium2D({ sim, label }: { sim: EquilibriumSimulation; label: string }) {
  const gas = useRef<SVGRectElement>(null)
  const piston = useRef<SVGGElement>(null)
  const text = useRef<SVGTextElement>(null)

  useAnimationFrame(() => {
    const w = (sim.volume / V_MAX) * 300
    gas.current?.setAttribute('width', String(w))
    gas.current?.setAttribute('opacity', String(Math.min(0.9, sim.no2 * 24)))
    piston.current?.setAttribute('transform', `translate(${w} 0)`)
    if (text.current) text.current.textContent = `[NO₂] = ${(sim.no2 * 1000).toFixed(1)} mmol/L · ${sim.tempC.toFixed(0)} °C`
  }, true)

  return (
    <svg viewBox="0 0 440 240" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect ref={gas} x="40" y="90" width="150" height="80" fill="#9a4416" opacity="0.3" />
      <path d="M40 90 H360 M40 170 H360 M40 90 V170" fill="none" stroke="var(--text)" strokeWidth="3" />
      <g ref={piston}>
        <rect x="40" y="92" width="10" height="76" fill="var(--text)" />
        <rect x="50" y="126" width="140" height="8" fill="var(--muted)" />
      </g>
      <text ref={text} x="220" y="50" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--text)" />
    </svg>
  )
}
