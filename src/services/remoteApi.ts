import type { PublicStudent, RemoteReading, SessionSummary } from '../lib/remoteCode'
import { request } from './api'

/**
 * QR Remote Control endpoints on the EduLab API (`server/remote.ts`).
 * Errors are `ApiError`s whose `code` is an i18n key under `remote.errors`
 * (or `network` / `server`).
 */

export interface TeacherSession extends SessionSummary {
  teacherKey: string
}

export interface ClassView extends SessionSummary {
  students: PublicStudent[]
}

export interface StudentTicket extends SessionSummary {
  studentId: string
  studentKey: string
  name: string
}

export interface StudentReport {
  experimentId: string | null
  subject: 'physics' | 'chemistry' | 'biology' | null
  params: RemoteReading[]
  readings: RemoteReading[]
  running: boolean
}

const path = (code: string, rest = '') => `/remote/session/${encodeURIComponent(code)}${rest}`
const teacher = (key: string) => ({ 'X-Teacher-Key': key })

export const remoteApi = {
  createSession: () => request<TeacherSession>('POST', '/remote/session', {}),
  sessionInfo: (code: string) => request<SessionSummary>('GET', path(code)),
  watch: (code: string, teacherKey: string) => request<ClassView>('GET', path(code), undefined, null, teacher(teacherKey)),
  close: (code: string, teacherKey: string) => request<{ ok: true }>('DELETE', path(code), undefined, null, teacher(teacherKey)),
  join: (code: string, name: string) => request<StudentTicket>('POST', path(code, '/join'), { name }),
  report: (code: string, studentId: string, studentKey: string, report: StudentReport) =>
    request<{ ok: true; expiresAt: number }>('PUT', path(code, '/state'), { studentId, studentKey, ...report }),
  leave: (code: string, studentId: string, studentKey: string) => request<{ ok: true }>('POST', path(code, '/leave'), { studentId, studentKey }),
}
