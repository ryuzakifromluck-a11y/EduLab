import { useRef } from 'react'
import { useAnimationFrame } from '../../lib/hooks'
import type { RcLive } from './RcBoard'

/**
 * Circuit diagram for the 2D view of both RC labs, with a live capacitor
 * voltage bar and the current direction.
 */
export function RcSchematic({ variant, live, label, texts }: { variant: 'charging' | 'discharging'; live: () => RcLive; label: string; texts: { R: string; C: string; V: string } }) {
  const bar = useRef<SVGRectElement>(null)
  const vText = useRef<SVGTextElement>(null)
  const iText = useRef<SVGTextElement>(null)
  const lever = useRef<SVGLineElement>(null)
  const arrow = useRef<SVGGElement>(null)

  useAnimationFrame(() => {
    const s = live()
    const f = Math.max(0, Math.min(1, s.Vc / Math.max(0.001, s.V0)))
    bar.current?.setAttribute('height', String(120 * f))
    bar.current?.setAttribute('y', String(250 - 120 * f))
    if (vText.current) vText.current.textContent = `${s.Vc.toFixed(2)} V`
    if (iText.current) iText.current.textContent = `${(s.I * 1000).toFixed(3)} mA`
    if (lever.current) {
      if (variant === 'charging') lever.current.setAttribute('x2', s.switched ? '200' : '186')
      else lever.current.setAttribute('x2', s.switched ? '250' : '150')
      if (variant === 'charging') lever.current.setAttribute('y2', s.switched ? '60' : '30')
    }
    arrow.current?.setAttribute('opacity', Math.abs(s.I) / Math.max(1e-12, s.Imax) > 0.01 ? '1' : '0.15')
  }, true)

  const stroke = 'var(--text)'
  return (
    <svg viewBox="0 0 420 320" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      {variant === 'charging' ? (
        <g fill="none" stroke={stroke} strokeWidth="2">
          {/* battery left */}
          <path d="M60 60 V140 M60 180 V260 H320 V200 M320 160 V60 H210 M150 60 H60" />
          <line x1="45" y1="140" x2="75" y2="140" strokeWidth="3" />
          <line x1="52" y1="152" x2="68" y2="152" strokeWidth="3" />
          <line x1="45" y1="164" x2="75" y2="164" strokeWidth="3" />
          <line x1="52" y1="176" x2="68" y2="176" strokeWidth="3" />
          {/* switch */}
          <circle cx="150" cy="60" r="4" fill={stroke} />
          <circle cx="206" cy="60" r="4" fill={stroke} />
          <line ref={lever} x1="150" y1="60" x2="186" y2="30" strokeWidth="3" />
          {/* resistor on top-right */}
          <rect x="240" y="50" width="50" height="20" fill="var(--surface)" />
          {/* capacitor on right */}
          <line x1="300" y1="160" x2="340" y2="160" strokeWidth="4" />
          <line x1="300" y1="200" x2="340" y2="200" strokeWidth="4" />
        </g>
      ) : (
        <g fill="none" stroke={stroke} strokeWidth="2">
          <path d="M60 60 V140 M60 180 V260 H350 V60 H262 M138 60 H60 M200 60 V160 M200 200 V260" />
          <line x1="45" y1="140" x2="75" y2="140" strokeWidth="3" />
          <line x1="52" y1="152" x2="68" y2="152" strokeWidth="3" />
          <line x1="45" y1="164" x2="75" y2="164" strokeWidth="3" />
          <line x1="52" y1="176" x2="68" y2="176" strokeWidth="3" />
          <circle cx="200" cy="60" r="4" fill={stroke} />
          <circle cx="146" cy="60" r="4" fill={stroke} />
          <circle cx="254" cy="60" r="4" fill={stroke} />
          <line ref={lever} x1="200" y1="60" x2="150" y2="60" strokeWidth="3" />
          <text x="140" y="48" fontSize="12" fill={stroke} stroke="none">A</text>
          <text x="250" y="48" fontSize="12" fill={stroke} stroke="none">B</text>
          <rect x="340" y="130" width="20" height="50" fill="var(--surface)" />
          <line x1="180" y1="160" x2="220" y2="160" strokeWidth="4" />
          <line x1="180" y1="200" x2="220" y2="200" strokeWidth="4" />
        </g>
      )}
      <g fontSize="13" fill="var(--text)">
        <text x="20" y="165">{texts.V}</text>
        {variant === 'charging' ? (
          <>
            <text x="248" y="40">{texts.R}</text>
            <text x="348" y="185">{texts.C}</text>
          </>
        ) : (
          <>
            <text x="368" y="160">{texts.R}</text>
            <text x="228" y="185">{texts.C}</text>
          </>
        )}
      </g>
      <g ref={arrow} fill="#e5a50a" stroke="none">
        {variant === 'charging' ? <path d="M175 252 l14 8 l-14 8 z" /> : <path d="M285 252 l-14 8 l14 8 z" />}
      </g>
      {/* capacitor voltage bar */}
      <rect x="388" y="130" width="18" height="120" fill="none" stroke="var(--muted)" />
      <rect ref={bar} x="388" y="250" width="18" height="0" fill="#3b82f6" />
      <text ref={vText} x="404" y="122" fontSize="12" textAnchor="end" fill="var(--text)" />
      <text ref={iText} x="120" y="300" fontSize="13" fill="var(--text)" />
    </svg>
  )
}
