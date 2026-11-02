import { create } from 'zustand'
import { REMOTE_POLL_MS, ROOM_POLL_MS, type ClassControl, type RoomView } from '../lib/remoteCode'
import { ApiError } from '../services/api'
import { remoteApi, type ClassView, type RoomRequest, type StudentReport, type StudentTicket, type TeacherSession } from '../services/remoteApi'

/**
 * QR Remote Control state, for both sides of a class session:
 *  - teacher: the open session (code + secret key) and the latest class view, refreshed by polling;
 *  - student: the join ticket and the live report of the experiment on screen, sent every 2 s
 *    (every second in a shared room). Each heartbeat brings back the teacher's
 *    controls (pushed experiment, lock) and the student's room.
 * Both are kept in localStorage until the session expires, so a reload or a
 * switch between experiments does not drop anyone out of the class.
 */

const TEACHER_KEY = 'edulab-remote-teacher'
const STUDENT_KEY = 'edulab-remote-student'
/** The last pushed experiment this student acted on, so a reload does not offer it again. */
const PUSH_KEY = 'edulab-remote-push'
/** A room controller's slider moves are sent at most this often, between heartbeats. */
const ROOM_SEND_MS = 300

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
  /** Sends an experiment to every student (null withdraws it) and/or locks their screens. */
  setControl: (body: { push?: string | null; locked?: boolean }) => Promise<void>
  controlError: string | null

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
  /** The teacher's current instructions, from the last heartbeat. */
  control: ClassControl | null
  /** The shared room this student is in, from the last heartbeat or room action. */
  room: RoomView | null
  roomError: string | null
  roomAction: (req: RoomRequest) => Promise<boolean>
  /** The `seq` of the last pushed experiment this student opened or declined. */
  pushSeen: number
  acknowledgePush: (seq: number) => void
}

let reporter: ReturnType<typeof setTimeout> | null = null
let running = false

/** Heartbeat loop: every 2 s, or every second while the student is in a room. */
function startReporter() {
  if (running || typeof window === 'undefined') return
  running = true
  const tick = () => {
    if (!running) return
    reporter = setTimeout(() => {
      void useRemoteSession.getState().sendReport()
      tick()
    }, useRemoteSession.getState().room ? ROOM_POLL_MS : REMOTE_POLL_MS)
  }
  tick()
}

function stopReporter() {
  running = false
  if (reporter) clearTimeout(reporter)
  reporter = null
}

let quickSend: ReturnType<typeof setTimeout> | null = null
/** Sends soon, at most once per ROOM_SEND_MS, so roommates see a slider move without waiting for the heartbeat. */
function sendSoon() {
  if (quickSend) return
  quickSend = setTimeout(() => {
    quickSend = null
    void useRemoteSession.getState().sendReport()
  }, ROOM_SEND_MS)
}

function loadPushSeen(code: string | undefined): number {
  try {
    const v = JSON.parse(localStorage.getItem(PUSH_KEY) ?? 'null') as { code?: string; seq?: number } | null
    return v && v.code === code && typeof v.seq === 'number' ? v.seq : 0
  } catch {
    return 0
  }
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
      set({ teacher, teacherStatus: 'live', classView: { ...teacher, students: [], control: { push: null, locked: false }, rooms: [] } })
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

  controlError: null,
  setControl: async (body) => {
    const { teacher } = get()
    if (!teacher) return
    set({ controlError: null })
    try {
      const control = await remoteApi.control(teacher.code, teacher.teacherKey, body)
      const view = get().classView
      if (get().teacher?.code === teacher.code && view) set({ classView: { ...view, control } })
    } catch (err) {
      set({ controlError: errorCode(err) })
    }
  },

  ticket: initialTicket,
  report: IDLE_REPORT,
  studentStatus: initialTicket ? 'live' : 'idle',

  join: async (code, name) => {
    const previous = get().ticket
    const ticket = await remoteApi.join(code, name)
    if (previous && previous.code !== ticket.code) remoteApi.leave(previous.code, previous.studentId, previous.studentKey).catch(() => {})
    save(STUDENT_KEY, ticket)
    set({ ticket, studentStatus: 'live', control: null, room: null, roomError: null, pushSeen: loadPushSeen(ticket.code) })
    startReporter()
    void get().sendReport()
    return ticket
  },

  leave: async () => {
    const { ticket } = get()
    stopReporter()
    save(STUDENT_KEY, null)
    set({ ticket: null, studentStatus: 'idle', control: null, room: null, roomError: null })
    if (ticket) await remoteApi.leave(ticket.code, ticket.studentId, ticket.studentKey).catch(() => {})
  },

  setReport: (report) => {
    const prev = get().report
    if (sameReport(prev, report)) return
    set({ report })
    // Opening or leaving an experiment shows up on the teacher's screen right away;
    // slider moves ride the next heartbeat, except for a room's controller, whose roommates follow along.
    if (prev.experimentId !== report.experimentId) void get().sendReport()
    else {
      const { room, ticket } = get()
      if (room && ticket && room.controllerId === ticket.studentId) sendSoon()
    }
  },

  sendReport: async () => {
    const { ticket, report } = get()
    if (!ticket) return
    try {
      const res = await remoteApi.report(ticket.code, ticket.studentId, ticket.studentKey, report)
      if (get().ticket === ticket) set({ studentStatus: 'live', control: res.control ?? null, room: res.room ?? null })
    } catch (err) {
      if (get().ticket !== ticket) return
      if (isGone(err)) {
        stopReporter()
        save(STUDENT_KEY, null)
        set({ ticket: null, studentStatus: 'ended', control: null, room: null })
      } else set({ studentStatus: 'offline' })
    }
  },

  control: null,
  room: null,
  roomError: null,
  roomAction: async (req) => {
    const { ticket } = get()
    if (!ticket) return false
    set({ roomError: null })
    try {
      const { room } = await remoteApi.room(ticket.code, ticket.studentId, ticket.studentKey, req)
      if (get().ticket !== ticket) return false
      set({ room })
      // A new controller publishes their experiment straight away.
      void get().sendReport()
      return true
    } catch (err) {
      if (get().ticket === ticket) set({ roomError: errorCode(err) })
      return false
    }
  },

  pushSeen: loadPushSeen(initialTicket?.code),
  acknowledgePush: (seq) => {
    const { ticket, pushSeen } = get()
    if (!ticket || seq <= pushSeen) return
    try {
      localStorage.setItem(PUSH_KEY, JSON.stringify({ code: ticket.code, seq }))
    } catch {
      /* the push may be offered again after a reload */
    }
    set({ pushSeen: seq })
  },
}))

if (initialTicket) startReporter()
