import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  ROOM_CODE_LENGTH,
  isValidCode,
  isValidRoomCode,
  normalizeCode,
  type ClassControl,
  type HeartbeatResult,
  type PublicStudent,
  type RemoteReading,
  type RemoteSubject,
  type RoomAction,
  type RoomSummary,
  type RoomView,
  type SessionSummary,
  type SharedState,
  type StudentState,
} from '../src/lib/remoteCode.ts'
import { sanitizeSettings } from '../src/lib/progressModel.ts'
import { EXPERIMENTS } from '../src/data/experiments.ts'

export { CODE_ALPHABET, CODE_LENGTH, codeFromScan, formatCode, isValidCode, normalizeCode } from '../src/lib/remoteCode.ts'

/**
 * QR Remote Control sessions. A teacher opens a session and gets a short code
 * (shown as a QR code); students join with the code and push the state of the
 * experiment they have open every couple of seconds; the teacher polls the
 * session to see everyone at once.
 *
 * The teacher can also steer the class: send one experiment to everyone
 * (students may stay where they are) and lock every screen while they talk.
 * Students can form small rooms inside the session: one member, the
 * controller, moves the shared parameters and the others follow. Both ride the
 * existing heartbeat, so this needs no WebSocket server.
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
export const MAX_ROOMS = 30
export const MAX_ROOM_MEMBERS = 6
/** Experiments a teacher may send to the class: only ones that exist and are open. */
const PUSHABLE = new Map(EXPERIMENTS.filter((e) => e.status === 'available').map((e) => [e.id, e.subject as RemoteSubject]))

interface RoomRow {
  code: string
  controllerId: string | null
  /** Insertion order is join order: when the controller leaves, the longest-standing member takes over. */
  members: Set<string>
  requests: Set<string>
  shared: SharedState
}

interface StudentRow {
  id: string
  key: string
  name: string
  joinedAt: number
  lastSeen: number
  state: StudentState
  roomCode: string | null
}

interface SessionRow {
  code: string
  teacherKey: string
  createdAt: number
  expiresAt: number
  students: Map<string, StudentRow>
  control: ClassControl
  pushSeq: number
  rooms: Map<string, RoomRow>
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
const emptyShared = (now: number): SharedState => ({ experimentId: null, subject: null, settings: {}, params: [], readings: [], running: false, version: 0, updatedAt: now })

export function generateRoomCode(random?: (n: number) => Uint8Array): string {
  return generateCode(random).slice(0, ROOM_CODE_LENGTH)
}

const ROOM_ACTIONS: readonly RoomAction[] = ['create', 'join', 'leave', 'handover', 'request', 'claim']

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
  const isOnline = (row: StudentRow | undefined) => !!row && now() - row.lastSeen < STUDENT_STALE_MS

  function teacherOf(code: string, teacherKey: string): SessionRow {
    const s = get(code)
    if (!sameSecret(s.teacherKey, teacherKey)) throw new RemoteError(403, 'notTeacher')
    return s
  }

  /** Takes a student out of their room; hands control on, and drops the room once it is empty. */
  function leaveRoom(s: SessionRow, row: StudentRow) {
    const room = row.roomCode ? s.rooms.get(row.roomCode) : undefined
    row.roomCode = null
    if (!room) return
    room.members.delete(row.id)
    room.requests.delete(row.id)
    if (!room.members.size) s.rooms.delete(room.code)
    else if (room.controllerId === row.id) room.controllerId = room.members.values().next().value ?? null
  }

  function roomView(s: SessionRow, row: StudentRow): RoomView | null {
    const room = row.roomCode ? s.rooms.get(row.roomCode) : undefined
    if (!room) return null
    const members = [...room.members].flatMap((id) => {
      const m = s.students.get(id)
      return m ? [{ id, name: m.name, online: isOnline(m) }] : []
    })
    return { code: room.code, controllerId: room.controllerId, members, requests: [...room.requests], shared: room.shared }
  }

  const controlOf = (s: SessionRow): ClassControl => ({ push: s.control.push, locked: s.control.locked })

  return {
    /** Opens a session. The teacher key is returned once and is needed to watch the class. */
    create() {
      sweep()
      if (sessions.size >= MAX_SESSIONS) throw new RemoteError(503, 'tooManySessions')
      let code = generateCode()
      while (sessions.has(code)) code = generateCode()
      const t = now()
      const row: SessionRow = {
        code,
        teacherKey: randomBytes(24).toString('base64url'),
        createdAt: t,
        expiresAt: t + ttl,
        students: new Map(),
        control: { push: null, locked: false },
        pushSeq: 0,
        rooms: new Map(),
      }
      sessions.set(code, row)
      return { ...summary(row), teacherKey: row.teacherKey }
    },

    /** What a student may see before joining: that the session exists and when it ends. */
    info(code: string): SessionSummary {
      return summary(get(code))
    },

    /** The teacher's view: every student and their latest state, the class controls and the rooms. */
    watch(code: string, teacherKey: string): SessionSummary & { students: PublicStudent[]; control: ClassControl; rooms: RoomSummary[] } {
      const s = teacherOf(code, teacherKey)
      const t = now()
      const students = [...s.students.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map(({ id, name, joinedAt, lastSeen, state, roomCode }) => ({ id, name, joinedAt, lastSeen, online: t - lastSeen < STUDENT_STALE_MS, state, roomCode }))
      const rooms = [...s.rooms.values()].map((r) => ({ code: r.code, controllerId: r.controllerId, memberIds: [...r.members] }))
      return { ...summary(s), students, control: controlOf(s), rooms }
    },

    /**
     * The teacher steers the class. `push`: an experiment id sends it to everyone, null withdraws it;
     * `locked`: true freezes every student's screen until it is false again. Missing fields stay as they are.
     */
    control(code: string, teacherKey: string, body: Record<string, unknown>): ClassControl {
      const s = teacherOf(code, teacherKey)
      if ('push' in body) {
        if (body.push === null) s.control.push = null
        else {
          const id = typeof body.push === 'string' ? body.push : ''
          const subject = PUSHABLE.get(id)
          if (!subject) throw new RemoteError(400, 'invalidExperiment')
          s.control.push = { experimentId: id, subject, seq: ++s.pushSeq, at: now() }
        }
      }
      if ('locked' in body) {
        if (typeof body.locked !== 'boolean') throw new RemoteError(400, 'invalidControl')
        s.control.locked = body.locked
      }
      return controlOf(s)
    },

    join(code: string, rawName: unknown) {
      const s = get(code)
      const name = sanitizeName(rawName)
      if (!name) throw new RemoteError(400, 'nameRequired')
      if (s.students.size >= MAX_STUDENTS) throw new RemoteError(409, 'sessionFull')
      const t = now()
      const row: StudentRow = { id: randomUUID(), key: randomBytes(18).toString('base64url'), name, joinedAt: t, lastSeen: t, state: emptyState(t), roomCode: null }
      s.students.set(row.id, row)
      return { studentId: row.id, studentKey: row.key, name, ...summary(s) }
    },

    /**
     * A student's heartbeat; carries the experiment they have open, if any. A room's controller
     * also sends `settings`, which become the room's shared state. The answer carries the
     * teacher's controls and the student's room, so students need no second channel.
     */
    report(code: string, body: Record<string, unknown>): HeartbeatResult {
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
      const room = row.roomCode ? s.rooms.get(row.roomCode) : undefined
      // Only the controller writes the shared state, and nobody does while the teacher has the class locked.
      if (room && room.controllerId === row.id && !s.control.locked && 'settings' in body) {
        const { experimentId: id, subject: sub, params, readings, running } = row.state
        const settings = id ? sanitizeSettings(body.settings) : {}
        const prev = room.shared
        const changed = JSON.stringify([prev.experimentId, prev.settings, prev.params, prev.readings, prev.running]) !== JSON.stringify([id, settings, params, readings, running])
        if (changed) room.shared = { experimentId: id, subject: sub, settings, params, readings, running, version: prev.version + 1, updatedAt: t }
      }
      return { ok: true as const, expiresAt: s.expiresAt, control: controlOf(s), room: roomView(s, row) }
    },

    /**
     * Shared rooms inside a session. Who controls:
     *  - whoever creates a room controls it;
     *  - the controller can hand control to any member (`handover`), and members can ask for it (`request`);
     *  - if the controller goes offline any member may take over (`claim`); if they leave, the longest-standing member does;
     *  - while the teacher has the class locked, nothing in a room changes.
     */
    room(code: string, body: Record<string, unknown>): RoomView | null {
      const s = get(code)
      const row = student(s, body.studentId, body.studentKey)
      const action = ROOM_ACTIONS.find((a) => a === body.action)
      if (!action) throw new RemoteError(400, 'invalidRoomAction')
      if (s.control.locked && action !== 'leave') throw new RemoteError(423, 'classLocked')
      const current = row.roomCode ? s.rooms.get(row.roomCode) : undefined
      const t = now()
      switch (action) {
        case 'create': {
          leaveRoom(s, row)
          if (s.rooms.size >= MAX_ROOMS) throw new RemoteError(409, 'tooManyRooms')
          let roomCode = generateRoomCode()
          while (s.rooms.has(roomCode)) roomCode = generateRoomCode()
          s.rooms.set(roomCode, { code: roomCode, controllerId: row.id, members: new Set([row.id]), requests: new Set(), shared: emptyShared(t) })
          row.roomCode = roomCode
          break
        }
        case 'join': {
          const roomCode = normalizeCode(typeof body.roomCode === 'string' ? body.roomCode : '')
          if (!isValidRoomCode(roomCode)) throw new RemoteError(400, 'invalidRoomCode')
          const room = s.rooms.get(roomCode)
          if (!room) throw new RemoteError(404, 'roomNotFound')
          if (room === current) break
          if (room.members.size >= MAX_ROOM_MEMBERS) throw new RemoteError(409, 'roomFull')
          leaveRoom(s, row)
          room.members.add(row.id)
          row.roomCode = roomCode
          break
        }
        case 'leave':
          leaveRoom(s, row)
          break
        case 'handover': {
          if (!current || current.controllerId !== row.id) throw new RemoteError(403, 'notController')
          const to = typeof body.to === 'string' ? body.to : ''
          if (!current.members.has(to)) throw new RemoteError(400, 'notInRoom')
          current.controllerId = to
          current.requests.delete(to)
          break
        }
        case 'request':
          if (!current) throw new RemoteError(409, 'notInRoom')
          if (current.controllerId !== row.id) current.requests.add(row.id)
          break
        case 'claim': {
          if (!current) throw new RemoteError(409, 'notInRoom')
          const holder = current.controllerId ? s.students.get(current.controllerId) : undefined
          if (current.controllerId !== row.id && isOnline(holder)) throw new RemoteError(409, 'controllerOnline')
          current.controllerId = row.id
          current.requests.delete(row.id)
          break
        }
      }
      return roomView(s, row)
    },

    leave(code: string, body: Record<string, unknown>) {
      const s = get(code)
      const row = student(s, body.studentId, body.studentKey)
      leaveRoom(s, row)
      s.students.delete(row.id)
      return { ok: true as const }
    },

    close(code: string, teacherKey: string) {
      const s = teacherOf(code, teacherKey)
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
