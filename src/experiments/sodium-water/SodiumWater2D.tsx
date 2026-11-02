import { ALKALI } from '../../engines/sodiumWater'
import { BEAKER_RADIUS, type SodiumWaterController } from './useSodiumWater'

/** Side view: beaker, water coloured by the indicator, the piece of metal and its flame. */
export function SodiumWater2D({ ctl, label }: { ctl: SodiumWaterController; label: string }) {
  const W = 200 // beaker width in px
  const cx = 210
  const bottom = 280
  const level = bottom - (ctl.waterVolume / 250) * 220
  const s = ctl.state
  const px = cx + (s.x / BEAKER_RADIUS) * (W / 2 - 10)
  const r = Math.max(2, s.radius * 22)
  const y = ctl.phase === 'ready' ? 30 : ctl.phase === 'falling' ? 30 + (level - 30) * ctl.fallProgress() ** 2 : level - r * 0.4
  const x = ctl.phase === 'ready' || ctl.phase === 'falling' ? cx + 20 * (1 - ctl.fallProgress()) : px
  const c = ctl.color
  const flame = ALKALI[ctl.metal].flame === 'lilac' ? '#c58cff' : '#ffc23a'
  return (
    <svg viewBox="0 0 420 320" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x={cx - W / 2} y={level} width={W} height={bottom - level} fill={`rgba(${c.r},${c.g},${c.b},${Math.max(0.35, c.a)})`} />
      <path d={`M${cx - W / 2} 40 V${bottom} H${cx + W / 2} V40`} fill="none" stroke="var(--muted)" strokeWidth="3" />
      {ctl.phase === 'ready' && <rect x={cx} y={34} width={120} height={4} fill="var(--muted)" />}
      {ctl.phase !== 'done' && <circle cx={x} cy={y} r={r} fill="#cfd3da" stroke="#8a909c" />}
      {ctl.phase === 'reacting' && (
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={x + Math.cos(i + s.t * 9) * (r + 6)} cy={level - 2 - (i % 3) * 3} r={2} fill="white" opacity={0.8} />
          ))}
          {ctl.burning && <path d={`M${x - 10} ${y} Q${x - 12} ${y - 30} ${x} ${y - 46} Q${x + 12} ${y - 30} ${x + 10} ${y} Z`} fill={flame} opacity={0.85} />}
        </g>
      )}
      <text x={20} y={30} fontSize="14" fill="var(--ink)">
        {ctl.temp.toFixed(1)} °C
      </text>
    </svg>
  )
}
