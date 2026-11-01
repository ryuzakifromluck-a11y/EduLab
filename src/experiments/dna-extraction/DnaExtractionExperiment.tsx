import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { CLEAR_UG, SOURCES, VISIBLE_UG, ethanolFraction, precipitationCurve, precipitationTau, temperatureCurve, type DnaSource } from '../../engines/dnaExtraction'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { Frac, FormulaExplorer, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtInt } from '../../lib/format'
import { useUi } from '../../store/ui'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { SPEEDS, useDnaExtraction } from './useDnaExtraction'
import { DnaExtractionScene } from './DnaExtractionScene'
import { DnaExtraction2D } from './DnaExtraction2D'

const P = 'exp.dna-extraction'
const SOURCE_IDS: DnaSource[] = ['strawberry', 'banana', 'cheek']

export default function DnaExtractionExperiment() {
  const { t } = useTranslation()
  const x = useDnaExtraction()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('biology', 'dna-extraction')!
  const accent = c.biology
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const s = x.settings
  const r = x.result
  const src = SOURCES[s.source]
  const done = x.stage === 'precipitated' || x.stage === 'spooled'
  const spooled = x.stage === 'spooled'

  const tempCurve = useMemo(() => temperatureCurve(s), [s])
  const timeCurve = useMemo(() => precipitationCurve(s), [s])
  const sourceName = (id: DnaSource) => t(`${P}.source.${id}`)

  const measurements: Measurement[] = [
    { id: 'lysis', label: t(`${P}.m.lysis`), value: fmtInt(x.lysed * 100), unit: '%', sub: t(`${P}.m.lysisSub`) },
    { id: 'filtrate', label: t(`${P}.m.filtrate`), value: x.lysed > 0 ? fmt(r.filtrate, 0) : '—', unit: 'µg', sub: t(`${P}.m.filtrateSub`) },
    {
      id: 'dna',
      label: t(`${P}.m.precipitate`),
      value: fmt(x.precipitated, 0),
      unit: 'µg',
      tone: 'accent',
      sub: t(`${P}.visible.${done ? r.visible : x.precipitated >= VISIBLE_UG ? 'faint' : 'none'}`),
    },
    { id: 'yield', label: t(`${P}.m.yield`), value: spooled ? fmt(r.yield, 0) : '—', unit: 'µg', sub: spooled ? t(`${P}.m.yieldSub`, { value: fmt(r.a260, 2) }) : t(`${P}.m.spoolFirst`) },
    {
      id: 'ratio',
      label: 'A260/A280',
      value: spooled && r.yield > 0 ? fmt(r.ratio, 2) : '—',
      tone: spooled && r.purity === 'protein' ? 'warn' : 'default',
      sub: spooled ? t(`${P}.purity.${r.purity}`) : t(`${P}.m.spoolFirst`),
    },
  ]

  const tau = precipitationTau(s.ethanolTemp)
  const charts: ChartDef<any>[] = [
    {
      id: 'time',
      title: t(`${P}.chart.time`),
      data: timeCurve,
      caption: t(`${P}.chart.timeCaption`),
      render: (d: typeof timeCurve) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[0, 'auto']} width={52} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.dna`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 0)} s`} formatter={(v) => [`${fmt(Number(v), 0)} µg`, 'DNA']} />
            <ReferenceLine x={tau} stroke={c.accent2} strokeDasharray="5 4" label={{ value: `τ = ${fmt(tau, 0)} s`, fill: c.accent2, fontSize: 11, position: 'insideTopRight' }} />
            <ReferenceLine y={VISIBLE_UG} stroke={c.axis} strokeDasharray="2 4" label={{ value: t(`${P}.chart.visibleLine`), fill: c.text, fontSize: 11, position: 'insideBottomRight' }} />
            <Line dataKey="dna" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            {x.stage === 'precipitating' && <ReferenceDot x={x.sim.elapsed} y={x.precipitated} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-dna-precipitation', headers: ['time_s', 'dna_ug'], rows: timeCurve.map((p) => [p.t, p.dna]) }),
    },
    {
      id: 'temp',
      title: t(`${P}.chart.temp`),
      data: tempCurve,
      caption: t(`${P}.chart.tempCaption`),
      render: (d: typeof tempCurve) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="temp" type="number" domain={[-20, 25]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.temp`))} {...axisProps(c)} />
            <YAxis domain={[0, 'auto']} width={52} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.yield`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 0)} °C`} formatter={(v) => [`${fmt(Number(v), 0)} µg`, t(`${P}.m.yield`)]} />
            <Line dataKey="yield" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={s.ethanolTemp} y={r.yield} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-dna-yield-vs-temperature', headers: ['ethanol_C', 'yield_ug'], rows: tempCurve.map((p) => [p.temp, p.yield]) }),
    },
    {
      id: 'runs',
      title: t(`${P}.chart.runs`),
      data: x.readings,
      caption: t(`${P}.chart.runsCaption`),
      render: (d: typeof x.readings) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d.map((rd) => ({ ...rd, name: `#${rd.n} ${sourceName(rd.source)}` }))} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="name" {...axisProps(c)} />
            <YAxis width={52} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.yield`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v) => [`${fmt(Number(v), 0)} µg`, t(`${P}.m.yield`)]} />
            <Bar dataKey="yield" isAnimationActive={false}>
              {d.map((rd) => (
                <Cell key={rd.n} fill={rd.ratio >= 1.7 ? accent : c.accent2} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-dna-extractions',
        headers: ['run', 'source', 'ethanol_C', 'protease', 'yield_ug', 'A260_A280'],
        rows: x.readings.map((rd) => [rd.n, rd.source, rd.ethanolTemp, rd.protease ? 1 : 0, rd.yield, rd.ratio]),
      }),
    },
  ]

  const phi = ethanolFraction(s.ethanolRatio)
  const formulas: Formula[] = [
    {
      id: 'purity',
      title: 'A260 / A280',
      expression: (
        <>
          <V>R</V> = <Frac n={<><V>A</V><Sub>260</Sub></>} d={<><V>A</V><Sub>280</Sub></>} />
        </>
      ),
      substituted: (
        <>
          <V>R</V> = <b>{fmt(r.ratio, 2)}</b> → {t(`${P}.purity.${r.purity}`)}
        </>
      ),
      variables: [
        { symbol: <><V>A</V><Sub>260</Sub></>, name: t(`${P}.f.a260`), unit: '', value: fmt(r.a260, 3) },
        { symbol: <V>R</V>, name: t(`${P}.f.ratio`), unit: '', value: fmt(r.ratio, 2), effect: t(`${P}.f.ratioEffect`) },
      ],
      explanation: t(`${P}.f.purityExplain`),
    },
    {
      id: 'yield',
      title: t(`${P}.f.yieldTitle`),
      expression: (
        <>
          <V>m</V><Sub>DNA</Sub> = <V>m</V><Sub>total</Sub> · <V>f</V><Sub>lysis</Sub> · <V>f</V><Sub>filter</Sub> · <V>f</V><Sub>precip</Sub> · <V>f</V><Sub>spool</Sub>
        </>
      ),
      substituted: (
        <>
          {fmt(r.total, 0)} µg × {fmt(r.lysis, 2)} × 0.85 × {fmt(r.precipitable, 2)} × 0.80 = <b>{fmt(r.yield, 0)} µg</b>
        </>
      ),
      variables: [
        { symbol: <><V>m</V><Sub>total</Sub></>, name: t(`${P}.f.total`), unit: 'µg', value: fmt(r.total, 0), effect: t(`${P}.f.totalEffect`) },
        { symbol: <><V>f</V><Sub>lysis</Sub></>, name: t(`${P}.f.lysis`), unit: '', value: fmt(r.lysis, 2), effect: t(`${P}.f.lysisEffect`) },
        { symbol: <><V>f</V><Sub>precip</Sub></>, name: t(`${P}.f.precip`), unit: '', value: fmt(r.precipitable, 2), effect: t(`${P}.f.precipEffect`) },
      ],
      explanation: t(`${P}.f.yieldExplain`),
    },
    {
      id: 'ethanol',
      title: 'φ = r / (1 + r)',
      expression: (
        <>
          <V>φ</V><Sub>EtOH</Sub> = <Frac n={<V>r</V>} d={<>1 + <V>r</V></>} />
        </>
      ),
      substituted: (
        <>
          {fmt(s.ethanolRatio, 1)} / (1 + {fmt(s.ethanolRatio, 1)}) = <b>{fmtInt(phi * 100)} %</b>
        </>
      ),
      variables: [
        { symbol: <V>r</V>, name: t(`${P}.f.r`), unit: '', value: fmt(s.ethanolRatio, 1) },
        { symbol: <><V>φ</V><Sub>EtOH</Sub></>, name: t(`${P}.f.phi`), unit: '%', value: fmtInt(phi * 100) },
      ],
      explanation: t(`${P}.f.ethanolExplain`),
    },
  ]

  const nextKey = x.sim.running ? 'continue' : x.stage === 'sample' && !src.cellWall ? 'sampleCheek' : x.stage
  const stepButton = (large = false) => (
    <Button variant="primary" onClick={x.next} disabled={x.running} className={large ? 'h-16 px-6 text-xl' : 'w-full'}>
      <ArrowRight className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
      {t(`${P}.next.${nextKey}`)}
    </Button>
  )

  const controls = (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.source`)}</span>
        <Segmented label={t(`${P}.p.source`)} value={s.source} options={SOURCE_IDS.map((id) => ({ value: id, label: sourceName(id) }))} onChange={(source) => x.set({ source })} />
      </div>
      <ParamSlider
        label={t(`${P}.p.amount`)}
        value={s.amount}
        min={src.amount.min}
        max={src.amount.max}
        step={1}
        unit={src.unit}
        onChange={(amount) => x.set({ amount })}
        accent={accent}
      />
      <ParamSlider
        label={t(`${P}.p.mash`)}
        value={s.mashTime}
        min={0}
        max={180}
        step={10}
        unit="s"
        onChange={(mashTime) => x.set({ mashTime })}
        accent={accent}
        disabled={!src.cellWall}
        hint={src.cellWall ? undefined : t(`${P}.p.mashCheek`)}
      />
      <ParamSlider label={t(`${P}.p.detergent`)} value={s.detergent} min={0} max={10} step={0.5} unit="%" onChange={(detergent) => x.set({ detergent })} format={(v) => fmt(v, 1)} accent={accent} />
      <ParamSlider label={t(`${P}.p.salt`)} value={s.salt} min={0} max={1} step={0.05} unit="mol/L" onChange={(salt) => x.set({ salt })} format={(v) => fmt(v, 2)} accent={accent} />
      <Toggle label={t(`${P}.p.protease`)} description={t(`${P}.p.proteaseHint`)} checked={s.protease} onChange={(protease) => x.set({ protease })} />
      <ParamSlider label={t(`${P}.p.ethanolTemp`)} value={s.ethanolTemp} min={-20} max={25} step={1} unit="°C" onChange={(ethanolTemp) => x.set({ ethanolTemp })} accent={accent} />
      <ParamSlider
        label={t(`${P}.p.ethanolRatio`)}
        value={s.ethanolRatio}
        min={0.25}
        max={3}
        step={0.25}
        unit="×"
        onChange={(ethanolRatio) => x.set({ ethanolRatio })}
        format={(v) => fmt(v, 2)}
        accent={accent}
        hint={t(`${P}.p.hint`)}
      />
      {stepButton()}
      <p className="text-xs leading-relaxed text-muted" aria-live="polite">
        {t(`${P}.stage.${x.stage}`)}
      </p>
      <RecordBox
        count={x.readings.length}
        title={t(`${P}.readings`, { count: x.readings.length })}
        hint={spooled ? t(`${P}.readingsHint`) : t(`${P}.readingsWait`)}
        onRecord={x.record}
        onClear={x.clearReadings}
        disabled={!spooled}
      />
    </>
  )

  const presenterControls = (
    <>
      {stepButton(true)}
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.ethanolTemp`)} value={s.ethanolTemp} min={-20} max={25} step={1} unit="°C" onChange={(ethanolTemp) => x.set({ ethanolTemp })} accent={accent} />
      </div>
    </>
  )

  const stepNames = ['sample', 'mash', 'lyse', 'filter', 'ethanol', 'spool'].map((k) => t(`${P}.steps.${k}`))
  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 1.9, 4.5], target: [0, 0.8, 0] }}
      scene={
        <DnaExtractionScene
          sim={x.sim}
          glass={dark ? '#9fb3d9' : '#a9bad6'}
          labels={{ tube: `${fmt(x.precipitated, 0)} µg`, ethanol: `${t(`${P}.ethanolLabel`)} ${fmtInt(s.ethanolTemp)} °C` }}
        />
      }
      fallback2D={<DnaExtraction2D sim={x.sim} steps={stepNames} label={t('lab.view2d', { name: t('catalog.dna-extraction.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ source: s.source, amount: s.amount, detergent: s.detergent, salt: s.salt, ethanolTemp: s.ethanolTemp }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[2], measurements[3], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.source`), value: sourceName(s.source) },
        { label: t(`${P}.p.amount`), value: String(s.amount), unit: src.unit },
        { label: t(`${P}.p.detergent`), value: fmt(s.detergent, 1), unit: '%' },
        { label: t(`${P}.p.salt`), value: fmt(s.salt, 2), unit: 'mol/L' },
        { label: t(`${P}.p.protease`), value: s.protease ? 'yes' : 'no' },
        { label: t(`${P}.p.ethanolTemp`), value: String(s.ethanolTemp), unit: '°C' },
        { label: 'Procedure stage', value: x.stage },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.set({ ethanolTemp: Math.min(25, s.ethanolTemp + 1) }),
        decrease: () => x.set({ ethanolTemp: Math.max(-20, s.ethanolTemp - 1) }),
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
            <p>{t(`${P}.guide.conclusion3`, { value: CLEAR_UG })}</p>
          </>
        ),
        model: t(`${P}.guide.model`),
      }}
    />
  )
}
