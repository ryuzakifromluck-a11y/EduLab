import { Download, LineChart as LineIcon, Pause, Play } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { announce } from '../../lib/announce'
import { downloadCsv } from '../../lib/csv'
import { IconButton } from '../ui/primitives'
import { Panel, Segmented } from './controls'

export interface ChartDef<D = unknown> {
  id: string
  title: string
  /** Data snapshot for the chart; frozen while the user inspects the chart. */
  data: D
  render: (data: D) => ReactNode
  csv: () => { filename: string; headers: string[]; rows: (string | number)[][] }
  caption?: ReactNode
}

/**
 * Tabbed live charts. "Freeze" holds the current data snapshot so a moment can be
 * inspected with the tooltip while the simulation keeps running.
 */
export function ChartTabs({ charts, height = 280 }: { charts: ChartDef<any>[]; height?: number }) {
  const { t } = useTranslation()
  const [active, setActive] = useState(charts[0].id)
  const [frozen, setFrozen] = useState(false)
  const captionId = useId()
  const snapshot = useRef<Record<string, unknown>>({})
  const chart = charts.find((c) => c.id === active) ?? charts[0]
  if (!frozen) for (const c of charts) snapshot.current[c.id] = c.data
  const data = snapshot.current[chart.id]

  const exportCsv = () => {
    const { filename, headers, rows } = chart.csv()
    downloadCsv(filename, headers, rows)
  }

  return (
    <Panel
      title={t('lab.liveGraphs')}
      icon={<LineIcon className="h-4 w-4" />}
      actions={
        <>
          <IconButton label={frozen ? t('lab.resumeGraph') : t('lab.freezeGraph')} active={frozen}
            onClick={() => {
              setFrozen(!frozen)
              announce(frozen ? t('lab.resumeGraph') : t('lab.graphFrozen'))
            }}
          >
            {frozen ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </IconButton>
          <IconButton label={t('lab.exportCsv')} onClick={exportCsv}>
            <Download className="h-4 w-4" />
          </IconButton>
        </>
      }
      bodyClassName="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented label={t('lab.liveGraphs')} value={active} onChange={setActive} options={charts.map((c) => ({ value: c.id, label: c.title }))} />
        {frozen && <span className="text-xs font-medium text-warn">{t('lab.graphFrozen')}</span>}
      </div>
      {/* role="figure", not "img": Recharts' accessibility layer lets keyboard users focus the
          chart and step through data points with the arrow keys, which "img" would hide. */}
      <div
        style={{ height }}
        className="w-full"
        role="figure"
        aria-label={`${chart.title}. ${t('lab.chartKeys')}`}
        aria-describedby={chart.caption ? captionId : undefined}
      >
        {chart.render(data)}
      </div>
      {chart.caption && (
        <p id={captionId} className="text-xs leading-relaxed text-muted">
          {chart.caption}
        </p>
      )}
    </Panel>
  )
}
