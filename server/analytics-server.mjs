/**
 * Local analytics backend for EduLab (`npm run api`). Zero dependencies (Node 22.18+).
 * Production on Vercel uses the api/analytics/* Functions with Postgres instead.
 *
 *   GET  /api/analytics/impact   aggregated, anonymous impact stats
 *   POST /api/analytics/events   { events: [{ type, subject, experimentId, at }] }
 *
 * Only aggregate counters are stored (per experiment, subject and month), in a
 * JSON file. No IP addresses, user agents or identifiers are kept.
 *
 *   ANALYTICS_PORT=8788 ANALYTICS_DATA=./analytics-data.json ALLOWED_ORIGIN=https://edulab.example node server/analytics-server.mjs
 *
 * ALLOWED_ORIGIN is a comma-separated list of exact origins that may call this API from
 * another origin. Unset means same-origin only (the Vite dev server proxies /api, so
 * development needs nothing). TRUST_PROXY=1 reads the client address for rate limiting
 * from X-Real-IP / the right-most X-Forwarded-For hop set by your own proxy.
 */
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
// Same validation and aggregation as the Vercel Functions (api/analytics/*); only the storage differs.
import { addCounters, aggregate, emptyCounters, isValidEvent, MAX_BODY, MAX_EVENTS, toImpact } from './analytics/core.ts'

// 8788 by default so it can run next to the accounts API (8787); `npm run api` starts both.
const PORT = Number(process.env.ANALYTICS_PORT ?? 8788)
const DATA_FILE = process.env.ANALYTICS_DATA ?? './analytics-data.json'
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter((s) => s && s !== '*'),
)
if ((process.env.ALLOWED_ORIGIN ?? '').split(',').some((s) => s.trim() === '*')) {
  console.warn('[analytics] ALLOWED_ORIGIN="*" is ignored; list exact origins instead.')
}
const TRUST_PROXY = process.env.TRUST_PROXY === '1'
// Event posts per client address per minute. A page sends one batch every few seconds at most.
const POSTS_PER_MINUTE = Number(process.env.ANALYTICS_RATE_LIMIT_PER_MINUTE) || 30

let store = emptyCounters()
try {
  store = { ...emptyCounters(), ...JSON.parse(readFileSync(DATA_FILE, 'utf8')) }
} catch {
  // First run: start from zero.
}

let saveTimer = null
const scheduleSave = () => {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    const tmp = `${DATA_FILE}.tmp`
    writeFileSync(tmp, JSON.stringify(store))
    renameSync(tmp, DATA_FILE)
  }, 1000)
}

/** Fixed one-minute windows per client address; the map is cleared every minute so it stays small. */
const hits = new Map()
setInterval(() => hits.clear(), 60_000).unref()
function clientAddress(req) {
  if (TRUST_PROXY) {
    const real = req.headers['x-real-ip']
    if (typeof real === 'string' && real.trim()) return real.trim()
    const hops = String(req.headers['x-forwarded-for'] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]
  }
  return req.socket.remoteAddress ?? 'unknown'
}
function overLimit(req) {
  const key = clientAddress(req)
  const n = (hits.get(key) ?? 0) + 1
  if (hits.size < 100_000 || hits.has(key)) hits.set(key, n)
  return n > POSTS_PER_MINUTE
}

function corsHeaders(req) {
  const origin = req.headers.origin
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return { Vary: 'Origin' }
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

function send(req, res, status, body, extra = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    ...corsHeaders(req),
    ...extra,
  })
  res.end(body === undefined ? undefined : JSON.stringify(body))
}

const server = createServer((req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/+$/, '')
  if (req.method === 'OPTIONS') return send(req, res, 204)
  if (req.method === 'GET' && path === '/api/analytics/impact') return send(req, res, 200, toImpact(store))
  if (req.method === 'POST' && path === '/api/analytics/events') {
    if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) return send(req, res, 415, { error: 'expected application/json' })
    if (overLimit(req)) return send(req, res, 429, { error: 'rate limited' }, { 'Retry-After': '60' })
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        send(req, res, 413, { error: 'payload too large' })
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => {
      if (res.writableEnded) return
      let events
      try {
        events = JSON.parse(Buffer.concat(chunks).toString('utf8')).events
      } catch {
        return send(req, res, 400, { error: 'invalid JSON' })
      }
      if (!Array.isArray(events) || events.length > MAX_EVENTS) return send(req, res, 400, { error: 'expected events[] (max 100)' })
      const accepted = events.filter(isValidEvent)
      if (accepted.length) {
        addCounters(store, aggregate(accepted))
        scheduleSave()
      }
      send(req, res, 202, { accepted: accepted.length })
    })
    return
  }
  send(req, res, 404, { error: 'not found' })
})

server.listen(PORT, () => console.log(`EduLab analytics API on http://localhost:${PORT}/api/analytics`))
