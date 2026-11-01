import { describe, expect, it, vi } from 'vitest'
import { availableExperiments } from '../data/experiments'
import { createApiAnalytics, demoStats, parseImpactPayload } from './analytics'
import { createUsageTracker, MAX_PENDING, STORAGE_KEY, type KeyValueStorage } from './usageTracker'

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const API_STATS = {
  totalSessions: 120,
  completedSessions: 40,
  countriesReached: null,
  averageRating: null,
  popularExperiments: [
    { id: 'titration', sessions: 30 },
    { id: 'pendulum', sessions: 70 },
    { id: 'not-a-real-experiment', sessions: 999 },
  ],
  subjectDistribution: [
    { subject: 'physics', share: 0.75 },
    { subject: 'chemistry', share: 0.25 },
  ],
  monthlySessions: [
    { month: '2026-10', sessions: 80 },
    { month: '2026-09', sessions: 40 },
  ],
}

describe('usage tracker', () => {
  it('counts visits per experiment and month and queues events', () => {
    let t = Date.parse('2026-10-31T10:00:00Z')
    const tracker = createUsageTracker(memoryStorage(), () => new Date(t))
    tracker.record('visit', 'physics', 'pendulum')
    t += 60_000
    tracker.record('visit', 'chemistry', 'titration')
    t += 60_000
    tracker.record('visit', 'physics', 'pendulum')
    const usage = tracker.getLocalUsage()
    expect(usage.totalSessions).toBe(3)
    expect(usage.visits).toEqual({ pendulum: 2, titration: 1 })
    expect(usage.monthly).toEqual({ '2026-10': 3 })
    expect(tracker.getPending().map((e) => e.experimentId)).toEqual(['pendulum', 'titration', 'pendulum'])
  })

  it('ignores the duplicate mount React StrictMode causes', () => {
    const t = Date.parse('2026-10-31T10:00:00Z')
    const tracker = createUsageTracker(memoryStorage(), () => new Date(t))
    expect(tracker.record('visit', 'physics', 'pendulum')).toBe(true)
    expect(tracker.record('visit', 'physics', 'pendulum')).toBe(false)
    expect(tracker.getLocalUsage().totalSessions).toBe(1)
  })

  it('persists across instances and survives corrupt storage', () => {
    const storage = memoryStorage()
    createUsageTracker(storage).record('visit', 'physics', 'ohms-law')
    expect(createUsageTracker(storage).getLocalUsage().visits).toEqual({ 'ohms-law': 1 })

    storage.data.set(STORAGE_KEY, '{not json')
    const fresh = createUsageTracker(storage)
    expect(fresh.getLocalUsage().totalSessions).toBe(0)
    fresh.record('visit', 'physics', 'pendulum')
    expect(fresh.getLocalUsage().totalSessions).toBe(1)
  })

  it('still counts without storage and caps the pending queue', () => {
    let t = 0
    const tracker = createUsageTracker(null, () => new Date((t += 10_000)))
    for (let i = 0; i < MAX_PENDING + 20; i++) tracker.record('visit', 'physics', 'pendulum')
    expect(tracker.getLocalUsage().totalSessions).toBe(MAX_PENDING + 20)
    expect(tracker.getPending()).toHaveLength(MAX_PENDING)
    tracker.markSent(MAX_PENDING - 1)
    expect(tracker.getPending()).toHaveLength(1)
  })
})

describe('parseImpactPayload', () => {
  it('keeps known experiments, sorts and takes catalog counts locally', () => {
    const stats = parseImpactPayload({ ...API_STATS, totalExperiments: 999 })!
    expect(stats.isDemo).toBe(false)
    expect(stats.totalExperiments).toBe(availableExperiments().length)
    expect(stats.countriesReached).toBeNull()
    expect(stats.popularExperiments).toEqual([
      { id: 'pendulum', sessions: 70 },
      { id: 'titration', sessions: 30 },
    ])
    expect(stats.monthlySessions.map((m) => m.month)).toEqual(['2026-09', '2026-10'])
  })

  it('rejects payloads that are not stats', () => {
    expect(parseImpactPayload(null)).toBeNull()
    expect(parseImpactPayload('<!doctype html>')).toBeNull()
    expect(parseImpactPayload({ totalSessions: -1 })).toBeNull()
    expect(parseImpactPayload({ totalSessions: 'many' })).toBeNull()
  })
})

describe('api analytics provider', () => {
  const setup = (fetchImpl: typeof fetch) => {
    const tracker = createUsageTracker(memoryStorage(), () => new Date(Date.now() + Math.random() * 1e9))
    return { tracker, provider: createApiAnalytics({ baseUrl: '/api/analytics', tracker, fetchImpl }) }
  }

  it('returns real stats from the backend', async () => {
    const fetchImpl = vi.fn(async () => json(API_STATS))
    const { provider } = setup(fetchImpl as unknown as typeof fetch)
    const stats = await provider.getImpactStats()
    expect(stats.isDemo).toBe(false)
    expect(stats.totalSessions).toBe(120)
    expect(fetchImpl).toHaveBeenCalledWith('/api/analytics/impact', expect.anything())
  })

  it('falls back to demo data on network errors, 503s and HTML responses', async () => {
    const failures: (() => Promise<Response>)[] = [
      async () => {
        throw new TypeError('Failed to fetch')
      },
      async () => json({ error: 'unavailable' }, 503),
      async () => new Response('<!doctype html><html></html>', { headers: { 'Content-Type': 'text/html' } }),
      async () => json({ hello: 'world' }),
    ]
    for (const fail of failures) {
      const { provider } = setup(fail as unknown as typeof fetch)
      const stats = await provider.getImpactStats()
      expect(stats).toEqual(demoStats())
      expect(stats.isDemo).toBe(true)
    }
  })

  it('reports visits to the API and keeps them queued while offline', async () => {
    let online = false
    const posted: unknown[] = []
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      if (!online) throw new TypeError('Failed to fetch')
      if (url.endsWith('/events')) {
        posted.push(...JSON.parse(String(init?.body)).events)
        return json({ accepted: 1 }, 202)
      }
      return json(API_STATS)
    })
    const { provider, tracker } = setup(fetchImpl as unknown as typeof fetch)

    provider.trackExperimentVisit!('physics', 'pendulum')
    provider.trackExperimentVisit!('chemistry', 'titration')
    await provider.getImpactStats()
    expect(tracker.getPending()).toHaveLength(2)
    expect(tracker.getLocalUsage().totalSessions).toBe(2)

    online = true
    const stats = await provider.getImpactStats()
    expect(stats.isDemo).toBe(false)
    expect(posted).toMatchObject([
      { type: 'visit', subject: 'physics', experimentId: 'pendulum' },
      { type: 'visit', subject: 'chemistry', experimentId: 'titration' },
    ])
    expect(tracker.getPending()).toHaveLength(0)
  })

  it('never throws from tracking', () => {
    const { provider } = setup((() => {
      throw new Error('boom')
    }) as unknown as typeof fetch)
    expect(() => provider.trackExperimentVisit!('physics', 'pendulum')).not.toThrow()
  })
})
