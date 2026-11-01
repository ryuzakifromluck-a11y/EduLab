import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { APPARATUS, C_WATER, G, T_ROOM, coilResistance, fallingWork, heatCapacity, temperatureRise, type Method } from '../../engines/joulesExperiment'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { SPEEDS, useJoulesExperiment } from './useJoulesExperiment'
import { JoulesExperimentScene } from './JoulesExperimentScene'
import { JoulesExperiment2D } from './JoulesExperiment2D'

const P = 'exp.joules-experiment'
const DROPS = 20

export default function JoulesExperimentExperiment() {
  const { t } = useTranslation()
  const j = useJoulesExperiment()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'joules-experiment')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const Ctot = heatCapacity(APPARATUS)
  const mech = j.method === 'mechanical'

  const trace = j.trace.map((s) => ({ W: s.W, T: s.T, ideal: T_ROOM + s.W / Ctot }))
  const rise = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const m = 1 + i
        return { m, h05: temperatureRise(fallingWork(m, 0.5, DROPS)), h1: temperatureRise(fallingWork(m, 1, DROPS)), h2: temperatureRise(fallingWork(m, 2, DROPS)) }
      }),
    [],
  )
  const runs = j.runs.map((r, i) => ({ ...r, name: `${i + 1}`, Jv: r.J ?? 0 }))

  const measurements: Measurement[] = [
    { id: 'T', label: t(`${P}.m.temperature`), value: fmt(j.T, 2), unit: '°C', tone: 'accent', sub: t(`${P}.m.rise`, { value: fmt(j.dT, 3) }) },
    {
      id: 'W',
      label: mech ? t(`${P}.m.workMech`) : t(`${P}.m.workElec`),
      value: fmt(j.work, 0),
      unit: 'J',
      sub: mech ? t(`${P}.m.drops`, { count: j.drops, value: fmt(j.perDrop, 1) }) : t(`${P}.m.time`, { value: fmt(j.time, 0) }),
    },
    { id: 'Q', label: t(`${P}.m.heat`), value: fmt(j.heat, 0), unit: 'J', sub: t(`${P}.m.cal`, { value: fmt(j.heat / j.CAL, 0) }) },
    {
      id: 'J',
      label: t(`${P}.m.J`),
      value: j.measuredJ === null || j.dT < 0.005 ? '—' : fmt(j.measuredJ, 2),
      unit: 'J/cal',
      sub: t(`${P}.m.accepted`),
    },
    mech
      ? { id: 'pd', label: t(`${P}.m.perDrop`), value: fmt(j.risePerDrop * 1000, 0), unit: 'mK', sub: t(`${P}.m.perDropSub`) }
      : { id: 'R', label: t(`${P}.m.coil`), value: fmt(coilResistance(j.voltage, j.current), 1), unit: 'Ω', sub: t(`${P}.m.coilSub`, { I: fmt(j.current, 2), P: fmt(j.power, 1) }) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'tw',
      title: t(`${P}.chart.tw`),
      data: trace,
      caption: t(`${P}.chart.twCaption`),
      render: (d: typeof trace) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="W" type="number" domain={[0, 'auto']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.work`))} {...axisProps(c)} />
            <YAxis type="number" domain={[T_ROOM, 'auto']} width={52} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.temperature`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `W = ${fmt(Number(v), 0)} J`} formatter={(v, n) => [`${fmt(Number(v), 3)} °C`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="ideal" name={t(`${P}.chart.ideal`)} stroke={c.accent3} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line dataKey="T" name={t(`${P}.chart.measured`)} stroke={accent} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-joule-temperature', headers: ['t_s', 'work_J', 'T_C'], rows: j.trace.map((s) => [s.t, s.W, s.T]) }),
    },
    {
      id: 'rise',
      title: t(`${P}.chart.rise`),
      data: rise,
      caption: t(`${P}.chart.riseCaption`, { count: DROPS }),
      render: (d: typeof rise) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="m" type="number" domain={[1, 21]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.mass`))} {...axisProps(c)} />
            <YAxis width={52} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.rise`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 0)} kg`} formatter={(v, n) => [`${fmt(Number(v), 2)} K`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="h05" name="h = 0.5 m" stroke={c.accent2} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line dataKey="h1" name="h = 1 m" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="h2" name="h = 2 m" stroke={c.accent3} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-joule-rise', headers: ['mass_kg', 'dT_h0.5_K', 'dT_h1_K', 'dT_h2_K'], rows: rise.map((r) => [r.m, r.h05, r.h1, r.h2]) }),
    },
    {
      id: 'runs',
      title: t(`${P}.chart.runs`),
      data: runs,
      caption: t(`${P}.chart.runsCaption`),
      render: (d: typeof runs) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="name" label={L.x(t(`${P}.axis.run`))} {...axisProps(c)} />
            <YAxis width={52} domain={[0, 'auto']} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.J`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(_, p) => (p?.[0]?.payload as { label?: string } | undefined)?.label ?? ''} formatter={(v) => [`${fmt(Number(v), 2)} J/cal`, 'J']} />
            <ReferenceLine y={j.CAL} stroke={c.accent2} strokeDasharray="5 4" label={{ value: '4.186', fill: c.accent2, fontSize: 11, position: 'insideTopRight' }} />
            <Bar dataKey="Jv" fill={accent} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-joule-runs',
        headers: ['method', 'insulated', 'work_J', 'dT_K', 'J_per_cal'],
        rows: j.runs.map((r) => [r.method, r.insulated ? 'yes' : 'no', r.work, r.dT, r.J ?? '']),
      }),
    },
  ]

  const formulas: Formula[] = [
    mech
      ? {
          id: 'W',
          title: 'W = n m g h',
          expression: (
            <>
              <V>W</V> = <V>n</V> · <V>m</V> · <V>g</V> · <V>h</V>
            </>
          ),
          substituted: (
            <>
              {j.drops} × {fmt(j.mass, 0)} kg × {fmt(G, 2)} m/s² × {fmt(j.height, 2)} m = <b>{fmt(j.drops * j.perDrop, 0)} J</b>
            </>
          ),
          variables: [
            { symbol: <V>n</V>, name: t(`${P}.f.n`), unit: '', value: String(j.drops) },
            { symbol: <V>m</V>, name: t(`${P}.f.m`), unit: 'kg', value: fmt(j.mass, 0), effect: t(`${P}.f.mEffect`) },
            { symbol: <V>h</V>, name: t(`${P}.f.h`), unit: 'm', value: fmt(j.height, 2), effect: t(`${P}.f.hEffect`) },
          ],
          explanation: t(`${P}.f.wExplain`),
        }
      : {
          id: 'W',
          title: 'W = V I t,  R = V / I',
          expression: (
            <>
              <V>W</V> = <V>V</V> · <V>I</V> · <V>t</V> , <V>R</V> = <V>V</V> / <V>I</V>
            </>
          ),
          substituted: (
            <>
              {fmt(j.voltage, 1)} V × {fmt(j.current, 2)} A × {fmt(j.time, 0)} s = <b>{fmt(j.work, 0)} J</b>; R = {fmt(j.voltage, 1)} / {fmt(j.current, 2)} = <b>{fmt(coilResistance(j.voltage, j.current), 1)} Ω</b>
            </>
          ),
          variables: [
            { symbol: <V>V</V>, name: t(`${P}.f.V`), unit: 'V', value: fmt(j.voltage, 1) },
            { symbol: <V>I</V>, name: t(`${P}.f.I`), unit: 'A', value: fmt(j.current, 2) },
            { symbol: <V>R</V>, name: t(`${P}.f.R`), unit: 'Ω', value: fmt(j.resistance, 1) },
          ],
          explanation: t(`${P}.f.elecExplain`),
        },
    {
      id: 'Q',
      title: 'Q = (m_w c + C_can) ΔT',
      expression: (
        <>
          <V>Q</V> = (<V>m</V>
          <Sub>w</Sub> <V>c</V> + <V>C</V>
          <Sub>can</Sub>) Δ<V>T</V>
        </>
      ),
      substituted: (
        <>
          ({fmt(APPARATUS.waterMass, 2)} kg × {fmt(C_WATER, 0)} + {fmt(APPARATUS.canHeatCapacity, 0)}) J/K × {fmt(j.dT, 3)} K = <b>{fmt(j.heat, 0)} J</b>
        </>
      ),
      variables: [
        { symbol: <V>c</V>, name: t(`${P}.f.c`), unit: 'J/(kg·K)', value: fmt(C_WATER, 0) },
        { symbol: <V>C</V>, name: t(`${P}.f.Ccan`), unit: 'J/K', value: fmt(APPARATUS.canHeatCapacity, 0) },
        { symbol: <>Δ<V>T</V></>, name: t(`${P}.f.dT`), unit: 'K', value: fmt(j.dT, 3) },
      ],
      explanation: t(`${P}.f.qExplain`),
    },
    {
      id: 'J',
      title: 'J = W / Q',
      expression: (
        <>
          <V>J</V> = <V>W</V> / <V>Q</V>
          <Sub>cal</Sub>
        </>
      ),
      substituted: (
        <>
          {fmt(j.work, 0)} J / {fmt(j.heat / j.CAL, 0)} cal = <b>{j.measuredJ === null ? '—' : fmt(j.measuredJ, 2)} J/cal</b>
        </>
      ),
      variables: [{ symbol: <V>J</V>, name: t(`${P}.f.J`), unit: 'J/cal', value: j.measuredJ === null ? '—' : fmt(j.measuredJ, 2) }],
      explanation: t(`${P}.f.jExplain`),
    },
  ]

  const methodPicker = (large = false) => (
    <Segmented
      label={t(`${P}.p.method`)}
      value={j.method}
      onChange={(m: Method) => j.setMethod(m)}
      options={[
        { value: 'mechanical' as Method, label: t(`${P}.methods.mechanical`) },
        { value: 'electrical' as Method, label: t(`${P}.methods.electrical`) },
      ]}
      size={large ? 'lg' : 'md'}
    />
  )

  const controls = (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.method`)}</span>
        {methodPicker()}
      </div>
      {mech ? (
        <>
          <ParamSlider label={t(`${P}.p.mass`)} value={j.mass} min={1} max={20} step={1} unit="kg" onChange={j.setMass} accent={accent} />
          <ParamSlider label={t(`${P}.p.height`)} value={j.height} min={0.5} max={2} step={0.1} unit="m" onChange={j.setHeight} accent={accent} />
        </>
      ) : (
        <>
          <ParamSlider label={t(`${P}.p.voltage`)} value={j.voltage} min={2} max={12} step={0.5} unit="V" onChange={j.setVoltage} accent={accent} />
          <ParamSlider label={t(`${P}.p.resistance`)} value={j.resistance} min={2} max={10} step={0.5} unit="Ω" onChange={j.setResistance} accent={accent} />
        </>
      )}
      <Toggle label={t(`${P}.p.insulated`)} checked={j.insulated} onChange={j.setInsulated} description={t(`${P}.p.insulatedHint`)} />
      <p className="text-xs leading-relaxed text-muted">{mech ? t(`${P}.p.runHintMech`) : t(`${P}.p.runHintElec`)}</p>
      <RecordBox
        count={j.runs.length}
        title={t(`${P}.runs`, { count: j.runs.length })}
        hint={t(`${P}.runsHint`)}
        onRecord={j.saveRun}
        recordLabel={t(`${P}.saveRun`)}
        onClear={j.clearRuns}
        disabled={j.work <= 0}
      />
    </>
  )

  const presenterControls = (
    <>
      {methodPicker(true)}
      <div className="min-w-[220px] flex-1">
        {mech ? (
          <ParamSlider large label={t(`${P}.p.mass`)} value={j.mass} min={1} max={20} step={1} unit="kg" onChange={j.setMass} accent={accent} />
        ) : (
          <ParamSlider large label={t(`${P}.p.voltage`)} value={j.voltage} min={2} max={12} step={0.5} unit="V" onChange={j.setVoltage} accent={accent} />
        )}
      </div>
      <Button size="lg" variant="secondary" onClick={() => j.setInsulated(!j.insulated)}>
        {j.insulated ? t(`${P}.p.removeInsulation`) : t(`${P}.p.addInsulation`)}
      </Button>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.9, 2.4, 6.0], target: [0.7, 1.45, 0] }}
      scene={
        <JoulesExperimentScene
          cal={j.cal}
          method={j.method}
          height={j.height}
          mass={j.mass}
          insulated={j.insulated}
          labels={{
            thermo: `${fmt(j.T, 2)} °C`,
            weight: `${fmt(j.mass, 0)} kg`,
            meter: mech ? null : `${fmt(j.current, 2)} A · ${fmt(j.voltage, 1)} V`,
          }}
        />
      }
      fallback2D={<JoulesExperiment2D cal={j.cal} method={j.method} height={j.height} label={t('lab.view2d', { name: t('catalog.joules-experiment.title') })} />}
      controls={{ running: j.running, onTogglePlay: j.togglePlay, onReset: j.reset, speed: j.speed, speeds: SPEEDS, onSpeed: j.setSpeed }}
      overlay={<OverlayNote>{mech ? t(`${P}.legendMech`) : t(`${P}.legendElec`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ method: j.method, mass: j.mass, height: j.height, insulated: j.insulated ? 1 : 0 }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.method`), value: j.method },
        mech ? { label: t(`${P}.p.mass`), value: fmt(j.mass, 0), unit: 'kg' } : { label: t(`${P}.p.voltage`), value: fmt(j.voltage, 1), unit: 'V' },
        mech ? { label: t(`${P}.p.height`), value: fmt(j.height, 2), unit: 'm' } : { label: t(`${P}.p.resistance`), value: fmt(j.resistance, 1), unit: 'Ω' },
        { label: 'Insulated can', value: j.insulated ? 'yes' : 'no' },
        { label: 'Work done', value: fmt(j.work, 0), unit: 'J' },
        { label: 'Temperature rise', value: fmt(j.dT, 3), unit: 'K' },
        { label: 'Water 0.25 kg + can 80 J/K', value: `${fmt(Ctot, 0)} J/K` },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: j.running,
        togglePlay: j.togglePlay,
        reset: j.reset,
        increase: () => (mech ? j.setMass(Math.min(20, j.mass + 1)) : j.setVoltage(Math.min(12, j.voltage + 0.5))),
        decrease: () => (mech ? j.setMass(Math.max(1, j.mass - 1)) : j.setVoltage(Math.max(2, j.voltage - 0.5))),
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
