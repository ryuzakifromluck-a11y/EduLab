import { useRef } from 'react'
import type { PendulumSimulation } from '../../engines/pendulum'
import { useAnimationFrame } from '../../lib/hooks'
import { useTranslation } from 'react-i18next'

/** Lightweight SVG view for devices without WebGL; reads the same simulation each frame. */
export function Pendulum2D({ sim, accent }: { sim: PendulumSimulation; accent: string }) {
  const { t } = useTranslation()
  const line = useRef<SVGLineElement>(null)
  const bob = useRef<SVGCircleElement>(null)
  const scale = 95 // px per metre
  const px = 200
  const py = 30

  useAnimationFrame(() => {
    const L = sim.params.length * scale
    const x = px + L * Math.sin(sim.state.theta)
    const y = py + L * Math.cos(sim.state.theta)
    line.current?.setAttribute('x2', String(x))
    line.current?.setAttribute('y2', String(y))
    bob.current?.setAttribute('cx', String(x))
    bob.current?.setAttribute('cy', String(y))
  }, true)

  return (
    <svg viewBox="0 0 400 360" className="h-full max-h-[480px] w-full" role="img" aria-label={t('exp.pendulum.view2d')}>
      <line x1="120" y1={py} x2="280" y2={py} stroke="var(--muted)" strokeWidth="4" strokeLinecap="round" />
      <line x1={px} y1={py} x2={px} y2="340" stroke="var(--faint)" strokeDasharray="4 6" />
      <line ref={line} x1={px} y1={py} x2={px} y2={py + 95} stroke="var(--text)" strokeWidth="1.5" />
      <circle cx={px} cy={py} r="4" fill="var(--text)" />
      <circle ref={bob} cx={px} cy={py + 95} r="12" fill={accent} />
    </svg>
  )
}
