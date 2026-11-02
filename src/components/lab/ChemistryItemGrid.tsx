import { useTranslation } from 'react-i18next'
import type { ChemistryItem } from '../../data/chemistryItems'
import { ChemistryItemCard } from './ChemistryItemCard'

/** Responsive grid of catalog cards. Filtering happens in the page; this only lays items out. */
export function ChemistryItemGrid({
  items,
  selectedId,
  onSelect,
  onAdd,
}: {
  items: ChemistryItem[]
  selectedId: string | null
  onSelect: (item: ChemistryItem) => void
  onAdd: (item: ChemistryItem) => void
}) {
  const { t } = useTranslation()
  if (!items.length) {
    return <p className="rounded-xl border border-dashed border-line px-4 py-12 text-center text-sm text-muted">{t('chemItems.empty')}</p>
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3" aria-label={t('chemItems.gridLabel')}>
      {items.map((item) => (
        <li key={item.id}>
          <ChemistryItemCard item={item} selected={item.id === selectedId} onSelect={onSelect} onAdd={onAdd} />
        </li>
      ))}
    </ul>
  )
}
