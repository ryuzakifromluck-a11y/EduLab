import type { HypothesisRecord } from '../lib/hypothesis'
import type { ProgressRecord, ProgressSettings } from '../lib/progressModel'

/**
 * Client for the EduLab accounts API (see `server/`). In development Vite
 * proxies `/api` to `npm run api`; in production set `VITE_API_URL` to the
 * deployed API origin (and list this site in the API's CORS_ORIGINS).
 *
 * The session lives in an HttpOnly cookie that the server sets on sign-in.
 * Page scripts cannot read it, so an injected script cannot steal it; the
 * browser attaches it to API requests by itself (`credentials: 'include'`).
 */

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  preferences: { language?: string; theme?: 'light' | 'dark' }
}

export interface Session {
  user: User
}

/** `code` is an i18n key under `auth.errors` (or `network` / `server`). */
export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  legacyToken?: string | null,
  headers: Record<string, string> = {},
): Promise<T> {
  // Writes always send JSON: the server refuses anything else, which a cross-site HTML form cannot forge.
  const payload = method === 'GET' ? undefined : JSON.stringify(body ?? {})
  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(payload !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(legacyToken ? { Authorization: `Bearer ${legacyToken}` } : {}),
        ...headers,
      },
      body: payload,
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  // The service worker answers 503 + X-EduLab-Offline when the network is down: same as a failed fetch.
  if (res.status === 503 && res.headers.get('X-EduLab-Offline')) throw new ApiError(0, 'network')
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, (data && typeof data.error === 'string' && data.error) || (res.status >= 500 ? 'server' : 'network'))
  return data as T
}

export const api = {
  register: (name: string, email: string, password: string) => request<Session>('POST', '/auth/register', { name, email, password }),
  login: (email: string, password: string) => request<Session>('POST', '/auth/login', { email, password }),
  logout: () => request<{ ok: true }>('POST', '/auth/logout', {}),
  /** `legacyToken`: a token saved by an older app version; the server swaps it for the cookie. */
  me: (legacyToken?: string) => request<{ user: User }>('GET', '/auth/me', undefined, legacyToken),
  updateMe: (patch: { name?: string; preferences?: User['preferences'] }) => request<{ user: User }>('PATCH', '/auth/me', patch),
  listProgress: () => request<{ progress: ProgressRecord[] }>('GET', '/progress'),
  saveProgress: (experimentId: string, input: { score?: number | null; settings?: ProgressSettings }) =>
    request<{ progress: ProgressRecord }>('PUT', `/progress/${encodeURIComponent(experimentId)}`, input),
  listHypotheses: () => request<{ hypotheses: HypothesisRecord[] }>('GET', '/hypotheses'),
  saveHypothesis: (record: HypothesisRecord) =>
    request<{ hypothesis: HypothesisRecord }>('PUT', `/hypotheses/${encodeURIComponent(record.experimentId)}`, record),
}
