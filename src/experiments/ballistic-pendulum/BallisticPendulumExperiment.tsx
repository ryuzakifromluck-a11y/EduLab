import { Crosshair } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { G, LAUNCHER, keptFraction, shot, type Range } from '../../engines/ballisticPendulum'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { Frac, FormulaExplorer, Sqrt, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { SPEEDS, useBallisticPendulum } from './useBallisticPendulum'
import { BallisticPendulumScene } from './BallisticPendulumScene'
import { BallisticPendulum2D } from './BallisticPendulum2D'

const P = 'exp.ballistic-pendulum'

export default function BallisticPendulumExperiment() {
  const { t } = useTranslation()
  const b = useBallisticPendulum()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'ballistic-pendulum')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const m = b.ballMass
  const M = b.blockMass / 1000
  const rangeColors: Record<Range, string> = { short: c.accent2, medium: accent, long: c.accent3 }

  const angleCurve = useMemo(
    () =>
      Array.from({ length: 61 }, (_, i) => {
        const v = 1 + (7 * i) / 60
        return { v, angle: (shot(v, m, { M, L: b.L }).theta * 180) / Math.PI }
      }),
    [m, M, b.L],
  )
  const shotPoints = b.shots.filter((s) => s.blockMass === b.blockMass).map((s) => ({ v: s.vTrue, angle: s.angle, range: s.range }))
  const shotList = b.shots.map((s) => ({ ...s, label: `#${s.n}` }))
  const s = b.last ? shot(b.last.vTrue, m, { M: b.last.blockMass / 1000, L: b.L }) : b.nominal
  const energyBars = [
    { name: t(`${P}.chart.before`), E: s.keBefore * 1000 },
    { name: t(`${P}.chart.after`), E: s.keAfter * 1000 },
    { name: t(`${P}.chart.top`), E: (M + m) * G * s.h * 1000 },
  ]

  const measurements: Measurement[] = [
    { id: 'angle', label: t(`${P}.m.angle`), value: fmt(b.angle, 1), unit: '°', tone: 'accent', sub: b.phase === 'done' ? t(`${P}.m.caught`) : t(`${P}.m.ratchet`) },
    { id: 'h', label: t(`${P}.m.height`), value: fmt(b.height * 100, 2), unit: 'cm', sub: t(`${P}.m.hFormula`) },
    { id: 'V', label: t(`${P}.m.after`), value: fmt(b.V, 2), unit: 'm/s' },
    {
      id: 'v',
      label: t(`${P}.m.muzzle`),
      value: b.vFromSwing === null ? '—' : fmt(b.vFromSwing, 2),
      unit: 'm/s',
      tone: 'accent',
      sub: b.average === null ? t(`${P}.m.fireFirst`) : t(`${P}.m.average`, { value: fmt(b.average, 2), count: b.ownShots.length }),
    },
    { id: 'kept', label: t(`${P}.m.kept`), value: fmt(keptFraction(m, M) * 100, 1), unit: '%', sub: t(`${P}.m.lost`) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'shots',
      title: t(`${P}.chart.shots`),
      data: shotList,
      caption: t(`${P}.chart.shotsCaption`),
      render: (d: typeof shotList) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="n" type="number" domain={[0, 'dataMax + 1']} allowDecimals={false} label={L.x(t(`${P}.axis.shot`))} {...axisProps(c)} />
            <YAxis dataKey="v" type="number" domain={[0, 8]} width={44} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.speed`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `#${v}`} formatter={(v, n) => [`${fmt(Number(v), 2)} m/s`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            {LAUNCHER.map((l) => (
              <ReferenceLine key={l.id} y={l.speed} stroke={rangeColors[l.id]} strokeDasharray="5 4" />
            ))}
            {LAUNCHER.map((l) => (
              <Scatter key={l.id} data={d.filter((x) => x.range === l.id)} dataKey="v" name={t(`${P}.ranges.${l.id}`)} fill={rangeColors[l.id]} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-ballistic-pendulum-shots',
        headers: ['shot', 'range', 'block_g', 'angle_deg', 'rise_m', 'v_from_swing_m_s'],
        rows: b.shots.map((x) => [x.n, x.range, x.blockMass, x.angle, x.h, x.v]),
      }),
    },
    {
      id: 'angle',
      title: t(`${P}.chart.angle`),
      data: { curve: angleCurve, pts: shotPoints },
      caption: t(`${P}.chart.angleCaption`),
      render: (d: { curve: typeof angleCurve; pts: typeof shotPoints }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="v" type="number" domain={[1, 8]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.speed`))} {...axisProps(c)} />
            <YAxis dataKey="angle" type="number" domain={[0, 90]} width={44} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.angle`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [fmt(Number(v), 1), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.curve} dataKey="angle" name={t(`${P}.chart.model`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.pts} dataKey="angle" name={t(`${P}.chart.yourShots`)} fill={c.accent2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-ballistic-pendulum-angle', headers: ['v_m_s', 'angle_deg'], rows: angleCurve.map((r) => [r.v, r.angle]) }),
    },
    {
      id: 'energy',
      title: t(`${P}.chart.energy`),
      data: energyBars,
      caption: t(`${P}.chart.energyCaption`),
      render: (d: typeof energyBars) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="name" {...axisProps(c)} />
            <YAxis width={52} tickFormatter={(v) => fmtSig(v, 2)} label={L.y(t(`${P}.axis.energy`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v) => [`${fmtSig(Number(v), 3)} mJ`, 'E']} />
            <Bar dataKey="E" fill={accent} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-ballistic-pendulum-energy', headers: ['stage', 'energy_mJ'], rows: energyBars.map((r) => [r.name, r.E]) }),
    },
  ]

  const theta = (b.angle * Math.PI) / 180
  const formulas: Formula[] = [
    {
      id: 'momentum',
      title: 'm v = (M + m) V',
      expression: (
        <>
          <V>m</V> <V>v</V> = (<V>M</V> + <V>m</V>) <V>V</V>
        </>
      ),
      substituted: (
        <>
          {fmt(m, 3)} kg × <V>v</V> = {fmt(M + m, 3)} kg × {fmt(b.V, 2)} m/s
        </>
      ),
      variables: [
        { symbol: <V>m</V>, name: t(`${P}.f.m`), unit: 'kg', value: fmt(m, 3) },
        { symbol: <V>M</V>, name: t(`${P}.f.M`), unit: 'kg', value: fmt(M, 3), effect: t(`${P}.f.mEffect`) },
        { symbol: <V>V</V>, name: t(`${P}.f.V`), unit: 'm/s', value: fmt(b.V, 2) },
      ],
      explanation: t(`${P}.f.momentumExplain`),
    },
    {
      id: 'energy',
      title: '½(M+m)V² = (M+m) g h',
      expression: (
        <>
          ½(<V>M</V>+<V>m</V>)<V>V</V>
          <Sup>2</Sup> = (<V>M</V>+<V>m</V>) <V>g</V> <V>h</V>
        </>
      ),
      substituted: (
        <>
          <V>h</V> = <V>L</V>(1 − cos θ) = {fmt(b.L, 2)} m × (1 − cos {fmt(b.angle, 1)}°) = <b>{fmt(b.height * 100, 2)} cm</b>
        </>
      ),
      variables: [
        { symbol: <V>h</V>, name: t(`${P}.f.h`), unit: 'm', value: fmt(b.height, 4) },
        { symbol: <V>L</V>, name: t(`${P}.f.L`), unit: 'm', value: fmt(b.L, 2) },
        { symbol: 'θ', name: t(`${P}.f.theta`), unit: '°', value: fmt(b.angle, 1) },
      ],
      explanation: t(`${P}.f.energyExplain`),
    },
    {
      id: 'speed',
      title: 'v = (M+m)/m · √(2gh)',
      expression: (
        <>
          <V>v</V> = <Frac n={<>(<V>M</V> + <V>m</V>)</>} d={<V>m</V>} /> <Sqrt>2<V>g</V><V>h</V></Sqrt>
        </>
      ),
      substituted: (
        <>
          ({fmt(M + m, 3)} / {fmt(m, 3)}) × √(2 × {fmt(G, 2)} × {fmt(b.height, 4)}) = <b>{fmt(((M + m) / m) * Math.sqrt(2 * G * b.height), 2)} m/s</b>
        </>
      ),
      variables: [
        { symbol: <V>v</V>, name: t(`${P}.f.v`), unit: 'm/s', value: b.vFromSwing === null ? '—' : fmt(b.vFromSwing, 2) },
        { symbol: <V>g</V>, name: t(`${P}.f.g`), unit: 'm/s²', value: fmt(G, 2) },
      ],
      explanation: t(`${P}.f.speedExplain`, { theta: fmt((theta * 180) / Math.PI, 1) }),
    },
    {
      id: 'kept',
      title: 'KE_after / KE_before = m / (M + m)',
      expression: (
        <>
          <V>E</V>
          <Sub>after</Sub> / <V>E</V>
          <Sub>before</Sub> = <V>m</V> / (<V>M</V> + <V>m</V>)
        </>
      ),
      substituted: (
        <>
          {fmt(m, 3)} / {fmt(M + m, 3)} = <b>{fmt(keptFraction(m, M) * 100, 1)} %</b>
        </>
      ),
      variables: [{ symbol: <V>E</V>, name: t(`${P}.f.E`), unit: 'J', value: fmtSig(s.keBefore, 3) }],
      explanation: t(`${P}.f.keptExplain`),
    },
  ]

  const rangePicker = (large = false) => (
    <Segmented label={t(`${P}.p.range`)} value={b.range} onChange={b.setRange} options={LAUNCHER.map((l) => ({ value: l.id, label: t(`${P}.ranges.${l.id}`) }))} size={large ? 'lg' : 'md'} />
  )
  const fireButton = (large = false) => (
    <Button size={large ? 'lg' : 'md'} variant="primary" onClick={b.fire} disabled={b.phase === 'flying' || b.phase === 'swinging'}>
      <Crosshair className="h-4 w-4" aria-hidden />
      {t(`${P}.fire`)}
    </Button>
  )

  const controls = (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.range`)}</span>
        {rangePicker()}
        <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.rangeHint`)}</p>
      </div>
      <ParamSlider label={t(`${P}.p.block`)} value={b.blockMass} min={150} max={500} step={10} unit="g" onChange={b.setBlockMass} accent={accent} hint={t(`${P}.p.blockHint`, { value: fmt(m * 1000, 0) })} />
      {fireButton()}
      <RecordBox count={b.shots.length} title={t(`${P}.shots`, { count: b.shots.length })} hint={t(`${P}.shotsHint`)} onClear={b.clearShots} />
    </>
  )

  const presenterControls = (
    <>
      {rangePicker(true)}
      {fireButton(true)}
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [-0.2, 2.0, 5.2], target: [-0.2, 1.5, 0] }}
      scene={<BallisticPendulumScene rig={b.rig} labels={{ scale: t(`${P}.scale`), reading: b.vFromSwing === null ? null : `θ = ${fmt(b.angle, 1)}°  ·  v = ${fmt(b.vFromSwing, 2)} m/s` }} />}
      fallback2D={<BallisticPendulum2D rig={b.rig} label={t('lab.view2d', { name: t('catalog.ballistic-pendulum.title') })} />}
      controls={{ running: b.running, onTogglePlay: b.togglePlay, onReset: b.reset, speed: b.speed, speeds: SPEEDS, onSpeed: b.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ range: b.range, block: b.blockMass }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.range`), value: t(`${P}.ranges.${b.range}`) },
        { label: t(`${P}.p.block`), value: fmt(b.blockMass, 0), unit: 'g' },
        { label: 'Ball mass', value: fmt(m * 1000, 0), unit: 'g' },
        { label: 'Arm length (pivot to centre of mass)', value: fmt(b.L, 2), unit: 'm' },
        { label: 'Shots (range → angle → v)', value: b.shots.length ? b.shots.slice(-8).map((x) => `${x.range}: ${fmt(x.angle, 1)}° → ${fmt(x.v, 2)} m/s`).join('; ') : 'none' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: b.running,
        togglePlay: b.togglePlay,
        reset: b.reset,
        increase: () => b.setRange(b.range === 'short' ? 'medium' : 'long'),
        decrease: () => b.setRange(b.range === 'long' ? 'medium' : 'short'),
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
