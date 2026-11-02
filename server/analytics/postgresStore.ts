import pg from 'pg'
import { emptyCounters, MAX_EXPERIMENT_KEYS, type Counters } from './core.js'
import type { AnalyticsStore } from './handler.js'

type Row = { dimension: string; key: string; count: string }

/** Flattens counter deltas into (dimension, key, n) rows, sorted so concurrent upserts lock rows in the same order. */
export function deltaRows(d: Counters): [string, string, number][] {
  const rows: [string, string, number][] = []
  if (d.sessions) rows.push(['total', 'sessions', d.sessions])
  if (d.completed) rows.push(['total', 'completed', d.completed])
  for (const [k, n] of Object.entries(d.experiments)) rows.push(['experiment', k, n])
  for (const [k, n] of Object.entries(d.subjects)) rows.push(['subject', k, n])
  for (const [k, n] of Object.entries(d.months)) rows.push(['month', k, n])
  return rows.sort((a, b) => (a[0] + '\0' + a[1] < b[0] + '\0' + b[1] ? -1 : 1))
}

// New experiment ids are only added while fewer than MAX_EXPERIMENT_KEYS exist, so made-up ids cannot grow the table forever.
const UPSERT = `
INSERT INTO analytics_counters AS c (dimension, key, count)
SELECT i.dimension, i.key, i.n
FROM unnest($1::text[], $2::text[], $3::bigint[]) WITH ORDINALITY AS i(dimension, key, n, ord)
WHERE i.dimension <> 'experiment'
   OR EXISTS (SELECT 1 FROM analytics_counters e WHERE e.dimension = 'experiment' AND e.key = i.key)
   OR (SELECT count(*) FROM analytics_counters e WHERE e.dimension = 'experiment') < $4
ORDER BY i.ord
ON CONFLICT (dimension, key) DO UPDATE SET count = c.count + EXCLUDED.count`

export function postgresAnalyticsStore(pool: pg.Pool): AnalyticsStore {
  return {
    async add(delta) {
      const rows = deltaRows(delta)
      if (!rows.length) return
      await pool.query(UPSERT, [rows.map((r) => r[0]), rows.map((r) => r[1]), rows.map((r) => r[2]), MAX_EXPERIMENT_KEYS])
    },
    async read() {
      const { rows } = await pool.query<Row>('SELECT dimension, key, count FROM analytics_counters')
      const c = emptyCounters()
      for (const r of rows) {
        const n = Number(r.count)
        if (r.dimension === 'total' && r.key === 'sessions') c.sessions = n
        else if (r.dimension === 'total' && r.key === 'completed') c.completed = n
        else if (r.dimension === 'experiment') c.experiments[r.key] = n
        else if (r.dimension === 'subject') c.subjects[r.key] = n
        else if (r.dimension === 'month') c.months[r.key] = n
      }
      return c
    },
  }
}
