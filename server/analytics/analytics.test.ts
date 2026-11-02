import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import pg from 'pg'
import { createTestDb, TEST_DATABASE_URL, type TestDb } from '../db/testDb.ts'
import { addCounters, aggregate, emptyCounters, isValidEvent, MAX_EXPERIMENT_KEYS, toImpact, type AnalyticsEvent, type Counters } from './core.ts'
import { handleAnalyticsRequest, IMPACT_CACHE, resetAnalyticsLimiter, type AnalyticsStore } from './handler.ts'
import { deltaRows, postgresAnalyticsStore } from './postgresStore.ts'

const NOW = Date.parse('2026-11-02T12:00:00Z')
const visit = (experimentId: string, subject = 'physics', at = '2026-10-15T10:00:00Z'): AnalyticsEvent => ({ type: 'visit', subject, experimentId, at })
const complete = (experimentId: string): AnalyticsEvent => ({ type: 'complete', subject: 'physics', experimentId, at: '2026-10-15T10:00:00Z' })

function memoryStore(): AnalyticsStore & { totals: Counters } {
  const totals = emptyCounters()
  return {
    totals,
    async add(delta) {
      addCounters(totals, delta)
    },
    async read() {
      return structuredClone(totals)
    },
  }
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://edulab.test/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.7', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
const get = (headers: Record<string, string> = {}) => new Request('https://edulab.test/api/analytics/impact', { headers })

describe('analytics core', () => {
  it('accepts only well-formed events', () => {
    expect(isValidEvent(visit('pendulum'))).toBe(true)
    expect(isValidEvent(complete('pendulum'))).toBe(true)
    expect(isValidEvent({ ...visit('pendulum'), type: 'click' })).toBe(false)
    expect(isValidEvent({ ...visit('pendulum'), subject: 'history' })).toBe(false)
    expect(isValidEvent(visit('Pendulum!'))).toBe(false)
    expect(isValidEvent({ ...visit('pendulum'), at: 'yesterday' })).toBe(false)
    expect(isValidEvent(null)).toBe(false)
  })

  it('reduces events to counters by experiment, subject and month only', () => {
    const d = aggregate([visit('pendulum'), visit('pendulum'), visit('titration', 'chemistry', '2026-09-01T00:00:00Z'), complete('pendulum')], NOW)
    expect(d).toEqual({
      sessions: 3,
      completed: 1,
      experiments: { pendulum: 2, titration: 1 },
      subjects: { physics: 2, chemistry: 1 },
      months: { '2026-10': 2, '2026-09': 1 },
    })
  })

  it('clamps future timestamps to the current month', () => {
    expect(aggregate([visit('pendulum', 'physics', '2030-01-01T00:00:00Z')], NOW).months).toEqual({ '2026-11': 1 })
  })

  it('caps the number of distinct experiment ids', () => {
    const totals = emptyCounters()
    for (let i = 0; i < MAX_EXPERIMENT_KEYS; i++) totals.experiments[`exp-${i}`] = 1
    addCounters(totals, aggregate([visit('brand-new'), visit('exp-0')], NOW))
    expect(totals.experiments['brand-new']).toBeUndefined()
    expect(totals.experiments['exp-0']).toBe(2)
    expect(totals.sessions).toBe(2)
  })

  it('builds the impact payload the web app parses', () => {
    const c = aggregate([visit('a'), visit('b'), visit('b'), visit('c', 'chemistry')], NOW)
    const impact = toImpact(c)
    expect(impact.totalSessions).toBe(4)
    expect(impact.popularExperiments[0]).toEqual({ id: 'b', sessions: 2 })
    expect(impact.subjectDistribution).toEqual([
      { subject: 'physics', share: 0.75 },
      { subject: 'chemistry', share: 0.25 },
    ])
    expect(impact.countriesReached).toBeNull()
    expect(impact.averageRating).toBeNull()
  })
})

describe('analytics handler', () => {
  beforeEach(() => resetAnalyticsLimiter())

  it('stores posted events and serves the aggregate', async () => {
    const store = memoryStore()
    const res = await handleAnalyticsRequest(post({ events: [visit('pendulum'), complete('pendulum'), { bogus: true }] }), {}, { store, now: () => NOW })
    expect(res.status).toBe(202)
    expect(await res.json()).toEqual({ accepted: 2 })

    const stats = await handleAnalyticsRequest(get(), {}, { store })
    expect(stats.status).toBe(200)
    expect(stats.headers.get('cache-control')).toBe(IMPACT_CACHE)
    expect(await stats.json()).toMatchObject({ totalSessions: 1, completedSessions: 1, popularExperiments: [{ id: 'pendulum', sessions: 1 }] })
  })

  it('never stores the client address or anything but counters', async () => {
    const store = memoryStore()
    await handleAnalyticsRequest(post({ events: [{ ...visit('pendulum'), name: 'Ali', email: 'ali@example.com' }] }), {}, { store, now: () => NOW })
    const dump = JSON.stringify(store.totals)
    expect(dump).not.toContain('203.0.113.7')
    expect(dump).not.toContain('Ali')
    expect(dump).not.toContain('2026-10-15')
  })

  it('answers 503 without a database, so the site shows demo data and keeps events queued', async () => {
    const stats = await handleAnalyticsRequest(get(), {}, { store: null })
    expect(stats.status).toBe(503)
    expect(await stats.json()).toEqual({ error: 'not_configured' })
    expect((await handleAnalyticsRequest(post({ events: [visit('pendulum')] }), {}, { store: null })).status).toBe(503)
  })

  it('answers 503 when the database fails, and logs without details from the request', async () => {
    const lines: string[] = []
    const broken: AnalyticsStore = {
      add: () => Promise.reject(new Error('connection refused')),
      read: () => Promise.reject(new Error('connection refused')),
    }
    const log = (l: string) => lines.push(l)
    expect((await handleAnalyticsRequest(get(), {}, { store: broken, log })).status).toBe(503)
    expect((await handleAnalyticsRequest(post({ events: [visit('pendulum')] }), {}, { store: broken, log })).status).toBe(503)
    expect(lines).toHaveLength(2)
    expect(lines.join()).not.toContain('203.0.113.7')
  })

  it('rejects malformed requests', async () => {
    const store = memoryStore()
    const call = (r: Request) => handleAnalyticsRequest(r, {}, { store }).then((x) => x.status)
    expect(await call(post('not json'))).toBe(400)
    expect(await call(post({ events: 'x' }))).toBe(400)
    expect(await call(post({ events: Array.from({ length: 101 }, () => visit('pendulum')) }))).toBe(400)
    expect(await call(post({ events: [] }, { 'content-type': 'text/plain' }))).toBe(415)
    expect(await call(post('x'.repeat(70 * 1024)))).toBe(413)
    expect(await call(new Request('https://edulab.test/api/analytics/impact', { method: 'POST' }))).toBe(405)
    expect(await call(new Request('https://edulab.test/api/analytics/events'))).toBe(405)
    expect(await call(new Request('https://edulab.test/api/analytics/other'))).toBe(404)
    expect(store.totals.sessions).toBe(0)
  })

  it('rate limits event posts per client address', async () => {
    const store = memoryStore()
    const env = { ANALYTICS_RATE_LIMIT_PER_MINUTE: '2' }
    const send = (ip: string) => handleAnalyticsRequest(post({ events: [] }, { 'x-real-ip': ip }), env, { store, now: () => NOW }).then((r) => r.status)
    expect(await send('198.51.100.1')).toBe(202)
    expect(await send('198.51.100.1')).toBe(202)
    expect(await send('198.51.100.1')).toBe(429)
    expect(await send('198.51.100.2')).toBe(202)
  })

  it('allows only listed origins cross-origin', async () => {
    const env = { ALLOWED_ORIGIN: 'https://edulab.uz, *' }
    const ok = await handleAnalyticsRequest(get({ origin: 'https://edulab.uz' }), env, { store: memoryStore() })
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://edulab.uz')
    const other = await handleAnalyticsRequest(get({ origin: 'https://evil.example' }), env, { store: memoryStore() })
    expect(other.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('postgres analytics store rows', () => {
  it('flattens deltas into sorted rows', () => {
    expect(deltaRows(aggregate([visit('pendulum'), complete('pendulum')], NOW))).toEqual([
      ['experiment', 'pendulum', 1],
      ['month', '2026-10', 1],
      ['subject', 'physics', 1],
      ['total', 'completed', 1],
      ['total', 'sessions', 1],
    ])
  })
})

describe.skipIf(!TEST_DATABASE_URL)('postgres analytics store', () => {
  let db: TestDb
  let pool: pg.Pool
  let store: AnalyticsStore
  beforeAll(async () => {
    db = await createTestDb()
    pool = db.store.pool
    store = postgresAnalyticsStore(pool)
  })
  afterAll(() => db?.drop())

  it('adds counters and reads them back, including concurrent writes', async () => {
    await Promise.all(Array.from({ length: 20 }, () => store.add(aggregate([visit('pendulum'), visit('titration', 'chemistry'), complete('pendulum')], NOW))))
    const c = await store.read()
    expect(c).toEqual({
      sessions: 40,
      completed: 20,
      experiments: { pendulum: 20, titration: 20 },
      subjects: { physics: 20, chemistry: 20 },
      months: { '2026-10': 40 },
    })
  })

  it('stops adding new experiment ids at the cap', async () => {
    await pool.query(
      `INSERT INTO analytics_counters (dimension, key, count) SELECT 'experiment', 'filler-' || g, 1 FROM generate_series(1, $1::int) g`,
      [MAX_EXPERIMENT_KEYS],
    )
    await store.add(aggregate([visit('one-too-many'), visit('pendulum')], NOW))
    const c = await store.read()
    expect(c.experiments['one-too-many']).toBeUndefined()
    expect(c.experiments.pendulum).toBe(21)
  })

  it('serves stats through the handler', async () => {
    resetAnalyticsLimiter()
    const res = await handleAnalyticsRequest(get(), {}, { store })
    expect(res.status).toBe(200)
    expect((await res.json()).totalSessions).toBe(42)
  })
})
