import { create } from 'zustand'
import { announce } from '../lib/announce'
import {
  enqueue,
  flushOutbox,
  localOutboxStorage,
  parseOutbox,
  reconcile,
  withRetry,
  type OutboxEntry,
  type OutboxStorage,
} from '../lib/outbox'
import { isOnline, onConnectivityChange, onSyncRequest, requestBackgroundSync } from '../lib/pwa'
import type { CompletionInput, ProgressRecord } from '../lib/progressModel'
import { analytics } from '../services/analytics'
import { api, ApiError } from '../services/api'
import i18n from '../i18n'
import { useAuth } from './auth'

/**
 * Progress that could not be saved to the account yet (offline, server down) waits
 * here and is sent automatically when the app is online again: on the `online`
 * event, when the service worker's Background Sync fires, when the tab becomes
 * visible, on sign-in, and on start-up.
 */

interface OutboxState {
  entries: OutboxEntry[]
  syncing: boolean
  /** How many runs the last flush saved; set for a few seconds, for the "saved" notice. */
  lastSynced: { count: number; at: number } | null
  queue: (userId: string, experimentId: string, input: CompletionInput) => void
  /** Sends the signed-in user's queued runs; returns the records the server confirmed. */
  flush: () => Promise<ProgressRecord[]>
}

/** How long the "results saved" notice stays up. */
const SYNCED_NOTICE_MS = 5000
/** While runs are waiting, try again this often even without an `online` event. */
const RETRY_INTERVAL_MS = 60_000

let storage: OutboxStorage = localOutboxStorage
/** Tests swap the storage. */
export function setOutboxStorage(s: OutboxStorage) {
  storage = s
  useOutbox.setState({ entries: parseOutbox(s.read()) })
}

const persist = (entries: OutboxEntry[]) => storage.write(JSON.stringify(entries))

const statusOf = (err: unknown) => (err instanceof ApiError ? err.status : undefined)
const confirmed = new Set<(r: ProgressRecord) => void>()

/** Lets the progress store pick up records saved by a flush. */
export function onOutboxSaved(fn: (record: ProgressRecord) => void): () => void {
  confirmed.add(fn)
  return () => confirmed.delete(fn)
}

let inflight: Promise<ProgressRecord[]> | null = null

export const useOutbox = create<OutboxState>((set, get) => ({
  entries: parseOutbox(storage.read()),
  syncing: false,
  lastSynced: null,
  queue: (userId, experimentId, input) => {
    const entries = enqueue(get().entries, userId, experimentId, input, Date.now())
    persist(entries)
    set({ entries })
    void requestBackgroundSync()
  },
  flush: () => {
    if (inflight) return inflight
    const { user, isAuthenticated } = useAuth.getState()
    const mine = user ? get().entries.filter((e) => e.userId === user.id) : []
    if (!isAuthenticated || !user || mine.length === 0 || !isOnline()) return Promise.resolve([])
    set({ syncing: true })
    const saved: ProgressRecord[] = []
    inflight = flushOutbox(
      get().entries,
      user.id,
      (entry) =>
        withRetry(
          async () => {
            const { progress } = await api.saveProgress(entry.experimentId, entry.input)
            saved.push(progress)
          },
          // A flaky connection often recovers within a second or two.
          { retries: 2, baseMs: 800, shouldRetry: (err) => statusOf(err) === 0 || (statusOf(err) ?? 0) >= 500 },
        ),
      statusOf,
    )
      .then((result) => {
        const entries = reconcile(get().entries, result)
        persist(entries)
        if (saved.length > 0) {
          const notice = { count: saved.length, at: Date.now() }
          set({ entries, lastSynced: notice })
          window.setTimeout(() => get().lastSynced === notice && set({ lastSynced: null }), SYNCED_NOTICE_MS)
        } else set({ entries })
        for (const r of saved) for (const fn of confirmed) fn(r)
        if (saved.length > 0) announce(i18n.t('pwa.synced', { count: saved.length }))
        return saved
      })
      .finally(() => {
        inflight = null
        set({ syncing: false })
      })
    return inflight
  },
}))

/** Number of unsent runs for the signed-in user. */
export function usePendingCount(): number {
  const userId = useAuth((s) => s.user?.id)
  return useOutbox((s) => (userId ? s.entries.filter((e) => e.userId === userId).length : 0))
}

const flush = () => void useOutbox.getState().flush()

if (typeof window !== 'undefined') {
  onConnectivityChange((up) => {
    if (!up) return
    flush()
    // Anonymous usage events recorded offline go out too.
    void analytics.flush?.()
  })
  onSyncRequest(flush)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && flush())
  // navigator.onLine can say "online" on Wi-Fi without internet, so no `online` event ever comes: retry now and then.
  window.setInterval(() => {
    const id = useAuth.getState().user?.id
    if (id && useOutbox.getState().entries.some((e) => e.userId === id)) flush()
  }, RETRY_INTERVAL_MS)
  // Another tab may have queued or flushed runs.
  window.addEventListener('storage', (e) => {
    if (e.key === null || e.key === 'edulab-progress-outbox') useOutbox.setState({ entries: parseOutbox(storage.read()) })
  })
}
useAuth.subscribe((s, prev) => s.user && s.user.id !== prev.user?.id && flush())
// Start-up: runs left over from an earlier offline session.
if (typeof window !== 'undefined') window.setTimeout(flush, 0)
