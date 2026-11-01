import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  isValidCode,
  normalizeCode,
  type PublicStudent,
  type RemoteReading,
  type SessionSummary,
  type StudentState,
} from '../src/lib/remoteCode.ts'

export { CODE_ALPHABET, CODE_LENGTH, codeFromScan, formatCode, isValidCode, normalizeCode } from '../src/lib/remoteCode.ts'

/**
 * QR Remote Control sessions. A teacher opens a session and gets a short code
 * (shown as a QR code); students join with the code and push the state of the
 * experiment they have open every couple of seconds; the teacher polls the
 * session to see everyone at once.
 *
 * Sessions are short-lived (30 minutes) and deliberately kept in memory: they
 * hold no personal data beyond a display name, and a restart simply ends the
 * class. Run a single API instance (as `npm run api` does) or move this
 * registry to a shared store before scaling out.
 */

export const SESSION_TTL_MS = 30 * 60 * 1000
/** A student who has not reported for this long is shown as offline. */
export const STUDENT_STALE_MS = 10 * 1000
export const MAX_STUDENTS = 60
export const MAX_SESSIONS = 1000
const MAX_READINGS = 16
const MAX_TEXT = 64
const EXPERIMENT_ID = /^[a-z0-9-]{1,64}$/
const SUBJECTS = ['physics', 'chemistry', 'biology'] as const

interface StudentRow {
  id: string
  key: string
  name: string
  joinedAt: number
  lastSeen: number
  state: StudentState
}

interface SessionRow {
  code: string
  teacherKey: string
  createdAt: number
  expiresAt: number
  students: Map<string, StudentRow>
}

export class RemoteError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

export function generateCode(random: (n: number) => Uint8Array = (n) => randomBytes(n)): string {
  let out = ''
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % CODE_ALPHABET.length)
  while (out.length < CODE_LENGTH) {
    for (const b of random(CODE_LENGTH * 2)) {
      if (b < limit && out.length < CODE_LENGTH) out += CODE_ALPHABET[b % CODE_ALPHABET.length]
    }
  }
  return out
}

const clip = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function sanitizeReadings(input: unknown): RemoteReading[] {
  if (!Array.isArray(input)) return []
  return input.slice(0, MAX_READINGS).flatMap((r) => {
    if (!r || typeof r !== 'object') return []
    const { label, value, unit } = r as Record<string, unknown>
    const out: RemoteReading = { label: clip(label), value: clip(value, 32) }
    if (!out.label) return []
    const u = clip(unit, 16)
    if (u) out.unit = u
    return [out]
  })
}

export function sanitizeName(input: unknown): string {
  // Collapse whitespace and drop control characters; names are shown on the teacher's screen.
  return clip(typeof input === 'string' ? input.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ') : '', 40)
}

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

const emptyState = (now: number): StudentState => ({ experimentId: null, subject: null, params: [], readings: [], running: false, updatedAt: now })

export function createRemoteRegistry({ now = () => Date.now(), ttl = SESSION_TTL_MS } = {}) {
  const sessions = new Map<string, SessionRow>()

  function sweep() {
    const t = now()
    for (const [code, s] of sessions) if (s.expiresAt <= t) sessions.delete(code)
  }

  function get(rawCode: string): SessionRow {
    const code = normalizeCode(rawCode)
    if (!isValidCode(code)) throw new RemoteError(400, 'invalidCode')
    const s = sessions.get(code)
    if (!s || s.expiresAt <= now()) {
      sessions.delete(code)
      throw new RemoteError(404, 'sessionNotFound')
    }
    return s
  }

  function student(s: SessionRow, id: unknown, key: unknown): StudentRow {
    const row = typeof id === 'string' ? s.students.get(id) : undefined
    if (!row || typeof key !== 'string' || !sameSecret(row.key, key)) throw new RemoteError(403, 'notInSession')
    return row
  }

  const summary = (s: SessionRow): SessionSummary => ({ code: s.code, createdAt: s.createdAt, expiresAt: s.expiresAt, studentCount: s.students.size })

  return {
    /** Opens a session. The teacher key is returned once and is needed to watch the class. */
    create() {
      sweep()
      if (sessions.size >= MAX_SESSIONS) throw new RemoteError(503, 'tooManySessions')
      let code = generateCode()
      while (sessions.has(code)) code = generateCode()
      const t = now()
      const row: SessionRow = { code, teacherKey: randomBytes(24).toString('base64url'), createdAt: t, expiresAt: t + ttl, students: new Map() }
      sessions.set(code, row)
      return { ...summary(row), teacherKey: row.teacherKey }
    },

    /** What a student may see before joining: that the session exists and when it ends. */
    info(code: string): SessionSummary {
      return summary(get(code))
    },

    /** The teacher's view: every student and their latest state. */
    watch(code: string, teacherKey: string): SessionSummary & { students: PublicStudent[] } {
      const s = get(code)
      if (!sameSecret(s.teacherKey, teacherKey)) throw new RemoteError(403, 'notTeacher')
      const t = now()
      const students = [...s.students.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map(({ id, name, joinedAt, lastSeen, state }) => ({ id, name, joinedAt, lastSeen, online: t - lastSeen < STUDENT_STALE_MS, state }))
      return { ...summary(s), students }
    },

    join(code: string, rawName: unknown) {
      const s = get(code)
      const name = sanitizeName(rawName)
      if (!name) throw new RemoteError(400, 'nameRequired')
      if (s.students.size >= MAX_STUDENTS) throw new RemoteError(409, 'sessionFull')
      const t = now()
      const row: StudentRow = { id: randomUUID(), key: randomBytes(18).toString('base64url'), name, joinedAt: t, lastSeen: t, state: emptyState(t) }
      s.students.set(row.id, row)
      return { studentId: row.id, studentKey: row.key, name, ...summary(s) }
    },

    /** A student's heartbeat; carries the experiment they have open, if any. */
    report(code: string, body: Record<string, unknown>) {
      const s = get(code)
      const row = student(s, body.studentId, body.studentKey)
      const t = now()
      const experimentId = typeof body.experimentId === 'string' && EXPERIMENT_ID.test(body.experimentId) ? body.experimentId : null
      const subject = SUBJECTS.find((x) => x === body.subject) ?? null
      row.lastSeen = t
      row.state = {
        experimentId,
        subject: experimentId ? subject : null,
        params: experimentId ? sanitizeReadings(body.params) : [],
        readings: experimentId ? sanitizeReadings(body.readings) : [],
        running: experimentId ? body.running === true : false,
        updatedAt: t,
      }
      return { ok: true as const, expiresAt: s.expiresAt }
    },

    leave(code: string, body: Record<string, unknown>) {
      const s = get(code)
      const row = student(s, body.studentId, body.studentKey)
      s.students.delete(row.id)
      return { ok: true as const }
    },

    close(code: string, teacherKey: string) {
      const s = get(code)
      if (!sameSecret(s.teacherKey, teacherKey)) throw new RemoteError(403, 'notTeacher')
      sessions.delete(s.code)
      return { ok: true as const }
    },

    /** For tests and diagnostics. */
    size() {
      sweep()
      return sessions.size
    },
  }
}

export type RemoteRegistry = ReturnType<typeof createRemoteRegistry>
