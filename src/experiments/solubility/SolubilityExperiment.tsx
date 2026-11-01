import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { SALTS, saltById, solubilityCurves, type Salt } from '../../engines/solubility'
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
import { ADD_MAX, SPEEDS, useSolubility } from './useSolubility'
import { SolubilityScene } from './SolubilityScene'
import { Solubility2D } from './Solubility2D'

const P = 'exp.solubility'

export default function SolubilityExperiment() {
  const { t } = useTranslation()
  const x = useSolubility()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'solubility')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const salt = saltById(x.salt)
  const name = (id: Salt['id']) => t(`${P}.salts.${id}`)
  const palette: Record<Salt['id'], string> = { kno3: c.chemistry, nh4cl: c.accent2, kcl: c.physics, nacl: c.accent3, cuso4: '#2f8fd8' }
  const curves = useMemo(() => solubilityCurves(), [])
  const points = x.readings.filter((r) => r.salt === x.salt)
  const stateLabel = t(`${P}.state.${x.state}`)
  const canAdd = x.added < ADD_MAX

  const measurements: Measurement[] = [
    { id: 'added', label: t(`${P}.m.added`), value: fmt(x.added, 1), unit: 'g', sub: t(`${P}.m.inWater`) },
    { id: 'dissolved', label: t(`${P}.m.dissolved`), value: fmt(x.dissolved, 1), unit: 'g', tone: 'accent', sub: t(`${P}.m.percent`, { value: fmt(x.percent, 1) }) },
    { id: 'solid', label: t(`${P}.m.solid`), value: fmt(x.undissolved, 1), unit: 'g' },
    { id: 'S', label: t(`${P}.m.solubility`, { T: fmtInt(x.temperature) }), value: fmt(x.solubility, 1), unit: 'g/100 g' },
    {
      id: 'state',
      label: t(`${P}.m.state`),
      value: stateLabel,
      tone: x.state === 'unsaturated' ? 'default' : 'warn',
      sub: x.saturationT === null ? (x.added > 0 ? t(`${P}.m.never`) : '—') : t(`${P}.m.saturationT`, { value: fmtInt(x.saturationT) }),
    },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'curves',
      title: t(`${P}.chart.curves`),
      data: { curves, points },
      caption: t(`${P}.chart.curvesCaption`),
      render: (d: { curves: typeof curves; points: typeof points }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d.curves} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="T" type="number" domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} label={L.x(t(`${P}.axis.temperature`))} {...axisProps(c)} />
            <YAxis type="number" domain={[0, 250]} width={48} label={L.y(t(`${P}.axis.solubility`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 0)} °C`} formatter={(v, n) => [`${fmt(Number(v), 1)} g`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            {SALTS.map((s) => (
              <Line
                key={s.id}
                dataKey={s.id}
                name={s.formula}
                stroke={palette[s.id]}
                strokeWidth={s.id === x.salt ? 3 : 1.25}
                strokeOpacity={s.id === x.salt ? 1 : 0.55}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            <Scatter data={d.points} dataKey="solubility" name={t(`${P}.chart.yourReadings`)} fill={c.marker} isAnimationActive={false} />
            <ReferenceDot x={x.temperature} y={Math.min(250, x.added)} r={6} fill={palette[x.salt]} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-solubility-curves',
        headers: ['T_C', ...SALTS.map((s) => `${s.id}_g_per_100g`)],
        rows: curves.map((r) => [r.T, ...SALTS.map((s) => r[s.id])]),
      }),
    },
    {
      id: 'time',
      title: t(`${P}.chart.time`),
      data: x.log,
      caption: t(`${P}.chart.timeCaption`),
      render: (d: typeof x.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis width={48} label={L.y(t(`${P}.axis.mass`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 1)} s`} formatter={(v, n) => [`${fmt(Number(v), 1)} g`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={x.added} stroke={c.axis} strokeDasharray="4 4" />
            <Line dataKey="capacity" name={t(`${P}.chart.capacity`)} stroke={c.accent2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
            <Line dataKey="dissolved" name={t(`${P}.chart.dissolved`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-dissolving', headers: ['t_s', 'dissolved_g', 'capacity_g'], rows: x.log.map((s) => [s.t, s.dissolved, s.capacity]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'S',
      title: 'S = m(salt) / m(water) × 100',
      expression: (
        <>
          <V>S</V> = <Frac n={<><V>m</V><Sub>salt</Sub></>} d={<><V>m</V><Sub>water</Sub></>} /> × 100 g
        </>
      ),
      substituted: (
        <>
          {t(`${P}.f.atT`, { T: fmtInt(x.temperature) })}: <b>{fmt(x.solubility, 1)} g</b> {t(`${P}.f.per100`)}
        </>
      ),
      variables: [
        { symbol: <V>S</V>, name: t(`${P}.f.S`), unit: 'g/100 g', value: fmt(x.solubility, 1), effect: t(`${P}.f.SEffect`) },
        { symbol: <><V>m</V><Sub>salt</Sub></>, name: t(`${P}.f.mSalt`), unit: 'g', value: fmt(x.dissolved, 1) },
        { symbol: <><V>m</V><Sub>water</Sub></>, name: t(`${P}.f.mWater`), unit: 'g', value: '100' },
      ],
      explanation: t(`${P}.f.SExplain`),
    },
    {
      id: 'w',
      title: 'w = m(salt) / m(solution)',
      expression: (
        <>
          <V>w</V> = <Frac n={<><V>m</V><Sub>salt</Sub></>} d={<><V>m</V><Sub>salt</Sub> + <V>m</V><Sub>water</Sub></>} /> × 100 %
        </>
      ),
      substituted: (
        <>
          {fmt(x.dissolved, 1)} g / ({fmt(x.dissolved, 1)} g + 100 g) × 100 % = <b>{fmt(x.percent, 1)} %</b>
        </>
      ),
      variables: [{ symbol: <V>w</V>, name: t(`${P}.f.w`), unit: '%', value: fmt(x.percent, 1) }],
      explanation: t(`${P}.f.wExplain`),
    },
  ]

  const addButtons = (large = false) => (
    <div className="flex gap-2">
      {[5, 20].map((g) => (
        <Button key={g} variant={g === 5 ? 'primary' : 'secondary'} onClick={() => x.add(g)} disabled={!canAdd} className={large ? 'h-14 px-5 text-lg' : 'flex-1'}>
          <Plus className={large ? 'h-5 w-5' : 'h-4 w-4'} aria-hidden />
          {t(`${P}.add`, { value: g })}
        </Button>
      ))}
    </div>
  )

  const controls = (
    <>
      <SelectField label={t(`${P}.p.salt`)} value={x.salt} options={SALTS.map((s) => ({ value: s.id, label: `${name(s.id)} (${s.formula})` }))} onChange={x.setSalt} />
      <ParamSlider label={t(`${P}.p.temperature`)} value={x.temperature} min={0} max={100} step={1} unit="°C" onChange={x.setTemperature} hint={t(`${P}.p.temperatureHint`)} accent={accent} />
      {addButtons()}
      <RecordBox
        count={x.readings.length}
        title={t(`${P}.readings`, { count: x.readings.length })}
        hint={x.settled ? t(`${P}.readingsHint`) : t(`${P}.readingsWait`)}
        onRecord={x.record}
        onClear={x.clearReadings}
        disabled={!x.settled}
      />
    </>
  )

  const presenterControls = (
    <>
      {addButtons(true)}
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.temperature`)} value={x.temperature} min={0} max={100} step={1} unit="°C" onChange={x.setTemperature} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.4, 2.6, 4.4], target: [0, 0.9, 0] }}
      scene={<SolubilityScene sim={x.sim} glass={dark ? '#9fb3d9' : '#a9bad6'} labels={{ temperature: `${fmtInt(x.temperature)} °C`, state: stateLabel }} />}
      fallback2D={<Solubility2D sim={x.sim} label={t('lab.view2d', { name: t('catalog.solubility.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`, { formula: salt.formula })}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ salt: x.salt, temperature: x.temperature }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[3], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.salt`), value: salt.formula },
        { label: t(`${P}.p.temperature`), value: fmtInt(x.temperature), unit: '°C' },
        { label: 'Salt added to 100 g water', value: fmt(x.added, 1), unit: 'g' },
        { label: 'Dissolved', value: fmt(x.dissolved, 1), unit: 'g' },
        { label: 'Solution state', value: x.state },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setTemperature(Math.min(100, x.temperature + 5)),
        decrease: () => x.setTemperature(Math.max(0, x.temperature - 5)),
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
