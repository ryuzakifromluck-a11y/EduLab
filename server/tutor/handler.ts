import { checkTutorEnv, limiterFromConfig, type TutorConfig, type TutorEnv } from './config.js'
import { clientIp, ipKey } from '../rateLimit.js'
import { buildSystemPrompt, parseTutorRequest } from './prompt.js'
import type { RateLimiter } from './rateLimit.js'
import type { TutorError, TutorErrorCode, TutorReply, TutorStatus } from './types.js'

export type { TutorEnv } from './config.js'

const TIMEOUT_MS = 25_000
/** The largest valid request (12 history messages of 2000 characters plus context) is well under this. */
export const MAX_BODY_BYTES = 48 * 1024

const json = (status: number, body: TutorReply | TutorError | TutorStatus, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  })

const fail = (status: number, error: TutorErrorCode, extra: Omit<TutorError, 'error'> = {}) =>
  json(status, { error, ...extra }, extra.retryAfter ? { 'retry-after': String(extra.retryAfter) } : {})

/**
 * Rate-limit key for the caller. Forwarding headers are only believed behind a
 * trusted proxy (Vercel, or the dev server, which overwrites them itself);
 * otherwise any client could send a fresh X-Forwarded-For with every request.
 */
export function clientKey(request: Request, env: TutorEnv = {}): string {
  return ipKey(clientIp(request.headers, undefined, env.TRUST_PROXY === '1' || !!env.VERCEL))
}

/** Same-origin requests, server-to-server calls (no Origin) and configured origins are allowed. */
export function originAllowed(request: Request, env: TutorEnv): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  let host: string
  try {
    host = new URL(origin).host
  } catch {
    return false
  }
  const self = request.headers.get('host') || new URL(request.url).host
  if (host === self) return true
  const extra = (env.TUTOR_ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)
  return extra.includes(origin)
}

async function readBody(request: Request): Promise<unknown | 'too_large'> {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return 'too_large'
  const text = await request.text()
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return 'too_large'
  return JSON.parse(text)
}

export interface TutorDeps {
  fetch?: typeof fetch
  limiter?: RateLimiter
}

// One config and limiter per env object, so a warm serverless instance reuses them.
const cache = new WeakMap<TutorEnv, { config: TutorConfig | null; limiter?: RateLimiter }>()
function resolve(env: TutorEnv) {
  let entry = cache.get(env)
  if (!entry) {
    const { config } = checkTutorEnv(env)
    entry = { config, limiter: config ? limiterFromConfig(config) : undefined }
    cache.set(env, entry)
  }
  return entry
}

/**
 * /api/tutor, framework-neutral (Web Request in, Web Response out).
 *   GET   { available }                       whether the tutor can answer
 *   POST  { language, context, messages }  →  { reply, remaining }
 */
export async function handleTutorRequest(request: Request, env: TutorEnv, deps: TutorDeps = {}): Promise<Response> {
  const { config, limiter: envLimiter } = resolve(env)
  if (request.method === 'GET') return json(200, { available: !!config })
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { allow: 'GET, POST' } })
  if (!originAllowed(request, env)) return fail(403, 'bad_request')
  if (!/^application\/json\b/i.test(request.headers.get('content-type') ?? '')) return fail(415, 'bad_request')
  if (!config) return fail(503, 'not_configured')

  let body: unknown
  try {
    body = await readBody(request)
  } catch {
    return fail(400, 'bad_request')
  }
  if (body === 'too_large') return fail(413, 'bad_request')
  const parsed = parseTutorRequest(body)
  if (!parsed) return fail(400, 'bad_request')

  const limit = await (deps.limiter ?? envLimiter!).check(clientKey(request, env))
  if (!limit.ok) return fail(429, 'rate_limited', { retryAfter: limit.retryAfter, limit: limit.limit })

  const doFetch = deps.fetch ?? fetch
  try {
    const res = await doFetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: 0.4,
        messages: [{ role: 'system', content: buildSystemPrompt(parsed) }, ...parsed.messages],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (res.status === 429) return fail(429, 'rate_limited', { retryAfter: 30, limit: 'minute' })
    if (!res.ok) {
      // Log status only; provider error bodies are never forwarded to the browser.
      console.error(`[tutor] upstream responded ${res.status}`)
      return fail(502, 'upstream')
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] }
    const choice = data.choices?.[0]
    let reply = choice?.message?.content?.trim()
    if (!reply) return fail(502, 'upstream')
    // Cut off by the token cap: end on the last full sentence rather than mid-word.
    if (choice?.finish_reason === 'length') {
      const end = Math.max(reply.lastIndexOf('. '), reply.lastIndexOf('.\n'), reply.lastIndexOf('? '), reply.lastIndexOf('! '))
      reply = end > reply.length / 2 ? reply.slice(0, end + 1) : `${reply}…`
    }
    return json(200, { reply, remaining: limit.remaining })
  } catch (err) {
    console.error('[tutor] request failed:', err instanceof Error ? err.name : 'unknown')
    return fail(502, 'upstream')
  }
}
