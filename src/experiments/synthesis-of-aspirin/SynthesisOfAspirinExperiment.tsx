import { FlaskConical } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { MP_PURE, M_AC2O, M_ASA, M_SA, RHO_AC2O, conversionCurves, meltingRange, type CatalystId } from '../../engines/synthesisOfAspirin'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtSig } from '../../lib/format'
import { useUi } from '../../store/ui'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { MAX_MINUTES, SPEEDS, useSynthesisOfAspirin } from './useSynthesisOfAspirin'
import { SynthesisOfAspirinScene } from './SynthesisOfAspirinScene'
import { SynthesisOfAspirin2D } from './SynthesisOfAspirin2D'

const P = 'exp.synthesis-of-aspirin'
const CATALYSTS: CatalystId[] = ['none', 'phosphoric', 'sulfuric']
const mpCurve = Array.from({ length: 41 }, (_, i) => {
  const x = i * 0.0025
  const [lo, hi] = meltingRange(x)
  return { x: x * 100, lo, hi }
})

export default function SynthesisOfAspirinExperiment() {
  const { t } = useTranslation()
  const x = useSynthesisOfAspirin()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'synthesis-of-aspirin')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const curves = useMemo(() => conversionCurves(x.params.tempC, MAX_MINUTES, 0.5), [x.params.tempC])
  const s = x.stoich
  const r = x.result
  const limitingName = t(`${P}.reagents.${s.limiting}`)

  const measurements: Measurement[] = [
    { id: 'limiting', label: t(`${P}.m.limiting`), value: limitingName, sub: t(`${P}.m.moles`, { sa: fmtSig(s.nSA * 1000, 3), ac2o: fmtSig(s.nAc2O * 1000, 3) }) },
    { id: 'theory', label: t(`${P}.m.theoretical`), value: fmt(s.theoretical, 2), unit: 'g' },
    { id: 'conv', label: t(`${P}.m.conversion`), value: fmt(x.conversion * 100, 1), unit: '%', tone: 'accent', sub: t(`${P}.m.time`, { value: fmt(x.minutes, 1) }) },
    { id: 'yield', label: t(`${P}.m.yield`), value: r ? fmt(r.percentYield, 1) : '—', unit: r ? '%' : undefined, sub: r ? t(`${P}.m.mass`, { value: fmt(r.productMass, 2), purity: fmt(r.purity * 100, 1) }) : t(`${P}.m.notIsolated`) },
    {
      id: 'tests',
      label: t(`${P}.m.tests`),
      value: r ? `${fmt(r.meltingRange[0], 0)}–${fmt(r.meltingRange[1], 0)}` : '—',
      unit: r ? '°C' : undefined,
      tone: r && r.fecl3 !== 'negative' ? 'warn' : 'default',
      sub: r ? t(`${P}.fecl3.${r.fecl3}`) : t(`${P}.m.notIsolated`),
    },
  ]

  const log = x.log
  const charts: ChartDef<any>[] = [
    {
      id: 'conversion',
      title: t(`${P}.chart.conversion`),
      data: log,
      caption: t(`${P}.chart.conversionCaption`, { T: x.params.tempC }),
      render: (d: typeof log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, 30]} allowDataOverflow label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[0, 100]} width={44} label={L.y(t(`${P}.axis.conversion`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 1)} min`} formatter={(v, n) => [`${fmt(Number(v), 1)} %`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            {CATALYSTS.map((id, i) => (
              <Line
                key={id}
                data={curves.map((p) => ({ t: p.t, v: p[id] * 100 }))}
                dataKey="v"
                name={t(`${P}.catalysts.${id}`)}
                stroke={[c.axis, c.physics, c.accent2][i]}
                strokeDasharray="5 4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
            <Line data={d.map((p) => ({ t: p.t, v: p.X * 100 }))} dataKey="v" name={t(`${P}.chart.yourRun`)} stroke={accent} strokeWidth={3} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-aspirin-conversion', headers: ['t_min', 'conversion'], rows: log.map((p) => [p.t, p.X]) }),
    },
    {
      id: 'mp',
      title: t(`${P}.chart.mp`),
      data: mpCurve,
      caption: t(`${P}.chart.mpCaption`),
      render: (d: typeof mpCurve) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={[0, 10]} label={L.x(t(`${P}.axis.impurity`))} {...axisProps(c)} />
            <YAxis domain={[120, 136]} width={44} label={L.y(t(`${P}.axis.mp`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 2)} mol %`} formatter={(v, n) => [`${fmt(Number(v), 1)} °C`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="hi" name={t(`${P}.chart.mpEnd`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="lo" name={t(`${P}.chart.mpStart`)} stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
            {r && <ReferenceDot x={Math.min(10, r.xImpurity * 100)} y={Math.max(120, r.meltingRange[1])} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-aspirin-melting-point', headers: ['impurity_mol_percent', 'mp_start_C', 'mp_end_C'], rows: mpCurve.map((p) => [p.x, p.lo, p.hi]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'limiting',
      title: t(`${P}.f.limitingTitle`),
      expression: (
        <>
          <V>n</V> = <Frac n={<V>m</V>} d={<V>M</V>} />; &nbsp; <V>m</V><Sub>theor</Sub> = <V>n</V><Sub>limiting</Sub> · <V>M</V>(C<Sub>9</Sub>H<Sub>8</Sub>O<Sub>4</Sub>)
        </>
      ),
      substituted: (
        <>
          <V>n</V>(SA) = {fmt(x.params.saMass, 2)} / {fmt(M_SA, 2)} = {fmtSig(s.nSA * 1000, 3)} mmol; <V>n</V>(Ac<Sub>2</Sub>O) = {fmt(x.params.ac2oVolume, 1)} · {fmt(RHO_AC2O, 2)} / {fmt(M_AC2O, 2)} ={' '}
          {fmtSig(s.nAc2O * 1000, 3)} mmol → <b>{fmt(s.theoretical, 3)} g</b>
        </>
      ),
      variables: [
        { symbol: <V>M</V>, name: t(`${P}.f.mAspirin`), unit: 'g/mol', value: fmt(M_ASA, 2) },
        { symbol: <><V>n</V><Sub>limiting</Sub></>, name: limitingName, unit: 'mmol', value: fmtSig(s.nLimiting * 1000, 3), effect: t(`${P}.f.limitingEffect`) },
      ],
      explanation: t(`${P}.f.limitingExplain`),
    },
    {
      id: 'yield',
      title: t(`${P}.f.yieldTitle`),
      expression: (
        <>
          % = <Frac n={<><V>m</V><Sub>actual</Sub></>} d={<><V>m</V><Sub>theor</Sub></>} /> · 100
        </>
      ),
      substituted: r ? (
        <>
          {fmt(r.productMass, 3)} / {fmt(s.theoretical, 3)} · 100 = <b>{fmt(r.percentYield, 1)} %</b>
        </>
      ) : (
        <>{t(`${P}.m.notIsolated`)}</>
      ),
      variables: [
        { symbol: <><V>m</V><Sub>actual</Sub></>, name: t(`${P}.f.actual`), unit: 'g', value: r ? fmt(r.productMass, 3) : '—' },
        { symbol: <><V>m</V><Sub>theor</Sub></>, name: t(`${P}.m.theoretical`), unit: 'g', value: fmt(s.theoretical, 3) },
      ],
      explanation: t(`${P}.f.yieldExplain`),
    },
    {
      id: 'mp',
      title: t(`${P}.f.mpTitle`),
      expression: (
        <>
          Δ<V>T</V> = <Frac n={<><V>R</V><V>T</V><Sub>m</Sub><sup>2</sup></>} d={<>Δ<V>H</V><Sub>fus</Sub></>} /> · <V>x</V><Sub>imp</Sub>
        </>
      ),
      substituted: r ? (
        <>
          <V>x</V><Sub>imp</Sub> = {fmtSig(r.xImpurity, 2)} → <V>T</V><Sub>m</Sub> = {MP_PURE} − {fmt(MP_PURE - r.meltingRange[1], 1)} = <b>{fmt(r.meltingRange[1], 1)} °C</b>
        </>
      ) : (
        <>{t(`${P}.m.notIsolated`)}</>
      ),
      variables: [
        { symbol: <><V>T</V><Sub>m</Sub></>, name: t(`${P}.f.mpPure`), unit: '°C', value: String(MP_PURE) },
        { symbol: <><V>x</V><Sub>imp</Sub></>, name: t(`${P}.f.ximp`), unit: '', value: r ? fmtSig(r.xImpurity, 2) : '—', effect: t(`${P}.f.ximpEffect`) },
      ],
      explanation: t(`${P}.f.mpExplain`),
    },
  ]

  const catalystPicker = (large = false) => (
    <div className="flex flex-col gap-1.5">
      <span className={large ? 'text-lg font-medium text-ink' : 'text-sm font-medium text-ink'}>{t(`${P}.p.catalyst`)}</span>
      <Segmented size={large ? 'lg' : 'md'} label={t(`${P}.p.catalyst`)} value={x.params.catalyst} options={CATALYSTS.map((id) => ({ value: id, label: t(`${P}.catalysts.${id}`) }))} onChange={x.setCatalyst} />
    </div>
  )
  const isolateButton = (large = false) => (
    <Button variant="primary" onClick={x.isolate} disabled={x.minutes <= 0 || x.phase === 'isolated'} className={large ? 'h-14 px-5 text-lg' : ''}>
      <FlaskConical className="h-4 w-4" aria-hidden />
      {t(`${P}.isolate`)}
    </Button>
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.saMass`)} value={x.params.saMass} min={0.5} max={5} step={0.1} unit="g" format={(v) => fmt(v, 1)} onChange={x.setSaMass} accent={accent} />
      <ParamSlider label={t(`${P}.p.ac2o`)} value={x.params.ac2oVolume} min={1} max={10} step={0.5} unit="mL" format={(v) => fmt(v, 1)} onChange={x.setAc2oVolume} hint={t(`${P}.p.ac2oHint`)} accent={accent} />
      {catalystPicker()}
      <ParamSlider label={t(`${P}.p.temperature`)} value={x.params.tempC} min={50} max={100} step={1} unit="°C" onChange={x.setTemperature} hint={t(`${P}.p.temperatureHint`)} accent={accent} />
      <Toggle label={t(`${P}.p.recrystallise`)} description={t(`${P}.p.recrystalliseHint`)} checked={x.recrystallise} onChange={x.setRecrystallise} />
      {isolateButton()}
    </>
  )

  const presenterControls = (
    <>
      {catalystPicker(true)}
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t(`${P}.p.temperature`)} value={x.params.tempC} min={50} max={100} step={1} unit="°C" onChange={x.setTemperature} accent={accent} />
      </div>
      {isolateButton(true)}
    </>
  )

  const fecl3Label = r ? t(`${P}.fecl3.${r.fecl3}`) : 'FeCl₃'
  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.2, 2.6, 4.8], target: [0.2, 0.8, 0] }}
      scene={
        <SynthesisOfAspirinScene
          ctl={x}
          glass={dark ? '#9fb3d9' : '#a9bad6'}
          labels={{ plate: t(`${P}.labels.bath`), filter: t(`${P}.labels.filter`), flask: '', fecl3: fecl3Label, mp: t(`${P}.labels.mp`) }}
        />
      }
      fallback2D={<SynthesisOfAspirin2D ctl={x} label={t('lab.view2d', { name: t('catalog.synthesis-of-aspirin.title') })} texts={{ fecl3: fecl3Label, mp: t(`${P}.labels.mp`) }} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.phase.${x.phase}`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ saMass: x.params.saMass, ac2oVolume: x.params.ac2oVolume, catalyst: x.params.catalyst, temperature: x.params.tempC, minutes: Math.round(x.minutes * 10) / 10, recrystallise: x.recrystallise }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[1], measurements[2], measurements[3], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.saMass`), value: fmt(x.params.saMass, 2), unit: 'g' },
        { label: t(`${P}.p.ac2o`), value: fmt(x.params.ac2oVolume, 1), unit: 'mL' },
        { label: t(`${P}.p.catalyst`), value: t(`${P}.catalysts.${x.params.catalyst}`) },
        { label: t(`${P}.p.temperature`), value: String(x.params.tempC), unit: '°C' },
        { label: 'heating time', value: fmt(x.minutes, 1), unit: 'min' },
        { label: t(`${P}.m.limiting`), value: limitingName },
        { label: t(`${P}.m.theoretical`), value: fmt(s.theoretical, 3), unit: 'g' },
        { label: t(`${P}.m.yield`), value: r ? fmt(r.percentYield, 1) : 'not isolated', unit: r ? '%' : undefined },
        { label: 'melting range', value: r ? `${fmt(r.meltingRange[0], 1)}-${fmt(r.meltingRange[1], 1)}` : 'n/a', unit: r ? '°C' : undefined },
        { label: 'FeCl3 test', value: r ? r.fecl3 : 'n/a' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setTemperature(Math.min(100, x.params.tempC + 5)),
        decrease: () => x.setTemperature(Math.max(50, x.params.tempC - 5)),
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
