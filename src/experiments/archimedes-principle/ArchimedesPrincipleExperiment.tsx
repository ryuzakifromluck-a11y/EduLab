import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { BODIES, FLUIDS, G, immerse, immersionCurve, specificGravity } from '../../engines/archimedesPrinciple'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { LOWER_STEP, useArchimedesPrinciple } from './useArchimedesPrinciple'
import { ArchimedesPrincipleScene } from './ArchimedesPrincipleScene'
import { ArchimedesPrinciple2D } from './ArchimedesPrinciple2D'

const P = 'exp.archimedes-principle'

export default function ArchimedesPrincipleExperiment() {
  const { t } = useTranslation()
  const a = useArchimedesPrinciple()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'archimedes-principle')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const r = a.reading
  const { body, fluid } = a

  const curve = useMemo(() => immersionCurve(body, fluid, 61), [body, fluid])
  const pts = a.readings.filter((x) => x.body === a.bodyId && x.fluid === a.fluidId)
  const fluidBars = useMemo(
    () => FLUIDS.map((f) => ({ id: f.id, name: t(`${P}.fluids.${f.id}`), apparent: immerse(body, f, 1).apparent, buoyancy: immerse(body, f, 1).buoyancy })),
    [body, t],
  )
  const fullyIn = r.submerged >= 0.999 && !r.floating

  const measurements: Measurement[] = [
    { id: 'W', label: t(`${P}.m.weight`), value: fmt(r.weight, 3), unit: 'N', sub: t(`${P}.m.mass`, { value: fmt(body.density * body.volume / 1000, 1) }) },
    { id: 'app', label: t(`${P}.m.apparent`), value: fmt(r.apparent, 3), unit: 'N', tone: 'accent', sub: r.floating ? t(`${P}.m.slack`) : t(`${P}.m.balance`) },
    { id: 'Fb', label: t(`${P}.m.buoyancy`), value: fmt(r.buoyancy, 3), unit: 'N', sub: t(`${P}.m.loss`, { value: fmt(r.weight - r.apparent, 3) }) },
    { id: 'V', label: t(`${P}.m.displaced`), value: fmt(r.displaced, 1), unit: 'cm³', sub: t(`${P}.m.overflow`, { value: fmt(r.overflowMass, 1) }) },
    {
      id: 'sg',
      label: t(`${P}.m.sg`),
      value: fullyIn ? fmt(r.weight / (r.weight - r.apparent), 2) : '—',
      sub: fullyIn ? t(`${P}.m.sgVs`, { fluid: t(`${P}.fluids.${fluid.id}`) }) : t(`${P}.m.sgHint`),
    },
    {
      id: 'state',
      label: t(`${P}.m.state`),
      value: r.floating ? t(`${P}.m.floats`) : r.submerged >= 0.999 ? t(`${P}.m.immersed`) : r.submerged > 0 ? t(`${P}.m.partly`) : t(`${P}.m.inAir`),
      tone: r.floating ? 'warn' : 'default',
      sub: t(`${P}.m.submerged`, { value: fmt(r.submerged * 100, 0) }),
    },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'depth',
      title: t(`${P}.chart.depth`),
      data: { curve, pts },
      caption: t(`${P}.chart.depthCaption`),
      render: (d: { curve: typeof curve; pts: typeof pts }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="depth" type="number" domain={[0, body.height]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.depth`))} {...axisProps(c)} />
            <YAxis type="number" domain={[0, 'auto']} width={52} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.force`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 1)} cm`} formatter={(v, n) => [`${fmt(Number(v), 3)} N`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.curve} dataKey="apparent" name={t(`${P}.chart.apparent`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line data={d.curve} dataKey="buoyancy" name={t(`${P}.chart.buoyancy`)} stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.pts} dataKey="apparent" name={t(`${P}.chart.readings`)} fill={c.marker} isAnimationActive={false} />
            <ReferenceDot x={a.depth} y={r.apparent} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-archimedes-readings',
        headers: ['body', 'fluid', 'depth_cm', 'apparent_N', 'buoyancy_N'],
        rows: a.readings.map((x) => [x.body, x.fluid, x.depth, x.apparent, x.buoyancy]),
      }),
    },
    {
      id: 'fluids',
      title: t(`${P}.chart.fluids`),
      data: fluidBars,
      caption: t(`${P}.chart.fluidsCaption`),
      render: (d: typeof fluidBars) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} {...axisProps(c)} tick={{ fill: c.text, fontSize: 10 }} />
            <YAxis width={52} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.force`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [`${fmt(Number(v), 3)} N`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="apparent" name={t(`${P}.chart.apparent`)} stackId="w" fill={accent} isAnimationActive={false} />
            <Bar dataKey="buoyancy" name={t(`${P}.chart.buoyancy`)} stackId="w" fill={c.accent2} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-archimedes-fluids', headers: ['fluid', 'apparent_N', 'buoyancy_N'], rows: fluidBars.map((x) => [x.id, x.apparent, x.buoyancy]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'fb',
      title: 'F_b = ρ g V',
      expression: (
        <>
          <V>F</V>
          <Sub>b</Sub> = ρ<Sub>fluid</Sub> · <V>g</V> · <V>V</V>
          <Sub>displaced</Sub>
        </>
      ),
      substituted: (
        <>
          {fmt(fluid.density, 0)} kg/m³ × {fmt(G, 2)} m/s² × {fmtSig(r.displaced * 1e-6, 3)} m³ = <b>{fmt(r.buoyancy, 3)} N</b>
        </>
      ),
      variables: [
        { symbol: 'ρ', name: t(`${P}.f.rho`), unit: 'kg/m³', value: fmt(fluid.density, 0), effect: t(`${P}.f.rhoEffect`) },
        { symbol: <V>V</V>, name: t(`${P}.f.V`), unit: 'cm³', value: fmt(r.displaced, 1) },
        { symbol: <V>g</V>, name: t(`${P}.f.g`), unit: 'm/s²', value: fmt(G, 2) },
      ],
      explanation: t(`${P}.f.fbExplain`),
    },
    {
      id: 'app',
      title: 'W_app = W − F_b',
      expression: (
        <>
          <V>W</V>
          <Sub>app</Sub> = <V>W</V> − <V>F</V>
          <Sub>b</Sub>
        </>
      ),
      substituted: (
        <>
          {fmt(r.weight, 3)} N − {fmt(r.buoyancy, 3)} N = <b>{fmt(r.apparent, 3)} N</b>
        </>
      ),
      variables: [
        { symbol: <V>W</V>, name: t(`${P}.f.W`), unit: 'N', value: fmt(r.weight, 3) },
        { symbol: <V>W</V>, name: t(`${P}.f.Wapp`), unit: 'N', value: fmt(r.apparent, 3) },
      ],
      explanation: t(`${P}.f.appExplain`),
    },
    {
      id: 'sg',
      title: 'SG = ρ_obj / ρ_water = W / (W − W_water)',
      expression: (
        <>
          SG = ρ<Sub>obj</Sub> / ρ<Sub>water</Sub> = <V>W</V> / (<V>W</V> − <V>W</V>
          <Sub>water</Sub>)
        </>
      ),
      substituted: (
        <>
          {fmt(body.density, 0)} / 1000 = <b>{fmt(specificGravity(body.density), 2)}</b>
        </>
      ),
      variables: [{ symbol: 'ρ', name: t(`${P}.f.rhoObj`), unit: 'kg/m³', value: fmt(body.density, 0) }],
      explanation: t(`${P}.f.sgExplain`),
    },
  ]

  const lowerSlider = (large = false) => (
    <ParamSlider large={large} label={t(`${P}.p.lower`)} value={a.lowered} min={0} max={a.maxLower} step={LOWER_STEP} unit="cm" onChange={a.setLowered} accent={accent} />
  )

  const controls = (
    <>
      <SelectField label={t(`${P}.p.body`)} value={a.bodyId} onChange={a.setBody} options={BODIES.map((b) => ({ value: b.id, label: `${t(`${P}.bodies.${b.id}`)} (${b.volume} cm³)` }))} />
      <SelectField label={t(`${P}.p.fluid`)} value={a.fluidId} onChange={a.setFluid} options={FLUIDS.map((f) => ({ value: f.id, label: `${t(`${P}.fluids.${f.id}`)} (${f.density} kg/m³)` }))} />
      {lowerSlider()}
      <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.lowerHint`)}</p>
      <RecordBox count={a.readings.length} title={t(`${P}.readings`, { count: pts.length })} hint={t(`${P}.recordHint`)} onRecord={a.record} onClear={a.clearReadings} />
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[260px] flex-1">{lowerSlider(true)}</div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.7, 1.9, 5.0], target: [0.15, 1.35, 0] }}
      scene={
        <ArchimedesPrincipleScene
          body={body}
          fluid={fluid}
          reading={r}
          lowered={a.lowered}
          labels={{ balance: `${fmt(r.apparent, 2)} N`, caught: t(`${P}.caughtLabel`, { value: fmt(r.overflowMass, 1) }) }}
        />
      }
      fallback2D={<ArchimedesPrinciple2D body={body} fluid={fluid} reading={r} lowered={a.lowered} label={t('lab.view2d', { name: t('catalog.archimedes-principle.title') })} />}
      controls={{ running: a.running, onTogglePlay: a.togglePlay, onReset: a.reset }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ body: a.bodyId, fluid: a.fluidId, lowered: a.lowered }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.body`), value: `${body.id}, ${body.volume} cm³, ${body.density} kg/m³` },
        { label: t(`${P}.p.fluid`), value: `${fluid.id}, ${fluid.density} kg/m³` },
        { label: 'Submerged', value: fmt(r.submerged * 100, 0), unit: '%' },
        { label: 'Spring balance reading', value: fmt(r.apparent, 3), unit: 'N' },
        { label: 'Weight in air', value: fmt(r.weight, 3), unit: 'N' },
        { label: 'Floating', value: r.floating ? 'yes' : 'no' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: a.running,
        togglePlay: a.togglePlay,
        reset: a.reset,
        increase: () => a.setLowered(a.lowered + LOWER_STEP),
        decrease: () => a.setLowered(a.lowered - LOWER_STEP),
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
