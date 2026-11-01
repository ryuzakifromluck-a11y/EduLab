import pg from 'pg'
import type { PoolClient, PoolConfig } from 'pg'
import type { HypothesisRecord } from '../../src/lib/hypothesis.ts'
import type { ProgressRecord } from '../../src/lib/progressModel.ts'
import { EmailTakenError, type Store, type UserRow } from '../store.ts'

interface UserDbRow {
  id: string
  email: string
  name: string
  password_hash: string
  preferences: UserRow['preferences']
  created_at: Date
}

interface ProgressDbRow {
  experiment_id: string
  completed_at: Date
  last_completed_at: Date
  attempts: number
  best_score: number | null
  settings: ProgressRecord['settings']
}

const USER_COLUMNS = 'id, email, name, password_hash, preferences, created_at'
const PROGRESS_COLUMNS = 'experiment_id, completed_at, last_completed_at, attempts, best_score, settings'

const toUser = (r: UserDbRow): UserRow => ({
  id: r.id,
  email: r.email,
  name: r.name,
  passwordHash: r.password_hash,
  createdAt: r.created_at.toISOString(),
  preferences: r.preferences ?? {},
})

const toProgress = (r: ProgressDbRow): ProgressRecord => ({
  experimentId: r.experiment_id,
  completedAt: r.completed_at.toISOString(),
  lastCompletedAt: r.last_completed_at.toISOString(),
  attempts: r.attempts,
  bestScore: r.best_score,
  settings: r.settings ?? {},
})

// Not a valid UUID can never match a row; checking first avoids a Postgres cast error.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface PostgresStore extends Store {
  pool: pg.Pool
}

/**
 * PostgreSQL (or Supabase) store. Run `npm run migrate` first to create the tables.
 * Pass a `PoolConfig` (see ./config.ts) or an existing `pg.Pool`.
 */
export function postgresStore(config: PoolConfig | pg.Pool): PostgresStore {
  const pool = config instanceof pg.Pool ? config : new pg.Pool(config)
  // An idle client losing its connection must not crash the process; the pool replaces it.
  pool.on('error', (err) => console.error('PostgreSQL pool error:', err.message))

  async function transaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      client.release()
    }
  }

  return {
    pool,

    async findUserById(id) {
      if (!UUID.test(id)) return null
      const { rows } = await pool.query<UserDbRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id])
      return rows[0] ? toUser(rows[0]) : null
    },

    async findUserByEmail(email) {
      const { rows } = await pool.query<UserDbRow>(`SELECT ${USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`, [email])
      return rows[0] ? toUser(rows[0]) : null
    },

    async createUser(user) {
      try {
        await pool.query(
          `INSERT INTO users (id, email, name, password_hash, preferences, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.id, user.email, user.name, user.passwordHash, JSON.stringify(user.preferences ?? {}), user.createdAt],
        )
      } catch (err) {
        if ((err as { code?: string }).code === '23505' && (err as { constraint?: string }).constraint === 'users_email_key') {
          throw new EmailTakenError()
        }
        throw err
      }
    },

    async updateUser(user) {
      await pool.query(`UPDATE users SET name = $2, preferences = $3, updated_at = now() WHERE id = $1`, [
        user.id,
        user.name,
        JSON.stringify(user.preferences ?? {}),
      ])
    },

    async listProgress(userId) {
      if (!UUID.test(userId)) return []
      const { rows } = await pool.query<ProgressDbRow>(
        `SELECT ${PROGRESS_COLUMNS} FROM progress WHERE user_id = $1 ORDER BY completed_at, experiment_id`,
        [userId],
      )
      return rows.map(toProgress)
    },

    saveProgress(userId, experimentId, update) {
      return transaction(async (c) => {
        // Lock the row (if any) so two simultaneous completions both count.
        const lock = () =>
          c.query<ProgressDbRow>(`SELECT ${PROGRESS_COLUMNS} FROM progress WHERE user_id = $1 AND experiment_id = $2 FOR UPDATE`, [
            userId,
            experimentId,
          ])
        const values = (r: ProgressRecord) => [userId, experimentId, r.completedAt, r.lastCompletedAt, r.attempts, r.bestScore, JSON.stringify(r.settings)]
        const overwrite = (r: ProgressRecord) =>
          c.query(
            `UPDATE progress SET completed_at = $3, last_completed_at = $4, attempts = $5, best_score = $6, settings = $7
             WHERE user_id = $1 AND experiment_id = $2`,
            values(r),
          )

        const existing = (await lock()).rows[0]
        if (existing) {
          const next = update(toProgress(existing))
          await overwrite(next)
          return next
        }
        const first = update(undefined)
        const inserted = await c.query(
          `INSERT INTO progress (user_id, experiment_id, completed_at, last_completed_at, attempts, best_score, settings)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, experiment_id) DO NOTHING`,
          values(first),
        )
        if (inserted.rowCount) return first
        // Another request created the row between our SELECT and INSERT: lock it and apply on top.
        const next = update(toProgress((await lock()).rows[0]))
        await overwrite(next)
        return next
      })
    },

    async listHypotheses(userId) {
      if (!UUID.test(userId)) return []
      const { rows } = await pool.query<{ record: HypothesisRecord }>(
        `SELECT record FROM hypotheses WHERE user_id = $1 ORDER BY experiment_id`,
        [userId],
      )
      return rows.map((r) => r.record)
    },

    async saveHypothesis(userId, record) {
      // Write only if there is no row yet or ours is newer; otherwise return the stored copy.
      const { rows } = await pool.query<{ record: HypothesisRecord }>(
        `INSERT INTO hypotheses (user_id, experiment_id, record, updated_at) VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, experiment_id) DO UPDATE SET record = EXCLUDED.record, updated_at = EXCLUDED.updated_at
         WHERE hypotheses.updated_at <= EXCLUDED.updated_at
         RETURNING record`,
        [userId, record.experimentId, JSON.stringify(record), record.updatedAt],
      )
      if (rows[0]) return rows[0].record
      const current = await pool.query<{ record: HypothesisRecord }>(
        `SELECT record FROM hypotheses WHERE user_id = $1 AND experiment_id = $2`,
        [userId, record.experimentId],
      )
      return current.rows[0]?.record ?? record
    },

    async createSession(s) {
      await pool.query(`INSERT INTO sessions (id, user_id, created_at, expires_at, revoked_at) VALUES ($1, $2, $3, $4, $5)`, [
        s.id,
        s.userId,
        s.createdAt,
        s.expiresAt,
        s.revokedAt ?? null,
      ])
    },

    async isSessionActive(id, userId, now = new Date()) {
      if (!UUID.test(id) || !UUID.test(userId)) return false
      const { rowCount } = await pool.query(
        `SELECT 1 FROM sessions WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > $3`,
        [id, userId, now],
      )
      return !!rowCount
    },

    async revokeSession(id, now = new Date()) {
      if (!UUID.test(id)) return
      await pool.query(`UPDATE sessions SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL`, [id, now])
    },

    close: () => pool.end(),
  }
}

/** Deletes sessions that expired more than `graceDays` ago. Returns the number removed. */
export async function pruneSessions(pool: pg.Pool, graceDays = 7): Promise<number> {
  const { rowCount } = await pool.query(`DELETE FROM sessions WHERE expires_at < now() - make_interval(days => $1)`, [graceDays])
  return rowCount ?? 0
}
