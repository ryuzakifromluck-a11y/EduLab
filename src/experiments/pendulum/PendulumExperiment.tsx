import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, Legend, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { periodVsLength, radToDeg } from '../../engines/pendulum'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sqrt, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtInt } from '../../lib/format'
import { GRAVITY_PRESETS, SPEEDS, usePendulum } from './usePendulum'
import { PendulumScene } from './PendulumScene'
import { Pendulum2D } from './Pendulum2D'
import { clsx } from 'clsx'

const LENGTHS = Array.from({ length: 30 }, (_, i) => +(0.1 + i * 0.1).toFixed(2))

export default function PendulumExperiment() {
  const { t } = useTranslation()
  const p = usePendulum()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'pendulum')!
  const accent = c.physics

  const periodCurve = useMemo(
    () => periodVsLength(p.gravity, (p.angleDeg * Math.PI) / 180, LENGTHS),
    [p.gravity, p.angleDeg],
  )

  const measurements: Measurement[] = [
    { id: 'angle', label: t('exp.pendulum.m.angle'), value: fmt(radToDeg(p.theta), 1), unit: '°' },
    { id: 'omega', label: t('exp.pendulum.m.omega'), value: fmt(p.omega, 2), unit: 'rad/s' },
    {
      id: 'period',
      label: t('exp.pendulum.m.period'),
      value: fmt(p.exactPeriod, 3),
      unit: 's',
      tone: 'accent',
      sub: p.measuredPeriod
        ? t('exp.pendulum.m.measured', { value: fmt(p.measuredPeriod, 3) })
        : t('exp.pendulum.m.measuring'),
    },
    { id: 'freq', label: t('exp.pendulum.m.frequency'), value: fmt(p.frequency, 3), unit: 'Hz' },
    {
      id: 'osc',
      label: t('exp.pendulum.m.oscillations'),
      value: fmtInt(p.oscillations),
      sub: t('exp.pendulum.m.elapsed', { value: fmt(p.time, 1) }),
    },
  ]

  const ttip = tooltipProps(c)
  const timeSeries = (key: 'thetaDeg' | 'omega', unit: string, name: string) => (data: typeof p.windowData) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
        <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v) => fmt(v, 1)}
          label={{ value: t('exp.pendulum.axis.time'), position: 'insideBottom', offset: -10, fill: c.text, fontSize: 12 }}
          {...axisProps(c)}
        />
        <YAxis
          width={56}
          tickFormatter={(v) => fmt(v, key === 'omega' ? 1 : 0)}
          label={{ value: `${name} (${unit})`, angle: -90, position: 'insideLeft', offset: 12, fill: c.text, fontSize: 12, style: { textAnchor: 'middle' } }}
          {...axisProps(c)}
        />
        <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 2)} s`} formatter={(v) => [`${fmt(Number(v), 2)} ${unit}`, name]} />
        <Line type="monotone" dataKey={key} name={name} stroke={key === 'omega' ? c.accent2 : accent} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )

  const csvTime = () => ({
    filename: 'edulab-pendulum-time-series',
    headers: ['time_s', 'angle_deg', 'angular_velocity_rad_per_s'],
    rows: p.fullLog.current.map((r) => [r.t, r.thetaDeg, r.omega]),
  })

  const charts: ChartDef<any>[] = [
    {
      id: 'angle',
      title: t('exp.pendulum.chart.angle'),
      data: p.windowData,
      render: timeSeries('thetaDeg', '°', t('exp.pendulum.axis.angle')),
      csv: csvTime,
    },
    {
      id: 'omega',
      title: t('exp.pendulum.chart.omega'),
      data: p.windowData,
      render: timeSeries('omega', 'rad/s', t('exp.pendulum.axis.omega')),
      csv: csvTime,
    },
    {
      id: 'periodLength',
      title: t('exp.pendulum.chart.periodLength'),
      data: periodCurve,
      caption: t('exp.pendulum.chart.periodLengthCaption'),
      render: (data: typeof periodCurve) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis
              dataKey="length"
              type="number"
              domain={[0, 3]}
              tickFormatter={(v) => fmt(v, 1)}
              label={{ value: t('exp.pendulum.axis.length'), position: 'insideBottom', offset: -10, fill: c.text, fontSize: 12 }}
              {...axisProps(c)}
            />
            <YAxis
              width={56}
              tickFormatter={(v) => fmt(v, 1)}
              label={{ value: t('exp.pendulum.axis.period'), angle: -90, position: 'insideLeft', offset: 12, fill: c.text, fontSize: 12, style: { textAnchor: 'middle' } }}
              {...axisProps(c)}
            />
            <Tooltip {...ttip} labelFormatter={(v) => `L = ${fmt(Number(v), 2)} m`} formatter={(v, n) => [`${fmt(Number(v), 3)} s`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: c.text }} />
            <Line dataKey="exact" name={t('exp.pendulum.chart.exact')} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="smallAngle" name={t('exp.pendulum.chart.smallAngle')} stroke={c.accent2} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={p.length} y={p.exactPeriod} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-pendulum-period-vs-length',
        headers: ['length_m', 'period_small_angle_s', 'period_exact_s'],
        rows: periodCurve.map((r) => [r.length, r.smallAngle, r.exact]),
      }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'period',
      title: t('exp.pendulum.f.periodTitle'),
      expression: (
        <>
          <V>T</V><Sub>0</Sub> = 2π <Sqrt><Frac n={<V>L</V>} d={<V>g</V>} /></Sqrt>
        </>
      ),
      substituted: (
        <>
          2π √({fmt(p.length, 2)} / {fmt(p.gravity, 2)}) = <b>{fmt(p.smallAnglePeriod, 3)} s</b>
        </>
      ),
      variables: [
        { symbol: <><V>T</V><Sub>0</Sub></>, name: t('exp.pendulum.f.T0'), unit: 's', value: fmt(p.smallAnglePeriod, 3), effect: t('exp.pendulum.f.T0effect') },
        { symbol: <V>L</V>, name: t('exp.pendulum.f.L'), unit: 'm', value: fmt(p.length, 2), effect: t('exp.pendulum.f.Leffect') },
        { symbol: <V>g</V>, name: t('exp.pendulum.f.g'), unit: 'm/s²', value: fmt(p.gravity, 2), effect: t('exp.pendulum.f.geffect') },
      ],
      explanation: t('exp.pendulum.f.periodExplain', { err: fmt(p.smallAngleError, 2) }),
    },
    {
      id: 'nonlinear',
      title: t('exp.pendulum.f.nonlinearTitle'),
      expression: (
        <>
          <V>θ″</V> = −<Frac n={<V>g</V>} d={<V>L</V>} /> sin <V>θ</V>
        </>
      ),
      substituted: (
        <>
          −({fmt(p.gravity, 2)} / {fmt(p.length, 2)}) · sin({fmt(radToDeg(p.theta), 1)}°) ={' '}
          <b>{fmt((-p.gravity / p.length) * Math.sin(p.theta), 2)} rad/s²</b>
        </>
      ),
      variables: [
        { symbol: <V>θ</V>, name: t('exp.pendulum.f.theta'), unit: 'rad', value: fmt(p.theta, 3) },
        { symbol: <V>ω</V>, name: t('exp.pendulum.f.omega'), unit: 'rad/s', value: fmt(p.omega, 3) },
        { symbol: <V>θ₀</V>, name: t('exp.pendulum.f.theta0'), unit: '°', value: fmt(p.angleDeg, 0), effect: t('exp.pendulum.f.theta0effect') },
        { symbol: <V>T</V>, name: t('exp.pendulum.f.Texact'), unit: 's', value: fmt(p.exactPeriod, 3) },
      ],
      explanation: t('exp.pendulum.f.nonlinearExplain'),
    },
    {
      id: 'frequency',
      title: t('exp.pendulum.f.freqTitle'),
      expression: (
        <>
          <V>f</V> = <Frac n="1" d={<V>T</V>} />
        </>
      ),
      substituted: (
        <>
          1 / {fmt(p.exactPeriod, 3)} = <b>{fmt(p.frequency, 3)} Hz</b>
        </>
      ),
      variables: [
        { symbol: <V>f</V>, name: t('exp.pendulum.f.f'), unit: 'Hz', value: fmt(p.frequency, 3) },
        { symbol: <V>T</V>, name: t('exp.pendulum.f.Texact'), unit: 's', value: fmt(p.exactPeriod, 3) },
      ],
      explanation: t('exp.pendulum.f.freqExplain'),
    },
  ]

  const smallAngleNote = (
    <div
      role="status"
      className={clsx(
        'rounded-xl px-4 py-3 text-xs leading-relaxed',
        p.smallAngleValid ? 'bg-chemistry-soft text-chemistry-ink' : 'bg-warn-soft text-warn',
      )}
    >
      {p.smallAngleValid
        ? t('exp.pendulum.smallAngleOk', { err: fmt(p.smallAngleError, 2) })
        : t('exp.pendulum.smallAngleNo', { err: fmt(p.smallAngleError, 1) })}
    </div>
  )

  const gravityPresets = (large = false) => (
    <Segmented
      label={t('exp.pendulum.gravityPreset')}
      value={GRAVITY_PRESETS.find((g) => g.g === p.gravity)?.id ?? 'custom'}
      onChange={(id) => {
        const preset = GRAVITY_PRESETS.find((g) => g.id === id)
        if (preset) p.setGravity(preset.g)
      }}
      size={large ? 'lg' : 'md'}
      options={GRAVITY_PRESETS.map((g) => ({ value: g.id, label: t(`exp.pendulum.planets.${g.id}`) }))}
    />
  )

  const controls = (
    <>
      <ParamSlider label={t('exp.pendulum.p.length')} value={p.length} min={0.2} max={3} step={0.01} unit="m" onChange={p.setLength} format={(v) => fmt(v, 2)} accent={accent} />
      <ParamSlider
        label={t('exp.pendulum.p.angle')}
        value={p.angleDeg}
        min={1}
        max={170}
        step={1}
        unit="°"
        onChange={p.setAngle}
        accent={accent}
        hint={t('exp.pendulum.p.angleHint')}
      />
      <div className="flex flex-col gap-2">
        <ParamSlider label={t('exp.pendulum.p.gravity')} value={p.gravity} min={0.5} max={25} step={0.01} unit="m/s²" onChange={p.setGravity} format={(v) => fmt(v, 2)} accent={accent} />
        {gravityPresets()}
      </div>
      <Toggle label={t('exp.pendulum.p.trail')} checked={p.trail} onChange={p.setTrail} />
      {smallAngleNote}
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[260px] flex-1">
        <ParamSlider large label={t('exp.pendulum.p.length')} value={p.length} min={0.2} max={3} step={0.01} unit="m" onChange={p.setLength} format={(v) => fmt(v, 2)} accent={accent} />
      </div>
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t('exp.pendulum.p.angle')} value={p.angleDeg} min={1} max={170} step={1} unit="°" onChange={p.setAngle} accent={accent} />
      </div>
      {gravityPresets(true)}
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 2.6, 5.6], target: [0, 2.3, 0] }}
      scene={<PendulumScene sim={p.sim} trail={p.trail} accent={accent} />}
      fallback2D={<Pendulum2D sim={p.sim} accent={accent} />}
      controls={{ running: p.running, onTogglePlay: p.togglePlay, onReset: p.reset, speed: p.speed, speeds: SPEEDS, onSpeed: p.setSpeed }}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ length: p.length, angleDeg: p.angleDeg, gravity: p.gravity }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      tutorParams={[
        { label: t('exp.pendulum.p.length'), value: fmt(p.length, 2), unit: 'm' },
        { label: t('exp.pendulum.p.angle'), value: fmt(p.angleDeg, 0), unit: '°' },
        { label: t('exp.pendulum.p.gravity'), value: fmt(p.gravity, 2), unit: 'm/s²' },
        { label: 'Small-angle period T₀', value: fmt(p.smallAnglePeriod, 3), unit: 's' },
        { label: 'Small-angle error', value: fmt(p.smallAngleError, 2), unit: '%' },
      ]}
      presenterMeasurements={[measurements[0], measurements[2], measurements[3], measurements[4]]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(p.windowData)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: p.running,
        togglePlay: p.togglePlay,
        reset: p.reset,
        increase: () => p.setLength(Math.min(3, +(p.length + 0.1).toFixed(2))),
        decrease: () => p.setLength(Math.max(0.2, +(p.length - 0.1).toFixed(2))),
      }}
      guide={{
        instructions: [1, 2, 3, 4, 5].map((i) => t(`exp.pendulum.guide.step${i}`)),
        science: (
          <>
            <p>{t('exp.pendulum.guide.science1')}</p>
            <p>{t('exp.pendulum.guide.science2')}</p>
            <p>
              <Trans i18nKey="exp.pendulum.guide.science3" components={{ b: <b className="text-ink" /> }} />
            </p>
          </>
        ),
        conclusions: (
          <>
            <p>{t('exp.pendulum.guide.conclusion1')}</p>
            <p>{t('exp.pendulum.guide.conclusion2')}</p>
            <p>{t('exp.pendulum.guide.conclusion3')}</p>
          </>
        ),
        model: t('exp.pendulum.guide.model'),
      }}
    />
  )
}
