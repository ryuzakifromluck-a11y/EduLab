/**
 * Shared by the QR Remote Control client and server (`server/remote.ts`):
 * session-code rules and the wire format for a student's live state.
 */

/** No 0/O, 1/I/L, so a code read aloud or copied from the board is unambiguous. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6
/** How often a joined student reports, and how often the teacher's dashboard refreshes. */
export const REMOTE_POLL_MS = 2000
/** Students in a shared room poll faster, so a roommate's slider move shows up within about a second. */
export const ROOM_POLL_MS = 1000
/** Room codes are shorter than session codes: they only have to be unique inside one class session. */
export const ROOM_CODE_LENGTH = 4

/** Upper-cases and strips spaces and dashes, so `abc-123`, `ABC 123` and `ABC123` are the same code. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c))
}

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c))
}

/** `ABC123` → `ABC-123`, for display. */
export function formatCode(code: string): string {
  return code.length === CODE_LENGTH ? `${code.slice(0, 3)}-${code.slice(3)}` : code
}

/** The link inside the QR code; a phone's camera app opens it directly. */
export function joinUrl(code: string, origin: string): string {
  return `${origin.replace(/\/+$/, '')}/student/remote/${formatCode(code)}`
}

/**
 * Pulls a session code out of whatever a QR scanner returned: a full join link
 * (`https://…/student/remote/ABC-123`) or the bare code. Returns null if none.
 */
export function codeFromScan(text: string): string | null {
  const trimmed = text.trim()
  const fromPath = /\/student\/remote\/([A-Za-z0-9-]+)\/?(?:[?#].*)?$/.exec(trimmed)
  const code = normalizeCode(fromPath ? fromPath[1] : trimmed)
  return isValidCode(code) ? code : null
}

export interface RemoteReading {
  label: string
  value: string
  unit?: string
}

export interface StudentState {
  experimentId: string | null
  subject: 'physics' | 'chemistry' | 'biology' | null
  params: RemoteReading[]
  readings: RemoteReading[]
  running: boolean
  updatedAt: number
}

export interface PublicStudent {
  id: string
  name: string
  joinedAt: number
  lastSeen: number
  online: boolean
  state: StudentState
  /** The shared room this student is in, if any. */
  roomCode: string | null
}

export type RemoteSubject = 'physics' | 'chemistry' | 'biology'

/** An experiment the teacher sent to every student. `seq` grows with each push, so a student acts on each one once. */
export interface PushTarget {
  experimentId: string
  subject: RemoteSubject
  seq: number
  at: number
}

/** What the teacher currently asks of the class. Students get it with every heartbeat. */
export interface ClassControl {
  push: PushTarget | null
  locked: boolean
}

/** Flat experiment parameters, as saved with progress (`ProgressSettings`). */
export type SharedSettings = Record<string, number | string | boolean>

/** The experiment a room works on together; only the room's controller writes it. */
export interface SharedState {
  experimentId: string | null
  subject: RemoteSubject | null
  settings: SharedSettings
  params: RemoteReading[]
  readings: RemoteReading[]
  running: boolean
  /** Grows on every change, so members apply each update once. */
  version: number
  updatedAt: number
}

export interface RoomMember {
  id: string
  name: string
  online: boolean
}

export interface RoomView {
  code: string
  /** Who moves the shared sliders. Everyone else follows. */
  controllerId: string | null
  members: RoomMember[]
  /** Members who asked the controller for a turn. */
  requests: string[]
  shared: SharedState
}

/** The teacher's summary of a room. */
export interface RoomSummary {
  code: string
  controllerId: string | null
  memberIds: string[]
}

export type RoomAction = 'create' | 'join' | 'leave' | 'handover' | 'request' | 'claim'

/** The answer to a student's heartbeat: the teacher's instructions and the student's room. */
export interface HeartbeatResult {
  ok: true
  expiresAt: number
  control: ClassControl
  room: RoomView | null
}

export interface SessionSummary {
  code: string
  createdAt: number
  expiresAt: number
  studentCount: number
}
