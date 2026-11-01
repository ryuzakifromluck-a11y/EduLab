import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Pool } from 'pg'

export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url))

// Arbitrary constant: only one process applies migrations at a time.
const LOCK_ID = 7_202_610

export interface Migration {
  name: string
  sql: string
}

export function loadMigrations(dir = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .filter((f) => /^\d+_[\w-]+\.sql$/.test(f))
    .sort()
    .map((name) => ({ name, sql: readFileSync(dir + name, 'utf8') }))
}

const ensureTable = `CREATE TABLE IF NOT EXISTS schema_migrations (
  name       text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`

/** Names of migrations that have not been applied yet. */
export async function pendingMigrations(pool: Pool, migrations = loadMigrations()): Promise<string[]> {
  const { rows } = await pool.query<{ exists: boolean }>(`SELECT to_regclass('schema_migrations') IS NOT NULL AS exists`)
  if (!rows[0].exists) return migrations.map((m) => m.name)
  const applied = new Set((await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
  return migrations.filter((m) => !applied.has(m.name)).map((m) => m.name)
}

/**
 * Applies pending migrations in name order, each in its own transaction.
 * Safe to run repeatedly and from several processes at once.
 * Returns the names of the migrations it applied.
 */
export async function migrate(pool: Pool, migrations = loadMigrations()): Promise<string[]> {
  const client = await pool.connect()
  const applied: string[] = []
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID])
    await client.query(ensureTable)
    const done = new Set((await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
    for (const m of migrations) {
      if (done.has(m.name)) continue
      try {
        await client.query('BEGIN')
        await client.query(m.sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [m.name])
        await client.query('COMMIT')
        applied.push(m.name)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${m.name} failed: ${(err as Error).message}`, { cause: err })
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {})
    client.release()
  }
  return applied
}
