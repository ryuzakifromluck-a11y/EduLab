import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api'

const api = vi.hoisted(() => ({
  createSession: vi.fn(),
  sessionInfo: vi.fn(),
  watch: vi.fn(),
  close: vi.fn(),
  join: vi.fn(),
  report: vi.fn(),
  leave: vi.fn(),
}))
vi.mock('../services/remoteApi', () => ({ remoteApi: api }))

const { IDLE_REPORT, useRemoteSession } = await import('./remoteSession')

const ticket = { code: 'ABC234', studentId: 's1', studentKey: 'k1', name: 'Ada', createdAt: 0, expiresAt: Date.now() + 60_000, studentCount: 1 }
const pendulum = { experimentId: 'pendulum', subject: 'physics' as const, params: [{ label: 'L', value: '1.00', unit: 'm' }], readings: [], running: true }

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset().mockResolvedValue({ ok: true }))
  useRemoteSession.setState({ ticket: null, report: IDLE_REPORT, studentStatus: 'idle', teacher: null, classView: null, teacherStatus: 'idle', teacherError: null })
})

describe('student side', () => {
  it('joins and reports the experiment on screen straight away', async () => {
    api.join.mockResolvedValue(ticket)
    await useRemoteSession.getState().join('ABC234', 'Ada')
    expect(useRemoteSession.getState().studentStatus).toBe('live')
    useRemoteSession.getState().setReport(pendulum)
    await vi.waitFor(() => expect(api.report).toHaveBeenLastCalledWith('ABC234', 's1', 'k1', pendulum))
  })

  it('does not resend an unchanged report outside the heartbeat', () => {
    useRemoteSession.setState({ ticket, studentStatus: 'live' })
    useRemoteSession.getState().setReport(pendulum)
    useRemoteSession.getState().setReport({ ...pendulum, params: [...pendulum.params] })
    expect(api.report).toHaveBeenCalledTimes(1)
    // A slider move waits for the next heartbeat instead of sending at render rate.
    useRemoteSession.getState().setReport({ ...pendulum, params: [{ label: 'L', value: '1.20', unit: 'm' }] })
    expect(api.report).toHaveBeenCalledTimes(1)
  })

  it('drops out when the session has ended, and retries when offline', async () => {
    useRemoteSession.setState({ ticket, studentStatus: 'live' })
    api.report.mockRejectedValueOnce(new ApiError(0, 'network'))
    await useRemoteSession.getState().sendReport()
    expect(useRemoteSession.getState()).toMatchObject({ studentStatus: 'offline', ticket })
    api.report.mockRejectedValueOnce(new ApiError(404, 'sessionNotFound'))
    await useRemoteSession.getState().sendReport()
    expect(useRemoteSession.getState()).toMatchObject({ studentStatus: 'ended', ticket: null })
  })
})

describe('teacher side', () => {
  it('opens, watches and closes a session', async () => {
    const session = { code: 'QWE789', teacherKey: 'tk', createdAt: 0, expiresAt: Date.now() + 60_000, studentCount: 0 }
    api.createSession.mockResolvedValue(session)
    await useRemoteSession.getState().openSession()
    expect(useRemoteSession.getState().teacher).toEqual(session)

    api.watch.mockResolvedValue({ ...session, students: [{ id: 's1', name: 'Ada' }] })
    await useRemoteSession.getState().refreshClass()
    expect(api.watch).toHaveBeenCalledWith('QWE789', 'tk')
    expect(useRemoteSession.getState().classView?.students).toHaveLength(1)

    api.watch.mockRejectedValueOnce(new ApiError(404, 'sessionNotFound'))
    await useRemoteSession.getState().refreshClass()
    expect(useRemoteSession.getState().teacherStatus).toBe('ended')

    await useRemoteSession.getState().closeSession()
    expect(api.close).toHaveBeenCalledWith('QWE789', 'tk')
    expect(useRemoteSession.getState().teacher).toBeNull()
  })

  it('shows an error code when the server cannot be reached', async () => {
    api.createSession.mockRejectedValue(new ApiError(0, 'network'))
    await useRemoteSession.getState().openSession()
    expect(useRemoteSession.getState()).toMatchObject({ teacher: null, teacherError: 'network' })
  })
})
