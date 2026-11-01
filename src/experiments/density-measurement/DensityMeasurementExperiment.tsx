import { ArrowDownToLine, Ruler, Scale } from 'lucide-react'
import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { findExperiment } from '../../data/experiments'
import { LIQUIDS, SOLIDS, floats, gPerCm3ToKgPerM3, liquidDensity, percentError, waterDensity } from '../../engines/densityMeasurement'
import { ChartTabs, type ChartDef } from '../../components/lab/ChartTabs'
import { axisProps, tooltipProps, useChartTheme } from '../../components/lab/chartTheme'
import { ParamSlider, Segmented, SelectField, Toggle, type Measurement } from '../../components/lab/controls'
import { ExperimentShell } from '../../components/lab/ExperimentShell'
import { Frac, FormulaExplorer, Sub, V, type Formula } from '../../components/lab/FormulaExplorer'
import { SceneViewport } from '../../components/lab/SceneViewport'
import { Button } from '../../components/ui/primitives'
import { fmt } from '../../lib/format'
import { CHART_MARGIN, OverlayNote, RecordBox, axisLabels } from '../shared/lab'
import { START_VOLUME, useDensityMeasurement, type BottleState, type LiquidMethod, type Mode, type VolumeMethod } from './useDensityMeasurement'
import { DensityMeasurementScene } from './DensityMeasurementScene'
import { DensityMeasurement2D } from './DensityMeasurement2D'

const P = 'exp.density-measurement'

export default function DensityMeasurementExperiment() {
  const { t } = useTranslation()
  const d = useDensityMeasurement()
  const c = useChartTheme()
  const experiment = findExperiment('physics', 'density-measurement')!
  const accent = c.physics
  const L = axisLabels(c)
  const ttip = tooltipProps(c)
  const solidMode = d.mode === 'solid'
  const rhoKg = d.measuredDensity === null ? null : gPerCm3ToKgPerM3(d.measuredDensity)
  const sampleName = solidMode ? t(`${P}.solids.${d.solid.id}`) : t(`${P}.liquids.${d.liquid.id}`)

  const mvLines = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const V = i * 3
        const row: Record<string, number> = { V }
        for (const s of SOLIDS) row[s.id] = (s.density / 1000) * V
        return row
      }),
    [],
  )
  const tempCurve = useMemo(
    () => Array.from({ length: 41 }, (_, i) => ({ T: i, water: waterDensity(i), liquid: liquidDensity(d.liquid, i) })),
    [d.liquid],
  )
  const resultPts = d.results.filter((r) => solidMode && r.volume > 0).map((r) => ({ V: r.volume, m: r.mass }))

  const volumeLabel =
    d.volumeMethod === 'ruler' && d.dims ? `${d.dims.map((x) => fmt(x, 1)).join(' × ')} cm` : `${fmt(d.cylinderLevel, 0)} mL`

  const measurements: Measurement[] = solidMode
    ? [
        { id: 'm', label: t(`${P}.m.mass`), value: d.mass === null ? '—' : fmt(d.mass, 1), unit: 'g', sub: d.mass === null ? t(`${P}.m.weighFirst`) : t(`${P}.m.fromBalance`) },
        {
          id: 'V',
          label: t(`${P}.m.volume`),
          value: d.volume === null ? '—' : fmt(d.volume, d.volumeMethod === 'ruler' ? 1 : 0),
          unit: 'cm³',
          sub: d.volume === null ? t(`${P}.m.measureVolume`) : t(`${P}.methods.${d.volumeMethod}`),
        },
        {
          id: 'rho',
          label: t(`${P}.m.density`),
          value: d.measuredDensity === null ? '—' : fmt(d.measuredDensity, 2),
          unit: 'g/cm³',
          tone: 'accent',
          sub: rhoKg === null ? t(`${P}.m.needBoth`) : t(`${P}.m.kg`, { value: fmt(rhoKg, 0) }),
        },
        {
          id: 'err',
          label: t(`${P}.m.error`),
          value: rhoKg === null ? '—' : fmt(percentError(rhoKg, d.trueDensity), 1),
          unit: '%',
          tone: rhoKg !== null && percentError(rhoKg, d.trueDensity) > 5 ? 'warn' : 'default',
          sub: t(`${P}.m.accepted`, { value: fmt(d.trueDensity, 0) }),
        },
        {
          id: 'float',
          label: t(`${P}.m.inWater`),
          value: floats(d.trueDensity, d.rhoWater) ? t(`${P}.m.floats`) : t(`${P}.m.sinks`),
          sub: t(`${P}.m.water`, { value: fmt(d.rhoWater, 1) }),
        },
      ]
    : [
        { id: 'T', label: t(`${P}.m.temperature`), value: fmt(d.temperature, 0), unit: '°C', sub: t(`${P}.m.water`, { value: fmt(d.rhoWater, 1) }) },
        d.liquidMethod === 'pycnometer'
          ? {
              id: 'bottle',
              label: t(`${P}.m.bottle`),
              value: fmt(d.bottleReading, 2),
              unit: 'g',
              sub: t(`${P}.m.weighed`, { count: Object.keys(d.bottleMasses).length }),
            }
          : { id: 'hydro', label: t(`${P}.m.hydrometer`), value: d.hydroReading === null ? '—' : fmt(d.hydroReading, 0), unit: 'kg/m³', sub: d.hydroReading === null ? t(`${P}.m.outOfRange`) : t(`${P}.m.stem`, { value: fmt(d.hydroDepth ?? 0, 1) }) },
        {
          id: 'rho',
          label: t(`${P}.m.density`),
          value: d.liquidMethod === 'pycnometer' ? (d.pycno === null ? '—' : fmt(d.pycno, 1)) : d.hydroReading === null ? '—' : fmt(d.hydroReading, 0),
          unit: 'kg/m³',
          tone: 'accent',
          sub: d.liquidMethod === 'pycnometer' && d.pycno === null ? t(`${P}.m.threeWeighings`) : t(`${P}.m.true`, { value: fmt(d.rhoLiquid, 1) }),
        },
        { id: 'sg', label: t(`${P}.m.relative`), value: fmt(d.rhoLiquid / d.rhoWater, 3), sub: t(`${P}.m.relativeSub`) },
      ]

  const charts: ChartDef<any>[] = [
    solidMode
      ? {
          id: 'mv',
          title: t(`${P}.chart.mv`),
          data: { lines: mvLines, pts: resultPts },
          caption: t(`${P}.chart.mvCaption`),
          render: (x: { lines: typeof mvLines; pts: typeof resultPts }) => (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={CHART_MARGIN}>
                <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
                <XAxis dataKey="V" type="number" domain={[0, 60]} tickFormatter={(v) => fmt(v, 0)} label={L.x(t(`${P}.axis.volume`))} {...axisProps(c)} />
                <YAxis type="number" domain={[0, 200]} width={52} allowDataOverflow tickFormatter={(v) => fmt(v, 0)} label={L.y(t(`${P}.axis.mass`))} {...axisProps(c)} />
                <Tooltip {...ttip} formatter={(v, n) => [fmt(Number(v), 1), n]} />
                <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: 11 }} />
                {SOLIDS.map((s) => (
                  <Line key={s.id} data={x.lines} dataKey={s.id} name={t(`${P}.solids.${s.id}`)} stroke={s.id === d.solid.id ? accent : c.grid} strokeWidth={s.id === d.solid.id ? 2.5 : 1.2} dot={false} isAnimationActive={false} />
                ))}
                <Scatter data={x.pts} dataKey="m" name={t(`${P}.chart.results`)} fill={c.accent2} isAnimationActive={false} />
                {d.mass !== null && d.volume !== null && <ReferenceDot x={d.volume} y={d.mass} r={6} fill={accent} stroke={c.marker} strokeWidth={2} />}
              </ComposedChart>
            </ResponsiveContainer>
          ),
          csv: () => ({
            filename: 'edulab-density-results',
            headers: ['sample', 'method', 'mass_g', 'volume_cm3', 'density_g_cm3', 'accepted_kg_m3'],
            rows: d.results.map((r) => [r.sample, r.method, r.mass, r.volume, r.density, r.actual]),
          }),
        }
      : {
          id: 'temp',
          title: t(`${P}.chart.temp`),
          data: tempCurve,
          caption: t(`${P}.chart.tempCaption`),
          render: (x: typeof tempCurve) => (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={x} margin={CHART_MARGIN}>
                <CartesianGrid stroke={c.grid} strokeDasharray="3 3" />
                <XAxis dataKey="T" type="number" domain={[0, 40]} label={L.x(t(`${P}.axis.temperature`))} {...axisProps(c)} />
                <YAxis yAxisId="w" width={56} domain={['auto', 'auto']} tickFormatter={(v) => fmt(v, 1)} label={L.y(t(`${P}.axis.water`))} {...axisProps(c)} />
                <YAxis yAxisId="l" orientation="right" width={56} domain={['auto', 'auto']} tickFormatter={(v) => fmt(v, 0)} label={L.yRight(sampleName)} {...axisProps(c)} />
                <Tooltip {...ttip} labelFormatter={(v) => `${v} °C`} formatter={(v, n) => [`${fmt(Number(v), 2)} kg/m³`, n]} />
                <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine yAxisId="w" x={4} stroke={c.accent3} strokeDasharray="4 4" label={{ value: '4 °C', fill: c.accent3, fontSize: 11, position: 'top' }} />
                <Line yAxisId="w" dataKey="water" name={t(`${P}.liquids.water`)} stroke={accent} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="l" dataKey="liquid" name={sampleName} stroke={c.accent2} strokeWidth={2} dot={false} isAnimationActive={false} />
                <ReferenceDot yAxisId="w" x={d.temperature} y={d.rhoWater} r={5} fill={accent} stroke={c.marker} />
              </ComposedChart>
            </ResponsiveContainer>
          ),
          csv: () => ({ filename: 'edulab-density-temperature', headers: ['T_C', 'water_kg_m3', `${d.liquid.id}_kg_m3`], rows: tempCurve.map((r) => [r.T, r.water, r.liquid]) }),
        },
  ]

  const formulas: Formula[] = [
    {
      id: 'rho',
      title: 'ρ = m / V',
      expression: (
        <>
          ρ = <Frac n={<V>m</V>} d={<V>V</V>} />
        </>
      ),
      substituted:
        d.mass !== null && d.volume !== null ? (
          <>
            {fmt(d.mass, 1)} g / {fmt(d.volume, 1)} cm³ = <b>{fmt(d.measuredDensity ?? 0, 2)} g/cm³</b> = {fmt(rhoKg ?? 0, 0)} kg/m³
          </>
        ) : (
          <>{t(`${P}.f.needBoth`)}</>
        ),
      variables: [
        { symbol: <V>m</V>, name: t(`${P}.f.m`), unit: 'g', value: d.mass === null ? '—' : fmt(d.mass, 1) },
        { symbol: <V>V</V>, name: t(`${P}.f.V`), unit: 'cm³', value: d.volume === null ? '—' : fmt(d.volume, 1) },
      ],
      explanation: t(`${P}.f.rhoExplain`),
    },
    {
      id: 'disp',
      title: 'V = V₂ − V₁',
      expression: (
        <>
          <V>V</V> = <V>V</V>
          <Sub>2</Sub> − <V>V</V>
          <Sub>1</Sub>
        </>
      ),
      substituted: (
        <>
          {fmt(d.cylinderLevel, 0)} mL − {START_VOLUME} mL = <b>{fmt(Math.max(0, d.cylinderLevel - START_VOLUME), 0)} cm³</b>
        </>
      ),
      variables: [
        { symbol: <V>V₁</V>, name: t(`${P}.f.V1`), unit: 'mL', value: String(START_VOLUME) },
        { symbol: <V>V₂</V>, name: t(`${P}.f.V2`), unit: 'mL', value: fmt(d.cylinderLevel, 0) },
      ],
      explanation: t(`${P}.f.dispExplain`),
    },
    {
      id: 'pyc',
      title: 'ρ = (m₃ − m₁)/(m₂ − m₁) · ρ_water',
      expression: (
        <>
          ρ = <Frac n={<>(<V>m</V><Sub>3</Sub> − <V>m</V><Sub>1</Sub>)</>} d={<>(<V>m</V><Sub>2</Sub> − <V>m</V><Sub>1</Sub>)</>} /> · ρ<Sub>water</Sub>
        </>
      ),
      substituted:
        d.pycno !== null ? (
          <>
            ({fmt(d.bottleMasses.liquid ?? 0, 2)} − {fmt(d.bottleMasses.empty ?? 0, 2)}) / ({fmt(d.bottleMasses.water ?? 0, 2)} − {fmt(d.bottleMasses.empty ?? 0, 2)}) × {fmt(d.rhoWater, 1)} = <b>{fmt(d.pycno, 1)} kg/m³</b>
          </>
        ) : (
          <>{t(`${P}.f.pycNeed`)}</>
        ),
      variables: [
        { symbol: <V>m₁</V>, name: t(`${P}.f.m1`), unit: 'g', value: d.bottleMasses.empty === undefined ? '—' : fmt(d.bottleMasses.empty, 2) },
        { symbol: <V>m₂</V>, name: t(`${P}.f.m2`), unit: 'g', value: d.bottleMasses.water === undefined ? '—' : fmt(d.bottleMasses.water, 2) },
        { symbol: <V>m₃</V>, name: t(`${P}.f.m3`), unit: 'g', value: d.bottleMasses.liquid === undefined ? '—' : fmt(d.bottleMasses.liquid, 2) },
      ],
      explanation: t(`${P}.f.pycExplain`),
    },
  ]

  const modePicker = (large = false) => (
    <Segmented
      label={t(`${P}.p.mode`)}
      value={d.mode}
      onChange={(m: Mode) => d.setMode(m)}
      options={[
        { value: 'solid' as Mode, label: t(`${P}.modes.solid`) },
        { value: 'liquid' as Mode, label: t(`${P}.modes.liquid`) },
      ]}
      size={large ? 'lg' : 'md'}
    />
  )

  const solidActions = (large = false) => {
    const size = large ? 'lg' : 'sm'
    return (
      <div className="flex flex-wrap gap-2">
        {d.place !== 'balance' ? (
          <Button size={size} variant="secondary" onClick={d.putOnBalance} disabled={d.moving}>
            <Scale className="h-3.5 w-3.5" aria-hidden />
            {t(`${P}.putOnBalance`)}
          </Button>
        ) : (
          <Button size={size} variant="primary" onClick={d.recordMass} disabled={d.moving}>
            <Scale className="h-3.5 w-3.5" aria-hidden />
            {t(`${P}.recordMass`)}
          </Button>
        )}
        {d.volumeMethod === 'ruler' ? (
          <Button size={size} variant={d.place === 'balance' ? 'secondary' : 'primary'} onClick={() => d.volumeReading !== null && d.recordVolume(d.volumeReading)}>
            <Ruler className="h-3.5 w-3.5" aria-hidden />
            {t(`${P}.measureDims`)}
          </Button>
        ) : d.place !== 'water' ? (
          <Button size={size} variant="secondary" onClick={d.lowerIntoWater} disabled={d.moving}>
            <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
            {t(`${P}.lower`)}
          </Button>
        ) : (
          <Button
            size={size}
            variant="primary"
            onClick={() => d.volumeReading !== null && d.recordVolume(d.volumeMethod === 'overflow' ? d.volumeReading : d.volumeReading - START_VOLUME)}
            disabled={d.moving}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
            {t(`${P}.recordVolume`)}
          </Button>
        )}
      </div>
    )
  }

  const bottleButtons = (large = false) => (
    <div className="flex flex-wrap gap-2">
      {(['empty', 'water', 'liquid'] as BottleState[]).map((b) => (
        <Button key={b} size={large ? 'lg' : 'sm'} variant={d.bottle === b ? 'primary' : 'secondary'} onClick={() => d.fillBottle(b)}>
          {t(`${P}.bottle.${b}`)}
          {d.bottleMasses[b] !== undefined && ' ✓'}
        </Button>
      ))}
      <Button size={large ? 'lg' : 'sm'} variant="subtle" onClick={d.weighBottle}>
        <Scale className="h-3.5 w-3.5" aria-hidden />
        {t(`${P}.recordMass`)}
      </Button>
    </div>
  )

  const controls = (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t(`${P}.p.mode`)}</span>
        {modePicker()}
      </div>
      {solidMode ? (
        <>
          <SelectField label={t(`${P}.p.sample`)} value={d.solidId} onChange={d.setSolid} options={SOLIDS.map((s) => ({ value: s.id, label: `${t(`${P}.solids.${s.id}`)}${s.dims ? '' : ` (${t(`${P}.irregular`)})`}` }))} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t(`${P}.p.volumeMethod`)}</span>
            <Segmented
              label={t(`${P}.p.volumeMethod`)}
              value={d.volumeMethod}
              onChange={(m: VolumeMethod) => d.setVolumeMethod(m)}
              options={(d.regular ? (['ruler', 'cylinder', 'overflow'] as VolumeMethod[]) : (['cylinder', 'overflow'] as VolumeMethod[])).map((m) => ({ value: m, label: t(`${P}.methods.${m}`) }))}
            />
            {!d.regular && <p className="text-xs leading-relaxed text-muted">{t(`${P}.p.irregularHint`)}</p>}
          </div>
          {d.volumeMethod !== 'ruler' && floats(d.trueDensity, d.rhoWater) && (
            <Toggle label={t(`${P}.p.pushUnder`)} checked={d.pushUnder} onChange={d.setPushUnder} description={t(`${P}.p.pushUnderHint`)} />
          )}
          {solidActions()}
          <RecordBox
            count={d.results.length}
            title={t(`${P}.results`, { count: d.results.length })}
            hint={t(`${P}.resultsHint`)}
            onRecord={() =>
              d.mass !== null &&
              d.volume !== null &&
              d.measuredDensity !== null &&
              d.saveResult({ sample: d.solid.id, method: d.volumeMethod, mass: d.mass, volume: d.volume, density: d.measuredDensity, actual: d.trueDensity })
            }
            disabled={d.measuredDensity === null}
            onClear={d.clearResults}
          />
        </>
      ) : (
        <>
          <SelectField label={t(`${P}.p.liquid`)} value={d.liquidId} onChange={d.setLiquid} options={LIQUIDS.map((l) => ({ value: l.id, label: t(`${P}.liquids.${l.id}`) }))} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">{t(`${P}.p.liquidMethod`)}</span>
            <Segmented
              label={t(`${P}.p.liquidMethod`)}
              value={d.liquidMethod}
              onChange={(m: LiquidMethod) => d.setLiquidMethod(m)}
              options={(['pycnometer', 'hydrometer'] as LiquidMethod[]).map((m) => ({ value: m, label: t(`${P}.methods.${m}`) }))}
            />
          </div>
          <ParamSlider label={t(`${P}.p.temperature`)} value={d.temperature} min={0} max={40} step={1} unit="°C" onChange={d.setTemperature} accent={accent} />
          {d.liquidMethod === 'pycnometer' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">{t(`${P}.p.bottle`, { value: d.pycnometerVolume })}</span>
              {bottleButtons()}
            </div>
          )}
        </>
      )}
    </>
  )

  const presenterControls = (
    <>
      {modePicker(true)}
      {solidMode ? solidActions(true) : d.liquidMethod === 'pycnometer' ? bottleButtons(true) : null}
    </>
  )

  const viewport = (large: boolean) => (
    <SceneViewport
      large={large}
      className={large ? 'h-full' : 'h-[420px] sm:h-[480px]'}
      camera={{ position: [0, 2.3, 4.4], target: [0, 0.75, 0] }}
      scene={
        <DensityMeasurementScene
          c={d}
          labels={{
            reading: t(`${P}.balance`),
            balance: solidMode ? `${fmt(d.balanceReading, 1)} g` : `${fmt(d.bottleReading, 2)} g`,
            cylinder: volumeLabel,
            caught: `${fmt(d.cylinderLevel, 0)} mL`,
            hydrometer: d.hydroReading === null ? t(`${P}.m.outOfRange`) : `${fmt(d.hydroReading, 0)} kg/m³`,
          }}
        />
      }
      fallback2D={<DensityMeasurement2D c={d} label={t('lab.view2d', { name: t('catalog.density-measurement.title') })} />}
      controls={{ running: d.moving, onTogglePlay: d.place === 'water' ? d.backToBench : d.lowerIntoWater, onReset: d.reset }}
      overlay={<OverlayNote>{solidMode ? t(`${P}.legendSolid`) : t(`${P}.legendLiquid`)}</OverlayNote>}
    />
  )

  return (
    <ExperimentShell
      experiment={experiment}
      progressSettings={solidMode ? { mode: d.mode, sample: d.solidId, method: d.volumeMethod } : { mode: d.mode, liquid: d.liquidId, method: d.liquidMethod }}
      viewport={viewport}
      controls={controls}
      presenterControls={presenterControls}
      measurements={measurements}
      presenterMeasurements={measurements.slice(0, 3)}
      tutorParams={
        solidMode
          ? [
              { label: t(`${P}.p.sample`), value: `${d.solid.id}${d.regular ? ' (regular block)' : ' (irregular)'}` },
              { label: t(`${P}.p.volumeMethod`), value: d.volumeMethod },
              { label: 'Recorded mass', value: d.mass === null ? 'not yet' : fmt(d.mass, 1), unit: d.mass === null ? undefined : 'g' },
              { label: 'Recorded volume', value: d.volume === null ? 'not yet' : fmt(d.volume, 1), unit: d.volume === null ? undefined : 'cm³' },
              { label: 'Pushed under (floating samples)', value: d.pushUnder ? 'yes' : 'no' },
            ]
          : [
              { label: t(`${P}.p.liquid`), value: d.liquid.id },
              { label: t(`${P}.p.liquidMethod`), value: d.liquidMethod },
              { label: t(`${P}.p.temperature`), value: fmt(d.temperature, 0), unit: '°C' },
              { label: 'Bottle masses (g)', value: JSON.stringify(d.bottleMasses) },
            ]
      }
      charts={<ChartTabs charts={charts} />}
      presenterChart={charts[0].render(charts[0].data)}
      formula={<FormulaExplorer formulas={formulas} />}
      keys={{
        running: d.moving,
        togglePlay: d.place === 'water' ? d.backToBench : d.lowerIntoWater,
        reset: d.reset,
        increase: () => !solidMode && d.setTemperature(Math.min(40, d.temperature + 1)),
        decrease: () => !solidMode && d.setTemperature(Math.max(0, d.temperature - 1)),
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
