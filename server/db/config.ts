import type { PoolConfig } from 'pg'

/**
 * Database connection settings from the environment.
 *
 *   DATABASE_URL  postgres://user:password@host:5432/edulab  (Supabase: the "Connection string" in
 *                 Project Settings → Database; add ?sslmode=require). Takes precedence over DB_*.
 *   DB_HOST, DB_PORT (5432), DB_USER, DB_PASSWORD, DB_NAME (edulab)
 *   DB_SSL        "true" to require TLS when using DB_* (certificates are verified)
 *   DB_POOL_MAX   connections per API instance, default 10
 *
 * Returns null when neither DATABASE_URL nor DB_HOST is set.
 */
export function databaseConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig | null {
  const max = Number(env.DB_POOL_MAX) || 10
  if (env.DATABASE_URL) return { connectionString: env.DATABASE_URL, max }
  if (!env.DB_HOST) return null
  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 5432,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME || 'edulab',
    ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    max,
  }
}

/** Connection target without the password, for log lines. */
export function describeConfig(config: PoolConfig): string {
  if (config.connectionString) {
    try {
      const u = new URL(config.connectionString)
      return `${u.hostname}${u.port ? `:${u.port}` : ''}${u.pathname}`
    } catch {
      return 'DATABASE_URL'
    }
  }
  return `${config.host}:${config.port}/${config.database}`
}
