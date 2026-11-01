import { create } from 'zustand'
import { api, ApiError, type User } from '../services/api'

/**
 * The session token is an HttpOnly cookie set by the API, so nothing here can
 * read it (and neither can an injected script). Only the public profile is
 * kept in localStorage, so a reload or an offline start shows the signed-in
 * UI at once; `refresh` then confirms the session with the server.
 */
const USER_KEY = 'edulab-user'
/** Older versions stored `{ token, user }` here; it is read once and removed. */
const LEGACY_SESSION_KEY = 'edulab-session'
/** Set when sign-out could not reach the server, so the cookie is cleared on the next start. */
const LOGOUT_PENDING_KEY = 'edulab-logout-pending'

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      /* storage unavailable: the session lasts until the tab closes */
    }
  },
}

const isUser = (u: unknown): u is User =>
  !!u && typeof u === 'object' && typeof (u as User).id === 'string' && typeof (u as User).email === 'string'

function loadUser(): User | null {
  try {
    const u: unknown = JSON.parse(storage.get(USER_KEY) ?? 'null')
    return isUser(u) ? { ...u, preferences: u.preferences ?? {} } : null
  } catch {
    return null
  }
}

/** Takes a token saved by an older version out of localStorage, keeping the cached profile. */
function takeLegacySession(): { token: string; user: User | null } | null {
  const raw = storage.get(LEGACY_SESSION_KEY)
  if (!raw) return null
  storage.set(LEGACY_SESSION_KEY, null)
  try {
    const s = JSON.parse(raw) as { token?: unknown; user?: unknown }
    return typeof s.token === 'string' ? { token: s.token, user: isUser(s.user) ? s.user : null } : null
  } catch {
    return null
  }
}

const saveUser = (u: User | null) => storage.set(USER_KEY, u ? JSON.stringify(u) : null)

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  /** Re-validates the session cookie with the server; signs out if it was rejected. */
  refresh: () => Promise<void>
  updatePreferences: (prefs: User['preferences']) => Promise<void>
}

const legacy = takeLegacySession()
const initialUser = loadUser() ?? legacy?.user ?? null
let legacyToken = legacy?.token

export const useAuth = create<AuthState>((set, get) => {
  const start = (user: User) => {
    saveUser(user)
    set({ user, isAuthenticated: true })
    return user
  }
  const clear = () => {
    saveUser(null)
    set({ user: null, isAuthenticated: false })
  }
  const signOutOnServer = async () => {
    try {
      await api.logout()
      storage.set(LOGOUT_PENDING_KEY, null)
    } catch {
      // Offline: the cookie is still set. Clear it the next time the app starts online.
      storage.set(LOGOUT_PENDING_KEY, '1')
    }
  }
  return {
    user: initialUser,
    isAuthenticated: !!initialUser,
    login: async (email, password) => {
      const { user } = await api.login(email, password)
      storage.set(LOGOUT_PENDING_KEY, null)
      return start(user)
    },
    register: async (name, email, password) => {
      const { user } = await api.register(name, email, password)
      storage.set(LOGOUT_PENDING_KEY, null)
      return start(user)
    },
    logout: async () => {
      clear()
      await signOutOnServer()
    },
    refresh: async () => {
      if (storage.get(LOGOUT_PENDING_KEY)) {
        clear()
        await signOutOnServer()
        return
      }
      // With no cached profile and no legacy token there is no session to check.
      if (!get().isAuthenticated && !legacyToken) return
      try {
        const { user } = await api.me(legacyToken)
        legacyToken = undefined
        start(user)
      } catch (err) {
        // Offline or server down: keep the cached profile. Only a rejected session signs out.
        if (err instanceof ApiError && err.status === 401) {
          legacyToken = undefined
          clear()
        }
      }
    },
    updatePreferences: async (preferences) => {
      if (!get().isAuthenticated) return
      try {
        const { user } = await api.updateMe({ preferences })
        start(user)
      } catch (err) {
        // A rejected session signs out; otherwise preferences are a convenience and local settings still apply.
        if (err instanceof ApiError && err.status === 401) clear()
      }
    },
  }
})
