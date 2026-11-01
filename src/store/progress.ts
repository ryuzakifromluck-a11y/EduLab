import { create } from 'zustand'
import { applyCompletion, type CompletionInput, type ProgressRecord } from '../lib/progressModel'
import { classifyError } from '../lib/outbox'
import { api, ApiError } from '../services/api'
import { useAuth } from './auth'
import { onOutboxSaved, useOutbox } from './outbox'

const CACHE_PREFIX = 'edulab-progress-cache:'

/** Last progress list the server sent, per user, so the account page also works offline. */
function readCache(userId: string): Record<string, ProgressRecord> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_PREFIX + userId) ?? '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeCache(userId: string, records: Record<string, ProgressRecord>) {
  try {
    localStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(records))
  } catch {
    /* storage full or unavailable */
  }
}

/** Server records plus the runs still waiting in the outbox. */
function withQueued(userId: string, records: Record<string, ProgressRecord>): Record<string, ProgressRecord> {
  const out = { ...records }
  for (const e of useOutbox.getState().entries) {
    if (e.userId === userId) out[e.experimentId] = applyCompletion(out[e.experimentId], e.experimentId, e.input, new Date(e.queuedAt))
  }
  return out
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface ProgressState {
  /** experimentId → record, for the signed-in user. */
  records: Record<string, ProgressRecord>
  status: LoadState
  load: () => Promise<void>
  /**
   * Saves a completed run to the server and returns the updated record. When the server
   * can't be reached the run is queued in the outbox (sent automatically once online) and
   * the record is updated locally, so the account page shows it straight away.
   */
  complete: (experimentId: string, input: CompletionInput) => Promise<ProgressRecord>
  clear: () => void
}

export const useProgress = create<ProgressState>((set, get) => ({
  records: {},
  status: 'idle',
  load: async () => {
    const { user } = useAuth.getState()
    if (!user) return
    set({ status: 'loading' })
    try {
      const { progress } = await api.listProgress()
      // Ignore a response that arrives after the user signed out or switched account.
      if (useAuth.getState().user?.id !== user.id) return
      const records = Object.fromEntries(progress.map((r) => [r.experimentId, r]))
      writeCache(user.id, records)
      set({ records: withQueued(user.id, records), status: 'ready' })
    } catch {
      if (useAuth.getState().user?.id !== user.id) return
      // Offline: show what this device last saw, so the account page is not empty.
      set({ records: withQueued(user.id, readCache(user.id)), status: 'error' })
    }
  },
  complete: async (experimentId, input) => {
    const { user, isAuthenticated } = useAuth.getState()
    if (!user || !isAuthenticated) throw new Error('not signed in')
    try {
      const { progress } = await api.saveProgress(experimentId, input)
      set({ records: { ...get().records, [experimentId]: progress } })
      writeCache(user.id, { ...readCache(user.id), [experimentId]: progress })
      return progress
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined
      if (classifyError(status) !== 'retry' || status === 401) throw err
      useOutbox.getState().queue(user.id, experimentId, input)
      const local = applyCompletion(get().records[experimentId], experimentId, input)
      set({ records: { ...get().records, [experimentId]: local } })
      return local
    }
  },
  clear: () => set({ records: {}, status: 'idle' }),
}))

/** Keep progress in step with the session: load on sign-in, clear on sign-out. */
let lastUserId: string | null = null
function sync(userId: string | null) {
  if (userId === lastUserId) return
  // Signing out (e.g. on a shared classroom computer) removes the cached list from this device.
  // Unsent runs stay in the outbox and are sent when that user signs in again.
  if (lastUserId) {
    try {
      localStorage.removeItem(CACHE_PREFIX + lastUserId)
    } catch {
      /* ignore */
    }
  }
  lastUserId = userId
  useProgress.getState().clear()
  if (userId) void useProgress.getState().load()
}
useAuth.subscribe((s) => sync(s.user?.id ?? null))
// Runs saved later from the outbox replace their optimistic local records.
onOutboxSaved((record) => {
  const user = useAuth.getState().user
  if (!user) return
  useProgress.setState((s) => ({ records: { ...s.records, [record.experimentId]: record } }))
  writeCache(user.id, { ...readCache(user.id), [record.experimentId]: record })
})
sync(useAuth.getState().user?.id ?? null)
