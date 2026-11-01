import { loadEnv, type Plugin } from 'vite'
import { resolve } from 'node:path'
import { handleErrorReport, type MonitoringEnv } from '../monitoring/errors.js'
import { checkTutorEnv, limiterFromConfig, type TutorEnv } from './config.js'
import { MAX_BODY_BYTES, handleTutorRequest } from './handler.js'
import type { RateLimiter } from './rateLimit.js'
import { fileStore } from './rateLimitFile.js'

interface NodeReq extends AsyncIterable<Uint8Array> {
  url?: string
  originalUrl?: string
  method?: string
  headers: Record<string, string | string[] | undefined>
  socket?: { remoteAddress?: string }
}
interface NodeRes {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

type WebHandler = (request: Request) => Promise<Response>

/** Adapts a Fetch-API handler (the same one the Vercel Function uses) to Connect middleware. */
const adapt = (handler: WebHandler, maxBytes: number) => async (req: NodeReq, res: NodeRes) => {
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const c of req) {
    size += c.length
    // Stop buffering early and answer 413.
    if (size > maxBytes) break
    chunks.push(c)
  }
  if (size > maxBytes) {
    res.statusCode = 413
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'bad_request' }))
    return
  }
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
  // Always overwrite: a client-supplied X-Forwarded-For must not pick its own rate-limit bucket.
  headers.delete('x-forwarded-for')
  headers.set('x-real-ip', req.socket?.remoteAddress ?? 'unknown')
  const host = typeof req.headers.host === 'string' ? req.headers.host : 'localhost'
  const request = new Request(`http://${host}${req.originalUrl ?? req.url ?? '/'}`, {
    method: req.method,
    headers,
    body: req.method === 'POST' ? new Blob(chunks as BlobPart[]) : undefined,
  })
  const response = await handler(request)
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(await response.text())
}

/**
 * Serves /api/tutor and POST /api/errors from the Vite dev and preview servers
 * so `npm run dev` and `npm run preview` work without a separate backend. Reads AI_*
 * and MONITORING_* variables from .env / .env.local; they have no VITE_ prefix, so
 * Vite never bundles them into client code.
 */
export function tutorDevApi(): Plugin {
  let env: TutorEnv & MonitoringEnv = {}
  let tutorEnv: TutorEnv = {}
  let limiter: RateLimiter | undefined
  const tutor = adapt((r) => handleTutorRequest(r, tutorEnv, { limiter }), MAX_BODY_BYTES)
  const errors = adapt((r) => handleErrorReport(r, env), 8 * 1024)
  return {
    name: 'edulab-tutor-api',
    configResolved(config) {
      const dir = config.envDir || config.root
      const all = loadEnv(config.mode, dir, '')
      env = Object.fromEntries(Object.entries(all).filter(([k]) => /^(AI_|UPSTASH_|KV_REST_|VITE_|TUTOR_|MONITORING_)/.test(k)))
      // The dev server overwrites forwarding headers itself (see adapt), so they can be trusted here.
      tutorEnv = { ...env, TRUST_PROXY: '1' }
      const check = checkTutorEnv(env)
      // A VITE_-prefixed key would ship to every visitor: stop the build instead of leaking it.
      const leak = check.errors.find((e) => e.startsWith('VITE_'))
      if (leak) throw new Error(`[tutor] ${leak}`)
      if (config.command === 'build') return
      for (const w of check.warnings) config.logger.warn(`[tutor] ${w}`)
      if (check.config) {
        limiter = limiterFromConfig(check.config, fileStore(resolve(config.root, 'server/data/tutor-rate-limit.json')))
        config.logger.info(`[tutor] rate limits: ${check.config.perMinute}/min, ${check.config.perDay}/day per IP (${limiter.store.kind})`)
      } else {
        config.logger.warn(`[tutor] not available: ${check.errors.join(' ')}`)
      }
    },
    configureServer(server) {
      server.middlewares.use('/api/tutor', tutor as never)
      server.middlewares.use('/api/errors', errors as never)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/tutor', tutor as never)
      server.middlewares.use('/api/errors', errors as never)
    },
  }
}
