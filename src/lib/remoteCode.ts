/**
 * Shared by the QR Remote Control client and server (`server/remote.ts`):
 * session-code rules and the wire format for a student's live state.
 */

/** No 0/O, 1/I/L, so a code read aloud or copied from the board is unambiguous. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6
/** How often a joined student reports, and how often the teacher's dashboard refreshes. */
export const REMOTE_POLL_MS = 2000

/** Upper-cases and strips spaces and dashes, so `abc-123`, `ABC 123` and `ABC123` are the same code. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c))
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
}

export interface SessionSummary {
  code: string
  createdAt: number
  expiresAt: number
  studentCount: number
}
