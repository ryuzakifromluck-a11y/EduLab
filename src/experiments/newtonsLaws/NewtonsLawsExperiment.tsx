import { Play } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { G, accelerationVsForce, accelerationVsMass, maxFriction } from '../../engines/newtonsLaws'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { F_MAX, MU_MAX, M_MAX, M_MIN, SPEEDS, TRACK, useNewtonsLaws } from './useNewtonsLaws'
import { NewtonsLawsScene } from './NewtonsLawsScene'
import { NewtonsLaws2D } from './NewtonsLaws2D'

const P = 'exp.newtons-laws'

export default function NewtonsLawsExperiment() {
  const { t } = useTranslation()
  const n = useNewtonsLaws()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'newtons-laws')!
  const accent = c.physics
  const { force, mass, friction, pushing } = n.params
  const fMax = maxFriction(n.params)
  const L = axisLabels(c)
  const ttip = tooltipProps(c)

  const aF = useMemo(() => accelerationVsForce(mass, friction, F_MAX), [mass, friction])
  const aM = useMemo(() => accelerationVsMass(force, friction, M_MIN, M_MAX), [force, friction])
  const steadyRuns = n.runs.filter((r) => r.steady)
  const runsSameMass = steadyRuns.filter((r) => r.mass === mass && r.friction === friction)
  const runsSameForce = steadyRuns.filter((r) => r.force === force && r.friction === friction)
  const theoryA = Math.max(0, (force - fMax) / mass)

  const status = n.finished ? t(`${P}.m.reachedEnd`) : n.v > 0 ? t(`${P}.m.moving`) : force <= fMax && pushing ? t(`${P}.m.held`) : t(`${P}.m.atRest`)

  const measurements: Measurement[] = [
    { id: 't', label: t(`${P}.m.time`), value: fmt(n.time, 2), unit: 's', sub: status },
    { id: 'x', label: t(`${P}.m.position`), value: fmt(n.x, 2), unit: 'm', sub: t(`${P}.m.ofTrack`, { value: TRACK }) },
    { id: 'v', label: t(`${P}.m.velocity`), value: fmt(n.v, 2), unit: 'm/s' },
    { id: 'a', label: t(`${P}.m.acceleration`), value: fmt(n.a, 2), unit: 'm/s²', tone: 'accent' },
    {
      id: 'net',
      label: t(`${P}.m.net`),
      value: fmt(n.net, 1),
      unit: 'N',
      sub: t(`${P}.m.netSub`, { F: fmt(n.applied, 1), f: fmt(Math.abs(n.friction), 1) }),
      tone: Math.abs(n.net) < 1e-9 ? 'warn' : 'default',
    },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'vt',
      title: t(`${P}.chart.vt`),
      data: n.log,
      caption: t(`${P}.chart.vtCaption`),
      render: (d: typeof n.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} tickFormatter={(v) => fmt(v, 1)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis yAxisId="v" width={56} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.velocity`))} {...axisProps(c)} />
            <YAxis yAxisId="x" orientation="right" width={56} tickFormatter={(v) => fmt(v, 0)} label={L.yRight(t(`${P}.axis.position`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 2)} s`} formatter={(v, name) => [fmt(Number(v), 2), name]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="v" dataKey="v" name={t(`${P}.chart.velocity`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="x" dataKey="x" name={t(`${P}.chart.position`)} stroke={c.accent2} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-newtons-laws-run', headers: ['t_s', 'x_m', 'v_m_per_s'], rows: n.log.map((s) => [s.t, s.x, s.v]) }),
    },
    {
      id: 'af',
      title: t(`${P}.chart.af`),
      data: { line: aF, points: runsSameMass },
      caption: t(`${P}.chart.afCaption`),
      render: (d: { line: typeof aF; points: typeof runsSameMass }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="force" type="number" domain={[0, F_MAX]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.force`))} {...axisProps(c)} />
            <YAxis dataKey="acceleration" type="number" width={56} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.acceleration`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, name) => [`${fmt(Number(v), 2)}`, name]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.line} dataKey="acceleration" name={t(`${P}.chart.theoryMass`, { m: fmt(mass, 1) })} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.points} dataKey="acceleration" name={t(`${P}.chart.yourRuns`)} fill={c.accent2} isAnimationActive={false} />
            <ReferenceDot x={force} y={theoryA} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-newtons-laws-runs',
        headers: ['force_N', 'mass_kg', 'friction_coefficient', 'time_s', 'acceleration_m_per_s2'],
        rows: n.runs.map((r) => [r.force, r.mass, r.friction, r.time, r.acceleration]),
      }),
    },
    {
      id: 'am',
      title: t(`${P}.chart.am`),
      data: { line: aM, points: runsSameForce },
      caption: t(`${P}.chart.amCaption`),
      render: (d: { line: typeof aM; points: typeof runsSameForce }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="mass" type="number" domain={[0, M_MAX]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.mass`))} {...axisProps(c)} />
            <YAxis dataKey="acceleration" type="number" width={56} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.acceleration`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, name) => [`${fmt(Number(v), 2)}`, name]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.line} dataKey="acceleration" name={t(`${P}.chart.theoryForce`, { F: fmt(force, 0) })} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.points} dataKey="acceleration" name={t(`${P}.chart.yourRuns`)} fill={c.accent2} isAnimationActive={false} />
            <ReferenceDot x={mass} y={theoryA} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-newtons-laws-a-vs-m', headers: ['mass_kg', 'acceleration_m_per_s2'], rows: aM.map((r) => [r.mass, r.acceleration]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'second',
      title: t(`${P}.f.secondTitle`),
      expression: (
        <>
          <V>a</V> = <Frac n={<><V>F</V><Sub>net</Sub></>} d={<V>m</V>} />
        </>
      ),
      substituted: (
        <>
          {fmt(n.net, 1)} N / {fmt(mass, 1)} kg = <b>{fmt(n.a, 2)} m/s²</b>
        </>
      ),
      variables: [
        { symbol: <V>a</V>, name: t(`${P}.f.a`), unit: 'm/s²', value: fmt(n.a, 2) },
        { symbol: <><V>F</V><Sub>net</Sub></>, name: t(`${P}.f.Fnet`), unit: 'N', value: fmt(n.net, 1), effect: t(`${P}.f.FnetEffect`) },
        { symbol: <V>m</V>, name: t(`${P}.f.m`), unit: 'kg', value: fmt(mass, 1), effect: t(`${P}.f.mEffect`) },
      ],
      explanation: t(`${P}.f.secondExplain`),
    },
    {
      id: 'friction',
      title: t(`${P}.f.frictionTitle`),
      expression: (
        <>
          <V>f</V> = <V>μ</V> <V>m</V> <V>g</V>
        </>
      ),
      substituted: (
        <>
          {fmt(friction, 2)} × {fmt(mass, 1)} kg × {fmt(G, 2)} m/s² = <b>{fmt(fMax, 2)} N</b>
        </>
      ),
      variables: [
        { symbol: <V>f</V>, name: t(`${P}.f.f`), unit: 'N', value: fmt(fMax, 2) },
        { symbol: <V>μ</V>, name: t(`${P}.f.mu`), unit: '—', value: fmt(friction, 2), effect: t(`${P}.f.muEffect`) },
        { symbol: <V>g</V>, name: t(`${P}.f.g`), unit: 'm/s²', value: fmt(G, 2) },
      ],
      explanation: t(`${P}.f.frictionExplain`),
    },
    {
      id: 'kinematics',
      title: t(`${P}.f.kinTitle`),
      expression: (
        <>
          <V>v</V> = <V>a</V><V>t</V>, <V>x</V> = ½<V>a</V><V>t</V>
          <Sup>2</Sup>
        </>
      ),
      substituted: (
        <>
          <V>t</V> = √(2 × {TRACK} m / {fmt(theoryA, 2)} m/s²) = <b>{theoryA > 0 ? `${fmt(Math.sqrt((2 * TRACK) / theoryA), 2)} s` : '∞'}</b>
        </>
      ),
      variables: [
        { symbol: <V>v</V>, name: t(`${P}.f.v`), unit: 'm/s', value: fmt(n.v, 2) },
        { symbol: <V>x</V>, name: t(`${P}.f.x`), unit: 'm', value: fmt(n.x, 2) },
        { symbol: <V>t</V>, name: t(`${P}.f.t`), unit: 's', value: fmt(n.time, 2) },
      ],
      explanation: t(`${P}.f.kinExplain`),
    },
  ]

  const runButton = (large = false) => (
    <Button variant="primary" onClick={n.togglePlay} className={large ? 'h-16 px-6 text-xl' : 'w-full'}>
      <Play className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
      {n.running ? t('lab.pause') : n.time > 0 && !n.finished && n.v > 0 ? t(`${P}.resume`) : t(`${P}.start`)}
    </Button>
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.force`)} value={force} min={0} max={F_MAX} step={1} unit="N" onChange={n.setForce} accent={accent} />
      <ParamSlider label={t(`${P}.p.mass`)} value={mass} min={M_MIN} max={M_MAX} step={0.5} unit="kg" onChange={n.setMass} format={(v) => fmt(v, 1)} accent={accent} />
      <ParamSlider
        label={t(`${P}.p.friction`)}
        value={friction}
        min={0}
        max={MU_MAX}
        step={0.01}
        onChange={n.setFriction}
        format={(v) => fmt(v, 2)}
        hint={t(`${P}.p.frictionHint`, { value: fmt(fMax, 1) })}
        accent={accent}
      />
      <Toggle label={t(`${P}.p.pushing`)} description={t(`${P}.p.pushingHint`)} checked={pushing} onChange={n.setPushing} />
      {runButton()}
      <RecordBox count={n.runs.length} title={t(`${P}.runs`, { count: n.runs.length })} hint={t(`${P}.runsHint`)} onClear={n.clearRuns} />
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.force`)} value={force} min={0} max={F_MAX} step={1} unit="N" onChange={n.setForce} accent={accent} />
      </div>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.mass`)} value={mass} min={M_MIN} max={M_MAX} step={0.5} unit="kg" onChange={n.setMass} format={(v) => fmt(v, 1)} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.4, 2.1, 4.4], target: [0, 0.15, 0] }}
      scene={
        <NewtonsLawsScene
          sim={n.sim}
          labels={{
            applied: `F = ${fmt(n.applied, 0)} N`,
            friction: `f = ${fmt(Math.abs(n.friction), 1)} N`,
            weight: t(`${P}.weight`),
            normal: t(`${P}.normal`),
          }}
        />
      }
      fallback2D={<NewtonsLaws2D sim={n.sim} label={t('lab.view2d', { name: t('catalog.newtons-laws.title') })} />}
      controls={{ running: n.running, onTogglePlay: n.togglePlay, onReset: n.reset, speed: n.speed, speeds: SPEEDS, onSpeed: n.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ force, mass, friction }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[2], measurements[3], measurements[4], measurements[0]]}
      tutorParams={[
        { label: t(`${P}.p.force`), value: fmt(force, 0), unit: 'N' },
        { label: t(`${P}.p.mass`), value: fmt(mass, 1), unit: 'kg' },
        { label: t(`${P}.p.friction`), value: fmt(friction, 2) },
        { label: 'Pushing', value: pushing ? 'yes' : 'no' },
        { label: 'Recorded runs (F, m, μ → a)', value: n.runs.length ? n.runs.slice(-6).map((r) => `${r.force} N, ${r.mass} kg, μ=${r.friction} → ${fmt(r.acceleration, 2)} m/s²`).join('; ') : 'none' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: n.running,
        togglePlay: n.togglePlay,
        reset: n.reset,
        increase: () => n.setForce(Math.min(F_MAX, force + 1)),
        decrease: () => n.setForce(Math.max(0, force - 1)),
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
