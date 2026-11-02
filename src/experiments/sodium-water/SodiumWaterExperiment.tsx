import { ArrowDownToLine } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SoundControls } from '../../components/chemistry/SoundControls'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { findExperiment } from '../../data/experiments'
import { ALKALI, ALKALI_IDS, MOLAR_VOLUME, WATER_C, finalTemperature, totalMoles, type AlkaliMetal } from '../../engines/sodiumWater'
import { useChemSound } from '../../lib/chemistry/useChemSound'
import { fmt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { SodiumWater2D } from './SodiumWater2D'
import { SodiumWaterScene } from './SodiumWaterScene'
import { SPEEDS, useSodiumWater } from './useSodiumWater'

const P = 'exp.sodium-water'

export default function SodiumWaterExperiment() {
  const { t } = useTranslation()
  const x = useSodiumWater()
  const c = useChartTheme()
  const experiment = findExperiment('chemistry', 'sodium-water')!
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const m = ALKALI[x.metal]
  const sound = useChemSound(['sizzle', 'fizz', 'fire', 'pop'])

  // Sounds follow the reaction: a hiss as the metal hits the water, fizzing while it reacts,
  // the roar of burning hydrogen, and a small pop as the last bit reacts.
  const { play, loop } = sound
  const prevPhase = useRef(x.phase)
  useEffect(() => {
    if (prevPhase.current === 'falling' && x.phase === 'reacting') play('sizzle')
    if (prevPhase.current === 'reacting' && x.phase === 'done' && x.metal !== 'Li') play('pop', 0.6)
    prevPhase.current = x.phase
  }, [x.phase, x.metal, play])
  const fizzing = x.phase === 'reacting' && x.running
  useEffect(() => loop('fizz', fizzing, { volume: x.metal === 'Li' ? 0.5 : 1 }), [fizzing, x.metal, loop])
  const burning = fizzing && x.burning
  useEffect(() => loop('fire', burning), [burning, loop])

  const metalName = (id: AlkaliMetal) => t(`${P}.metals.${id}`)
  const n = totalMoles(x.params)
  const nReacted = n * x.fractionReacted
  const phaseText = t(`${P}.phase.${x.phase}`)

  const measurements: Measurement[] = [
    { id: 'temp', label: t(`${P}.m.temp`), value: fmt(x.temp, 1), unit: '°C', tone: 'accent', sub: t(`${P}.m.tempSub`, { value: fmt(x.temp - x.initialTemp, 1) }) },
    { id: 'h2', label: t(`${P}.m.h2`), value: fmt(x.h2, 1), unit: 'mL', sub: t(`${P}.m.h2Sub`, { value: fmt((nReacted / 2) * 1000, 2) }) },
    { id: 'metal', label: t(`${P}.m.metal`), value: fmt(x.massLeft, 3), unit: 'g', sub: phaseText },
    { id: 'rate', label: t(`${P}.m.rate`), value: fmt(x.rate * 1000, 2), unit: 'mmol/s', tone: x.burning ? 'warn' : 'default', sub: x.burning ? t(`${P}.m.burning`) : undefined },
    { id: 'ph', label: 'pH', value: fmt(x.pH, 2), sub: x.phenolphthalein ? (x.pH > 8.2 ? t(`${P}.m.pink`) : t(`${P}.m.colourless`)) : undefined },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'temp',
      title: t(`${P}.chart.temp`),
      data: x.log,
      caption: t(`${P}.chart.tempCaption`, { value: fmt(finalTemperature(x.params), 1) }),
      render: (d: typeof x.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={['auto', 'auto']} width={48} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.temp`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 1)} s`} formatter={(v) => [`${fmt(Number(v), 2)} °C`, t(`${P}.m.temp`)]} />
            <Line dataKey="temp" stroke={c.chemistry} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-sodium-water', headers: ['time_s', 'temperature_C', 'hydrogen_mL', 'metal_g'], rows: x.log.map((r) => [r.t, r.temp, r.h2, r.mass]) }),
    },
    {
      id: 'h2',
      title: t(`${P}.chart.h2`),
      data: x.log,
      caption: t(`${P}.chart.h2Caption`, { value: fmt((n / 2) * MOLAR_VOLUME * 1000, 0) }),
      render: (d: typeof x.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, 'auto']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[0, 'auto']} width={48} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.h2`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 1)} s`} formatter={(v) => [`${fmt(Number(v), 1)} mL`, t(`${P}.m.h2`)]} />
            <Line dataKey="h2" stroke={c.chemistry} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-sodium-water-hydrogen', headers: ['time_s', 'hydrogen_mL'], rows: x.log.map((r) => [r.t, r.h2]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'moles',
      title: t(`${P}.f.molesTitle`),
      expression: (
        <>
          <V>n</V>({m.id}) = <Frac n={<V>m</V>} d={<V>M</V>} />, <V>n</V>(H<Sub>2</Sub>) = <Frac n={<><V>n</V>({m.id})</>} d="2" />
        </>
      ),
      substituted: (
        <>
          {fmt(x.mass, 3)} / {fmt(m.molarMass, 2)} = {fmt(n * 1000, 2)} mmol → <b>{fmt((n / 2) * 1000, 2)} mmol H₂</b>
        </>
      ),
      variables: [
        { symbol: <V>m</V>, name: t(`${P}.f.mass`), unit: 'g', value: fmt(x.mass, 3) },
        { symbol: <V>M</V>, name: t(`${P}.f.molar`), unit: 'g/mol', value: fmt(m.molarMass, 2) },
      ],
      explanation: t(`${P}.f.molesExplain`, { metal: m.id }),
    },
    {
      id: 'volume',
      title: t(`${P}.f.volumeTitle`),
      expression: (
        <>
          <V>V</V>(H<Sub>2</Sub>) = <V>n</V>(H<Sub>2</Sub>) · <V>V</V><Sub>m</Sub>
        </>
      ),
      substituted: (
        <>
          {fmt((nReacted / 2) * 1000, 3)} mmol · {fmt(MOLAR_VOLUME, 2)} L/mol = <b>{fmt(x.h2, 1)} mL</b>
        </>
      ),
      variables: [{ symbol: <><V>V</V><Sub>m</Sub></>, name: t(`${P}.f.vm`), unit: 'L/mol', value: fmt(MOLAR_VOLUME, 2) }],
      explanation: t(`${P}.f.volumeExplain`),
    },
    {
      id: 'heat',
      title: t(`${P}.f.heatTitle`),
      expression: (
        <>
          Δ<V>T</V> = <Frac n={<><V>n</V> · |Δ<V>H</V>|</>} d={<><V>m</V><Sub>water</Sub> · <V>c</V></>} />
        </>
      ),
      substituted: (
        <>
          ({fmt(nReacted * 1000, 2)} mmol · {fmt(Math.abs(m.deltaH), 1)} kJ/mol) / ({fmt(x.waterVolume, 0)} g · {fmt(WATER_C, 2)} J/(g·K)) = <b>{fmt(x.temp - x.initialTemp, 2)} K</b>
        </>
      ),
      variables: [
        { symbol: <>Δ<V>H</V></>, name: t(`${P}.f.dH`), unit: 'kJ/mol', value: fmt(m.deltaH, 1) },
        { symbol: <V>c</V>, name: t(`${P}.f.c`), unit: 'J/(g·K)', value: fmt(WATER_C, 2) },
      ],
      explanation: t(`${P}.f.heatExplain`),
    },
  ]

  const dropButton = (large = false) => (
    <Button variant="primary" onClick={x.drop} disabled={x.phase !== 'ready'} className={large ? 'h-14 px-5 text-lg' : 'w-full'}>
      <ArrowDownToLine className="h-4 w-4" aria-hidden />
      {t(`${P}.drop`, { metal: metalName(x.metal).toLowerCase() })}
    </Button>
  )
  const metalSelect = (
    <SelectField<AlkaliMetal> label={t(`${P}.p.metal`)} value={x.metal} options={ALKALI_IDS.map((id) => ({ value: id, label: `${metalName(id)} (${id})` }))} onChange={x.setMetal} />
  )

  const controls = (
    <>
      {metalSelect}
      <ParamSlider label={t(`${P}.p.mass`)} value={x.mass} min={0.05} max={1} step={0.05} unit="g" onChange={x.setMass} format={(v) => fmt(v, 2)} hint={t(`${P}.p.massHint`)} />
      <ParamSlider label={t(`${P}.p.water`)} value={x.waterVolume} min={50} max={250} step={10} unit="mL" onChange={x.setWaterVolume} format={(v) => fmt(v, 0)} />
      <ParamSlider label={t(`${P}.p.temp`)} value={x.initialTemp} min={5} max={50} step={1} unit="°C" onChange={x.setInitialTemp} format={(v) => fmt(v, 0)} hint={t(`${P}.p.tempHint`)} />
      <Toggle label={t(`${P}.p.indicator`)} description={t(`${P}.p.indicatorHint`)} checked={x.phenolphthalein} onChange={x.setPhenolphthalein} />
      {dropButton()}
      <SoundControls />
      <p className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">{t(`${P}.safety`)}</p>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0.8, 3.6, 5.6], target: [0, 1.1, 0] }}
      scene={<SodiumWaterScene ctl={x} labels={{ temp: `${fmt(x.temp, 1)} °C`, metal: `${m.id} · ${fmt(x.massLeft, 3)} g` }} />}
      fallback2D={<SodiumWater2D ctl={x} label={t('lab.view2d', { name: t('catalog.sodium-water.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ metal: x.metal, mass: x.mass, waterVolume: x.waterVolume, initialTemp: x.initialTemp }}
      viewport={viewport}
      controls={controls}
      presenterControls={
        <>
          <div className="min-w-[220px]">{metalSelect}</div>
          {dropButton(true)}
        </>
      }
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.metal`), value: m.id },
        { label: t(`${P}.p.mass`), value: fmt(x.mass, 2), unit: 'g' },
        { label: t(`${P}.p.water`), value: fmt(x.waterVolume, 0), unit: 'mL' },
        { label: t(`${P}.m.temp`), value: fmt(x.temp, 1), unit: '°C' },
        { label: t(`${P}.m.h2`), value: fmt(x.h2, 1), unit: 'mL' },
        { label: 'pH', value: fmt(x.pH, 2) },
        { label: 'state', value: x.phase + (x.burning ? ', hydrogen burning' : '') },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{ running: x.running, togglePlay: x.togglePlay, reset: x.reset, increase: x.drop }}
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
