import { describe, expect, it } from 'vitest'
import { signToken, verifyToken } from './jwt.ts'
import { hashPassword, verifyPassword } from './password.ts'

describe('jwt', () => {
  it('round-trips and rejects tampering, wrong secrets and expiry', () => {
    const tok = signToken('user-1', 's3cret', 60, 1000)
    expect(verifyToken(tok, 's3cret', 1010)?.sub).toBe('user-1')
    expect(verifyToken(tok, 'other', 1010)).toBeNull()
    expect(verifyToken(tok, 's3cret', 1061)).toBeNull()
    const [h, , s] = tok.split('.')
    const forged = `${h}.${Buffer.from(JSON.stringify({ sub: 'admin', iat: 1000, exp: 9e9 })).toString('base64url')}.${s}`
    expect(verifyToken(forged, 's3cret', 1010)).toBeNull()
  })
})

describe('password hashing', () => {
  it('verifies the right password only and salts each hash', async () => {
    const a = await hashPassword('lovelace1')
    expect(await verifyPassword('lovelace1', a)).toBe(true)
    expect(await verifyPassword('lovelace2', a)).toBe(false)
    expect(await hashPassword('lovelace1')).not.toBe(a)
  })
})
