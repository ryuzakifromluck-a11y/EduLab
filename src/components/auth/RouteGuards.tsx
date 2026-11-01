import type { ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/auth'

/** Only allows same-site paths as a post-login destination. */
export function safeNext(next: string | null, fallback = '/account') {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

/** Sends signed-out visitors to /login, remembering where they were going. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const location = useLocation()
  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return children
}

/** Sends signed-in users away from /login and /signup. */
export function RequireGuest({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuth((s) => s.isAuthenticated)
  const [params] = useSearchParams()
  if (isAuthenticated) return <Navigate to={safeNext(params.get('next'))} replace />
  return children
}
