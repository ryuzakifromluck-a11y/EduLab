import { randomBytes, randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { z } from 'zod'
import { EXPERIMENTS } from '../src/data/experiments.ts'
import { sanitizeRecord } from '../src/lib/hypothesis.ts'
import { applyCompletion } from '../src/lib/progressModel.ts'
import { signToken, verifyToken } from './jwt.ts'
import { hashPassword, verifyPassword } from './password.ts'
import { RateLimiter, clientIp, ipKey, type RateLimitOptions } from './rateLimit.ts'
import { emptySchema, firstError, loginSchema, progressSchema, registerSchema, updateMeSchema } from './schemas.ts'
import { createRemoteRegistry, normalizeCode, RemoteError, type RemoteRegistry } from './remote.ts'
import { EmailTakenError, type Store, type UserRow } from './store.ts'

export type SameSite = 'Strict' | 'Lax' | 'None'

export interface AppOptions {
  store: Store
  jwtSecret: string
  /** Session lifetime in seconds (default 30 days). */
  tokenTtl?: number
  /**
   * Exact browser origins (scheme://host[:port]) allowed to call the API from
   * another origin, e.g. `https://edulab.example`. Same-origin requests are
   * always allowed. There is no wildcard: the session is a cookie, and a
   * credentialed API must name the sites it trusts.
   */
  corsOrigins?: string[]
  cookie?: {
    /** Sets `Secure` and the `__Host-` name prefix. Default true; turn off only for plain-http localhost. */
    secure?: boolean
    /** Default `Lax`. Use `None` only when the web app and the API are on different sites (needs `secure`). */
    sameSite?: SameSite
  }
  /** Believe X-Real-IP / X-Forwarded-For (right-most hop). Only behind a proxy you control. */
  trustProxy?: boolean
  rateLimits?: Partial<Record<'login' | 'loginIp' | 'register' | 'write', RateLimitOptions>>
  /**
   * Accept tokens without a session id (`jti`), as issued before sessions were
   * stored, until they expire. Default true so upgrading does not sign everyone out.
   */
  acceptLegacyTokens?: boolean
  /** QR Remote Control sessions; in memory by default. */
  remote?: RemoteRegistry
}

export type PublicUser = Pick<UserRow, 'id' | 'email' | 'name' | 'createdAt' | 'preferences'>

class HttpError extends Error {
  status: number
  code: string
  headers: Record<string, string>
  constructor(status: number, code: string, headers: Record<string, string> = {}) {
    super(code)
    this.status = status
    this.code = code
    this.headers = headers
  }
}

const MAX_BODY = 16 * 1024
const EXPERIMENT_IDS = new Set(EXPERIMENTS.map((e) => e.id))
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const MINUTE = 60_000

/** Defaults follow the security brief: 5 sign-in or sign-up attempts per minute. */
export const DEFAULT_RATE_LIMITS: Record<'login' | 'loginIp' | 'register' | 'write', RateLimitOptions> = {
  // Per account and address: the brute-force guard.
  login: { burst: 5, windowMs: MINUTE, perDay: 100 },
  // Per address, all accounts: a classroom behind one IP still signs in together, a password spray does not.
  loginIp: { burst: 30, windowMs: MINUTE, perDay: 1000 },
  register: { burst: 5, windowMs: MINUTE, perDay: 200 },
  // Per signed-in user, for progress and profile writes.
  write: { burst: 60, windowMs: MINUTE, perDay: 5000 },
}

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Opener-Policy': 'same-origin',
}

/** The only place a user row becomes a response: `passwordHash` never leaves the server. */
export const publicUser = ({ id, email, name, createdAt, preferences }: UserRow): PublicUser => ({
  id,
  email,
  name,
  createdAt,
  preferences: preferences ?? {},
})

async function readJson(req: IncomingMessage): Promise<unknown> {
  const declared = Number(req.headers['content-length'] ?? 0)
  if (declared > MAX_BODY) throw new HttpError(413, 'payloadTooLarge')
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_BODY) throw new HttpError(413, 'payloadTooLarge')
    chunks.push(chunk as Buffer)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'invalidJson')
  }
}

async function parseBody<S extends z.ZodType>(req: IncomingMessage, schema: S): Promise<z.output<S>> {
  const raw = await readJson(req)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, 'invalidJson')
  const result = schema.safeParse(raw)
  if (!result.success) throw new HttpError(400, firstError(result.error))
  return result.data
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i < 1) continue
    const k = part.slice(0, i).trim()
    if (!(k in out)) out[k] = part.slice(i + 1).trim()
  }
  return out
}

function normalizeOrigin(o: string): string | null {
  try {
    const u = new URL(o)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.origin : null
  } catch {
    return null
  }
}

export function createApp({
  store,
  jwtSecret,
  tokenTtl = 60 * 60 * 24 * 30,
  corsOrigins = [],
  cookie = {},
  trustProxy = false,
  rateLimits = {},
  acceptLegacyTokens = true,
  remote = createRemoteRegistry(),
}: AppOptions) {
  const allowed = new Set(
    corsOrigins.map((o) => {
      const n = normalizeOrigin(o)
      if (!n || o.includes('*')) throw new Error(`Invalid CORS origin "${o}": list exact origins like https://edulab.example`)
      return n
    }),
  )
  const secure = cookie.secure ?? true
  const sameSite: SameSite = cookie.sameSite ?? 'Lax'
  if (sameSite === 'None' && !secure) throw new Error('SameSite=None cookies must be Secure')
  // `__Host-` cookies are only accepted over HTTPS, for this exact host and path /, and cannot be set by a subdomain.
  const COOKIE = secure ? '__Host-edulab_session' : 'edulab_session'

  const limits = { ...DEFAULT_RATE_LIMITS, ...rateLimits }
  const limiter = {
    login: new RateLimiter(limits.login),
    loginIp: new RateLimiter(limits.loginIp),
    register: new RateLimiter(limits.register),
    write: new RateLimiter(limits.write),
    // QR remote: creating and joining sessions, per address. A whole class behind one school IP joins at once.
    remote: new RateLimiter({ burst: 120, windowMs: MINUTE, perDay: 20_000 }),
    // Per student: a heartbeat every second in a room, plus quick updates while the controller drags a slider.
    remoteState: new RateLimiter({ burst: 300, windowMs: MINUTE, perDay: 40_000 }),
    // Per student: creating, joining and handing over rooms.
    remoteRoom: new RateLimiter({ burst: 30, windowMs: MINUTE, perDay: 2_000 }),
    // Per session: the teacher's push and lock buttons.
    remoteControl: new RateLimiter({ burst: 30, windowMs: MINUTE, perDay: 2_000 }),
  }

  // A real hash to compare against when the email is unknown, so a login
  // takes as long for a missing account as for a wrong password.
  let dummyHash: Promise<string> | null = null
  const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')))

  const sessionCookie = (value: string, maxAge: number) =>
    [
      `${COOKIE}=${value}`,
      'Path=/',
      `Max-Age=${maxAge}`,
      'HttpOnly',
      `SameSite=${sameSite}`,
      ...(secure ? ['Secure'] : []),
    ].join('; ')

  function enforce(rl: RateLimiter, key: string) {
    const r = rl.check(key)
    if (!r.ok) throw new HttpError(429, 'rateLimited', { 'Retry-After': String(r.retryAfter ?? 60) })
  }

  const ipOf = (req: IncomingMessage) =>
    ipKey(
      clientIp(
        { get: (n) => (typeof req.headers[n] === 'string' ? (req.headers[n] as string) : null) },
        req.socket.remoteAddress,
        trustProxy,
      ),
    )

  function requestHost(req: IncomingMessage): string | undefined {
    const fwd = trustProxy ? req.headers['x-forwarded-host'] : undefined
    return (typeof fwd === 'string' ? fwd.split(',')[0].trim() : undefined) || req.headers.host
  }

  /** null: no Origin header (same-origin navigation, curl, server-to-server). */
  function originStatus(req: IncomingMessage): 'none' | 'same' | 'allowed' | 'denied' {
    const raw = req.headers.origin
    if (!raw) return 'none'
    const origin = normalizeOrigin(raw)
    if (!origin) return 'denied'
    if (new URL(origin).host === requestHost(req)) return 'same'
    return allowed.has(origin) ? 'allowed' : 'denied'
  }

  interface Session {
    user: UserRow
    /** Authenticated with a legacy bearer token instead of the cookie. */
    viaBearer: boolean
  }

  function readToken(req: IncomingMessage) {
    const fromCookie = parseCookies(req.headers.cookie)[COOKIE]
    const header = req.headers.authorization ?? ''
    // Bearer tokens are still accepted so sessions saved by older app versions can move to the cookie (see /auth/me).
    const fromHeader = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    const token = fromCookie || fromHeader
    return { claims: token ? verifyToken(token, jwtSecret) : null, viaBearer: !fromCookie }
  }

  async function authenticate(req: IncomingMessage): Promise<Session> {
    const { claims, viaBearer } = readToken(req)
    if (!claims) throw new HttpError(401, 'unauthorized')
    // Signed-out (revoked) sessions are refused even though the token itself has not expired.
    const active = claims.jti ? await store.isSessionActive(claims.jti, claims.sub) : acceptLegacyTokens
    const user = active ? await store.findUserById(claims.sub) : null
    if (!user) throw new HttpError(401, 'unauthorized')
    return { user, viaBearer }
  }

  type Reply = [number, unknown, Record<string, string>?]

  async function startSession(status: number, user: UserRow): Promise<Reply> {
    const now = Math.floor(Date.now() / 1000)
    const jti = randomUUID()
    await store.createSession({
      id: jti,
      userId: user.id,
      createdAt: new Date(now * 1000).toISOString(),
      expiresAt: new Date((now + tokenTtl) * 1000).toISOString(),
    })
    return [status, { user: publicUser(user) }, { 'Set-Cookie': sessionCookie(signToken(user.id, jwtSecret, tokenTtl, now, jti), tokenTtl) }]
  }

  async function route(req: IncomingMessage, path: string): Promise<Reply> {
    const method = req.method ?? 'GET'

    if (method === 'GET' && path === '/api/health') return [200, { ok: true }]

    if (method === 'POST' && path === '/api/auth/register') {
      const body = await parseBody(req, registerSchema)
      // Counted after validation, so typos in the form do not lock a classroom out; duplicates do count (limits email probing).
      enforce(limiter.register, ipOf(req))
      if (await store.findUserByEmail(body.email)) throw new HttpError(409, 'emailTaken')
      const user: UserRow = {
        id: randomUUID(),
        email: body.email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        createdAt: new Date().toISOString(),
        preferences: {},
      }
      try {
        await store.createUser(user)
      } catch (err) {
        // Two sign-ups with the same email at the same moment: the store decides.
        if (err instanceof EmailTakenError) throw new HttpError(409, 'emailTaken')
        throw err
      }
      return startSession(201, user)
    }

    if (method === 'POST' && path === '/api/auth/login') {
      const ip = ipOf(req)
      enforce(limiter.loginIp, ip)
      const body = await parseBody(req, loginSchema)
      const key = `${ip}|${body.email}`
      enforce(limiter.login, key)
      const user = await store.findUserByEmail(body.email)
      const ok = await verifyPassword(body.password, user?.passwordHash ?? (await getDummyHash()))
      // Same error for unknown email and wrong password, so accounts cannot be enumerated.
      if (!user || !ok) throw new HttpError(401, 'invalidCredentials')
      limiter.login.reset(key)
      return startSession(200, user)
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      await parseBody(req, emptySchema)
      const { claims } = readToken(req)
      if (claims?.jti) await store.revokeSession(claims.jti)
      return [200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) }]
    }

    if (method === 'GET' && path === '/api/auth/me') {
      const { user, viaBearer } = await authenticate(req)
      // Moves a session saved by an older app version (token in localStorage) into the HttpOnly cookie.
      return viaBearer ? startSession(200, user) : [200, { user: publicUser(user) }]
    }

    if (method === 'PATCH' && path === '/api/auth/me') {
      const { user } = await authenticate(req)
      enforce(limiter.write, user.id)
      const body = await parseBody(req, updateMeSchema)
      const next: UserRow = { ...user, preferences: { ...user.preferences } }
      if (body.preferences?.language) next.preferences!.language = body.preferences.language
      if (body.preferences?.theme) next.preferences!.theme = body.preferences.theme
      if (body.name !== undefined) next.name = body.name
      await store.updateUser(next)
      return [200, { user: publicUser(next) }]
    }

    if (method === 'GET' && path === '/api/progress') {
      const { user } = await authenticate(req)
      return [200, { progress: await store.listProgress(user.id) }]
    }

    const m = /^\/api\/progress\/([^/]+)$/.exec(path)
    if (m && (method === 'PUT' || method === 'POST')) {
      const { user } = await authenticate(req)
      let experimentId: string
      try {
        experimentId = decodeURIComponent(m[1])
      } catch {
        throw new HttpError(400, 'invalidExperiment')
      }
      // Only catalog ids: a client cannot grow its record with made-up experiments.
      if (!EXPERIMENT_IDS.has(experimentId)) throw new HttpError(400, 'invalidExperiment')
      enforce(limiter.write, user.id)
      const body = await parseBody(req, progressSchema)
      const record = await store.saveProgress(user.id, experimentId, (prev) =>
        applyCompletion(prev, experimentId, { score: body.score ?? null, settings: body.settings }),
      )
      return [200, { progress: record }]
    }

    if (method === 'GET' && path === '/api/hypotheses') {
      const { user } = await authenticate(req)
      return [200, { hypotheses: await store.listHypotheses(user.id) }]
    }

    const h = /^\/api\/hypotheses\/([^/]+)$/.exec(path)
    if (h && method === 'PUT') {
      const { user } = await authenticate(req)
      let experimentId: string
      try {
        experimentId = decodeURIComponent(h[1])
      } catch {
        throw new HttpError(400, 'invalidExperiment')
      }
      if (!EXPERIMENT_IDS.has(experimentId)) throw new HttpError(400, 'invalidExperiment')
      enforce(limiter.write, user.id)
      const record = sanitizeRecord(await readJson(req), experimentId)
      if (!record) throw new HttpError(400, 'invalidHypothesis')
      // Another device may already have saved a newer version: the store keeps it and we send it back.
      return [200, { hypothesis: await store.saveHypothesis(user.id, record) }]
    }

    // QR Remote Control. The session code is public (it is on the QR code); watching or
    // closing a session needs the teacher key, and reporting needs the student's own key.
    if (method === 'POST' && path === '/api/remote/session') {
      enforce(limiter.remote, ipOf(req))
      return [201, remote.create()]
    }
    const r = /^\/api\/remote\/session\/([^/]+)(?:\/(join|state|leave|control|room))?$/.exec(path)
    if (r) {
      let code: string
      try {
        code = decodeURIComponent(r[1])
      } catch {
        throw new HttpError(400, 'invalidCode')
      }
      const action = r[2]
      const teacherKey = typeof req.headers['x-teacher-key'] === 'string' ? req.headers['x-teacher-key'] : ''
      const obj = async () => {
        const body = await readJson(req)
        return (body && typeof body === 'object' && !Array.isArray(body) ? body : {}) as Record<string, unknown>
      }
      if (!action && method === 'GET') return [200, teacherKey ? remote.watch(code, teacherKey) : remote.info(code)]
      if (!action && method === 'DELETE') return [200, remote.close(code, teacherKey)]
      if (action === 'join' && method === 'POST') {
        enforce(limiter.remote, ipOf(req))
        return [201, remote.join(code, (await obj()).name)]
      }
      // Keyed by the credentials as sent, so nobody can spend another student's (or the teacher's) budget
      // by quoting their id; wrong keys only fill their own buckets, which the limiter caps in number.
      const part = (v: unknown) => (typeof v === 'string' ? v.slice(0, 64) : '')
      const studentKey = (body: Record<string, unknown>) => `${normalizeCode(code)}:${part(body.studentId)}:${part(body.studentKey)}`
      if (action === 'state' && method === 'PUT') {
        const body = await obj()
        enforce(limiter.remoteState, studentKey(body))
        return [200, remote.report(code, body)]
      }
      if (action === 'room' && method === 'POST') {
        const body = await obj()
        enforce(limiter.remoteRoom, studentKey(body))
        return [200, { room: remote.room(code, body) }]
      }
      if (action === 'control' && method === 'POST') {
        enforce(limiter.remoteControl, `${normalizeCode(code)}:${part(teacherKey)}`)
        return [200, remote.control(code, teacherKey, await obj())]
      }
      if (action === 'leave' && method === 'POST') return [200, remote.leave(code, await obj())]
      throw new HttpError(405, 'methodNotAllowed')
    }

    throw new HttpError(404, 'notFound')
  }

  return async function handle(req: IncomingMessage, res: ServerResponse) {
    const method = req.method ?? 'GET'
    const origin = originStatus(req)
    const cors: Record<string, string> =
      origin === 'allowed'
        ? {
            'Access-Control-Allow-Origin': normalizeOrigin(req.headers.origin!)!,
            'Access-Control-Allow-Credentials': 'true',
            Vary: 'Origin',
          }
        : { Vary: 'Origin' }
    const base = { ...SECURITY_HEADERS, ...cors, ...(secure ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}) }

    if (method === 'OPTIONS') {
      if (origin !== 'allowed' && origin !== 'same') {
        res.writeHead(403, base).end()
        return
      }
      res
        .writeHead(204, {
          ...base,
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Teacher-Key',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Max-Age': '600',
        })
        .end()
      return
    }

    const path = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/+$/, '')
    let status: number
    let payload: unknown
    let extra: Record<string, string> = {}
    try {
      if (UNSAFE_METHODS.has(method)) {
        // CSRF: the session is a cookie, so a write must come from our own site or a listed origin...
        if (origin === 'denied') throw new HttpError(403, 'forbiddenOrigin')
        // ...and be JSON, which a plain HTML form cannot send and which forces a CORS preflight cross-origin.
        if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'unsupportedMediaType')
      }
      ;[status, payload, extra = {}] = await route(req, path)
    } catch (err) {
      if (err instanceof HttpError) [status, payload, extra] = [err.status, { error: err.code }, err.headers]
      else if (err instanceof RemoteError) [status, payload] = [err.status, { error: err.code }]
      else {
        console.error(err)
        ;[status, payload] = [500, { error: 'server' }]
      }
    }
    res.writeHead(status, { ...base, ...extra })
    res.end(JSON.stringify(payload))
  }
}
