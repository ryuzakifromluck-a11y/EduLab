import { createHmac, timingSafeEqual } from 'node:crypto'

/** Minimal HS256 JSON Web Tokens (no dependency). */

export interface TokenClaims {
  sub: string
  iat: number
  exp: number
  /** Session id; tokens issued before sessions were stored have none. */
  jti?: string
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url')
const HEADER = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))

function sign(data: string, secret: string) {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function signToken(
  sub: string,
  secret: string,
  ttlSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
  jti?: string,
): string {
  const claims: TokenClaims = { sub, iat: nowSeconds, exp: nowSeconds + ttlSeconds, ...(jti ? { jti } : {}) }
  const payload = b64url(JSON.stringify(claims))
  const body = `${HEADER}.${payload}`
  return `${body}.${sign(body, secret)}`
}

export function verifyToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): TokenClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== HEADER) return null
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret))
  const actual = Buffer.from(parts[2])
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as TokenClaims
    if (typeof claims.sub !== 'string' || typeof claims.exp !== 'number' || claims.exp <= nowSeconds) return null
    if (claims.jti !== undefined && typeof claims.jti !== 'string') return null
    return claims
  } catch {
    return null
  }
}
