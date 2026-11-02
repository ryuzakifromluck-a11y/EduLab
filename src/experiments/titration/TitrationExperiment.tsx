import { AlertTriangle, Droplet, Droplets, Pipette, RefreshCw } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { findExperiment } from '../../data/experiments'
import { INDICATORS, rgbaToCss, titrationCurve, titrationPoint, type IndicatorId } from '../../engines/titration'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { useUi } from '../../store/ui'
import { fmt, fmtSig } from '../../lib/format'
import { BURETTE_CAPACITY, DROP_VOLUME, SPEEDS, useTitration } from './useTitration'
import { TitrationScene } from './TitrationScene'
import { Titration2D } from './Titration2D'
import { SoundControls } from '../../components/chemistry/SoundControls'
import { useChemSound } from '../../lib/chemistry/useChemSound'

const INDICATOR_IDS = Object.keys(INDICATORS) as IndicatorId[]

export default function TitrationExperiment() {
  const { t } = useTranslation()
  const sound = useChemSound(['drip', 'swirl'])
  // A soft "plink" per drop, at most ~12 per second when the stopcock is wide open.
  const lastDrip = useRef(0)
  const x = useTitration({
    onDrop: () => {
      const now = performance.now()
      if (now - lastDrip.current < 80) return
      lastDrip.current = now
      sound.play('drip', { rate: 0.9 + Math.random() * 0.2 })
    },
  })
  const swirl = () => {
    x.swirl()
    sound.play('swirl')
  }
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'titration')!
  const accent = c.chemistry
  const { params, point, veq } = x

  const maxV = BURETTE_CAPACITY
  const curve = useMemo(() => titrationCurve(params, maxV, 250), [params, maxV])
  const derivative = useMemo(
    () =>
      curve.slice(1).map((pt, i) => {
        const prev = curve[i]
        const dv = pt.volume - prev.volume
        return { volume: (pt.volume + prev.volume) / 2, slope: dv > 0 ? (pt.pH - prev.pH) / dv : 0 }
      }),
    [curve],
  )

  const regionText = t(`exp.titration.region.${point.region}`)
  const nAcid = params.acidConcentration * params.acidVolume
  const nBase = params.baseConcentration * x.addedVolume

  const measurements: Measurement[] = [
    { id: 'ph', label: t('exp.titration.m.ph'), value: fmt(point.pH, 2), tone: 'accent', sub: regionText },
    {
      id: 'added',
      label: t('exp.titration.m.added'),
      value: fmt(x.addedVolume, 2),
      unit: 'mL',
      sub: t('exp.titration.m.total', { value: fmt(point.totalVolume, 2) }),
    },
    {
      id: 'veq',
      label: t('exp.titration.m.equivalence'),
      value: fmt(veq, 2),
      unit: 'mL',
      tone: x.reachable ? 'default' : 'warn',
      sub: t('exp.titration.m.eqPh'),
    },
    {
      id: 'ind',
      label: t('exp.titration.m.indicator'),
      value: t(`exp.titration.colorState.${x.colorState}`),
      tone: x.indicatorPhase === 'endPoint' ? 'accent' : 'default',
      sub: x.indicatorPhase === 'flash'
        ? t('exp.titration.m.flash')
        : x.endPoint.volume !== null
          ? t('exp.titration.m.endPoint', { value: fmt(x.endPoint.volume, 2) })
          : t('exp.titration.m.noEndPoint'),
    },
    {
      id: 'conc',
      label: t('exp.titration.m.initial'),
      value: `${fmt(params.acidConcentration, 3)}`,
      unit: 'mol/L HCl',
      sub: `${fmt(params.baseConcentration, 3)} mol/L NaOH`,
    },
  ]

  const ttip = tooltipProps(c)
  const xAxis = (
    <XAxis
      dataKey="volume"
      type="number"
      domain={[0, maxV]}
      tickFormatter={(v) => fmt(v, 0)}
      label={{ value: t('exp.titration.axis.volume'), position: 'insideBottom', offset: -10, fill: c.text, fontSize: 12 }}
      {...axisProps(c)}
    />
  )
  const phAxis = (
    <YAxis
      dataKey="pH"
      type="number"
      domain={[0, 14]}
      ticks={[0, 2, 4, 6, 8, 10, 12, 14]}
      width={44}
      label={{ value: 'pH', angle: -90, position: 'insideLeft', offset: 12, fill: c.text, fontSize: 12 }}
      {...axisProps(c)}
    />
  )
  const eqLine = x.reachable && (
    <ReferenceLine
      x={veq}
      stroke={c.accent3}
      strokeDasharray="5 4"
      label={{ value: t('exp.titration.chart.eq'), position: 'insideTopRight', fill: c.accent3, fontSize: 11 }}
    />
  )
  const band = (
    <ReferenceArea
      y1={x.indicator.range[0]}
      y2={x.indicator.range[1]}
      fill={rgbaToCss({ ...x.indicator.baseColor, a: 0.14 })}
      stroke="none"
      label={{ value: t(`exp.titration.indicators.${x.indicatorId}`), position: 'insideLeft', fill: c.text, fontSize: 10 }}
    />
  )

  const charts: ChartDef<any>[] = [
    {
      id: 'measured',
      title: t('exp.titration.chart.measured'),
      data: x.log,
      caption: t('exp.titration.chart.measuredCaption'),
      render: (data: typeof x.log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            {xAxis}
            {phAxis}
            {band}
            {eqLine}
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 2)} mL`} formatter={(v) => [fmt(Number(v), 2), 'pH']} />
            <Line dataKey="pH" stroke={accent} strokeWidth={2} dot={data.length < 60 ? { r: 2.5 } : false} isAnimationActive={false} />
            <ReferenceDot x={x.addedVolume} y={point.pH} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-titration-measurements',
        headers: ['added_NaOH_mL', 'pH'],
        rows: x.logRef.current.map((p) => [p.volume, p.pH]),
      }),
    },
    {
      id: 'curve',
      title: t('exp.titration.chart.curve'),
      data: { curve, measured: x.log },
      caption: t('exp.titration.chart.curveCaption'),
      render: (d: { curve: typeof curve; measured: typeof x.log }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            {xAxis}
            {phAxis}
            {band}
            {eqLine}
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 2)} mL`} formatter={(v, n) => [fmt(Number(v), 2), n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            <Line data={d.curve} dataKey="pH" name={t('exp.titration.chart.theory')} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter data={d.measured.filter((_, i, a) => a.length < 120 || i % Math.ceil(a.length / 120) === 0)} dataKey="pH" name={t('exp.titration.chart.yours')} fill={c.accent2} isAnimationActive={false} />
            {x.reachable && <ReferenceDot x={veq} y={7} r={5} fill={c.accent3} stroke={c.marker} />}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-titration-curve',
        headers: ['added_NaOH_mL', 'pH_theoretical'],
        rows: curve.map((p) => [p.volume, p.pH]),
      }),
    },
    {
      id: 'derivative',
      title: t('exp.titration.chart.derivative'),
      data: derivative,
      caption: t('exp.titration.chart.derivativeCaption'),
      render: (data: typeof derivative) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            {xAxis}
            <YAxis
              width={56}
              tickFormatter={(v) => fmtSig(v, 2)}
              label={{ value: 'ΔpH/ΔV (1/mL)', angle: -90, position: 'insideLeft', offset: 12, fill: c.text, fontSize: 12, style: { textAnchor: 'middle' } }}
              {...axisProps(c)}
            />
            {eqLine}
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 2)} mL`} formatter={(v) => [fmtSig(Number(v), 3), 'ΔpH/ΔV']} />
            <Line dataKey="slope" stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({
        filename: 'edulab-titration-derivative',
        headers: ['added_NaOH_mL', 'dpH_dV_per_mL'],
        rows: derivative.map((p) => [p.volume, p.slope]),
      }),
    },
  ]

  const Ca = <><V>C</V><Sub>a</Sub></>
  const Va = <><V>V</V><Sub>a</Sub></>
  const Cb = <><V>C</V><Sub>b</Sub></>
  const Vb = <><V>V</V><Sub>b</Sub></>
  const baseVars = [
    { symbol: Ca, name: t('exp.titration.f.Ca'), unit: 'mol/L', value: fmt(params.acidConcentration, 3) },
    { symbol: Va, name: t('exp.titration.f.Va'), unit: 'mL', value: fmt(params.acidVolume, 1) },
    { symbol: Cb, name: t('exp.titration.f.Cb'), unit: 'mol/L', value: fmt(params.baseConcentration, 3) },
    { symbol: Vb, name: t('exp.titration.f.Vb'), unit: 'mL', value: fmt(x.addedVolume, 2) },
  ]

  const formulas: Formula[] = [
    {
      id: 'eq',
      title: t('exp.titration.f.eqTitle'),
      expression: (
        <>
          <V>V</V><Sub>eq</Sub> = <Frac n={<>{Ca} · {Va}</>} d={Cb} />
        </>
      ),
      substituted: (
        <>
          ({fmt(params.acidConcentration, 3)} × {fmt(params.acidVolume, 1)}) / {fmt(params.baseConcentration, 3)} = <b>{fmt(veq, 2)} mL</b>
        </>
      ),
      variables: baseVars.slice(0, 3),
      explanation: t('exp.titration.f.eqExplain'),
    },
    {
      id: 'before',
      title: t('exp.titration.f.beforeTitle'),
      expression: (
        <>
          [H<Sup>+</Sup>] = <Frac n={<>{Ca}{Va} − {Cb}{Vb}</>} d={<>{Va} + {Vb}</>} />
          , pH = −log[H<Sup>+</Sup>]
        </>
      ),
      substituted:
        point.region === 'before' ? (
          <>
            ({fmt(nAcid, 3)} − {fmt(nBase, 3)}) mmol / {fmt(point.totalVolume, 2)} mL = {fmtSig(point.hydronium, 3)} M → <b>pH {fmt(point.pH, 2)}</b>
          </>
        ) : (
          <>{t('exp.titration.f.notThisRegion')}</>
        ),
      variables: [...baseVars, { symbol: <>[H<Sup>+</Sup>]</>, name: t('exp.titration.f.H'), unit: 'mol/L', value: fmtSig(point.hydronium, 3) }],
      explanation: t('exp.titration.f.beforeExplain'),
    },
    {
      id: 'after',
      title: t('exp.titration.f.afterTitle'),
      expression: (
        <>
          [OH<Sup>−</Sup>] = <Frac n={<>{Cb}{Vb} − {Ca}{Va}</>} d={<>{Va} + {Vb}</>} />
          , pH = 14 − pOH
        </>
      ),
      substituted:
        point.region === 'after' ? (
          <>
            ({fmt(nBase, 3)} − {fmt(nAcid, 3)}) mmol / {fmt(point.totalVolume, 2)} mL = {fmtSig(point.hydroxide, 3)} M → pOH {fmt(point.pOH, 2)} → <b>pH {fmt(point.pH, 2)}</b>
          </>
        ) : (
          <>{t('exp.titration.f.notThisRegion')}</>
        ),
      variables: [...baseVars, { symbol: <>[OH<Sup>−</Sup>]</>, name: t('exp.titration.f.OH'), unit: 'mol/L', value: fmtSig(point.hydroxide, 3) }],
      explanation: t('exp.titration.f.afterExplain'),
    },
    {
      id: 'exact',
      title: t('exp.titration.f.exactTitle'),
      expression: (
        <>
          [H<Sup>+</Sup>] = <Frac n={<><V>D</V> + √(<V>D</V><Sup>2</Sup> + 4<V>K</V><Sub>w</Sub>)</>} d="2" />
        </>
      ),
      substituted: (
        <>
          <V>D</V> = {fmtSig((nAcid - nBase) / point.totalVolume, 3)} M → <b>pH {fmt(point.pH, 2)}</b>
        </>
      ),
      variables: [
        { symbol: <V>D</V>, name: t('exp.titration.f.D'), unit: 'mol/L', value: fmtSig((nAcid - nBase) / point.totalVolume, 3) },
        { symbol: <><V>K</V><Sub>w</Sub></>, name: t('exp.titration.f.Kw'), unit: 'mol²/L²', value: '1.0 × 10⁻¹⁴' },
      ],
      explanation: t('exp.titration.f.exactExplain'),
    },
  ]

  const indicatorOptions = INDICATOR_IDS.map((id) => ({
    value: id,
    label: `${t(`exp.titration.indicators.${id}`)} (pH ${fmt(INDICATORS[id].range[0], 1)}–${fmt(INDICATORS[id].range[1], 1)})`,
  }))

  const dripButtons = (large = false) => (
    <div className="flex flex-wrap gap-2">
      <Button variant={x.dripping ? 'primary' : 'secondary'} onClick={x.toggleDrip} aria-pressed={x.dripping} className={large ? 'h-16 px-6 text-xl' : 'flex-1'}>
        <Droplets className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
        {x.dripping ? t('exp.titration.closeStopcock') : t('exp.titration.openStopcock')}
      </Button>
      <Button variant="secondary" onClick={x.addDrop} className={large ? 'h-16 px-6 text-xl' : ''} disabled={x.addedVolume >= BURETTE_CAPACITY}>
        <Droplet className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
        {t('exp.titration.addDrop', { volume: fmt(DROP_VOLUME, 2) })}
      </Button>
      <Button variant="secondary" onClick={() => x.addMl(1)} className={large ? 'h-16 px-6 text-xl' : ''} disabled={x.addedVolume >= BURETTE_CAPACITY}>
        <Pipette className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
        +1 mL
      </Button>
      <Button variant="secondary" onClick={swirl} className={large ? 'h-16 px-6 text-xl' : ''}>
        <RefreshCw className={large ? 'h-6 w-6' : 'h-4 w-4'} aria-hidden />
        {t('exp.titration.swirl')}
      </Button>
    </div>
  )

  const controls = (
    <>
      <ParamSlider label={t('exp.titration.p.acidConc')} value={params.acidConcentration} min={0.01} max={1} step={0.01} unit="mol/L" format={(v) => fmt(v, 2)} onChange={(v) => x.setParams({ acidConcentration: v })} accent={accent} />
      <ParamSlider label={t('exp.titration.p.acidVol')} value={params.acidVolume} min={10} max={50} step={1} unit="mL" onChange={(v) => x.setParams({ acidVolume: v })} accent={accent} />
      <ParamSlider label={t('exp.titration.p.baseConc')} value={params.baseConcentration} min={0.01} max={1} step={0.01} unit="mol/L" format={(v) => fmt(v, 2)} onChange={(v) => x.setParams({ baseConcentration: v })} accent={accent} hint={t('exp.titration.p.restartHint')} />
      <SelectField label={t('exp.titration.p.indicator')} value={x.indicatorId} options={indicatorOptions} onChange={x.setIndicatorId} />
      <ParamSlider label={t('exp.titration.p.added')} value={x.addedVolume} min={0} max={BURETTE_CAPACITY} step={0.05} unit="mL" format={(v) => fmt(v, 2)} onChange={x.setAddedVolume} accent={accent} />
      {dripButtons()}
      {x.indicatorPhase === 'flash' && (
        <p role="status" className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
          {t('exp.titration.flashHint')}
        </p>
      )}
      <SoundControls />
      <div className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
        <p className="font-semibold text-ink">{t('exp.titration.reaction')}</p>
        <p className="mt-1 text-sm text-ink">HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)</p>
        <p className="mt-0.5">{t('exp.titration.netIonic')}: H⁺(aq) + OH⁻(aq) → H₂O(l)</p>
        <p className="mt-1 tabular">
          {t('exp.titration.amounts', { acid: fmt(nAcid, 3), base: fmt(nBase, 3) })}
        </p>
      </div>
    </>
  )

  const presenterControls = (
    <>
      {dripButtons(true)}
      <div className="min-w-[260px] flex-1">
        <ParamSlider large label={t('exp.titration.p.added')} value={x.addedVolume} min={0} max={BURETTE_CAPACITY} step={0.05} unit="mL" format={(v) => fmt(v, 2)} onChange={x.setAddedVolume} accent={accent} />
      </div>
    </>
  )

  const swatch = (
    <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-lg bg-surface/85 px-3 py-1.5 text-xs text-muted ring-1 ring-line">
      <span className="h-3.5 w-3.5 rounded-full ring-1 ring-line" style={{ background: rgbaToCss(x.color) }} aria-hidden />
      {t(`exp.titration.indicators.${x.indicatorId}`)} · pH {fmt(point.pH, 2)}
    </div>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[460px] sm:h-[520px]'}
      camera={{ position: [1.4, 2.6, 7.6], target: [0, 2.0, 0] }}
      scene={<TitrationScene ctl={x} glass={dark ? '#9fb3d9' : '#a9bad6'} />}
      fallback2D={<Titration2D ctl={x} />}
      controls={{ running: x.dripping, onTogglePlay: x.toggleDrip, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={swatch}
    />
  )

  const notice = !x.reachable ? (
    <div role="alert" className="flex items-start gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {t('exp.titration.unreachable', { veq: fmt(veq, 1), cap: BURETTE_CAPACITY })}
    </div>
  ) : null

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ ...params, indicator: x.indicatorId, addedVolume: +x.addedVolume.toFixed(2) }}
      viewport={viewport}
      notice={notice}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      tutorParams={[
        { label: t('exp.titration.p.acidConc'), value: fmt(params.acidConcentration, 2), unit: 'mol/L' },
        { label: t('exp.titration.p.acidVol'), value: fmt(params.acidVolume, 0), unit: 'mL' },
        { label: t('exp.titration.p.baseConc'), value: fmt(params.baseConcentration, 2), unit: 'mol/L' },
        { label: t('exp.titration.p.indicator'), value: t(`exp.titration.indicators.${x.indicatorId}`) },
        { label: t('exp.titration.p.added'), value: fmt(x.addedVolume, 2), unit: 'mL' },
        { label: 'Equivalence volume', value: fmt(x.veq, 2), unit: 'mL' },
      ]}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[3]]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[1].render({ curve, measured: x.log })}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.dripping,
        togglePlay: x.toggleDrip,
        reset: x.reset,
        increase: x.addDrop,
        decrease: () => x.setAddedVolume(x.addedVolume - DROP_VOLUME),
      }}
      guide={{
        instructions: [1, 2, 3, 4, 5].map((i) => t(`exp.titration.guide.step${i}`)),
        science: (
          <>
            <p>{t('exp.titration.guide.science1')}</p>
            <p>{t('exp.titration.guide.science2')}</p>
            <p>
              <Trans i18nKey="exp.titration.guide.science3" components={{ b: <b className="text-ink" /> }} />
            </p>
          </>
        ),
        conclusions: (
          <>
            <p>{t('exp.titration.guide.conclusion1')}</p>
            <p>
              {t('exp.titration.guide.conclusion2', {
                indicator: t(`exp.titration.indicators.${x.indicatorId}`),
                error: x.endPoint.errorMl === null ? '—' : fmt(x.endPoint.errorMl, 3),
              })}
            </p>
            <p>{t('exp.titration.guide.conclusion3', { ph: fmt(titrationPoint(params, 0).pH, 2) })}</p>
          </>
        ),
        model: t('exp.titration.guide.model'),
      }}
    />
  )
}
