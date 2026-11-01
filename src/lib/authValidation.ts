/**
 * Validation rules shared by the sign-up / login forms and the API server, so
 * both sides reject the same input. Returns an i18n key under `auth.errors`.
 */

export const PASSWORD_MIN = 8
/** Caps the work one request can make the server's scrypt do. */
export const PASSWORD_MAX = 128
export const NAME_MAX = 60
export const EMAIL_MAX = 254

export type AuthFieldError =
  | 'emailRequired'
  | 'emailInvalid'
  | 'passwordRequired'
  | 'passwordShort'
  | 'passwordLong'
  | 'passwordWeak'
  | 'nameRequired'
  | 'nameLong'

// No whitespace, control characters, double quotes, backticks or angle brackets anywhere in the address.
const EMAIL_RE = /^[^\s@<>"`\\\p{Cc}]+@[^\s@<>"`\\\p{Cc}]+\.[^\s@<>"`\\\p{Cc}]{2,}$/u
// Control characters and bidirectional overrides, which can disguise a name.
const UNSAFE_NAME_CHARS = /[\p{Cc}\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/gu

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** Removes invisible and control characters and collapses whitespace. */
export const normalizeName = (name: string) => name.replace(UNSAFE_NAME_CHARS, '').replace(/\s+/g, ' ').trim()

export function validateEmail(email: string): AuthFieldError | null {
  const e = email.trim()
  if (!e) return 'emailRequired'
  if (e.length > EMAIL_MAX || !EMAIL_RE.test(e)) return 'emailInvalid'
  return null
}

/** Login only checks presence; registration also enforces strength. */
export function validatePassword(password: string, forRegistration: boolean): AuthFieldError | null {
  if (!password) return 'passwordRequired'
  if (password.length > PASSWORD_MAX) return 'passwordLong'
  if (!forRegistration) return null
  if (password.length < PASSWORD_MIN) return 'passwordShort'
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'passwordWeak'
  return null
}

export function validateName(name: string): AuthFieldError | null {
  const n = normalizeName(name)
  if (!n) return 'nameRequired'
  if (n.length > NAME_MAX) return 'nameLong'
  return null
}
