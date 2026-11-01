import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { BOX_LENGTH, GEL_LENGTH, LANES, fieldStrength, isExtrapolated, migrationCurve, mobility, type Polarity, type SampleId } from '../../engines/gelElectrophoresis'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { Frac, FormulaExplorer, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { fmt, fmtInt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { SPEEDS, useGelElectrophoresis } from './useGelElectrophoresis'
import { GelElectrophoresisScene } from './GelElectrophoresisScene'
import { GelElectrophoresis2D } from './GelElectrophoresis2D'

const P = 'exp.gel-electrophoresis'
const SAMPLE_LANES = LANES.filter((l): l is Exclude<SampleId, 'ladder'> => l !== 'ladder')
const COMPARE = [0.7, 1, 2]

export default function GelElectrophoresisExperiment() {
  const { t } = useTranslation()
  const x = useGelElectrophoresis()
  const c = useChartTheme()
  const experiment = findExperiment('biology', 'gel-electrophoresis')!
  const accent = c.biology
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const s = x.settings
  const curve = x.curve
  const minutes = x.time / 60
  const E = fieldStrength(s.voltage)
  const laneIndex = SAMPLE_LANES.indexOf(x.lane)
  const laneName = (id: SampleId) => t(`${P}.lane.${id}`)
  const first = x.laneBands.find((b) => b.state === 'onGel')

  const measurements: Measurement[] = [
    { id: 'time', label: t(`${P}.m.time`), value: fmt(minutes, 1), unit: 'min', sub: t(`${P}.m.field`, { value: fmt(E, 1) }) },
    {
      id: 'dye',
      label: t(`${P}.m.dye`),
      value: fmt(Math.max(0, x.dye), 2),
      unit: 'cm',
      tone: x.dye >= GEL_LENGTH * 0.92 ? 'warn' : 'default',
      sub: s.polarity === 'reversed' && x.time > 0 ? t(`${P}.m.reversed`) : t(`${P}.m.dyeOf`, { value: GEL_LENGTH }),
    },
    { id: 'distance', label: t(`${P}.m.distance`, { lane: laneName(x.lane) }), value: first ? fmt(first.distance, 2) : '—', unit: 'cm', sub: first ? `${fmtInt(first.bp)} bp ${t(`${P}.m.actual`)}` : t(`${P}.m.noBand`) },
    {
      id: 'estimate',
      label: t(`${P}.m.estimate`),
      value: first && x.uv && Number.isFinite(first.estimate) ? `≈ ${fmtInt(first.estimate)}` : '—',
      unit: 'bp',
      tone: 'accent',
      sub: !curve ? t(`${P}.m.needLadder`) : first && isExtrapolated(first.estimate, curve) ? t(`${P}.m.extrapolated`) : x.uv ? t(`${P}.m.fromLadder`) : t(`${P}.m.uvOff`),
    },
    { id: 'r2', label: t(`${P}.m.curve`), value: curve ? fmt(curve.r2, 3) : '—', sub: curve ? t(`${P}.m.slope`, { value: fmt(curve.slope, 2) }) : t(`${P}.m.needLadder`) },
  ]

  const ladderPts = curve?.points ?? []
  const fitLine = useMemo(
    () =>
      curve
        ? [curve.min * 0.8, curve.max * 1.2].map((bp) => ({ bp, fit: Math.pow(10, curve.intercept + curve.slope * Math.log10(bp)) }))
        : [],
    [curve],
  )
  const samplePts = x.laneBands.filter((b) => b.state === 'onGel' && Number.isFinite(b.estimate)).map((b) => ({ bp: b.estimate, distance: b.distance }))
  const compare = useMemo(() => {
    const seconds = Math.max(x.time, 40 * 60)
    const runs = COMPARE.map((a) => migrationCurve({ ...s, agarose: a, polarity: 'normal' }, seconds))
    return runs[0].map((p, i) => ({ bp: p.bp, ...Object.fromEntries(COMPARE.map((a, k) => [`c${a}`, Math.min(GEL_LENGTH, runs[k][i].distance)])) }))
  }, [s, x.time])

  const charts: ChartDef<any>[] = [
    {
      id: 'curve',
      title: t(`${P}.chart.curve`),
      data: { ladderPts, fitLine, samplePts },
      caption: t(`${P}.chart.curveCaption`),
      render: (d: { ladderPts: typeof ladderPts; fitLine: typeof fitLine; samplePts: typeof samplePts }) =>
        d.ladderPts.length < 2 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">{t(`${P}.chart.curveEmpty`)}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={CHART_MARGIN}>
              <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
              <XAxis dataKey="bp" type="number" scale="log" domain={['auto', 'auto']} tickFormatter={(v) => fmtInt(v)} label={L.x(t(`${P}.axis.size`))} {...axisProps(c)} />
              <YAxis dataKey="distance" type="number" scale="log" domain={['auto', 'auto']} width={48} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.distance`))} {...axisProps(c)} />
              <Tooltip {...ttip} formatter={(v, n) => [fmt(Number(v), 2), n]} />
              <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
              <Line data={d.fitLine} dataKey="fit" name={t(`${P}.chart.fit`)} stroke={c.axis} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Scatter data={d.ladderPts} dataKey="distance" name={t(`${P}.lane.ladder`)} fill={accent} isAnimationActive={false} />
              <Scatter data={d.samplePts} dataKey="distance" name={laneName(x.lane)} fill={c.accent2} shape="diamond" isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ),
      csv: () => ({
        filename: 'edulab-gel-standard-curve',
        headers: ['size_bp', 'distance_cm', 'kind'],
        rows: [...ladderPts.map((p) => [p.bp, p.distance, 'ladder']), ...x.readings.map((r) => [r.estimate, r.distance, `${r.sample} (actual ${r.actual})`])],
      }),
    },
    {
      id: 'agarose',
      title: t(`${P}.chart.agarose`),
      data: compare,
      caption: t(`${P}.chart.agaroseCaption`),
      render: (d: typeof compare) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={d} margin={CHART_MARGIN}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
            <XAxis dataKey="bp" type="number" scale="log" domain={[80, 13000]} tickFormatter={(v) => fmtInt(v)} label={L.x(t(`${P}.axis.size`))} {...axisProps(c)} />
            <YAxis domain={[0, GEL_LENGTH]} width={44} label={L.y(t(`${P}.axis.distance`))} {...axisProps(c)} />
            <Tooltip {...ttip} labelFormatter={(v) => `${fmtInt(Number(v))} bp`} formatter={(v, n) => [`${fmt(Number(v), 2)} cm`, n]} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
            {COMPARE.map((a, i) => (
              <Line key={a} dataKey={`c${a}`} name={`${fmt(a, 1)} %`} stroke={[c.accent3, accent, c.accent2][i]} strokeWidth={a === s.agarose ? 3 : 1.5} dot={false} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      ),
      csv: () => ({ filename: 'edulab-gel-agarose', headers: ['size_bp', ...COMPARE.map((a) => `distance_${a}pct_cm`)], rows: compare.map((p) => [p.bp, ...COMPARE.map((a) => (p as Record<string, number>)[`c${a}`])]) }),
    },
  ]

  const formulas: Formula[] = [
    {
      id: 'distance',
      title: 'd = μ E t',
      expression: (
        <>
          <V>d</V> = <V>μ</V> · <V>E</V> · <V>t</V>, <V>E</V> = <Frac n={<V>U</V>} d={<V>L</V>} />
        </>
      ),
      substituted: (
        <>
          <V>E</V> = {s.voltage} V / {BOX_LENGTH} cm = <b>{fmt(E, 2)} V/cm</b>
        </>
      ),
      variables: [
        { symbol: <V>μ</V>, name: t(`${P}.f.mu`), unit: '10⁻⁴ cm²/(V·s)', value: first ? `${fmt(mobility(first.bp, s.agarose) * 1e4, 2)} (${fmtInt(first.bp)} bp)` : '—', effect: t(`${P}.f.muEffect`) },
        { symbol: <V>U</V>, name: t(`${P}.f.voltage`), unit: 'V', value: String(s.voltage), effect: t(`${P}.f.voltageEffect`) },
        { symbol: <V>t</V>, name: t(`${P}.f.time`), unit: 'min', value: fmt(minutes, 1) },
      ],
      explanation: t(`${P}.f.distanceExplain`),
    },
    {
      id: 'curve',
      title: t(`${P}.f.curveTitle`),
      expression: (
        <>
          log <V>d</V> = <V>a</V> + <V>b</V> · log <V>N</V><Sub>bp</Sub>
        </>
      ),
      substituted: curve ? (
        <>
          log <V>d</V> = {fmt(curve.intercept, 3)} {curve.slope < 0 ? '−' : '+'} {fmt(Math.abs(curve.slope), 3)} · log <V>N</V><Sub>bp</Sub>
        </>
      ) : (
        <>{t(`${P}.m.needLadder`)}</>
      ),
      variables: [
        { symbol: <V>b</V>, name: t(`${P}.f.slope`), unit: '', value: curve ? fmt(curve.slope, 3) : '—', effect: t(`${P}.f.slopeEffect`) },
        { symbol: <><V>R</V><Sub>2</Sub></>, name: t(`${P}.f.r2`), unit: '', value: curve ? fmt(curve.r2, 3) : '—' },
      ],
      explanation: t(`${P}.f.curveExplain`),
    },
  ]

  const controls = (
    <>
      <ParamSlider
        label={t(`${P}.p.agarose`)}
        value={s.agarose}
        min={0.5}
        max={2.5}
        step={0.1}
        unit="%"
        onChange={x.setAgarose}
        format={(v) => fmt(v, 1)}
        accent={accent}
        hint={t(`${P}.p.agaroseHint`)}
      />
      <ParamSlider label={t(`${P}.p.voltage`)} value={s.voltage} min={0} max={150} step={5} unit="V" onChange={x.setVoltage} accent={accent} hint={s.voltage > 120 ? t(`${P}.p.voltageHot`) : undefined} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.polarity`)}</span>
        <Segmented
          label={t(`${P}.p.polarity`)}
          value={s.polarity}
          options={(['normal', 'reversed'] as Polarity[]).map((p) => ({ value: p, label: t(`${P}.polarity.${p}`) }))}
          onChange={x.setPolarity}
        />
      </div>
      <Toggle label={t(`${P}.p.uv`)} description={t(`${P}.p.uvHint`)} checked={x.uv} onChange={x.setUv} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.lane`)}</span>
        <Segmented label={t(`${P}.p.lane`)} value={x.lane} options={SAMPLE_LANES.map((id) => ({ value: id, label: laneName(id) }))} onChange={x.setLane} />
      </div>
      <ul className="flex flex-col gap-1 rounded-xl bg-surface-2 p-3 text-xs text-muted" aria-live="polite">
        {x.laneBands.map((b, i) => (
          <li key={b.bp} className="flex justify-between gap-2">
            <span>{t(`${P}.bandN`, { n: i + 1 })}</span>
            <span className="tabular text-ink">
              {b.state === 'onGel'
                ? `${fmt(b.distance, 2)} cm → ${x.uv && Number.isFinite(b.estimate) ? `≈ ${fmtInt(b.estimate)} bp` : '?'}`
                : t(`${P}.state.${b.state}`)}
            </span>
          </li>
        ))}
      </ul>
      <RecordBox
        count={x.readings.length}
        title={t(`${P}.readings`, { count: x.readings.length })}
        hint={x.uv ? t(`${P}.readingsHint`) : t(`${P}.readingsWait`)}
        onRecord={x.record}
        onClear={x.clearReadings}
        disabled={!x.uv || !curve}
      />
    </>
  )

  const presenterControls = (
    <>
      <Toggle label={t(`${P}.p.uv`)} checked={x.uv} onChange={x.setUv} />
      <div className="min-w-[240px] flex-1">
        <ParamSlider large label={t(`${P}.p.voltage`)} value={s.voltage} min={0} max={150} step={5} unit="V" onChange={x.setVoltage} accent={accent} />
      </div>
    </>
  )

  const laneLabels = LANES.map((id) => laneName(id))
  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 3.6, 3.4], target: [-0.3, 0, 0] }}
      scene={<GelElectrophoresisScene sim={x.sim} uv={x.uv} selected={laneIndex} display={[`${fmt(minutes, 1)} min`, `${s.voltage} V`]} />}
      fallback2D={<GelElectrophoresis2D sim={x.sim} uv={x.uv} selected={laneIndex} laneLabels={laneLabels} label={t('lab.view2d', { name: t('catalog.gel-electrophoresis.title') })} />}
      controls={{ running: x.running, onTogglePlay: x.togglePlay, onReset: x.reset, speed: x.speed, speeds: SPEEDS, onSpeed: x.setSpeed }}
      overlay={<OverlayNote>{t(`${P}.legend`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={{ agarose: s.agarose, voltage: s.voltage, minutes: Math.round(minutes) }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={[measurements[0], measurements[1], measurements[2], measurements[3]]}
      tutorParams={[
        { label: t(`${P}.p.agarose`), value: fmt(s.agarose, 1), unit: '%' },
        { label: t(`${P}.p.voltage`), value: String(s.voltage), unit: 'V' },
        { label: t(`${P}.p.polarity`), value: s.polarity },
        { label: t(`${P}.m.time`), value: fmt(minutes, 1), unit: 'min' },
        { label: t(`${P}.p.uv`), value: x.uv ? 'on' : 'off' },
        { label: t(`${P}.p.lane`), value: laneName(x.lane) },
      ]}
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: x.running,
        togglePlay: x.togglePlay,
        reset: x.reset,
        increase: () => x.setVoltage(Math.min(150, s.voltage + 5)),
        decrease: () => x.setVoltage(Math.max(0, s.voltage - 5)),
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
