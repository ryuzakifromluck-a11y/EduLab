import { RefreshCcw } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { G, SPRINGS, extension, loadingCurve, type Spring } from '../../engines/hookesLaw'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { MASS_MAX, MASS_STEP, useHookesLaw } from './useHookesLaw'
import { HookesLawScene } from './HookesLawScene'
import { HookesLaw2D } from './HookesLaw2D'

const P = 'exp.hookes-law'
const F_CHART = 10

export default function HookesLawExperiment() {
  const { t } = useTranslation()
  const h = useHookesLaw()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'hookes-law')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const { spring } = h
  const xCm = h.extension * 100

  const curve = useMemo(() => loadingCurve(spring, F_CHART, 81).map((p) => ({ ...p, extension: p.extension * 100 })), [spring])
  const allSprings = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const m = (MASS_MAX * i) / 20
        const row: Record<string, number> = { mass: m }
        for (const s of SPRINGS) row[s.id] = extension(s, (m / 1000) * G) * 100
        return row
      }),
    [],
  )
  const energyCurve = useMemo(
    () => Array.from({ length: 41 }, (_, i) => ({ x: (i * spring.limit) / spring.k / 40 * 100, E: 0.5 * spring.k * ((i * spring.limit) / spring.k / 40) ** 2 })),
    [spring],
  )
  const points = h.ownReadings.map((r) => ({ ...r, extension: r.extension * 100 }))
  const springColors: Record<Spring['id'], string> = { soft: c.accent2, medium: accent, stiff: c.accent3 }

  const measurements: Measurement[] = [
    { id: 'm', label: t(`${P}.m.load`), value: fmt(h.massG, 0), unit: 'g', sub: t(`${P}.m.weight`, { value: fmt(h.force, 2) }) },
    { id: 'x', label: t(`${P}.m.extension`), value: fmt(xCm, 1), unit: 'cm', tone: 'accent', sub: t(`${P}.m.length`, { value: fmt((spring.length + h.extension) * 100, 1) }) },
    {
      id: 'k',
      label: t(`${P}.m.measuredK`),
      value: h.measuredK === null ? '—' : fmt(h.measuredK, 1),
      unit: 'N/m',
      sub: h.measuredK === null ? t(`${P}.m.needReadings`) : t(`${P}.m.fromReadings`, { count: h.ownReadings.length }),
    },
    { id: 'E', label: t(`${P}.m.energy`), value: fmtSig(h.energy, 3), unit: 'J' },
    {
      id: 'state',
      label: t(`${P}.m.state`),
      value: h.overLimit ? t(`${P}.m.overstretched`) : t(`${P}.m.elastic`),
      tone: h.overLimit ? 'warn' : 'default',
      sub: h.overLimit ? t(`${P}.m.permanent`, { value: fmt(h.permanentSet * 100, 1) }) : t(`${P}.m.limit`, { value: fmt(spring.limit, 1) }),
    },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'fx',
      title: t(`${P}.chart.fx`),
      data: { line: curve, points },
      caption: t(`${P}.chart.fxCaption`),
      render: (d: { line: typeof curve; points: typeof points }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="extension" type="number" domain={[0, 'auto']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.extension`))} {...axisProps(c)} />
            <YAxis dataKey="force" type="number" domain={[0, F_CHART]} width={52} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.force`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [fmt(Number(v), 2), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine y={spring.limit} stroke={c.accent2} strokeDasharray="5 4" label={{ value: t(`${P}.chart.limit`), fill: c.accent2, fontSize: 11, position: 'insideTopLeft' }} />
            <Line data={d.line} dataKey="force" name={t(`${P}.chart.model`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.points} dataKey="force" name={t(`${P}.chart.readings`)} fill={c.accent2} isAnimationActive={false} />
            <ReferenceDot x={xCm} y={h.force} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-hookes-law-readings',
        headers: ['spring', 'mass_g', 'force_N', 'extension_m'],
        rows: h.readings.map((r) => [r.spring, r.mass, r.force, r.extension]),
      }),
    },
    {
      id: 'springs',
      title: t(`${P}.chart.compare`),
      data: allSprings,
      caption: t(`${P}.chart.compareCaption`),
      render: (d: typeof allSprings) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="mass" type="number" domain={[0, MASS_MAX]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.mass`))} {...axisProps(c)} />
            <YAxis width={52} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.extension`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 0)} g`} formatter={(v, n) => [`${fmt(Number(v), 1)} cm`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            {SPRINGS.map((s) => (
              <Line key={s.id} dataKey={s.id} name={t(`${P}.springs.${s.id}`)} stroke={springColors[s.id]} strokeWidth={s.id === h.springId ? 3 : 1.5} dot={false} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-hookes-law-springs',
        headers: ['mass_g', ...SPRINGS.map((s) => `${s.id}_extension_cm`)],
        rows: allSprings.map((r) => [r.mass, ...SPRINGS.map((s) => r[s.id])]),
      }),
    },
    {
      id: 'energy',
      title: t(`${P}.chart.energy`),
      data: energyCurve,
      caption: t(`${P}.chart.energyCaption`),
      render: (d: typeof energyCurve) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.extension`))} {...axisProps(c)} />
            <YAxis width={56} tickFormatter={(v) => fmtSig(v, 2)} label={L.y(t(`${P}.axis.energy`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `x = ${fmt(Number(v), 1)} cm`} formatter={(v) => [`${fmtSig(Number(v), 3)} J`, 'E']} />
            <Line dataKey="E" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            {!h.overLimit && <ReferenceDot x={xCm} y={h.energy} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-hookes-law-energy', headers: ['extension_cm', 'energy_J'], rows: energyCurve.map((r) => [r.x, r.E]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'hooke',
      title: 'F = k x',
      expression: (
        <>
          <V>F</V> = <V>k</V> · <V>x</V>
        </>
      ),
      substituted: h.overLimit ? (
        <>{t(`${P}.f.beyondLimit`)}</>
      ) : (
        <>
          {fmt(spring.k, 0)} N/m × {fmt(h.extension, 3)} m = <b>{fmt(h.force, 2)} N</b>
        </>
      ),
      variables: [
        { symbol: <V>F</V>, name: t(`${P}.f.F`), unit: 'N', value: fmt(h.force, 2) },
        { symbol: <V>k</V>, name: t(`${P}.f.k`), unit: 'N/m', value: fmt(spring.k, 0), effect: t(`${P}.f.kEffect`) },
        { symbol: <V>x</V>, name: t(`${P}.f.x`), unit: 'm', value: fmt(h.extension, 3) },
      ],
      explanation: t(`${P}.f.hookeExplain`),
    },
    {
      id: 'weight',
      title: 'F = m g',
      expression: (
        <>
          <V>F</V> = <V>m</V> · <V>g</V>
        </>
      ),
      substituted: (
        <>
          {fmt(h.massG / 1000, 2)} kg × {fmt(G, 2)} m/s² = <b>{fmt(h.force, 2)} N</b>
        </>
      ),
      variables: [
        { symbol: <V>m</V>, name: t(`${P}.f.m`), unit: 'kg', value: fmt(h.massG / 1000, 2) },
        { symbol: <V>g</V>, name: t(`${P}.f.g`), unit: 'm/s²', value: fmt(G, 2) },
      ],
      explanation: t(`${P}.f.weightExplain`),
    },
    {
      id: 'energy',
      title: 'E = ½ k x²',
      expression: (
        <>
          <V>E</V> = ½<V>k</V><V>x</V>
          <Sup>2</Sup>
        </>
      ),
      substituted: (
        <>
          ½ × {fmt(spring.k, 0)} × {fmt(h.extension - h.permanentSet, 3)}² = <b>{fmtSig(h.energy, 3)} J</b>
        </>
      ),
      variables: [
        { symbol: <V>E</V>, name: t(`${P}.f.E`), unit: 'J', value: fmtSig(h.energy, 3) },
        { symbol: <V>x</V>, name: t(`${P}.f.x`), unit: 'm', value: fmt(h.extension, 3) },
      ],
      explanation: t(`${P}.f.energyExplain`),
    },
  ]

  const springPicker = (large = false) => (
    <Segmented
      label={t(`${P}.p.spring`)}
      value={h.springId}
      onChange={h.chooseSpring}
      options={SPRINGS.map((s) => ({ value: s.id, label: t(`${P}.springs.${s.id}`) }))}
      size={large ? 'lg' : 'md'}
    />
  )

  const controls = (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.spring`)}</span>
        {springPicker()}
        <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.springHint`)}</p>
      </div>
      <ParamSlider label={t(`${P}.p.mass`)} value={h.massG} min={0} max={MASS_MAX} step={MASS_STEP} unit="g" onChange={h.setMass} accent={accent} />
      {h.overLimit && (
        <div role="status" className="flex flex-col gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-xs leading-relaxed text-ink">
          {t(`${P}.overloaded`, { value: fmt(h.permanentSet * 100, 1) })}
          <Button size="sm" variant="secondary" onClick={h.replaceSpring}>
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
            {t(`${P}.newSpring`)}
          </Button>
        </div>
      )}
      <RecordBox count={h.readings.length} title={t(`${P}.readings`, { count: h.ownReadings.length })} hint={t(`${P}.recordHint`)} onRecord={h.record} onClear={h.clearReadings} />
    </>
  )

  const presenterControls = (
    <>
      {springPicker(true)}
      <div className="min-w-[260px] flex-1">
        <ParamSlider large label={t(`${P}.p.mass`)} value={h.massG} min={0} max={MASS_MAX} step={MASS_STEP} unit="g" onChange={h.setMass} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [1.0, 2.0, 6.0], target: [0, 1.55, 0] }}
      scene={<HookesLawScene sys={h.sys} labels={{ ruler: t(`${P}.ruler`), limit: h.overLimit ? t(`${P}.overLabel`) : null }} />}
      fallback2D={<HookesLaw2D sys={h.sys} label={t('lab.view2d', { name: t('catalog.hookes-law.title') })} />}
      controls={{ running: h.running, onTogglePlay: h.togglePlay, onReset: h.reset }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ spring: h.springId, mass: h.massG }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[3], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.spring`), value: `${t(`${P}.springs.${h.springId}`)} (k = ${spring.k} N/m, limit ${spring.limit} N)` },
        { label: t(`${P}.p.mass`), value: fmt(h.massG, 0), unit: 'g' },
        { label: 'Over elastic limit', value: h.overLimit ? 'yes' : 'no' },
        { label: 'Recorded readings (g → cm)', value: h.ownReadings.length ? h.ownReadings.slice(-8).map((r) => `${r.mass} g → ${fmt(r.extension * 100, 1)} cm`).join('; ') : 'none' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: h.running,
        togglePlay: h.togglePlay,
        reset: h.reset,
        increase: () => h.setMass(Math.min(MASS_MAX, h.massG + MASS_STEP)),
        decrease: () => h.setMass(Math.max(0, h.massG - MASS_STEP)),
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
