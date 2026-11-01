import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { E_CHARGE, E_MASS, MU_B, frequencyShift, levelSpacing, specificCharge, spectrumProfile, wavelengthShift, type Observation } from '../../engines/zeemanEffect'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { Frac, FormulaExplorer, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { B_MAX, B_STEP, useZeemanEffect, type Polariser } from './useZeemanEffect'
import { ZeemanEffectScene } from './ZeemanEffectScene'
import { ZeemanEffect2D } from './ZeemanEffect2D'

const P = 'exp.zeeman-effect'
const EV = 1.602176634e-19

export default function ZeemanEffectExperiment() {
  const { t } = useTranslation()
  const z = useZeemanEffect()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'zeeman-effect')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const shiftPm = z.shift * 1e12
  const dE = levelSpacing(z.B)

  const profile = useMemo(() => spectrumProfile(z.lines, 40e-12, 241), [z.lines])
  const fan = useMemo(() => Array.from({ length: 31 }, (_, i) => ({ B: (B_MAX * i) / 30, shift: wavelengthShift((B_MAX * i) / 30) * 1e12 })), [])
  const pts = z.readings.map((r) => ({ B: r.B, shift: r.shift }))
  // Slope of Δλ vs B by least squares through the origin → e/m.
  const slope = useMemo(() => {
    let sxx = 0
    let sxy = 0
    for (const r of z.readings) {
      sxx += r.B * r.B
      sxy += r.B * r.shift
    }
    return sxx > 0 ? sxy / sxx : null
  }, [z.readings])
  const eOverM = slope === null ? null : specificCharge(slope * 1e-12, 1)

  const measurements: Measurement[] = [
    { id: 'B', label: t(`${P}.m.field`), value: fmt(z.B, 2), unit: 'T', sub: z.running ? t(`${P}.m.ramping`) : t(`${P}.m.steady`) },
    { id: 'shift', label: t(`${P}.m.shift`), value: fmt(shiftPm, 2), unit: 'pm', tone: 'accent', sub: t(`${P}.m.shiftNm`, { value: fmtSig(shiftPm / 1000, 3) }) },
    { id: 'dE', label: t(`${P}.m.dE`), value: fmt((dE / EV) * 1e6, 1), unit: 'µeV', sub: t(`${P}.m.dnu`, { value: fmt(frequencyShift(z.B) / 1e9, 2) }) },
    {
      id: 'lines',
      label: t(`${P}.m.lines`),
      value: String(z.lines.length),
      sub: z.B < 0.005 ? t(`${P}.m.single`) : z.resolved ? t(`${P}.m.resolved`) : t(`${P}.m.blended`),
      tone: z.resolved ? 'default' : 'warn',
    },
    {
      id: 'em',
      label: t(`${P}.m.em`),
      value: eOverM === null ? '—' : fmtSig(eOverM / 1e11, 3),
      unit: '× 10¹¹ C/kg',
      sub: eOverM === null ? t(`${P}.m.needReadings`) : t(`${P}.m.emAccepted`, { value: fmt(E_CHARGE / E_MASS / 1e11, 3) }),
    },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'spectrum',
      title: t(`${P}.chart.spectrum`),
      data: profile,
      caption: t(`${P}.chart.spectrumCaption`),
      render: (d: typeof profile) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="offset" type="number" domain={[-40, 40]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.offset`))} {...axisProps(c)} />
            <YAxis width={44} domain={[0, 'auto']} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.intensity`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `Δλ = ${fmt(Number(v), 1)} pm`} formatter={(v) => [fmt(Number(v), 3), t(`${P}.axis.intensity`)]} />
            {z.lines.map((l) => (
              <ReferenceLine key={l.kind} x={l.shift * 1e12} stroke={l.kind === 'pi' ? c.accent2 : c.accent3} strokeDasharray="3 3" label={{ value: t(`${P}.kinds.${l.kind}`), fill: c.text, fontSize: 11, position: 'top' }} />
            ))}
            <Line dataKey="I" stroke="#e5484d" strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-zeeman-spectrum', headers: ['offset_pm', 'intensity'], rows: profile.map((p) => [p.offset, p.I]) }),
    },
    {
      id: 'fan',
      title: t(`${P}.chart.fan`),
      data: { fan, pts },
      caption: t(`${P}.chart.fanCaption`),
      render: (d: { fan: typeof fan; pts: typeof pts }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="B" type="number" domain={[0, B_MAX]} tickFormatter={(v) => fmt(v, 1)} label={L.x(t(`${P}.axis.field`))} {...axisProps(c)} />
            <YAxis dataKey="shift" type="number" domain={[0, 'auto']} width={44} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.shift`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `B = ${fmt(Number(v), 2)} T`} formatter={(v, n) => [`${fmt(Number(v), 2)} pm`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.fan} dataKey="shift" name={t(`${P}.chart.theory`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.pts} dataKey="shift" name={t(`${P}.chart.readings`)} fill={c.accent2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-zeeman-readings', headers: ['B_T', 'shift_pm', 'observation'], rows: z.readings.map((r) => [r.B, r.shift, r.mode]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'dE',
      title: 'ΔE = μ_B · B · m_l',
      expression: (
        <>
          Δ<V>E</V> = μ<Sub>B</Sub> · <V>B</V> · <V>m</V>
          <Sub>l</Sub>
        </>
      ),
      substituted: (
        <>
          {fmtSig(MU_B, 4)} J/T × {fmt(z.B, 2)} T × 1 = <b>{fmtSig(dE, 3)} J</b> = {fmt((dE / EV) * 1e6, 1)} µeV
        </>
      ),
      variables: [
        { symbol: <>μ<Sub>B</Sub></>, name: t(`${P}.f.muB`), unit: 'J/T', value: fmtSig(MU_B, 4) },
        { symbol: <V>B</V>, name: t(`${P}.f.B`), unit: 'T', value: fmt(z.B, 2), effect: t(`${P}.f.bEffect`) },
        { symbol: <><V>m</V><Sub>l</Sub></>, name: t(`${P}.f.ml`), unit: '', value: '−2 … +2' },
      ],
      explanation: t(`${P}.f.dEExplain`),
    },
    {
      id: 'dl',
      title: 'Δλ = λ² ΔE / (h c)',
      expression: (
        <>
          Δλ = <Frac n={<>λ<Sup>2</Sup> μ<Sub>B</Sub> <V>B</V></>} d={<><V>h</V> <V>c</V></>} />
        </>
      ),
      substituted: (
        <>
          (643.847 nm)² × {fmtSig(MU_B, 4)} × {fmt(z.B, 2)} / (h c) = <b>{fmt(shiftPm, 2)} pm</b>
        </>
      ),
      variables: [
        { symbol: 'λ', name: t(`${P}.f.lambda`), unit: 'nm', value: '643.847' },
        { symbol: 'Δλ', name: t(`${P}.f.dl`), unit: 'pm', value: fmt(shiftPm, 2) },
      ],
      explanation: t(`${P}.f.dlExplain`),
    },
    {
      id: 'em',
      title: 'e/m = 4π c Δλ / (λ² B)',
      expression: (
        <>
          <V>e</V>/<V>m</V> = <Frac n={<>4π <V>c</V> Δλ</>} d={<>λ<Sup>2</Sup> <V>B</V></>} />
        </>
      ),
      substituted:
        z.B > 0.005 ? (
          <>
            4π × c × {fmt(shiftPm, 2)} pm / ((643.847 nm)² × {fmt(z.B, 2)} T) = <b>{fmtSig((specificCharge(z.shift, z.B) ?? 0) / 1e11, 4)} × 10¹¹ C/kg</b>
          </>
        ) : (
          <>{t(`${P}.f.needField`)}</>
        ),
      variables: [{ symbol: <><V>e</V>/<V>m</V></>, name: t(`${P}.f.em`), unit: 'C/kg', value: fmtSig(E_CHARGE / E_MASS, 4) }],
      explanation: t(`${P}.f.emExplain`),
    },
  ]

  const modePicker = (large = false) => (
    <Segmented
      label={t(`${P}.p.mode`)}
      value={z.mode}
      onChange={(m: Observation) => z.setMode(m)}
      options={[
        { value: 'transverse' as Observation, label: t(`${P}.modes.transverse`) },
        { value: 'longitudinal' as Observation, label: t(`${P}.modes.longitudinal`) },
      ]}
      size={large ? 'lg' : 'md'}
    />
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.field`)} value={z.target} min={0} max={B_MAX} step={B_STEP} unit="T" onChange={z.setB} accent={accent} hint={t(`${P}.p.fieldHint`)} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.mode`)}</span>
        {modePicker()}
        <p className="text-xs leading-relaxed text-muted">{z.mode === 'transverse' ? t(`${P}.p.transverseHint`) : t(`${P}.p.longitudinalHint`)}</p>
      </div>
      {z.mode === 'transverse' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t(`${P}.p.polariser`)}</span>
          <Segmented
            label={t(`${P}.p.polariser`)}
            value={z.polariser}
            onChange={(p: Polariser) => z.setPolariser(p)}
            options={(['none', 'parallel', 'perpendicular'] as Polariser[]).map((p) => ({ value: p, label: t(`${P}.polarisers.${p}`) }))}
          />
        </div>
      )}
      <RecordBox count={z.readings.length} title={t(`${P}.readings`, { count: z.readings.length })} hint={t(`${P}.recordHint`)} onRecord={z.record} onClear={z.clearReadings} disabled={z.B < 0.05} />
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[260px] flex-1">
        <ParamSlider large label={t(`${P}.p.field`)} value={z.target} min={0} max={B_MAX} step={B_STEP} unit="T" onChange={z.setB} accent={accent} />
      </div>
      {modePicker(true)}
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [1.1, 2.9, 4.4], target: [0.9, 0.95, 0] }}
      scene={
        <ZeemanEffectScene
          B={z.B}
          mode={z.mode}
          lines={z.lines}
          labels={{ magnet: t(`${P}.magnet`), field: `B = ${fmt(z.B, 2)} T`, lamp: t(`${P}.lamp`), detector: t(`${P}.detector`) }}
        />
      }
      fallback2D={<ZeemanEffect2D B={z.B} lines={z.lines} label={t('lab.view2d', { name: t('catalog.zeeman-effect.title') })} />}
      controls={{ running: z.running, onTogglePlay: z.togglePlay, onReset: z.reset }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ field: z.target, mode: z.mode, polariser: z.polariser }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.field`), value: fmt(z.B, 2), unit: 'T' },
        { label: t(`${P}.p.mode`), value: z.mode },
        { label: t(`${P}.p.polariser`), value: z.polariser },
        { label: 'Lines seen (kind @ shift pm)', value: z.lines.map((l) => `${l.kind} @ ${fmt(l.shift * 1e12, 2)}`).join('; ') },
        { label: 'Recorded readings', value: String(z.readings.length) },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: z.running,
        togglePlay: z.togglePlay,
        reset: z.reset,
        increase: () => z.setB(Math.min(B_MAX, +(z.target + B_STEP).toFixed(2))),
        decrease: () => z.setB(Math.max(0, +(z.target - B_STEP).toFixed(2))),
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
