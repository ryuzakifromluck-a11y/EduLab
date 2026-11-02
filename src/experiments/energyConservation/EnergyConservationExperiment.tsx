import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { bottomSpeed, energyVsPosition } from '../../engines/energyConservation'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Sqrt, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtInt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { GRAVITY_PRESETS, H_MAX, H_MIN, SPEEDS, useEnergyConservation } from './useEnergyConservation'
import { EnergyConservationScene } from './EnergyConservationScene'
import { EnergyConservation2D } from './EnergyConservation2D'
import { applySharedSettings, num } from '../../lib/sharedSettings'

const P = 'exp.energy-conservation'

export default function EnergyConservationExperiment() {
  const { t } = useTranslation()
  const e = useEnergyConservation()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'energy-conservation')!
  const accent = c.physics
  const { height, mass, friction, gravity } = e.params
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const en = e.energies
  const kGreen = '#2fbf71'

  const byPosition = useMemo(() => energyVsPosition(e.params), [e.params])
  const speedCurve = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({ h: (H_MAX * i) / 35, v: bottomSpeed(gravity, (H_MAX * i) / 35) })),
    [gravity],
  )
  const vBottom = bottomSpeed(gravity, height)
  const share = (v: number) => (en.total > 0 ? Math.round((100 * v) / en.total) : 0)

  const measurements: Measurement[] = [
    { id: 'h', label: t(`${P}.m.height`), value: fmt(e.height, 2), unit: 'm', sub: t(`${P}.m.released`, { value: fmt(height, 1) }) },
    { id: 'v', label: t(`${P}.m.speed`), value: fmt(e.v, 2), unit: 'm/s', sub: t(`${P}.m.fastest`, { value: fmt(e.vMax, 2) }) },
    { id: 'ke', label: t(`${P}.m.kinetic`), value: fmtInt(en.kinetic), unit: 'J', sub: `${share(en.kinetic)} %`, tone: 'accent' },
    { id: 'pe', label: t(`${P}.m.potential`), value: fmtInt(en.potential), unit: 'J', sub: `${share(en.potential)} %` },
    {
      id: 'th',
      label: t(`${P}.m.thermal`),
      value: fmtInt(en.thermal),
      unit: 'J',
      sub: t(`${P}.m.total`, { value: fmtInt(en.total) }),
      tone: en.thermal > 1 ? 'warn' : 'default',
    },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'time',
      title: t(`${P}.chart.time`),
      data: e.log,
      caption: t(`${P}.chart.timeCaption`),
      render: (d: typeof e.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis width={60} tickFormatter={(v) => fmtInt(v)} label={L.y(t(`${P}.axis.energy`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 2)} s`} formatter={(v, n) => [`${fmtInt(Number(v))} J`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="kinetic" name={t(`${P}.kinetic`)} stroke={kGreen} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="potential" name={t(`${P}.potential`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="thermal" name={t(`${P}.thermal`)} stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="total" name={t(`${P}.chart.total`)} stroke={c.marker} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-energy-conservation',
        headers: ['t_s', 'kinetic_J', 'potential_J', 'thermal_J', 'total_J'],
        rows: e.log.map((s) => [s.t, s.kinetic, s.potential, s.thermal, s.total]),
      }),
    },
    {
      id: 'position',
      title: t(`${P}.chart.position`),
      data: byPosition,
      caption: t(`${P}.chart.positionCaption`),
      render: (d: typeof byPosition) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={[-4, 4]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.x`))} {...axisProps(c)} />
            <YAxis width={60} tickFormatter={(v) => fmtInt(v)} label={L.y(t(`${P}.axis.energy`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `x = ${fmt(Number(v), 2)} m`} formatter={(v, n) => [`${fmtInt(Number(v))} J`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="potential" name={t(`${P}.potential`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="kinetic" name={t(`${P}.chart.kineticNoFriction`)} stroke={kGreen} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line dataKey="total" name={t(`${P}.chart.total`)} stroke={c.marker} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <ReferenceDot x={e.x} y={en.kinetic} r={6} fill={kGreen} stroke={c.marker} strokeWidth={2} />
            <ReferenceDot x={e.x} y={en.potential} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-energy-vs-position', headers: ['x_m', 'potential_J', 'kinetic_J'], rows: byPosition.map((r) => [r.x, r.potential, r.kinetic ?? '']) }),
    },
    {
      id: 'speed',
      title: t(`${P}.chart.speed`),
      data: speedCurve,
      caption: t(`${P}.chart.speedCaption`),
      render: (d: typeof speedCurve) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="h" type="number" domain={[0, H_MAX]} tickFormatter={(v) => fmt(v, 1)} label={L.x(t(`${P}.axis.release`))} {...axisProps(c)} />
            <YAxis width={56} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.speed`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `h₀ = ${fmt(Number(v), 2)} m`} formatter={(v) => [`${fmt(Number(v), 2)} m/s`, 'v']} />
            <Line dataKey="v" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={height} y={vBottom} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-bottom-speed', headers: ['release_height_m', 'bottom_speed_m_per_s'], rows: speedCurve.map((r) => [r.h, r.v]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'conservation',
      title: t(`${P}.f.conservationTitle`),
      expression: (
        <>
          <V>E</V><Sub>k</Sub> + <V>E</V><Sub>p</Sub> + <V>Q</V> = <V>m</V><V>g</V><V>h</V><Sub>0</Sub>
        </>
      ),
      substituted: (
        <>
          {fmtInt(en.kinetic)} J + {fmtInt(en.potential)} J + {fmtInt(en.thermal)} J = <b>{fmtInt(en.total)} J</b>
        </>
      ),
      variables: [
        { symbol: <><V>E</V><Sub>k</Sub></>, name: t(`${P}.kinetic`), unit: 'J', value: fmtInt(en.kinetic) },
        { symbol: <><V>E</V><Sub>p</Sub></>, name: t(`${P}.potential`), unit: 'J', value: fmtInt(en.potential) },
        { symbol: <V>Q</V>, name: t(`${P}.thermal`), unit: 'J', value: fmtInt(en.thermal), effect: t(`${P}.f.Qeffect`) },
        { symbol: <><V>h</V><Sub>0</Sub></>, name: t(`${P}.f.h0`), unit: 'm', value: fmt(height, 2) },
      ],
      explanation: t(`${P}.f.conservationExplain`),
    },
    {
      id: 'kinetic',
      title: t(`${P}.f.kineticTitle`),
      expression: (
        <>
          <V>E</V><Sub>k</Sub> = ½<V>m</V><V>v</V><Sup>2</Sup>
        </>
      ),
      substituted: (
        <>
          ½ × {fmtInt(mass)} kg × ({fmt(e.v, 2)} m/s)² = <b>{fmtInt(en.kinetic)} J</b>
        </>
      ),
      variables: [
        { symbol: <V>m</V>, name: t(`${P}.f.m`), unit: 'kg', value: fmtInt(mass), effect: t(`${P}.f.mEffect`) },
        { symbol: <V>v</V>, name: t(`${P}.f.v`), unit: 'm/s', value: fmt(e.v, 2), effect: t(`${P}.f.vEffect`) },
      ],
      explanation: t(`${P}.f.kineticExplain`),
    },
    {
      id: 'potential',
      title: t(`${P}.f.potentialTitle`),
      expression: (
        <>
          <V>E</V><Sub>p</Sub> = <V>m</V><V>g</V><V>h</V>
        </>
      ),
      substituted: (
        <>
          {fmtInt(mass)} kg × {fmt(gravity, 2)} m/s² × {fmt(e.height, 2)} m = <b>{fmtInt(en.potential)} J</b>
        </>
      ),
      variables: [
        { symbol: <V>g</V>, name: t(`${P}.f.g`), unit: 'm/s²', value: fmt(gravity, 2) },
        { symbol: <V>h</V>, name: t(`${P}.f.h`), unit: 'm', value: fmt(e.height, 2) },
      ],
      explanation: t(`${P}.f.potentialExplain`),
    },
    {
      id: 'speed',
      title: t(`${P}.f.speedTitle`),
      expression: (
        <>
          <V>v</V> = <Sqrt>2<V>g</V>(<V>h</V><Sub>0</Sub> − <V>h</V>)</Sqrt>
        </>
      ),
      substituted: (
        <>
          √(2 × {fmt(gravity, 2)} × {fmt(height, 2)}) = <b>{fmt(vBottom, 2)} m/s</b> ({t(`${P}.f.atBottom`)})
        </>
      ),
      variables: [
        { symbol: <V>v</V>, name: t(`${P}.f.vBottom`), unit: 'm/s', value: fmt(vBottom, 2) },
        { symbol: <><V>h</V><Sub>0</Sub></>, name: t(`${P}.f.h0`), unit: 'm', value: fmt(height, 2) },
      ],
      explanation: t(`${P}.f.speedExplain`),
    },
  ]

  const gravityPresets = (large = false) => (
    <Segmented
      label={t(`${P}.gravity`)}
      value={GRAVITY_PRESETS.find((g) => g.g === gravity)?.id ?? 'earth'}
      onChange={(id) => e.setGravity(GRAVITY_PRESETS.find((g) => g.id === id)!.g)}
      options={GRAVITY_PRESETS.map((g) => ({ value: g.id, label: t(`${P}.planets.${g.id}`) }))}
      size={large ? 'lg' : 'md'}
    />
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.height`)} value={height} min={H_MIN} max={H_MAX} step={0.1} unit="m" onChange={e.setHeight} format={(v) => fmt(v, 1)} hint={t(`${P}.p.heightHint`)} accent={accent} />
      <ParamSlider label={t(`${P}.p.mass`)} value={mass} min={10} max={100} step={5} unit="kg" onChange={e.setMass} accent={accent} />
      <ParamSlider label={t(`${P}.p.friction`)} value={friction} min={0} max={0.5} step={0.01} unit="s⁻¹" onChange={e.setFriction} format={(v) => fmt(v, 2)} hint={t(`${P}.p.frictionHint`)} accent={accent} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.gravity`)}</span>
        {gravityPresets()}
      </div>
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.height`)} value={height} min={H_MIN} max={H_MAX} step={0.1} unit="m" onChange={e.setHeight} format={(v) => fmt(v, 1)} accent={accent} />
      </div>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.friction`)} value={friction} min={0} max={0.5} step={0.01} unit="s⁻¹" onChange={e.setFriction} format={(v) => fmt(v, 2)} accent={accent} />
      </div>
      {gravityPresets(true)}
    </>
  )

  const names: [string, string, string] = [t(`${P}.short.kinetic`), t(`${P}.short.potential`), t(`${P}.short.thermal`)]

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.6, 2.2, 6.4], target: [0.5, 1.1, 0] }}
      scene={<EnergyConservationScene sim={e.sim} labels={{ kinetic: names[0], potential: names[1], thermal: names[2], release: t(`${P}.releaseLine`) }} />}
      fallback2D={<EnergyConservation2D sim={e.sim} label={t('lab.view2d', { name: t('catalog.energy-conservation.title') })} names={names} />}
      controls={{ running: e.running, onTogglePlay: e.togglePlay, onReset: e.reset, speed: e.speed, speeds: SPEEDS, onSpeed: e.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      applySettings={(s) =>
        applySharedSettings(s, {
          height: num(height, H_MIN, H_MAX, e.setHeight),
          mass: num(mass, 10, 100, e.setMass),
          friction: num(friction, 0, 0.5, e.setFriction),
          gravity: num(gravity, 0.5, 25, e.setGravity),
        })
      }
      progressSettings={{ height, mass, friction, gravity }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[1], measurements[2], measurements[3], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.height`), value: fmt(height, 1), unit: 'm' },
        { label: t(`${P}.p.mass`), value: fmtInt(mass), unit: 'kg' },
        { label: t(`${P}.p.friction`), value: fmt(friction, 2), unit: '1/s' },
        { label: t(`${P}.gravity`), value: fmt(gravity, 2), unit: 'm/s²' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: e.running,
        togglePlay: e.togglePlay,
        reset: e.reset,
        increase: () => e.setHeight(Math.min(H_MAX, +(height + 0.1).toFixed(1))),
        decrease: () => e.setHeight(Math.max(H_MIN, +(height - 0.1).toFixed(1))),
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
