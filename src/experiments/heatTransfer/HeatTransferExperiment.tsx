import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { AREA, MATERIALS, diffusivity, materialById, steadyHeatFlow, timeConstant, type Material } from '../../engines/heatTransfer'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { SPEEDS, T_COLD, useHeatTransfer } from './useHeatTransfer'
import { HeatTransferScene } from './HeatTransferScene'
import { HeatTransfer2D } from './HeatTransfer2D'

const P = 'exp.heat-transfer'

function clock(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : fmt(s, 1)
}

export default function HeatTransferExperiment() {
  const { t } = useTranslation()
  const h = useHeatTransfer()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'heat-transfer')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const { a, b, tHot, length } = h.settings
  const mA = materialById(a)
  const mB = materialById(b)
  const name = (id: Material['id']) => t(`${P}.materials.${id}`)
  const colA = c.accent2
  const colB = accent

  const profile = h.profileA.map((p, i) => ({ x: p.x * 100, a: p.T, b: h.profileB[i].T, steady: tHot + ((T_COLD - tHot) * p.x) / length }))
  const flows = useMemo(
    () => MATERIALS.map((m) => ({ id: m.id, name: t(`${P}.materials.${m.id}`), P: steadyHeatFlow(m, length, tHot, T_COLD) })),
    [length, tHot, t],
  )

  const measurements: Measurement[] = [
    { id: 't', label: t(`${P}.m.time`), value: clock(h.time), unit: h.time >= 60 ? 'min' : 's', sub: t(`${P}.m.speed`, { value: h.speed }) },
    { id: 'a', label: t(`${P}.m.probe`, { name: name(a) }), value: fmt(h.probeA, 1), unit: '°C', tone: 'accent' },
    { id: 'b', label: t(`${P}.m.probe`, { name: name(b) }), value: fmt(h.probeB, 1), unit: '°C' },
    { id: 'pa', label: t(`${P}.m.flow`, { name: name(a) }), value: fmtSig(Math.max(0, h.flowA), 3), unit: 'W', sub: t(`${P}.m.steady`, { value: fmtSig(h.steadyA, 3) }) },
    { id: 'pb', label: t(`${P}.m.flow`, { name: name(b) }), value: fmtSig(Math.max(0, h.flowB), 3), unit: 'W', sub: t(`${P}.m.steady`, { value: fmtSig(h.steadyB, 3) }) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'probe',
      title: t(`${P}.chart.probe`),
      data: h.log,
      caption: t(`${P}.chart.probeCaption`),
      render: (d: typeof h.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[T_COLD, tHot]} width={48} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.temperature`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 0)} s`} formatter={(v, n) => [`${fmt(Number(v), 1)} °C`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="a" name={name(a)} stroke={colA} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="b" name={name(b)} stroke={colB} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-heat-transfer-probes', headers: ['t_s', `${a}_mid_C`, `${b}_mid_C`], rows: h.log.map((s) => [s.t, s.a, s.b]) }),
    },
    {
      id: 'profile',
      title: t(`${P}.chart.profile`),
      data: profile,
      caption: t(`${P}.chart.profileCaption`),
      render: (d: typeof profile) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={[0, length * 100]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.position`))} {...axisProps(c)} />
            <YAxis domain={[T_COLD, tHot]} width={48} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.temperature`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `x = ${fmt(Number(v), 1)} cm`} formatter={(v, n) => [`${fmt(Number(v), 1)} °C`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="steady" name={t(`${P}.chart.steadyLine`)} stroke={c.axis} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            <Line dataKey="a" name={name(a)} stroke={colA} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="b" name={name(b)} stroke={colB} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-heat-transfer-profile', headers: ['x_cm', `${a}_C`, `${b}_C`], rows: profile.map((p) => [p.x, p.a, p.b]) }),
    },
    {
      id: 'materials',
      title: t(`${P}.chart.materials`),
      data: flows,
      caption: t(`${P}.chart.materialsCaption`),
      render: (d: typeof flows) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...axisProps(c)} />
            <YAxis scale="log" domain={[0.001, 'auto']} allowDataOverflow width={56} tickFormatter={(v) => fmtSig(v, 1)} label={L.y(t(`${P}.axis.flow`))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v) => [`${fmtSig(Number(v), 3)} W`, t(`${P}.chart.flow`)]} />
            <Bar dataKey="P" isAnimationActive={false}>
              {d.map((row) => (
                <Cell key={row.id} fill={row.id === a ? colA : row.id === b ? colB : c.grid} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-heat-flow-by-material', headers: ['material', 'steady_heat_flow_W'], rows: flows.map((r) => [r.id, r.P]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'fourier',
      title: t(`${P}.f.fourierTitle`),
      expression: (
        <>
          <V>P</V> = <V>k</V><V>A</V> <Frac n={<><V>T</V><sub className="text-[0.7em]">hot</sub> − <V>T</V><sub className="text-[0.7em]">cold</sub></>} d={<V>L</V>} />
        </>
      ),
      substituted: (
        <>
          {fmt(mA.k, mA.k < 10 ? 2 : 0)} × 10⁻⁴ × {fmt(tHot - T_COLD, 0)} / {fmt(length, 2)} = <b>{fmtSig(h.steadyA, 3)} W</b>
        </>
      ),
      variables: [
        { symbol: <V>P</V>, name: t(`${P}.f.P`), unit: 'W', value: fmtSig(h.steadyA, 3) },
        { symbol: <V>k</V>, name: t(`${P}.f.k`, { name: name(a) }), unit: 'W/(m·K)', value: fmt(mA.k, mA.k < 10 ? 2 : 0), effect: t(`${P}.f.kEffect`) },
        { symbol: <V>A</V>, name: t(`${P}.f.A`), unit: 'm²', value: fmtSig(AREA, 2) },
        { symbol: <V>L</V>, name: t(`${P}.f.L`), unit: 'm', value: fmt(length, 2), effect: t(`${P}.f.Leffect`) },
      ],
      explanation: t(`${P}.f.fourierExplain`),
    },
    {
      id: 'diffusivity',
      title: t(`${P}.f.diffTitle`),
      expression: (
        <>
          <V>α</V> = <Frac n={<V>k</V>} d={<><V>ρ</V><V>c</V></>} />
        </>
      ),
      substituted: (
        <>
          {name(a)}: <b>{fmtSig(diffusivity(mA), 3)} m²/s</b> · {name(b)}: <b>{fmtSig(diffusivity(mB), 3)} m²/s</b>
        </>
      ),
      variables: [
        { symbol: <V>ρ</V>, name: t(`${P}.f.rho`), unit: 'kg/m³', value: `${fmt(mA.rho, 0)} / ${fmt(mB.rho, 0)}` },
        { symbol: <V>c</V>, name: t(`${P}.f.c`), unit: 'J/(kg·K)', value: `${fmt(mA.c, 0)} / ${fmt(mB.c, 0)}` },
      ],
      explanation: t(`${P}.f.diffExplain`),
    },
    {
      id: 'time',
      title: t(`${P}.f.timeTitle`),
      expression: (
        <>
          <V>τ</V> ≈ <Frac n={<><V>L</V><Sup>2</Sup></>} d={<>π<Sup>2</Sup><V>α</V></>} />
        </>
      ),
      substituted: (
        <>
          {name(a)}: <b>{clock(timeConstant(mA, length))}</b> · {name(b)}: <b>{clock(timeConstant(mB, length))}</b>
        </>
      ),
      variables: [{ symbol: <V>τ</V>, name: t(`${P}.f.tau`), unit: 's', value: fmtSig(timeConstant(mA, length), 3) }],
      explanation: t(`${P}.f.timeExplain`),
    },
  ]

  const options = MATERIALS.map((m) => ({ value: m.id, label: name(m.id) }))
  const controls = (
    <>
      <SelectField label={t(`${P}.p.a`)} value={a} options={options} onChange={h.setA} />
      <SelectField label={t(`${P}.p.b`)} value={b} options={options} onChange={h.setB} />
      <ParamSlider label={t(`${P}.p.hot`)} value={tHot} min={40} max={100} step={5} unit="°C" onChange={h.setHot} hint={t(`${P}.p.hotHint`)} accent={accent} />
      <ParamSlider label={t(`${P}.p.length`)} value={length * 100} min={10} max={40} step={5} unit="cm" onChange={(v) => h.setLength(v / 100)} accent={accent} />
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.hot`)} value={tHot} min={40} max={100} step={5} unit="°C" onChange={h.setHot} accent={accent} />
      </div>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.length`)} value={length * 100} min={10} max={40} step={5} unit="cm" onChange={(v) => h.setLength(v / 100)} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 2.4, 5.8], target: [0, 0.45, 0] }}
      scene={
        <HeatTransferScene
          a={h.rods.a}
          b={h.rods.b}
          tHot={tHot}
          labels={{
            a: `${name(a)} · ${fmt(h.probeA, 1)} °C`,
            b: `${name(b)} · ${fmt(h.probeB, 1)} °C`,
            hot: `${fmt(tHot, 0)} °C`,
            cold: `${T_COLD} °C`,
          }}
        />
      }
      fallback2D={<HeatTransfer2D a={h.rods.a} b={h.rods.b} tHot={tHot} label={t('lab.view2d', { name: t('catalog.heat-transfer.title') })} names={[name(a), name(b)]} />}
      controls={{ running: h.running, onTogglePlay: h.togglePlay, onReset: h.reset, speed: h.speed, speeds: SPEEDS, onSpeed: h.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ a, b, tHot, length }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.a`), value: a },
        { label: t(`${P}.p.b`), value: b },
        { label: t(`${P}.p.hot`), value: fmt(tHot, 0), unit: '°C' },
        { label: t(`${P}.p.length`), value: fmt(length * 100, 0), unit: 'cm' },
        { label: 'Elapsed (simulated)', value: fmt(h.time, 0), unit: 's' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: h.running,
        togglePlay: h.togglePlay,
        reset: h.reset,
        increase: () => h.setHot(Math.min(100, tHot + 5)),
        decrease: () => h.setHot(Math.max(40, tHot - 5)),
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
