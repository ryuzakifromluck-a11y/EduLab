import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HypothesisDraft, HypothesisRecord } from '../lib/hypothesis'

const remote: HypothesisRecord[] = []
const saveHypothesis = vi.fn(async (record: HypothesisRecord) => ({ hypothesis: record }))
const listHypotheses = vi.fn(async () => ({ hypotheses: remote }))

vi.mock('../services/api', () => ({
  api: { saveHypothesis, listHypotheses, me: vi.fn(async () => ({ user: null })) },
  ApiError: class extends Error {},
}))

const { useAuth } = await import('./auth')
const { useHypotheses, syncHypotheses } = await import('./hypothesis')

const draft: HypothesisDraft = {
  variable: 'length',
  change: 'increase',
  plan: '',
  outcome: 'period',
  expected: 'increase',
  prediction: 'It swings slower',
  affected: ['period'],
}
const user = (id: string) => ({ id, email: `${id}@x.co`, name: id, createdAt: '2026-01-01T00:00:00.000Z', preferences: {} })
const signIn = (id: string) => useAuth.setState({ user: user(id), isAuthenticated: true })
const signOut = () => useAuth.setState({ user: null, isAuthenticated: false })
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  signOut()
  useHypotheses.getState().clear()
  remote.length = 0
  saveHypothesis.mockClear()
  listHypotheses.mockClear()
})

describe('hypothesis store', () => {
  it('works for guests without touching the server', () => {
    const r = useHypotheses.getState().save('pendulum', draft, { length: 1 })
    expect(useHypotheses.getState().records.pendulum).toEqual(r)
    expect(saveHypothesis).not.toHaveBeenCalled()
  })

  it('remembers a skipped prompt and forgets it once a hypothesis is saved', () => {
    useHypotheses.getState().skip('ohms-law')
    expect(useHypotheses.getState().skipped).toContain('ohms-law')
    useHypotheses.getState().save('ohms-law', draft, {})
    expect(useHypotheses.getState().skipped).not.toContain('ohms-law')
  })

  it('uploads guest hypotheses on sign-in and merges the account’s own', async () => {
    useHypotheses.getState().save('pendulum', draft, { length: 1 })
    remote.push({ ...useHypotheses.getState().records.pendulum, experimentId: 'titration' })
    signIn('ada')
    await flush()
    await flush()
    expect(listHypotheses).toHaveBeenCalledTimes(1)
    expect(saveHypothesis).toHaveBeenCalledTimes(1)
    expect(saveHypothesis.mock.calls[0][0].experimentId).toBe('pendulum')
    expect(Object.keys(useHypotheses.getState().records).sort()).toEqual(['pendulum', 'titration'])
    expect(useHypotheses.getState().sync).toBe('synced')
  })

  it('sends every change while signed in, and removes the account’s records on sign-out', async () => {
    signIn('bob')
    await syncHypotheses()
    saveHypothesis.mockClear()
    useHypotheses.getState().save('reaction-rate', draft, {})
    expect(saveHypothesis).toHaveBeenCalledTimes(1)
    signOut()
    expect(useHypotheses.getState().records).toEqual({})
  })
})
