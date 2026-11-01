import { useRef } from 'react'
import type { BallisticRig } from '../../engines/ballisticPendulum'
import { useAnimationFrame } from '../../lib/hooks'

const PX = 600 // px per metre
const PX0 = 230
const PY0 = 40

/** Side view: gun, ball, pendulum and the ratchet pointer on a degree scale. */
export function BallisticPendulum2D({ rig, label }: { rig: BallisticRig; label: string }) {
  const arm = useRef<SVGGElement>(null)
  const pointer = useRef<SVGLineElement>(null)
  const ball = useRef<SVGCircleElement>(null)
  const L = rig.p.L * PX
  const muzzle = PX0 - 22 - rig.gap * PX

  useAnimationFrame(() => {
    arm.current?.setAttribute('transform', `rotate(${(-rig.theta * 180) / Math.PI} ${PX0} ${PY0})`)
    const R = L + 40
    pointer.current?.setAttribute('x2', String(PX0 + R * Math.sin(rig.caught)))
    pointer.current?.setAttribute('y2', String(PY0 + R * Math.cos(rig.caught)))
    if (ball.current) {
      const flying = rig.phase === 'ready' || rig.phase === 'flying'
      ball.current.setAttribute('opacity', flying ? '1' : '0')
      ball.current.setAttribute('cx', String(muzzle + (rig.flight ?? 0) * rig.gap * PX - 6))
    }
  }, true)

  const R = L + 40
  return (
    <svg viewBox="0 0 420 300" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <path d={`M${PX0} ${PY0 + R} A ${R} ${R} 0 0 0 ${PX0 + R} ${PY0}`} fill="none" stroke="var(--muted)" strokeWidth="2" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i * 10 * Math.PI) / 180
        return (
          <g key={i}>
            <line x1={PX0 + (R - 8) * Math.sin(a)} y1={PY0 + (R - 8) * Math.cos(a)} x2={PX0 + R * Math.sin(a)} y2={PY0 + R * Math.cos(a)} stroke="var(--muted)" />
            {i % 2 === 0 && (
              <text x={PX0 + (R + 12) * Math.sin(a)} y={PY0 + (R + 12) * Math.cos(a) + 4} fontSize="10" fill="var(--text)" textAnchor="middle">
                {i * 10}°
              </text>
            )}
          </g>
        )
      })}
      <line ref={pointer} x1={PX0} y1={PY0} x2={PX0} y2={PY0 + R} stroke="#e5484d" strokeWidth="1.5" />
      <g ref={arm}>
        <line x1={PX0} y1={PY0} x2={PX0} y2={PY0 + L} stroke="var(--text)" strokeWidth="3" />
        <rect x={PX0 - 22} y={PY0 + L - 18} width="44" height="36" rx="3" fill="#2f5fb3" />
      </g>
      <circle cx={PX0} cy={PY0} r="4" fill="var(--text)" />
      <rect x={muzzle - 110} y={PY0 + L - 9} width="110" height="18" rx="4" fill="#444b5c" />
      <rect x={muzzle - 70} y={PY0 + L + 9} width="14" height={250 - (PY0 + L + 9)} fill="#3a4256" />
      <circle ref={ball} cx={muzzle} cy={PY0 + L} r="6" fill="#9aa3b5" />
      <line x1="10" y1="250" x2="410" y2="250" stroke="var(--muted)" strokeWidth="2" />
    </svg>
  )
}
