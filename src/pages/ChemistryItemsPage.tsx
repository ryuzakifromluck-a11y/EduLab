import { Plus, Search, Volume2, X } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { ItemPicture } from '../components/chemistry/ItemPicture'
import { SoundControls } from '../components/chemistry/SoundControls'
import { ChemistryItemGrid } from '../components/lab/ChemistryItemGrid'
import { ChemistryWorkbench } from '../components/lab/ChemistryWorkbench'
import { formatConcentration, itemName } from '../components/lab/chemistryItemFormat'
import { ItemCategorySidebar, type CategoryFilter } from '../components/lab/ItemCategorySidebar'
import { Button } from '../components/ui/primitives'
import {
  CHEMISTRY_ITEM_BY_ID,
  CHEMISTRY_ITEM_CATEGORIES,
  CHEMISTRY_ITEMS,
  filterItems,
  type ChemistryItem,
} from '../data/chemistryItems'
import { announce } from '../lib/announce'
import { playSound } from '../lib/chemistry/soundManager'
import { BENCH_LIMIT, useChemWorkbench } from '../store/chemWorkbench'

const isCategory = (v: string | null): v is CategoryFilter => v === 'all' || (CHEMISTRY_ITEM_CATEGORIES as readonly string[]).includes(v ?? '')

const COUNTS = Object.fromEntries([
  ['all', CHEMISTRY_ITEMS.length],
  ...CHEMISTRY_ITEM_CATEGORIES.map((c) => [c, CHEMISTRY_ITEMS.filter((i) => i.category === c).length]),
]) as Record<CategoryFilter, number>

/**
 * The Chemistry "Items" tab: a catalog of lab equipment, reagents and reaction effects with a
 * category rail, search, and a workbench to lay items out on. Filters live in the URL
 * (`/chemistry/items?cat=gas&q=chlorine&item=gas-cl2`) so a view can be shared.
 */
export default function ChemistryItemsPage() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const rawCat = params.get('cat')
  const category: CategoryFilter = isCategory(rawCat) ? rawCat : 'all'
  const q = params.get('q') ?? ''
  const selected = CHEMISTRY_ITEM_BY_ID[params.get('item') ?? ''] ?? null
  const add = useChemWorkbench((s) => s.add)

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null || value === '' || (key === 'cat' && value === 'all')) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const results = useMemo(() => filterItems(CHEMISTRY_ITEMS, category, q), [category, q])

  const select = (item: ChemistryItem) => set('item', item.id)

  const addToBench = (item: ChemistryItem, at?: { x: number; y: number }) => {
    const name = itemName(item, i18n.language)
    if (!add(item.id, at)) {
      announce(t('chemItems.bench.full', { max: BENCH_LIMIT }), 'assertive')
      return
    }
    if (item.sound) playSound(item.sound, { volume: 0.6 })
    announce(t('chemItems.added', { name }))
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)_auto] xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)_auto]">
      {/* Category rail: a strip above the catalog on phones, the right-hand column on wide screens. */}
      <div className="lg:order-3">
        <ItemCategorySidebar value={category} counts={COUNTS} onChange={(c) => set('cat', c)} />
      </div>

      {/* Catalog */}
      <section aria-labelledby="items-catalog-heading" className="flex min-w-0 flex-col gap-3 lg:order-2">
        <h3 id="items-catalog-heading" className="sr-only">
          {t('chemItems.catalog')}
        </h3>
        <label className="relative">
          <span className="sr-only">{t('chemItems.search')}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => set('q', e.target.value)}
            placeholder={t('chemItems.searchPlaceholder')}
            className="h-10 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-faint"
          />
        </label>
        <div className="flex items-center justify-between text-sm text-muted" aria-live="polite">
          <span>{t('chemItems.results', { count: results.length })}</span>
          {(q || category !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => setParams(selected ? { item: selected.id } : {}, { replace: true })}>
              <X className="h-3.5 w-3.5" aria-hidden />
              {t('chemItems.clear')}
            </Button>
          )}
        </div>
        <div className="max-h-[32rem] overflow-y-auto rounded-xl lg:max-h-[46rem] lg:pr-1">
          <ChemistryItemGrid items={results} selectedId={selected?.id ?? null} onSelect={select} onAdd={(i) => addToBench(i)} />
        </div>
      </section>

      {/* Selected item and workbench */}
      <div className="flex min-w-0 flex-col gap-5 lg:order-1">
        <ChemistryWorkbench onAddDropped={(id, at) => addToBench(CHEMISTRY_ITEM_BY_ID[id], at)} onPick={select} />
        <ItemDetails item={selected} onAdd={(i) => addToBench(i)} />
        <p className="text-xs text-faint">{t('chemItems.artNote')}</p>
      </div>
    </div>
  )
}

function ItemDetails({ item, onAdd }: { item: ChemistryItem | null; onAdd: (item: ChemistryItem) => void }) {
  const { t, i18n } = useTranslation()
  if (!item) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-5 py-6 text-sm text-muted" aria-live="polite">
        {t('chemItems.details.none')}
      </div>
    )
  }
  const lang = i18n.language
  const num = (v: number, digits = 2) => new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(v)
  const facts: [string, string][] = [[t('chemItems.details.category'), t(`chemItems.categories.${item.category}`)]]
  if (item.formula) facts.push([t('chemItems.details.formula'), item.formula])
  if (item.concentration) facts.push([t('chemItems.details.concentration'), formatConcentration(item.concentration, t, lang)])
  if (item.molarMass) facts.push([t('chemItems.details.molarMass'), t('chemItems.units.gmol', { value: num(item.molarMass) })])
  if (item.capacity) facts.push([t('chemItems.details.capacity'), t('chemItems.units.mL', { value: num(item.capacity) })])
  if (item.state) facts.push([t('chemItems.details.state'), t(`chemItems.states.${item.state}`)])

  return (
    <section aria-labelledby="item-details-heading" aria-live="polite" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card sm:flex-row">
      <div className="flex h-36 shrink-0 items-center justify-center rounded-xl bg-[#1b2230] p-3 sm:w-36" aria-hidden>
        <ItemPicture item={item} className="max-h-full max-w-full" animate={item.category === 'reaction'} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-chemistry-ink uppercase">{t('chemItems.details.selected')}</p>
          <h3 id="item-details-heading" className="text-lg font-semibold text-ink">
            {itemName(item, lang)}
          </h3>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          {facts.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="truncate font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => onAdd(item)}>
            <Plus className="h-4 w-4" aria-hidden />
            {t('chemItems.add')}
          </Button>
          {item.sound && (
            <Button variant="secondary" size="sm" onClick={() => playSound(item.sound!)}>
              <Volume2 className="h-4 w-4" aria-hidden />
              {t('chemItems.details.playSound')}
            </Button>
          )}
        </div>
        {item.sound && <SoundControls />}
      </div>
    </section>
  )
}
