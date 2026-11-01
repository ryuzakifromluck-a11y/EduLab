import { Rocket, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { rangeVsAngle } from '../../engines/projectile'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sqrt, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt } from '../../lib/format'
import { GRAVITY_PRESETS, SPEEDS, useProjectile } from './useProjectile'
import { ProjectileScene } from './ProjectileScene'
import { Projectile2D } from './Projectile2D'

const P = 'exp.projectile-motion'

export default function ProjectileExperiment() {
  const { t } = useTranslation()
  const p = useProjectile()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'projectile-motion')!
  const accent = c.physics
  const pred = p.prediction

  const angleCurve = useMemo(() => rangeVsAngle(p.params, p.params.drag > 0 ? 2 : 1), [p.params])
  // Only shots fired with the current speed, height, gravity and drag belong on the range-vs-angle curve.
  const matchingShots = p.shots.filter(
    (s) => s.speed === p.speed && s.height === p.height && s.gravity === p.gravity && s.drag === p.airResistance,
  )

  const measurements: Measurement[] = [
    { id: 'time', label: t(`${P}.m.time`), value: fmt(p.time, 2), unit: 's', sub: p.landed ? t(`${P}.m.landed`) : p.running ? t(`${P}.m.flying`) : t(`${P}.m.ready`) },
    { id: 'x', label: t(`${P}.m.x`), value: fmt(p.x, 2), unit: 'm' },
    { id: 'y', label: t(`${P}.m.y`), value: fmt(p.y, 2), unit: 'm', sub: t(`${P}.m.peak`, { value: fmt(p.peak, 2) }) },
    {
      id: 'v',
      label: t(`${P}.m.speed`),
      value: fmt(p.velocity, 2),
      unit: 'm/s',
      sub: `vₓ ${fmt(p.vx, 1)} · v_y ${fmt(p.vy, 1)}`,
    },
    {
      id: 'range',
      label: t(`${P}.m.range`),
      value: fmt(pred.range, 2),
      unit: 'm',
      tone: 'accent',
      sub: t(`${P}.m.prediction`, { h: fmt(pred.maxHeight, 2), t: fmt(pred.flightTime, 2) }),
    },
  ]

  const ttip = tooltipProps(c)
  const xLabel = (value: string) => ({ value, position: 'insideBottom' as const, offset: -10, fill: c.text, fontSize: 12 })
  const yLabel = (value: string) => ({ value, angle: -90, position: 'insideLeft' as const, offset: 12, fill: c.text, fontSize: 12, style: { textAnchor: 'middle' as const } })
  const xMax = Math.max(pred.range, p.x, 0.5)
  const yMax = Math.max(pred.maxHeight, p.peak, 0.5)

  const charts: ChartDef<any>[] = [
    {
      id: 'trajectory',
      title: t(`${P}.chart.trajectory`),
      data: p.path,
      caption: t(`${P}.chart.trajectoryCaption`),
      render: (data: typeof p.path) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={[0, +(xMax * 1.05).toPrecision(3)]} tickFormatter={(v) => fmt(v, 0)} label={xLabel(t(`${P}.axis.x`))} {...axisProps(c)} />
            <YAxis dataKey="y" type="number" domain={[0, +(yMax * 1.1).toPrecision(3)]} width={56} tickFormatter={(v) => fmt(v, 1)} label={yLabel(t(`${P}.axis.y`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `x = ${fmt(Number(v), 2)} m`} formatter={(v, n) => [`${fmt(Number(v), 2)} m`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: c.text }} />
            <Line data={pred.path} dataKey="y" name={t(`${P}.chart.predicted`)} stroke={c.accent2} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line data={data} dataKey="y" name={t(`${P}.chart.yourFlight`)} stroke={accent} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-projectile-flight',
        headers: ['time_s', 'x_m', 'y_m', 'vx_m_per_s', 'vy_m_per_s'],
        rows: p.fullLog.current.map((r) => [r.t, r.x, r.y, r.vx, r.vy]),
      }),
    },
    {
      id: 'velocity',
      title: t(`${P}.chart.velocity`),
      data: p.path,
      caption: t(`${P}.chart.velocityCaption`),
      render: (data: typeof p.path) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, +Math.max(pred.flightTime, p.time, 0.1).toPrecision(3)]} tickFormatter={(v) => fmt(v, 1)} label={xLabel(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis width={56} tickFormatter={(v) => fmt(v, 0)} label={yLabel(t(`${P}.axis.velocity`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 2)} s`} formatter={(v, n) => [`${fmt(Number(v), 2)} m/s`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: c.text }} />
            <Line dataKey="vx" name={t(`${P}.chart.vx`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="vy" name={t(`${P}.chart.vy`)} stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-projectile-velocity',
        headers: ['time_s', 'vx_m_per_s', 'vy_m_per_s'],
        rows: p.fullLog.current.map((r) => [r.t, r.vx, r.vy]),
      }),
    },
    {
      id: 'rangeAngle',
      title: t(`${P}.chart.rangeAngle`),
      data: { curve: angleCurve, shots: matchingShots },
      caption: t(`${P}.chart.rangeAngleCaption`),
      render: (d: { curve: typeof angleCurve; shots: typeof matchingShots }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="angle" type="number" domain={[0, 90]} ticks={[0, 15, 30, 45, 60, 75, 90]} label={xLabel(t(`${P}.axis.angle`))} {...axisProps(c)} />
            <YAxis dataKey="range" type="number" width={56} tickFormatter={(v) => fmt(v, 0)} label={yLabel(t(`${P}.axis.range`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `θ = ${fmt(Number(v), 0)}°`} formatter={(v, n) => [`${fmt(Number(v), 2)} m`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: c.text }} />
            <Line data={d.curve} dataKey="range" name={t(`${P}.chart.theory`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.shots.map((s) => ({ angle: s.angleDeg, range: s.range }))} dataKey="range" name={t(`${P}.chart.yourShots`)} fill={c.accent2} isAnimationActive={false} />
            <ReferenceDot x={p.angleDeg} y={pred.range} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-projectile-shots',
        headers: ['shot', 'speed_m_per_s', 'angle_deg', 'height_m', 'gravity_m_per_s2', 'air_resistance', 'range_m', 'max_height_m', 'flight_time_s'],
        rows: p.shots.map((s) => [s.n, s.speed, s.angleDeg, s.height, s.gravity, s.drag ? 'yes' : 'no', s.range, s.maxHeight, s.flightTime]),
      }),
    },
  ]

  const v0 = <><V>v</V><Sub>0</Sub></>
  const h0 = <><V>h</V><Sub>0</Sub></>
  const vy0 = p.speed * Math.sin((p.angleDeg * Math.PI) / 180)
  const vx0 = p.speed * Math.cos((p.angleDeg * Math.PI) / 180)
  const dragNote = p.airResistance ? ` ${t(`${P}.f.dragNote`)}` : ''
  const varsCommon = [
    { symbol: v0, name: t(`${P}.f.v0`), unit: 'm/s', value: fmt(p.speed, 1), effect: t(`${P}.f.v0effect`) },
    { symbol: <V>θ</V>, name: t(`${P}.f.theta`), unit: '°', value: fmt(p.angleDeg, 0), effect: t(`${P}.f.thetaEffect`) },
    { symbol: <V>g</V>, name: t(`${P}.f.g`), unit: 'm/s²', value: fmt(p.gravity, 2), effect: t(`${P}.f.gEffect`) },
  ]
  const noDrag = {
    tf: (vy0 + Math.sqrt(vy0 * vy0 + 2 * p.gravity * p.height)) / p.gravity,
    H: p.height + (vy0 > 0 ? (vy0 * vy0) / (2 * p.gravity) : 0),
  }

  const formulas: Formula[] = [
    {
      id: 'range',
      title: t(`${P}.f.rangeTitle`),
      expression: (
        <>
          <V>R</V> = <Frac n={<>{v0}<Sup>2</Sup> sin 2<V>θ</V></>} d={<V>g</V>} /> <span className="text-muted">({h0} = 0)</span>
        </>
      ),
      substituted: (
        <>
          {fmt(vx0, 2)} m/s × {fmt(noDrag.tf, 2)} s = <b>{fmt(vx0 * noDrag.tf, 2)} m</b>
        </>
      ),
      variables: [...varsCommon, { symbol: <V>R</V>, name: t(`${P}.f.R`), unit: 'm', value: fmt(vx0 * noDrag.tf, 2) }],
      explanation: t(`${P}.f.rangeExplain`, { best: fmt(p.optimalAngle, 1) }) + dragNote,
    },
    {
      id: 'time',
      title: t(`${P}.f.timeTitle`),
      expression: (
        <>
          <V>t</V><Sub>f</Sub> = <Frac n={<>{v0} sin <V>θ</V> + <Sqrt>({v0} sin <V>θ</V>)<Sup>2</Sup> + 2<V>g</V>{h0}</Sqrt></>} d={<V>g</V>} />
        </>
      ),
      substituted: (
        <>
          ({fmt(vy0, 2)} + √({fmt(vy0, 2)}² + 2 × {fmt(p.gravity, 2)} × {fmt(p.height, 1)})) / {fmt(p.gravity, 2)} = <b>{fmt(noDrag.tf, 2)} s</b>
        </>
      ),
      variables: [
        ...varsCommon,
        { symbol: h0, name: t(`${P}.f.h0`), unit: 'm', value: fmt(p.height, 1), effect: t(`${P}.f.h0effect`) },
        { symbol: <><V>t</V><Sub>f</Sub></>, name: t(`${P}.f.tf`), unit: 's', value: fmt(noDrag.tf, 2) },
      ],
      explanation: t(`${P}.f.timeExplain`) + dragNote,
    },
    {
      id: 'height',
      title: t(`${P}.f.heightTitle`),
      expression: (
        <>
          <V>H</V> = {h0} + <Frac n={<>({v0} sin <V>θ</V>)<Sup>2</Sup></>} d={<>2<V>g</V></>} />
        </>
      ),
      substituted: (
        <>
          {fmt(p.height, 1)} + {fmt(Math.max(0, vy0), 2)}² / (2 × {fmt(p.gravity, 2)}) = <b>{fmt(noDrag.H, 2)} m</b>
        </>
      ),
      variables: [
        varsCommon[0],
        varsCommon[1],
        varsCommon[2],
        { symbol: h0, name: t(`${P}.f.h0`), unit: 'm', value: fmt(p.height, 1) },
        { symbol: <V>H</V>, name: t(`${P}.f.H`), unit: 'm', value: fmt(noDrag.H, 2) },
      ],
      explanation: t(`${P}.f.heightExplain`) + dragNote,
    },
    {
      id: 'components',
      title: t(`${P}.f.componentsTitle`),
      expression: (
        <>
          <V>x</V> = {v0} cos <V>θ</V> · <V>t</V>, <V>y</V> = {h0} + {v0} sin <V>θ</V> · <V>t</V> − ½<V>g</V><V>t</V><Sup>2</Sup>
        </>
      ),
      substituted: (
        <>
          <V>t</V> = {fmt(p.time, 2)} s → <b>x = {fmt(p.x, 2)} m, y = {fmt(p.y, 2)} m</b>
        </>
      ),
      variables: [
        { symbol: <><V>v</V><Sub>x</Sub></>, name: t(`${P}.f.vx`), unit: 'm/s', value: fmt(p.vx, 2) },
        { symbol: <><V>v</V><Sub>y</Sub></>, name: t(`${P}.f.vy`), unit: 'm/s', value: fmt(p.vy, 2) },
      ],
      explanation: t(`${P}.f.componentsExplain`) + dragNote,
    },
  ]

  const gravityPresets = (large = false) => (
    <Segmented
      label={t(`${P}.gravityPreset`)}
      value={GRAVITY_PRESETS.find((g) => g.g === p.gravity)?.id ?? 'custom'}
      onChange={(id) => {
        const preset = GRAVITY_PRESETS.find((g) => g.id === id)
        if (preset) p.setGravity(preset.g)
      }}
      size={large ? 'lg' : 'md'}
      options={GRAVITY_PRESETS.map((g) => ({ value: g.id, label: t(`${P}.planets.${g.id}`) }))}
    />
  )

  const launchButton = (large = false) => (
    <Button variant="primary" onClick={p.togglePlay} className={large ? 'h-16 px-6 text-xl' : 'w-full'}>
      <Rocket className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
      {p.running ? t('lab.pause') : p.time > 0 && !p.landed ? t(`${P}.resume`) : t(`${P}.launch`)}
    </Button>
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.speed`)} value={p.speed} min={1} max={40} step={0.5} unit="m/s" onChange={p.setSpeed} format={(v) => fmt(v, 1)} accent={accent} />
      <ParamSlider label={t(`${P}.p.angle`)} value={p.angleDeg} min={0} max={90} step={1} unit="°" onChange={p.setAngle} accent={accent} hint={t(`${P}.p.angleHint`)} />
      <ParamSlider label={t(`${P}.p.height`)} value={p.height} min={0} max={30} step={0.5} unit="m" onChange={p.setHeight} format={(v) => fmt(v, 1)} accent={accent} />
      <div className="flex flex-col gap-2">
        <ParamSlider label={t(`${P}.p.gravity`)} value={p.gravity} min={0.5} max={25} step={0.01} unit="m/s²" onChange={p.setGravity} format={(v) => fmt(v, 2)} accent={accent} />
        {gravityPresets()}
      </div>
      <Toggle label={t(`${P}.p.air`)} description={t(`${P}.p.airHint`)} checked={p.airResistance} onChange={p.setAirResistance} />
      <Toggle label={t(`${P}.p.prediction`)} checked={p.showPrediction} onChange={p.setShowPrediction} />
      {launchButton()}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2 text-xs text-muted">
        <span>{t(`${P}.shots`, { count: p.shots.length })}</span>
        <Button variant="subtle" onClick={p.clearShots} disabled={p.shots.length === 0} className="h-8 px-2 text-xs">
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {t(`${P}.clearShots`)}
        </Button>
      </div>
    </>
  )

  const presenterControls = (
    <>
      {launchButton(true)}
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.speed`)} value={p.speed} min={1} max={40} step={0.5} unit="m/s" onChange={p.setSpeed} format={(v) => fmt(v, 1)} accent={accent} />
      </div>
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t(`${P}.p.angle`)} value={p.angleDeg} min={0} max={90} step={1} unit="°" onChange={p.setAngle} accent={accent} />
      </div>
      {gravityPresets(true)}
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [4, 2.6, 9.6], target: [4, 2.0, 0] }}
      scene={
        <ProjectileScene
          sim={p.sim}
          prediction={pred}
          showPrediction={p.showPrediction}
          accent={accent}
          labels={{ range: `R = ${fmt(pred.range, 2)} m`, height: `H = ${fmt(pred.maxHeight, 2)} m` }}
        />
      }
      fallback2D={<Projectile2D sim={p.sim} log={p.fullLog} prediction={pred} showPrediction={p.showPrediction} accent={accent} />}
      controls={{ running: p.running, onTogglePlay: p.togglePlay, onReset: p.reset, speed: p.simSpeed, speeds: SPEEDS, onSpeed: p.setSimSpeed }}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ speed: p.speed, angleDeg: p.angleDeg, height: p.height, gravity: p.gravity, airResistance: p.airResistance }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      tutorParams={[
        { label: t(`${P}.p.speed`), value: fmt(p.speed, 1), unit: 'm/s' },
        { label: t(`${P}.p.angle`), value: fmt(p.angleDeg, 0), unit: '°' },
        { label: t(`${P}.p.height`), value: fmt(p.height, 1), unit: 'm' },
        { label: t(`${P}.p.gravity`), value: fmt(p.gravity, 2), unit: 'm/s²' },
        { label: t(`${P}.p.air`), value: p.airResistance ? t('common.on') : t('common.off') },
      ]}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(p.path)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: p.running,
        togglePlay: p.togglePlay,
        reset: p.reset,
        increase: () => p.setAngle(Math.min(90, p.angleDeg + 5)),
        decrease: () => p.setAngle(Math.max(0, p.angleDeg - 5)),
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
