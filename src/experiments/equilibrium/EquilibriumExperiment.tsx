import { Plus, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { DELTA_H, kVsTemperature } from '../../engines/equilibrium'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtInt, fmtSig } from '../../lib/format'
import { useUi } from '../../store/ui'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { SPEEDS, V_MAX, V_MIN, useEquilibrium } from './useEquilibrium'
import { EquilibriumScene } from './EquilibriumScene'
import { Equilibrium2D } from './Equilibrium2D'

const P = 'exp.chemical-equilibrium'
const mmol = (v: number) => fmt(v * 1000, 1)

export default function EquilibriumExperiment() {
  const { t } = useTranslation()
  const x = useEquilibrium()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'chemical-equilibrium')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const kCurve = useMemo(() => kVsTemperature(0, 100), [])
  const log = x.log.map((s) => ({ t: s.t, n2o4: s.n2o4 * 1000, no2: s.no2 * 1000, Q: s.Q * 1000, K: s.K * 1000 }))
  const shiftText = t(`${P}.shift.${x.shift}`)

  const measurements: Measurement[] = [
    { id: 'n2o4', label: '[N₂O₄]', value: mmol(x.n2o4), unit: 'mmol/L', sub: t(`${P}.m.atEq`, { value: mmol(x.equilibrium.n2o4) }) },
    { id: 'no2', label: '[NO₂]', value: mmol(x.no2), unit: 'mmol/L', tone: 'accent', sub: t(`${P}.m.atEq`, { value: mmol(x.equilibrium.no2) }) },
    { id: 'K', label: t(`${P}.m.K`, { T: fmtInt(x.temperature) }), value: fmtSig(x.K * 1000, 3), unit: 'mmol/L' },
    { id: 'Q', label: t(`${P}.m.Q`), value: Number.isFinite(x.Q) ? fmtSig(x.Q * 1000, 3) : '∞', unit: 'mmol/L', tone: x.shift === 'equilibrium' ? 'default' : 'warn', sub: shiftText },
    { id: 'p', label: t(`${P}.m.pressure`), value: fmtInt(x.pressure), unit: 'kPa', sub: t(`${P}.m.dissociated`, { value: fmtInt(x.dissociation * 100) }) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'conc',
      title: t(`${P}.chart.conc`),
      data: log,
      caption: t(`${P}.chart.concCaption`),
      render: (d: typeof log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[0, 'auto']} width={48} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.concentration`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 1)} s`} formatter={(v, n) => [`${fmt(Number(v), 2)} mmol/L`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="n2o4" name="[N₂O₄]" stroke={c.physics} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="no2" name="[NO₂]" stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-equilibrium-concentrations', headers: ['t_s', 'N2O4_mmol_per_L', 'NO2_mmol_per_L'], rows: log.map((s) => [s.t, s.n2o4, s.no2]) }),
    },
    {
      id: 'QK',
      title: t(`${P}.chart.QK`),
      data: log,
      caption: t(`${P}.chart.QKCaption`),
      render: (d: typeof log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[0, 'auto']} width={48} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.qk`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 1)} s`} formatter={(v, n) => [`${fmtSig(Number(v), 3)} mmol/L`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="K" name="K" stroke={c.marker} strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="Q" name="Q" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-equilibrium-QK', headers: ['t_s', 'Q_mmol_per_L', 'K_mmol_per_L'], rows: log.map((s) => [s.t, s.Q, s.K]) }),
    },
    {
      id: 'KT',
      title: t(`${P}.chart.KT`),
      data: kCurve,
      caption: t(`${P}.chart.KTCaption`),
      render: (d: typeof kCurve) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d.map((p) => ({ T: p.T, K: p.K * 1000 }))} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="T" type="number" domain={[0, 100]} label={L.x(t(`${P}.axis.temperature`))} {...axisProps(c)} />
            <YAxis scale="log" domain={[0.1, 'auto']} allowDataOverflow width={52} tickFormatter={(v) => fmtSig(v, 2)} label={L.y(t(`${P}.axis.K`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 0)} °C`} formatter={(v) => [`${fmtSig(Number(v), 3)} mmol/L`, 'K']} />
            <Line dataKey="K" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={x.temperature} y={x.K * 1000} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-K-vs-temperature', headers: ['T_C', 'K_mol_per_L'], rows: kCurve.map((p) => [p.T, p.K]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'K',
      title: 'K = [NO₂]² / [N₂O₄]',
      expression: (
        <>
          <V>K</V><Sub>c</Sub> = <Frac n={<>[NO<Sub>2</Sub>]<Sup>2</Sup></>} d={<>[N<Sub>2</Sub>O<Sub>4</Sub>]</>} />
        </>
      ),
      substituted: (
        <>
          ({fmt(x.no2 * 1000, 2)})² / {fmt(x.n2o4 * 1000, 2)} = <b>{Number.isFinite(x.Q) ? fmtSig(x.Q * 1000, 3) : '∞'} mmol/L</b> ({t(`${P}.f.now`)}) · <V>K</V> = {fmtSig(x.K * 1000, 3)} mmol/L
        </>
      ),
      variables: [
        { symbol: <>[NO<Sub>2</Sub>]</>, name: t(`${P}.f.no2`), unit: 'mol/L', value: fmtSig(x.no2, 3) },
        { symbol: <>[N<Sub>2</Sub>O<Sub>4</Sub>]</>, name: t(`${P}.f.n2o4`), unit: 'mol/L', value: fmtSig(x.n2o4, 3) },
        { symbol: <V>Q</V>, name: t(`${P}.f.Q`), unit: 'mol/L', value: Number.isFinite(x.Q) ? fmtSig(x.Q, 3) : '∞', effect: t(`${P}.f.QEffect`) },
      ],
      explanation: t(`${P}.f.KExplain`),
    },
    {
      id: 'vh',
      title: t(`${P}.f.vhTitle`),
      expression: (
        <>
          ln <Frac n={<><V>K</V><Sub>2</Sub></>} d={<><V>K</V><Sub>1</Sub></>} /> = −<Frac n={<>Δ<V>H</V></>} d={<V>R</V>} /> (<Frac n="1" d={<><V>T</V><Sub>2</Sub></>} /> − <Frac n="1" d={<><V>T</V><Sub>1</Sub></>} />)
        </>
      ),
      substituted: (
        <>
          Δ<V>H</V> = +{fmt(DELTA_H / 1000, 1)} kJ/mol, <V>T</V> = {fmt(x.temperature + 273.15, 1)} K → <b><V>K</V> = {fmtSig(x.K, 3)} mol/L</b>
        </>
      ),
      variables: [
        { symbol: <>Δ<V>H</V></>, name: t(`${P}.f.dH`), unit: 'kJ/mol', value: `+${fmt(DELTA_H / 1000, 1)}`, effect: t(`${P}.f.dHEffect`) },
        { symbol: <V>T</V>, name: t(`${P}.f.T`), unit: 'K', value: fmt(x.temperature + 273.15, 1) },
      ],
      explanation: t(`${P}.f.vhExplain`),
    },
  ]

  const addButtons = (large = false) => (
    <div className="grid grid-cols-2 gap-2">
      <Button onClick={() => x.add('n2o4')} className={large ? 'h-14 px-5 text-lg' : ''}>
        <Plus className="h-4 w-4" aria-hidden />
        N₂O₄
      </Button>
      <Button onClick={() => x.add('no2')} className={large ? 'h-14 px-5 text-lg' : ''}>
        <Plus className="h-4 w-4" aria-hidden />
        NO₂
      </Button>
    </div>
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.temperature`)} value={x.temperature} min={0} max={100} step={1} unit="°C" onChange={x.setTemperature} hint={t(`${P}.p.temperatureHint`)} accent={accent} />
      <ParamSlider label={t(`${P}.p.volume`)} value={x.volume} min={V_MIN} max={V_MAX} step={0.05} unit="L" onChange={x.setVolume} format={(v) => fmt(v, 2)} hint={t(`${P}.p.volumeHint`)} accent={accent} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.add`)}</span>
        {addButtons()}
      </div>
      <Button variant="ghost" onClick={x.equilibrate}>
        <Scale className="h-4 w-4" aria-hidden />
        {t(`${P}.jump`)}
      </Button>
    </>
  )

  const presenterControls = (
    <>
      {addButtons(true)}
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t(`${P}.p.temperature`)} value={x.temperature} min={0} max={100} step={1} unit="°C" onChange={x.setTemperature} accent={accent} />
      </div>
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t(`${P}.p.volume`)} value={x.volume} min={V_MIN} max={V_MAX} step={0.05} unit="L" onChange={x.setVolume} format={(v) => fmt(v, 2)} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.3, 2.0, 4.6], target: [0.3, 0.7, 0] }}
      scene={<EquilibriumScene sim={x.sim} glass={dark ? '#9fb3d9' : '#a9bad6'} labels={{ no2: t(`${P}.no2Label`), n2o4: t(`${P}.n2o4Label`), reading: `${fmtInt(x.temperature)} °C · ${shiftText}` }} />}
      fallback2D={<Equilibrium2D sim={x.sim} label={t('lab.view2d', { name: t('catalog.chemical-equilibrium.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ temperature: x.temperature, volume: x.volume }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.temperature`), value: fmtInt(x.temperature), unit: '°C' },
        { label: t(`${P}.p.volume`), value: fmt(x.volume, 2), unit: 'L' },
        { label: '[N2O4]', value: fmtSig(x.n2o4, 3), unit: 'mol/L' },
        { label: '[NO2]', value: fmtSig(x.no2, 3), unit: 'mol/L' },
        { label: 'Kc', value: fmtSig(x.K, 3), unit: 'mol/L' },
        { label: 'Qc', value: Number.isFinite(x.Q) ? fmtSig(x.Q, 3) : 'infinite', unit: 'mol/L' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setTemperature(Math.min(100, x.temperature + 5)),
        decrease: () => x.setTemperature(Math.max(0, x.temperature - 5)),
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
