/**
 * `npm run migrate`: creates or updates the PostgreSQL tables (server/migrations/*.sql).
 * Reads DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME from the environment, `.env.local` or `.env`.
 * Safe to run again: applied migrations are recorded in `schema_migrations` and skipped.
 *
 *   npm run migrate              apply pending migrations
 *   npm run migrate -- --status  list applied and pending migrations, change nothing
 */
import pg from 'pg'
import { databaseConfig, describeConfig } from '../server/db/config.ts'
import { loadLocalEnv } from '../server/db/env.ts'
import { loadMigrations, migrate, pendingMigrations } from '../server/db/migrate.ts'

loadLocalEnv()
const config = databaseConfig()
if (!config) {
  console.error('Set DATABASE_URL (or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) first. See .env.example.')
  process.exit(1)
}

const pool = new pg.Pool({ ...config, max: 1 })
try {
  if (process.argv.includes('--status')) {
    const pending = new Set(await pendingMigrations(pool))
    for (const m of loadMigrations()) console.log(`${pending.has(m.name) ? 'pending ' : 'applied '} ${m.name}`)
  } else {
    const applied = await migrate(pool)
    console.log(
      applied.length
        ? `Applied ${applied.length} migration(s) to ${describeConfig(config)}: ${applied.join(', ')}`
        : `Database ${describeConfig(config)} is up to date.`,
    )
  }
} catch (err) {
  console.error(err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}
