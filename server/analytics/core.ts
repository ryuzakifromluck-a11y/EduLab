/**
 * Anonymous usage analytics: validation and aggregation shared by the Vercel
 * Functions (api/analytics/*) and the local reference server
 * (server/analytics-server.mjs).
 *
 * Privacy: events are reduced to counters before anything is stored. What is
 * kept is "how many visits per experiment, per subject and per month" and
 * "how many completed runs". No IP address, user agent, timestamp finer than a
 * month, or any identifier is stored.
 *
 * This file has no imports so plain Node (type stripping) can load it too.
 */

export type EventType = 'visit' | 'complete'

export interface AnalyticsEvent {
  type: EventType
  subject: string
  experimentId: string
  at: string
}

/** Counter deltas, or stored totals, by dimension. */
export interface Counters {
  sessions: number
  completed: number
  experiments: Record<string, number>
  subjects: Record<string, number>
  months: Record<string, number>
}

export interface ImpactPayload {
  totalSessions: number
  completedSessions: number
  countriesReached: null
  averageRating: null
  popularExperiments: { id: string; sessions: number }[]
  subjectDistribution: { subject: string; share: number }[]
  monthlySessions: { month: string; sessions: number }[]
}

export const MAX_BODY = 64 * 1024
export const MAX_EVENTS = 100
/** Distinct experiment ids kept. The catalog has a few dozen; this stops made-up ids from growing storage forever. */
export const MAX_EXPERIMENT_KEYS = 200
export const MONTHS_SHOWN = 12
export const POPULAR_SHOWN = 5

const ID = /^[a-z0-9-]{1,64}$/
export const SUBJECTS: readonly string[] = ['physics', 'chemistry', 'biology']

export const emptyCounters = (): Counters => ({ sessions: 0, completed: 0, experiments: {}, subjects: {}, months: {} })

export function isValidEvent(e: unknown): e is AnalyticsEvent {
  if (!e || typeof e !== 'object') return false
  const v = e as Record<string, unknown>
  return (
    (v.type === 'visit' || v.type === 'complete') &&
    typeof v.subject === 'string' && SUBJECTS.includes(v.subject) &&
    typeof v.experimentId === 'string' && ID.test(v.experimentId) &&
    typeof v.at === 'string' && v.at.length <= 40 && !Number.isNaN(Date.parse(v.at))
  )
}

const bump = (map: Record<string, number>, key: string, by = 1) => {
  map[key] = (map[key] ?? 0) + by
}

/**
 * Folds valid events into counter deltas. Clients queue events while offline,
 * so the month comes from the event, but future timestamps are clamped to now.
 */
export function aggregate(events: AnalyticsEvent[], now = Date.now()): Counters {
  const d = emptyCounters()
  for (const e of events) {
    if (e.type === 'complete') {
      d.completed += 1
      continue
    }
    const month = new Date(Math.min(Date.parse(e.at), now)).toISOString().slice(0, 7)
    d.sessions += 1
    bump(d.experiments, e.experimentId)
    bump(d.subjects, e.subject)
    bump(d.months, month)
  }
  return d
}

/** Adds deltas to totals in place, honouring MAX_EXPERIMENT_KEYS. */
export function addCounters(into: Counters, delta: Counters): Counters {
  into.sessions += delta.sessions
  into.completed += delta.completed
  for (const [id, n] of Object.entries(delta.experiments)) {
    if (id in into.experiments || Object.keys(into.experiments).length < MAX_EXPERIMENT_KEYS) bump(into.experiments, id, n)
  }
  for (const [s, n] of Object.entries(delta.subjects)) bump(into.subjects, s, n)
  for (const [m, n] of Object.entries(delta.months)) bump(into.months, m, n)
  return into
}

/** The public, aggregate-only payload for GET /api/analytics/impact. */
export function toImpact(c: Counters): ImpactPayload {
  const subjectTotal = Object.values(c.subjects).reduce((a, b) => a + b, 0)
  return {
    totalSessions: c.sessions,
    completedSessions: c.completed,
    // Not measured: no location and no ratings are collected.
    countriesReached: null,
    averageRating: null,
    popularExperiments: Object.entries(c.experiments)
      .map(([id, sessions]) => ({ id, sessions }))
      .sort((a, b) => b.sessions - a.sessions || a.id.localeCompare(b.id))
      .slice(0, POPULAR_SHOWN),
    subjectDistribution: subjectTotal
      ? Object.entries(c.subjects).map(([subject, n]) => ({ subject, share: n / subjectTotal }))
      : [],
    monthlySessions: Object.entries(c.months)
      .map(([month, sessions]) => ({ month, sessions }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-MONTHS_SHOWN),
  }
}
