import type { Pool } from 'pg'
import type { DbShape } from '../store.ts'

export interface ImportResult {
  usersImported: number
  usersSkipped: number
  progressImported: number
  progressSkipped: number
  /** Human-readable reasons for records that could not be imported. */
  invalid: string[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXPERIMENT_ID = /^[a-z0-9-]{1,64}$/
const validDate = (v: unknown) => typeof v === 'string' && !Number.isNaN(Date.parse(v))

/**
 * Copies a legacy JSON database into PostgreSQL in a single transaction.
 * Existing users (same id or email) are left untouched, and so is their progress.
 * Sessions are not imported: tokens issued by the JSON server keep working until they expire.
 */
export async function importJsonDb(pool: Pool, db: DbShape): Promise<ImportResult> {
  const result: ImportResult = { usersImported: 0, usersSkipped: 0, progressImported: 0, progressSkipped: 0, invalid: [] }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const imported = new Set<string>()
    for (const u of db.users ?? []) {
      if (!u || !UUID.test(u.id ?? '') || !u.email || !u.passwordHash?.startsWith('scrypt$')) {
        result.invalid.push(`user ${u?.email ?? u?.id ?? '?'}: missing id, email or scrypt password hash`)
        continue
      }
      const r = await client.query(
        `INSERT INTO users (id, email, name, password_hash, preferences, created_at)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [
          u.id,
          u.email.trim().toLowerCase(),
          u.name ?? '',
          u.passwordHash,
          JSON.stringify(u.preferences ?? {}),
          validDate(u.createdAt) ? u.createdAt : new Date().toISOString(),
        ],
      )
      if (r.rowCount) {
        result.usersImported++
        imported.add(u.id)
      } else result.usersSkipped++
    }

    for (const [userId, records] of Object.entries(db.progress ?? {})) {
      for (const [experimentId, p] of Object.entries(records ?? {})) {
        if (!imported.has(userId)) {
          result.progressSkipped++
          continue
        }
        if (!EXPERIMENT_ID.test(experimentId) || !validDate(p?.completedAt)) {
          result.invalid.push(`progress ${userId}/${experimentId}: bad experiment id or date`)
          continue
        }
        const best = typeof p.bestScore === 'number' ? Math.max(0, Math.min(100, p.bestScore)) : null
        await client.query(
          `INSERT INTO progress (user_id, experiment_id, completed_at, last_completed_at, attempts, best_score, settings)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
          [
            userId,
            experimentId,
            p.completedAt,
            validDate(p.lastCompletedAt) ? p.lastCompletedAt : p.completedAt,
            Number.isInteger(p.attempts) && p.attempts > 0 ? p.attempts : 1,
            best,
            JSON.stringify(p.settings ?? {}),
          ],
        )
        result.progressImported++
      }
    }
    for (const [userId, records] of Object.entries(db.hypotheses ?? {})) {
      if (!imported.has(userId)) continue
      for (const [experimentId, h] of Object.entries(records ?? {})) {
        if (!EXPERIMENT_ID.test(experimentId) || !h || !validDate(h.updatedAt)) continue
        await client.query(
          `INSERT INTO hypotheses (user_id, experiment_id, record, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
          [userId, experimentId, JSON.stringify({ ...h, experimentId }), h.updatedAt],
        )
      }
    }
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
