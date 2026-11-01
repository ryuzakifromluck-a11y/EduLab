import { FlaskConical, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { ACTIVATION_ENERGY, S_CROSS, crossTime, rateVsConcentration } from '../../engines/reactionRate'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { useUi } from '../../store/ui'
import { fmt, fmtSig } from '../../lib/format'
import { C_MAX, C_MIN, SPEEDS, T_MAX, T_MIN, useReactionRate } from './useReactionRate'
import { ReactionRateScene } from './ReactionRateScene'
import { ReactionRate2D } from './ReactionRate2D'

const P = 'exp.reaction-rate'
const CONCENTRATIONS = Array.from({ length: 47 }, (_, i) => +(0.02 + i * 0.005).toFixed(3))
const TEMPERATURES = Array.from({ length: 51 }, (_, i) => T_MIN + i)

/** Scientific notation with a real superscript exponent, e.g. 1.2 × 10⁻⁴. */
function sci(v: number, sig = 2): string {
  if (!Number.isFinite(v) || v === 0) return fmt(0, sig - 1)
  const exp = Math.floor(Math.log10(Math.abs(v)))
  const sup = String(exp).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d])
  return `${fmt(v / 10 ** exp, sig - 1)} × 10${sup}`
}

export default function ReactionRateExperiment() {
  const { t } = useTranslation()
  const x = useReactionRate()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'reaction-rate')!
  const accent = c.chemistry
  const tc = x.predictedCrossTime
  const vanished = x.crossVanishedAt !== null

  const concCurve = useMemo(() => rateVsConcentration(x.temperatureC, CONCENTRATIONS), [x.temperatureC])
  const tempCurve = useMemo(
    () =>
      TEMPERATURES.map((T) => {
        const time = crossTime({ concentration: x.concentration, temperatureC: T })
        return { temperatureC: T, inverseTime: Number.isFinite(time) ? 1 / time : 0 }
      }),
    [x.concentration],
  )
  const sameT = x.trials.filter((r) => r.temperatureC === x.temperatureC).map((r) => ({ concentration: r.concentration, inverseTime: 1 / r.time }))
  const sameC = x.trials.filter((r) => r.concentration === x.concentration).map((r) => ({ temperatureC: r.temperatureC, inverseTime: 1 / r.time }))

  const status = vanished
    ? t(`${P}.m.vanished`, { value: fmt(x.crossVanishedAt!, 1) })
    : x.time > 0
      ? t(`${P}.m.visible`, { value: fmt(x.visibility * 100, 0) })
      : t(`${P}.m.ready`)

  const measurements: Measurement[] = [
    { id: 'time', label: t(`${P}.m.time`), value: fmt(x.time, 1), unit: 's', sub: status, tone: vanished ? 'accent' : 'default' },
    { id: 'thio', label: t(`${P}.m.thiosulfate`), value: fmt(x.thiosulfate, 4), unit: 'mol/L' },
    { id: 'sulfur', label: t(`${P}.m.sulfur`), value: fmt(x.sulfur * 1000, 2), unit: 'mmol/L', sub: t(`${P}.m.sulfurNeeded`, { value: fmt(S_CROSS * 1000, 1) }) },
    { id: 'rate', label: t(`${P}.m.rate`), value: sci(x.rate), unit: 'mol/(L·s)' },
    {
      id: 'tc',
      label: t(`${P}.m.crossTime`),
      value: fmt(tc, 1),
      unit: 's',
      tone: 'accent',
      sub: `k = ${sci(x.k)} s⁻¹`,
    },
  ]

  const ttip = tooltipProps(c)
  const xLabel = (value: string) => ({ value, position: 'insideBottom' as const, offset: -10, fill: c.text, fontSize: 12 })
  const yLabel = (value: string, right = false) => ({
    value,
    angle: -90,
    position: right ? ('insideRight' as const) : ('insideLeft' as const),
    offset: 12,
    fill: c.text,
    fontSize: 12,
    style: { textAnchor: 'middle' as const },
  })
  const tMax = Math.max(x.time, Number.isFinite(tc) ? tc * 1.5 : 60)

  const charts: ChartDef<any>[] = [
    {
      id: 'concentration',
      title: t(`${P}.chart.concentration`),
      data: x.log,
      caption: t(`${P}.chart.concentrationCaption`),
      render: (data: typeof x.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, +tMax.toPrecision(3)]} tickFormatter={(v) => fmt(v, 0)} label={xLabel(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis yAxisId="thio" width={60} domain={[0, C_MAX]} ticks={[0, 0.05, 0.1, 0.15, 0.2, 0.25]} tickFormatter={(v) => fmt(v, 2)} label={yLabel(t(`${P}.axis.thiosulfate`))} {...axisProps(c)} />
            <YAxis yAxisId="s" orientation="right" width={60} domain={[0, S_CROSS * 2]} tickFormatter={(v) => fmt(v * 1000, 1)} label={yLabel(t(`${P}.axis.sulfur`), true)} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 1)} s`} formatter={(v, n) => [`${fmtSig(Number(v), 3)} mol/L`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: c.text }} />
            <ReferenceLine yAxisId="s" y={S_CROSS} stroke={c.accent3} strokeDasharray="5 4" label={{ value: t(`${P}.chart.crossGone`), position: 'insideTopLeft', fill: c.accent3, fontSize: 11 }} />
            <Line yAxisId="thio" dataKey="thiosulfate" name="[S₂O₃²⁻]" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="s" dataKey="sulfur" name={t(`${P}.chart.sulfurLine`)} stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-reaction-rate-run',
        headers: ['time_s', 'thiosulfate_mol_per_L', 'sulfur_mol_per_L', 'cross_visibility'],
        rows: x.fullLog.current.map((r) => [r.t, r.thiosulfate, r.sulfur, r.visibility]),
      }),
    },
    {
      id: 'rateConc',
      title: t(`${P}.chart.rateConc`),
      data: { curve: concCurve, trials: sameT },
      caption: t(`${P}.chart.rateConcCaption`, { T: x.temperatureC }),
      render: (d: { curve: typeof concCurve; trials: typeof sameT }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="concentration" type="number" domain={[0, C_MAX]} tickFormatter={(v) => fmt(v, 2)} label={xLabel(t(`${P}.axis.concentration`))} {...axisProps(c)} />
            <YAxis dataKey="inverseTime" type="number" width={60} tickFormatter={(v) => fmt(v, 3)} label={yLabel(t(`${P}.axis.inverseTime`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 3)} mol/L`} formatter={(v, n) => [`${fmtSig(Number(v), 3)} s⁻¹`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: c.text }} />
            <Line data={d.curve} dataKey="inverseTime" name={t(`${P}.chart.theory`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.trials} dataKey="inverseTime" name={t(`${P}.chart.yourTrials`)} fill={c.accent2} isAnimationActive={false} />
            {Number.isFinite(tc) && <ReferenceDot x={x.concentration} y={1 / tc} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-reaction-rate-trials',
        headers: ['trial', 'thiosulfate_mol_per_L', 'temperature_C', 'cross_time_s', 'inverse_time_per_s'],
        rows: x.trials.map((r) => [r.n, r.concentration, r.temperatureC, r.time, 1 / r.time]),
      }),
    },
    {
      id: 'rateTemp',
      title: t(`${P}.chart.rateTemp`),
      data: { curve: tempCurve, trials: sameC },
      caption: t(`${P}.chart.rateTempCaption`, { c: fmt(x.concentration, 3) }),
      render: (d: { curve: typeof tempCurve; trials: typeof sameC }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="temperatureC" type="number" domain={[T_MIN, T_MAX]} label={xLabel(t(`${P}.axis.temperature`))} {...axisProps(c)} />
            <YAxis dataKey="inverseTime" type="number" width={60} tickFormatter={(v) => fmt(v, 2)} label={yLabel(t(`${P}.axis.inverseTime`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 0)} °C`} formatter={(v, n) => [`${fmtSig(Number(v), 3)} s⁻¹`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: c.text }} />
            <Line data={d.curve} dataKey="inverseTime" name={t(`${P}.chart.theory`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.trials} dataKey="inverseTime" name={t(`${P}.chart.yourTrials`)} fill={c.accent2} isAnimationActive={false} />
            {Number.isFinite(tc) && <ReferenceDot x={x.temperatureC} y={1 / tc} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-reaction-rate-vs-temperature',
        headers: ['temperature_C', 'inverse_time_per_s'],
        rows: tempCurve.map((r) => [r.temperatureC, r.inverseTime]),
      }),
    },
  ]

  const conc = <>[S<Sub>2</Sub>O<Sub>3</Sub><Sup>2−</Sup>]</>
  const c0 = <><V>c</V><Sub>0</Sub></>
  const Tk = x.temperatureC + 273.15
  const vars = {
    k: { symbol: <V>k</V>, name: t(`${P}.f.k`), unit: 's⁻¹', value: sci(x.k, 3), effect: t(`${P}.f.kEffect`) },
    c0: { symbol: c0, name: t(`${P}.f.c0`), unit: 'mol/L', value: fmt(x.concentration, 3), effect: t(`${P}.f.c0Effect`) },
    T: { symbol: <V>T</V>, name: t(`${P}.f.T`), unit: 'K', value: fmt(Tk, 2), effect: t(`${P}.f.TEffect`) },
    t: { symbol: <V>t</V>, name: t(`${P}.f.t`), unit: 's', value: fmt(x.time, 1) },
  }

  const formulas: Formula[] = [
    {
      id: 'law',
      title: t(`${P}.f.lawTitle`),
      expression: (
        <>
          <V>rate</V> = −<Frac n={<>d{conc}</>} d={<>d<V>t</V></>} /> = <V>k</V> {conc}
        </>
      ),
      substituted: (
        <>
          {sci(x.k, 3)} × {fmt(x.thiosulfate, 4)} = <b>{sci(x.rate, 3)} mol/(L·s)</b>
        </>
      ),
      variables: [vars.k, { symbol: conc, name: t(`${P}.f.conc`), unit: 'mol/L', value: fmt(x.thiosulfate, 4) }],
      explanation: t(`${P}.f.lawExplain`),
    },
    {
      id: 'integrated',
      title: t(`${P}.f.integratedTitle`),
      expression: (
        <>
          {conc} = {c0} · <V>e</V><Sup>−<V>k</V><V>t</V></Sup>
        </>
      ),
      substituted: (
        <>
          {fmt(x.concentration, 3)} · e<sup>−{sci(x.k, 3)} × {fmt(x.time, 1)}</sup> = <b>{fmt(x.thiosulfate, 4)} mol/L</b>
        </>
      ),
      variables: [vars.c0, vars.k, vars.t, { symbol: <><V>t</V><Sub>½</Sub></>, name: t(`${P}.f.halfLife`), unit: 's', value: fmt(x.halfLife, 0) }],
      explanation: t(`${P}.f.integratedExplain`),
    },
    {
      id: 'arrhenius',
      title: t(`${P}.f.arrheniusTitle`),
      expression: (
        <>
          <V>k</V> = <V>A</V> · <V>e</V><Sup>−<V>E</V><Sub>a</Sub>/<V>RT</V></Sup>
        </>
      ),
      substituted: (
        <>
          <V>E</V><Sub>a</Sub> = {fmt(ACTIVATION_ENERGY / 1000, 0)} kJ/mol, <V>T</V> = {fmt(Tk, 2)} K → <b>k = {sci(x.k, 3)} s⁻¹</b>
        </>
      ),
      variables: [
        vars.T,
        { symbol: <><V>E</V><Sub>a</Sub></>, name: t(`${P}.f.Ea`), unit: 'kJ/mol', value: fmt(ACTIVATION_ENERGY / 1000, 0) },
        { symbol: <V>R</V>, name: t(`${P}.f.R`), unit: 'J/(mol·K)', value: '8.314' },
        vars.k,
      ],
      explanation: t(`${P}.f.arrheniusExplain`),
    },
    {
      id: 'cross',
      title: t(`${P}.f.crossTitle`),
      expression: (
        <>
          <V>t</V><Sub>×</Sub> = −<Frac n={<>ln(1 − <V>S</V><Sub>×</Sub>/{c0})</>} d={<V>k</V>} /> ≈ <Frac n={<><V>S</V><Sub>×</Sub></>} d={<><V>k</V>{c0}</>} />
        </>
      ),
      substituted: (
        <>
          −ln(1 − {fmt(S_CROSS, 3)} / {fmt(x.concentration, 3)}) / {sci(x.k, 3)} = <b>{fmt(tc, 1)} s</b>
        </>
      ),
      variables: [
        { symbol: <><V>S</V><Sub>×</Sub></>, name: t(`${P}.f.Sx`), unit: 'mol/L', value: fmt(S_CROSS, 3) },
        vars.c0,
        vars.k,
        { symbol: <><V>t</V><Sub>×</Sub></>, name: t(`${P}.f.tx`), unit: 's', value: fmt(tc, 1) },
      ],
      explanation: t(`${P}.f.crossExplain`),
    },
  ]

  const startButton = (large = false) => (
    <Button variant="primary" onClick={x.togglePlay} className={large ? 'h-16 px-6 text-xl' : 'w-full'}>
      <FlaskConical className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
      {x.running ? t('lab.pause') : x.time > 0 && x.time < (Number.isFinite(tc) ? tc * 3 : Infinity) ? t(`${P}.resume`) : t(`${P}.start`)}
    </Button>
  )

  const concSlider = (large = false) => (
    <ParamSlider large={large} label={t(`${P}.p.concentration`)} value={x.concentration} min={C_MIN} max={C_MAX} step={0.005} unit="mol/L" format={(v) => fmt(v, 3)} onChange={x.setConcentration} accent={accent} hint={large ? undefined : t(`${P}.p.restartHint`)} />
  )
  const tempSlider = (large = false) => (
    <ParamSlider large={large} label={t(`${P}.p.temperature`)} value={x.temperatureC} min={T_MIN} max={T_MAX} step={1} unit="°C" onChange={x.setTemperature} accent={accent} />
  )

  const controls = (
    <>
      {concSlider()}
      {tempSlider()}
      {startButton()}
      <div className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
        <p className="font-semibold text-ink">{t(`${P}.reaction`)}</p>
        <p className="mt-1 text-sm text-ink">Na₂S₂O₃ + 2 HCl → 2 NaCl + S↓ + SO₂ + H₂O</p>
        <p className="mt-1">{t(`${P}.acidNote`)}</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink">{t(`${P}.trials`, { count: x.trials.length })}</p>
          <Button variant="subtle" size="sm" onClick={x.clearTrials} disabled={x.trials.length === 0}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t(`${P}.clearTrials`)}
          </Button>
        </div>
        {x.trials.length > 0 ? (
          <table className="tabular w-full text-xs text-muted">
            <thead>
              <tr className="text-left">
                <th className="py-1 font-medium">#</th>
                <th className="py-1 font-medium">mol/L</th>
                <th className="py-1 font-medium">°C</th>
                <th className="py-1 text-right font-medium">{t(`${P}.m.time`)} (s)</th>
              </tr>
            </thead>
            <tbody>
              {x.trials.slice(-6).reverse().map((r) => (
                <tr key={r.n} className="border-t border-line text-ink">
                  <td className="py-1">{r.n}</td>
                  <td className="py-1">{fmt(r.concentration, 3)}</td>
                  <td className="py-1">{fmt(r.temperatureC, 0)}</td>
                  <td className="py-1 text-right">{fmt(r.time, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs leading-relaxed text-muted">{t(`${P}.trialsHint`)}</p>
        )}
      </div>
    </>
  )

  const presenterControls = (
    <>
      {startButton(true)}
      <div className="min-w-[260px] flex-1">{concSlider(true)}</div>
      <div className="min-w-[220px] flex-1">{tempSlider(true)}</div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 2.9, 3.6], target: [0, 0.45, 0] }}
      scene={
        <ReactionRateScene
          sim={x.sim}
          glass={dark ? '#9fb3d9' : '#a9bad6'}
          labels={{ clock: `${fmt(x.time, 1)} s`, temperature: `${fmt(x.temperatureC, 0)} °C` }}
        />
      }
      fallback2D={<ReactionRate2D sim={x.sim} labels={{ side: t(`${P}.sideView`), top: t(`${P}.topView`) }} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
    />
  )

  const notice = !Number.isFinite(tc) ? (
    <div role="alert" className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      {t(`${P}.neverVanishes`)}
    </div>
  ) : null

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ concentration: x.concentration, temperatureC: x.temperatureC }}
      viewport={viewport}
      notice={notice}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      tutorParams={[
        { label: t(`${P}.p.concentration`), value: fmt(x.concentration, 3), unit: 'mol/L' },
        { label: t(`${P}.p.temperature`), value: fmt(x.temperatureC, 0), unit: '°C' },
      ]}
      presenterMeasurements={[measurements[0], measurements[1], measurements[4], measurements[3]]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(x.log)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setTemperature(Math.min(T_MAX, x.temperatureC + 5)),
        decrease: () => x.setTemperature(Math.max(T_MIN, x.temperatureC - 5)),
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
