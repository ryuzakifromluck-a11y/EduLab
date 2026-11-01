import type { CompletionInput } from './progressModel'

/**
 * Offline outbox for account progress.
 *
 * When a completed run cannot reach the server (offline, timeout, 5xx), it is kept
 * here, in localStorage, keyed by user and experiment. Several offline runs of the
 * same experiment collapse into one entry that keeps the best score and the latest
 * settings, which is exactly what the server would have stored. `flushOutbox` sends
 * the entries again once the app is back online.
 *
 * Pure apart from the injected storage, so it can be unit-tested.
 */

export interface OutboxEntry {
  userId: string
  experimentId: string
  input: CompletionInput
  /** When the first unsent run was queued (ms since epoch). */
  queuedAt: number
  /** Failed send attempts so far. */
  attempts: number
}

export interface OutboxStorage {
  read(): string | null
  write(value: string): void
}

export const OUTBOX_KEY = 'edulab-progress-outbox'
/** An entry the server keeps refusing (5xx, 429, 401…) is dropped after this many answers. */
export const MAX_ATTEMPTS = 8

export const localOutboxStorage: OutboxStorage = {
  read() {
    try {
      return localStorage.getItem(OUTBOX_KEY)
    } catch {
      return null
    }
  },
  write(value) {
    try {
      localStorage.setItem(OUTBOX_KEY, value)
    } catch {
      /* storage full or unavailable: the run stays in memory for this tab */
    }
  },
}

export const keyOf = (e: Pick<OutboxEntry, 'userId' | 'experimentId'>) => `${e.userId}\u0000${e.experimentId}`

function isEntry(x: unknown): x is OutboxEntry {
  if (!x || typeof x !== 'object') return false
  const e = x as Record<string, unknown>
  return typeof e.userId === 'string' && typeof e.experimentId === 'string' && !!e.input && typeof e.input === 'object'
}

export function parseOutbox(raw: string | null): OutboxEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(isEntry).map((e) => ({ ...e, queuedAt: Number(e.queuedAt) || 0, attempts: Number(e.attempts) || 0 }))
      : []
  } catch {
    return []
  }
}

/** Merges a new run into an existing entry the way the server merges runs: best score, latest settings. */
export function mergeInput(prev: CompletionInput, next: CompletionInput): CompletionInput {
  const scores = [prev.score, next.score].filter((s): s is number => typeof s === 'number' && Number.isFinite(s))
  const merged: CompletionInput = { score: scores.length ? Math.max(...scores) : (next.score ?? prev.score ?? null) }
  const settings = next.settings ?? prev.settings
  if (settings) merged.settings = settings
  return merged
}

export function enqueue(entries: OutboxEntry[], userId: string, experimentId: string, input: CompletionInput, now: number): OutboxEntry[] {
  const key = keyOf({ userId, experimentId })
  const existing = entries.find((e) => keyOf(e) === key)
  if (!existing) return [...entries, { userId, experimentId, input, queuedAt: now, attempts: 0 }]
  return entries.map((e) => (e === existing ? { ...e, input: mergeInput(e.input, input) } : e))
}

/** What a failed send means for the queued entry. */
export type SendOutcome = 'sent' | 'retry' | 'drop'

/**
 * Classifies a send error: network failures (status 0), timeouts, rate limits and server
 * errors are retried later; 401 keeps the entry for when the user signs in again; any other
 * 4xx means the server will never accept it, so it is dropped.
 */
export function classifyError(status: number | undefined): Exclude<SendOutcome, 'sent'> {
  if (status === undefined || status === 0 || status === 401 || status === 408 || status === 429 || status >= 500) return 'retry'
  return 'drop'
}

export interface FlushResult {
  /** Every entry that is still queued, with updated attempt counts. */
  remaining: OutboxEntry[]
  sent: OutboxEntry[]
  dropped: OutboxEntry[]
  /** The entries that failed and stay queued (a subset of `remaining`). */
  retried: OutboxEntry[]
}

/**
 * Sends the entries that belong to `userId`, one after another (so a dead connection fails
 * fast instead of firing every request). Stops at the first retryable failure: the
 * connection is evidently still down, and the rest wait for the next flush.
 */
export async function flushOutbox(
  entries: OutboxEntry[],
  userId: string,
  send: (entry: OutboxEntry) => Promise<void>,
  statusOf: (err: unknown) => number | undefined,
): Promise<FlushResult> {
  const sent: OutboxEntry[] = []
  const dropped: OutboxEntry[] = []
  const remaining: OutboxEntry[] = []
  const retried: OutboxEntry[] = []
  let stopped = false
  for (const entry of entries) {
    if (stopped || entry.userId !== userId) {
      remaining.push(entry)
      continue
    }
    try {
      await send(entry)
      sent.push(entry)
    } catch (err) {
      const status = statusOf(err)
      // Being offline is not the entry's fault, so only answers from the server count as attempts.
      const attempts = status ? entry.attempts + 1 : entry.attempts
      if (classifyError(status) === 'drop' || attempts >= MAX_ATTEMPTS) {
        dropped.push(entry)
      } else {
        remaining.push({ ...entry, attempts })
        retried.push({ ...entry, attempts })
        stopped = true
      }
    }
  }
  return { remaining, sent, dropped, retried }
}

const sameRun = (a: OutboxEntry, b: OutboxEntry) => keyOf(a) === keyOf(b) && JSON.stringify(a.input) === JSON.stringify(b.input)

/**
 * Applies a flush result to the queue as it is *now*. A run queued for the same experiment
 * while the flush was in flight changed that entry's input, so the entry stays queued and
 * is sent next time instead of being lost.
 */
export function reconcile(current: OutboxEntry[], result: Pick<FlushResult, 'sent' | 'dropped' | 'retried'>): OutboxEntry[] {
  const done = [...result.sent, ...result.dropped]
  return current.flatMap((e) => {
    if (done.some((d) => sameRun(d, e))) return []
    const r = result.retried.find((x) => sameRun(x, e))
    return [r ? { ...e, attempts: r.attempts } : e]
  })
}

/**
 * Retries `fn` on failure with exponential backoff (base, 2·base, 4·base…), up to
 * `retries` extra attempts. `shouldRetry` decides whether an error is worth retrying.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, baseMs = 500, shouldRetry = () => true, sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)) }: {
    retries?: number
    baseMs?: number
    shouldRetry?: (err: unknown) => boolean
    sleep?: (ms: number) => Promise<void>
  } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err)) throw err
      await sleep(baseMs * 2 ** attempt)
    }
  }
}
