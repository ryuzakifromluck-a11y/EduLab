import { Check, Droplets, Flame, Shuffle, X as XIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { METALS, METAL_IDS, flameColor, photonEnergy, strongestLine, wavelengthToRgb, type MetalId } from '../../engines/flameTest'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { SelectField, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtInt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { SPEEDS, useFlameTest, type SampleId } from './useFlameTest'
import { FlameTestScene } from './FlameTestScene'
import { FlameTest2D } from './FlameTest2D'

const P = 'exp.flame-test'
const REFERENCE = METAL_IDS.map((id) => ({ id, hex: flameColor({ [id]: 1 }).hex, rgb: flameColor({ [id]: 1 }).rgb }))
const GRADIENT = Array.from({ length: 21 }, (_, i) => {
  const nm = 380 + i * 20
  const [r, g, b] = wavelengthToRgb(nm)
  return { offset: `${(i / 20) * 100}%`, color: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})` }
})
const ENERGY_CURVE = Array.from({ length: 81 }, (_, i) => {
  const nm = 380 + i * 5
  return { nm, E: photonEnergy(nm).eV }
})

export default function FlameTestExperiment() {
  const { t } = useTranslation()
  const x = useFlameTest()
  const c = useChartTheme()
  const experiment = findExperiment('chemistry', 'flame-test')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)

  const peak = x.inFlame && x.color.strength > 0.05 ? x.spectrum.reduce((a, b) => (b.I > a.I ? b : a)) : null
  const energy = peak ? photonEnergy(peak.nm) : null
  // Name of the reference colour closest to what is seen.
  const observed = useMemo(() => {
    if (!x.inFlame || x.color.strength < 0.1) return t(`${P}.colors.blue`)
    const { r, g, b } = x.color.rgb
    const best = REFERENCE.reduce((a, ref) => {
      const d = (ref.rgb.r - r) ** 2 + (ref.rgb.g - g) ** 2 + (ref.rgb.b - b) ** 2
      return d < a.d ? { d, id: ref.id } : a
    }, { d: Infinity, id: 'Na' as MetalId })
    return t(`${P}.colors.${METALS[best.id].colorName}`)
  }, [x.inFlame, x.color, t])
  const sampleName = (s: SampleId) => (s === 'unknown' ? t(`${P}.unknown`) : `${METALS[s].salt} (${METALS[s].ion})`)
  const traces = x.loaded.filter((id) => id !== x.metal || x.sample === 'unknown')
  const wireText = x.loaded.length === 0 ? t(`${P}.wire.clean`) : x.cleaned ? t(`${P}.wire.loaded`) : t(`${P}.wire.contaminated`)
  const lines = x.loaded.flatMap((id) => METALS[id].lines.map((l) => ({ nm: l.wavelength, E: photonEnergy(l.wavelength).eV })))

  const measurements: Measurement[] = [
    { id: 'colour', label: t(`${P}.m.colour`), value: observed, tone: 'accent', sub: x.color.hex.toUpperCase() },
    { id: 'line', label: t(`${P}.m.line`), value: peak ? fmt(peak.nm, 0) : '—', unit: peak ? 'nm' : undefined },
    { id: 'energy', label: 'ΔE = hc/λ', value: energy ? fmt(energy.eV, 3) : '—', unit: energy ? 'eV' : undefined, sub: energy ? `${fmtSig(energy.joules * 1e19, 3)} × 10⁻¹⁹ J` : undefined },
    { id: 'salt', label: t(`${P}.m.salt`), value: fmtInt(x.loadAmount(x.metal) * 100), unit: '%', sub: sampleName(x.sample) },
    { id: 'wire', label: t(`${P}.m.wire`), value: wireText, tone: !x.cleaned && x.loaded.length > 0 ? 'warn' : 'default', sub: traces.length && !x.cleaned ? t(`${P}.wire.traces`) : undefined },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'spectrum',
      title: t(`${P}.chart.spectrum`),
      data: x.inFlame ? x.spectrum : x.spectrum.map((p) => ({ ...p, I: 0 })),
      caption: t(`${P}.chart.spectrumCaption`),
      render: (d: { nm: number; I: number }[]) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="flame-spectrum" x1="0" y1="0" x2="1" y2="0">
                {GRADIENT.map((g) => (
                  <stop key={g.offset} offset={g.offset} stopColor={g.color} />
                ))}
              </linearGradient>
            </defs>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="nm" type="number" domain={[380, 780]} ticks={[400, 450, 500, 550, 600, 650, 700, 750]} label={L.x(t(`${P}.axis.wavelength`))} {...axisProps(c)} />
            <YAxis domain={[0, 1]} width={40} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.intensity`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${v} nm`} formatter={(v) => [fmt(Number(v), 2), t(`${P}.axis.intensity`)]} />
            <Area dataKey="I" type="monotone" stroke={c.marker} strokeWidth={1} fill="url(#flame-spectrum)" fillOpacity={0.9} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-flame-test-spectrum', headers: ['wavelength_nm', 'relative_intensity'], rows: x.spectrum.map((p) => [p.nm, p.I]) }),
    },
    {
      id: 'energy',
      title: t(`${P}.chart.energy`),
      data: lines,
      caption: t(`${P}.chart.energyCaption`),
      render: (d: typeof lines) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="nm" type="number" domain={[380, 780]} label={L.x(t(`${P}.axis.wavelength`))} {...axisProps(c)} />
            <YAxis dataKey="E" type="number" domain={[1.5, 3.3]} width={44} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.energy`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [fmt(Number(v), 3), n]} />
            <Line data={ENERGY_CURVE} dataKey="E" name="hc/λ" stroke={c.axis} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Scatter data={d} dataKey="E" name="ΔE" fill={accent} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-flame-test-lines', headers: ['wavelength_nm', 'energy_eV'], rows: lines.map((l) => [l.nm, l.E]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'dE',
      title: t(`${P}.f.dETitle`),
      expression: (
        <>
          Δ<V>E</V> = <V>h</V><V>f</V> = <Frac n={<><V>h</V><V>c</V></>} d={<V>λ</V>} />
        </>
      ),
      substituted: peak ? (
        <>
          ({fmt(6.626, 3)}·10<Sup>−34</Sup> · {fmt(2.998, 3)}·10<Sup>8</Sup>) / ({fmt(peak.nm, 0)}·10<Sup>−9</Sup>) = <b>{fmtSig(energy!.joules * 1e19, 3)}·10<Sup>−19</Sup> J = {fmt(energy!.eV, 3)} eV</b>
        </>
      ) : (
        <>{t(`${P}.f.noFlame`)}</>
      ),
      variables: [
        { symbol: <V>h</V>, name: t(`${P}.f.h`), unit: 'J·s', value: `${fmt(6.626, 3)}·10⁻³⁴` },
        { symbol: <V>c</V>, name: t(`${P}.f.c`), unit: 'm/s', value: `${fmt(2.998, 3)}·10⁸` },
        { symbol: <V>λ</V>, name: t(`${P}.f.lambda`), unit: 'nm', value: peak ? fmt(peak.nm, 0) : '—', effect: t(`${P}.f.lambdaEffect`) },
      ],
      explanation: t(`${P}.f.dEExplain`),
    },
    {
      id: 'eV',
      title: t(`${P}.f.evTitle`),
      expression: (
        <>
          <V>E</V><Sub>eV</Sub> = <Frac n={<>{fmt(1239.8, 1)}</>} d={<><V>λ</V><Sub>nm</Sub></>} />
        </>
      ),
      substituted: peak ? (
        <>
          {fmt(1239.8, 1)} / {fmt(peak.nm, 0)} = <b>{fmt(energy!.eV, 3)} eV</b>
        </>
      ) : (
        <>{t(`${P}.f.noFlame`)}</>
      ),
      variables: [{ symbol: <>1 eV</>, name: t(`${P}.f.ev`), unit: 'J', value: `${fmt(1.602, 3)}·10⁻¹⁹` }],
      explanation: t(`${P}.f.evExplain`),
    },
  ]

  const actions = (large = false) => (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={x.clean} className={large ? 'h-14 px-5 text-lg' : 'flex-1'}>
        <Droplets className="h-4 w-4" aria-hidden />
        {t(`${P}.clean`)}
      </Button>
      <Button variant="primary" onClick={x.dip} className={large ? 'h-14 px-5 text-lg' : 'flex-1'}>
        <Flame className="h-4 w-4" aria-hidden />
        {t(`${P}.dip`)}
      </Button>
    </div>
  )
  const sampleSelect = (
    <SelectField<SampleId>
      label={t(`${P}.p.sample`)}
      value={x.sample}
      options={[...METAL_IDS.map((id) => ({ value: id as SampleId, label: sampleName(id) })), { value: 'unknown', label: t(`${P}.unknown`) }]}
      onChange={x.setSample}
    />
  )

  const controls = (
    <>
      {sampleSelect}
      {actions()}
      <Toggle label={t(`${P}.p.cobalt`)} description={t(`${P}.p.cobaltHint`)} checked={x.cobaltGlass} onChange={x.setCobaltGlass} />
      <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
        <span className="text-sm font-medium text-ink">{t(`${P}.identify.title`)}</span>
        <p className="text-xs leading-relaxed text-muted">{t(`${P}.identify.hint`)}</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <SelectField<MetalId> label={t(`${P}.identify.guess`)} value={x.guess} options={METAL_IDS.map((id) => ({ value: id, label: METALS[id].ion }))} onChange={x.setGuess} />
          </div>
          <Button variant="secondary" onClick={x.check} disabled={x.sample !== 'unknown'}>
            <Check className="h-4 w-4" aria-hidden />
            {t(`${P}.identify.check`)}
          </Button>
          <Button variant="ghost" onClick={x.newUnknown} aria-label={t(`${P}.identify.new`)}>
            <Shuffle className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {x.verdict && (
          <p role="status" className={x.verdict === 'correct' ? 'flex items-center gap-1.5 text-sm font-medium text-brand' : 'flex items-center gap-1.5 text-sm font-medium text-warn'}>
            {x.verdict === 'correct' ? <Check className="h-4 w-4" aria-hidden /> : <XIcon className="h-4 w-4" aria-hidden />}
            {t(`${P}.identify.${x.verdict}`)}
          </p>
        )}
      </div>
      <div className="rounded-xl bg-surface-2 p-3">
        <p className="text-sm font-medium text-ink">{t(`${P}.reference`)}</p>
        <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-muted">
          {REFERENCE.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-line" style={{ background: r.hex }} aria-hidden />
              <span>
                <b className="text-ink">{METALS[r.id].ion}</b> · {t(`${P}.colors.${METALS[r.id].colorName}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[240px]">{sampleSelect}</div>
      {actions(true)}
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.2, 2.2, 4.4], target: [-0.3, 1.0, 0.3] }}
      scene={<FlameTestScene ctl={x} labels={{ hcl: t(`${P}.labels.hcl`), unknown: '?', sample: `${sampleName(x.sample)} · ${observed}` }} />}
      fallback2D={<FlameTest2D ctl={x} label={t('lab.view2d', { name: t('catalog.flame-test.title') })} />}
      controls={{ running: x.inFlame, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ sample: x.sample, wavelength: strongestLine(x.metal).wavelength, cobaltGlass: x.cobaltGlass, identified: x.verdict === 'correct' }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.sample`), value: x.sample === 'unknown' ? 'unknown salt (do not reveal it)' : METALS[x.sample].salt },
        { label: t(`${P}.m.colour`), value: observed },
        { label: t(`${P}.m.line`), value: peak ? fmt(peak.nm, 0) : 'none', unit: peak ? 'nm' : undefined },
        { label: 'wire', value: wireText },
        { label: t(`${P}.p.cobalt`), value: x.cobaltGlass ? 'yes' : 'no' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{ running: x.inFlame, togglePlay: x.togglePlay, reset: x.reset, increase: x.dip }}
      guide={{
        instructions: [1, 2, 3, 4, 5].map((i) => t(`${P}.guide.step${i}`)),
        science: (
          <>
            <p>{t(`${P}.guide.science1`)}</p>
            <p>{t(`${P}.guide.science2`)}</p>
            <p>
              <Trans i18nKey={`${P}.guide.science3`} components={{ b: <b className="text-ink" /> }} />
            </p>
          </>
        ),
        conclusions: (
          <>
            <p>{t(`${P}.guide.conclusion1`)}</p>
            <p>{t(`${P}.guide.conclusion2`)}</p>
            <p>{t(`${P}.guide.conclusion3`)}</p>
          </>
        ),
        model: t(`${P}.guide.model`),
      }}
    />
  )
}
