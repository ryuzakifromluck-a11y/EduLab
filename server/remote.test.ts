import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  MAX_ROOM_MEMBERS,
  MAX_STUDENTS,
  SESSION_TTL_MS,
  STUDENT_STALE_MS,
  createRemoteRegistry,
  formatCode,
  generateCode,
  isValidCode,
  normalizeCode,
  sanitizeName,
} from './remote.ts'
import { memoryStore } from './store.ts'

describe('session codes', () => {
  it('are 6 unambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode()
      expect(code).toHaveLength(CODE_LENGTH)
      expect(isValidCode(code)).toBe(true)
      expect(code).not.toMatch(/[01OIL]/)
    }
  })

  it('are normalized from what a student types', () => {
    expect(normalizeCode(' abc-23x ')).toBe('ABC23X')
    expect(formatCode('ABC23X')).toBe('ABC-23X')
    expect(isValidCode('ABC12')).toBe(false)
    expect(isValidCode('ABC10X')).toBe(false)
  })

  it('use every alphabet character without bias from the byte source', () => {
    let i = 0
    // A byte source that walks 0..255 hits every character equally often after rejection.
    const seen = new Set<string>()
    for (let n = 0; n < 60; n++) for (const c of generateCode((len) => Uint8Array.from({ length: len }, () => i++ % 256))) seen.add(c)
    expect(seen.size).toBe(CODE_ALPHABET.length)
  })
})

describe('sanitizeName', () => {
  it('trims, collapses whitespace, strips control characters and caps length', () => {
    expect(sanitizeName('  Ada \n  Lovelace\u0007 ')).toBe('Ada Lovelace')
    expect(sanitizeName('x'.repeat(100))).toHaveLength(40)
    expect(sanitizeName(42)).toBe('')
  })
})

describe('remote registry', () => {
  it('runs a class: open, join, report, watch, leave, close', () => {
    let t = 1_000_000
    const reg = createRemoteRegistry({ now: () => t })
    const s = reg.create()
    expect(s.expiresAt - s.createdAt).toBe(SESSION_TTL_MS)

    const a = reg.join(formatCode(s.code).toLowerCase(), 'Ada')
    reg.report(s.code, {
      studentId: a.studentId,
      studentKey: a.studentKey,
      experimentId: 'pendulum',
      subject: 'physics',
      running: true,
      params: [{ label: 'Length', value: '1.00', unit: 'm' }, { nope: true }],
      readings: [{ label: 'Period', value: '2.006', unit: 's' }],
    })
    const view = reg.watch(s.code, s.teacherKey)
    expect(view.students).toHaveLength(1)
    expect(view.students[0]).toMatchObject({
      name: 'Ada',
      online: true,
      state: { experimentId: 'pendulum', subject: 'physics', running: true, params: [{ label: 'Length', value: '1.00', unit: 'm' }] },
    })
    expect(JSON.stringify(view)).not.toContain(a.studentKey)

    t += STUDENT_STALE_MS + 1
    expect(reg.watch(s.code, s.teacherKey).students[0].online).toBe(false)

    reg.leave(s.code, { studentId: a.studentId, studentKey: a.studentKey })
    expect(reg.watch(s.code, s.teacherKey).students).toHaveLength(0)
    reg.close(s.code, s.teacherKey)
    expect(() => reg.info(s.code)).toThrow('sessionNotFound')
  })

  it('expires sessions after 30 minutes', () => {
    let t = 0
    const reg = createRemoteRegistry({ now: () => t })
    const s = reg.create()
    t = SESSION_TTL_MS - 1
    expect(reg.info(s.code).code).toBe(s.code)
    t = SESSION_TTL_MS
    expect(() => reg.info(s.code)).toThrow('sessionNotFound')
    expect(reg.size()).toBe(0)
  })

  it('guards teacher and student secrets', () => {
    const reg = createRemoteRegistry()
    const s = reg.create()
    const a = reg.join(s.code, 'Ada')
    expect(() => reg.watch(s.code, 'wrong')).toThrow('notTeacher')
    expect(() => reg.close(s.code, '')).toThrow('notTeacher')
    expect(() => reg.report(s.code, { studentId: a.studentId, studentKey: 'wrong' })).toThrow('notInSession')
    expect(() => reg.report(s.code, { studentId: 'nobody', studentKey: a.studentKey })).toThrow('notInSession')
  })

  it('drops an unknown experiment id and limits class size', () => {
    const reg = createRemoteRegistry()
    const s = reg.create()
    const a = reg.join(s.code, 'Ada')
    reg.report(s.code, { studentId: a.studentId, studentKey: a.studentKey, experimentId: '../etc', params: [{ label: 'x', value: '1' }] })
    expect(reg.watch(s.code, s.teacherKey).students[0].state).toMatchObject({ experimentId: null, params: [] })
    expect(() => reg.join(s.code, '   ')).toThrow('nameRequired')
    for (let i = 1; i < MAX_STUDENTS; i++) reg.join(s.code, `S${i}`)
    expect(() => reg.join(s.code, 'One too many')).toThrow('sessionFull')
  })
})

describe('teacher control', () => {
  it('pushes an experiment to every student and withdraws it', () => {
    const reg = createRemoteRegistry()
    const s = reg.create()
    const a = reg.join(s.code, 'Ada')
    const beat = () => reg.report(s.code, { studentId: a.studentId, studentKey: a.studentKey })
    expect(beat().control).toEqual({ push: null, locked: false })

    const first = reg.control(s.code, s.teacherKey, { push: 'pendulum' })
    expect(first.push).toMatchObject({ experimentId: 'pendulum', subject: 'physics', seq: 1 })
    expect(beat().control.push).toMatchObject({ experimentId: 'pendulum', seq: 1 })
    // Sending again (even the same experiment) is a new push the students act on.
    expect(reg.control(s.code, s.teacherKey, { push: 'pendulum' }).push?.seq).toBe(2)
    expect(reg.control(s.code, s.teacherKey, { push: null }).push).toBeNull()
    expect(reg.control(s.code, s.teacherKey, { push: 'titration' }).push).toMatchObject({ subject: 'chemistry', seq: 3 })
    expect(reg.watch(s.code, s.teacherKey).control.push?.experimentId).toBe('titration')
  })

  it('locks and unlocks without touching the push', () => {
    const reg = createRemoteRegistry()
    const s = reg.create()
    reg.control(s.code, s.teacherKey, { push: 'pendulum' })
    expect(reg.control(s.code, s.teacherKey, { locked: true })).toMatchObject({ locked: true, push: { experimentId: 'pendulum' } })
    expect(reg.control(s.code, s.teacherKey, { locked: false }).locked).toBe(false)
  })

  it('accepts only the teacher and only real experiments', () => {
    const reg = createRemoteRegistry()
    const s = reg.create()
    expect(() => reg.control(s.code, 'wrong', { locked: true })).toThrow('notTeacher')
    expect(() => reg.control(s.code, s.teacherKey, { push: '../admin' })).toThrow('invalidExperiment')
    expect(() => reg.control(s.code, s.teacherKey, { push: 42 })).toThrow('invalidExperiment')
    expect(() => reg.control(s.code, s.teacherKey, { locked: 'yes' })).toThrow('invalidControl')
  })
})

describe('shared rooms', () => {
  function classWith(names: string[], now = () => Date.now()) {
    const reg = createRemoteRegistry({ now })
    const s = reg.create()
    const kids = names.map((n) => reg.join(s.code, n))
    const room = (i: number, body: Record<string, unknown>) => reg.room(s.code, { studentId: kids[i].studentId, studentKey: kids[i].studentKey, ...body })
    const beat = (i: number, body: Record<string, unknown> = {}) => reg.report(s.code, { studentId: kids[i].studentId, studentKey: kids[i].studentKey, ...body })
    return { reg, s, kids, room, beat }
  }

  it('shares the controller’s experiment with members, and only the controller’s', () => {
    const { kids, room, beat } = classWith(['Ada', 'Ben'])
    const r = room(0, { action: 'create' })!
    expect(r.code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
    expect(r.controllerId).toBe(kids[0].studentId)
    expect(room(1, { action: 'join', roomCode: r.code.toLowerCase() })!.members.map((m) => m.name)).toEqual(['Ada', 'Ben'])

    beat(0, { experimentId: 'pendulum', subject: 'physics', settings: { length: 2, angleDeg: 30, __proto__x: 1, bad: { deep: true } }, params: [{ label: 'L', value: '2' }] })
    const seen = beat(1).room!.shared
    expect(seen).toMatchObject({ experimentId: 'pendulum', subject: 'physics', settings: { length: 2, angleDeg: 30 }, version: 1 })
    expect(seen.settings).not.toHaveProperty('bad')

    // A member's settings never overwrite the room.
    beat(1, { experimentId: 'pendulum', subject: 'physics', settings: { length: 0.5 } })
    expect(beat(1).room!.shared.settings.length).toBe(2)
    // An unchanged report does not bump the version.
    beat(0, { experimentId: 'pendulum', subject: 'physics', settings: { length: 2, angleDeg: 30 }, params: [{ label: 'L', value: '2' }] })
    expect(beat(1).room!.shared.version).toBe(1)
  })

  it('follows the who-controls rules', () => {
    let t = 1_000_000
    const { kids, room, beat } = classWith(['Ada', 'Ben', 'Cy'], () => t)
    const code = room(0, { action: 'create' })!.code
    room(1, { action: 'join', roomCode: code })
    room(2, { action: 'join', roomCode: code })

    // Members cannot hand control on or grab it from an active controller.
    expect(() => room(1, { action: 'handover', to: kids[1].studentId })).toThrow('notController')
    expect(() => room(1, { action: 'claim' })).toThrow('controllerOnline')
    // They can ask; the controller sees who asked and hands over.
    expect(room(1, { action: 'request' })!.requests).toEqual([kids[1].studentId])
    expect(() => room(0, { action: 'handover', to: 'stranger' })).toThrow('notInRoom')
    const after = room(0, { action: 'handover', to: kids[1].studentId })!
    expect(after.controllerId).toBe(kids[1].studentId)
    expect(after.requests).toEqual([])

    // When the controller goes quiet, anyone in the room may take over.
    t += STUDENT_STALE_MS + 1
    beat(0)
    beat(2)
    expect(room(2, { action: 'claim' })!.controllerId).toBe(kids[2].studentId)

    // When the controller leaves, the longest-standing member takes over; the last one out closes the room.
    expect(room(2, { action: 'leave' })).toBeNull()
    expect(beat(0).room!.controllerId).toBe(kids[0].studentId)
    room(0, { action: 'leave' })
    room(1, { action: 'leave' })
    expect(() => room(2, { action: 'join', roomCode: code })).toThrow('roomNotFound')
  })

  it('caps room size, checks codes and freezes rooms while the class is locked', () => {
    const names = Array.from({ length: MAX_ROOM_MEMBERS + 1 }, (_, i) => `S${i}`)
    const { reg, s, room, beat } = classWith(names)
    const code = room(0, { action: 'create' })!.code
    for (let i = 1; i < MAX_ROOM_MEMBERS; i++) room(i, { action: 'join', roomCode: code })
    expect(() => room(MAX_ROOM_MEMBERS, { action: 'join', roomCode: code })).toThrow('roomFull')
    expect(() => room(MAX_ROOM_MEMBERS, { action: 'join', roomCode: 'AB' })).toThrow('invalidRoomCode')
    expect(() => room(MAX_ROOM_MEMBERS, { action: 'dance' })).toThrow('invalidRoomAction')

    reg.control(s.code, s.teacherKey, { locked: true })
    expect(() => room(MAX_ROOM_MEMBERS, { action: 'create' })).toThrow('classLocked')
    beat(0, { experimentId: 'ohms-law', subject: 'physics', settings: { voltage: 5 } })
    expect(beat(1).room!.shared.version).toBe(0)
    expect(beat(1).control.locked).toBe(true)
    // Leaving is always allowed.
    expect(room(1, { action: 'leave' })).toBeNull()
  })

  it('shows the teacher who is in which room, and removes a student who leaves the session', () => {
    const { reg, s, kids, room } = classWith(['Ada', 'Ben'])
    const code = room(0, { action: 'create' })!.code
    room(1, { action: 'join', roomCode: code })
    const view = reg.watch(s.code, s.teacherKey)
    expect(view.rooms).toEqual([{ code, controllerId: kids[0].studentId, memberIds: [kids[0].studentId, kids[1].studentId] }])
    expect(view.students.map((x) => x.roomCode)).toEqual([code, code])

    reg.leave(s.code, { studentId: kids[0].studentId, studentKey: kids[0].studentKey })
    expect(reg.watch(s.code, s.teacherKey).rooms[0]).toMatchObject({ controllerId: kids[1].studentId, memberIds: [kids[1].studentId] })
  })
})

describe('remote API', () => {
  let server: Server
  let base = ''
  beforeAll(async () => {
    server = createServer(createApp({ store: memoryStore(), jwtSecret: 'test' }))
    await new Promise<void>((r) => server.listen(0, r))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((r) => server.close(() => r())))

  async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
    return { status: res.status, json: (await res.json()) as any }
  }

  it('serves the teacher and student flow over HTTP', async () => {
    const created = await call('POST', '/api/remote/session')
    expect(created.status).toBe(201)
    const { code, teacherKey } = created.json
    expect(isValidCode(code)).toBe(true)

    const info = await call('GET', `/api/remote/session/${formatCode(code)}`)
    expect(info.json).toMatchObject({ code, studentCount: 0 })
    expect(info.json.teacherKey).toBeUndefined()
    expect(info.json.students).toBeUndefined()

    const joined = await call('POST', `/api/remote/session/${code}/join`, { name: 'Ada' })
    expect(joined.status).toBe(201)
    const { studentId, studentKey } = joined.json

    const put = await call('PUT', `/api/remote/session/${code}/state`, { studentId, studentKey, experimentId: 'ohms-law', subject: 'physics', params: [{ label: 'R', value: '10', unit: 'Ω' }] })
    expect(put.status).toBe(200)

    expect((await call('GET', `/api/remote/session/${code}`, undefined, { 'X-Teacher-Key': 'nope' })).status).toBe(403)
    const watch = await call('GET', `/api/remote/session/${code}`, undefined, { 'X-Teacher-Key': teacherKey })
    expect(watch.json.students[0]).toMatchObject({ name: 'Ada', state: { experimentId: 'ohms-law' } })

    expect((await call('PUT', `/api/remote/session/${code}/state`, { studentId, studentKey: 'x' })).status).toBe(403)
    expect((await call('GET', '/api/remote/session/AAAAAA')).json.error).toBe('sessionNotFound')
    expect((await call('GET', '/api/remote/session/bad')).json.error).toBe('invalidCode')

    // Teacher control and rooms ride the same API.
    expect((await call('POST', `/api/remote/session/${code}/control`, { locked: true }, { 'X-Teacher-Key': 'nope' })).status).toBe(403)
    const pushed = await call('POST', `/api/remote/session/${code}/control`, { push: 'pendulum' }, { 'X-Teacher-Key': teacherKey })
    expect(pushed.json.push).toMatchObject({ experimentId: 'pendulum', seq: 1 })
    const roomRes = await call('POST', `/api/remote/session/${code}/room`, { studentId, studentKey, action: 'create' })
    expect(roomRes.status).toBe(200)
    expect(roomRes.json.room.controllerId).toBe(studentId)
    const beat = await call('PUT', `/api/remote/session/${code}/state`, { studentId, studentKey, experimentId: 'pendulum', subject: 'physics', settings: { length: 1.5 } })
    expect(beat.json).toMatchObject({ control: { push: { experimentId: 'pendulum' }, locked: false }, room: { shared: { settings: { length: 1.5 } } } })
    expect(JSON.stringify(beat.json)).not.toContain(studentKey)
    expect((await call('POST', `/api/remote/session/${code}/room`, { studentId, studentKey: 'x', action: 'create' })).status).toBe(403)

    expect((await call('DELETE', `/api/remote/session/${code}`, undefined, { 'X-Teacher-Key': teacherKey })).status).toBe(200)
    expect((await call('PUT', `/api/remote/session/${code}/state`, { studentId, studentKey })).status).toBe(404)
  })
})
