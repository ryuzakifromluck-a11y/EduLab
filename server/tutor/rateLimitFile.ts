import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { MemoryCounters, type CounterStore } from './rateLimit.js'

/**
 * Rate-limit counters kept in a JSON file, so they survive a restart of
 * `npm run dev` / `npm run preview` or a single self-hosted server. Not for
 * serverless hosts (their file system is per instance and temporary): use
 * Redis there. Writes are atomic (temp file + rename).
 */
export function fileStore(path: string, now: () => number = Date.now): CounterStore {
  const counters = new MemoryCounters()
  try {
    const saved = JSON.parse(readFileSync(path, 'utf8')) as Record<string, { count: number; expiresAt: number }>
    for (const [k, c] of Object.entries(saved)) {
      if (Number.isFinite(c?.count) && Number.isFinite(c?.expiresAt)) counters.entries.set(k, { count: c.count, expiresAt: c.expiresAt })
    }
    counters.prune(now())
  } catch {
    /* no file yet, or unreadable: start empty */
  }

  const save = () => {
    mkdirSync(dirname(path), { recursive: true })
    const tmp = `${path}.tmp`
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(counters.entries)))
    renameSync(tmp, path)
  }

  return {
    kind: 'file',
    async take(keys, policy, ttl, t) {
      const r = counters.take(keys, policy, ttl, t)
      if (r.allowed) {
        counters.prune(t)
        save()
      }
      return r
    },
  }
}
