import { FlaskConical } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { C_WATER, ROOM_T, SUBSTANCES, deltaTVsMass, energyProfile, substanceById, type Substance } from '../../engines/calorimetry'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtInt } from '../../lib/format'
import { useUi } from '../../store/ui'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { MASS_MAX, RUN_LENGTH, SPEEDS, useExoEndo } from './useExoEndo'
import { ExoEndoScene } from './ExoEndoScene'
import { ExoEndo2D } from './ExoEndo2D'

const P = 'exp.exo-endo'

export default function ExoEndoExperiment() {
  const { t } = useTranslation()
  const x = useExoEndo()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'exo-endo')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const { substance, mass, water } = x.params
  const sub = substanceById(substance)
  const exo = sub.dH < 0
  const name = (id: Substance['id']) => t(`${P}.substances.${id}`)

  const line = useMemo(() => deltaTVsMass(x.params, MASS_MAX), [x.params])
  const points = x.runs.filter((r) => r.substance === substance && r.water === water)
  const profile = useMemo(() => energyProfile(sub.dH), [sub.dH])
  const measuredDH = x.moles > 0 && x.started ? (-water * C_WATER * x.peak) / x.moles / 1000 : null

  const measurements: Measurement[] = [
    { id: 'T', label: t(`${P}.m.temperature`), value: fmt(x.temperature, 1), unit: '°C', tone: 'accent', sub: t(`${P}.m.time`, { value: fmtInt(x.time) }) },
    { id: 'dT', label: t(`${P}.m.deltaT`), value: `${x.peak > 0 ? '+' : ''}${fmt(x.peak, 1)}`, unit: 'K', sub: t(`${P}.m.ideal`, { value: fmt(x.idealDeltaT, 1) }) },
    { id: 'q', label: t(`${P}.m.heat`), value: fmt(x.heat / 1000, 2), unit: 'kJ', sub: exo ? t(`${P}.m.released`) : t(`${P}.m.absorbed`) },
    { id: 'dH', label: t(`${P}.m.dH`), value: measuredDH === null ? '—' : fmt(measuredDH, 1), unit: 'kJ/mol', sub: t(`${P}.m.dataBook`, { value: fmt(sub.dH, 1) }) },
    { id: 'type', label: t(`${P}.m.type`), value: exo ? t(`${P}.exothermic`) : t(`${P}.endothermic`), tone: exo ? 'warn' : 'default', sub: t(`${P}.m.dissolved`, { value: fmtInt(x.extent * 100) }) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'Tt',
      title: t(`${P}.chart.Tt`),
      data: x.log,
      caption: t(`${P}.chart.TtCaption`),
      render: (d: typeof x.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, RUN_LENGTH]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={['auto', 'auto']} width={48} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.temperature`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 0)} s`} formatter={(v) => [`${fmt(Number(v), 2)} °C`, 'T']} />
            <ReferenceLine y={ROOM_T + x.idealDeltaT} stroke={c.accent2} strokeDasharray="5 4" label={{ value: t(`${P}.chart.ideal`), fill: c.accent2, fontSize: 11, position: 'insideTopRight' }} />
            <ReferenceLine y={ROOM_T} stroke={c.axis} />
            <Line dataKey="T" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-calorimetry-run', headers: ['t_s', 'T_C'], rows: x.log.map((s) => [s.t, s.T]) }),
    },
    {
      id: 'dTm',
      title: t(`${P}.chart.dTm`),
      data: { line, points },
      caption: t(`${P}.chart.dTmCaption`),
      render: (d: { line: typeof line; points: typeof points }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="mass" type="number" domain={[0, MASS_MAX]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.mass`))} {...axisProps(c)} />
            <YAxis dataKey="deltaT" type="number" width={48} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.deltaT`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [fmt(Number(v), 2), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke={c.axis} />
            <Line data={d.line} dataKey="deltaT" name={t(`${P}.chart.idealLine`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.points} dataKey="deltaT" name={t(`${P}.chart.yourRuns`)} fill={c.accent2} isAnimationActive={false} />
            <ReferenceDot x={mass} y={x.idealDeltaT} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-calorimetry-runs',
        headers: ['substance', 'mass_g', 'water_mL', 'deltaT_K', 'dH_kJ_per_mol'],
        rows: x.runs.map((r) => [r.substance, r.mass, r.water, r.deltaT, r.dH]),
      }),
    },
    {
      id: 'profile',
      title: t(`${P}.chart.profile`),
      data: profile,
      caption: exo ? t(`${P}.chart.profileExo`) : t(`${P}.chart.profileEndo`),
      render: (d: typeof profile) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="s" type="number" domain={[0, 1]} ticks={[0, 1]} tickFormatter={(v) => (v === 0 ? t(`${P}.chart.reactants`) : t(`${P}.chart.products`))} label={L.x(t(`${P}.axis.progress`))} {...axisProps(c)} />
            <YAxis width={52} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.enthalpy`))} {...axisProps(c)} />
            <ReferenceLine y={0} stroke={c.axis} strokeDasharray="4 4" />
            <ReferenceLine y={sub.dH} stroke={exo ? c.accent2 : c.physics} strokeDasharray="4 4" label={{ value: `ΔH = ${fmt(sub.dH, 1)} kJ/mol`, fill: c.text, fontSize: 11, position: 'insideBottomRight' }} />
            <Line dataKey="H" stroke={accent} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-energy-profile', headers: ['progress', 'enthalpy_kJ_per_mol'], rows: profile.map((p) => [p.s, p.H]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'q',
      title: 'q = m c ΔT',
      expression: (
        <>
          <V>q</V> = <V>m</V> · <V>c</V> · Δ<V>T</V>
        </>
      ),
      substituted: (
        <>
          {fmtInt(water)} g × {fmt(C_WATER, 2)} J/(g·K) × {fmt(x.idealDeltaT, 2)} K = <b>{fmtInt(x.heat)} J</b>
        </>
      ),
      variables: [
        { symbol: <V>q</V>, name: t(`${P}.f.q`), unit: 'J', value: fmtInt(x.heat) },
        { symbol: <V>m</V>, name: t(`${P}.f.m`), unit: 'g', value: fmtInt(water), effect: t(`${P}.f.mEffect`) },
        { symbol: <V>c</V>, name: t(`${P}.f.c`), unit: 'J/(g·K)', value: fmt(C_WATER, 2) },
        { symbol: <>Δ<V>T</V></>, name: t(`${P}.f.dT`), unit: 'K', value: fmt(x.idealDeltaT, 2) },
      ],
      explanation: t(`${P}.f.qExplain`),
    },
    {
      id: 'n',
      title: 'n = m / M',
      expression: (
        <>
          <V>n</V> = <Frac n={<><V>m</V><Sub>solid</Sub></>} d={<V>M</V>} />
        </>
      ),
      substituted: (
        <>
          {fmt(mass, 1)} g / {fmt(sub.molarMass, 2)} g/mol = <b>{fmt(x.moles, 4)} mol</b>
        </>
      ),
      variables: [
        { symbol: <V>n</V>, name: t(`${P}.f.n`), unit: 'mol', value: fmt(x.moles, 4) },
        { symbol: <V>M</V>, name: t(`${P}.f.M`, { formula: sub.formula }), unit: 'g/mol', value: fmt(sub.molarMass, 2) },
      ],
      explanation: t(`${P}.f.nExplain`),
    },
    {
      id: 'dH',
      title: 'ΔH = −q / n',
      expression: (
        <>
          Δ<V>H</V> = −<Frac n={<V>q</V>} d={<V>n</V>} />
        </>
      ),
      substituted: (
        <>
          −{fmtInt(x.heat)} J / {fmt(x.moles, 4)} mol = <b>{fmt(sub.dH, 1)} kJ/mol</b>
        </>
      ),
      variables: [{ symbol: <>Δ<V>H</V></>, name: t(`${P}.f.dH`), unit: 'kJ/mol', value: fmt(sub.dH, 1), effect: t(`${P}.f.dHEffect`) }],
      explanation: t(`${P}.f.dHExplain`),
    },
  ]

  const startButton = (large = false) => (
    <Button variant="primary" onClick={x.start} disabled={x.started && !x.finished} className={large ? 'h-16 px-6 text-xl' : 'w-full'}>
      <FlaskConical className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
      {x.finished ? t(`${P}.again`) : t(`${P}.add`, { formula: sub.formula })}
    </Button>
  )

  const options = SUBSTANCES.map((s) => ({ value: s.id, label: `${name(s.id)} (${s.formula})` }))
  const controls = (
    <>
      <SelectField label={t(`${P}.p.substance`)} value={substance} options={options} onChange={x.setSubstance} />
      <ParamSlider label={t(`${P}.p.mass`)} value={mass} min={1} max={MASS_MAX} step={0.5} unit="g" onChange={x.setMass} format={(v) => fmt(v, 1)} accent={accent} />
      <ParamSlider label={t(`${P}.p.water`)} value={water} min={50} max={200} step={10} unit="mL" onChange={x.setWater} hint={t(`${P}.p.waterHint`)} accent={accent} />
      {startButton()}
      <RecordBox count={x.runs.length} title={t(`${P}.runs`, { count: x.runs.length })} hint={t(`${P}.runsHint`)} onClear={x.clearRuns} />
    </>
  )

  const presenterControls = (
    <>
      {startButton(true)}
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.mass`)} value={mass} min={1} max={MASS_MAX} step={0.5} unit="g" onChange={x.setMass} format={(v) => fmt(v, 1)} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.6, 2.6, 4.2], target: [0.3, 0.9, 0] }}
      scene={<ExoEndoScene sim={x.sim} glass={dark ? '#9fb3d9' : '#a9bad6'} labels={{ reading: `${fmt(x.temperature, 1)} °C` }} />}
      fallback2D={<ExoEndo2D sim={x.sim} label={t('lab.view2d', { name: t('catalog.exo-endo.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ substance, mass, water }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.substance`), value: `${sub.formula} (ΔH = ${sub.dH} kJ/mol)` },
        { label: t(`${P}.p.mass`), value: fmt(mass, 1), unit: 'g' },
        { label: t(`${P}.p.water`), value: fmtInt(water), unit: 'mL' },
        { label: 'Peak temperature change so far', value: fmt(x.peak, 2), unit: 'K' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setMass(Math.min(MASS_MAX, mass + 0.5)),
        decrease: () => x.setMass(Math.max(1, mass - 0.5)),
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
