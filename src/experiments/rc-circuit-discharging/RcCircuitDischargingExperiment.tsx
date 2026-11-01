import { Power } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { dischargeCurve, dischargeVoltage, fractionLeft } from '../../engines/rcCircuitDischarging'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { SPEEDS, useRcCircuitDischarging } from './useRcCircuitDischarging'
import { RcCircuitDischargingScene } from './RcCircuitDischargingScene'
import { RcCircuitDischarging2D } from './RcCircuitDischarging2D'

const P = 'exp.rc-circuit-discharging'

export default function RcCircuitDischargingExperiment() {
  const { t } = useTranslation()
  const h = useRcCircuitDischarging()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'rc-circuit-discharging')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const span = 5 * h.tau

  const model = useMemo(() => dischargeCurve(h.start, h.R, h.C, span, 121), [h.start, h.R, h.C, span])
  const compare = useMemo(
    () =>
      Array.from({ length: 101 }, (_, i) => {
        const tt = (span * i) / 100
        return {
          t: tt,
          half: dischargeVoltage(tt, h.start, h.R / 2, h.C),
          same: dischargeVoltage(tt, h.start, h.R, h.C),
          double: dischargeVoltage(tt, h.start, h.R * 2, h.C),
        }
      }),
    [h.start, h.R, h.C, span],
  )
  const trace = h.trace.slice()
  const pts = h.readings.filter((r) => r.R === h.Rk && r.C === h.CuF && r.V0 === h.start)

  const measurements: Measurement[] = [
    { id: 't', label: t(`${P}.m.time`), value: fmt(h.t, 2), unit: 's', sub: t(`${P}.m.inTau`, { value: fmt(h.t / h.tau, 2) }) },
    { id: 'Vc', label: t(`${P}.m.vc`), value: fmt(h.Vc, 2), unit: 'V', tone: 'accent', sub: t(`${P}.m.percent`, { value: fmt(h.percent, 1) }) },
    { id: 'I', label: t(`${P}.m.current`), value: fmtSig(h.I * 1000, 3), unit: 'mA', sub: h.discharging ? t(`${P}.m.direction`) : t(`${P}.m.atA`) },
    { id: 'Q', label: t(`${P}.m.charge`), value: fmtSig(h.Q * 1e6, 3), unit: 'µC' },
    { id: 'tau', label: t(`${P}.m.tau`), value: fmtSig(h.tau, 3), unit: 's', sub: t(`${P}.m.fiveTau`, { value: fmtSig(5 * h.tau, 3) }) },
    { id: 'E', label: t(`${P}.m.energy`), value: fmtSig(h.energy * 1000, 3), unit: 'mJ', sub: t(`${P}.m.heat`, { value: fmtSig(h.heat * 1000, 3) }) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'vt',
      title: t(`${P}.chart.vt`),
      data: { model, trace, pts },
      caption: t(`${P}.chart.vtCaption`),
      render: (d: { model: typeof model; trace: typeof trace; pts: typeof pts }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, span]} tickFormatter={(v) => fmtSig(v, 2)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis yAxisId="v" type="number" domain={[0, Math.ceil(Math.max(h.V0, h.start))]} width={44} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.voltage`))} {...axisProps(c)} />
            <YAxis yAxisId="i" orientation="right" type="number" domain={['auto', 0]} width={52} tickFormatter={(v) => fmtSig(v, 2)} label={L.yRight(t(`${P}.axis.current`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmtSig(Number(v), 3)} s`} formatter={(v, n) => [fmtSig(Number(v), 3), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine yAxisId="v" x={h.tau} stroke={c.accent3} strokeDasharray="4 4" label={{ value: 'τ', fill: c.accent3, fontSize: 12, position: 'top' }} />
            <ReferenceLine yAxisId="v" y={h.start * fractionLeft(1)} stroke={c.accent3} strokeDasharray="2 4" />
            <Line yAxisId="v" data={d.model} dataKey="Vc" name={t(`${P}.chart.modelV`)} stroke={accent} strokeOpacity={0.45} strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="i" data={d.model} dataKey="I" name={t(`${P}.chart.modelI`)} stroke={c.accent2} strokeOpacity={0.45} strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="v" data={d.trace} dataKey="Vc" name={t(`${P}.chart.liveV`)} stroke={accent} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Line yAxisId="i" data={d.trace} dataKey="I" name={t(`${P}.chart.liveI`)} stroke={c.accent2} strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <Scatter yAxisId="v" data={d.pts} dataKey="Vc" name={t(`${P}.chart.readings`)} fill={c.marker} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-rc-discharging',
        headers: ['t_s', 'Vc_V', 'I_mA'],
        rows: h.trace.map((r) => [r.t, r.Vc, r.I]),
      }),
    },
    {
      id: 'compare',
      title: t(`${P}.chart.compare`),
      data: compare,
      caption: t(`${P}.chart.compareCaption`),
      render: (d: typeof compare) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, span]} tickFormatter={(v) => fmtSig(v, 2)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis width={44} domain={[0, Math.ceil(Math.max(h.V0, h.start))]} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.voltage`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmtSig(Number(v), 3)} s`} formatter={(v, n) => [`${fmt(Number(v), 2)} V`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="half" name={t(`${P}.chart.halfR`)} stroke={c.accent2} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line dataKey="same" name={t(`${P}.chart.thisR`)} stroke={accent} strokeWidth={3} dot={false} isAnimationActive={false} />
            <Line dataKey="double" name={t(`${P}.chart.doubleR`)} stroke={c.accent3} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-rc-discharging-compare', headers: ['t_s', 'Vc_halfR_V', 'Vc_V', 'Vc_doubleR_V'], rows: compare.map((r) => [r.t, r.half, r.same, r.double]) }),
    },
  ]

  const e1 = Math.exp(-h.t / h.tau)
  const formulas: Formula[] = [
    {
      id: 'vc',
      title: 'V_C = V₀ e^(−t/RC)',
      expression: (
        <>
          <V>V</V>
          <Sub>C</Sub> = <V>V</V>
          <Sub>0</Sub> <V>e</V>
          <Sup>−t/RC</Sup>
        </>
      ),
      substituted: (
        <>
          {fmt(h.start, 1)} V × e<Sup>−{fmt(h.t, 2)}/{fmtSig(h.tau, 3)}</Sup> = <b>{fmt(h.start * e1, 2)} V</b>
        </>
      ),
      variables: [
        { symbol: <V>V₀</V>, name: t(`${P}.f.V0`), unit: 'V', value: fmt(h.start, 1) },
        { symbol: <V>t</V>, name: t(`${P}.f.t`), unit: 's', value: fmt(h.t, 2) },
        { symbol: <V>RC</V>, name: t(`${P}.f.tau`), unit: 's', value: fmtSig(h.tau, 3) },
      ],
      explanation: t(`${P}.f.vcExplain`),
    },
    {
      id: 'i',
      title: 'I = −(V₀/R) e^(−t/RC)',
      expression: (
        <>
          <V>I</V> = −(<V>V</V>
          <Sub>0</Sub>/<V>R</V>) <V>e</V>
          <Sup>−t/RC</Sup>
        </>
      ),
      substituted: (
        <>
          −({fmt(h.start, 1)} V / {fmt(h.Rk, 1)} kΩ) × {fmtSig(e1, 3)} = <b>{fmtSig(-(h.start / h.R) * e1 * 1000, 3)} mA</b>
        </>
      ),
      variables: [
        { symbol: <V>I</V>, name: t(`${P}.f.I`), unit: 'mA', value: fmtSig(h.I * 1000, 3) },
        { symbol: <V>R</V>, name: t(`${P}.f.R`), unit: 'kΩ', value: fmt(h.Rk, 1), effect: t(`${P}.f.rEffect`) },
      ],
      explanation: t(`${P}.f.iExplain`),
    },
    {
      id: 'tau',
      title: 'τ = R C',
      expression: (
        <>
          τ = <V>R</V> · <V>C</V>
        </>
      ),
      substituted: (
        <>
          {fmt(h.Rk, 1)} kΩ × {fmt(h.CuF, 0)} µF = <b>{fmtSig(h.tau, 3)} s</b>
        </>
      ),
      variables: [
        { symbol: <V>R</V>, name: t(`${P}.f.R`), unit: 'Ω', value: fmtSig(h.R, 3) },
        { symbol: <V>C</V>, name: t(`${P}.f.C`), unit: 'F', value: fmtSig(h.C, 3), effect: t(`${P}.f.cEffect`) },
      ],
      explanation: t(`${P}.f.tauExplain`),
    },
    {
      id: 'energy',
      title: 'E = ½ C V²',
      expression: (
        <>
          <V>E</V> = ½<V>C</V>
          <V>V</V>
          <Sub>C</Sub>
          <Sup>2</Sup>
        </>
      ),
      substituted: (
        <>
          ½ × {fmt(h.CuF, 0)} µF × ({fmt(h.Vc, 2)} V)² = <b>{fmtSig(h.energy * 1000, 3)} mJ</b>
        </>
      ),
      variables: [
        { symbol: <V>E</V>, name: t(`${P}.f.E`), unit: 'mJ', value: fmtSig(h.energy * 1000, 3) },
        { symbol: <V>Q</V>, name: t(`${P}.f.Q`), unit: 'µC', value: fmtSig(h.Q * 1e6, 3) },
        { symbol: <V>W</V>, name: t(`${P}.f.heat`), unit: 'mJ', value: fmtSig(h.heat * 1000, 3) },
      ],
      explanation: t(`${P}.f.energyExplain`),
    },
  ]

  const switchButton = (large = false) => (
    <Button size={large ? 'lg' : 'md'} variant={h.discharging ? 'secondary' : 'primary'} onClick={h.flip}>
      <Power className="h-4 w-4" aria-hidden />
      {h.discharging ? t(`${P}.toA`) : t(`${P}.toB`)}
    </Button>
  )

  const sliders = (large = false) => (
    <>
      <ParamSlider large={large} label={t(`${P}.p.voltage`)} value={h.V0} min={1} max={12} step={0.5} unit="V" onChange={h.setV0} accent={accent} />
      <ParamSlider large={large} label={t(`${P}.p.resistance`)} value={h.Rk} min={1} max={100} step={1} unit="kΩ" onChange={h.setRk} accent={accent} />
      <ParamSlider large={large} label={t(`${P}.p.capacitance`)} value={h.CuF} min={100} max={2200} step={10} unit="µF" onChange={h.setCuF} accent={accent} />
    </>
  )

  const controls = (
    <>
      {switchButton()}
      {sliders()}
      <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.hint`)}</p>
      <RecordBox count={h.readings.length} title={t(`${P}.readings`, { count: h.readings.length })} hint={t(`${P}.recordHint`)} onRecord={h.record} onClear={h.clearReadings} />
    </>
  )

  const presenterControls = (
    <>
      {switchButton(true)}
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t(`${P}.p.resistance`)} value={h.Rk} min={1} max={100} step={1} unit="kΩ" onChange={h.setRk} accent={accent} />
      </div>
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t(`${P}.p.capacitance`)} value={h.CuF} min={100} max={2200} step={10} unit="µF" onChange={h.setCuF} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.2, 3.3, 3.7], target: [0, 0.2, 0.1] }}
      scene={
        <RcCircuitDischargingScene
          live={h.live}
          labels={{
            volts: `${fmt(h.V0, 1)} V`,
            voltmeter: t(`${P}.voltmeter`),
            vReading: `${fmt(h.Vc, 2)} V`,
            ammeter: t(`${P}.ammeter`),
            aReading: `${fmtSig(h.I * 1000, 3)} mA`,
            switchState: h.discharging ? t(`${P}.switchB`) : t(`${P}.switchA`),
          }}
        />
      }
      fallback2D={<RcCircuitDischarging2D live={h.live} label={t('lab.view2d', { name: t('catalog.rc-circuit-discharging.title') })} texts={{ R: `R = ${fmt(h.Rk, 0)} kΩ`, C: `C = ${fmt(h.CuF, 0)} µF`, V: `${fmt(h.V0, 1)} V` }} />}
      controls={{ running: h.running, onTogglePlay: h.togglePlay, onReset: h.reset, speed: h.speed, speeds: SPEEDS, onSpeed: h.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ voltage: h.V0, resistance: h.Rk, capacitance: h.CuF }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.voltage`), value: fmt(h.V0, 1), unit: 'V' },
        { label: t(`${P}.p.resistance`), value: fmt(h.Rk, 0), unit: 'kΩ' },
        { label: t(`${P}.p.capacitance`), value: fmt(h.CuF, 0), unit: 'µF' },
        { label: 'Switch', value: h.discharging ? 'B (discharging through R)' : 'A (charged by battery)' },
        { label: 'Time since switching to B', value: `${fmt(h.t, 2)} s (${fmt(h.t / h.tau, 2)} τ)` },
        { label: 'Capacitor voltage', value: fmt(h.Vc, 2), unit: 'V' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: h.running,
        togglePlay: h.togglePlay,
        reset: h.reset,
        increase: () => h.setRk(Math.min(100, h.Rk + 5)),
        decrease: () => h.setRk(Math.max(1, h.Rk - 5)),
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
