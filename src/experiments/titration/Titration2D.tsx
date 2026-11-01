import { rgbaToCss } from '../../engines/titration'
import { BURETTE_CAPACITY, type TitrationController } from './useTitration'
import { liquidHeight, FLASK } from './flaskGeometry'
import { useTranslation } from 'react-i18next'

/** SVG view for devices without WebGL; levels and colour come from the same engine values. */
export function Titration2D({ ctl }: { ctl: TitrationController }) {
  const { t } = useTranslation()
  const remaining = (BURETTE_CAPACITY - ctl.addedVolume) / BURETTE_CAPACITY
  const buretteTop = 40
  const buretteBottom = 200
  const liquidTop = buretteBottom - (buretteBottom - buretteTop) * remaining
  const h = liquidHeight(ctl.params.acidVolume + ctl.addedVolume) / FLASK.coneHeight // 0–1
  const flaskBase = 330
  const flaskH = 90
  const yTop = flaskBase - flaskH * h
  const halfW = (y: number) => 62 - ((62 - 14) * (flaskBase - y)) / flaskH
  return (
    <svg viewBox="0 0 300 350" className="h-full max-h-[460px] w-full" role="img" aria-label={t('exp.titration.view2d')}>
      <rect x="142" y={buretteTop} width="16" height={buretteBottom - buretteTop} fill="none" stroke="var(--muted)" strokeWidth="2" />
      <rect x="144" y={liquidTop} width="12" height={buretteBottom - liquidTop} fill="#cfe3ff" opacity="0.8" />
      <path d="M142 200 L150 222 L158 200" fill="none" stroke="var(--muted)" strokeWidth="2" />
      <line x1="150" y1="222" x2="150" y2="232" stroke="var(--muted)" strokeWidth="2" />
      {[0, 10, 20, 30, 40, 50].map((ml) => {
        const y = buretteTop + ((buretteBottom - buretteTop) * ml) / BURETTE_CAPACITY
        return (
          <g key={ml}>
            <line x1="158" y1={y} x2="164" y2={y} stroke="var(--muted)" />
            <text x="168" y={y + 3} fontSize="9" fill="var(--muted)">{ml}</text>
          </g>
        )
      })}
      <path
        d={`M${150 - halfW(yTop)} ${yTop} L${150 - 62} ${flaskBase} L${150 + 62} ${flaskBase} L${150 + halfW(yTop)} ${yTop} Z`}
        fill={rgbaToCss(ctl.color)}
      />
      <path d={`M136 ${flaskBase - flaskH - 30} V${flaskBase - flaskH} L88 ${flaskBase} H212 L164 ${flaskBase - flaskH} V${flaskBase - flaskH - 30}`} fill="none" stroke="var(--text)" strokeWidth="2" />
    </svg>
  )
}
