/**
 * POST /api/errors: receives client error reports (see src/lib/monitoring.ts).
 *
 * Every accepted report is written as one JSON line to stderr, so it shows up in
 * Vercel → Project → Logs (filter on `"type":"client_error"`). If
 * MONITORING_WEBHOOK_URL is set, the first occurrence of each fingerprint per
 * instance and hour is also posted to that Slack or Discord incoming webhook.
 *
 * The endpoint is public, so the body is size-capped, validated field by field
 * and rate limited per IP; nothing from it is echoed back to the caller.
 */

export interface MonitoringEnv {
  /** Slack or Discord incoming-webhook URL for alerts. Optional. */
  MONITORING_WEBHOOK_URL?: string
  /** Max reports per IP per minute (default 30). */
  MONITORING_RATE_LIMIT?: string
  VERCEL_ENV?: string
}

export interface StoredReport {
  type: 'client_error'
  at: string
  name: string
  message: string
  stack?: string
  source: string
  path: string
  release: string
  language?: string
  userAgent?: string
  uptime?: number
  fingerprint: string
  extra?: Record<string, string | number | boolean>
}

const MAX_BODY = 8 * 1024
const SOURCES = ['error', 'unhandledrejection', 'react', 'scene', 'manual']

const str = (v: unknown, max: number) => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined)

/** Validates an untrusted report. Returns null when required fields are missing or malformed. */
export function parseReport(body: unknown, now = new Date()): StoredReport | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  const message = str(b.message, 500)
  const fingerprint = str(b.fingerprint, 16)
  const source = str(b.source, 24)
  if (!message || !fingerprint || !/^[0-9a-f]{1,16}$/.test(fingerprint) || !source || !SOURCES.includes(source)) return null
  const path = str(b.path, 200) ?? '/'
  const extra: Record<string, string | number | boolean> = {}
  if (b.extra && typeof b.extra === 'object' && !Array.isArray(b.extra)) {
    for (const [k, v] of Object.entries(b.extra).slice(0, 10)) {
      if (typeof v === 'number' && Number.isFinite(v)) extra[k.slice(0, 40)] = v
      else if (typeof v === 'boolean') extra[k.slice(0, 40)] = v
      else if (typeof v === 'string') extra[k.slice(0, 40)] = v.slice(0, 200)
    }
  }
  return {
    type: 'client_error',
    at: now.toISOString(),
    name: str(b.name, 100) ?? 'Error',
    message,
    stack: str(b.stack, 4000),
    source,
    path: path.startsWith('/') ? path.split(/[?#]/)[0] : '/',
    release: str(b.release, 40) ?? 'unknown',
    language: str(b.language, 10),
    userAgent: str(b.userAgent, 300),
    uptime: typeof b.uptime === 'number' && Number.isFinite(b.uptime) ? Math.max(0, Math.round(b.uptime)) : undefined,
    fingerprint,
    extra: Object.keys(extra).length ? extra : undefined,
  }
}

/** Fixed-window counter per key; good enough to stop a single client flooding the logs. */
export class WindowCounter {
  private hits = new Map<string, { start: number; count: number }>()
  private limit: number
  private windowMs: number
  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.windowMs = windowMs
  }
  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key)
    if (!entry || now - entry.start >= this.windowMs) {
      if (this.hits.size > 5000) this.hits.clear()
      this.hits.set(key, { start: now, count: 1 })
      return true
    }
    entry.count++
    return entry.count <= this.limit
  }
}

/** Plain-text alert line for Slack (`text`) and Discord (`content`). */
export function alertText(r: StoredReport, env: MonitoringEnv): string {
  const where = env.VERCEL_ENV ? ` [${env.VERCEL_ENV}]` : ''
  const frame = r.stack?.split('\n').find((l) => /:\d+:\d+/.test(l))?.trim()
  return [`EduLab client error${where}: ${r.name}: ${r.message}`, `page ${r.path} · release ${r.release} · ${r.source} · #${r.fingerprint}`, frame]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1900)
}

export interface MonitoringDeps {
  fetch?: typeof fetch
  log?: (line: string) => void
  now?: () => Date
}

let ipCounter: WindowCounter | null = null
let alerted = new WindowCounter(1, 60 * 60_000)

const empty = (status: number) => new Response(null, { status, headers: { 'cache-control': 'no-store' } })

export async function handleErrorReport(request: Request, env: MonitoringEnv, deps: MonitoringDeps = {}): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'POST' } })
  const log = deps.log ?? ((line: string) => console.error(line))

  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'local').trim()
  ipCounter ??= new WindowCounter(Number(env.MONITORING_RATE_LIMIT) || 30, 60_000)
  if (!ipCounter.allow(ip)) return empty(429)

  const declared = Number(request.headers.get('content-length'))
  if (declared > MAX_BODY) return empty(413)
  let text: string
  try {
    text = await request.text()
  } catch {
    return empty(400)
  }
  if (text.length > MAX_BODY) return empty(413)

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return empty(400)
  }
  const report = parseReport(body, deps.now?.() ?? new Date())
  if (!report) return empty(400)

  log(JSON.stringify(report))

  const hook = env.MONITORING_WEBHOOK_URL
  if (hook && alerted.allow(report.fingerprint)) {
    const content = alertText(report, env)
    try {
      await (deps.fetch ?? fetch)(hook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: content, content }),
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      log(JSON.stringify({ type: 'monitoring_webhook_failed', fingerprint: report.fingerprint }))
    }
  }
  return empty(204)
}

/** Test hook: resets per-instance counters. */
export function resetMonitoringState() {
  ipCounter = null
  alerted = new WindowCounter(1, 60 * 60_000)
}
