/**
 * Client error monitoring. Dependency-free: uncaught errors, unhandled promise
 * rejections and React render errors are reported to `POST /api/errors`
 * (a Vercel Function that writes them to the runtime logs and, optionally,
 * a Slack/Discord webhook).
 *
 * Privacy: reports carry the error message, stack, page path (no query string
 * or hash), app language, build id and user agent. No account ids, emails,
 * IP addresses or experiment inputs are sent.
 *
 *   VITE_MONITORING_URL  endpoint, default `/api/errors`; `off` disables reporting
 *   VITE_MONITORING_SAMPLE_RATE  0..1, default 1
 *
 * In development errors are only logged to the console.
 */

export type ErrorSource = 'error' | 'unhandledrejection' | 'react' | 'scene' | 'manual'

export interface ErrorReport {
  message: string
  name: string
  stack?: string
  source: ErrorSource
  /** Pathname only: query strings and hashes can hold personal data. */
  path: string
  release: string
  language?: string
  userAgent?: string
  /** Seconds since the page loaded. */
  uptime?: number
  extra?: Record<string, string | number | boolean>
  fingerprint: string
}

export const LIMITS = { message: 500, stack: 4000, path: 200, extraKeys: 10, extraValue: 200, perPage: 10 } as const

/** Errors from browser extensions, cross-origin scripts and aborted requests carry no useful signal. */
const IGNORED = [
  /^Script error\.?$/i,
  /ResizeObserver loop/i,
  /^AbortError/i,
  /The user aborted a request/i,
  /Failed to fetch dynamically imported module/i, // stale deploy; the app reloads into the new build
  /^Load failed$/i,
  /^NetworkError when attempting to fetch resource\.?$/i,
]
const EXTENSION_FRAME = /(chrome|moz|safari(-web)?)-extension:\/\//

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/** Normalises anything that can be thrown into a name, message and stack. */
export function describeError(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) return { name: err.name || 'Error', message: err.message || String(err), stack: err.stack }
  if (typeof err === 'string') return { name: 'Error', message: err }
  try {
    return { name: 'NonError', message: JSON.stringify(err) ?? String(err) }
  } catch {
    return { name: 'NonError', message: String(err) }
  }
}

/** Strips the query string and hash from a URL or path. */
export function cleanPath(url: string): string {
  try {
    return clip(new URL(url, 'http://x').pathname, LIMITS.path)
  } catch {
    return clip(url.split(/[?#]/)[0], LIMITS.path)
  }
}

/** Removes query strings from URLs inside a stack (cache-busting tokens, signed URLs). */
const cleanStack = (stack: string) => clip(stack.replace(/(https?:\/\/[^\s)?#]+)[?#][^\s):]*/g, '$1'), LIMITS.stack)

/** Stable id for grouping: same error at the same place → same fingerprint. */
export function fingerprint(name: string, message: string, stack?: string): string {
  const firstFrame = stack?.split('\n').find((l) => /:\d+:\d+/.test(l))?.trim() ?? ''
  // Hashed asset names change every build; drop them so a recurring bug groups across deploys.
  const normalised = `${name}|${message.replace(/\d+/g, '0')}|${firstFrame.replace(/-[A-Za-z0-9_]{8}\.js/, '.js').replace(/:\d+:\d+/g, '')}`
  let h = 0x811c9dc5
  for (let i = 0; i < normalised.length; i++) h = Math.imul(h ^ normalised.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(16).padStart(8, '0')
}

export function shouldIgnore(message: string, stack?: string): boolean {
  return IGNORED.some((re) => re.test(message)) || (!!stack && EXTENSION_FRAME.test(stack) && !stack.includes('/assets/'))
}

export interface ReportInput {
  error: unknown
  source: ErrorSource
  url: string
  release: string
  language?: string
  userAgent?: string
  uptime?: number
  extra?: Record<string, unknown>
}

/** Builds a size-capped, privacy-safe report, or null when the error should be ignored. */
export function buildReport(input: ReportInput): ErrorReport | null {
  const { name, message, stack } = describeError(input.error)
  if (shouldIgnore(message, stack)) return null
  const extra: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(input.extra ?? {}).slice(0, LIMITS.extraKeys)) {
    if (typeof v === 'number' || typeof v === 'boolean') extra[clip(k, 40)] = v
    else if (typeof v === 'string') extra[clip(k, 40)] = clip(v, LIMITS.extraValue)
  }
  return {
    name: clip(name, 100),
    message: clip(message, LIMITS.message),
    stack: stack ? cleanStack(stack) : undefined,
    source: input.source,
    path: cleanPath(input.url),
    release: clip(input.release, 40),
    language: input.language ? clip(input.language, 10) : undefined,
    userAgent: input.userAgent ? clip(input.userAgent, 300) : undefined,
    uptime: input.uptime === undefined ? undefined : Math.round(input.uptime),
    extra: Object.keys(extra).length ? extra : undefined,
    fingerprint: fingerprint(name, message, stack),
  }
}

/** Per-page-load gate: drops repeats of the same fingerprint and caps the total. */
export function createGate(max: number = LIMITS.perPage, sampleRate = 1, random: () => number = Math.random) {
  const seen = new Set<string>()
  let sent = 0
  return (fp: string): boolean => {
    if (seen.has(fp) || sent >= max) return false
    seen.add(fp)
    if (random() >= sampleRate) return false
    sent++
    return true
  }
}

// ---------------------------------------------------------------------------
// Browser wiring

type Transport = (endpoint: string, report: ErrorReport) => void

const beaconTransport: Transport = (endpoint, report) => {
  const body = JSON.stringify(report)
  try {
    // sendBeacon survives page unloads; text/plain avoids a CORS preflight.
    if (navigator.sendBeacon?.(endpoint, new Blob([body], { type: 'text/plain' }))) return
  } catch {
    /* fall through */
  }
  fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {})
}

interface MonitorConfig {
  endpoint: string | null
  release: string
  sampleRate: number
  transport: Transport
}

let config: MonitorConfig | null = null
let gate = createGate()
const loadedAt = typeof performance !== 'undefined' ? performance.now() : 0

function resolveEndpoint(): string | null {
  const raw = (import.meta.env.VITE_MONITORING_URL as string | undefined)?.trim()
  if (raw === 'off') return null
  if (!import.meta.env.PROD) return null
  return raw || '/api/errors'
}

/** Reports an error. Safe to call before `initMonitoring` (it is then only logged). */
export function reportError(error: unknown, source: ErrorSource = 'manual', extra?: Record<string, unknown>): void {
  if (!config?.endpoint || typeof window === 'undefined') return
  try {
    const report = buildReport({
      error,
      source,
      url: window.location.href,
      release: config.release,
      language: document.documentElement.lang || undefined,
      userAgent: navigator.userAgent,
      uptime: (performance.now() - loadedAt) / 1000,
      extra,
    })
    if (report && gate(report.fingerprint)) config.transport(config.endpoint, report)
  } catch {
    // Monitoring must never break the app.
  }
}

/** Installs global handlers once. Call from main.tsx. */
export function initMonitoring(options: Partial<MonitorConfig> = {}): void {
  if (config || typeof window === 'undefined') return
  const rate = Number(import.meta.env.VITE_MONITORING_SAMPLE_RATE)
  config = {
    endpoint: options.endpoint !== undefined ? options.endpoint : resolveEndpoint(),
    release: options.release ?? (import.meta.env.VITE_RELEASE as string | undefined) ?? 'dev',
    sampleRate: options.sampleRate ?? (Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 1),
    transport: options.transport ?? beaconTransport,
  }
  gate = createGate(LIMITS.perPage, config.sampleRate)
  if (!config.endpoint) return
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'error'))
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'unhandledrejection'))
}
