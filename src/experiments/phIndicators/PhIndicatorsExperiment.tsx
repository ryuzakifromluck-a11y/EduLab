import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { INDICATORS, SUBSTANCES, indicatorZone, ionCurves, transitionCurves, type IndicatorId } from '../../engines/indicators'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtSig } from '../../lib/format'
import { useUi } from '../../store/ui'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { usePhIndicators, type SampleId } from './usePhIndicators'
import { PhIndicatorsScene } from './PhIndicatorsScene'
import { PhIndicators2D } from './PhIndicators2D'
import { tubeColor } from './tubes'

const P = 'exp.ph-indicators'

/** 1.2e-3 → "1.2 × 10⁻³" */
function sci(v: number) {
  const e = Math.floor(Math.log10(v) + 1e-9)
  const m = v / Math.pow(10, e)
  const sup = String(e).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d])
  return Math.abs(m - 1) < 0.005 ? `10${sup}` : `${fmtSig(m, 2)} × 10${sup}`
}

/** Rough colour name for a mixed indicator, read off its colour stops. */
function mixedColour(id: 'universal' | 'redCabbage', pH: number) {
  const bands: [number, string][] =
    id === 'universal'
      ? [[3, 'red'], [5, 'orange'], [6.5, 'yellow'], [7.5, 'green'], [9, 'teal'], [11, 'blue'], [15, 'violet']]
      : [[3, 'red'], [5, 'pink'], [7.5, 'purple'], [9, 'blue'], [12, 'green'], [15, 'yellow']]
  return bands.find(([max]) => pH < max)![1]
}

export default function PhIndicatorsExperiment() {
  const { t } = useTranslation()
  const x = usePhIndicators()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'ph-indicators')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const ind = INDICATORS.find((i) => i.id === x.indicator)!
  const short = Object.fromEntries(INDICATORS.map((i) => [i.id, t(`${P}.short.${i.id}`)])) as Record<IndicatorId, string>
  const sampleName = x.sample === 'custom' ? t(`${P}.samples.custom`) : t(`${P}.samples.${x.sample}`)
  const colourName =
    ind.kind === 'two'
      ? t(`${P}.colours.${ind.id}.${indicatorZone(ind, x.pH)}`)
      : t(`${P}.colours.${mixedColour(ind.id, x.pH)}`)

  const twoColour = INDICATORS.filter((i) => i.kind === 'two')
  const curves = useMemo(() => transitionCurves(), [])
  const ions = useMemo(() => ionCurves(), [])
  const scale = SUBSTANCES.map((s) => ({ id: s.id, name: t(`${P}.samples.${s.id}`), pH: s.pH, fill: tubeColor(ind, s.pH) }))

  const measurements: Measurement[] = [
    { id: 'pH', label: 'pH', value: fmt(x.pH, 1), tone: 'accent', sub: sampleName },
    { id: 'nature', label: t(`${P}.m.nature`), value: t(`${P}.nature.${x.nature}`), tone: x.nature === 'neutral' ? 'default' : 'warn' },
    { id: 'H', label: t(`${P}.m.hydrogen`), value: sci(x.hydrogen), unit: 'mol/L' },
    { id: 'OH', label: t(`${P}.m.hydroxide`), value: sci(x.hydroxide), unit: 'mol/L', sub: `pOH = ${fmt(x.pOH, 1)}` },
    { id: 'colour', label: t(`${P}.m.colour`, { name: t(`${P}.indicators.${x.indicator}`) }), value: colourName },
  ]

  const palette = [c.chemistry, c.accent2, c.physics, c.accent3, '#e0338f']

  const charts: ChartDef<any>[] = [
    {
      id: 'scale',
      title: t(`${P}.chart.scale`),
      data: scale,
      caption: t(`${P}.chart.scaleCaption`, { name: t(`${P}.indicators.${x.indicator}`) }),
      render: (d: typeof scale) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} layout="vertical" margin={{ ...CHART_MARGIN, left: 8 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" domain={[0, 14]} ticks={[0, 2, 4, 6, 7, 8, 10, 12, 14]} label={L.x('pH')} {...axisProps(c)} />
            <YAxis type="category" dataKey="name" width={118} interval={0} tick={{ fontSize: 11, fill: c.text }} />
            <Tooltip {...ttip} formatter={(v) => [fmt(Number(v), 1), 'pH']} />
            <ReferenceLine x={7} stroke={c.axis} strokeDasharray="4 4" />
            <ReferenceLine x={x.pH} stroke={c.marker} strokeWidth={2} />
            <Bar dataKey="pH" isAnimationActive={false} stroke={c.axis} strokeWidth={0.5}>
              {d.map((s) => (
                <Cell key={s.id} fill={s.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-ph-scale', headers: ['substance', 'pH', `colour_${x.indicator}`], rows: scale.map((s) => [s.id, s.pH, s.fill]) }),
    },
    {
      id: 'transition',
      title: t(`${P}.chart.transition`),
      data: curves,
      caption: t(`${P}.chart.transitionCaption`),
      render: (d: typeof curves) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="pH" type="number" domain={[0, 14]} ticks={[0, 2, 4, 6, 8, 10, 12, 14]} label={L.x('pH')} {...axisProps(c)} />
            <YAxis domain={[0, 100]} width={48} label={L.y(t(`${P}.axis.baseForm`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `pH ${fmt(Number(v), 1)}`} formatter={(v, n) => [`${fmt(Number(v), 0)} %`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            {ind.kind === 'two' && <ReferenceArea x1={ind.range[0]} x2={ind.range[1]} fill={accent} fillOpacity={0.1} />}
            <ReferenceLine x={x.pH} stroke={c.marker} strokeWidth={2} />
            {twoColour.map((i, k) => (
              <Line
                key={i.id}
                dataKey={i.id}
                name={short[i.id]}
                stroke={palette[k]}
                strokeWidth={i.id === x.indicator ? 3 : 1.25}
                strokeOpacity={i.id === x.indicator || ind.kind === 'mixed' ? 1 : 0.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-indicator-transitions', headers: ['pH', ...twoColour.map((i) => `${i.id}_base_percent`)], rows: curves.map((r) => [r.pH, ...twoColour.map((i) => r[i.id])]) }),
    },
    {
      id: 'ions',
      title: t(`${P}.chart.ions`),
      data: ions,
      caption: t(`${P}.chart.ionsCaption`),
      render: (d: typeof ions) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="pH" type="number" domain={[0, 14]} ticks={[0, 2, 4, 6, 7, 8, 10, 12, 14]} label={L.x('pH')} {...axisProps(c)} />
            <YAxis domain={[-14, 0]} ticks={[-14, -12, -10, -8, -6, -4, -2, 0]} width={48} label={L.y(t(`${P}.axis.logConc`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `pH ${fmt(Number(v), 1)}`} formatter={(v, n) => [fmt(Number(v), 1), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={x.pH} stroke={c.marker} strokeWidth={2} />
            <Line dataKey="logH" name="log [H⁺]" stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="logOH" name="log [OH⁻]" stroke={c.physics} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-ion-concentrations', headers: ['pH', 'log_H', 'log_OH'], rows: ions.map((r) => [r.pH, r.logH, r.logOH]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'pH',
      title: 'pH = −log[H⁺]',
      expression: (
        <>
          pH = −log<Sub>10</Sub>[H<Sup>+</Sup>]
        </>
      ),
      substituted: (
        <>
          [H<Sup>+</Sup>] = {sci(x.hydrogen)} mol/L → <b>pH = {fmt(x.pH, 1)}</b>
        </>
      ),
      variables: [{ symbol: <>[H<Sup>+</Sup>]</>, name: t(`${P}.f.H`), unit: 'mol/L', value: sci(x.hydrogen), effect: t(`${P}.f.HEffect`) }],
      explanation: t(`${P}.f.pHExplain`),
    },
    {
      id: 'kw',
      title: 'pH + pOH = 14',
      expression: (
        <>
          [H<Sup>+</Sup>][OH<Sup>−</Sup>] = <V>K</V><Sub>w</Sub> = 10<Sup>−14</Sup> ⇒ pH + pOH = 14
        </>
      ),
      substituted: (
        <>
          {fmt(x.pH, 1)} + {fmt(x.pOH, 1)} = <b>14</b>
        </>
      ),
      variables: [
        { symbol: <>[OH<Sup>−</Sup>]</>, name: t(`${P}.f.OH`), unit: 'mol/L', value: sci(x.hydroxide) },
        { symbol: <><V>K</V><Sub>w</Sub></>, name: t(`${P}.f.Kw`), unit: 'mol²/L²', value: '10⁻¹⁴' },
      ],
      explanation: t(`${P}.f.kwExplain`),
    },
    {
      id: 'hh',
      title: t(`${P}.f.hhTitle`),
      expression: (
        <>
          <V>f</V>(In<Sup>−</Sup>) = <Frac n="1" d={<>1 + 10<Sup>p<V>K</V>a − pH</Sup></>} />
        </>
      ),
      substituted:
        ind.kind === 'two' ? (
          <>
            p<V>K</V>a = {fmt(ind.pKa, 1)}, pH = {fmt(x.pH, 1)} → <b>{fmt(100 / (1 + Math.pow(10, ind.pKa - x.pH)), 0)} %</b>
          </>
        ) : (
          <>{t(`${P}.f.mixedNote`)}</>
        ),
      variables: [
        { symbol: <>p<V>K</V>a</>, name: t(`${P}.f.pKa`), unit: '', value: ind.kind === 'two' ? fmt(ind.pKa, 1) : '—', effect: t(`${P}.f.pKaEffect`) },
      ],
      explanation: t(`${P}.f.hhExplain`),
    },
  ]

  const sampleOptions: { value: SampleId; label: string }[] = [
    ...SUBSTANCES.map((s) => ({ value: s.id as SampleId, label: `${t(`${P}.samples.${s.id}`)} (pH ${fmt(s.pH, 1)})` })),
    { value: 'custom', label: t(`${P}.samples.custom`) },
  ]

  const controls = (
    <>
      <SelectField label={t(`${P}.p.sample`)} value={x.sample} options={sampleOptions} onChange={x.setSample} />
      <ParamSlider label="pH" value={x.pH} min={0} max={14} step={0.1} onChange={x.setPh} format={(v) => fmt(v, 1)} hint={t(`${P}.p.pHHint`)} accent={accent} />
      <SelectField
        label={t(`${P}.p.indicator`)}
        value={x.indicator}
        options={INDICATORS.map((i) => ({ value: i.id, label: t(`${P}.indicators.${i.id}`) }))}
        onChange={x.setIndicator}
      />
      <RecordBox count={x.tests.length} title={t(`${P}.tests`, { count: x.tests.length })} hint={t(`${P}.testsHint`)} onRecord={x.record} onClear={x.clearTests} />
      {x.tests.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-muted">
          {x.tests.slice(-6).map((r) => (
            <li key={r.n} className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-line" style={{ background: r.color === 'none' ? 'transparent' : r.color }} />
              {r.sample === 'custom' ? t(`${P}.samples.custom`) : t(`${P}.samples.${r.sample}`)} · pH {fmt(r.pH, 1)} · {short[r.indicator]}
            </li>
          ))}
        </ul>
      )}
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label="pH" value={x.pH} min={0} max={14} step={0.1} onChange={x.setPh} format={(v) => fmt(v, 1)} accent={accent} />
      </div>
      <div className="min-w-[220px]">
        <SelectField label={t(`${P}.p.indicator`)} value={x.indicator} options={INDICATORS.map((i) => ({ value: i.id, label: t(`${P}.indicators.${i.id}`) }))} onChange={x.setIndicator} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 1.9, 5.0], target: [0, 0.75, 0] }}
      scene={<PhIndicatorsScene pH={x.pH} selected={x.indicator} glass={dark ? '#9fb3d9' : '#a9bad6'} labels={{ names: short, reading: `${sampleName} · pH ${fmt(x.pH, 1)}` }} />}
      fallback2D={<PhIndicators2D pH={x.pH} selected={x.indicator} names={short} label={t('lab.view2d', { name: t('catalog.ph-indicators.title') })} />}
      controls={{ onReset: x.reset }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ sample: x.sample, pH: x.pH, indicator: x.indicator }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.sample`), value: sampleName },
        { label: 'pH', value: fmt(x.pH, 1) },
        { label: t(`${P}.p.indicator`), value: x.indicator },
        { label: 'Colour shown', value: colourName },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        reset: x.reset,
        increase: () => x.setPh(Math.min(14, x.pH + 0.5)),
        decrease: () => x.setPh(Math.max(0, x.pH - 0.5)),
      }}
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
