import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { HypothesisRecord } from '../src/lib/hypothesis.ts'
import type { ProgressRecord } from '../src/lib/progressModel.ts'

export interface UserPreferences {
  language?: string
  theme?: 'light' | 'dark'
}

export interface UserRow {
  id: string
  email: string
  name: string
  passwordHash: string
  createdAt: string
  preferences?: UserPreferences
}

export interface SessionRow {
  /** The token's `jti` claim. */
  id: string
  userId: string
  createdAt: string
  expiresAt: string
  revokedAt?: string | null
}

/** Thrown by `createUser` when the (normalized) email is already registered. */
export class EmailTakenError extends Error {
  constructor() {
    super('emailTaken')
  }
}

/**
 * Persistence used by the accounts API. Every method is async so the same API
 * code runs on the in-memory store (tests), the JSON file store (local dev
 * without a database) and PostgreSQL (`postgresStore` in ./postgresStore.ts).
 */
export interface Store {
  findUserById(id: string): Promise<UserRow | null>
  /** `email` must already be normalized. */
  findUserByEmail(email: string): Promise<UserRow | null>
  /** Throws `EmailTakenError` if the email is taken. */
  createUser(user: UserRow): Promise<void>
  /** Saves `name` and `preferences` of an existing user. */
  updateUser(user: UserRow): Promise<void>

  listProgress(userId: string): Promise<ProgressRecord[]>
  /**
   * Atomically reads the user's record for `experimentId`, passes it to
   * `update`, and saves the result, so concurrent completions are not lost.
   */
  saveProgress(
    userId: string,
    experimentId: string,
    update: (prev: ProgressRecord | undefined) => ProgressRecord,
  ): Promise<ProgressRecord>

  listHypotheses(userId: string): Promise<HypothesisRecord[]>
  /**
   * Saves `record` unless the stored copy is newer (`updatedAt`), and returns
   * whichever copy is kept, so another device's newer edit is never lost.
   */
  saveHypothesis(userId: string, record: HypothesisRecord): Promise<HypothesisRecord>

  createSession(session: SessionRow): Promise<void>
  /** True if the session exists, belongs to `userId`, is not revoked and not expired. */
  isSessionActive(id: string, userId: string, now?: Date): Promise<boolean>
  revokeSession(id: string, now?: Date): Promise<void>

  /** Releases connections (no-op for the JSON stores). */
  close(): Promise<void>
}

/** Shape of the legacy JSON database (`server/data/db.json`). */
export interface DbShape {
  users: UserRow[]
  /** userId → experimentId → record */
  progress: Record<string, Record<string, ProgressRecord>>
  sessions?: SessionRow[]
  /** userId → experimentId → latest hypothesis (optional: older databases do not have it). */
  hypotheses?: Record<string, Record<string, HypothesisRecord>>
}

const empty = (): DbShape => ({ users: [], progress: {}, sessions: [], hypotheses: {} })

/** A store over a single in-process document; `persist` is called after each change. */
function documentStore(initial: DbShape, persist: (db: DbShape) => void): Store {
  const db: DbShape = { ...empty(), ...structuredClone(initial) }
  db.sessions ??= []
  db.hypotheses ??= {}
  const clone = <T>(v: T): T => structuredClone(v)
  const save = () => persist(db)

  return {
    async findUserById(id) {
      const u = db.users.find((x) => x.id === id)
      return u ? clone(u) : null
    },
    async findUserByEmail(email) {
      const u = db.users.find((x) => x.email === email)
      return u ? clone(u) : null
    },
    async createUser(user) {
      if (db.users.some((u) => u.email === user.email)) throw new EmailTakenError()
      db.users.push(clone(user))
      save()
    },
    async updateUser(user) {
      const i = db.users.findIndex((u) => u.id === user.id)
      if (i < 0) return
      db.users[i] = { ...db.users[i], name: user.name, preferences: clone(user.preferences ?? {}) }
      save()
    },
    async listProgress(userId) {
      return clone(Object.values(db.progress[userId] ?? {}))
    },
    async saveProgress(userId, experimentId, update) {
      const mine = (db.progress[userId] ??= {})
      const record = update(mine[experimentId] ? clone(mine[experimentId]) : undefined)
      mine[experimentId] = clone(record)
      save()
      return record
    },
    async listHypotheses(userId) {
      return clone(Object.values(db.hypotheses![userId] ?? {}))
    },
    async saveHypothesis(userId, record) {
      const mine = (db.hypotheses![userId] ??= {})
      const current = mine[record.experimentId]
      if (current && current.updatedAt > record.updatedAt) return clone(current)
      mine[record.experimentId] = clone(record)
      save()
      return clone(record)
    },
    async createSession(session) {
      db.sessions!.push(clone(session))
      save()
    },
    async isSessionActive(id, userId, now = new Date()) {
      const s = db.sessions!.find((x) => x.id === id)
      return !!s && s.userId === userId && !s.revokedAt && Date.parse(s.expiresAt) > now.getTime()
    },
    async revokeSession(id, now = new Date()) {
      const s = db.sessions!.find((x) => x.id === id)
      if (s && !s.revokedAt) {
        s.revokedAt = now.toISOString()
        save()
      }
    },
    async close() {},
  }
}

export function memoryStore(initial: DbShape = empty()): Store {
  return documentStore(initial, () => {})
}

/** Reads a legacy JSON database file; a missing or unreadable file is an empty database. */
export function readJsonDb(path: string): DbShape {
  try {
    return { ...empty(), ...JSON.parse(readFileSync(path, 'utf8')) }
  } catch {
    return empty()
  }
}

/**
 * A JSON file database, written atomically. Kept for local development without
 * PostgreSQL; set `DATABASE_URL` to use the database instead.
 */
export function fileStore(path: string): Store {
  const now = Date.now()
  const initial = readJsonDb(path)
  // Drop expired sessions on load so the file does not grow forever.
  initial.sessions = (initial.sessions ?? []).filter((s) => Date.parse(s.expiresAt) > now)
  return documentStore(initial, (db) => {
    mkdirSync(dirname(path), { recursive: true })
    const tmp = `${path}.tmp`
    writeFileSync(tmp, JSON.stringify(db, null, 2))
    renameSync(tmp, path)
  })
}
