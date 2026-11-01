/**
 * `npm run import-json [-- path/to/db.json]`: copies users and progress from the old JSON
 * database (default: $EDULAB_DB or server/data/db.json) into PostgreSQL.
 *
 * Runs pending migrations first, then imports everything in one transaction. User ids and
 * password hashes are kept, so people sign in with the same password. Safe to run again:
 * users that already exist (same id or email) and their progress rows are skipped, never overwritten.
 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { databaseConfig, describeConfig } from '../server/db/config.ts'
import { loadLocalEnv } from '../server/db/env.ts'
import { migrate } from '../server/db/migrate.ts'
import { importJsonDb } from '../server/db/importJson.ts'
import { readJsonDb } from '../server/store.ts'
import { existsSync } from 'node:fs'

loadLocalEnv()
const config = databaseConfig()
if (!config) {
  console.error('Set DATABASE_URL (or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) first. See .env.example.')
  process.exit(1)
}

const arg = process.argv.slice(2).find((a) => !a.startsWith('-'))
const path = resolve(arg ?? process.env.EDULAB_DB ?? fileURLToPath(new URL('../server/data/db.json', import.meta.url)))
if (!existsSync(path)) {
  console.error(`No JSON database at ${path}. Pass the path: npm run import-json -- path/to/db.json`)
  process.exit(1)
}

const pool = new pg.Pool({ ...config, max: 1 })
try {
  await migrate(pool)
  const r = await importJsonDb(pool, readJsonDb(path))
  console.log(`Imported from ${path} into ${describeConfig(config)}:`)
  console.log(`  users     ${r.usersImported} imported, ${r.usersSkipped} already present`)
  console.log(`  progress  ${r.progressImported} imported, ${r.progressSkipped} skipped`)
  if (r.invalid.length) console.log(`  invalid   ${r.invalid.length} record(s) not imported:\n    ${r.invalid.join('\n    ')}`)
} catch (err) {
  console.error(`Import failed, nothing was changed: ${err.message}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
