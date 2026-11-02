import { ipKey } from '../rateLimit.js'
import { aggregate, isValidEvent, MAX_BODY, MAX_EVENTS, toImpact, type Counters } from './core.js'

/**
 * Web-standard handler for the analytics API, used by the Vercel Functions in api/analytics/.
 *
 *   GET  /api/analytics/impact   aggregated, anonymous impact stats
 *   POST /api/analytics/events   { events: [{ type, subject, experimentId, at }] }
 *
 * When storage is not configured or unreachable it answers 503, and the web app
 * shows its labelled demo figures (and keeps events queued to send later).
 */

export interface AnalyticsEnv {
  DATABASE_URL?: string
  /** Comma-separated exact origins allowed to call the API cross-origin. Unset: same-origin only. */
  ALLOWED_ORIGIN?: string
  /** Event posts per client address per minute, per instance. Default 30. */
  ANALYTICS_RATE_LIMIT_PER_MINUTE?: string
}

/** Where counters live. `add` must be atomic per call; it applies MAX_EXPERIMENT_KEYS. */
export interface AnalyticsStore {
  add(delta: Counters): Promise<void>
  read(): Promise<Counters>
}

export interface AnalyticsDeps {
  /** `null` when no database is configured. */
  store: AnalyticsStore | null
  now?: () => number
  log?: (line: string) => void
}

/** How long Vercel's CDN may serve the same stats to everyone, so page views do not each hit the database. */
export const IMPACT_CACHE = 'public, s-maxage=60, stale-while-revalidate=300'

/** Fixed one-minute windows per client address, in memory. Only used to refuse floods; never stored. */
export class MinuteCounter {
  private hits = new Map<string, number>()
  private windowStart = 0
  private readonly limit: number
  constructor(limit: number) {
    this.limit = limit
  }
  allow(key: string, now: number): boolean {
    if (now - this.windowStart >= 60_000) {
      this.hits.clear()
      this.windowStart = now
    }
    const n = (this.hits.get(key) ?? 0) + 1
    if (this.hits.size < 100_000 || this.hits.has(key)) this.hits.set(key, n)
    return n <= this.limit
  }
}

let limiter: MinuteCounter | null = null
/** Test hook: forget rate-limit state between tests. */
export function resetAnalyticsLimiter() {
  limiter = null
}

const allowedOrigins = (env: AnalyticsEnv) =>
  new Set(
    (env.ALLOWED_ORIGIN ?? '')
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter((s) => s && s !== '*'),
  )

function json(request: Request, env: AnalyticsEnv, status: number, body?: unknown, extra: Record<string, string> = {}): Response {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
    'referrer-policy': 'no-referrer',
    vary: 'Origin',
    ...extra,
  }
  const origin = request.headers.get('origin')
  if (origin && allowedOrigins(env).has(origin)) {
    headers['access-control-allow-origin'] = origin
    headers['access-control-allow-methods'] = 'GET, POST, OPTIONS'
    headers['access-control-allow-headers'] = 'Content-Type, Accept'
    headers['access-control-max-age'] = '600'
  }
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers })
}

/** The client address as Vercel's edge saw it (Vercel overwrites these headers). Kept in memory only. */
function clientKey(request: Request): string {
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  return ipKey(ip)
}

export async function handleAnalyticsRequest(request: Request, env: AnalyticsEnv, deps: AnalyticsDeps): Promise<Response> {
  const now = deps.now ?? Date.now
  const log = deps.log ?? ((line: string) => console.error(line))
  const path = new URL(request.url).pathname.replace(/\/+$/, '')
  const route = path.endsWith('/impact') ? 'impact' : path.endsWith('/events') ? 'events' : null

  if (!route) return json(request, env, 404, { error: 'not found' })
  if (request.method === 'OPTIONS') return json(request, env, 204)

  if (route === 'impact') {
    if (request.method !== 'GET' && request.method !== 'HEAD') return json(request, env, 405, { error: 'method not allowed' }, { allow: 'GET, HEAD, OPTIONS' })
    if (!deps.store) return json(request, env, 503, { error: 'not_configured' })
    try {
      return json(request, env, 200, toImpact(await deps.store.read()), { 'cache-control': IMPACT_CACHE })
    } catch (err) {
      log(`[analytics] reading stats failed: ${(err as Error).message}`)
      return json(request, env, 503, { error: 'unavailable' })
    }
  }

  if (request.method !== 'POST') return json(request, env, 405, { error: 'method not allowed' }, { allow: 'POST, OPTIONS' })
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return json(request, env, 415, { error: 'expected application/json' })
  limiter ??= new MinuteCounter(Number(env.ANALYTICS_RATE_LIMIT_PER_MINUTE) || 30)
  if (!limiter.allow(clientKey(request), now())) return json(request, env, 429, { error: 'rate limited' }, { 'retry-after': '60' })
  if (Number(request.headers.get('content-length')) > MAX_BODY) return json(request, env, 413, { error: 'payload too large' })

  let text: string
  try {
    text = await request.text()
  } catch {
    return json(request, env, 400, { error: 'unreadable body' })
  }
  if (text.length > MAX_BODY) return json(request, env, 413, { error: 'payload too large' })
  let events: unknown
  try {
    events = (JSON.parse(text) as { events?: unknown } | null)?.events
  } catch {
    return json(request, env, 400, { error: 'invalid JSON' })
  }
  if (!Array.isArray(events) || events.length > MAX_EVENTS) return json(request, env, 400, { error: 'expected events[] (max 100)' })

  const accepted = events.filter(isValidEvent)
  if (accepted.length === 0) return json(request, env, 202, { accepted: 0 })
  // 503 (not 2xx) keeps the events queued in the browser until storage works.
  if (!deps.store) return json(request, env, 503, { error: 'not_configured' })
  try {
    await deps.store.add(aggregate(accepted, now()))
  } catch (err) {
    log(`[analytics] saving events failed: ${(err as Error).message}`)
    return json(request, env, 503, { error: 'unavailable' })
  }
  return json(request, env, 202, { accepted: accepted.length })
}
