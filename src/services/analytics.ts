import { EXPERIMENTS, SUBJECTS, availableExperiments, type Subject } from '../data/experiments'
import { browserStorage, createUsageTracker, type UsageSubject, type UsageTracker } from './usageTracker'

/**
 * Analytics boundary. `apiAnalytics` reads aggregated, anonymous impact stats
 * from the backend (`GET <base>/impact`) and reports experiment visits to it
 * (`POST <base>/events`). When the API cannot be reached it falls back to the
 * illustrative demo figures, flagged `isDemo`, so the UI can label them.
 * The experiment counts always come from the catalog.
 */
export interface ImpactStats {
  isDemo: boolean
  /** Counted from the catalog, always real. */
  totalExperiments: number
  plannedExperiments: number
  totalSessions: number
  completedSessions: number
  /** `null` when the backend does not measure it. */
  countriesReached: number | null
  /** `null` when the backend does not measure it. */
  averageRating: number | null
  popularExperiments: { id: string; sessions: number }[]
  subjectDistribution: { subject: Subject; share: number }[]
  monthlySessions: { month: string; sessions: number }[]
}

export interface AnalyticsProvider {
  getImpactStats(): Promise<ImpactStats>
  /** Counts an experiment page visit. Never throws. */
  trackExperimentVisit?(subject: UsageSubject, experimentId: string): void
  /** Counts a finished experiment run. Never throws. */
  trackExperimentCompleted?(subject: UsageSubject, experimentId: string): void
  /** Sends events queued while offline. Never throws. */
  flush?(): Promise<void>
}

const catalogCounts = () => ({
  totalExperiments: availableExperiments().length,
  plannedExperiments: EXPERIMENTS.filter((e) => e.status === 'planned').length,
})

export function demoStats(): ImpactStats {
  return {
    isDemo: true,
    ...catalogCounts(),
    totalSessions: 48_250,
    completedSessions: 31_870,
    countriesReached: 64,
    averageRating: 4.7,
    popularExperiments: [
      { id: 'pendulum', sessions: 19_400 },
      { id: 'titration', sessions: 15_100 },
      { id: 'ohms-law', sessions: 13_750 },
    ],
    subjectDistribution: [
      { subject: 'physics', share: 0.69 },
      { subject: 'chemistry', share: 0.31 },
    ],
    monthlySessions: [
      { month: '2026-05', sessions: 3_900 },
      { month: '2026-06', sessions: 5_200 },
      { month: '2026-07', sessions: 6_100 },
      { month: '2026-08', sessions: 7_800 },
      { month: '2026-09', sessions: 11_350 },
      { month: '2026-10', sessions: 13_900 },
    ],
  }
}

export const demoAnalytics: AnalyticsProvider = {
  async getImpactStats() {
    return demoStats()
  },
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
const optionalCount = (v: unknown) => (isCount(v) ? v : null)
const KNOWN_IDS = new Set(EXPERIMENTS.map((e) => e.id))

/**
 * Validates the backend payload. Returns `null` for anything that is not a
 * well-formed stats object, e.g. an SPA fallback serving index.html for /api.
 */
export function parseImpactPayload(data: unknown): ImpactStats | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (!isCount(d.totalSessions)) return null
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]).filter((x) => x && typeof x === 'object') : [])

  return {
    isDemo: false,
    ...catalogCounts(),
    totalSessions: d.totalSessions,
    completedSessions: isCount(d.completedSessions) ? d.completedSessions : 0,
    countriesReached: optionalCount(d.countriesReached),
    averageRating: optionalCount(d.averageRating),
    popularExperiments: list(d.popularExperiments)
      .filter((p) => typeof p.id === 'string' && KNOWN_IDS.has(p.id) && isCount(p.sessions))
      .map((p) => ({ id: p.id as string, sessions: p.sessions as number }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5),
    subjectDistribution: list(d.subjectDistribution)
      .filter((s) => (SUBJECTS as readonly unknown[]).includes(s.subject) && isCount(s.share))
      .map((s) => ({ subject: s.subject as Subject, share: s.share as number })),
    monthlySessions: list(d.monthlySessions)
      .filter((m) => typeof m.month === 'string' && /^\d{4}-\d{2}$/.test(m.month) && isCount(m.sessions))
      .map((m) => ({ month: m.month as string, sessions: m.sessions as number }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  }
}

export interface ApiAnalyticsOptions {
  /** Base URL of the analytics API, without a trailing slash, e.g. `/api/analytics`. */
  baseUrl: string
  tracker: UsageTracker
  fetchImpl?: typeof fetch
  timeoutMs?: number
  /** How long a successful response is reused, so Home and Impact share one request. */
  cacheMs?: number
  now?: () => number
}

/** Events per request; the rest go in the next flush. */
const BATCH_SIZE = 100

export function createApiAnalytics(options: ApiAnalyticsOptions): AnalyticsProvider {
  const { baseUrl, tracker, timeoutMs = 5000, cacheMs = 60_000, now = Date.now } = options
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args))
  let cache: { stats: ImpactStats; at: number } | null = null
  let flushing: Promise<void> | null = null

  const request = async (path: string, init?: RequestInit) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetchImpl(`${baseUrl}${path}`, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  /** Sends queued events; failures keep them queued for the next attempt. */
  const flush = () => {
    if (flushing) return flushing
    flushing = (async () => {
      try {
        let pending = tracker.getPending()
        while (pending.length > 0) {
          const batch = pending.slice(0, BATCH_SIZE)
          const res = await request('/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: batch }),
            keepalive: true,
          })
          if (!res.ok) return
          tracker.markSent(batch.length)
          cache = null
          pending = tracker.getPending()
        }
      } catch {
        // Offline, CORS or timeout: try again on the next visit.
      } finally {
        flushing = null
      }
    })()
    return flushing
  }

  const track = (type: 'visit' | 'complete', subject: UsageSubject, experimentId: string) => {
    try {
      if (tracker.record(type, subject, experimentId)) void flush()
    } catch {
      // Analytics must never break an experiment page.
    }
  }

  return {
    flush,
    async getImpactStats() {
      if (cache && now() - cache.at < cacheMs) return cache.stats
      await flush()
      try {
        const res = await request('/impact', { headers: { Accept: 'application/json' } })
        const type = res.headers.get('content-type') ?? ''
        if (!res.ok || !type.includes('json')) return demoStats()
        const stats = parseImpactPayload(await res.json())
        if (!stats) return demoStats()
        cache = { stats, at: now() }
        return stats
      } catch {
        return demoStats()
      }
    },
    trackExperimentVisit: (subject, experimentId) => track('visit', subject, experimentId),
    trackExperimentCompleted: (subject, experimentId) => track('complete', subject, experimentId),
  }
}

/** Set `VITE_ANALYTICS_URL` to point at another API, or to `off` to show demo data only. */
const configuredUrl = (import.meta.env.VITE_ANALYTICS_URL as string | undefined)?.trim()
const baseUrl = (configuredUrl || '/api/analytics').replace(/\/+$/, '')

export const usageTracker = createUsageTracker(browserStorage())

export const analytics: AnalyticsProvider =
  configuredUrl === 'off'
    ? {
        ...demoAnalytics,
        trackExperimentVisit: (s, id) => void usageTracker.record('visit', s, id),
        trackExperimentCompleted: (s, id) => void usageTracker.record('complete', s, id),
      }
    : createApiAnalytics({ baseUrl, tracker: usageTracker })
