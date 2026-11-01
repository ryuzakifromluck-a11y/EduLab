/** Wire format shared by the tutor endpoint and the browser client. */

export type TutorLanguage = 'en' | 'uz' | 'ru'

export interface TutorReading {
  label: string
  value: string
  unit?: string
}

export interface TutorQuizResult {
  score: number
  total: number
  passed: boolean
}

export interface TutorContext {
  /** Catalog id, e.g. "pendulum". */
  experimentId: string
  subject: 'physics' | 'chemistry' | 'biology'
  /** Experiment title in the learner's language. */
  title: string
  params: TutorReading[]
  readings: TutorReading[]
  quiz?: TutorQuizResult
}

export interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TutorRequest {
  language: TutorLanguage
  context: TutorContext
  /** Earlier turns, oldest first. The last entry is the new question from the learner. */
  messages: TutorMessage[]
}

export type TutorErrorCode = 'bad_request' | 'rate_limited' | 'not_configured' | 'upstream'

export interface TutorReply {
  reply: string
  /** Messages left for this client today, as counted by the server. */
  remaining: number
}

export interface TutorError {
  error: TutorErrorCode
  /** Seconds until the client may try again (rate_limited only). */
  retryAfter?: number
  /** Which limit was hit (rate_limited only). */
  limit?: 'minute' | 'day'
}

/** GET /api/tutor: lets the browser know up front whether the tutor can answer. Never contains secrets. */
export interface TutorStatus {
  available: boolean
}
