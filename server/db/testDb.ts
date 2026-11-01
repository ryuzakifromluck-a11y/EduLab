import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { migrate } from './migrate.ts'
import { postgresStore, type PostgresStore } from './postgresStore.ts'

/**
 * PostgreSQL tests run when TEST_DATABASE_URL is set, e.g.
 *   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/edulab_test npm test
 * Each test file gets its own throwaway schema, so files can run in parallel.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL

export interface TestDb {
  store: PostgresStore
  schema: string
  drop(): Promise<void>
}

export async function createTestDb(): Promise<TestDb> {
  if (!TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is not set')
  const schema = `test_${randomBytes(6).toString('hex')}`
  const admin = new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 1 })
  await admin.query(`CREATE SCHEMA ${schema}`)
  const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 5, options: `-c search_path=${schema}` })
  await migrate(pool)
  const store = postgresStore(pool)
  return {
    store,
    schema,
    async drop() {
      await store.close()
      await admin.query(`DROP SCHEMA ${schema} CASCADE`)
      await admin.end()
    },
  }
}
