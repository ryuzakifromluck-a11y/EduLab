import { useRef } from 'react'
import { useAnimationFrame } from '../../lib/hooks'
import { markerSpeed, pointOnLoop, LOOP } from './circuitPath'
import type { OhmController } from './useOhm'
import { useTranslation } from 'react-i18next'

const N = 24

/** Schematic SVG view (no WebGL needed), animated from the same live values as the 3D scene. */
export function Circuit2D({ ctl, ammeter, voltmeter }: { ctl: OhmController; ammeter: string; voltmeter: string }) {
  const { t } = useTranslation()
  const dots = useRef<(SVGCircleElement | null)[]>([])
  const phase = useRef(0)
  // Map loop coordinates (x −2…2, z −1.2…1.2) to SVG space.
  const sx = (x: number) => 200 + x * 75
  const sy = (z: number) => 200 + z * 80

  useAnimationFrame((dt) => {
    const { current, closed, running } = ctl.live.current
    if (running) phase.current += markerSpeed(current) * dt
    dots.current.forEach((el, i) => {
      if (!el) return
      const [x, z] = pointOnLoop(phase.current + i / N)
      el.setAttribute('cx', String(sx(x)))
      el.setAttribute('cy', String(sy(z)))
      el.style.opacity = closed ? '1' : '0'
    })
  }, true)

  const { x0, x1, z0, z1 } = LOOP
  return (
    <svg viewBox="-20 0 450 350" className="h-full max-h-[460px] w-full" role="img" aria-label={t('exp.ohm.view2d')}>
      <g stroke="var(--text)" strokeWidth="2" fill="none">
        <rect x={sx(x0)} y={sy(z0)} width={sx(x1) - sx(x0)} height={sy(z1) - sy(z0)} />
      </g>
      {/* battery */}
      <rect x={sx(x0) - 14} y={sy(0) - 24} width="28" height="48" fill="var(--canvas-bg)" />
      <line x1={sx(x0) - 14} y1={sy(0) - 8} x2={sx(x0) + 14} y2={sy(0) - 8} stroke="var(--text)" strokeWidth="3" />
      <line x1={sx(x0) - 7} y1={sy(0) + 8} x2={sx(x0) + 7} y2={sy(0) + 8} stroke="var(--text)" strokeWidth="5" />
      <text x={sx(x0) - 22} y={sy(0) + 4} textAnchor="end" fontSize="12" fill="var(--text)">{ctl.voltage.toFixed(1)} V</text>
      {/* resistor */}
      <rect x={sx(0) - 36} y={sy(z0) - 10} width="72" height="20" rx="3" fill="var(--canvas-bg)" stroke="var(--text)" strokeWidth="2" />
      <text x={sx(0)} y={sy(z0) - 18} fontSize="12" textAnchor="middle" fill="var(--text)">{ctl.resistance.toFixed(0)} Ω</text>
      {/* voltmeter */}
      <path d={`M${sx(-0.5)} ${sy(z0)} V${sy(z0) - 50} H${sx(0) - 16} M${sx(0.5)} ${sy(z0)} V${sy(z0) - 50} H${sx(0) + 16}`} stroke="var(--muted)" strokeWidth="1.5" fill="none" />
      <circle cx={sx(0)} cy={sy(z0) - 50} r="16" fill="var(--canvas-bg)" stroke="var(--text)" strokeWidth="2" />
      <text x={sx(0)} y={sy(z0) - 46} fontSize="13" fontWeight="700" textAnchor="middle" fill="var(--text)">V</text>
      <text x={sx(0) + 24} y={sy(z0) - 46} fontSize="12" fill="var(--text)">{voltmeter}</text>
      {/* ammeter */}
      <circle cx={sx(x1)} cy={sy(0)} r="16" fill="var(--canvas-bg)" stroke="var(--text)" strokeWidth="2" />
      <text x={sx(x1)} y={sy(0) + 4} fontSize="13" fontWeight="700" textAnchor="middle" fill="var(--text)">A</text>
      <text x={sx(x1) + 22} y={sy(0) + 4} fontSize="12" fill="var(--text)">{ammeter}</text>
      {/* switch */}
      <rect x={sx(0) - 28} y={sy(z1) - 4} width="56" height="8" fill="var(--canvas-bg)" />
      <circle cx={sx(0) - 24} cy={sy(z1)} r="3" fill="var(--text)" />
      <circle cx={sx(0) + 24} cy={sy(z1)} r="3" fill="var(--text)" />
      <line
        x1={sx(0) - 24}
        y1={sy(z1)}
        x2={sx(0) + 24}
        y2={ctl.closed ? sy(z1) : sy(z1) - 22}
        stroke="var(--text)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ cursor: 'pointer' }}
        onClick={ctl.toggleSwitch}
      />
      {Array.from({ length: N }, (_, i) => (
        <circle key={i} ref={(el) => void (dots.current[i] = el)} r="3.5" fill="#f5a524" />
      ))}
    </svg>
  )
}
