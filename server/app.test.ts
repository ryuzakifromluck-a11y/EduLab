import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp, type AppOptions } from './app.ts'
import { signToken } from './jwt.ts'
import { memoryStore } from './store.ts'

const SECRET = 'test-secret'
const servers: Server[] = []

async function start(opts: Partial<AppOptions> = {}) {
  const store = opts.store ?? memoryStore()
  const server = createServer(createApp({ jwtSecret: SECRET, cookie: { secure: false }, ...opts, store }))
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  servers.push(server)
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`

  async function call(method: string, path: string, body?: unknown, init: { cookie?: string; headers?: Record<string, string> } = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.cookie ? { Cookie: init.cookie } : {}),
        ...init.headers,
      },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
    const text = await res.text()
    const setCookie = res.headers.get('set-cookie') ?? ''
    return {
      status: res.status,
      headers: res.headers,
      setCookie,
      /** `name=value` of the session cookie the server set, for the next request. */
      cookie: setCookie.split(';')[0],
      json: (text ? JSON.parse(text) : null) as any,
    }
  }
  return { store, base, call }
}
afterAll(() => Promise.all(servers.map((s) => new Promise<void>((r) => s.close(() => r())))))

describe('accounts API', () => {
  let api: Awaited<ReturnType<typeof start>>
  let session = ''
  beforeAll(async () => {
    api = await start()
  })

  it('validates registration input', async () => {
    const { call } = api
    expect((await call('POST', '/api/auth/register', { name: 'A', email: 'bad', password: 'abcdefg1' })).json.error).toBe('emailInvalid')
    expect((await call('POST', '/api/auth/register', { name: 'A', email: 'a@b.co', password: 'short1' })).json.error).toBe('passwordShort')
    expect((await call('POST', '/api/auth/register', { name: '', email: 'a@b.co', password: 'abcdefg1' })).json.error).toBe('nameRequired')
  })

  it('registers a user, sets an HttpOnly session cookie and never returns the password hash', async () => {
    const r = await api.call('POST', '/api/auth/register', { name: ' Ada ', email: 'Ada@Example.com', password: 'lovelace1' })
    expect(r.status).toBe(201)
    expect(r.json.user).toMatchObject({ name: 'Ada', email: 'ada@example.com' })
    expect(JSON.stringify(r.json)).not.toMatch(/passwordHash|scrypt/)
    expect(r.json.token).toBeUndefined()
    expect(r.setCookie).toMatch(/^edulab_session=[\w-]+\.[\w-]+\.[\w-]+; Path=\/; Max-Age=2592000; HttpOnly; SameSite=Lax$/)
    expect((await api.store.findUserByEmail('ada@example.com'))?.passwordHash).toMatch(/^scrypt\$/)
    session = r.cookie
  })

  it('rejects a duplicate email regardless of case', async () => {
    const r = await api.call('POST', '/api/auth/register', { name: 'Ada', email: 'ADA@example.com', password: 'lovelace1' })
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('emailTaken')
  })

  it('logs in with the right password only', async () => {
    const { call } = api
    expect((await call('POST', '/api/auth/login', { email: 'ada@example.com', password: 'wrong-pass1' })).status).toBe(401)
    expect((await call('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'lovelace1' })).json.error).toBe('invalidCredentials')
    const ok = await call('POST', '/api/auth/login', { email: 'ada@example.com', password: 'lovelace1' })
    expect(ok.status).toBe(200)
    expect(ok.cookie).toMatch(/^edulab_session=/)
    expect(JSON.stringify(ok.json)).not.toMatch(/passwordHash|token/)
  })

  it('restores the session from the cookie', async () => {
    const { call } = api
    expect((await call('GET', '/api/auth/me')).status).toBe(401)
    expect((await call('GET', '/api/auth/me', undefined, { cookie: session + 'x' })).status).toBe(401)
    const me = await call('GET', '/api/auth/me', undefined, { cookie: session })
    expect(me.json.user.email).toBe('ada@example.com')
    expect(me.json.user.passwordHash).toBeUndefined()
    expect(me.setCookie).toBe('')
  })

  it('moves a legacy bearer token into the cookie', async () => {
    const id = (await api.store.findUserByEmail('ada@example.com'))!.id
    const me = await api.call('GET', '/api/auth/me', undefined, { headers: { Authorization: `Bearer ${signToken(id, SECRET, 60)}` } })
    expect(me.status).toBe(200)
    expect(me.cookie).toMatch(/^edulab_session=/)
  })

  it('logs out by expiring the cookie and revoking the session on the server', async () => {
    const r = await api.call('POST', '/api/auth/logout', {}, { cookie: session })
    expect(r.status).toBe(200)
    expect(r.setCookie).toMatch(/^edulab_session=; Path=\/; Max-Age=0; HttpOnly/)
    // A copy of the old cookie no longer works.
    expect((await api.call('GET', '/api/auth/me', undefined, { cookie: session })).status).toBe(401)
    const again = await api.call('POST', '/api/auth/login', { email: 'ada@example.com', password: 'lovelace1' })
    expect(again.status).toBe(200)
    session = again.cookie
  })

  it('saves preferences and ignores unknown values', async () => {
    const r = await api.call('PATCH', '/api/auth/me', { preferences: { language: 'uz', theme: 'neon' } }, { cookie: session })
    expect(r.json.user.preferences).toEqual({ language: 'uz' })
  })

  it('strips invisible characters from names', async () => {
    const r = await api.call('PATCH', '/api/auth/me', { name: 'Ada‮ \u0000Lovelace' }, { cookie: session })
    expect(r.json.user.name).toBe('Ada Lovelace')
    expect((await api.call('PATCH', '/api/auth/me', { name: 42 }, { cookie: session })).json.error).toBe('nameRequired')
  })

  it('records completions per user and experiment', async () => {
    const { call } = api
    expect((await call('PUT', '/api/progress/pendulum', {})).status).toBe(401)
    const settings = JSON.parse('{"length":1.5,"gravity":9.81,"junk":{"a":1},"__proto__":1,"constructor":2}')
    const first = await call('PUT', '/api/progress/pendulum', { settings }, { cookie: session })
    expect(first.json.progress).toMatchObject({ experimentId: 'pendulum', attempts: 1, bestScore: null })
    expect(first.json.progress.settings).toEqual({ length: 1.5, gravity: 9.81 })
    await call('PUT', '/api/progress/pendulum', { score: 80, settings: { length: 2 } }, { cookie: session })
    const list = await call('GET', '/api/progress', undefined, { cookie: session })
    expect(list.json.progress).toHaveLength(1)
    expect(list.json.progress[0]).toMatchObject({ attempts: 2, bestScore: 80, settings: { length: 2 } })
    expect((await call('PUT', '/api/progress/..%2Fadmin', {}, { cookie: session })).status).toBe(400)
    expect((await call('PUT', '/api/progress/%E0%A4%A', {}, { cookie: session })).status).toBe(400)
    expect((await call('PUT', '/api/progress/not-in-catalog', {}, { cookie: session })).json.error).toBe('invalidExperiment')
    expect((await call('PUT', '/api/progress/pendulum', { score: 'lots' }, { cookie: session })).json.error).toBe('invalidBody')
    expect((await call('PUT', '/api/progress/pendulum', { score: 1e9 }, { cookie: session })).status).toBe(400)
  })

  it('keeps other users’ progress separate', async () => {
    const other = await api.call('POST', '/api/auth/register', { name: 'Bob', email: 'bob@example.com', password: 'builder99' })
    expect((await api.call('GET', '/api/progress', undefined, { cookie: other.cookie })).json.progress).toEqual([])
  })

  it('validates every body: wrong types, arrays, bad JSON, huge passwords and oversized bodies', async () => {
    const { call } = api
    expect((await call('POST', '/api/auth/login', { email: ['a@b.co'], password: 'x' })).json.error).toBe('emailRequired')
    expect((await call('POST', '/api/auth/login', [1, 2])).json.error).toBe('invalidJson')
    expect((await call('POST', '/api/auth/login', '{"email":')).json.error).toBe('invalidJson')
    expect((await call('POST', '/api/auth/login', { email: 'a<script>@b.co', password: 'x' })).json.error).toBe('emailInvalid')
    expect((await call('POST', '/api/auth/register', { name: 'A', email: 'a@b.co', password: 'a1'.repeat(100) })).json.error).toBe('passwordLong')
    expect((await call('POST', '/api/auth/login', { email: 'a@b.co', password: 'x'.repeat(20_000) })).status).toBe(413)
  })

  it('sends security headers and no-store on every response', async () => {
    const r = await api.call('GET', '/api/health')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('x-frame-options')).toBe('DENY')
    expect(r.headers.get('content-security-policy')).toContain("default-src 'none'")
    expect(r.headers.get('cache-control')).toBe('no-store')
  })
})

describe('CORS and CSRF', () => {
  let api: Awaited<ReturnType<typeof start>>
  beforeAll(async () => {
    api = await start({ corsOrigins: ['https://edulab.example'] })
  })

  it('allows only listed origins, with credentials and never a wildcard', async () => {
    const ok = await api.call('GET', '/api/health', undefined, { headers: { Origin: 'https://edulab.example' } })
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://edulab.example')
    expect(ok.headers.get('access-control-allow-credentials')).toBe('true')
    const evil = await api.call('GET', '/api/health', undefined, { headers: { Origin: 'https://evil.example' } })
    expect(evil.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('answers preflights for allowed origins and refuses others', async () => {
    const pre = (origin: string) =>
      fetch(`${api.base}/api/auth/login`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' } })
    const ok = await pre('https://edulab.example')
    expect(ok.status).toBe(204)
    expect(ok.headers.get('access-control-allow-methods')).toContain('POST')
    expect((await pre('https://evil.example')).status).toBe(403)
  })

  it('refuses writes from other sites and non-JSON writes', async () => {
    const r = await api.call('POST', '/api/auth/login', { email: 'a@b.co', password: 'x' }, { headers: { Origin: 'https://evil.example' } })
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('forbiddenOrigin')
    // A classic CSRF form post.
    const form = await fetch(`${api.base}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'a=1',
    })
    expect(form.status).toBe(415)
  })

  it('treats the API’s own origin as same-origin', async () => {
    const r = await api.call('POST', '/api/auth/login', { email: 'a@b.co', password: 'abcdefg1' }, { headers: { Origin: api.base } })
    expect(r.status).toBe(401)
  })

  it('rejects wildcard origins at start-up', () => {
    expect(() => createApp({ store: memoryStore(), jwtSecret: SECRET, corsOrigins: ['*'] })).toThrow(/exact origins/)
  })

  it('uses a __Host- Secure cookie by default', async () => {
    const secure = await start({ cookie: {} })
    const r = await secure.call('POST', '/api/auth/register', { name: 'Cy', email: 'cy@example.com', password: 'abcdefg1' })
    expect(r.setCookie).toMatch(/^__Host-edulab_session=.*; HttpOnly; SameSite=Lax; Secure$/)
    expect(r.headers.get('strict-transport-security')).toContain('max-age=')
  })
})

describe('rate limits', () => {
  it('allows 5 sign-in attempts per account per minute', async () => {
    const api = await start()
    await api.call('POST', '/api/auth/register', { name: 'Ada', email: 'ada@example.com', password: 'lovelace1' })
    const attempt = () => api.call('POST', '/api/auth/login', { email: 'ada@example.com', password: 'wrong-pass1' })
    for (let i = 0; i < 5; i++) expect((await attempt()).status).toBe(401)
    const blocked = await attempt()
    expect(blocked.status).toBe(429)
    expect(blocked.json.error).toBe('rateLimited')
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
    // Even the right password waits: the attacker cannot keep guessing.
    expect((await api.call('POST', '/api/auth/login', { email: 'ada@example.com', password: 'lovelace1' })).status).toBe(429)
    // Other accounts from the same address are unaffected.
    expect((await api.call('POST', '/api/auth/login', { email: 'bob@example.com', password: 'x' })).status).toBe(401)
  })

  it('allows 5 sign-ups per address per minute', async () => {
    const api = await start()
    const signUp = (i: number) => api.call('POST', '/api/auth/register', { name: 'U', email: `u${i}@example.com`, password: 'abcdefg1' })
    for (let i = 0; i < 5; i++) expect((await signUp(i)).status).toBe(201)
    expect((await signUp(5)).status).toBe(429)
  })

  it('ignores spoofed X-Forwarded-For unless a trusted proxy is configured', async () => {
    const api = await start({ rateLimits: { register: { burst: 1, windowMs: 60_000, perDay: 10 } } })
    const signUp = (i: number) =>
      api.call('POST', '/api/auth/register', { name: 'U', email: `x${i}@example.com`, password: 'abcdefg1' }, { headers: { 'X-Forwarded-For': `10.0.0.${i}` } })
    expect((await signUp(1)).status).toBe(201)
    expect((await signUp(2)).status).toBe(429)
  })
})

describe('hypotheses API', () => {
  it('saves hypotheses per user, sanitised, and keeps the newer copy on conflict', async () => {
    const hypothesis = {
      draft: { variable: 'length', change: 'increase', plan: 'Make it longer', outcome: 'period', expected: 'increase', prediction: 'Slower swing', affected: ['period', 'frequency'] },
      baseline: { length: 1, gravity: 9.81, junk: { a: 1 } },
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
      tested: 0,
      confirmed: 0,
      result: null,
    }
    const { call } = await start()
    const signUp = async (name: string, email: string, password: string) =>
      (await call('POST', '/api/auth/register', { name, email, password })).cookie
    const ada = await signUp('Ada', 'ada@example.com', 'lovelace1')
    const bob = await signUp('Bob', 'bob@example.com', 'builder99')
    const as = (cookie: string) => ({ cookie })
    expect((await call('PUT', '/api/hypotheses/pendulum', hypothesis)).status).toBe(401)
    expect((await call('PUT', '/api/hypotheses/pendulum', { draft: {} }, as(ada))).json.error).toBe('invalidHypothesis')
    const saved = await call('PUT', '/api/hypotheses/pendulum', hypothesis, as(ada))
    expect(saved.status).toBe(200)
    expect(saved.json.hypothesis).toMatchObject({ experimentId: 'pendulum', baseline: { length: 1, gravity: 9.81 } })
    expect(saved.json.hypothesis.baseline.junk).toBeUndefined()

    const older = await call('PUT', '/api/hypotheses/pendulum', { ...hypothesis, updatedAt: '2026-02-01T00:00:00.000Z', draft: { ...hypothesis.draft, plan: 'stale' } }, as(ada))
    expect(older.json.hypothesis.draft.plan).toBe('Make it longer')

    const list = await call('GET', '/api/hypotheses', undefined, as(ada))
    expect(list.json.hypotheses).toHaveLength(1)
    expect((await call('GET', '/api/hypotheses', undefined, as(bob))).json.hypotheses).toEqual([])
    expect((await call('PUT', '/api/hypotheses/not-an-experiment', hypothesis, as(ada))).json.error).toBe('invalidExperiment')
  })
})
