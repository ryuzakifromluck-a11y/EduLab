import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp, type SameSite } from './app.ts'
import { databaseConfig, describeConfig } from './db/config.ts'
import { loadLocalEnv } from './db/env.ts'
import { pendingMigrations } from './db/migrate.ts'
import { postgresStore, pruneSessions } from './db/postgresStore.ts'
import { fileStore, type Store } from './store.ts'

/**
 * EduLab accounts API. Run with `npm run api` (Node 22.18+ runs TypeScript directly).
 *
 *   PORT          default 8787
 *   JWT_SECRET    required in production; in development one is generated and kept in server/data
 *   DATABASE_URL  PostgreSQL / Supabase connection string (or DB_HOST, DB_USER, DB_PASSWORD, ...;
 *                 see server/db/config.ts). Run `npm run migrate` once before starting.
 *   EDULAB_DB     without a database: JSON file path, default server/data/db.json (in production only
 *                 used when set explicitly)
 *   CORS_ORIGINS     comma-separated exact origins allowed to call the API from another origin,
 *                    e.g. https://edulab.example. Same-origin requests need no entry. No wildcard.
 *                    Default in development: the Vite dev and preview servers on localhost.
 *   COOKIE_SECURE    1/0. Default 1 in production, 0 in development (plain http://localhost).
 *   COOKIE_SAMESITE  Lax (default), Strict, or None (only when the app and API are on different sites).
 *   TRUST_PROXY      1 when a reverse proxy you control sets X-Forwarded-For / X-Real-IP (used for rate limits).
 */

loadLocalEnv()
const isProduction = process.env.NODE_ENV === 'production'
const dataDir = fileURLToPath(new URL('./data/', import.meta.url))
const dbPath = resolve(process.env.EDULAB_DB ?? join(dataDir, 'db.json'))

function devSecret(): string {
  const file = join(dirname(dbPath), '.jwt-secret')
  try {
    return readFileSync(file, 'utf8').trim()
  } catch {
    const generated = randomBytes(32).toString('hex')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, generated, { mode: 0o600 })
    return generated
  }
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

let secret = process.env.JWT_SECRET
if (!secret) {
  if (isProduction) fail('JWT_SECRET must be set in production. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  secret = devSecret()
}
if (isProduction && secret.length < 32) fail('JWT_SECRET must be at least 32 characters.')

const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173']
const corsOrigins = (process.env.CORS_ORIGINS ?? (isProduction ? '' : DEV_ORIGINS.join(',')))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
if (corsOrigins.includes('*')) fail('CORS_ORIGINS no longer accepts "*". List the exact origins of your web app, e.g. https://edulab.example')

const sameSite = (process.env.COOKIE_SAMESITE ?? 'Lax') as SameSite
if (!['Lax', 'Strict', 'None'].includes(sameSite)) fail('COOKIE_SAMESITE must be Lax, Strict or None.')

const dbConfig = databaseConfig()
let store: Store
let target: string

if (dbConfig) {
  const pg = postgresStore(dbConfig)
  target = `postgres ${describeConfig(dbConfig)}`
  try {
    const pending = await pendingMigrations(pg.pool)
    if (pending.length) fail(`Database is missing migrations (${pending.join(', ')}). Run \`npm run migrate\` first.`)
  } catch (err) {
    fail(`Cannot connect to ${target}: ${(err as Error).message}`)
  }
  // Clear out long-expired sessions at start and once a day.
  const prune = () => pruneSessions(pg.pool).catch((err) => console.error('Session cleanup failed:', err.message))
  void prune()
  setInterval(prune, 24 * 60 * 60 * 1000).unref()
  store = pg
} else {
  // Production needs a database, unless the JSON file is chosen explicitly with EDULAB_DB.
  if (isProduction && !process.env.EDULAB_DB) fail('DATABASE_URL (or DB_HOST) must be set in production. See .env.example.')
  store = fileStore(dbPath)
  target = `${dbPath} (JSON file; set DATABASE_URL to use PostgreSQL)`
}

let handle: ReturnType<typeof createApp> | undefined
try {
  handle = createApp({
    store,
    jwtSecret: secret,
    corsOrigins,
    cookie: { secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === '1' : isProduction, sameSite },
    trustProxy: process.env.TRUST_PROXY === '1',
  })
} catch (err) {
  fail(err instanceof Error ? err.message : String(err))
}

const port = Number(process.env.PORT ?? 8787)
const server = createServer(handle!).listen(port, () => console.log(`EduLab API listening on http://localhost:${port} (db: ${target})`))

const shutdown = () => {
  server.close(() => void store.close().finally(() => process.exit(0)))
  setTimeout(() => process.exit(0), 5000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
