import { Trans, useTranslation } from 'react-i18next'
import { Bar, CartesianGrid, ComposedChart, LabelList, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { clsx } from 'clsx'
import { findExperiment } from '../../data/experiments'
import { COMPOUNDS, MATCH_THRESHOLD, basePeak, molecularIon, type ColumnId, type CompoundId, type MixtureId } from '../../engines/gcMsAnalysis'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, SelectField, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { FormulaExplorer, Frac, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtInt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, axisLabels } from '../shared/lab'
import { SPEEDS, useGcMsAnalysis } from './useGcMsAnalysis'
import { GcMsAnalysisScene } from './GcMsAnalysisScene'
import { GcMsAnalysis2D } from './GcMsAnalysis2D'

const P = 'exp.gc-ms-analysis'
const MIXES: MixtureId[] = ['A', 'B', 'C']

export default function GcMsAnalysisExperiment() {
  const { t } = useTranslation()
  const x = useGcMsAnalysis()
  const c = useChartTheme()
  const experiment = findExperiment('chemistry', 'gc-ms-analysis')!
  const accent = c.chemistry
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const name = (id: CompoundId) => t(`${P}.compounds.${id}`)
  const peak = x.peak
  const base = peak ? basePeak(peak.spectrum) : null
  const mIon = peak ? molecularIon(peak.spectrum) : null
  const hit = peak?.matches[0]
  const confident = !!hit && hit.score >= MATCH_THRESHOLD
  const identified = x.peaks.filter((p) => p.matches[0].score >= MATCH_THRESHOLD).length

  const measurements: Measurement[] = [
    { id: 'peaks', label: t(`${P}.m.peaks`), value: String(x.peaks.length), sub: t(`${P}.m.identified`, { value: identified }) },
    { id: 'tR', label: t(`${P}.m.tR`), value: peak ? fmt(peak.t, 2) : '—', unit: peak ? 'min' : undefined, sub: t(`${P}.m.tM`, { value: fmt(x.holdUp, 2) }) },
    { id: 'base', label: t(`${P}.m.base`), value: base ? String(base.mz) : '—', sub: base && hit ? COMPOUNDS[hit.id].ions[base.mz] : undefined },
    { id: 'mion', label: t(`${P}.m.molecularIon`), value: mIon ? String(mIon.mz) : '—', sub: mIon ? t(`${P}.m.relative`, { value: fmt(mIon.I, 1) }) : undefined },
    {
      id: 'match',
      label: t(`${P}.m.match`),
      value: hit ? (confident ? name(hit.id) : t(`${P}.m.noMatch`)) : '—',
      tone: hit ? (confident ? 'accent' : 'warn') : 'default',
      sub: hit ? t(`${P}.m.score`, { value: fmtInt(hit.score * 100) }) : t(`${P}.m.pickPeak`),
    },
  ]

  const chromData = x.trace
  const charts: ChartDef<any>[] = [
    {
      id: 'chrom',
      title: t(`${P}.chart.chrom`),
      data: chromData,
      caption: t(`${P}.chart.chromCaption`, { rs: Number.isFinite(x.minResolution) ? fmt(x.minResolution, 2) : '—' }),
      render: (d: typeof chromData) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={[0, x.tEnd]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.time`))} {...axisProps(c)} />
            <YAxis width={44} tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.signal`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmt(Number(v), 2)} min`} formatter={(v) => [fmt(Number(v), 2), t(`${P}.axis.signal`)]} />
            <Line dataKey="signal" stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
            {x.peaks.map((p, i) => (
              <ReferenceDot key={i} x={p.t} y={p.height} r={i === x.selected ? 7 : 5} fill={i === x.selected ? c.marker : c.accent2} stroke={c.marker} label={{ value: String(i + 1), position: 'top', fill: c.text, fontSize: 11 }} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: `edulab-gc-chromatogram-${x.mixture}`, headers: ['t_min', 'TIC'], rows: chromData.map((p) => [p.t, p.signal]) }),
    },
    {
      id: 'ms',
      title: t(`${P}.chart.ms`),
      data: peak?.spectrum ?? [],
      caption: peak ? t(`${P}.chart.msCaption`, { n: (x.selected ?? 0) + 1, t: fmt(peak.t, 2) }) : t(`${P}.m.pickPeak`),
      render: (d: { mz: number; I: number }[]) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="mz" type="number" domain={[10, 100]} ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} label={L.x('m/z')} {...axisProps(c)} />
            <YAxis domain={[0, 110]} ticks={[0, 25, 50, 75, 100]} width={40} label={L.y(t(`${P}.axis.abundance`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `m/z ${v}`} formatter={(v) => [`${fmt(Number(v), 1)} %`, t(`${P}.axis.abundance`)]} />
            <Bar dataKey="I" fill={c.physics} barSize={6} isAnimationActive={false}>
              <LabelList dataKey="mz" position="top" fill={c.text} fontSize={10} formatter={(v: unknown) => String(v)} />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-mass-spectrum', headers: ['m_z', 'relative_abundance_percent'], rows: (peak?.spectrum ?? []).map((p) => [p.mz, p.I]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'tR',
      title: t(`${P}.f.tRTitle`),
      expression: (
        <>
          <V>t</V><Sub>R</Sub> = <V>t</V><Sub>M</Sub>(1 + <V>k</V>)
        </>
      ),
      substituted: peak ? (
        <>
          <V>k</V> = <Frac n={<>{fmt(peak.t, 2)} − {fmt(x.holdUp, 2)}</>} d={fmt(x.holdUp, 2)} /> = <b>{fmt((peak.t - x.holdUp) / x.holdUp, 2)}</b>
        </>
      ) : (
        <>{t(`${P}.m.pickPeak`)}</>
      ),
      variables: [
        { symbol: <><V>t</V><Sub>M</Sub></>, name: t(`${P}.f.tM`), unit: 'min', value: fmt(x.holdUp, 2), effect: t(`${P}.f.tMEffect`) },
        { symbol: <V>k</V>, name: t(`${P}.f.k`), unit: '', value: peak ? fmt((peak.t - x.holdUp) / x.holdUp, 2) : '—', effect: t(`${P}.f.kEffect`) },
      ],
      explanation: t(`${P}.f.tRExplain`),
    },
    {
      id: 'Rs',
      title: t(`${P}.f.rsTitle`),
      expression: (
        <>
          <V>R</V><Sub>s</Sub> = <Frac n={<>Δ<V>t</V><Sub>R</Sub></>} d={<>2(<V>σ</V><Sub>1</Sub> + <V>σ</V><Sub>2</Sub>)</>} />
        </>
      ),
      substituted: (
        <>
          {t(`${P}.f.worstPair`)}: <b><V>R</V><Sub>s</Sub> = {Number.isFinite(x.minResolution) ? fmt(x.minResolution, 2) : '—'}</b> {x.minResolution >= 1.5 ? `≥ ${fmt(1.5, 1)} ✓` : `< ${fmt(1.5, 1)}`}
        </>
      ),
      variables: [{ symbol: <V>N</V>, name: t(`${P}.f.N`), unit: '', value: fmtInt((x.elutions[0]?.tR / x.elutions[0]?.sigma) ** 2 || 0) }],
      explanation: t(`${P}.f.rsExplain`),
    },
    {
      id: 'mz',
      title: t(`${P}.f.mzTitle`),
      expression: (
        <>
          M + e<sup>−</sup> → M<sup>+•</sup> + 2e<sup>−</sup>; &nbsp; M<sup>+•</sup> → F<sup>+</sup> + R<sup>•</sup>
        </>
      ),
      substituted: mIon && base ? (
        <>
          M<sup>+•</sup>: m/z {mIon.mz} · {t(`${P}.m.base`)}: m/z {base.mz} ({hit ? COMPOUNDS[hit.id].ions[base.mz] ?? '' : ''})
        </>
      ) : (
        <>{t(`${P}.m.pickPeak`)}</>
      ),
      variables: [{ symbol: <>m/z</>, name: t(`${P}.f.mz`), unit: '', value: mIon ? String(mIon.mz) : '—' }],
      explanation: t(`${P}.f.mzExplain`),
    },
  ]

  const conditions = (large = false) => (
    <>
      <SelectField<MixtureId> label={t(`${P}.p.mixture`)} value={x.mixture} options={MIXES.map((m) => ({ value: m, label: t(`${P}.mixtures.${m}`) }))} onChange={x.setMixture} />
      <div className="flex flex-col gap-1.5">
        <span className={large ? 'text-lg font-medium text-ink' : 'text-sm font-medium text-ink'}>{t(`${P}.p.column`)}</span>
        <Segmented<ColumnId> size={large ? 'lg' : 'md'} label={t(`${P}.p.column`)} value={x.cond.column} options={(['nonpolar', 'polar'] as ColumnId[]).map((id) => ({ value: id, label: t(`${P}.columns.${id}`) }))} onChange={x.setColumn} />
      </div>
    </>
  )

  const peakList = (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
      <span className="text-sm font-medium text-ink">{t(`${P}.peakList`)}</span>
      {x.peaks.length === 0 ? (
        <p className="text-xs text-muted">{t(`${P}.noPeaks`)}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {x.peaks.map((p, i) => {
            const m = p.matches[0]
            const ok = m.score >= MATCH_THRESHOLD
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => x.select(i)}
                  aria-pressed={x.selected === i}
                  className={clsx(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                    x.selected === i ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:bg-surface hover:text-ink',
                  )}
                >
                  <span className="tabular">
                    <b className="text-ink">{i + 1}</b> · {fmt(p.t, 2)} min
                  </span>
                  <span className={ok ? 'font-medium text-ink' : 'text-warn'}>
                    {ok ? name(m.id) : t(`${P}.m.noMatch`)} ({fmtInt(m.score * 100)})
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  const controls = (
    <>
      {conditions()}
      <ParamSlider label={t(`${P}.p.temperature`)} value={x.cond.tempC} min={40} max={200} step={5} unit="°C" onChange={x.setTemperature} hint={t(`${P}.p.temperatureHint`)} accent={accent} />
      <ParamSlider label={t(`${P}.p.flow`)} value={x.cond.flow} min={0.5} max={3} step={0.1} unit="mL/min" format={(v) => fmt(v, 1)} onChange={x.setFlow} hint={t(`${P}.p.flowHint`)} accent={accent} />
      {peakList}
    </>
  )

  const presenterControls = (
    <>
      <div className="min-w-[240px]">{conditions(true)}</div>
      <div className="min-w-[220px] flex-1">
        <ParamSlider large label={t(`${P}.p.temperature`)} value={x.cond.tempC} min={40} max={200} step={5} unit="°C" onChange={x.setTemperature} accent={accent} />
      </div>
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 2.2, 5.6], target: [0, 1.25, 0] }}
      scene={
        <GcMsAnalysisScene
          ctl={x}
          labels={{ oven: t(`${P}.labels.oven`), ms: t(`${P}.labels.ms`), chrom: t(`${P}.chart.chrom`), spectrum: peak ? `${t(`${P}.chart.ms`)} · #${(x.selected ?? 0) + 1}` : t(`${P}.chart.ms`), injector: t(`${P}.labels.injector`) }}
        />
      }
      fallback2D={<GcMsAnalysis2D ctl={x} label={t('lab.view2d', { name: t('catalog.gc-ms-analysis.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`, { t: fmt(x.time, 1), end: fmt(x.tEnd, 1) })}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ mixture: x.mixture, column: x.cond.column, temperature: x.cond.tempC, flow: x.cond.flow, identified }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[4]]}
      tutorParams={[
        { label: t(`${P}.p.mixture`), value: x.mixture },
        { label: t(`${P}.p.column`), value: x.cond.column },
        { label: t(`${P}.p.temperature`), value: String(x.cond.tempC), unit: '°C' },
        { label: t(`${P}.p.flow`), value: fmt(x.cond.flow, 1), unit: 'mL/min' },
        { label: 'peaks found', value: String(x.peaks.length) },
        { label: 'worst resolution Rs', value: Number.isFinite(x.minResolution) ? fmt(x.minResolution, 2) : 'n/a' },
        { label: 'selected peak tR', value: peak ? fmt(peak.t, 2) : 'none', unit: peak ? 'min' : undefined },
        { label: 'base peak m/z', value: base ? String(base.mz) : 'n/a' },
        { label: 'molecular ion m/z', value: mIon ? String(mIon.mz) : 'n/a' },
        { label: 'library match score', value: hit ? fmtInt(hit.score * 100) : 'n/a' },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setTemperature(Math.min(200, x.cond.tempC + 10)),
        decrease: () => x.setTemperature(Math.max(40, x.cond.tempC - 10)),
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
