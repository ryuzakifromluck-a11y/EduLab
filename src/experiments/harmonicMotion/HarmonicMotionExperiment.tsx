import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { angularFrequency, energies, periodVsMass, timeSeries, totalEnergy } from '../../engines/harmonicMotion'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sqrt, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { A_MAX, K_MAX, K_MIN, M_MAX, M_MIN, SPEEDS, useHarmonicMotion } from './useHarmonicMotion'
import { HarmonicMotionScene } from './HarmonicMotionScene'
import { HarmonicMotion2D } from './HarmonicMotion2D'
import { applySharedSettings, num } from '../../lib/sharedSettings'

const P = 'exp.simple-harmonic-motion'

export default function HarmonicMotionExperiment() {
  const { t } = useTranslation()
  const h = useHarmonicMotion()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'simple-harmonic-motion')!
  const accent = c.physics
  const { mass, k, amplitude, damping, phaseDeg } = h.params
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const w = angularFrequency(h.params)
  const span = 3 * h.period
  const t0 = Math.max(0, h.t - span)
  // Quantise the window start so the chart only recomputes ~12 times a second.
  const series = useMemo(() => {
    const raw = timeSeries(h.params, t0, span, 240)
    return raw.map((s) => ({
      t: s.t,
      x: s.x / amplitude,
      v: s.v / Math.max(1e-9, h.vMax),
      a: s.a / Math.max(1e-9, h.aMax),
      ...energies(h.params, s),
    }))
  }, [h.params, t0, span, amplitude, h.vMax, h.aMax])
  const tm = useMemo(() => periodVsMass(k, M_MIN, M_MAX), [k])
  const E0 = totalEnergy(h.params)

  const measurements: Measurement[] = [
    { id: 'x', label: t(`${P}.m.x`), value: fmt(h.x * 100, 1), unit: 'cm', sub: t(`${P}.m.amplitude`, { value: fmt(amplitude * 100, 0) }) },
    { id: 'v', label: t(`${P}.m.v`), value: fmt(h.v, 2), unit: 'm/s', sub: t(`${P}.m.max`, { value: fmt(h.vMax, 2), unit: 'm/s' }) },
    { id: 'a', label: t(`${P}.m.a`), value: fmt(h.a, 1), unit: 'm/s²', sub: t(`${P}.m.max`, { value: fmt(h.aMax, 1), unit: 'm/s²' }) },
    { id: 'T', label: t(`${P}.m.period`), value: fmt(h.period, 3), unit: 's', sub: t(`${P}.m.frequency`, { value: fmt(h.frequency, 2) }), tone: 'accent' },
    { id: 'E', label: t(`${P}.m.energy`), value: fmtSig(h.energy.total, 3), unit: 'J', sub: t(`${P}.m.energySub`, { ke: fmtSig(h.energy.kinetic, 2), pe: fmtSig(h.energy.potential, 2) }) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'xva',
      title: t(`${P}.chart.xva`),
      data: series,
      caption: t(`${P}.chart.xvaCaption`),
      render: (d: typeof series) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmt(v, 1)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[-1.05, 1.05]} width={52} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.normalised`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 2)} s`} formatter={(v, n) => [fmt(Number(v), 2), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={0} stroke={c.axis} />
            <Line dataKey="x" name={t(`${P}.chart.x`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="v" name={t(`${P}.chart.v`)} stroke="#2fbf71" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="a" name={t(`${P}.chart.a`)} stroke="#e5484d" strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceLine x={h.t} stroke={c.marker} strokeDasharray="4 4" />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-shm',
        headers: ['t_s', 'x_m', 'v_m_per_s', 'a_m_per_s2'],
        rows: timeSeries(h.params, 0, Math.max(span, h.t), 400).map((s) => [s.t, s.x, s.v, s.a]),
      }),
    },
    {
      id: 'energy',
      title: t(`${P}.chart.energy`),
      data: series,
      caption: t(`${P}.chart.energyCaption`),
      render: (d: typeof series) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmt(v, 1)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis width={60} domain={[0, E0 * 1.05]} tickFormatter={(v) => fmtSig(v, 2)} label={L.y(t(`${P}.axis.energy`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 2)} s`} formatter={(v, n) => [`${fmtSig(Number(v), 3)} J`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="kinetic" name={t(`${P}.chart.kinetic`)} stroke="#2fbf71" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="potential" name={t(`${P}.chart.potential`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="total" name={t(`${P}.chart.total`)} stroke={c.marker} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-shm-energy',
        headers: ['t_s', 'kinetic_J', 'potential_J', 'total_J'],
        rows: series.map((s) => [s.t, s.kinetic, s.potential, s.total]),
      }),
    },
    {
      id: 'period',
      title: t(`${P}.chart.period`),
      data: tm,
      caption: t(`${P}.chart.periodCaption`),
      render: (d: typeof tm) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="mass" type="number" domain={[0, M_MAX]} tickFormatter={(v) => fmt(v, 1)} label={L.x(t(`${P}.axis.mass`))} {...axisProps(c)} />
            <YAxis width={52} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.period`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `m = ${fmt(Number(v), 2)} kg`} formatter={(v) => [`${fmt(Number(v), 3)} s`, 'T']} />
            <Line dataKey="period" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={mass} y={h.period} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-shm-period-vs-mass', headers: ['mass_kg', 'period_s'], rows: tm.map((r) => [r.mass, r.period]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'position',
      title: t(`${P}.f.positionTitle`),
      expression: (
        <>
          <V>x</V> = <V>A</V> cos(<V>ω</V><V>t</V> + <V>φ</V>)
        </>
      ),
      substituted: (
        <>
          {fmt(amplitude, 2)} m × cos({fmt(w, 2)} × {fmt(h.t, 2)} + {fmt((phaseDeg * Math.PI) / 180, 2)}) = <b>{fmt(h.x, 3)} m</b>
        </>
      ),
      variables: [
        { symbol: <V>A</V>, name: t(`${P}.f.A`), unit: 'm', value: fmt(amplitude, 2), effect: t(`${P}.f.Aeffect`) },
        { symbol: <V>ω</V>, name: t(`${P}.f.omega`), unit: 'rad/s', value: fmt(w, 2) },
        { symbol: <V>φ</V>, name: t(`${P}.f.phi`), unit: '°', value: fmt(phaseDeg, 0), effect: t(`${P}.f.phiEffect`) },
      ],
      explanation: damping > 0 ? t(`${P}.f.positionExplainDamped`) : t(`${P}.f.positionExplain`),
    },
    {
      id: 'period',
      title: t(`${P}.f.periodTitle`),
      expression: (
        <>
          <V>T</V> = 2π<Sqrt><Frac n={<V>m</V>} d={<V>k</V>} /></Sqrt>
        </>
      ),
      substituted: (
        <>
          2π√({fmt(mass, 2)} / {fmt(k, 0)}) = <b>{fmt(h.period, 3)} s</b>
        </>
      ),
      variables: [
        { symbol: <V>T</V>, name: t(`${P}.f.T`), unit: 's', value: fmt(h.period, 3) },
        { symbol: <V>m</V>, name: t(`${P}.f.m`), unit: 'kg', value: fmt(mass, 2), effect: t(`${P}.f.mEffect`) },
        { symbol: <V>k</V>, name: t(`${P}.f.k`), unit: 'N/m', value: fmt(k, 0), effect: t(`${P}.f.kEffect`) },
      ],
      explanation: t(`${P}.f.periodExplain`),
    },
    {
      id: 'accel',
      title: t(`${P}.f.accelTitle`),
      expression: (
        <>
          <V>a</V> = −<V>ω</V><Sup>2</Sup><V>x</V>
        </>
      ),
      substituted: (
        <>
          −({fmt(w, 2)})² × {fmt(h.x, 3)} m = <b>{fmt(-w * w * h.x, 2)} m/s²</b>
        </>
      ),
      variables: [
        { symbol: <V>a</V>, name: t(`${P}.f.a`), unit: 'm/s²', value: fmt(h.a, 2) },
        { symbol: <V>x</V>, name: t(`${P}.f.x`), unit: 'm', value: fmt(h.x, 3) },
      ],
      explanation: t(`${P}.f.accelExplain`),
    },
    {
      id: 'energy',
      title: t(`${P}.f.energyTitle`),
      expression: (
        <>
          <V>E</V> = ½<V>k</V><V>x</V><Sup>2</Sup> + ½<V>m</V><V>v</V><Sup>2</Sup> = ½<V>k</V><V>A</V><Sup>2</Sup>
        </>
      ),
      substituted: (
        <>
          ½ × {fmt(k, 0)} × {fmt(amplitude, 2)}² = <b>{fmtSig(E0, 3)} J</b>
        </>
      ),
      variables: [
        { symbol: <><V>E</V><Sub>p</Sub></>, name: t(`${P}.chart.potential`), unit: 'J', value: fmtSig(h.energy.potential, 3) },
        { symbol: <><V>E</V><Sub>k</Sub></>, name: t(`${P}.chart.kinetic`), unit: 'J', value: fmtSig(h.energy.kinetic, 3) },
      ],
      explanation: t(`${P}.f.energyExplain`),
    },
  ]

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.mass`)} value={mass} min={M_MIN} max={M_MAX} step={0.05} unit="kg" onChange={h.setMass} format={(v) => fmt(v, 2)} accent={accent} />
      <ParamSlider label={t(`${P}.p.k`)} value={k} min={K_MIN} max={K_MAX} step={1} unit="N/m" onChange={h.setK} accent={accent} />
      <ParamSlider label={t(`${P}.p.amplitude`)} value={amplitude} min={0.02} max={A_MAX} step={0.01} unit="m" onChange={h.setAmplitude} format={(v) => fmt(v, 2)} accent={accent} />
      <ParamSlider label={t(`${P}.p.phase`)} value={phaseDeg} min={0} max={360} step={15} unit="°" onChange={h.setPhase} hint={t(`${P}.p.phaseHint`)} accent={accent} />
      <ParamSlider label={t(`${P}.p.damping`)} value={damping} min={0} max={0.3} step={0.01} onChange={h.setDamping} format={(v) => fmt(v, 2)} hint={t(`${P}.p.dampingHint`)} accent={accent} />
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.mass`)} value={mass} min={M_MIN} max={M_MAX} step={0.05} unit="kg" onChange={h.setMass} format={(v) => fmt(v, 2)} accent={accent} />
      </div>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.k`)} value={k} min={K_MIN} max={K_MAX} step={1} unit="N/m" onChange={h.setK} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 1.9, 5.2], target: [0, 1.0, 0] }}
      scene={<HarmonicMotionScene clock={h.clock} labels={{ equilibrium: t(`${P}.equilibrium`), circle: t(`${P}.circle`) }} />}
      fallback2D={<HarmonicMotion2D clock={h.clock} label={t('lab.view2d', { name: t('catalog.simple-harmonic-motion.title') })} />}
      controls={{ running: h.running, onTogglePlay: h.togglePlay, onReset: h.reset, speed: h.speed, speeds: SPEEDS, onSpeed: h.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      applySettings={(s) =>
        applySharedSettings(s, {
          mass: num(mass, M_MIN, M_MAX, h.setMass),
          k: num(k, K_MIN, K_MAX, h.setK),
          amplitude: num(amplitude, 0.02, A_MAX, h.setAmplitude),
          damping: num(damping, 0, 0.3, h.setDamping),
          phaseDeg: num(phaseDeg, 0, 360, h.setPhase),
        })
      }
      progressSettings={{ mass, k, amplitude, damping, phaseDeg }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[3], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.mass`), value: fmt(mass, 2), unit: 'kg' },
        { label: t(`${P}.p.k`), value: fmt(k, 0), unit: 'N/m' },
        { label: t(`${P}.p.amplitude`), value: fmt(amplitude, 2), unit: 'm' },
        { label: t(`${P}.p.phase`), value: fmt(phaseDeg, 0), unit: '°' },
        { label: t(`${P}.p.damping`), value: fmt(damping, 2) },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: h.running,
        togglePlay: h.togglePlay,
        reset: h.reset,
        increase: () => h.setK(Math.min(K_MAX, k + 1)),
        decrease: () => h.setK(Math.max(K_MIN, k - 1)),
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
