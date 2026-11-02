import { clsx } from 'clsx'
import { Beaker, Cloud, Droplets, Flame, Gem, LayoutGrid, Pipette, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CHEMISTRY_ITEM_CATEGORIES, type ChemistryItemCategory } from '../../data/chemistryItems'

export type CategoryFilter = ChemistryItemCategory | 'all'

const CATEGORY_ICON: Record<CategoryFilter, LucideIcon> = {
  all: LayoutGrid,
  container: Beaker,
  solution: Droplets,
  substance: Gem,
  tool: Pipette,
  reaction: Flame,
  gas: Cloud,
}

/**
 * Category filter: a vertical icon rail on wide screens, a horizontally scrolling strip on phones.
 * Buttons are toggle buttons (aria-pressed), like the experiment library's category chips.
 */
export function ItemCategorySidebar({
  value,
  counts,
  onChange,
}: {
  value: CategoryFilter
  counts: Record<CategoryFilter, number>
  onChange: (category: CategoryFilter) => void
}) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('chemItems.categoriesLabel')} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:overflow-visible">
      <ul className="flex gap-2 lg:w-24 lg:flex-col">
        {(['all', ...CHEMISTRY_ITEM_CATEGORIES] as CategoryFilter[]).map((cat) => {
          const Icon = CATEGORY_ICON[cat]
          const active = value === cat
          return (
            <li key={cat} className="shrink-0">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onChange(cat)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand lg:flex-col lg:gap-1 lg:px-1.5 lg:py-2.5 lg:text-xs',
                  active ? 'border-chemistry bg-chemistry-soft text-chemistry-ink' : 'border-line bg-surface text-muted hover:text-ink',
                )}
              >
                <span
                  className={clsx(
                    'grid h-7 w-7 place-items-center rounded-lg lg:h-10 lg:w-10',
                    active ? 'bg-chemistry text-white' : 'bg-surface-2 text-ink',
                  )}
                  aria-hidden
                >
                  <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
                </span>
                <span className="text-center leading-tight whitespace-nowrap lg:whitespace-normal">{t(`chemItems.categories.${cat}`)}</span>
                <span className="tabular text-xs text-faint lg:text-[0.7rem]">{counts[cat]}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
