import { useRef } from 'react'
import type { DilutionSimulation } from '../../engines/dilution'
import { useAnimationFrame } from '../../lib/hooks'
import { blueness } from './useDilution'

const mixHex = (k: number) => {
  const a = [0xe3, 0xee, 0xf7]
  const b = [0x1f, 0x63, 0xc9]
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`
}

/** Volumetric flask in SVG; the fill rises and darkens with the solution. */
export function Dilution2D({ sim, label }: { sim: DilutionSimulation; label: string }) {
  const fill = useRef<SVGRectElement>(null)
  const text = useRef<SVGTextElement>(null)

  useAnimationFrame(() => {
    const f = sim.volume / sim.v2
    // Bulb from y=270 to y=130, neck to the mark at y=70.
    const y = f <= 0.92 ? 270 - (f / 0.92) * 140 : 130 - ((f - 0.92) / 0.08) * 60
    fill.current?.setAttribute('y', String(y))
    fill.current?.setAttribute('height', String(280 - y))
    fill.current?.setAttribute('fill', mixHex(blueness(sim.concentration) * (sim.stage === 'empty' ? 0 : 0.3 + 0.7 * sim.mixing)))
    if (text.current) text.current.textContent = `${sim.volume.toFixed(1)} / ${sim.v2} mL`
  }, true)

  const outline = 'M200 30 V130 A72 72 0 1 0 220 130 V30'
  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <defs>
        <clipPath id="dilution-flask">
          <path d="M200 0 V130 A72 72 0 1 0 220 130 V0 Z" />
        </clipPath>
      </defs>
      <rect ref={fill} x="120" y="270" width="180" height="10" clipPath="url(#dilution-flask)" />
      <path d={outline} fill="none" stroke="var(--text)" strokeWidth="3" />
      <line x1="194" x2="226" y1="70" y2="70" stroke="var(--text)" strokeWidth="2" />
      <text ref={text} x="300" y="80" fontSize="16" fontWeight="600" fill="var(--text)" />
    </svg>
  )
}
