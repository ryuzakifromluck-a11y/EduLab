import { describe, expect, it } from 'vitest'
import { buildReport, cleanPath, createGate, describeError, fingerprint, LIMITS, shouldIgnore } from './monitoring'

const base = { source: 'error' as const, url: 'https://edulab.uz/physics/pendulum?token=abc#x', release: 'abc1234' }

describe('monitoring: buildReport', () => {
  it('keeps the pathname only and caps field sizes', () => {
    const err = new Error('x'.repeat(2000))
    err.stack = `Error: boom\n    at f (https://edulab.uz/assets/index-AbCd1234.js?v=secret:1:2)\n${'    at g (a.js:1:1)\n'.repeat(500)}`
    const r = buildReport({ ...base, error: err })!
    expect(r.path).toBe('/physics/pendulum')
    expect(r.message.length).toBe(LIMITS.message)
    expect(r.stack!.length).toBeLessThanOrEqual(LIMITS.stack)
    expect(r.stack).not.toContain('secret')
    expect(r.release).toBe('abc1234')
  })

  it('accepts non-Error throwables', () => {
    expect(describeError('plain')).toEqual({ name: 'Error', message: 'plain' })
    expect(describeError({ code: 7 })).toEqual({ name: 'NonError', message: '{"code":7}' })
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(describeError(circular).name).toBe('NonError')
  })

  it('drops noise from extensions, cross-origin scripts and stale chunks', () => {
    expect(buildReport({ ...base, error: 'Script error.' })).toBeNull()
    expect(buildReport({ ...base, error: new Error('Failed to fetch dynamically imported module: /assets/x.js') })).toBeNull()
    expect(shouldIgnore('oops', 'at chrome-extension://abc/inject.js:1:1')).toBe(true)
    expect(shouldIgnore('oops', 'at https://edulab.uz/assets/index.js:1:1')).toBe(false)
  })

  it('only keeps primitive extra fields', () => {
    const r = buildReport({ ...base, error: new Error('e'), extra: { experiment: 'pendulum', n: 3, ok: true, obj: { a: 1 } } })!
    expect(r.extra).toEqual({ experiment: 'pendulum', n: 3, ok: true })
  })
})

describe('monitoring: fingerprint', () => {
  it('groups the same error across builds and changing numbers', () => {
    const a = fingerprint('TypeError', 'x is undefined at 12', 'TypeError\n    at f (https://e/assets/index-AAAAAAAA.js:10:5)')
    const b = fingerprint('TypeError', 'x is undefined at 99', 'TypeError\n    at f (https://e/assets/index-BBBBBBBB.js:11:7)')
    const c = fingerprint('TypeError', 'y is undefined', 'TypeError\n    at f (https://e/assets/index-AAAAAAAA.js:10:5)')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).toMatch(/^[0-9a-f]{8}$/)
  })
})

describe('monitoring: gate', () => {
  it('dedupes per fingerprint and caps reports per page', () => {
    const gate = createGate(2)
    expect(gate('a')).toBe(true)
    expect(gate('a')).toBe(false)
    expect(gate('b')).toBe(true)
    expect(gate('c')).toBe(false)
  })

  it('applies the sample rate', () => {
    const gate = createGate(10, 0.5, () => 0.9)
    expect(gate('a')).toBe(false)
    expect(createGate(10, 0.5, () => 0.1)('a')).toBe(true)
  })
})

describe('monitoring: cleanPath', () => {
  it('handles relative and malformed input', () => {
    expect(cleanPath('/chemistry/titration?q=1')).toBe('/chemistry/titration')
    expect(cleanPath('https://edulab.uz/')).toBe('/')
  })
})
