import { rgbaToCss } from '../../engines/titration'
import { FLASK, liquidHeight } from '../titration/flaskGeometry'
import { BURETTE_CAPACITY, type WeakBaseController } from './useWeakBaseStrongAcidTitration'

/** SVG view: burette level, flask colour and the pH curve traced so far. */
export function WeakBaseStrongAcidTitration2D({ ctl, label }: { ctl: WeakBaseController; label: string }) {
  const remaining = (BURETTE_CAPACITY - ctl.addedVolume) / BURETTE_CAPACITY
  const liquidTop = 200 - 160 * remaining
  const h = liquidHeight(ctl.params.baseVolume + ctl.addedVolume) / FLASK.coneHeight
  const base = 330
  const yTop = base - 90 * h
  const halfW = (y: number) => 62 - ((62 - 14) * (base - y)) / 90
  // pH curve panel
  const px = (v: number) => 260 + (v / BURETTE_CAPACITY) * 180
  const py = (pH: number) => 300 - (pH / 14) * 220
  const traced = ctl.log.map((p) => `${px(p.volume).toFixed(1)},${py(p.pH).toFixed(1)}`).join(' ')
  return (
    <svg viewBox="0 0 460 350" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <rect x="92" y="40" width="16" height="160" fill="none" stroke="var(--muted)" strokeWidth="2" />
      <rect x="94" y={liquidTop} width="12" height={200 - liquidTop} fill="#ffd2c2" opacity="0.8" />
      <path d="M92 200 L100 222 L108 200" fill="none" stroke="var(--muted)" strokeWidth="2" />
      <path d={`M${100 - halfW(yTop)} ${yTop} L38 ${base} L162 ${base} L${100 + halfW(yTop)} ${yTop} Z`} fill={rgbaToCss(ctl.color)} />
      <path d={`M86 210 V240 L38 ${base} H162 L114 240 V210`} fill="none" stroke="var(--text)" strokeWidth="2" />
      <rect x="260" y="80" width="180" height="220" fill="none" stroke="var(--muted)" />
      <line x1={px(ctl.veq)} y1="80" x2={px(ctl.veq)} y2="300" stroke="#f0a85c" strokeDasharray="4 4" />
      <line x1="260" y1={py(7)} x2="440" y2={py(7)} stroke="var(--muted)" strokeDasharray="2 4" />
      <polyline points={traced} fill="none" stroke="#2ccfb5" strokeWidth="2.5" />
      <text x="350" y="60" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--text)">
        pH {ctl.point.pH.toFixed(2)} · {ctl.addedVolume.toFixed(2)} mL
      </text>
    </svg>
  )
}
