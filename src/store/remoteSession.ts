import { create } from 'zustand'
import { REMOTE_POLL_MS } from '../lib/remoteCode'
import { ApiError } from '../services/api'
import { remoteApi, type ClassView, type StudentReport, type StudentTicket, type TeacherSession } from '../services/remoteApi'

/**
 * QR Remote Control state, for both sides of a class session:
 *  - teacher: the open session (code + secret key) and the latest class view, refreshed by polling;
 *  - student: the join ticket and the live report of the experiment on screen, sent every 2 s.
 * Both are kept in localStorage until the session expires, so a reload or a
 * switch between experiments does not drop anyone out of the class.
 */

const TEACHER_KEY = 'edulab-remote-teacher'
const STUDENT_KEY = 'edulab-remote-student'

/** `live`: reports are getting through; `offline`: retrying; `ended`: the session closed or expired. */
export type RemoteStatus = 'idle' | 'live' | 'offline' | 'ended'

export const IDLE_REPORT: StudentReport = { experimentId: null, subject: null, params: [], readings: [], running: false }

function load<T extends { expiresAt: number }>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    const v = raw ? (JSON.parse(raw) as T) : null
    return v && typeof v.expiresAt === 'number' && v.expiresAt > Date.now() ? v : null
  } catch {
    return null
  }
}

function save(key: string, value: unknown) {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value))
    else localStorage.removeItem(key)
  } catch {
    /* storage unavailable: the session lasts until the tab closes */
  }
}

/** A 403/404 means the session (or this student's place in it) is gone for good. */
const isGone = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 403)
const errorCode = (err: unknown) => (err instanceof ApiError ? err.code : 'network')

interface RemoteState {
  // teacher
  teacher: TeacherSession | null
  classView: ClassView | null
  teacherStatus: RemoteStatus
  teacherError: string | null
  openSession: () => Promise<void>
  refreshClass: () => Promise<void>
  closeSession: () => Promise<void>
  /** Clears an ended session so the teacher can open a new one. */
  dismissTeacher: () => void

  // student
  ticket: StudentTicket | null
  report: StudentReport
  studentStatus: RemoteStatus
  join: (code: string, name: string) => Promise<StudentTicket>
  leave: () => Promise<void>
  /** Called by the experiment page whenever its parameters or readings change. */
  setReport: (report: StudentReport) => void
  /** Sends the current report now. The reporter loop calls it every 2 s. */
  sendReport: () => Promise<void>
}

let reporter: ReturnType<typeof setInterval> | null = null

function startReporter() {
  if (reporter || typeof window === 'undefined') return
  reporter = setInterval(() => void useRemoteSession.getState().sendReport(), REMOTE_POLL_MS)
}

function stopReporter() {
  if (reporter) clearInterval(reporter)
  reporter = null
}

const initialTeacher = load<TeacherSession>(TEACHER_KEY)
const initialTicket = load<StudentTicket>(STUDENT_KEY)

const sameReport = (a: StudentReport, b: StudentReport) => JSON.stringify(a) === JSON.stringify(b)

export const useRemoteSession = create<RemoteState>((set, get) => ({
  teacher: initialTeacher,
  classView: null,
  teacherStatus: initialTeacher ? 'live' : 'idle',
  teacherError: null,

  openSession: async () => {
    set({ teacherError: null })
    try {
      const teacher = await remoteApi.createSession()
      save(TEACHER_KEY, teacher)
      set({ teacher, teacherStatus: 'live', classView: { ...teacher, students: [] } })
    } catch (err) {
      set({ teacherError: errorCode(err) })
    }
  },

  refreshClass: async () => {
    const { teacher } = get()
    if (!teacher) return
    try {
      const classView = await remoteApi.watch(teacher.code, teacher.teacherKey)
      // Ignore a response for a session the teacher has since closed or replaced.
      if (get().teacher?.code !== teacher.code) return
      set({ classView, teacherStatus: 'live', teacherError: null })
    } catch (err) {
      if (get().teacher?.code !== teacher.code) return
      if (isGone(err)) {
        save(TEACHER_KEY, null)
        set({ teacherStatus: 'ended' })
      } else set({ teacherStatus: 'offline' })
    }
  },

  closeSession: async () => {
    const { teacher } = get()
    if (!teacher) return
    try {
      await remoteApi.close(teacher.code, teacher.teacherKey)
    } catch {
      /* already gone, or offline: it expires on its own */
    }
    save(TEACHER_KEY, null)
    set({ teacher: null, classView: null, teacherStatus: 'idle', teacherError: null })
  },

  dismissTeacher: () => {
    save(TEACHER_KEY, null)
    set({ teacher: null, classView: null, teacherStatus: 'idle', teacherError: null })
  },

  ticket: initialTicket,
  report: IDLE_REPORT,
  studentStatus: initialTicket ? 'live' : 'idle',

  join: async (code, name) => {
    const previous = get().ticket
    const ticket = await remoteApi.join(code, name)
    if (previous && previous.code !== ticket.code) remoteApi.leave(previous.code, previous.studentId, previous.studentKey).catch(() => {})
    save(STUDENT_KEY, ticket)
    set({ ticket, studentStatus: 'live' })
    startReporter()
    void get().sendReport()
    return ticket
  },

  leave: async () => {
    const { ticket } = get()
    stopReporter()
    save(STUDENT_KEY, null)
    set({ ticket: null, studentStatus: 'idle' })
    if (ticket) await remoteApi.leave(ticket.code, ticket.studentId, ticket.studentKey).catch(() => {})
  },

  setReport: (report) => {
    const prev = get().report
    if (sameReport(prev, report)) return
    set({ report })
    // Opening or leaving an experiment shows up on the teacher's screen right away;
    // slider moves ride the next 2-second heartbeat.
    if (prev.experimentId !== report.experimentId) void get().sendReport()
  },

  sendReport: async () => {
    const { ticket, report } = get()
    if (!ticket) return
    try {
      await remoteApi.report(ticket.code, ticket.studentId, ticket.studentKey, report)
      if (get().ticket === ticket) set({ studentStatus: 'live' })
    } catch (err) {
      if (get().ticket !== ticket) return
      if (isGone(err)) {
        stopReporter()
        save(STUDENT_KEY, null)
        set({ ticket: null, studentStatus: 'ended' })
      } else set({ studentStatus: 'offline' })
    }
  },
}))

if (initialTicket) startReporter()
