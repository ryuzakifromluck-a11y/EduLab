import { Flame, Power, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SoundControls } from '../../components/chemistry/SoundControls'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { findExperiment } from '../../data/experiments'
import {
  ELECTRODE_IDS,
  ELECTROLYTES,
  ELECTROLYTE_IDS,
  FARADAY,
  MOLAR_VOLUME,
  currentEfficiency,
  decompositionVoltage,
  type ElectrodeMaterial,
  type Electrolyte,
} from '../../engines/electrolysisWater'
import { useChemSound } from '../../lib/chemistry/useChemSound'
import { fmt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { Electrolysis2D } from './Electrolysis2D'
import { ElectrolysisScene } from './ElectrolysisScene'
import { SPEEDS, useElectrolysis } from './useElectrolysis'

const P = 'exp.electrolysis-water'

export default function ElectrolysisExperiment() {
  const { t } = useTranslation()
  const x = useElectrolysis()
  const c = useChartTheme()
  const experiment = findExperiment('chemistry', 'electrolysis-water')!
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const sound = useChemSound(['click', 'hum', 'bubble', 'pop', 'relight'])
  const { play, loop } = sound

  const bubbling = x.powerOn && x.current > 1e-4
  useEffect(() => loop('hum', x.powerOn), [x.powerOn, loop])
  useEffect(() => loop('bubble', bubbling, { volume: 0.6 }), [bubbling, loop])

  const togglePower = () => {
    x.togglePower()
    play('click')
  }
  const testH2 = () => {
    if (x.testHydrogen() === 'pop') play('pop')
  }
  const testO2 = () => {
    if (x.testOxygen() === 'relight') play('relight')
  }

  const v = x.volumes
  const eff = currentEfficiency(v)
  const nH2 = (x.charge / (2 * FARADAY)) * 1000
  const electrolyteName = (e: Electrolyte) => `${t(`${P}.electrolytes.${e}`)}${e === 'distilled' ? '' : ` (${ELECTROLYTES[e].formula})`}`

  const measurements: Measurement[] = [
    { id: 'current', label: t(`${P}.m.current`), value: fmt(x.current, 3), unit: 'A', tone: 'accent', sub: x.availableCurrent === 0 ? t(`${P}.m.belowEd`, { value: fmt(decompositionVoltage(x.electrode), 2) }) : t(`${P}.m.resistance`, { value: fmt(x.resistance, 1) }) },
    { id: 'h2', label: t(`${P}.m.h2`), value: fmt(v.h2, 1), unit: 'mL', sub: t(`${P}.m.cathode`) },
    { id: 'o2', label: t(`${P}.m.o2`), value: fmt(v.o2, 1), unit: 'mL', sub: x.inertAnode ? t(`${P}.m.anode`) : t(`${P}.m.copperAnode`) },
    { id: 'ratio', label: t(`${P}.m.ratio`), value: x.ratio !== null ? `${fmt(x.ratio, 2)} : 1` : '—', sub: t(`${P}.m.ratioSub`) },
    { id: 'charge', label: t(`${P}.m.charge`), value: fmt(x.charge, 1), unit: 'C', sub: t(`${P}.m.efficiency`, { value: fmt(eff * 100, 1) }) },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'volumes',
      title: t(`${P}.chart.volumes`),
      data: x.log,
      caption: t(`${P}.chart.volumesCaption`),
      render: (d: typeof x.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} tickFormatter={(val) => fmt(val, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[0, 'auto']} width={44} tickFormatter={(val) => fmt(val, 0)} label={L.y(t(`${P}.axis.volume`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(val) => `${fmt(Number(val), 0)} s`} formatter={(val, name) => [`${fmt(Number(val), 1)} mL`, name]} />
            <Legend verticalAlign="top" height={24} />
            <Line dataKey="h2" name="H₂" stroke={c.chemistry} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="o2" name="O₂" stroke={c.marker} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-electrolysis', headers: ['time_s', 'charge_C', 'hydrogen_mL', 'oxygen_mL'], rows: x.log.map((r) => [r.t, r.q, r.h2, r.o2]) }),
    },
    {
      id: 'charge',
      title: t(`${P}.chart.charge`),
      data: x.log,
      caption: t(`${P}.chart.chargeCaption`),
      render: (d: typeof x.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="q" type="number" domain={[0, 'auto']} tickFormatter={(val) => fmt(val, 0)} label={L.x(t(`${P}.axis.charge`))} {...axisProps(c)} />
            <YAxis domain={[0, 'auto']} width={44} tickFormatter={(val) => fmt(val, 0)} label={L.y(t(`${P}.axis.volume`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(val) => `${fmt(Number(val), 1)} C`} formatter={(val, name) => [`${fmt(Number(val), 1)} mL`, name]} />
            <Legend verticalAlign="top" height={24} />
            <Line dataKey="h2" name="H₂" stroke={c.chemistry} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="o2" name="O₂" stroke={c.marker} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-electrolysis-charge', headers: ['charge_C', 'hydrogen_mL', 'oxygen_mL'], rows: x.log.map((r) => [r.q, r.h2, r.o2]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'faraday',
      title: t(`${P}.f.faradayTitle`),
      expression: (
        <>
          <V>n</V>(H<Sub>2</Sub>) = <Frac n={<><V>I</V> · <V>t</V></>} d={<>2<V>F</V></>} />, <V>n</V>(O<Sub>2</Sub>) = <Frac n={<><V>I</V> · <V>t</V></>} d={<>4<V>F</V></>} />
        </>
      ),
      substituted: (
        <>
          {fmt(x.charge, 1)} C / (2 · {FARADAY}) = <b>{fmt(nH2, 3)} mmol H₂</b>, {fmt(nH2 / 2, 3)} mmol O₂
        </>
      ),
      variables: [
        { symbol: <><V>I</V> · <V>t</V></>, name: t(`${P}.f.charge`), unit: 'C', value: fmt(x.charge, 1) },
        { symbol: <V>F</V>, name: t(`${P}.f.F`), unit: 'C/mol', value: String(FARADAY) },
      ],
      explanation: t(`${P}.f.faradayExplain`),
    },
    {
      id: 'volume',
      title: t(`${P}.f.volumeTitle`),
      expression: (
        <>
          <V>V</V> = <V>n</V> · <V>V</V><Sub>m</Sub>
        </>
      ),
      substituted: (
        <>
          {fmt(nH2, 3)} mmol · {fmt(MOLAR_VOLUME, 2)} L/mol = <b>{fmt(v.h2Theory, 1)} mL H₂</b>, {fmt(v.o2Theory, 1)} mL O₂
        </>
      ),
      variables: [{ symbol: <><V>V</V><Sub>m</Sub></>, name: t(`${P}.f.vm`), unit: 'L/mol', value: fmt(MOLAR_VOLUME, 2) }],
      explanation: t(`${P}.f.volumeExplain`),
    },
    {
      id: 'current',
      title: t(`${P}.f.currentTitle`),
      expression: (
        <>
          <V>I</V> = <Frac n={<><V>U</V> − <V>U</V><Sub>d</Sub></>} d={<V>R</V>} />
        </>
      ),
      substituted: (
        <>
          ({fmt(x.voltage, 1)} − {fmt(decompositionVoltage(x.electrode), 2)}) V / {fmt(x.resistance, 1)} Ω = <b>{fmt(x.availableCurrent, 3)} A</b>
        </>
      ),
      variables: [
        { symbol: <><V>U</V><Sub>d</Sub></>, name: t(`${P}.f.ud`), unit: 'V', value: fmt(decompositionVoltage(x.electrode), 2) },
        { symbol: <V>R</V>, name: t(`${P}.f.r`), unit: 'Ω', value: fmt(x.resistance, 1), effect: t(`${P}.f.rEffect`) },
      ],
      explanation: t(`${P}.f.currentExplain`),
    },
  ]

  const powerButton = (large = false) => (
    <Button variant={x.powerOn ? 'primary' : 'secondary'} onClick={togglePower} aria-pressed={x.powerOn} className={large ? 'h-14 px-5 text-lg' : 'w-full'}>
      <Power className="h-4 w-4" aria-hidden />
      {x.powerOn ? t(`${P}.powerOff`) : t(`${P}.powerOn`)}
    </Button>
  )
  const testButtons = (large = false) => (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={testH2} className={large ? 'h-14 px-5 text-lg' : 'flex-1'}>
        <Flame className="h-4 w-4" aria-hidden />
        {t(`${P}.testH2`)}
      </Button>
      <Button variant="secondary" onClick={testO2} className={large ? 'h-14 px-5 text-lg' : 'flex-1'}>
        <Sparkles className="h-4 w-4" aria-hidden />
        {t(`${P}.testO2`)}
      </Button>
    </div>
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.voltage`)} value={x.voltage} min={0} max={12} step={0.1} unit="V" onChange={x.setVoltage} format={(val) => fmt(val, 1)} hint={t(`${P}.p.voltageHint`, { value: fmt(decompositionVoltage(x.electrode), 2) })} />
      <SelectField<Electrolyte> label={t(`${P}.p.electrolyte`)} value={x.electrolyte} options={ELECTROLYTE_IDS.map((e) => ({ value: e, label: electrolyteName(e) }))} onChange={x.setElectrolyte} />
      <ParamSlider label={t(`${P}.p.concentration`)} value={x.concentration} min={0.05} max={1} step={0.05} unit="mol/L" onChange={x.setConcentration} format={(val) => fmt(val, 2)} disabled={x.electrolyte === 'distilled'} />
      <SelectField<ElectrodeMaterial> label={t(`${P}.p.electrode`)} value={x.electrode} options={ELECTRODE_IDS.map((e) => ({ value: e, label: t(`${P}.electrodes.${e}`) }))} onChange={x.setElectrode} />
      {powerButton()}
      {testButtons()}
      {x.test && (
        <p role="status" className="rounded-xl bg-surface-2 p-3 text-sm text-ink">
          {t(`${P}.test.${x.test.result}`)}
        </p>
      )}
      <SoundControls />
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 2.6, 7.4], target: [0, 2.0, 0] }}
      scene={
        <ElectrolysisScene
          ctl={x}
          labels={{
            h2: `H₂ ${fmt(v.h2, 1)} mL`,
            o2: x.inertAnode ? `O₂ ${fmt(v.o2, 1)} mL` : 'Cu → Cu²⁺',
            supply: `${fmt(x.voltage, 1)} V · ${fmt(x.current, 2)} A`,
            cathode: t(`${P}.labels.cathode`),
            anode: t(`${P}.labels.anode`),
          }}
        />
      }
      fallback2D={<Electrolysis2D ctl={x} label={t('lab.view2d', { name: t('catalog.electrolysis-water.title') })} />}
      controls={{ running: x.powerOn, onTogglePlay: togglePower, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ voltage: x.voltage, electrolyte: x.electrolyte, concentration: x.concentration, electrode: x.electrode }}
      viewport={viewport}
      controls={controls}
      presenterControls={
        <>
          {powerButton(true)}
          {testButtons(true)}
        </>
      }
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.voltage`), value: fmt(x.voltage, 1), unit: 'V' },
        { label: t(`${P}.p.electrolyte`), value: `${x.electrolyte}, ${fmt(x.concentration, 2)} mol/L` },
        { label: t(`${P}.p.electrode`), value: x.electrode },
        { label: t(`${P}.m.current`), value: fmt(x.current, 3), unit: 'A' },
        { label: 'H2', value: fmt(v.h2, 1), unit: 'mL' },
        { label: 'O2', value: fmt(v.o2, 1), unit: 'mL' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{ running: x.powerOn, togglePlay: togglePower, reset: x.reset, increase: () => x.setVoltage(Math.min(12, +(x.voltage + 0.5).toFixed(1))), decrease: () => x.setVoltage(Math.max(0, +(x.voltage - 0.5).toFixed(1))) }}
      guide={{
        instructions: [1, 2, 3, 4, 5].map((i) => t(`${P}.guide.step${i}`)),
        science: (
          <>
            <p>
              <Trans i18nKey={`${P}.guide.science1`} components={{ b: <b className="text-ink" /> }} />
            </p>
            <p>{t(`${P}.guide.science2`)}</p>
            <p>{t(`${P}.guide.science3`)}</p>
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
