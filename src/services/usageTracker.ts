/**
 * Local, anonymous usage counter. Every experiment page visit is counted on
 * this device (totals per experiment and per month) and queued as an event
 * for the analytics API, so visits made offline are reported later.
 * Nothing personal is stored: only experiment ids, subjects and timestamps.
 */

export type UsageSubject = 'physics' | 'chemistry' | 'biology'
export type UsageEventType = 'visit' | 'complete'

export interface UsageEvent {
  type: UsageEventType
  subject: UsageSubject
  experimentId: string
  /** ISO timestamp. */
  at: string
}

export interface LocalUsage {
  totalSessions: number
  completedSessions: number
  /** Visits per experiment id. */
  visits: Record<string, number>
  /** Visits per month, keyed `YYYY-MM`. */
  monthly: Record<string, number>
}

/** The subset of the Web Storage API the tracker needs. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface StoredState {
  v: 1
  usage: LocalUsage
  pending: UsageEvent[]
}

export const STORAGE_KEY = 'edulab.analytics.v1'
/** Oldest events are dropped beyond this, so an always-offline device stays small. */
export const MAX_PENDING = 500
/** React StrictMode mounts effects twice in development; ignore repeats this close together. */
const DEDUPE_MS = 1500

const emptyUsage = (): LocalUsage => ({ totalSessions: 0, completedSessions: 0, visits: {}, monthly: {} })

export interface UsageTracker {
  record(type: UsageEventType, subject: UsageSubject, experimentId: string): boolean
  getLocalUsage(): LocalUsage
  getPending(): UsageEvent[]
  /** Removes the first `count` pending events after the API accepted them. */
  markSent(count: number): void
}

export function createUsageTracker(storage: KeyValueStorage | null, now: () => Date = () => new Date()): UsageTracker {
  // Kept in memory too, so counting still works when storage is unavailable (private mode, blocked).
  let memory: StoredState = { v: 1, usage: emptyUsage(), pending: [] }
  let last: { key: string; time: number } | null = null

  const load = (): StoredState => {
    if (!storage) return memory
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) return memory
      const parsed = JSON.parse(raw) as StoredState
      if (parsed?.v !== 1 || !parsed.usage || !Array.isArray(parsed.pending)) return memory
      return { v: 1, usage: { ...emptyUsage(), ...parsed.usage }, pending: parsed.pending }
    } catch {
      return memory
    }
  }

  const save = (state: StoredState) => {
    memory = state
    if (!storage) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota exceeded or storage blocked: the in-memory copy still counts this session.
    }
  }

  return {
    record(type, subject, experimentId) {
      const date = now()
      const key = `${type}:${subject}/${experimentId}`
      if (last && last.key === key && date.getTime() - last.time < DEDUPE_MS) return false
      last = { key, time: date.getTime() }

      const state = load()
      const usage = state.usage
      if (type === 'visit') {
        const month = date.toISOString().slice(0, 7)
        usage.totalSessions += 1
        usage.visits[experimentId] = (usage.visits[experimentId] ?? 0) + 1
        usage.monthly[month] = (usage.monthly[month] ?? 0) + 1
      } else {
        usage.completedSessions += 1
      }
      const pending = [...state.pending, { type, subject, experimentId, at: date.toISOString() }].slice(-MAX_PENDING)
      save({ v: 1, usage, pending })
      return true
    },
    getLocalUsage: () => load().usage,
    getPending: () => load().pending,
    markSent(count) {
      const state = load()
      save({ ...state, pending: state.pending.slice(count) })
    },
  }
}

export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
