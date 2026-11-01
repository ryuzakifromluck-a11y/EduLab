import { Pause, Play, RotateCcw } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { DETECTION_NG, EXTENSION_RATE, EXTENSION_TEMP, TARGETS, amplify, copiesToNg, cycleProfile, primerTm, profileCurve, recommendedAnneal, type Polymerase } from '../../engines/pcr'
import { LADDER, migrationDistance } from '../../engines/gelElectrophoresis'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { Frac, FormulaExplorer, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtInt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { GelImage } from '../gel-electrophoresis/GelImage'
import { sci, sup } from './format'
import { SPEEDS, usePcr } from './usePcr'
import { PcrScene } from './PcrScene'
import { Pcr2D } from './Pcr2D'

const P = 'exp.pcr'
/** A 1 % gel after a 40-minute run at 100 V, used to show the PCR product next to the ladder. */
const GEL_RUN = { agarose: 1, voltage: 100, polarity: 'normal' as const }
const GEL_SECONDS = 40 * 60

export default function PcrExperiment() {
  const { t } = useTranslation()
  const x = usePcr()
  const c = useChartTheme()
  const experiment = findExperiment('biology', 'pcr')!
  const accent = c.biology
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const s = x.settings
  const o = x.outcome
  const target = o.target
  const st = x.state

  const full = useMemo(() => amplify(s), [s])
  const profile = useMemo(() => profileCurve(s, 2), [s])
  const cycleTime = cycleProfile(s).duration
  const progressData = full.map((p, i) => ({ ...p, actual: i <= x.cycle ? p.copies : undefined }))
  const phaseName = t(`${P}.phase.${st.phase}`)
  const ng = copiesToNg(x.copies, o.amplicon)

  const measurements: Measurement[] = [
    { id: 'cycle', label: t(`${P}.m.cycle`), value: `${x.cycle} / ${s.cycles}`, sub: t(`${P}.m.cycleTime`, { value: fmtInt(cycleTime) }) },
    { id: 'temp', label: t(`${P}.m.temp`), value: fmt(st.temp, 1), unit: '°C', sub: phaseName },
    { id: 'copies', label: t(`${P}.m.copies`), value: sci(x.copies), tone: 'accent', sub: t(`${P}.m.fold`, { value: sci(x.copies / s.templateCopies) }) },
    { id: 'ideal', label: t(`${P}.m.ideal`), value: sci(s.templateCopies * Math.pow(2, x.cycle)), sub: `N₀ · 2${sup(x.cycle)}` },
    {
      id: 'mass',
      label: t(`${P}.m.mass`),
      value: ng < 0.01 ? '<0.01' : fmt(ng, ng < 10 ? 2 : 0),
      unit: 'ng',
      tone: x.done && !o.visible ? 'warn' : 'default',
      sub: ng >= DETECTION_NG ? t(`${P}.m.visible`) : t(`${P}.m.invisible`, { value: DETECTION_NG }),
    },
  ]

  // Gel picture: ladder next to the product as it is now (a smear of mispriming products when annealing is far too cold).
  const gelLanes = [
    { label: t(`${P}.gel.ladder`), bands: LADDER.map((bp) => ({ key: bp, distance: migrationDistance(bp, GEL_RUN, GEL_SECONDS), intensity: 0.6 })) },
    {
      label: t(`${P}.gel.product`),
      bands: [
        { key: 'p', distance: migrationDistance(o.amplicon, GEL_RUN, GEL_SECONDS), intensity: ng >= DETECTION_NG ? Math.min(1, Math.log10(ng / DETECTION_NG + 1) / 2) : 0 },
        ...(x.cycle > 0 && o.nonspecific > 0.2
          ? [180, 420, 1100].map((bp) => ({ key: bp, distance: migrationDistance(bp, GEL_RUN, GEL_SECONDS), intensity: Math.min(0.7, o.nonspecific * (ng >= DETECTION_NG ? 0.7 : 0.4)) }))
          : []),
      ],
    },
    { label: t(`${P}.gel.noTemplate`), bands: [] },
  ]

  const charts: ChartDef<any>[] = [
    {
      id: 'copies',
      title: t(`${P}.chart.copies`),
      data: progressData,
      caption: t(`${P}.chart.copiesCaption`),
      render: (d: typeof progressData) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="cycle" type="number" domain={[0, s.cycles]} label={L.x(t(`${P}.axis.cycle`))} {...axisProps(c)} />
            <YAxis scale="log" domain={[s.templateCopies, 'auto']} allowDataOverflow width={60} tickFormatter={(v) => sci(Number(v))} label={L.y(t(`${P}.axis.copies`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${t(`${P}.axis.cycle`)} ${v}`} formatter={(v, n) => [sci(Number(v)), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="ideal" name={t(`${P}.chart.ideal`)} stroke={c.accent2} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line dataKey="copies" name={t(`${P}.chart.predicted`)} stroke={c.axis} strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line dataKey="actual" name={t(`${P}.chart.actual`)} stroke={accent} strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
            <ReferenceDot x={x.cycle} y={x.copies} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-pcr-amplification', headers: ['cycle', 'copies', 'ideal_2n', 'efficiency'], rows: full.map((p) => [p.cycle, p.copies, p.ideal, p.efficiency]) }),
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
            <XAxis dataKey="t" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis domain={[30, 100]} width={48} label={L.y(t(`${P}.axis.temp`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `t = ${fmt(Number(v), 0)} s`} formatter={(v) => [`${fmt(Number(v), 1)} °C`, 'T']} />
            <ReferenceLine y={o.tm} stroke={c.accent3} strokeDasharray="5 4" label={{ value: `Tm = ${fmt(o.tm, 1)} °C`, fill: c.accent3, fontSize: 11, position: 'insideBottomRight' }} />
            <Line dataKey="temp" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            {x.sim.time > 0 && !x.done && <ReferenceDot x={(x.sim.time - x.cycle * cycleTime) % cycleTime} y={st.temp} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-pcr-thermal-profile', headers: ['time_s', 'temperature_C'], rows: profile.map((p) => [p.t, p.temp]) }),
    },
    {
      id: 'gel',
      title: t(`${P}.chart.gel`),
      data: gelLanes,
      caption: t(`${P}.chart.gelCaption`, { value: o.amplicon }),
      render: (d: typeof gelLanes) => <GelImage lanes={d} uv label={t(`${P}.chart.gel`)} />,
      csv: () => ({
        filename: 'edulab-pcr-runs',
        headers: ['run', 'target', 'cycles', 'anneal_C', 'copies', 'ng'],
        rows: x.readings.map((r) => [r.n, r.target, r.cycles, r.annealTemp, r.copies, r.ng]),
      }),
    },
  ]

  const tmF = primerTm(target.forward)
  const formulas: Formula[] = [
    {
      id: 'doubling',
      title: 'N = N₀ · 2ⁿ',
      expression: (
        <>
          <V>N</V> = <V>N</V><Sub>0</Sub> · 2<Sup><V>n</V></Sup>
        </>
      ),
      substituted: (
        <>
          {sci(s.templateCopies)} × 2<Sup>{x.cycle}</Sup> = <b>{sci(s.templateCopies * Math.pow(2, x.cycle))}</b>
        </>
      ),
      variables: [
        { symbol: <><V>N</V><Sub>0</Sub></>, name: t(`${P}.f.n0`), unit: '', value: sci(s.templateCopies) },
        { symbol: <V>n</V>, name: t(`${P}.f.n`), unit: '', value: String(x.cycle), effect: t(`${P}.f.nEffect`) },
        { symbol: <V>E</V>, name: t(`${P}.f.e`), unit: '', value: fmt(o.meanEfficiency, 2), effect: t(`${P}.f.eEffect`) },
      ],
      explanation: t(`${P}.f.doublingExplain`),
    },
    {
      id: 'tm',
      title: 'Tm',
      expression: (
        <>
          <V>T</V><Sub>m</Sub> = 64.9 + 41 · <Frac n={<>(G+C) − 16.4</>} d={<V>N</V>} />
        </>
      ),
      substituted: (
        <>
          {target.forward} → <b>{fmt(tmF, 1)} °C</b>
        </>
      ),
      variables: [
        { symbol: <V>N</V>, name: t(`${P}.f.length`), unit: 'nt', value: String(target.forward.length) },
        { symbol: <>G+C</>, name: t(`${P}.f.gc`), unit: '', value: String([...target.forward].filter((b) => b === 'G' || b === 'C').length) },
        { symbol: <><V>T</V><Sub>a</Sub></>, name: t(`${P}.f.ta`), unit: '°C', value: String(recommendedAnneal(target)), effect: t(`${P}.f.taEffect`) },
      ],
      explanation: t(`${P}.f.tmExplain`),
    },
    {
      id: 'extension',
      title: t(`${P}.f.extTitle`),
      expression: (
        <>
          <V>t</V><Sub>ext</Sub> ≥ <Frac n={<V>L</V>} d={<V>v</V>} />
        </>
      ),
      substituted: (
        <>
          {o.amplicon} bp ÷ {fmt(EXTENSION_RATE, 1)} bp/s = <b>{fmt(o.amplicon / EXTENSION_RATE, 0)} s</b> ({t(`${P}.f.yours`, { value: s.extensionTime })})
        </>
      ),
      variables: [
        { symbol: <V>L</V>, name: t(`${P}.f.amplicon`), unit: 'bp', value: String(o.amplicon) },
        { symbol: <V>v</V>, name: t(`${P}.f.rate`), unit: 'bp/s', value: fmt(EXTENSION_RATE, 1) },
      ],
      explanation: t(`${P}.f.extExplain`, { value: EXTENSION_TEMP }),
    },
  ]

  const runLabel = x.done ? t(`${P}.newRun`) : x.running ? t('lab.pause') : x.cycle > 0 || x.sim.time > 0 ? t(`${P}.resume`) : t(`${P}.start`)
  const runButton = (large = false) => (
    <Button variant="primary" onClick={x.togglePlay} className={large ? 'h-16 px-6 text-xl' : 'w-full'}>
      {x.done ? <RotateCcw className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden /> : x.running ? <Pause className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden /> : <Play className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />}
      {runLabel}
    </Button>
  )

  const controls = (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.target`)}</span>
        <Segmented
          label={t(`${P}.p.target`)}
          value={s.target}
          options={TARGETS.map((tg) => ({ value: tg.id, label: t(`${P}.target.${tg.id}`) }))}
          onChange={(id) => x.set({ target: id })}
        />
        <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.targetHint`, { size: o.amplicon, tm: fmt(o.tm, 1) })}</p>
      </div>
      <ParamSlider label={t(`${P}.p.cycles`)} value={s.cycles} min={1} max={40} step={1} onChange={(cycles) => x.set({ cycles })} accent={accent} />
      <ParamSlider label={t(`${P}.p.denature`)} value={s.denatureTemp} min={85} max={100} step={0.5} unit="°C" onChange={(denatureTemp) => x.set({ denatureTemp })} format={(v) => fmt(v, 1)} accent={accent} />
      <ParamSlider
        label={t(`${P}.p.anneal`)}
        value={s.annealTemp}
        min={40}
        max={72}
        step={1}
        unit="°C"
        onChange={(annealTemp) => x.set({ annealTemp })}
        accent={accent}
        hint={t(`${P}.p.annealHint`, { value: recommendedAnneal(target) })}
      />
      <ParamSlider label={t(`${P}.p.extension`)} value={s.extensionTime} min={10} max={120} step={5} unit="s" onChange={(extensionTime) => x.set({ extensionTime })} accent={accent} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.template`)}</span>
        <Segmented
          label={t(`${P}.p.template`)}
          value={s.templateCopies}
          options={[10, 100, 1e3, 1e4, 1e5, 1e6].map((n) => ({ value: n, label: `10${sup(Math.log10(n))}` }))}
          onChange={(templateCopies) => x.set({ templateCopies })}
        />
        <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.templateHint`, { value: sci(s.templateCopies) })}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.polymerase`)}</span>
        <Segmented
          label={t(`${P}.p.polymerase`)}
          value={s.polymerase}
          options={(['taq', 'ecoli'] as Polymerase[]).map((p) => ({ value: p, label: t(`${P}.polymerase.${p}`) }))}
          onChange={(polymerase) => x.set({ polymerase })}
        />
        <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.hint`)}</p>
      </div>
      {runButton()}
      <p className="text-xs leading-relaxed text-muted" aria-live="polite">
        {x.done ? t(`${P}.status.done`, { value: sci(x.copies) }) : t(`${P}.status.${st.phase}`)}
      </p>
      <RecordBox
        count={x.readings.length}
        title={t(`${P}.readings`, { count: x.readings.length })}
        hint={x.done ? t(`${P}.readingsHint`) : t(`${P}.readingsWait`)}
        onRecord={x.record}
        onClear={x.clearReadings}
        disabled={!x.done}
      />
    </>
  )

  const presenterControls = (
    <>
      {runButton(true)}
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.cycles`)} value={s.cycles} min={1} max={40} step={1} onChange={(cycles) => x.set({ cycles })} accent={accent} />
      </div>
    </>
  )

  const copiesText = `${sci(x.copies)} ${t(`${P}.copiesWord`)}`
  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 2.3, 6.2], target: [0, 1.3, 0] }}
      scene={<PcrScene sim={x.sim} display={[`${t(`${P}.m.cycle`)} ${x.cycle}/${s.cycles} · ${phaseName}`, `${fmt(st.temp, 1)} °C`]} />}
      fallback2D={<Pcr2D sim={x.sim} phaseLabel={phaseName} copiesLabel={copiesText} label={t('lab.view2d', { name: t('catalog.pcr.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ target: s.target, cycles: s.cycles, denatureTemp: s.denatureTemp, annealTemp: s.annealTemp, extensionTime: s.extensionTime, polymerase: s.polymerase }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.target`), value: `${t(`${P}.target.${s.target}`)} (${o.amplicon} bp)` },
        { label: t(`${P}.p.cycles`), value: String(s.cycles) },
        { label: t(`${P}.p.denature`), value: fmt(s.denatureTemp, 1), unit: '°C' },
        { label: t(`${P}.p.anneal`), value: String(s.annealTemp), unit: '°C' },
        { label: 'Primer Tm', value: fmt(o.tm, 1), unit: '°C' },
        { label: t(`${P}.p.extension`), value: String(s.extensionTime), unit: 's' },
        { label: t(`${P}.p.polymerase`), value: s.polymerase },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.set({ cycles: Math.min(40, s.cycles + 1) }),
        decrease: () => x.set({ cycles: Math.max(1, s.cycles - 1) }),
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
