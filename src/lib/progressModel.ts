/**
 * Per-user, per-experiment progress record. Shared between the client store
 * and the API server; `applyCompletion` is the single place that decides how
 * a finished run updates the record.
 */

export type ProgressSettings = Record<string, number | string | boolean>

export interface ProgressRecord {
  experimentId: string
  /** First time the experiment was completed (ISO 8601). */
  completedAt: string
  /** Most recent completion (ISO 8601). */
  lastCompletedAt: string
  /** Number of completed runs saved. */
  attempts: number
  /** Best score (0–100) across runs, or null if no run was scored. */
  bestScore: number | null
  /** Parameters of the most recent completed run, e.g. `{ length: 1.2 }`. */
  settings: ProgressSettings
}

export interface CompletionInput {
  score?: number | null
  settings?: ProgressSettings
}

export function applyCompletion(
  prev: ProgressRecord | undefined,
  experimentId: string,
  input: CompletionInput,
  now: Date = new Date(),
): ProgressRecord {
  const at = now.toISOString()
  const score = typeof input.score === 'number' && Number.isFinite(input.score) ? Math.max(0, Math.min(100, input.score)) : null
  const best = prev?.bestScore ?? null
  return {
    experimentId,
    completedAt: prev?.completedAt ?? at,
    lastCompletedAt: at,
    attempts: (prev?.attempts ?? 0) + 1,
    bestScore: score === null ? best : best === null ? score : Math.max(best, score),
    settings: input.settings ?? prev?.settings ?? {},
  }
}

const MAX_SETTINGS = 32
/** camelCase identifiers only: rules out `__proto__`, `constructor` tricks and odd keys. */
const SETTING_KEY = /^[A-Za-z][A-Za-z0-9_]{0,39}$/
const RESERVED = new Set(['constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty'])

/** Keeps only flat primitive values with short keys, so a client cannot store arbitrary blobs. */
export function sanitizeSettings(raw: unknown): ProgressSettings {
  const out: ProgressSettings = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw).slice(0, MAX_SETTINGS)) {
    if (!SETTING_KEY.test(k) || RESERVED.has(k)) continue
    if ((typeof v === 'number' && Number.isFinite(v)) || typeof v === 'boolean') out[k] = v
    else if (typeof v === 'string') out[k] = v.slice(0, 80)
  }
  return out
}
