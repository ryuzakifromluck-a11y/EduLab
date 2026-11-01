import { beforeEach, describe, expect, it, vi } from 'vitest'
import { alertText, handleErrorReport, parseReport, resetMonitoringState, WindowCounter } from './errors'

const valid = {
  name: 'TypeError',
  message: 'x is undefined',
  stack: 'TypeError: x is undefined\n    at f (https://edulab.uz/assets/index.js:1:2)',
  source: 'error',
  path: '/physics/pendulum',
  release: 'abc1234',
  fingerprint: 'deadbeef',
  uptime: 12.4,
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://edulab.uz/api/errors', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', 'x-forwarded-for': '1.2.3.4', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

beforeEach(() => resetMonitoringState())

describe('parseReport', () => {
  it('accepts a valid report and stamps the receive time', () => {
    const r = parseReport(valid, new Date('2026-10-31T00:00:00Z'))!
    expect(r).toMatchObject({ type: 'client_error', at: '2026-10-31T00:00:00.000Z', path: '/physics/pendulum', uptime: 12 })
  })

  it('rejects missing or malformed required fields', () => {
    expect(parseReport(null)).toBeNull()
    expect(parseReport([])).toBeNull()
    expect(parseReport({ ...valid, message: '' })).toBeNull()
    expect(parseReport({ ...valid, fingerprint: '<script>' })).toBeNull()
    expect(parseReport({ ...valid, source: 'other' })).toBeNull()
  })

  it('caps sizes, strips queries from the path and keeps only primitive extras', () => {
    const r = parseReport({ ...valid, message: 'm'.repeat(5000), path: '/a?email=x@y.z', extra: { ok: 1, bad: { a: 1 }, inf: Infinity } })!
    expect(r.message.length).toBe(500)
    expect(r.path).toBe('/a')
    expect(r.extra).toEqual({ ok: 1 })
    expect(parseReport({ ...valid, path: 'https://evil.example/' })!.path).toBe('/')
  })
})

describe('handleErrorReport', () => {
  it('logs one JSON line and answers 204 without echoing the body', async () => {
    const log = vi.fn()
    const res = await handleErrorReport(post(valid), {}, { log })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    expect(log).toHaveBeenCalledOnce()
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ type: 'client_error', fingerprint: 'deadbeef' })
  })

  it('rejects other methods, bad JSON, invalid reports and oversized bodies', async () => {
    const log = vi.fn()
    expect((await handleErrorReport(new Request('https://e/api/errors'), {}, { log })).status).toBe(405)
    expect((await handleErrorReport(post('{nope'), {}, { log })).status).toBe(400)
    expect((await handleErrorReport(post({ message: 'x' }), {}, { log })).status).toBe(400)
    expect((await handleErrorReport(post({ ...valid, stack: 'x'.repeat(9000) }), {}, { log })).status).toBe(413)
    expect(log).not.toHaveBeenCalled()
  })

  it('rate limits per IP', async () => {
    const env = { MONITORING_RATE_LIMIT: '2' }
    const log = vi.fn()
    expect((await handleErrorReport(post(valid), env, { log })).status).toBe(204)
    expect((await handleErrorReport(post(valid), env, { log })).status).toBe(204)
    expect((await handleErrorReport(post(valid), env, { log })).status).toBe(429)
    expect((await handleErrorReport(post(valid, { 'x-forwarded-for': '5.6.7.8' }), env, { log })).status).toBe(204)
  })

  it('alerts the webhook once per fingerprint and survives webhook failures', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const env = { MONITORING_WEBHOOK_URL: 'https://hooks.example/abc', VERCEL_ENV: 'production' }
    await handleErrorReport(post(valid), env, { fetch, log: () => {} })
    await handleErrorReport(post(valid), env, { fetch, log: () => {} })
    expect(fetch).toHaveBeenCalledOnce()
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.text).toContain('[production]')
    expect(body.content).toBe(body.text)

    const failing = vi.fn().mockRejectedValue(new Error('down'))
    const log = vi.fn()
    const res = await handleErrorReport(post({ ...valid, fingerprint: 'cafe' }), env, { fetch: failing, log })
    expect(res.status).toBe(204)
    expect(log).toHaveBeenCalledTimes(2)
  })
})

describe('helpers', () => {
  it('WindowCounter resets after the window', () => {
    const c = new WindowCounter(1, 1000)
    expect(c.allow('k', 0)).toBe(true)
    expect(c.allow('k', 10)).toBe(false)
    expect(c.allow('k', 1000)).toBe(true)
  })

  it('alertText names the page, release and first frame', () => {
    const text = alertText(parseReport(valid)!, {})
    expect(text).toContain('TypeError: x is undefined')
    expect(text).toContain('page /physics/pendulum')
    expect(text).toContain('index.js:1:2')
  })
})
