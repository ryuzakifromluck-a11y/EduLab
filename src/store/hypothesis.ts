import { create } from 'zustand'
import {
  applyResult,
  createRecord,
  editRecord,
  mergeRecords,
  type HypothesisComparison,
  type HypothesisDraft,
  type HypothesisRecord,
  type SelfAssessment,
} from '../lib/hypothesis'
import type { ProgressSettings } from '../lib/progressModel'
import { api } from '../services/api'
import { useAuth } from './auth'

/**
 * Hypotheses, one current record per experiment. Always kept in localStorage
 * so guests can use the stage too; while signed in every change is also sent
 * to the account, and on sign-in the device and the account are merged (the
 * most recently updated record wins). Signing out removes the account's
 * records from this device; they stay on the server.
 */

const RECORDS_KEY = 'edulab-hypotheses'
const OWNER_KEY = 'edulab-hypotheses-owner'
const SKIPPED_KEY = 'edulab-hypothesis-skipped'

function read<T>(storage: () => Storage, key: string, fallback: T, valid: (v: unknown) => boolean): T {
  try {
    const raw = storage().getItem(key)
    const parsed = raw ? JSON.parse(raw) : fallback
    return valid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function write(storage: () => Storage, key: string, value: unknown) {
  try {
    if (value === null) storage().removeItem(key)
    else storage().setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: records last until the tab closes */
  }
}

const local = () => localStorage
const session = () => sessionStorage
const isRecordMap = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v)

type SyncState = 'idle' | 'syncing' | 'synced' | 'error'

interface HypothesisState {
  records: Record<string, HypothesisRecord>
  /** Experiments whose hypothesis prompt was skipped in this browser session. */
  skipped: string[]
  sync: SyncState
  /** Starts a new hypothesis for the run that begins now with `baseline` settings. */
  save: (experimentId: string, draft: HypothesisDraft, baseline: ProgressSettings) => HypothesisRecord
  /** Rewords the current, untested hypothesis without restarting the run. */
  edit: (experimentId: string, draft: HypothesisDraft) => HypothesisRecord | undefined
  /** Stores the comparison with the result and the student's own judgement. */
  recordResult: (experimentId: string, comparison: HypothesisComparison, self: SelfAssessment, reflection: string) => HypothesisRecord | undefined
  skip: (experimentId: string) => void
  mergeRemote: (remote: Record<string, HypothesisRecord>) => void
  clear: () => void
}

export const useHypotheses = create<HypothesisState>((set, get) => {
  const commit = (record: HypothesisRecord) => {
    const records = { ...get().records, [record.experimentId]: record }
    write(local, RECORDS_KEY, records)
    set({ records, skipped: get().skipped.filter((id) => id !== record.experimentId) })
    push(record)
    return record
  }
  return {
    records: read(local, RECORDS_KEY, {}, isRecordMap),
    skipped: read(session, SKIPPED_KEY, [], Array.isArray),
    sync: 'idle',
    save: (experimentId, draft, baseline) => commit(createRecord(get().records[experimentId], experimentId, draft, baseline)),
    edit: (experimentId, draft) => {
      const prev = get().records[experimentId]
      return prev ? commit(editRecord(prev, draft)) : undefined
    },
    recordResult: (experimentId, comparison, self, reflection) => {
      const prev = get().records[experimentId]
      return prev ? commit(applyResult(prev, comparison, self, reflection)) : undefined
    },
    skip: (experimentId) => {
      if (get().skipped.includes(experimentId)) return
      const skipped = [...get().skipped, experimentId]
      write(session, SKIPPED_KEY, skipped)
      set({ skipped })
    },
    mergeRemote: (remote) => {
      const records = mergeRecords(get().records, remote)
      write(local, RECORDS_KEY, records)
      set({ records })
    },
    clear: () => {
      write(local, RECORDS_KEY, null)
      set({ records: {}, sync: 'idle' })
    },
  }
})

/** Sends one record to the signed-in account. Failures are kept locally and retried on the next sign-in. */
function push(record: HypothesisRecord) {
  const userId = useAuth.getState().user?.id
  if (!userId || !useAuth.getState().isAuthenticated) return
  void api
    .saveHypothesis(record)
    .then(({ hypothesis }) => {
      // The server keeps a newer copy from another device if there is one.
      if (useAuth.getState().user?.id === userId && hypothesis.updatedAt > record.updatedAt) useHypotheses.getState().mergeRemote({ [hypothesis.experimentId]: hypothesis })
    })
    .catch(() => useHypotheses.setState({ sync: 'error' }))
}

/** Pulls the account's hypotheses, merges them with this device's, and uploads what the account lacks. */
export async function syncHypotheses(): Promise<void> {
  const { user, isAuthenticated } = useAuth.getState()
  if (!user || !isAuthenticated) return
  useHypotheses.setState({ sync: 'syncing' })
  try {
    const { hypotheses } = await api.listHypotheses()
    if (useAuth.getState().user?.id !== user.id) return
    const remote = Object.fromEntries(hypotheses.map((r) => [r.experimentId, r]))
    const { records } = useHypotheses.getState()
    useHypotheses.getState().mergeRemote(remote)
    setOwner(user.id)
    await Promise.all(
      Object.values(records)
        .filter((r) => !remote[r.experimentId] || r.updatedAt > remote[r.experimentId].updatedAt)
        .map((r) => api.saveHypothesis(r)),
    )
    useHypotheses.setState({ sync: 'synced' })
  } catch {
    if (useAuth.getState().user?.id === user.id) useHypotheses.setState({ sync: 'error' })
  }
}

/** The account whose records this device holds (kept in memory too, in case storage is unavailable). */
let owner: string | null = read<string | null>(local, OWNER_KEY, null, (v) => typeof v === 'string')
function setOwner(id: string | null) {
  owner = id
  write(local, OWNER_KEY, id)
}

/** Keep hypotheses in step with the session: merge on sign-in, remove the account's copy from the device on sign-out. */
let lastUser: string | null = useAuth.getState().user?.id ?? null
// A different account than the one that last synced this device must not inherit its records.
if (lastUser && owner && owner !== lastUser) {
  useHypotheses.getState().clear()
  setOwner(null)
}
useAuth.subscribe((s) => {
  const userId = s.user?.id ?? null
  if (userId === lastUser) return
  if (lastUser && owner === lastUser) {
    useHypotheses.getState().clear()
    setOwner(null)
  }
  lastUser = userId
  if (userId) void syncHypotheses()
})
if (lastUser) void syncHypotheses()
