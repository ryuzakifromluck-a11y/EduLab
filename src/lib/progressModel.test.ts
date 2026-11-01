import { describe, expect, it } from 'vitest'
import { applyCompletion, sanitizeSettings } from './progressModel'
import { validateEmail, validatePassword } from './authValidation'

describe('applyCompletion', () => {
  const t1 = new Date('2026-01-01T00:00:00Z')
  const t2 = new Date('2026-01-02T00:00:00Z')

  it('keeps the first completion date, counts attempts and tracks the best score', () => {
    const a = applyCompletion(undefined, 'ohms-law', { score: 60, settings: { voltage: 6 } }, t1)
    const b = applyCompletion(a, 'ohms-law', { score: 40 }, t2)
    expect(b).toEqual({
      experimentId: 'ohms-law',
      completedAt: t1.toISOString(),
      lastCompletedAt: t2.toISOString(),
      attempts: 2,
      bestScore: 60,
      settings: { voltage: 6 },
    })
  })

  it('clamps scores and leaves bestScore null for unscored runs', () => {
    expect(applyCompletion(undefined, 'x', {}).bestScore).toBeNull()
    expect(applyCompletion(undefined, 'x', { score: 140 }).bestScore).toBe(100)
  })
})

describe('sanitizeSettings', () => {
  it('keeps flat primitives only', () => {
    expect(sanitizeSettings({ a: 1, b: 'x', c: true, d: { e: 1 }, f: NaN, g: [1] })).toEqual({ a: 1, b: 'x', c: true })
    expect(sanitizeSettings(null)).toEqual({})
  })
})

describe('auth validation', () => {
  it('checks email shape and password strength on registration', () => {
    expect(validateEmail('')).toBe('emailRequired')
    expect(validateEmail('a@b')).toBe('emailInvalid')
    expect(validateEmail(' student@school.uz ')).toBeNull()
    expect(validatePassword('abc', false)).toBeNull()
    expect(validatePassword('abcdefgh', true)).toBe('passwordWeak')
    expect(validatePassword('abcdefg1', true)).toBeNull()
  })
})
