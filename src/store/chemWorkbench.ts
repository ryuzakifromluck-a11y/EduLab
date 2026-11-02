import { create } from 'zustand'

/** One item placed on the Chemistry items workbench. x/y are the item's centre in % of the bench. */
export interface BenchItem {
  key: number
  itemId: string
  x: number
  y: number
}

export const BENCH_LIMIT = 24

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const clampBench = (x: number, y: number) => ({ x: clamp(x, 6, 94), y: clamp(y, 10, 90) })

interface WorkbenchState {
  items: BenchItem[]
  nextKey: number
  /** Adds an item; without a position it goes to the next free slot. Returns false when the bench is full. */
  add: (itemId: string, at?: { x: number; y: number }) => boolean
  move: (key: number, x: number, y: number) => void
  remove: (key: number) => void
  clear: () => void
}

/** Default slots fill the bench left to right in rows, so items added by button don't stack. */
export function slotPosition(index: number) {
  const perRow = 6
  const col = index % perRow
  const row = Math.floor(index / perRow) % 4
  return { x: 10 + col * 16, y: 22 + row * 20 }
}

/** Kept for the whole visit (not persisted), so switching tabs doesn't clear the bench. */
export const useChemWorkbench = create<WorkbenchState>((set, get) => ({
  items: [],
  nextKey: 1,
  add: (itemId, at) => {
    const { items, nextKey } = get()
    if (items.length >= BENCH_LIMIT) return false
    const p = at ?? slotPosition(items.length)
    const pos = clampBench(p.x, p.y)
    set({ items: [...items, { key: nextKey, itemId, ...pos }], nextKey: nextKey + 1 })
    return true
  },
  move: (key, x, y) => set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, ...clampBench(x, y) } : i)) })),
  remove: (key) => set((s) => ({ items: s.items.filter((i) => i.key !== key) })),
  clear: () => set({ items: [] }),
}))
