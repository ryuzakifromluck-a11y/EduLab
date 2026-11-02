import pg from 'pg'
import { databaseConfig } from '../db/config.js'
import { handleAnalyticsRequest, type AnalyticsEnv, type AnalyticsStore } from './handler.js'
import { postgresAnalyticsStore } from './postgresStore.js'

declare const process: { env: AnalyticsEnv & Record<string, string | undefined> }

/**
 * Shared entry point for the api/analytics/* Vercel Functions. One small pool per
 * function instance, reused across invocations. Use a pooled connection string
 * (e.g. Supabase "Transaction pooler", port 6543) so many instances share few connections.
 */
let store: AnalyticsStore | null | undefined

function getStore(): AnalyticsStore | null {
  if (store !== undefined) return store
  const config = databaseConfig(process.env)
  if (!config) {
    console.warn('[analytics] DATABASE_URL is not set; /api/analytics answers 503 and the site shows demo data.')
    return (store = null)
  }
  const pool = new pg.Pool({
    ...config,
    max: Number(process.env.DB_POOL_MAX) || 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  })
  // An idle client losing its connection must not crash the instance.
  pool.on('error', (err) => console.error(`[analytics] idle database client error: ${err.message}`))
  return (store = postgresAnalyticsStore(pool))
}

export function handleVercelAnalytics(request: Request): Promise<Response> {
  return handleAnalyticsRequest(request, process.env, { store: getStore() })
}
