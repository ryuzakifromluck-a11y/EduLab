import { readFileSync } from 'node:fs'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hashPassword } from '../password.ts'
import { readJsonDb, type DbShape } from '../store.ts'
import { databaseConfig } from './config.ts'
import { importJsonDb } from './importJson.ts'
import { loadMigrations, migrate, pendingMigrations } from './migrate.ts'
import { createTestDb, TEST_DATABASE_URL, type TestDb } from './testDb.ts'

describe('databaseConfig', () => {
  it('prefers DATABASE_URL, falls back to DB_* and is null without either', () => {
    expect(databaseConfig({ DATABASE_URL: 'postgres://u:p@h/db', DB_HOST: 'x' })).toMatchObject({ connectionString: 'postgres://u:p@h/db' })
    expect(databaseConfig({ DB_HOST: 'db', DB_USER: 'u', DB_PASSWORD: 'p' })).toMatchObject({ host: 'db', port: 5432, user: 'u', database: 'edulab' })
    expect(databaseConfig({})).toBeNull()
  })

  it('creates every table and index the API needs', () => {
    const sql = loadMigrations().map((m) => m.sql).join('\n')
    for (const t of ['users', 'progress', 'sessions', 'remote_sessions', 'analytics_counters']) expect(sql).toContain(`CREATE TABLE ${t} (`)
    expect(sql).toMatch(/UNIQUE INDEX users_email_key ON users \(lower\(email\)\)/)
    expect(sql).toMatch(/INDEX progress_experiment_id_idx ON progress \(experiment_id\)/)
  })

  it('ships an .env.example that documents the database settings', () => {
    const env = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8')
    for (const key of ['DATABASE_URL', 'DB_HOST', 'DB_USER', 'DB_PASSWORD']) expect(env).toMatch(new RegExp(`^${key}=`, 'm'))
  })

  it('reads a missing JSON database as empty', () => {
    expect(readJsonDb('/nonexistent/db.json')).toMatchObject({ users: [], progress: {} })
  })
})

describe.skipIf(!TEST_DATABASE_URL)('PostgreSQL', () => {
  let db: TestDb
  let pool: pg.Pool
  beforeAll(async () => {
    db = await createTestDb()
    pool = db.store.pool
  })
  afterAll(() => db?.drop())

  it('migrations are recorded and re-running them is a no-op', async () => {
    expect(await pendingMigrations(pool)).toEqual([])
    expect(await migrate(pool)).toEqual([])
    const { rows } = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY 1`, [db.schema])
    expect(rows.map((r) => r.tablename)).toEqual(['analytics_counters', 'hypotheses', 'progress', 'remote_sessions', 'schema_migrations', 'sessions', 'users'])
  })

  it('enforces unique emails case-insensitively', async () => {
    const user = { id: crypto.randomUUID(), email: 'case@example.com', name: 'C', passwordHash: await hashPassword('abcdefg1'), createdAt: new Date().toISOString() }
    await db.store.createUser(user)
    await expect(db.store.createUser({ ...user, id: crypto.randomUUID(), email: 'CASE@example.com' })).rejects.toThrow('emailTaken')
    expect((await db.store.findUserByEmail('case@example.com'))?.id).toBe(user.id)
  })

  it('returns nothing for ids that are not UUIDs instead of erroring', async () => {
    expect(await db.store.findUserById('not-a-uuid')).toBeNull()
    expect(await db.store.isSessionActive('x', 'y')).toBe(false)
  })

  it('imports a JSON database, keeps passwords, and is safe to run twice', async () => {
    const id = crypto.randomUUID()
    const json: DbShape = {
      users: [
        { id, email: 'legacy@example.com', name: 'Legacy', passwordHash: await hashPassword('oldpass12'), createdAt: '2026-01-02T03:04:05.000Z', preferences: { theme: 'dark' } },
        { id: 'broken', email: '', name: '', passwordHash: 'plain', createdAt: '' },
      ],
      progress: {
        [id]: {
          pendulum: { experimentId: 'pendulum', completedAt: '2026-02-01T00:00:00.000Z', lastCompletedAt: '2026-03-01T00:00:00.000Z', attempts: 3, bestScore: 90, settings: { length: 1.2 } },
        },
      },
    }
    const first = await importJsonDb(pool, json)
    expect(first).toMatchObject({ usersImported: 1, progressImported: 1, invalid: [expect.stringContaining('user')] })
    const again = await importJsonDb(pool, json)
    expect(again).toMatchObject({ usersImported: 0, usersSkipped: 1, progressImported: 0 })

    const user = await db.store.findUserByEmail('legacy@example.com')
    expect(user).toMatchObject({ id, name: 'Legacy', createdAt: '2026-01-02T03:04:05.000Z', preferences: { theme: 'dark' } })
    expect(user!.passwordHash).toBe(json.users[0].passwordHash)
    expect(await db.store.listProgress(id)).toEqual([json.progress[id].pendulum])
  })
})
