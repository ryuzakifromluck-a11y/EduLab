import { clsx } from 'clsx'
import { Plus } from 'lucide-react'
import type { DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChemistryItem } from '../../data/chemistryItems'
import { ItemPicture } from '../chemistry/ItemPicture'
import { ITEM_DRAG_TYPE, formatConcentration, itemName } from './chemistryItemFormat'

/** One catalog item: picture on a dark lab tile, name, formula/concentration badge and an add button. */
export function ChemistryItemCard({
  item,
  selected,
  onSelect,
  onAdd,
}: {
  item: ChemistryItem
  selected: boolean
  onSelect: (item: ChemistryItem) => void
  onAdd: (item: ChemistryItem) => void
}) {
  const { t, i18n } = useTranslation()
  const name = itemName(item, i18n.language)
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData(ITEM_DRAG_TYPE, item.id)
    e.dataTransfer.setData('text/plain', name)
    e.dataTransfer.effectAllowed = 'copy'
  }
  return (
    <div
      className={clsx(
        'group relative flex h-full flex-col overflow-hidden rounded-xl border bg-surface transition-[border-color,box-shadow]',
        selected ? 'border-chemistry shadow-[0_0_0_2px_var(--chemistry)]' : 'border-line hover:border-chemistry/50',
      )}
    >
      <button
        type="button"
        draggable
        onDragStart={onDragStart}
        onClick={() => onSelect(item)}
        onDoubleClick={() => onAdd(item)}
        aria-pressed={selected}
        className="flex flex-1 flex-col text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <span className="flex h-24 items-center justify-center bg-[#1b2230] p-2 sm:h-28" aria-hidden>
          <ItemPicture item={item} className="max-h-full max-w-full" />
        </span>
        <span className="flex flex-1 flex-col gap-1.5 p-2.5">
          <span className="text-sm leading-snug font-medium text-ink">{name}</span>
          {(item.formula || item.concentration) && (
            <span className="flex flex-wrap gap-1">
              {item.formula && <span className="rounded-md bg-chemistry-soft px-1.5 py-0.5 text-xs font-semibold text-chemistry-ink">{item.formula}</span>}
              {item.concentration && (
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-muted">{formatConcentration(item.concentration, t, i18n.language)}</span>
              )}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onAdd(item)}
        aria-label={t('chemItems.addNamed', { name })}
        title={t('chemItems.add')}
        className="absolute top-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-lg bg-black/45 text-white opacity-100 transition-opacity hover:bg-chemistry focus-visible:outline-2 focus-visible:outline-white sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
