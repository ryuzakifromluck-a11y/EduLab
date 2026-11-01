import { Plus, Power, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { currentResistanceSeries, powerVoltageSeries, voltageCurrentSeries } from '../../engines/ohm'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtSig } from '../../lib/format'
import { R_MAX, R_MIN, V_MAX, useOhm } from './useOhm'
import { OhmScene } from './OhmScene'
import { Circuit2D } from './Circuit2D'
import { clsx } from 'clsx'

export default function OhmExperiment() {
  const { t } = useTranslation()
  const o = useOhm()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'ohms-law')!
  const accent = c.physics
  const { current, power, resistorVoltage } = o.reading

  const vi = useMemo(() => voltageCurrentSeries(o.resistance, V_MAX), [o.resistance])
  const ir = useMemo(() => currentResistanceSeries(o.voltage, R_MIN, R_MAX), [o.voltage])
  const pv = useMemo(() => powerVoltageSeries(o.resistance, V_MAX), [o.resistance])

  const ampsLabel = `${fmtSig(current, 3)} A`
  const voltsLabel = `${fmt(resistorVoltage, 2)} V`

  const switchButton = (large = false) => (
    <Button
      variant={o.closed ? 'primary' : 'secondary'}
      onClick={o.toggleSwitch}
      aria-pressed={o.closed}
      className={clsx(large ? 'h-16 px-6 text-xl' : 'w-full')}
    >
      <Power className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
      {o.closed ? t('exp.ohm.openSwitch') : t('exp.ohm.closeSwitch')}
    </Button>
  )

  const measurements: Measurement[] = [
    { id: 'v', label: t('exp.ohm.m.voltage'), value: fmt(o.voltage, 1), unit: 'V', sub: t('exp.ohm.m.acrossR', { value: voltsLabel }) },
    { id: 'r', label: t('exp.ohm.m.resistance'), value: fmt(o.resistance, 0), unit: 'Ω' },
    {
      id: 'i',
      label: t('exp.ohm.m.current'),
      value: fmtSig(current, 3),
      unit: 'A',
      tone: 'accent',
      sub: current > 0 ? `${fmt(current * 1000, 0)} mA` : t('exp.ohm.m.noCurrent'),
    },
    { id: 'p', label: t('exp.ohm.m.power'), value: fmtSig(power, 3), unit: 'W' },
    {
      id: 'state',
      label: t('exp.ohm.m.circuit'),
      value: o.closed ? t('exp.ohm.closed') : t('exp.ohm.open'),
      tone: o.closed ? 'default' : 'warn',
    },
  ]

  const ttip = tooltipProps(c)
  const xLabel = (value: string) => ({ value, position: 'insideBottom' as const, offset: -10, fill: c.text, fontSize: 12 })
  const yLabel = (value: string) => ({ value, angle: -90, position: 'insideLeft' as const, offset: 12, fill: c.text, fontSize: 12, style: { textAnchor: 'middle' as const } })

  const charts: ChartDef<any>[] = [
    {
      id: 'vi',
      title: t('exp.ohm.chart.vi'),
      data: { line: vi, points: o.readings.filter((r) => r.resistance === o.resistance) },
      caption: t('exp.ohm.chart.viCaption'),
      render: (d: { line: typeof vi; points: typeof o.readings }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="voltage" type="number" domain={[0, V_MAX]} tickFormatter={(v) => fmt(v, 0)} label={xLabel(t('exp.ohm.axis.voltage'))} {...axisProps(c)} />
            <YAxis dataKey="current" type="number" width={60} tickFormatter={(v) => fmtSig(v, 2)} label={yLabel(t('exp.ohm.axis.current'))} {...axisProps(c)} />
            <Tooltip {...ttip} formatter={(v, n) => [fmtSig(Number(v), 3), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.line} dataKey="current" name={t('exp.ohm.chart.theory', { r: fmt(o.resistance, 0) })} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.points} dataKey="current" name={t('exp.ohm.chart.recorded')} fill={c.accent2} isAnimationActive={false} />
            {o.closed && <ReferenceDot x={o.voltage} y={current} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-ohms-law-readings',
        headers: ['voltage_V', 'resistance_ohm', 'current_A', 'power_W'],
        rows: (o.readings.length ? o.readings : [{ voltage: o.voltage, resistance: o.resistance, current, power }]).map((r) => [r.voltage, r.resistance, r.current, r.power]),
      }),
    },
    {
      id: 'ir',
      title: t('exp.ohm.chart.ir'),
      data: ir,
      caption: t('exp.ohm.chart.irCaption'),
      render: (d: typeof ir) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="resistance" type="number" domain={[0, R_MAX]} tickFormatter={(v) => fmt(v, 0)} label={xLabel(t('exp.ohm.axis.resistance'))} {...axisProps(c)} />
            <YAxis width={60} tickFormatter={(v) => fmtSig(v, 2)} label={yLabel(t('exp.ohm.axis.current'))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `R = ${fmt(Number(v), 0)} Ω`} formatter={(v) => [`${fmtSig(Number(v), 3)} A`, 'I']} />
            <Line dataKey="current" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            {o.closed && <ReferenceDot x={o.resistance} y={current} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-ohms-law-current-vs-resistance',
        headers: ['resistance_ohm', 'current_A'],
        rows: ir.map((r) => [r.resistance, r.current]),
      }),
    },
    {
      id: 'pv',
      title: t('exp.ohm.chart.pv'),
      data: pv,
      caption: t('exp.ohm.chart.pvCaption'),
      render: (d: typeof pv) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="voltage" type="number" domain={[0, V_MAX]} tickFormatter={(v) => fmt(v, 0)} label={xLabel(t('exp.ohm.axis.voltage'))} {...axisProps(c)} />
            <YAxis width={60} tickFormatter={(v) => fmtSig(v, 2)} label={yLabel(t('exp.ohm.axis.power'))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `V = ${fmt(Number(v), 1)} V`} formatter={(v) => [`${fmtSig(Number(v), 3)} W`, 'P']} />
            <Line dataKey="power" stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
            {o.closed && <ReferenceDot x={o.voltage} y={power} r={6} fill={c.accent2} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-ohms-law-power-vs-voltage',
        headers: ['voltage_V', 'power_W'],
        rows: pv.map((r) => [r.voltage, r.power]),
      }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'current',
      title: 'I = V / R',
      expression: (
        <>
          <V>I</V> = <V>V</V> / <V>R</V>
        </>
      ),
      substituted: o.closed ? (
        <>
          {fmt(o.voltage, 1)} V / {fmt(o.resistance, 0)} Ω = <b>{fmtSig(current, 3)} A</b>
        </>
      ) : (
        <>{t('exp.ohm.f.openCircuit')}</>
      ),
      variables: [
        { symbol: <V>I</V>, name: t('exp.ohm.f.I'), unit: 'A', value: fmtSig(current, 3) },
        { symbol: <V>V</V>, name: t('exp.ohm.f.V'), unit: 'V', value: fmt(o.voltage, 1), effect: t('exp.ohm.f.Veffect') },
        { symbol: <V>R</V>, name: t('exp.ohm.f.R'), unit: 'Ω', value: fmt(o.resistance, 0), effect: t('exp.ohm.f.Reffect') },
      ],
      explanation: t('exp.ohm.f.currentExplain'),
    },
    {
      id: 'voltage',
      title: 'V = I R',
      expression: (
        <>
          <V>V</V> = <V>I</V> · <V>R</V>
        </>
      ),
      substituted: (
        <>
          {fmtSig(current, 3)} A × {fmt(o.resistance, 0)} Ω = <b>{fmt(resistorVoltage, 2)} V</b>
        </>
      ),
      variables: [
        { symbol: <V>V</V>, name: t('exp.ohm.f.Vr'), unit: 'V', value: fmt(resistorVoltage, 2) },
        { symbol: <V>I</V>, name: t('exp.ohm.f.I'), unit: 'A', value: fmtSig(current, 3) },
        { symbol: <V>R</V>, name: t('exp.ohm.f.R'), unit: 'Ω', value: fmt(o.resistance, 0) },
      ],
      explanation: t('exp.ohm.f.voltageExplain'),
    },
    {
      id: 'power',
      title: 'P = V I',
      expression: (
        <>
          <V>P</V> = <V>V</V> · <V>I</V> = <V>I</V>
          <Sup>2</Sup>
          <V>R</V>
        </>
      ),
      substituted: (
        <>
          {fmt(resistorVoltage, 1)} V × {fmtSig(current, 3)} A = <b>{fmtSig(power, 3)} W</b>
        </>
      ),
      variables: [
        { symbol: <V>P</V>, name: t('exp.ohm.f.P'), unit: 'W', value: fmtSig(power, 3) },
        { symbol: <V>V</V>, name: t('exp.ohm.f.Vr'), unit: 'V', value: fmt(resistorVoltage, 2) },
        { symbol: <V>I</V>, name: t('exp.ohm.f.I'), unit: 'A', value: fmtSig(current, 3) },
      ],
      explanation: t('exp.ohm.f.powerExplain'),
    },
  ]

  const controls = (
    <>
      <ParamSlider label={t('exp.ohm.p.voltage')} value={o.voltage} min={0} max={V_MAX} step={0.1} unit="V" onChange={o.setVoltage} format={(v) => fmt(v, 1)} accent={accent} />
      <ParamSlider label={t('exp.ohm.p.resistance')} value={o.resistance} min={R_MIN} max={R_MAX} step={1} unit="Ω" onChange={o.setResistance} accent={accent} />
      {switchButton()}
      <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">{t('exp.ohm.readings', { count: o.readings.length })}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="secondary" onClick={o.record} disabled={!o.closed}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {t('exp.ohm.record')}
            </Button>
            {o.readings.length > 0 && (
              <Button size="sm" variant="ghost" onClick={o.clearReadings} aria-label={t('exp.ohm.clear')}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted">{t('exp.ohm.recordHint')}</p>
      </div>
    </>
  )

  const presenterControls = (
    <>
      {switchButton(true)}
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t('exp.ohm.p.voltage')} value={o.voltage} min={0} max={V_MAX} step={0.1} unit="V" onChange={o.setVoltage} format={(v) => fmt(v, 1)} accent={accent} />
      </div>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t('exp.ohm.p.resistance')} value={o.resistance} min={R_MIN} max={R_MAX} step={1} unit="Ω" onChange={o.setResistance} accent={accent} />
      </div>
    </>
  )

  const sceneLabels = {
    ammeter: t('exp.ohm.ammeter'),
    voltmeter: t('exp.ohm.voltmeter'),
    battery: t('exp.ohm.battery'),
    ammeterValue: ampsLabel,
    voltmeterValue: voltsLabel,
    switchHint: o.closed ? t('exp.ohm.clickToOpen') : t('exp.ohm.clickToClose'),
  }

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 5.2, 5.4], target: [0, 0, -0.3] }}
      scene={<OhmScene ctl={o} labels={sceneLabels} />}
      fallback2D={<Circuit2D ctl={o} ammeter={ampsLabel} voltmeter={voltsLabel} />}
      controls={{ running: o.running, onTogglePlay: o.togglePlay, onReset: o.reset }}
      overlay={
        <p className="pointer-events-none absolute top-3 left-3 rounded-lg bg-surface/85 px-3 py-1.5 text-xs text-muted ring-1 ring-line">
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#f5a524]" aria-hidden />
          {t('exp.ohm.flowLegend')}
        </p>
      }
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ voltage: o.voltage, resistance: o.resistance }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      tutorParams={[
        { label: t('exp.ohm.p.voltage'), value: fmt(o.voltage, 1), unit: 'V' },
        { label: t('exp.ohm.p.resistance'), value: fmt(o.resistance, 0), unit: 'Ω' },
        {
          label: 'Recorded readings (V, Ω → A)',
          value: o.readings.length ? o.readings.slice(-6).map((r) => `${fmt(r.voltage, 1)} V, ${fmt(r.resistance, 0)} Ω → ${fmt(r.current, 3)} A`).join('; ') : 'none',
        },
      ]}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[3]]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: o.running,
        togglePlay: o.togglePlay,
        reset: o.reset,
        increase: () => o.setVoltage(Math.min(V_MAX, +(o.voltage + 0.5).toFixed(1))),
        decrease: () => o.setVoltage(Math.max(0, +(o.voltage - 0.5).toFixed(1))),
      }}
      guide={{
        instructions: [1, 2, 3, 4, 5].map((i) => t(`exp.ohm.guide.step${i}`)),
        science: (
          <>
            <p>{t('exp.ohm.guide.science1')}</p>
            <p>{t('exp.ohm.guide.science2')}</p>
            <p>
              <Trans i18nKey="exp.ohm.guide.science3" components={{ b: <b className="text-ink" /> }} />
            </p>
          </>
        ),
        conclusions: (
          <>
            <p>{t('exp.ohm.guide.conclusion1')}</p>
            <p>{t('exp.ohm.guide.conclusion2')}</p>
            <p>{t('exp.ohm.guide.conclusion3')}</p>
          </>
        ),
        model: t('exp.ohm.guide.model'),
      }}
    />
  )
}
