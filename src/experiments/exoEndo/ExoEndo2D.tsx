import { useRef } from 'react'
import type { CalorimeterSimulation } from '../../engines/calorimetry'
import { useAnimationFrame } from '../../lib/hooks'

/** Cup and thermometer in SVG. */
export function ExoEndo2D({ sim, label }: { sim: CalorimeterSimulation; label: string }) {
  const column = useRef<SVGRectElement>(null)
  const pile = useRef<SVGPathElement>(null)
  const text = useRef<SVGTextElement>(null)

  useAnimationFrame(() => {
    const h = Math.max(2, (sim.temperature / 60) * 200)
    column.current?.setAttribute('y', String(250 - h))
    column.current?.setAttribute('height', String(h))
    pile.current?.setAttribute('opacity', sim.started ? String(1 - sim.extent) : '0')
    if (text.current) text.current.textContent = `${sim.temperature.toFixed(1)} °C`
  }, true)

  const level = 240 - (sim.params.water / 200) * 120
  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <path d={`M90 ${level} L104 260 H236 L250 ${level} Z`} fill="#cfe3f2" opacity="0.8" />
      <path d="M80 80 L104 260 H236 L260 80" fill="none" stroke="var(--text)" strokeWidth="3" />
      <path ref={pile} d="M140 260 Q170 236 200 260 Z" fill="#ffffff" stroke="var(--muted)" />
      <rect x="296" y="40" width="16" height="220" rx="8" fill="none" stroke="var(--text)" strokeWidth="2" />
      <circle cx="304" cy="262" r="12" fill="#d6453d" />
      <rect ref={column} x="300" y="200" width="8" height="50" fill="#d6453d" />
      <text ref={text} x="324" y="60" fontSize="18" fontWeight="600" fill="var(--text)" />
    </svg>
  )
}
