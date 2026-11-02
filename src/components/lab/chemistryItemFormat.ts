import type { TFunction } from 'i18next'
import type { ChemistryItem, Concentration } from '../../data/chemistryItems'
import { pick } from '../../lib/chemistry/types'

/** MIME type used when dragging a catalog item onto the workbench. */
export const ITEM_DRAG_TYPE = 'application/x-edulab-chem-item'

export const itemName = (item: ChemistryItem, lang: string) => pick(item.name, lang)

export function formatConcentration(c: Concentration, t: TFunction, lang: string) {
  const value = new Intl.NumberFormat(lang, { maximumFractionDigits: 3 }).format(c.value)
  return c.unit === '%' ? t('chemItems.units.percent', { value }) : t('chemItems.units.molL', { value })
}
