import { useRef } from 'react'
import { CLEAR_UG, type DnaExtractionSimulation, type DnaStage } from '../../engines/dnaExtraction'
import { useAnimationFrame } from '../../lib/hooks'
import { FILTRATE_COLOR } from './useDnaExtraction'

const STRANDS = [
  'M178 150 q6 -14 0 -26 t2 -24',
  'M196 152 q-8 -16 2 -30 t-4 -20',
  'M214 150 q8 -12 -2 -28 t4 -22',
  'M232 152 q-6 -18 4 -30 t-2 -18',
  'M188 146 q10 -10 4 -22',
  'M222 146 q-10 -12 -2 -24',
]

const STEP_OF: Record<DnaStage, number> = {
  sample: 0,
  mashing: 1,
  mashed: 1,
  lysing: 2,
  lysed: 2,
  filtering: 3,
  filtered: 3,
  precipitating: 4,
  precipitated: 4,
  spooled: 5,
}

/** Test tube in SVG: filtrate below, cold ethanol above, white DNA strands at the boundary. */
export function DnaExtraction2D({ sim, label, steps }: { sim: DnaExtractionSimulation; label: string; steps: string[] }) {
  const filtrate = useRef<SVGRectElement>(null)
  const ethanol = useRef<SVGRectElement>(null)
  const dna = useRef<SVGGElement>(null)
  const text = useRef<SVGTextElement>(null)
  const marks = useRef<SVGGElement>(null)

  useAnimationFrame(() => {
    const st = sim.stage
    const after = (s: string[]) => s.includes(st)
    const f = after(['filtered', 'precipitating', 'precipitated', 'spooled']) ? 1 : st === 'filtering' ? sim.progress : 0
    const h = 110 * f
    filtrate.current?.setAttribute('y', String(270 - h))
    filtrate.current?.setAttribute('height', String(h))
    filtrate.current?.setAttribute('fill', FILTRATE_COLOR[sim.settings.source])
    const e = after(['precipitating', 'precipitated', 'spooled']) ? (st === 'precipitating' ? Math.min(1, sim.elapsed / 3) : 1) : 0
    ethanol.current?.setAttribute('y', String(160 - 90 * e))
    ethanol.current?.setAttribute('height', String(90 * e))
    const amount = st === 'spooled' ? 0 : Math.min(1, sim.precipitated / CLEAR_UG)
    if (dna.current) {
      dna.current.setAttribute('opacity', String(amount))
      dna.current.setAttribute('transform', `translate(0 ${10 * (1 - amount)})`)
    }
    if (text.current) text.current.textContent = `${sim.precipitated.toFixed(0)} µg`
    // Step list: the current step is highlighted.
    const idx = STEP_OF[st]
    marks.current?.querySelectorAll('circle').forEach((c, i) => c.setAttribute('fill', i <= idx ? 'var(--biology)' : 'var(--surface-3)'))
  }, true)

  return (
    <svg viewBox="0 -40 420 340" className="h-full max-h-[460px] w-full" role="img" aria-label={label}>
      <defs>
        <clipPath id="dna-tube">
          <path d="M170 30 V250 a35 35 0 0 0 70 0 V30 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#dna-tube)">
        <rect ref={filtrate} x="160" y="270" width="90" height="0" />
        <rect ref={ethanol} x="160" y="160" width="90" height="0" fill="#cfe5ff" opacity="0.6" />
        <g ref={dna} stroke="#fbfbf7" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0">
          {STRANDS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
      <path d="M170 30 V250 a35 35 0 0 0 70 0 V30" fill="none" stroke="var(--text)" strokeWidth="3" />
      <text ref={text} x="255" y="120" fontSize="16" fontWeight="600" fill="var(--text)" />
      <g ref={marks} fontSize="12" fill="var(--muted)">
        {steps.map((s, i) => (
          <g key={i} transform={`translate(18 ${48 + i * 36})`}>
            <circle r="7" cx="6" cy="-4" />
            <text x="20">{s}</text>
          </g>
        ))}
      </g>
    </svg>
  )
}
