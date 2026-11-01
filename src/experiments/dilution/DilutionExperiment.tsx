import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { EPSILON, FLASKS, PATH, calibrationLine, concentrationCurve, type FlaskVolume } from '../../engines/dilution'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtInt } from '../../lib/format'
import { useUi } from '../../store/ui'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { C1_MAX, SPEEDS, useDilution } from './useDilution'
import { DilutionScene } from './DilutionScene'
import { Dilution2D } from './Dilution2D'

const P = 'exp.dilution'

export default function DilutionExperiment() {
  const { t } = useTranslation()
  const x = useDilution()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'dilution')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const { c1, v1, v2 } = x.params
  const mixed = x.stage === 'mixed'

  const curve = useMemo(() => concentrationCurve(c1, v1, v2), [c1, v1, v2])
  const calib = useMemo(() => calibrationLine(C1_MAX / 2), [])

  const measurements: Measurement[] = [
    { id: 'V', label: t(`${P}.m.volume`), value: fmt(x.volume, 1), unit: 'mL', sub: t(`${P}.m.of`, { value: v2 }) },
    {
      id: 'c',
      label: t(`${P}.m.concentration`),
      value: x.stage === 'empty' ? '—' : fmt(x.concentration, 3),
      unit: 'mol/L',
      tone: 'accent',
      sub: mixed ? t(`${P}.m.uniform`) : x.stage === 'empty' ? '' : t(`${P}.m.average`),
    },
    { id: 'n', label: t(`${P}.m.moles`), value: x.stage === 'empty' ? '0' : fmt(x.moles * 1000, 2), unit: 'mmol', sub: t(`${P}.m.constant`) },
    { id: 'factor', label: t(`${P}.m.factor`), value: `×${fmt(x.factor, 1)}`, sub: t(`${P}.m.target`, { value: fmt(x.c2, 3) }) },
    { id: 'A', label: t(`${P}.m.absorbance`), value: x.stage === 'empty' ? '—' : fmt(x.absorbance, 2), sub: t(`${P}.m.transmitted`, { value: fmtInt(x.transmittance * 100) }) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'cV',
      title: t(`${P}.chart.cV`),
      data: curve,
      caption: t(`${P}.chart.cVCaption`),
      render: (d: typeof curve) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="volume" type="number" domain={[0, v2]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.volume`))} {...axisProps(c)} />
            <YAxis domain={[0, 'auto']} width={52} tickFormatter={(v) => fmt(v, 2)} label={L.y(t(`${P}.axis.concentration`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `V = ${fmt(Number(v), 1)} mL`} formatter={(v) => [`${fmt(Number(v), 3)} mol/L`, 'c']} />
            <ReferenceLine y={x.c2} stroke={c.accent2} strokeDasharray="5 4" label={{ value: `c₂ = ${fmt(x.c2, 3)}`, fill: c.accent2, fontSize: 11, position: 'insideTopRight' }} />
            <Line dataKey="concentration" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            {x.volume > 0 && <ReferenceDot x={x.volume} y={x.concentration} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-dilution-curve', headers: ['volume_mL', 'concentration_mol_per_L'], rows: curve.map((p) => [p.volume, p.concentration]) }),
    },
    {
      id: 'beer',
      title: t(`${P}.chart.beer`),
      data: { calib, points: x.readings },
      caption: t(`${P}.chart.beerCaption`),
      render: (d: { calib: typeof calib; points: typeof x.readings }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="concentration" type="number" domain={[0, C1_MAX / 2]} tickFormatter={(v) => fmt(v, 2)} label={L.x(t(`${P}.axis.concentration`))} {...axisProps(c)} />
            <YAxis dataKey="absorbance" type="number" domain={[0, 'auto']} width={48} label={L.y(t(`${P}.axis.absorbance`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [fmt(Number(v), 3), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.calib} dataKey="absorbance" name={t(`${P}.chart.beerLine`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.points.map((r) => ({ concentration: r.c2, absorbance: r.A }))} dataKey="absorbance" name={t(`${P}.chart.yourSolutions`)} fill={c.accent2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-dilution-series',
        headers: ['c1_mol_per_L', 'v1_mL', 'v2_mL', 'c2_mol_per_L', 'absorbance'],
        rows: x.readings.map((r) => [r.c1, r.v1, r.v2, r.c2, r.A]),
      }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'c1v1',
      title: 'c₁V₁ = c₂V₂',
      expression: (
        <>
          <V>c</V><Sub>1</Sub><V>V</V><Sub>1</Sub> = <V>c</V><Sub>2</Sub><V>V</V><Sub>2</Sub>
        </>
      ),
      substituted: (
        <>
          {fmt(c1, 2)} mol/L × {fmtInt(v1)} mL = <V>c</V><Sub>2</Sub> × {v2} mL → <b><V>c</V><Sub>2</Sub> = {fmt(x.c2, 3)} mol/L</b>
        </>
      ),
      variables: [
        { symbol: <><V>c</V><Sub>1</Sub></>, name: t(`${P}.f.c1`), unit: 'mol/L', value: fmt(c1, 2) },
        { symbol: <><V>V</V><Sub>1</Sub></>, name: t(`${P}.f.v1`), unit: 'mL', value: fmtInt(v1), effect: t(`${P}.f.v1Effect`) },
        { symbol: <><V>V</V><Sub>2</Sub></>, name: t(`${P}.f.v2`), unit: 'mL', value: String(v2), effect: t(`${P}.f.v2Effect`) },
        { symbol: <><V>c</V><Sub>2</Sub></>, name: t(`${P}.f.c2`), unit: 'mol/L', value: fmt(x.c2, 3) },
      ],
      explanation: t(`${P}.f.c1v1Explain`),
    },
    {
      id: 'n',
      title: 'n = c V',
      expression: (
        <>
          <V>n</V> = <V>c</V> · <V>V</V>
        </>
      ),
      substituted: (
        <>
          {fmt(c1, 2)} mol/L × {fmt(v1 / 1000, 3)} L = <b>{fmt(x.totalMoles * 1000, 2)} mmol</b>
        </>
      ),
      variables: [{ symbol: <V>n</V>, name: t(`${P}.f.n`), unit: 'mol', value: fmt(x.totalMoles, 4) }],
      explanation: t(`${P}.f.nExplain`),
    },
    {
      id: 'beer',
      title: 'A = ε l c',
      expression: (
        <>
          <V>A</V> = <V>ε</V> · <V>l</V> · <V>c</V>
        </>
      ),
      substituted: (
        <>
          {EPSILON} × {PATH} cm × {fmt(x.c2, 3)} mol/L = <b>{fmt(EPSILON * PATH * x.c2, 2)}</b>
        </>
      ),
      variables: [
        { symbol: <V>A</V>, name: t(`${P}.f.A`), unit: '', value: fmt(EPSILON * PATH * x.c2, 2) },
        { symbol: <V>ε</V>, name: t(`${P}.f.epsilon`), unit: 'L/(mol·cm)', value: String(EPSILON) },
        { symbol: <V>l</V>, name: t(`${P}.f.l`), unit: 'cm', value: String(PATH) },
      ],
      explanation: t(`${P}.f.beerExplain`),
    },
  ]

  const nextLabel = t(`${P}.next.${x.stage}`, { value: fmtInt(v1) })
  const stepButton = (large = false) => (
    <Button variant="primary" onClick={x.next} disabled={x.running} className={large ? 'h-16 px-6 text-xl' : 'w-full'}>
      <ArrowRight className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
      {nextLabel}
    </Button>
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.c1`)} value={c1} min={0.1} max={C1_MAX} step={0.05} unit="mol/L" onChange={x.setC1} format={(v) => fmt(v, 2)} accent={accent} />
      <ParamSlider label={t(`${P}.p.v1`)} value={v1} min={1} max={v2 / 2} step={1} unit="mL" onChange={x.setV1} accent={accent} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.v2`)}</span>
        <Segmented label={t(`${P}.p.v2`)} value={v2} options={FLASKS.map((f) => ({ value: f, label: `${f} mL` }))} onChange={(f) => x.setV2(f as FlaskVolume)} />
        <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.hint`)}</p>
      </div>
      {stepButton()}
      <p className="text-xs leading-relaxed text-muted" aria-live="polite">
        {t(`${P}.stage.${x.stage}`)}
      </p>
      <RecordBox
        count={x.readings.length}
        title={t(`${P}.readings`, { count: x.readings.length })}
        hint={mixed ? t(`${P}.readingsHint`) : t(`${P}.readingsWait`)}
        onRecord={x.record}
        onClear={x.clearReadings}
        disabled={!mixed}
      />
    </>
  )

  const presenterControls = (
    <>
      {stepButton(true)}
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.v1`)} value={v1} min={1} max={v2 / 2} step={1} unit="mL" onChange={x.setV1} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 1.9, 4.6], target: [0, 1.0, 0] }}
      scene={
        <DilutionScene
          sim={x.sim}
          glass={dark ? '#9fb3d9' : '#a9bad6'}
          labels={{ stock: `${fmt(c1, 2)} mol/L`, flask: x.stage === 'empty' ? `${v2} mL` : `${fmt(x.volume, 1)} mL` }}
        />
      }
      fallback2D={<Dilution2D sim={x.sim} label={t('lab.view2d', { name: t('catalog.dilution.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ c1, v1, v2 }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.c1`), value: fmt(c1, 2), unit: 'mol/L' },
        { label: t(`${P}.p.v1`), value: fmtInt(v1), unit: 'mL' },
        { label: t(`${P}.p.v2`), value: String(v2), unit: 'mL' },
        { label: 'Procedure stage', value: x.stage },
        { label: 'Volume in flask', value: fmt(x.volume, 1), unit: 'mL' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setV1(Math.min(v2 / 2, v1 + 1)),
        decrease: () => x.setV1(Math.max(1, v1 - 1)),
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
