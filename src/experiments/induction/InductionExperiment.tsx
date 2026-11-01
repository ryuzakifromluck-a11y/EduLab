import { ArrowLeftRight } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { COIL_RADIUS, MU0, fluxPerTurn, peakEmf, peakVsFrequency } from '../../engines/induction'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtSig } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { F_MAX, MU_MAX, MU_MIN, N_MAX, N_MIN, SPEEDS, useInduction } from './useInduction'
import { InductionScene } from './InductionScene'
import { Induction2D } from './Induction2D'

const P = 'exp.electromagnetic-induction'

export default function InductionExperiment() {
  const { t } = useTranslation()
  const m = useInduction()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'electromagnetic-induction')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const { turns, moment, frequency, polarity } = m.params
  const mV = (v: number) => v * 1000

  const byFreq = useMemo(() => peakVsFrequency(m.params, F_MAX).map((p) => ({ ...p, peak: mV(p.peak) })), [m.params])
  const byTurns = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const n = N_MIN + ((N_MAX - N_MIN) * i) / 19
        return { turns: n, peak: mV(peakEmf({ ...m.params, turns: n }, 240)) }
      }),
    [m.params],
  )
  const direction = Math.abs(m.v) < 1e-4 ? t(`${P}.m.still`) : m.v < 0 ? t(`${P}.m.movingIn`) : t(`${P}.m.movingOut`)

  const measurements: Measurement[] = [
    { id: 'emf', label: t(`${P}.m.emf`), value: fmt(mV(m.emf), 1), unit: 'mV', tone: 'accent', sub: t(`${P}.m.peak`, { value: fmt(mV(m.peak), 1) }) },
    { id: 'flux', label: t(`${P}.m.flux`), value: fmt(m.flux * 1000, 2), unit: 'mWb', sub: t(`${P}.m.fluxSub`) },
    { id: 'z', label: t(`${P}.m.distance`), value: fmt(m.z * 100, 1), unit: 'cm', sub: direction },
    { id: 'v', label: t(`${P}.m.speed`), value: fmt(Math.abs(m.sim.v), 2), unit: 'm/s' },
    { id: 'pol', label: t(`${P}.m.facing`), value: polarity === 1 ? t(`${P}.north`) : t(`${P}.south`) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'trace',
      title: t(`${P}.chart.trace`),
      data: m.log,
      caption: t(`${P}.chart.traceCaption`),
      render: (d: typeof m.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmt(v, 1)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis yAxisId="e" width={56} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.emf`))} {...axisProps(c)} />
            <YAxis yAxisId="f" orientation="right" width={56} tickFormatter={(v) => fmt(v, 1)} label={L.yRight(t(`${P}.axis.flux`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 2)} s`} formatter={(v, n) => [fmt(Number(v), 2), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine yAxisId="e" y={0} stroke={c.axis} />
            <Line yAxisId="e" dataKey="emf" name={t(`${P}.chart.emf`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="f" dataKey="flux" name={t(`${P}.chart.flux`)} stroke={c.accent2} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-induction-trace', headers: ['t_s', 'emf_mV', 'flux_linkage_mWb'], rows: m.log.map((s) => [s.t, s.emf, s.flux]) }),
    },
    {
      id: 'freq',
      title: t(`${P}.chart.freq`),
      data: byFreq,
      caption: t(`${P}.chart.freqCaption`),
      render: (d: typeof byFreq) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="frequency" type="number" domain={[0, F_MAX]} tickFormatter={(v) => fmt(v, 1)} label={L.x(t(`${P}.axis.frequency`))} {...axisProps(c)} />
            <YAxis width={56} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.peak`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `f = ${fmt(Number(v), 2)} Hz`} formatter={(v) => [`${fmt(Number(v), 1)} mV`, t(`${P}.chart.peak`)]} />
            <Line dataKey="peak" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={frequency} y={mV(m.peak)} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-induction-peak-vs-frequency', headers: ['frequency_Hz', 'peak_emf_mV'], rows: byFreq.map((r) => [r.frequency, r.peak]) }),
    },
    {
      id: 'turns',
      title: t(`${P}.chart.turns`),
      data: byTurns,
      caption: t(`${P}.chart.turnsCaption`),
      render: (d: typeof byTurns) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="turns" type="number" domain={[0, N_MAX]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.turns`))} {...axisProps(c)} />
            <YAxis width={56} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.peak`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `N = ${fmt(Number(v), 0)}`} formatter={(v) => [`${fmt(Number(v), 1)} mV`, t(`${P}.chart.peak`)]} />
            <Line dataKey="peak" stroke={c.accent3} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={turns} y={mV(m.peak)} r={6} fill={c.accent3} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-induction-peak-vs-turns', headers: ['turns', 'peak_emf_mV'], rows: byTurns.map((r) => [r.turns, r.peak]) }),
    },
  ]

  const phi1 = fluxPerTurn(moment, m.z)
  const formulas: Formula[] = [
    {
      id: 'faraday',
      title: t(`${P}.f.faradayTitle`),
      expression: (
        <>
          <V>ε</V> = −<V>N</V> <Frac n={<>Δ<V>Φ</V></>} d={<>Δ<V>t</V></>} />
        </>
      ),
      substituted: (
        <>
          <V>ε</V> = <b>{fmt(mV(m.emf), 1)} mV</b>
        </>
      ),
      variables: [
        { symbol: <V>ε</V>, name: t(`${P}.f.emf`), unit: 'V', value: fmtSig(m.emf, 3) },
        { symbol: <V>N</V>, name: t(`${P}.f.N`), unit: '—', value: fmt(turns, 0), effect: t(`${P}.f.Neffect`) },
        { symbol: <>Δ<V>Φ</V>/Δ<V>t</V></>, name: t(`${P}.f.rate`), unit: 'Wb/s', value: fmtSig(-m.emf / turns, 3), effect: t(`${P}.f.rateEffect`) },
      ],
      explanation: t(`${P}.f.faradayExplain`),
    },
    {
      id: 'flux',
      title: t(`${P}.f.fluxTitle`),
      expression: (
        <>
          <V>Φ</V> = <Frac n={<><V>μ</V><Sub>0</Sub> <V>m</V> <V>a</V><Sup>2</Sup></>} d={<>2(<V>a</V><Sup>2</Sup> + <V>z</V><Sup>2</Sup>)<Sup>3/2</Sup></>} />
        </>
      ),
      substituted: (
        <>
          <V>Φ</V> = <b>{fmtSig(phi1 * 1e6, 3)} µWb</b> {t(`${P}.f.perTurn`)}
        </>
      ),
      variables: [
        { symbol: <V>m</V>, name: t(`${P}.f.moment`), unit: 'A·m²', value: fmt(moment, 1), effect: t(`${P}.f.momentEffect`) },
        { symbol: <V>a</V>, name: t(`${P}.f.a`), unit: 'm', value: fmt(COIL_RADIUS, 2) },
        { symbol: <V>z</V>, name: t(`${P}.f.z`), unit: 'm', value: fmt(m.z, 3) },
        { symbol: <><V>μ</V><Sub>0</Sub></>, name: t(`${P}.f.mu0`), unit: 'T·m/A', value: fmtSig(MU0, 3) },
      ],
      explanation: t(`${P}.f.fluxExplain`),
    },
    {
      id: 'lenz',
      title: t(`${P}.f.lenzTitle`),
      expression: <>{t(`${P}.f.lenzExpression`)}</>,
      substituted: <>{direction}</>,
      variables: [
        { symbol: <V>v</V>, name: t(`${P}.f.v`), unit: 'm/s', value: fmt(m.sim.v, 2) },
        { symbol: <V>ε</V>, name: t(`${P}.f.emf`), unit: 'mV', value: fmt(mV(m.emf), 1) },
      ],
      explanation: t(`${P}.f.lenzExplain`),
    },
  ]

  const flipButton = (large = false) => (
    <Button variant="secondary" onClick={m.flip} className={large ? 'h-16 px-6 text-xl' : 'w-full'}>
      <ArrowLeftRight className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
      {t(`${P}.flip`)}
    </Button>
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.frequency`)} value={frequency} min={0} max={F_MAX} step={0.1} unit="Hz" onChange={m.setFrequency} format={(v) => fmt(v, 1)} hint={t(`${P}.p.frequencyHint`)} accent={accent} />
      <ParamSlider label={t(`${P}.p.turns`)} value={turns} min={N_MIN} max={N_MAX} step={50} onChange={m.setTurns} accent={accent} />
      <ParamSlider label={t(`${P}.p.moment`)} value={moment} min={MU_MIN} max={MU_MAX} step={0.1} unit="A·m²" onChange={m.setMoment} format={(v) => fmt(v, 1)} hint={t(`${P}.p.momentHint`)} accent={accent} />
      {flipButton()}
    </>
  )

  const presenterControls = (
    <>
      {flipButton(true)}
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.frequency`)} value={frequency} min={0} max={F_MAX} step={0.1} unit="Hz" onChange={m.setFrequency} format={(v) => fmt(v, 1)} accent={accent} />
      </div>
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.turns`)} value={turns} min={N_MIN} max={N_MAX} step={50} onChange={m.setTurns} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [-0.6, 2.0, 4.3], target: [-0.7, 0.45, 0] }}
      scene={<InductionScene sim={m.sim} labels={{ meter: 'mV' }} />}
      fallback2D={<Induction2D sim={m.sim} label={t('lab.view2d', { name: t('catalog.electromagnetic-induction.title') })} />}
      controls={{ running: m.running, onTogglePlay: m.togglePlay, onReset: m.reset, speed: m.speed, speeds: SPEEDS, onSpeed: m.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ turns, moment, frequency, polarity }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.frequency`), value: fmt(frequency, 1), unit: 'Hz' },
        { label: t(`${P}.p.turns`), value: fmt(turns, 0) },
        { label: t(`${P}.p.moment`), value: fmt(moment, 1), unit: 'A·m²' },
        { label: 'Pole facing the coil', value: polarity === 1 ? 'north' : 'south' },
        { label: 'Peak EMF', value: fmt(mV(m.peak), 1), unit: 'mV' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: m.running,
        togglePlay: m.togglePlay,
        reset: m.reset,
        increase: () => m.setFrequency(Math.min(F_MAX, +(frequency + 0.1).toFixed(1))),
        decrease: () => m.setFrequency(Math.max(0, +(frequency - 0.1).toFixed(1))),
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
