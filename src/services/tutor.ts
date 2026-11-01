import type { TutorContext, TutorError, TutorLanguage, TutorMessage, TutorReply, TutorStatus } from '../../server/tutor/types'

export type { TutorContext, TutorMessage }

export type TutorFailure = TutorError['error'] | 'offline'

export class TutorRequestError extends Error {
  constructor(
    readonly code: TutorFailure,
    readonly retryAfter?: number,
    readonly limit?: TutorError['limit'],
  ) {
    super(code)
  }
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

/** Asks the tutor backend. The API key lives on the server; the browser only talks to /api/tutor. */
export async function askTutor(
  language: TutorLanguage,
  context: TutorContext,
  messages: TutorMessage[],
  signal?: AbortSignal,
): Promise<TutorReply> {
  if (isOffline()) throw new TutorRequestError('offline')
  let res: Response
  try {
    res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ language, context, messages }),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new TutorRequestError('offline')
  }
  if (res.ok) return (await res.json()) as TutorReply
  let body: Partial<TutorError> = {}
  try {
    body = await res.json()
  } catch {
    /* static hosts answer 404 with HTML when the endpoint is missing */
  }
  // 503/504 without our JSON comes from the service worker or a proxy when the network is gone.
  const fallback = res.status === 404 || res.status === 405 ? 'not_configured' : res.status === 503 || res.status === 504 ? 'offline' : 'upstream'
  const retryAfter = body.retryAfter ?? (Number(res.headers.get('retry-after')) || undefined)
  throw new TutorRequestError(body.error ?? fallback, retryAfter, body.limit)
}

/**
 * Whether the tutor can answer on this site. Returns null when it cannot tell
 * (offline, or a network error), so the panel does not wrongly say "not available".
 */
export async function checkTutorAvailable(signal?: AbortSignal): Promise<boolean | null> {
  if (isOffline()) return null
  try {
    const res = await fetch('/api/tutor', { headers: { accept: 'application/json' }, signal })
    if (res.status === 404 || res.status === 405) return false
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return res.status < 500 ? false : null
    return ((await res.json()) as TutorStatus).available === true
  } catch {
    return null
  }
}
