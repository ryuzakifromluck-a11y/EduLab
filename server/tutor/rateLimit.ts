/**
 * Per-client rate limiting for the AI tutor, with pluggable storage so the
 * counts survive restarts and are shared between serverless instances.
 *
 * Two fixed windows per client: one per clock minute and one per UTC day.
 * A request is allowed only if both counters are under their limits, and it
 * is counted in both. Rejected requests are not counted.
 *
 * Stores:
 *   - redisStore   Upstash / Vercel KV REST API (production, shared by every instance)
 *   - fileStore    JSON file next to the app (local dev and single-server hosts), see rateLimitFile.ts
 *   - memoryStore  this process only (tests, and the fallback when Redis is unreachable)
 */

export interface RateLimitResult {
  ok: boolean
  /** Messages left today for this client. */
  remaining: number
  /** Seconds until the next request would be allowed (only when !ok). */
  retryAfter?: number
  /** Which limit was hit (only when !ok). */
  limit?: 'minute' | 'day'
}

export interface RateLimitPolicy {
  perMinute: number
  perDay: number
}

export interface WindowKeys {
  minute: string
  day: string
}

export interface TakeResult {
  allowed: boolean
  /** Counter values after the call. */
  minute: number
  day: number
}

/** Storage for the two counters. `take` must check and increment atomically. */
export interface CounterStore {
  readonly kind: string
  take(keys: WindowKeys, policy: RateLimitPolicy, ttlMs: { minute: number; day: number }, now: number): Promise<TakeResult>
}

export const MINUTE = 60_000
export const DAY = 24 * 60 * 60 * 1000

/** The defaults the product asks for: 5 messages per minute and 30 per day for each IP. */
export const DEFAULT_POLICY: RateLimitPolicy = { perMinute: 5, perDay: 30 }

interface Counter {
  count: number
  expiresAt: number
}

/** Counters in a Map. Exported for the file store, which persists the same entries. */
export class MemoryCounters {
  constructor(readonly entries = new Map<string, Counter>()) {}

  take(keys: WindowKeys, policy: RateLimitPolicy, ttlMs: { minute: number; day: number }, now: number): TakeResult {
    const get = (k: string) => {
      const c = this.entries.get(k)
      return c && c.expiresAt > now ? c.count : 0
    }
    const minute = get(keys.minute)
    const day = get(keys.day)
    if (minute >= policy.perMinute || day >= policy.perDay) return { allowed: false, minute, day }
    this.entries.set(keys.minute, { count: minute + 1, expiresAt: now + ttlMs.minute })
    this.entries.set(keys.day, { count: day + 1, expiresAt: now + ttlMs.day })
    if (this.entries.size > 20_000) this.prune(now)
    return { allowed: true, minute: minute + 1, day: day + 1 }
  }

  prune(now: number) {
    for (const [k, c] of this.entries) if (c.expiresAt <= now) this.entries.delete(k)
  }
}

export function memoryStore(): CounterStore {
  const counters = new MemoryCounters()
  return { kind: 'memory', take: async (...args) => counters.take(...args) }
}

/**
 * Checks both limits and increments both counters in one round trip, so two
 * instances can never let the same client past the limit.
 * Returns {allowed (0|1), minuteCount, dayCount}.
 */
export const TAKE_SCRIPT = `
local m = tonumber(redis.call('GET', KEYS[1]) or '0')
local d = tonumber(redis.call('GET', KEYS[2]) or '0')
if m >= tonumber(ARGV[1]) or d >= tonumber(ARGV[2]) then return {0, m, d} end
m = redis.call('INCR', KEYS[1])
if m == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[3]) end
d = redis.call('INCR', KEYS[2])
if d == 1 then redis.call('PEXPIRE', KEYS[2], ARGV[4]) end
return {1, m, d}
`

/**
 * Redis over the Upstash REST API (also what Vercel KV / the Upstash Vercel
 * integration provide). Uses fetch only, so it runs in Node, Vercel Functions
 * and edge runtimes without a Redis client dependency.
 */
export function redisStore(opts: { url: string; token: string; fetch?: typeof fetch; timeoutMs?: number }): CounterStore {
  const url = opts.url.replace(/\/+$/, '')
  return {
    kind: 'redis',
    async take(keys, policy, ttl) {
      const doFetch = opts.fetch ?? fetch
      const res = await doFetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${opts.token}`, 'content-type': 'application/json' },
        body: JSON.stringify(['EVAL', TAKE_SCRIPT, '2', keys.minute, keys.day, policy.perMinute, policy.perDay, ttl.minute, ttl.day].map(String)),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 2_000),
      })
      const data = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null
      if (!res.ok || !data || !Array.isArray(data.result)) throw new Error(`redis responded ${res.status}`)
      const [allowed, minute, day] = data.result.map(Number)
      return { allowed: allowed === 1, minute, day }
    },
  }
}

async function hashKey(client: string, salt: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${client}`))
  return Array.from(new Uint8Array(bytes).slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface RateLimiterOptions extends Partial<RateLimitPolicy> {
  store?: CounterStore
  /** Used when `store` throws (e.g. Redis is down), so the tutor keeps working with per-instance limits. */
  fallback?: CounterStore
  /** Mixed into the hashed client key. IP addresses are never stored in clear. */
  salt?: string
  now?: () => number
}

export class RateLimiter {
  readonly policy: RateLimitPolicy
  readonly store: CounterStore
  private readonly fallback: CounterStore
  private readonly now: () => number
  private readonly salt: string
  private warned = 0

  constructor(opts: RateLimiterOptions = {}) {
    this.policy = { perMinute: opts.perMinute ?? DEFAULT_POLICY.perMinute, perDay: opts.perDay ?? DEFAULT_POLICY.perDay }
    this.store = opts.store ?? memoryStore()
    this.fallback = opts.fallback ?? memoryStore()
    this.now = opts.now ?? Date.now
    this.salt = opts.salt ?? 'edulab-tutor'
  }

  async check(client: string): Promise<RateLimitResult> {
    const t = this.now()
    const minuteIdx = Math.floor(t / MINUTE)
    const dayIdx = Math.floor(t / DAY)
    const id = await hashKey(client, this.salt)
    const keys = { minute: `tutor:rl:${id}:m:${minuteIdx}`, day: `tutor:rl:${id}:d:${dayIdx}` }
    // Keys expire when their window ends (plus a minute of slack for clock skew between instances).
    const ttl = { minute: (minuteIdx + 1) * MINUTE - t + MINUTE, day: (dayIdx + 1) * DAY - t + MINUTE }

    let r: TakeResult
    try {
      r = await this.store.take(keys, this.policy, ttl, t)
    } catch (err) {
      if (t - this.warned > MINUTE) {
        this.warned = t
        console.warn(`[tutor] ${this.store.kind} rate-limit store failed (${err instanceof Error ? err.message : 'unknown'}); using in-memory limits`)
      }
      r = await this.fallback.take(keys, this.policy, ttl, t)
    }

    const remaining = Math.max(0, this.policy.perDay - r.day)
    if (r.allowed) return { ok: true, remaining }
    const secs = (ms: number) => Math.max(1, Math.ceil(ms / 1000))
    if (r.day >= this.policy.perDay) return { ok: false, remaining: 0, limit: 'day', retryAfter: secs((dayIdx + 1) * DAY - t) }
    return { ok: false, remaining, limit: 'minute', retryAfter: secs((minuteIdx + 1) * MINUTE - t) }
  }
}
