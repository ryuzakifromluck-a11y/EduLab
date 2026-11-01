import { ArrowUpDown } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { C, MEDIA, angleSweep, lightSpeed, type Medium } from '../../engines/optics'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { useOptics } from './useOptics'
import { OpticsScene } from './OpticsScene'
import { Optics2D } from './Optics2D'

const P = 'exp.refraction-reflection'

export default function OpticsExperiment() {
  const { t } = useTranslation()
  const o = useOptics()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'refraction-reflection')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const { ray, n1, n2 } = o
  const name = (id: Medium['id']) => t(`${P}.media.${id}`)

  const sweep = useMemo(() => angleSweep(n1, n2), [n1, n2])
  const sinPoints = o.readings
    .filter((r) => r.n1 === n1 && r.n2 === n2 && r.refraction !== null)
    .map((r) => ({ sin1: Math.sin((r.incidence * Math.PI) / 180), sin2: Math.sin((r.refraction! * Math.PI) / 180) }))
  const anglePoints = o.readings.filter((r) => r.n1 === n1 && r.n2 === n2 && r.refraction !== null)

  const measurements: Measurement[] = [
    { id: 'i', label: t(`${P}.m.incidence`), value: fmt(ray.incidence, 0), unit: '°' },
    { id: 'r', label: t(`${P}.m.reflection`), value: fmt(ray.reflection, 0), unit: '°', sub: t(`${P}.m.reflected`, { value: fmt(ray.reflected * 100, 1) }) },
    ray.refraction === null
      ? { id: 't', label: t(`${P}.m.refraction`), value: t(`${P}.m.tir`), tone: 'warn' }
      : { id: 't', label: t(`${P}.m.refraction`), value: fmt(ray.refraction, 1), unit: '°', tone: 'accent', sub: t(`${P}.m.transmitted`, { value: fmt(ray.transmitted * 100, 1) }) },
    {
      id: 'c',
      label: t(`${P}.m.critical`),
      value: ray.critical === null ? '—' : fmt(ray.critical, 1),
      unit: ray.critical === null ? undefined : '°',
      sub: ray.critical === null ? t(`${P}.m.noCritical`) : undefined,
    },
    { id: 'v', label: t(`${P}.m.speed2`), value: fmt(lightSpeed(n2) / 1e8, 2), unit: '× 10⁸ m/s', sub: `n₂ = ${fmt(n2, 3)}` },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'angles',
      title: t(`${P}.chart.angles`),
      data: { line: sweep, points: anglePoints },
      caption: t(`${P}.chart.anglesCaption`),
      render: (d: { line: typeof sweep; points: typeof anglePoints }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="incidence" type="number" domain={[0, 90]} ticks={[0, 15, 30, 45, 60, 75, 90]} label={L.x(t(`${P}.axis.incidence`))} {...axisProps(c)} />
            <YAxis dataKey="refraction" type="number" domain={[0, 90]} ticks={[0, 15, 30, 45, 60, 75, 90]} width={48} label={L.y(t(`${P}.axis.refraction`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [`${fmt(Number(v), 1)}°`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.line} dataKey="refraction" name={t(`${P}.chart.snell`)} stroke={accent} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line data={[{ incidence: 0, refraction: 0 }, { incidence: 90, refraction: 90 }]} dataKey="refraction" name={t(`${P}.chart.noBending`)} stroke={c.axis} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            <Scatter data={d.points} dataKey="refraction" name={t(`${P}.chart.readings`)} fill={c.accent2} isAnimationActive={false} />
            {ray.critical !== null && <ReferenceLine x={ray.critical} stroke={c.accent2} strokeDasharray="5 4" label={{ value: t(`${P}.chart.critical`), fill: c.accent2, fontSize: 11, position: 'insideTopRight' }} />}
            {ray.refraction !== null && <ReferenceDot x={ray.incidence} y={ray.refraction} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-refraction-readings',
        headers: ['n1', 'n2', 'incidence_deg', 'refraction_deg'],
        rows: o.readings.map((r) => [r.n1, r.n2, r.incidence, r.refraction ?? 'TIR']),
      }),
    },
    {
      id: 'fresnel',
      title: t(`${P}.chart.fresnel`),
      data: sweep,
      caption: t(`${P}.chart.fresnelCaption`),
      render: (d: typeof sweep) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="incidence" type="number" domain={[0, 90]} ticks={[0, 15, 30, 45, 60, 75, 90]} label={L.x(t(`${P}.axis.incidence`))} {...axisProps(c)} />
            <YAxis domain={[0, 100]} width={48} label={L.y(t(`${P}.axis.share`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `θ₁ = ${fmt(Number(v), 1)}°`} formatter={(v, n) => [`${fmt(Number(v), 1)} %`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="reflected" name={t(`${P}.chart.reflected`)} stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="transmitted" name={t(`${P}.chart.transmitted`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceLine x={ray.incidence} stroke={c.marker} strokeDasharray="4 4" />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-fresnel', headers: ['incidence_deg', 'reflected_pct', 'transmitted_pct'], rows: sweep.map((r) => [r.incidence, r.reflected, r.transmitted]) }),
    },
    {
      id: 'sines',
      title: t(`${P}.chart.sines`),
      data: { line: sweep.filter((p) => p.sin2 !== null), points: sinPoints },
      caption: t(`${P}.chart.sinesCaption`, { ratio: fmt(n1 / n2, 3) }),
      render: (d: { line: typeof sweep; points: typeof sinPoints }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="sin1" type="number" domain={[0, 1]} tickFormatter={(v) => fmt(v, 1)} label={L.x('sin θ₁')} {...axisProps(c)} />
            <YAxis dataKey="sin2" type="number" domain={[0, 1]} width={48} tickFormatter={(v) => fmt(v, 1)} label={L.y('sin θ₂')} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [fmt(Number(v), 3), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.line} dataKey="sin2" name={t(`${P}.chart.snell`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.points} dataKey="sin2" name={t(`${P}.chart.readings`)} fill={c.accent2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-snell-sines', headers: ['sin_theta1', 'sin_theta2'], rows: sinPoints.map((r) => [r.sin1, r.sin2]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'snell',
      title: t(`${P}.f.snellTitle`),
      expression: (
        <>
          <V>n</V><Sub>1</Sub> sin <V>θ</V><Sub>1</Sub> = <V>n</V><Sub>2</Sub> sin <V>θ</V><Sub>2</Sub>
        </>
      ),
      substituted:
        ray.refraction === null ? (
          <>{t(`${P}.f.noSolution`, { value: fmt((n1 / n2) * Math.sin((ray.incidence * Math.PI) / 180), 3) })}</>
        ) : (
          <>
            {fmt(n1, 3)} × sin {fmt(ray.incidence, 0)}° = {fmt(n2, 3)} × sin <b>{fmt(ray.refraction, 1)}°</b>
          </>
        ),
      variables: [
        { symbol: <><V>n</V><Sub>1</Sub></>, name: t(`${P}.f.n1`), unit: '—', value: fmt(n1, 3) },
        { symbol: <><V>θ</V><Sub>1</Sub></>, name: t(`${P}.f.theta1`), unit: '°', value: fmt(ray.incidence, 0) },
        { symbol: <><V>n</V><Sub>2</Sub></>, name: t(`${P}.f.n2`), unit: '—', value: fmt(n2, 3), effect: t(`${P}.f.n2Effect`) },
        { symbol: <><V>θ</V><Sub>2</Sub></>, name: t(`${P}.f.theta2`), unit: '°', value: ray.refraction === null ? '—' : fmt(ray.refraction, 1) },
      ],
      explanation: t(`${P}.f.snellExplain`),
    },
    {
      id: 'reflection',
      title: t(`${P}.f.reflectionTitle`),
      expression: (
        <>
          <V>θ</V><Sub>r</Sub> = <V>θ</V><Sub>1</Sub>
        </>
      ),
      substituted: (
        <>
          <b>{fmt(ray.reflection, 0)}°</b> = {fmt(ray.incidence, 0)}°
        </>
      ),
      variables: [
        { symbol: <><V>θ</V><Sub>r</Sub></>, name: t(`${P}.f.thetaR`), unit: '°', value: fmt(ray.reflection, 0) },
        { symbol: <V>R</V>, name: t(`${P}.f.R`), unit: '%', value: fmt(ray.reflected * 100, 1) },
      ],
      explanation: t(`${P}.f.reflectionExplain`),
    },
    {
      id: 'critical',
      title: t(`${P}.f.criticalTitle`),
      expression: (
        <>
          sin <V>θ</V><Sub>c</Sub> = <Frac n={<><V>n</V><Sub>2</Sub></>} d={<><V>n</V><Sub>1</Sub></>} />
        </>
      ),
      substituted:
        ray.critical === null ? (
          <>{t(`${P}.f.noCritical`)}</>
        ) : (
          <>
            sin⁻¹({fmt(n2, 3)} / {fmt(n1, 3)}) = <b>{fmt(ray.critical, 1)}°</b>
          </>
        ),
      variables: [{ symbol: <><V>θ</V><Sub>c</Sub></>, name: t(`${P}.f.thetaC`), unit: '°', value: ray.critical === null ? '—' : fmt(ray.critical, 1) }],
      explanation: t(`${P}.f.criticalExplain`),
    },
    {
      id: 'index',
      title: t(`${P}.f.indexTitle`),
      expression: (
        <>
          <V>n</V> = <Frac n={<V>c</V>} d={<V>v</V>} />
        </>
      ),
      substituted: (
        <>
          <V>v</V><Sub>2</Sub> = {fmt(C / 1e8, 3)} × 10⁸ / {fmt(n2, 3)} = <b>{fmt(lightSpeed(n2) / 1e8, 3)} × 10⁸ m/s</b>
        </>
      ),
      variables: [
        { symbol: <V>c</V>, name: t(`${P}.f.c`), unit: 'm/s', value: '2.998 × 10⁸' },
        { symbol: <V>v</V>, name: t(`${P}.f.v`), unit: 'm/s', value: `${fmt(lightSpeed(n2) / 1e8, 3)} × 10⁸` },
      ],
      explanation: t(`${P}.f.indexExplain`),
    },
  ]

  const mediaOptions = MEDIA.map((m) => ({ value: m.id, label: `${name(m.id)} (n = ${fmt(m.n, 2)})` }))
  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.angle`)} value={o.angle} min={0} max={89} step={1} unit="°" onChange={o.setAngle} accent={accent} />
      <SelectField label={t(`${P}.p.top`)} value={o.m1} options={mediaOptions} onChange={o.setM1} />
      <SelectField label={t(`${P}.p.bottom`)} value={o.m2} options={mediaOptions} onChange={o.setM2} />
      <Button variant="secondary" onClick={o.swap} className="w-full">
        <ArrowUpDown className="h-4 w-4" aria-hidden />
        {t(`${P}.swap`)}
      </Button>
      <RecordBox count={o.readings.length} title={t(`${P}.readings`, { count: o.readings.length })} hint={t(`${P}.recordHint`)} onRecord={o.record} onClear={o.clearReadings} />
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[280px] flex-1">
        <ParamSlider large label={t(`${P}.p.angle`)} value={o.angle} min={0} max={89} step={1} unit="°" onChange={o.setAngle} accent={accent} />
      </div>
      <Button variant="secondary" onClick={o.swap} className="h-16 px-6 text-xl">
        <ArrowUpDown className="h-6 w-6" aria-hidden />
        {t(`${P}.swap`)}
      </Button>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 0.25, 6.2], target: [0, 0.05, 0] }}
      scene={
        <OpticsScene
          ray={ray}
          m1={o.m1}
          m2={o.m2}
          n1={n1}
          n2={n2}
          phase={o.phase}
          labels={{
            top: `${name(o.m1)} · n = ${fmt(n1, 2)}`,
            bottom: `${name(o.m2)} · n = ${fmt(n2, 2)}`,
            normal: t(`${P}.normal`),
            i: `θ₁ ${fmt(ray.incidence, 0)}°`,
            r: `θᵣ ${fmt(ray.reflection, 0)}°`,
            t: ray.refraction === null ? null : `θ₂ ${fmt(ray.refraction, 1)}°`,
          }}
        />
      }
      fallback2D={<Optics2D ray={ray} label={t('lab.view2d', { name: t('catalog.refraction-reflection.title') })} top={name(o.m1)} bottom={name(o.m2)} />}
      controls={{ running: o.running, onTogglePlay: o.togglePlay, onReset: o.reset }}
      overlay={<OverlayNote>{ray.totalInternal ? t(`${P}.tirNote`) : t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ angle: o.angle, top: o.m1, bottom: o.m2 }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[2], measurements[1], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.angle`), value: fmt(o.angle, 0), unit: '°' },
        { label: t(`${P}.p.top`), value: `${o.m1} (n = ${n1})` },
        { label: t(`${P}.p.bottom`), value: `${o.m2} (n = ${n2})` },
        { label: 'Refraction angle', value: ray.refraction === null ? 'total internal reflection' : fmt(ray.refraction, 1), unit: ray.refraction === null ? undefined : '°' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: o.running,
        togglePlay: o.togglePlay,
        reset: o.reset,
        increase: () => o.setAngle(Math.min(89, o.angle + 1)),
        decrease: () => o.setAngle(Math.max(0, o.angle - 1)),
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
