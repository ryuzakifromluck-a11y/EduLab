import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import {
  CODE_ALPHABET,
  CODE_LENGTH,
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

    expect((await call('DELETE', `/api/remote/session/${code}`, undefined, { 'X-Teacher-Key': teacherKey })).status).toBe(200)
    expect((await call('PUT', `/api/remote/session/${code}/state`, { studentId, studentKey })).status).toBe(404)
  })
})
