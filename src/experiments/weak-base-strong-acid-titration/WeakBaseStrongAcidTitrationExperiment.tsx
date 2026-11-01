import { AlertTriangle, Droplet, Droplets, Pipette } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { INDICATORS, rgbaToCss } from '../../engines/titration'
import { KA_NH4, PKA, PKB, WEAK_BASE_INDICATORS } from '../../engines/weakBaseStrongAcidTitration'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sqrt, Sub, Sup, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt, fmtSig } from '../../lib/format'
import { useUi } from '../../store/ui'
import { CHART_MARGIN, axisLabels } from '../shared/lab'
import { BURETTE_CAPACITY, DROP_VOLUME, SPEEDS, useWeakBaseStrongAcidTitration } from './useWeakBaseStrongAcidTitration'
import { WeakBaseStrongAcidTitrationScene } from './WeakBaseStrongAcidTitrationScene'
import { WeakBaseStrongAcidTitration2D } from './WeakBaseStrongAcidTitration2D'

const P = 'exp.weak-base-strong-acid-titration'

export default function WeakBaseStrongAcidTitrationExperiment() {
  const { t } = useTranslation()
  const x = useWeakBaseStrongAcidTitration()
  const c = useChartTheme()
  const dark = useUi((s) => s.theme) === 'dark'
  const experiment = findExperiment('chemistry', 'weak-base-strong-acid-titration')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const { params, point, veq, endPoint } = x
  const indicatorName = (id: string) => t(`exp.titration.indicators.${id}`)
  const nBase = params.baseConcentration * params.baseVolume
  const nAcid = params.acidConcentration * x.addedVolume
  const eqPoint = { volume: veq, pH: x.curve.reduce((best, p) => (Math.abs(p.volume - veq) < Math.abs(best.volume - veq) ? p : best)).pH }

  const measurements: Measurement[] = [
    { id: 'pH', label: 'pH', value: fmt(point.pH, 2), tone: 'accent', sub: t(`${P}.region.${point.region}`) },
    { id: 'added', label: t(`${P}.m.added`), value: fmt(x.addedVolume, 2), unit: 'mL', sub: t(`${P}.m.veq`, { value: fmt(veq, 2) }) },
    { id: 'species', label: '[NH₄⁺] / [NH₃]', value: point.nh3 > 1e-12 ? fmtSig(point.nh4 / point.nh3, 3) : '∞', sub: `[NH₃] = ${fmtSig(point.nh3 * 1000, 3)} mmol/L` },
    {
      id: 'end',
      label: t(`${P}.m.endPoint`),
      value: endPoint.volume === null ? '—' : fmt(endPoint.volume, 2),
      unit: endPoint.volume === null ? undefined : 'mL',
      tone: endPoint.suitability === 'good' ? 'default' : 'warn',
      sub: t(`${P}.suitability.${endPoint.suitability}`, { error: endPoint.error === null ? '—' : fmt(endPoint.error, 2) }),
    },
    { id: 'colour', label: indicatorName(x.indicatorId), value: t(`${P}.colorState.${x.colorState}`), sub: t(`${P}.m.halfEq`, { value: fmt(PKA, 2) }) },
  ]

  const log = x.log
  const charts: ChartDef<any>[] = [
    {
      id: 'curve',
      title: t(`${P}.chart.curve`),
      data: log,
      caption: t(`${P}.chart.curveCaption`),
      render: (d: typeof log) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="volume" type="number" domain={[0, BURETTE_CAPACITY]} label={L.x(t(`${P}.axis.volume`))} {...axisProps(c)} />
            <YAxis domain={[0, 14]} ticks={[0, 2, 4, 6, 7, 8, 10, 12, 14]} width={36} label={L.y('pH')} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 2)} mL`} formatter={(v, n) => [fmt(Number(v), 2), n]} />
            <ReferenceArea y1={x.indicator.range[0]} y2={x.indicator.range[1]} fill={rgbaToCss(x.color)} fillOpacity={0.25} />
            <ReferenceLine y={7} stroke={c.axis} strokeDasharray="2 4" />
            <ReferenceLine x={veq} stroke={c.accent2} strokeDasharray="5 4" label={{ value: t(`${P}.chart.eq`), fill: c.text, fontSize: 11, position: 'insideTopRight' }} />
            <Line data={x.curve} dataKey="pH" name={t(`${P}.chart.theory`)} stroke={c.axis} strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line data={d} dataKey="pH" name="pH" stroke={accent} strokeWidth={3} dot={false} isAnimationActive={false} />
            {veq <= BURETTE_CAPACITY && <ReferenceDot x={eqPoint.volume} y={eqPoint.pH} r={5} fill={c.accent2} stroke={c.marker} />}
            <ReferenceDot x={veq / 2} y={PKA} r={5} fill={c.accent3} stroke={c.marker} />
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-weak-base-titration', headers: ['V_HCl_mL', 'pH'], rows: log.map((p) => [p.volume, p.pH]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'hh',
      title: t(`${P}.f.hhTitle`),
      expression: (
        <>
          pOH = p<V>K</V><Sub>b</Sub> + log <Frac n={<>[NH<Sub>4</Sub><Sup>+</Sup>]</>} d={<>[NH<Sub>3</Sub>]</>} />
        </>
      ),
      substituted:
        point.region === 'buffer' || point.region === 'halfEquivalence' ? (
          <>
            pOH = {fmt(PKB, 2)} + log({fmt(nAcid, 3)} / {fmt(nBase - nAcid, 3)}) → <b>pH = {fmt(point.approxPH, 2)}</b>
          </>
        ) : (
          <>{t(`${P}.f.outsideBuffer`)}</>
        ),
      variables: [
        { symbol: <>p<V>K</V><Sub>b</Sub></>, name: t(`${P}.f.pkb`), unit: '', value: fmt(PKB, 2), effect: t(`${P}.f.pkbEffect`) },
        { symbol: <><V>n</V>(H<Sup>+</Sup>)</>, name: t(`${P}.f.nAcid`), unit: 'mmol', value: fmt(nAcid, 3) },
        { symbol: <><V>n</V>(NH<Sub>3</Sub>)</>, name: t(`${P}.f.nBase`), unit: 'mmol', value: fmt(nBase, 3) },
      ],
      explanation: t(`${P}.f.hhExplain`),
    },
    {
      id: 'eq',
      title: t(`${P}.f.eqTitle`),
      expression: (
        <>
          [H<Sup>+</Sup>] = <Sqrt>
            <V>K</V><Sub>a</Sub> · <V>c</V>(NH<Sub>4</Sub><Sup>+</Sup>)
          </Sqrt>, <V>K</V><Sub>a</Sub> = <Frac n={<><V>K</V><Sub>w</Sub></>} d={<><V>K</V><Sub>b</Sub></>} />
        </>
      ),
      substituted: (
        <>
          √({fmtSig(KA_NH4, 3)} · {fmtSig(nBase / (params.baseVolume + veq), 3)}) → <b>pH = {fmt(eqPoint.pH, 2)}</b> &lt; 7
        </>
      ),
      variables: [
        { symbol: <><V>K</V><Sub>a</Sub></>, name: t(`${P}.f.ka`), unit: '', value: fmtSig(KA_NH4, 3) },
        { symbol: <><V>V</V><Sub>eq</Sub></>, name: t(`${P}.f.veq`), unit: 'mL', value: fmt(veq, 2) },
      ],
      explanation: t(`${P}.f.eqExplain`),
    },
    {
      id: 'after',
      title: t(`${P}.f.afterTitle`),
      expression: (
        <>
          [H<Sup>+</Sup>] = <Frac n={<><V>n</V>(HCl) − <V>n</V>(NH<Sub>3</Sub>)</>} d={<><V>V</V><Sub>total</Sub></>} />
        </>
      ),
      substituted:
        point.region === 'after' ? (
          <>
            ({fmt(nAcid, 3)} − {fmt(nBase, 3)}) / {fmt(point.totalVolume, 1)} mL → <b>pH = {fmt(point.approxPH, 2)}</b>
          </>
        ) : (
          <>{t(`${P}.f.beforeEq`)}</>
        ),
      variables: [{ symbol: <><V>n</V><Sub>excess</Sub></>, name: t(`${P}.f.excess`), unit: 'mmol', value: fmt(point.excessAcidMmol, 3) }],
      explanation: t(`${P}.f.afterExplain`),
    },
  ]

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
    </div>
  )

  const controls = (
    <>
      <ParamSlider label={t(`${P}.p.baseConc`)} value={params.baseConcentration} min={0.02} max={0.5} step={0.01} unit="mol/L" format={(v) => fmt(v, 2)} onChange={x.setBaseConcentration} accent={accent} />
      <ParamSlider label={t(`${P}.p.baseVol`)} value={params.baseVolume} min={10} max={50} step={1} unit="mL" onChange={x.setBaseVolume} accent={accent} />
      <ParamSlider label={t(`${P}.p.acidConc`)} value={params.acidConcentration} min={0.02} max={0.5} step={0.01} unit="mol/L" format={(v) => fmt(v, 2)} onChange={x.setAcidConcentration} accent={accent} hint={t(`${P}.p.restartHint`)} />
      <SelectField
        label={t(`${P}.p.indicator`)}
        value={x.indicatorId}
        options={WEAK_BASE_INDICATORS.map((id) => ({ value: id, label: `${indicatorName(id)} (pH ${fmt(INDICATORS[id].range[0], 1)}–${fmt(INDICATORS[id].range[1], 1)})` }))}
        onChange={x.setIndicatorId}
      />
      {dripButtons()}
      <div className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
        <p className="font-semibold text-ink">{t(`${P}.reaction`)}</p>
        <p className="mt-1 text-sm text-ink">NH₃(aq) + HCl(aq) → NH₄Cl(aq)</p>
        <p className="mt-0.5">NH₄⁺ + H₂O ⇌ NH₃ + H₃O⁺ · pKb(NH₃) = {fmt(PKB, 2)}</p>
        <p className="mt-1 tabular">{t(`${P}.amounts`, { acid: fmt(nAcid, 3), base: fmt(nBase, 3) })}</p>
      </div>
    </>
  )

  const presenterControls = (
    <>
      {dripButtons(true)}
      <div className="min-w-[260px]">
        <SelectField label={t(`${P}.p.indicator`)} value={x.indicatorId} options={WEAK_BASE_INDICATORS.map((id) => ({ value: id, label: indicatorName(id) }))} onChange={x.setIndicatorId} />
      </div>
    </>
  )

  const swatch = (
    <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-lg bg-surface/85 px-3 py-1.5 text-xs text-muted ring-1 ring-line">
      <span className="h-3.5 w-3.5 rounded-full ring-1 ring-line" style={{ background: rgbaToCss(x.color) }} aria-hidden />
      {indicatorName(x.indicatorId)} · pH {fmt(point.pH, 2)}
    </div>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[460px] sm:h-[520px]'}
      camera={{ position: [1.6, 2.6, 7.4], target: [0.9, 2.0, 0] }}
      scene={<WeakBaseStrongAcidTitrationScene ctl={x} glass={dark ? '#9fb3d9' : '#a9bad6'} labels={{ pH: t(`${P}.labels.meter`), curve: t(`${P}.chart.curve`) }} />}
      fallback2D={<WeakBaseStrongAcidTitration2D ctl={x} label={t('lab.view2d', { name: t('catalog.weak-base-strong-acid-titration.title') })} />}
      controls={{ running: x.dripping, onTogglePlay: x.toggleDrip, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={swatch}
    />
  )

  const notice = !x.reachable ? (
    <div role="alert" className="flex items-start gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {t(`${P}.unreachable`, { veq: fmt(veq, 1), cap: BURETTE_CAPACITY })}
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
      presenterMeasurements={[measurements[0], measurements[1], measurements[3], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.baseConc`), value: fmt(params.baseConcentration, 2), unit: 'mol/L' },
        { label: t(`${P}.p.baseVol`), value: fmt(params.baseVolume, 0), unit: 'mL' },
        { label: t(`${P}.p.acidConc`), value: fmt(params.acidConcentration, 2), unit: 'mol/L' },
        { label: t(`${P}.p.indicator`), value: indicatorName(x.indicatorId) },
        { label: t(`${P}.m.added`), value: fmt(x.addedVolume, 2), unit: 'mL' },
        { label: 'pH', value: fmt(point.pH, 2) },
        { label: 'Equivalence volume', value: fmt(veq, 2), unit: 'mL' },
        { label: 'pH at equivalence', value: fmt(eqPoint.pH, 2) },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{ running: x.dripping, togglePlay: x.toggleDrip, reset: x.reset, increase: x.addDrop }}
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
