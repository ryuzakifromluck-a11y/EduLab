export interface RateLimitResult {
  ok: boolean
  remaining: number
  /** Seconds until the next request would be allowed (only when !ok). */
  retryAfter?: number
}

export interface RateLimitOptions {
  /** Requests allowed per `windowMs`. */
  burst: number
  windowMs: number
  /** Requests allowed per rolling day. */
  perDay: number
  /** Most keys kept in memory; the oldest are dropped first. Default 50 000. */
  maxKeys?: number
}

interface Bucket {
  burst: number[]
  dayStart: number
  dayCount: number
}

const DAY = 24 * 60 * 60 * 1000

/**
 * In-memory limiter keyed by client (IP, or IP + account). It allows `burst`
 * requests per `windowMs` and `perDay` requests per rolling day. Memory is per
 * server instance and bounded by `maxKeys`, so on serverless hosts this is a
 * best-effort guard; the daily spend cap on the LLM account is the hard limit.
 */
export class RateLimiter {
  private buckets = new Map<string, Bucket>()
  private readonly opts: Required<RateLimitOptions>
  private readonly now: () => number

  constructor(opts: RateLimitOptions, now: () => number = Date.now) {
    this.opts = { maxKeys: 50_000, ...opts }
    this.now = now
  }

  check(key: string): RateLimitResult {
    const t = this.now()
    const { burst, windowMs, perDay } = this.opts
    let b = this.buckets.get(key)
    if (!b || t - b.dayStart >= DAY) {
      b = { burst: [], dayStart: t, dayCount: 0 }
      this.buckets.delete(key)
      this.buckets.set(key, b)
      if (this.buckets.size > this.opts.maxKeys) this.prune(t)
    }
    b.burst = b.burst.filter((ts) => t - ts < windowMs)

    if (b.dayCount >= perDay) {
      return { ok: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((b.dayStart + DAY - t) / 1000)) }
    }
    if (b.burst.length >= burst) {
      return { ok: false, remaining: perDay - b.dayCount, retryAfter: Math.max(1, Math.ceil((b.burst[0] + windowMs - t) / 1000)) }
    }
    b.burst.push(t)
    b.dayCount++
    return { ok: true, remaining: perDay - b.dayCount }
  }

  /** Forget a key, e.g. after a successful sign-in. */
  reset(key: string) {
    this.buckets.delete(key)
  }

  get size() {
    return this.buckets.size
  }

  private prune(t: number) {
    for (const [k, b] of this.buckets) if (t - b.dayStart >= DAY) this.buckets.delete(k)
    // Still over the cap (e.g. a flood of distinct addresses): drop the oldest keys.
    // Map iteration follows insertion order, and new buckets are always re-inserted.
    const excess = this.buckets.size - this.opts.maxKeys
    if (excess > 0) {
      let n = 0
      for (const k of this.buckets.keys()) {
        if (n++ >= excess) break
        this.buckets.delete(k)
      }
    }
  }
}

/**
 * Groups IPv6 clients by their /64 network, which is what one household or
 * school usually gets; otherwise a single client could rotate addresses
 * inside its prefix to get a fresh limit for every request.
 */
export function ipKey(ip: string): string {
  const addr = ip.trim().replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, '')
  if (!addr.includes(':')) return addr || 'unknown'
  const [head, tail = ''] = addr.toLowerCase().split('::')
  const h = head ? head.split(':') : []
  const tl = tail ? tail.split(':') : []
  const full = addr.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - tl.length)).fill('0'), ...tl] : h
  return `${full.slice(0, 4).map((p) => p.replace(/^0+(?=.)/, '')).join(':')}::/64`
}

/**
 * The client address as the edge proxy saw it. Forwarding headers are set by
 * the client unless a proxy overwrites them, so they are only used when
 * `trustProxy` is on, and then only the right-most hop (added by our proxy).
 */
export function clientIp(headers: { get(name: string): string | null }, socketAddress: string | undefined, trustProxy: boolean): string {
  if (trustProxy) {
    const real = headers.get('x-real-ip')?.trim()
    if (real) return real
    const hops = headers.get('x-forwarded-for')?.split(',').map((s) => s.trim()).filter(Boolean)
    if (hops?.length) return hops[hops.length - 1]
  }
  return socketAddress || 'unknown'
}
