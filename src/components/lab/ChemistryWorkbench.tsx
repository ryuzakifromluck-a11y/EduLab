import { clsx } from 'clsx'
import { Trash2 } from 'lucide-react'
import { useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CHEMISTRY_ITEM_BY_ID, type ChemistryItem } from '../../data/chemistryItems'
import { useMediaQuery } from '../../lib/hooks'
import { BENCH_LIMIT, useChemWorkbench, type BenchItem } from '../../store/chemWorkbench'
import { ItemPicture } from '../chemistry/ItemPicture'
import { Button } from '../ui/primitives'
import { ITEM_DRAG_TYPE, itemName } from './chemistryItemFormat'

/** Display height of an item on the bench, from its drawing size. */
const benchHeight = (item: ChemistryItem, scale: number) => Math.round(Math.min(150, Math.max(44, item.art.h * 0.42)) * scale)

/**
 * The dark lab bench where students lay out equipment. Items arrive by drag and drop from the
 * catalog or with the "Add" buttons, can be dragged around with mouse/touch, and moved with the
 * arrow keys or removed with Delete when focused.
 */
export function ChemistryWorkbench({ onAddDropped, onPick }: { onAddDropped: (itemId: string, at: { x: number; y: number }) => void; onPick: (item: ChemistryItem) => void }) {
  const { t, i18n } = useTranslation()
  const items = useChemWorkbench((s) => s.items)
  const move = useChemWorkbench((s) => s.move)
  const remove = useChemWorkbench((s) => s.remove)
  const clear = useChemWorkbench((s) => s.clear)
  const bench = useRef<HTMLDivElement>(null)
  const [over, setOver] = useState(false)
  const wide = useMediaQuery('(min-width: 640px)')
  const scale = wide ? 1 : 0.7

  const percentAt = (clientX: number, clientY: number) => {
    const r = bench.current!.getBoundingClientRect()
    return { x: ((clientX - r.left) / r.width) * 100, y: ((clientY - r.top) / r.height) * 100 }
  }

  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(ITEM_DRAG_TYPE)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setOver(true)
  }
  const onDrop = (e: DragEvent) => {
    const id = e.dataTransfer.getData(ITEM_DRAG_TYPE)
    setOver(false)
    if (!id || !CHEMISTRY_ITEM_BY_ID[id]) return
    e.preventDefault()
    onAddDropped(id, percentAt(e.clientX, e.clientY))
  }

  return (
    <section aria-labelledby="bench-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="bench-heading" className="text-base font-semibold text-ink">
            {t('chemItems.bench.title')}
          </h3>
          <p className="text-xs text-muted">{t('chemItems.bench.count', { count: items.length, max: BENCH_LIMIT })}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clear} disabled={!items.length}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          {t('chemItems.bench.clear')}
        </Button>
      </div>
      <div
        ref={bench}
        onDragOver={onDragOver}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        role="group"
        aria-label={t('chemItems.bench.label')}
        aria-describedby="bench-help"
        className={clsx(
          'relative h-[22rem] touch-none overflow-hidden rounded-2xl border-2 bg-[#1b2230] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07),transparent_60%)] sm:h-[30rem]',
          over ? 'border-chemistry border-dashed' : 'border-transparent',
        )}
      >
        {/* bench edge */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" aria-hidden />
        {items.map((b) => {
          const item = CHEMISTRY_ITEM_BY_ID[b.itemId]
          return item ? (
            <BenchPiece
              key={b.key}
              bench={b}
              item={item}
              name={itemName(item, i18n.language)}
              height={benchHeight(item, scale)}
              percentAt={percentAt}
              onMove={(x, y) => move(b.key, x, y)}
              onRemove={() => remove(b.key)}
              onPick={() => onPick(item)}
            />
          ) : null
        })}
        {!items.length && <p className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-white/60">{t('chemItems.bench.empty')}</p>}
      </div>
      <p id="bench-help" className="text-xs text-faint">
        {t('chemItems.bench.help')}
      </p>
    </section>
  )
}

function BenchPiece({
  bench,
  item,
  name,
  height,
  percentAt,
  onMove,
  onRemove,
  onPick,
}: {
  bench: BenchItem
  item: ChemistryItem
  name: string
  height: number
  percentAt: (x: number, y: number) => { x: number; y: number }
  onMove: (x: number, y: number) => void
  onRemove: () => void
  onPick: () => void
}) {
  const { t } = useTranslation()
  const drag = useRef<{ dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(null)

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    const p = percentAt(e.clientX, e.clientY)
    drag.current = { dx: p.x - bench.x, dy: p.y - bench.y, startX: e.clientX, startY: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return
    d.moved = true
    const p = percentAt(e.clientX, e.clientY)
    onMove(p.x - d.dx, p.y - d.dy)
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) onPick()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 10 : 2
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (delta[e.key]) {
      e.preventDefault()
      onMove(bench.x + delta[e.key][0], bench.y + delta[e.key][1])
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onRemove()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPick()
    }
  }

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={onKeyDown}
      aria-label={t('chemItems.bench.itemLabel', { name })}
      title={name}
      style={{ left: `${bench.x}%`, top: `${bench.y}%`, height }}
      className="group absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none flex-col items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:cursor-grabbing"
    >
      <ItemPicture item={item} className="pointer-events-none h-full w-auto max-w-none select-none" animate={item.category === 'reaction'} />
      <span className="pointer-events-none absolute top-full mt-1 max-w-32 truncate rounded bg-black/55 px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {name}
      </span>
    </button>
  )
}
