import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { TutorMessage, TutorQuizResult } from '../../server/tutor/types'

/** Messages one browser may send per day, matching the server's per-IP daily limit. */
export const DAILY_MESSAGE_LIMIT = 30
/** Messages kept per experiment, and sent to the tutor as conversation history. */
export const HISTORY_LIMIT = 10

const USAGE_KEY = 'edulab-tutor-usage'
export const CHATS_KEY = 'edulab-tutor-chats'

const today = () => new Date().toISOString().slice(0, 10)

function readUsage(): number {
  try {
    const saved = JSON.parse(localStorage.getItem(USAGE_KEY) ?? 'null') as { day: string; count: number } | null
    if (saved?.day === today() && Number.isFinite(saved.count)) return saved.count
  } catch {
    /* storage unavailable */
  }
  return 0
}

/** Keeps the newest HISTORY_LIMIT messages, starting on a learner question so the history reads naturally. */
export function trimHistory(messages: TutorMessage[]): TutorMessage[] {
  const out = messages.slice(-HISTORY_LIMIT)
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

/** Accepts only well-formed saved conversations (the stored JSON may be old or edited by hand). */
export function sanitizeChats(raw: unknown): Record<string, TutorMessage[]> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, TutorMessage[]> = {}
  for (const [id, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[a-z0-9-]{1,60}$/.test(id) || !Array.isArray(list)) continue
    const msgs = list.filter(
      (m): m is TutorMessage => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length > 0,
    )
    const trimmed = trimHistory(msgs.map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })))
    if (trimmed.length) out[id] = trimmed
  }
  return out
}

interface TutorState {
  open: boolean
  setOpen: (open: boolean) => void
  /** Conversation per experiment id, saved on this device (last HISTORY_LIMIT messages each). */
  chats: Record<string, TutorMessage[]>
  append: (experimentId: string, message: TutorMessage) => void
  /** Replaces a conversation, e.g. to take back a question that could not be sent. */
  setChat: (experimentId: string, messages: TutorMessage[]) => void
  clearChat: (experimentId: string) => void
  /** Removes every saved conversation (on sign-out). */
  clearAll: () => void
  usedToday: number
  countMessage: () => void
  /** Messages the server says this network has left today, once known. */
  serverRemaining: number | null
  setServerRemaining: (n: number) => void
  /** Whether /api/tutor can answer: null until checked. */
  available: boolean | null
  setAvailable: (available: boolean) => void
  /** Latest knowledge-check result per experiment, shared with the tutor as context. */
  quizResults: Record<string, TutorQuizResult>
  reportQuizResult: (experimentId: string, result: TutorQuizResult) => void
}

export const useTutor = create<TutorState>()(
  persist(
    (set, get) => ({
      open: false,
      setOpen: (open) => set({ open }),
      chats: {},
      append: (id, message) => set((s) => ({ chats: { ...s.chats, [id]: trimHistory([...(s.chats[id] ?? []), message]) } })),
      setChat: (id, messages) => set((s) => ({ chats: { ...s.chats, [id]: trimHistory(messages) } })),
      clearChat: (id) =>
        set((s) => {
          const chats = { ...s.chats }
          delete chats[id]
          return { chats }
        }),
      clearAll: () => set({ chats: {} }),
      usedToday: readUsage(),
      countMessage: () => {
        const count = Math.max(readUsage(), get().usedToday) + 1
        try {
          localStorage.setItem(USAGE_KEY, JSON.stringify({ day: today(), count }))
        } catch {
          /* ignore */
        }
        set({ usedToday: count })
      },
      serverRemaining: null,
      setServerRemaining: (n) => set({ serverRemaining: Math.max(0, n) }),
      available: null,
      setAvailable: (available) => set({ available }),
      quizResults: {},
      reportQuizResult: (id, result) => set((s) => ({ quizResults: { ...s.quizResults, [id]: result } })),
    }),
    {
      name: CHATS_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ chats: s.chats }),
      merge: (saved, current) => ({ ...current, chats: sanitizeChats((saved as { chats?: unknown } | undefined)?.chats) }),
    },
  ),
)

/** Messages this learner can still send today: the lower of the device count and the server's count. */
export function remainingToday(s: Pick<TutorState, 'usedToday' | 'serverRemaining'>): number {
  const local = Math.max(0, DAILY_MESSAGE_LIMIT - s.usedToday)
  return s.serverRemaining === null ? local : Math.min(local, s.serverRemaining)
}
