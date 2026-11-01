import { DEFAULT_POLICY, RateLimiter, memoryStore, redisStore, type CounterStore } from './rateLimit.js'

/**
 * Server configuration, read from environment variables on the server only.
 * None of these may be prefixed with VITE_: Vite would bundle them into the browser code.
 */
export interface TutorEnv {
  AI_API_KEY?: string
  /** Any OpenAI-compatible Chat Completions API. Defaults to https://api.openai.com/v1. For Ollama: http://localhost:11434/v1 */
  AI_BASE_URL?: string
  AI_MODEL?: string
  /** Reply length cap. Can lower the 450-token ceiling, never raise it. */
  AI_MAX_TOKENS?: string
  AI_RATE_LIMIT_PER_MINUTE?: string
  AI_RATE_LIMIT_PER_DAY?: string
  /** Old name for AI_RATE_LIMIT_PER_MINUTE, still read. */
  AI_RATE_LIMIT_BURST?: string
  /** Optional secret mixed into the hashed client key stored in Redis. */
  AI_RATE_LIMIT_SALT?: string
  /** Redis for the rate limiter (Upstash REST API). Vercel's Upstash / KV integration sets one of these pairs. */
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string
  KV_REST_API_URL?: string
  KV_REST_API_TOKEN?: string
  /**
   * Comma-separated extra origins allowed to call the tutor from a browser.
   * The site's own origin is always allowed; every other site is refused, so
   * nobody can spend this deployment's AI quota from their own page.
   */
  TUTOR_ALLOWED_ORIGINS?: string
  /** "1" when a proxy you control sets X-Real-IP / X-Forwarded-For. Vercel sets VERCEL=1, which implies it. */
  TRUST_PROXY?: string
  VERCEL?: string
  [key: string]: string | undefined
}

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_MODEL = 'gpt-4o-mini'
/** Hard ceiling on the length of a tutor reply. */
export const MAX_REPLY_TOKENS = 450

export interface TutorConfig {
  baseUrl: string
  apiKey?: string
  model: string
  maxTokens: number
  perMinute: number
  perDay: number
  redis?: { url: string; token: string }
  salt?: string
}

export interface ConfigCheck {
  /** null when the tutor cannot run (see errors). */
  config: TutorConfig | null
  /** Problems that stop the tutor from answering. Variable names only, never values. */
  errors: string[]
  /** Things that work but should be fixed. */
  warnings: string[]
}

const positiveInt = (raw: string | undefined, name: string, fallback: number, warnings: string[]) => {
  if (raw === undefined || raw.trim() === '') return fallback
  const n = Number(raw)
  if (Number.isInteger(n) && n > 0) return n
  warnings.push(`${name} must be a positive whole number; using ${fallback}.`)
  return fallback
}

/** Validates the environment. Pure: does not log, so callers decide how to report. */
export function checkTutorEnv(env: TutorEnv, opts: { serverless?: boolean } = {}): ConfigCheck {
  const errors: string[] = []
  const warnings: string[] = []

  const leaked = Object.keys(env).filter((k) => /^VITE_(AI_|OPENAI|UPSTASH_|KV_REST_|.*API_KEY)/.test(k) && env[k])
  if (leaked.length) errors.push(`${leaked.join(', ')} would be bundled into the browser code. Remove the VITE_ prefix and rotate the key.`)

  const baseUrl = (env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
  try {
    if (!/^https?:$/.test(new URL(baseUrl).protocol)) errors.push('AI_BASE_URL must be an http(s) URL.')
  } catch {
    errors.push('AI_BASE_URL is not a valid URL.')
  }
  const apiKey = env.AI_API_KEY?.trim() || undefined
  // A hosted API needs a key; a local server such as Ollama may not.
  if (!apiKey && baseUrl === DEFAULT_BASE_URL) errors.push('AI_API_KEY is not set.')

  let maxTokens = positiveInt(env.AI_MAX_TOKENS, 'AI_MAX_TOKENS', MAX_REPLY_TOKENS, warnings)
  if (maxTokens > MAX_REPLY_TOKENS) {
    warnings.push(`AI_MAX_TOKENS is capped at ${MAX_REPLY_TOKENS}.`)
    maxTokens = MAX_REPLY_TOKENS
  }
  const perMinute = positiveInt(env.AI_RATE_LIMIT_PER_MINUTE ?? env.AI_RATE_LIMIT_BURST, 'AI_RATE_LIMIT_PER_MINUTE', DEFAULT_POLICY.perMinute, warnings)
  const perDay = positiveInt(env.AI_RATE_LIMIT_PER_DAY, 'AI_RATE_LIMIT_PER_DAY', DEFAULT_POLICY.perDay, warnings)

  const redisUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  let redis: TutorConfig['redis']
  if (redisUrl && redisToken) {
    if (/^https?:\/\//.test(redisUrl)) redis = { url: redisUrl, token: redisToken }
    else warnings.push('UPSTASH_REDIS_REST_URL must be the https REST URL, not a redis:// URL. Rate limits are kept in memory.')
  } else if (redisUrl || redisToken) {
    warnings.push('Redis is half configured: set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Rate limits are kept in memory.')
  } else if (opts.serverless) {
    warnings.push('No Redis configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN): rate limits are per instance and reset on cold starts.')
  }

  const config: TutorConfig | null = errors.length
    ? null
    : { baseUrl, apiKey, model: env.AI_MODEL?.trim() || DEFAULT_MODEL, maxTokens, perMinute, perDay, redis, salt: env.AI_RATE_LIMIT_SALT || undefined }
  return { config, errors, warnings }
}

/** Builds the limiter for a config: Redis when configured (memory as fallback), otherwise `store` or memory. */
export function limiterFromConfig(config: TutorConfig, store?: CounterStore): RateLimiter {
  return new RateLimiter({
    perMinute: config.perMinute,
    perDay: config.perDay,
    salt: config.salt,
    store: config.redis ? redisStore(config.redis) : (store ?? memoryStore()),
  })
}
