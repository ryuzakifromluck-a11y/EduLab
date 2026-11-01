import { z } from 'zod'
import {
  normalizeEmail,
  normalizeName,
  validateEmail,
  validateName,
  validatePassword,
  type AuthFieldError,
} from '../src/lib/authValidation.ts'
import { sanitizeSettings } from '../src/lib/progressModel.ts'

/**
 * Request body schemas for the accounts API. Every body is parsed with one of
 * these before the handler touches it: unknown keys are dropped, types are
 * checked, and each failure maps to an i18n key under `auth.errors` that the
 * forms already know how to show. The field rules themselves live in
 * src/lib/authValidation.ts so the browser and the server reject the same input.
 */

/** A string field checked by one of the shared validators; a missing or non-string value gets `missing`. */
const field = (missing: AuthFieldError, check: (v: string) => AuthFieldError | null) =>
  z.string({ error: missing }).superRefine((v, ctx) => {
    const code = check(v)
    if (code) ctx.addIssue({ code: 'custom', message: code })
  })

const email = field('emailRequired', validateEmail).transform(normalizeEmail)
const name = field('nameRequired', validateName).transform(normalizeName)

export const registerSchema = z.object({
  name,
  email,
  password: field('passwordRequired', (v) => validatePassword(v, true)),
})

export const loginSchema = z.object({
  email,
  password: field('passwordRequired', (v) => validatePassword(v, false)),
})

export const LANGUAGES = ['en', 'uz', 'ru'] as const
export const THEMES = ['light', 'dark'] as const

export const updateMeSchema = z.object({
  name: name.optional(),
  // Unknown preference values are ignored rather than rejected, so an older or newer client still saves what it can.
  preferences: z
    .object({
      language: z.enum(LANGUAGES).optional().catch(undefined),
      theme: z.enum(THEMES).optional().catch(undefined),
    })
    .optional()
    .catch(undefined),
})

export const progressSchema = z.object({
  score: z.number({ error: 'invalidBody' }).finite().min(0, 'invalidBody').max(100, 'invalidBody').nullable().optional(),
  // Settings are a flat map of primitives; anything else is dropped, not stored.
  settings: z.unknown().transform(sanitizeSettings).optional(),
})

export const emptySchema = z.object({})

/** The first issue's message is the error code sent to the client. */
export function firstError(error: z.ZodError): string {
  const msg = error.issues[0]?.message
  return msg && /^[a-zA-Z]+$/.test(msg) ? msg : 'invalidBody'
}
