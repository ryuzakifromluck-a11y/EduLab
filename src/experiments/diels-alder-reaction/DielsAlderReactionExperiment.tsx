import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { DIENES, DIENOPHILES, formatFormula, rateVsTemperature, type DieneId, type DienophileId } from '../../engines/dielsAlderReaction'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtInt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { SPEEDS, T_MAX, T_MIN, useDielsAlderReaction } from './useDielsAlderReaction'
import { DielsAlderReactionScene } from './DielsAlderReactionScene'
import { DielsAlderReaction2D } from './DielsAlderReaction2D'

const P = 'exp.diels-alder-reaction'
const DIENE_IDS = Object.keys(DIENES) as DieneId[]
const DIENOPHILE_IDS = Object.keys(DIENOPHILES) as DienophileId[]

export default function DielsAlderReactionExperiment() {
  const { t } = useTranslation()
  const x = useDielsAlderReaction()
  const c = useChartTheme()
  const experiment = findExperiment('chemistry', 'diels-alder-reaction')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const a = x.analysis
  const rateCurve = useMemo(() => rateVsTemperature(x.dieneId), [x.dieneId])
  const product = formatFormula(a.product)
  const dieneName = t(`${P}.dienes.${x.dieneId}`)
  const dienophileName = t(`${P}.dienophiles.${x.dienophileId}`)
  const skeleton = t(`${P}.skeleton.${a.skeleton}`)

  /** Human-readable duration (s, min, h, days, years). */
  const duration = (s: number) => {
    if (!Number.isFinite(s) || s > 3.15e9) return t(`${P}.never`)
    if (s < 120) return `${fmtSig(s, 3)} ${t(`${P}.units.s`)}`
    if (s < 7200) return `${fmtSig(s / 60, 3)} ${t(`${P}.units.min`)}`
    if (s < 172_800) return `${fmtSig(s / 3600, 3)} ${t(`${P}.units.h`)}`
    if (s < 3.15e7) return `${fmtSig(s / 86_400, 3)} ${t(`${P}.units.d`)}`
    return `${fmtSig(s / 3.15e7, 3)} ${t(`${P}.units.y`)}`
  }
  const stereoText = a.stereoDistinct
    ? t(`${P}.stereo.ratio`, { endo: fmtInt(a.endoFraction * 100), exo: fmtInt((1 - a.endoFraction) * 100) })
    : t(`${P}.stereo.none`)
  const tooSlow = a.halfLife > 3600 * 24

  const measurements: Measurement[] = [
    { id: 'X', label: t(`${P}.m.conversion`), value: fmt(x.conversion * 100, 1), unit: '%', tone: 'accent', sub: t(`${P}.m.time`, { value: duration(x.time) }) },
    { id: 'half', label: t(`${P}.m.halfLife`), value: duration(a.halfLife), tone: tooSlow ? 'warn' : 'default', sub: `k = ${fmtSig(a.k, 3)} L·mol⁻¹·s⁻¹` },
    { id: 'ea', label: t(`${P}.m.ea`), value: fmt(a.ea, 1), unit: 'kJ/mol', sub: t(`${P}.m.gap`, { value: fmt(a.gap, 1) }) },
    { id: 'product', label: t(`${P}.m.product`), value: product, sub: `${fmt(a.productMass, 2)} g/mol · ${skeleton}` },
    { id: 'stereo', label: t(`${P}.m.stereo`), value: a.major ? t(`${P}.stereo.${a.major}`) : '—', sub: stereoText },
  ]

  const log = x.log
  const charts: ChartDef<any>[] = [
    {
      id: 'conversion',
      title: t(`${P}.chart.conversion`),
      data: log,
      caption: t(`${P}.chart.conversionCaption`),
      render: (d: typeof log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d.map((p) => ({ t: p.t, X: p.X * 100 }))} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => fmtSig(v, 2)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[0, 100]} width={44} label={L.y(t(`${P}.axis.conversion`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmtSig(Number(v), 3)} s`} formatter={(v) => [`${fmt(Number(v), 1)} %`, t(`${P}.m.conversion`)]} />
            <Line dataKey="X" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-diels-alder-conversion', headers: ['t_s', 'conversion'], rows: log.map((p) => [p.t, p.X]) }),
    },
    {
      id: 'rate',
      title: t(`${P}.chart.rate`),
      data: rateCurve,
      caption: t(`${P}.chart.rateCaption`, { diene: dieneName }),
      render: (d: typeof rateCurve) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="T" type="number" domain={[T_MIN, T_MAX]} label={L.x(t(`${P}.axis.temperature`))} {...axisProps(c)} />
            <YAxis scale="log" domain={[1e-12, 1e4]} allowDataOverflow width={56} tickFormatter={(v) => Number(v).toExponential(0)} label={L.y(t(`${P}.axis.k`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 0)} °C`} formatter={(v, n) => [`${Number(v).toExponential(2)} L·mol⁻¹·s⁻¹`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="ethylene" name={t(`${P}.dienophiles.ethylene`)} stroke={c.physics} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="methylAcrylate" name={t(`${P}.dienophiles.methylAcrylate`)} stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="maleicAnhydride" name={t(`${P}.dienophiles.maleicAnhydride`)} stroke={c.accent3} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={x.temperature} y={Math.max(1e-12, Math.min(1e4, a.k))} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: `edulab-diels-alder-k-vs-T-${x.dieneId}`,
        headers: ['T_C', 'k_ethylene', 'k_methyl_acrylate', 'k_maleic_anhydride'],
        rows: rateCurve.map((p) => [p.T, p.ethylene, p.methylAcrylate, p.maleicAnhydride]),
      }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'k',
      title: t(`${P}.f.kTitle`),
      expression: (
        <>
          <V>k</V> = <V>A</V> · <V>f</V><Sub>s-cis</Sub> · e<Sup>−<V>E</V><Sub>a</Sub>/<V>RT</V></Sup>
        </>
      ),
      substituted: (
        <>
          {fmt(1.4, 1)}·10<Sup>6</Sup> · {fmtSig(a.diene.sCis, 2)} · e<Sup>−{fmt(a.ea, 1)}/({fmt(0.008314, 6)}·{fmt(x.temperature + 273.15, 1)})</Sup> = <b>{fmtSig(a.k, 3)} L·mol⁻¹·s⁻¹</b>
        </>
      ),
      variables: [
        { symbol: <>Δ<V>E</V></>, name: t(`${P}.f.gap`), unit: 'eV', value: fmt(a.gap, 1), effect: t(`${P}.f.gapEffect`) },
        { symbol: <><V>E</V><Sub>a</Sub></>, name: t(`${P}.f.ea`), unit: 'kJ/mol', value: fmt(a.ea, 1) },
        { symbol: <><V>f</V><Sub>s-cis</Sub></>, name: t(`${P}.f.sCis`), unit: '', value: fmtSig(a.diene.sCis, 2), effect: t(`${P}.f.sCisEffect`) },
        { symbol: <V>T</V>, name: t(`${P}.f.T`), unit: 'K', value: fmt(x.temperature + 273.15, 1) },
      ],
      explanation: t(`${P}.f.kExplain`),
    },
    {
      id: 'X',
      title: t(`${P}.f.xTitle`),
      expression: (
        <>
          <V>X</V> = <Frac n={<><V>k</V><V>c</V><Sub>0</Sub><V>t</V></>} d={<>1 + <V>k</V><V>c</V><Sub>0</Sub><V>t</V></>} />, <V>t</V><Sub>½</Sub> = <Frac n="1" d={<><V>k</V><V>c</V><Sub>0</Sub></>} />
        </>
      ),
      substituted: (
        <>
          <V>t</V><Sub>½</Sub> = 1 / ({fmtSig(a.k, 3)} · {fmt(x.concentration, 2)}) = <b>{duration(a.halfLife)}</b>
        </>
      ),
      variables: [
        { symbol: <><V>c</V><Sub>0</Sub></>, name: t(`${P}.f.c0`), unit: 'mol/L', value: fmt(x.concentration, 2) },
        { symbol: <V>X</V>, name: t(`${P}.m.conversion`), unit: '%', value: fmt(x.conversion * 100, 1) },
      ],
      explanation: t(`${P}.f.xExplain`),
    },
    {
      id: 'endo',
      title: t(`${P}.f.endoTitle`),
      expression: (
        <>
          <Frac n={<>[endo]</>} d={<>[exo]</>} /> = e<Sup>ΔΔ<V>G</V>‡/<V>RT</V></Sup>
        </>
      ),
      substituted: a.stereoDistinct ? (
        <>
          e<Sup>{fmt(a.dienophile.endoBias, 1)}/({fmt(0.008314, 6)}·{fmt(x.temperature + 273.15, 1)})</Sup> = <b>{fmtSig(a.endoFraction / (1 - a.endoFraction), 3)}</b>
        </>
      ) : (
        <>{t(`${P}.stereo.none`)}</>
      ),
      variables: [{ symbol: <>ΔΔ<V>G</V>‡</>, name: t(`${P}.f.ddg`), unit: 'kJ/mol', value: fmt(a.dienophile.endoBias, 1) }],
      explanation: t(`${P}.f.endoExplain`),
    },
  ]

  const selects = (
    <>
      <SelectField label={t(`${P}.p.diene`)} value={x.dieneId} options={DIENE_IDS.map((id) => ({ value: id, label: t(`${P}.dienes.${id}`) }))} onChange={x.setDiene} />
      <SelectField label={t(`${P}.p.dienophile`)} value={x.dienophileId} options={DIENOPHILE_IDS.map((id) => ({ value: id, label: t(`${P}.dienophiles.${id}`) }))} onChange={x.setDienophile} />
    </>
  )

  const controls = (
    <>
      {selects}
      <ParamSlider label={t(`${P}.p.temperature`)} value={x.temperature} min={T_MIN} max={T_MAX} step={5} unit="°C" onChange={x.setTemperature} hint={t(`${P}.p.temperatureHint`)} accent={accent} />
      <ParamSlider label={t(`${P}.p.concentration`)} value={x.concentration} min={0.1} max={2} step={0.1} unit="mol/L" format={(v) => fmt(v, 1)} onChange={x.setConcentration} hint={t(`${P}.p.concentrationHint`)} accent={accent} />
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[200px]">{selects}</div>
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t(`${P}.p.temperature`)} value={x.temperature} min={T_MIN} max={T_MAX} step={5} unit="°C" onChange={x.setTemperature} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.3, 3.4, 4.6], target: [0, 1.5, 0] }}
      scene={
        <DielsAlderReactionScene
          analysis={a}
          progress={x.progress}
          labels={{ diene: dieneName, dienophile: dienophileName, product: `${product} · ${skeleton}` }}
        />
      }
      fallback2D={<DielsAlderReaction2D analysis={a} progress={x.progress} label={t('lab.view2d', { name: t('catalog.diels-alder-reaction.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{tooSlow ? t(`${P}.slow`) : t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ diene: x.dieneId, dienophile: x.dienophileId, temperature: x.temperature, concentration: x.concentration }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[3], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.diene`), value: dieneName },
        { label: t(`${P}.p.dienophile`), value: dienophileName },
        { label: t(`${P}.p.temperature`), value: fmtInt(x.temperature), unit: '°C' },
        { label: 'HOMO-LUMO gap', value: fmt(a.gap, 2), unit: 'eV' },
        { label: 'Ea', value: fmt(a.ea, 1), unit: 'kJ/mol' },
        { label: 'k', value: fmtSig(a.k, 3), unit: 'L/(mol s)' },
        { label: t(`${P}.m.conversion`), value: fmt(x.conversion * 100, 1), unit: '%' },
        { label: t(`${P}.m.product`), value: product },
        { label: 'endo fraction', value: a.stereoDistinct ? fmt(a.endoFraction * 100, 0) : 'n/a', unit: '%' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setTemperature(Math.min(T_MAX, x.temperature + 10)),
        decrease: () => x.setTemperature(Math.max(T_MIN, x.temperature - 10)),
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
