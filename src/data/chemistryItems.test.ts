import { describe, expect, it } from 'vitest'
import { EFFECT_IDS } from '../lib/chemistry/reactionCatalog'
import { BENCH_LIMIT, slotPosition, useChemWorkbench } from '../store/chemWorkbench'
import { CHEMISTRY_ITEM_BY_ID, CHEMISTRY_ITEM_CATEGORIES, CHEMISTRY_ITEMS, filterItems, itemsInCategory, normalizeSearch } from './chemistryItems'

/** A 2D context that accepts every call, so drawings can run in Node without a canvas. */
function fakeContext() {
  const gradient = { addColorStop: () => {} }
  const calls = { count: 0 }
  const ctx = new Proxy(
    {},
    {
      get(target: Record<string, unknown>, key: string) {
        if (key in target) return target[key]
        if (key === 'measureText') return (text: string) => ({ width: text.length * 6 })
        if (key.startsWith('create')) return () => gradient
        return () => {
          calls.count++
        }
      },
      set(target: Record<string, unknown>, key: string, value: unknown) {
        target[key] = value
        return true
      },
    },
  )
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls }
}

describe('chemistry items catalog', () => {
  it('has unique ids and names in every language', () => {
    expect(new Set(CHEMISTRY_ITEMS.map((i) => i.id)).size).toBe(CHEMISTRY_ITEMS.length)
    for (const item of CHEMISTRY_ITEMS) {
      for (const lang of ['en', 'uz', 'ru'] as const) expect(item.name[lang].trim(), `${item.id} ${lang}`).not.toBe('')
      expect(item.art.w, item.id).toBeGreaterThan(0)
      expect(item.art.h, item.id).toBeGreaterThan(0)
    }
  })

  it('fills every category with a good number of items', () => {
    for (const cat of CHEMISTRY_ITEM_CATEGORIES) expect(itemsInCategory(cat).length, cat).toBeGreaterThanOrEqual(10)
    expect(itemsInCategory('all')).toHaveLength(CHEMISTRY_ITEMS.length)
    expect(CHEMISTRY_ITEMS.length).toBeGreaterThanOrEqual(100)
  })

  it('includes the items students expect to find', () => {
    for (const id of ['beaker', 'conical-flask-100', 'round-bottom-flask', 'test-tube', 'evaporating-dish', 'crucible', 'volumetric-flask-100', 'separating-funnel'])
      expect(CHEMISTRY_ITEM_BY_ID[id]?.category, id).toBe('container')
    for (const id of ['na', 'k', 'ca', 'mg', 'zn', 'fe', 'cu', 'al', 'c', 'nacl', 'cuso4-5h2o', 'caco3', 'c9h8o4', 'kmno4', 'kclo3', 'mgo', 'mno2'])
      expect(CHEMISTRY_ITEM_BY_ID[`substance-${id}`]?.category, id).toBe('substance')
    for (const id of ['dropper', 'thermometer', 'stopwatch', 'tripod', 'mortar-and-pestle', 'funnel', 'measuring-cylinder-100'])
      expect(CHEMISTRY_ITEM_BY_ID[id]?.category, id).toBe('tool')
    for (const id of EFFECT_IDS) expect(CHEMISTRY_ITEM_BY_ID[`effect-${id}`]?.category, id).toBe('reaction')
    expect(CHEMISTRY_ITEM_BY_ID['gas-jar'].category).toBe('gas')
    expect(CHEMISTRY_ITEM_BY_ID['nacl-solution']).toMatchObject({ category: 'solution', formula: 'NaCl', concentration: { value: 1, unit: 'mol/L' } })
  })

  it('draws every picture in code without throwing', () => {
    for (const item of CHEMISTRY_ITEMS) {
      const { ctx, calls } = fakeContext()
      expect(() => item.art.draw(ctx, item.art.w, item.art.h), item.id).not.toThrow()
      expect(calls.count, item.id).toBeGreaterThan(0)
      // No item ships a third-party file: pictures are drawn unless someone sets `image` on purpose.
      expect(item.image, item.id).toBeUndefined()
    }
    const fire = CHEMISTRY_ITEM_BY_ID['effect-sodium-fire'].art.frames!
    const { ctx } = fakeContext()
    for (let f = 0; f < fire.count; f++) expect(() => fire.draw(ctx, 96, 160, f, fire.count)).not.toThrow()
  })
})

describe('item search', () => {
  it('normalises subscripts and case', () => {
    expect(normalizeSearch('  KMnO₄ ')).toBe('kmno4')
  })

  it('finds items by formula with or without subscripts', () => {
    const ids = (q: string) => filterItems(CHEMISTRY_ITEMS, 'all', q).map((i) => i.id)
    expect(ids('kmno4')).toEqual(expect.arrayContaining(['substance-kmno4', 'kmno4-solution']))
    expect(ids('KMnO₄')).toEqual(ids('kmno4'))
    expect(ids('cl2')).toContain('gas-cl2')
  })

  it('matches names in every language and combines with the category', () => {
    expect(filterItems(CHEMISTRY_ITEMS, 'all', 'натрий').map((i) => i.id)).toContain('substance-na')
    expect(filterItems(CHEMISTRY_ITEMS, 'all', 'probirka').map((i) => i.id)).toContain('test-tube')
    expect(filterItems(CHEMISTRY_ITEMS, 'tool', 'beaker')).toHaveLength(0)
    expect(filterItems(CHEMISTRY_ITEMS, 'gas', '').every((i) => i.category === 'gas')).toBe(true)
    expect(filterItems(CHEMISTRY_ITEMS, 'all', 'sodium chloride solution').map((i) => i.id)).toEqual(['nacl-solution'])
  })
})

describe('workbench store', () => {
  it('adds, moves, clamps and removes items', () => {
    const bench = useChemWorkbench
    bench.getState().clear()
    expect(bench.getState().add('beaker')).toBe(true)
    expect(bench.getState().add('dropper', { x: 50, y: 50 })).toBe(true)
    const [a, b] = bench.getState().items
    expect(a).toMatchObject({ itemId: 'beaker', ...slotPosition(0) })
    expect(b).toMatchObject({ itemId: 'dropper', x: 50, y: 50 })
    bench.getState().move(b.key, 500, -20)
    expect(bench.getState().items[1]).toMatchObject({ x: 94, y: 10 })
    bench.getState().remove(a.key)
    expect(bench.getState().items.map((i) => i.itemId)).toEqual(['dropper'])
  })

  it('refuses items past the limit', () => {
    const bench = useChemWorkbench
    bench.getState().clear()
    for (let i = 0; i < BENCH_LIMIT; i++) expect(bench.getState().add('beaker')).toBe(true)
    expect(bench.getState().add('beaker')).toBe(false)
    expect(bench.getState().items).toHaveLength(BENCH_LIMIT)
  })
})
