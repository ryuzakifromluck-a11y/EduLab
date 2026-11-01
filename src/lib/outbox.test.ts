import { describe, expect, it } from 'vitest'
import { MAX_ATTEMPTS, classifyError, enqueue, flushOutbox, mergeInput, parseOutbox, reconcile, withRetry, type OutboxEntry } from './outbox'

const err = (status: number) => Object.assign(new Error('x'), { status })
const statusOf = (e: unknown) => (e as { status?: number }).status

describe('enqueue', () => {
  it('adds a new entry per user and experiment', () => {
    let q = enqueue([], 'u1', 'pendulum', { score: 60 }, 1)
    q = enqueue(q, 'u1', 'titration', { score: 80 }, 2)
    q = enqueue(q, 'u2', 'pendulum', { score: 90 }, 3)
    expect(q).toHaveLength(3)
  })

  it('collapses repeated offline runs: best score, latest settings, first queued time', () => {
    let q = enqueue([], 'u1', 'pendulum', { score: 80, settings: { length: 1 } }, 1)
    q = enqueue(q, 'u1', 'pendulum', { score: 60, settings: { length: 2 } }, 2)
    expect(q).toEqual([{ userId: 'u1', experimentId: 'pendulum', input: { score: 80, settings: { length: 2 } }, queuedAt: 1, attempts: 0 }])
  })
})

describe('mergeInput', () => {
  it('keeps a score when the newer run has none', () => {
    expect(mergeInput({ score: 70 }, { score: null })).toEqual({ score: 70 })
  })
})

describe('parseOutbox', () => {
  it('survives corrupt storage', () => {
    expect(parseOutbox('{nope')).toEqual([])
    expect(parseOutbox('{"a":1}')).toEqual([])
    expect(parseOutbox(JSON.stringify([{ userId: 'u', experimentId: 'e', input: {} }, { bad: true }]))).toHaveLength(1)
  })
})

describe('classifyError', () => {
  it('retries network, timeout, rate-limit, auth and server errors; drops other client errors', () => {
    for (const s of [undefined, 0, 401, 408, 429, 500, 503]) expect(classifyError(s)).toBe('retry')
    for (const s of [400, 404, 422]) expect(classifyError(s)).toBe('drop')
  })
})

describe('flushOutbox', () => {
  const q: OutboxEntry[] = [
    { userId: 'u1', experimentId: 'a', input: { score: 1 }, queuedAt: 1, attempts: 0 },
    { userId: 'u2', experimentId: 'b', input: { score: 2 }, queuedAt: 2, attempts: 0 },
    { userId: 'u1', experimentId: 'c', input: { score: 3 }, queuedAt: 3, attempts: 0 },
  ]

  it("sends only the signed-in user's entries", async () => {
    const seen: string[] = []
    const r = await flushOutbox(q, 'u1', async (e) => void seen.push(e.experimentId), statusOf)
    expect(seen).toEqual(['a', 'c'])
    expect(r.remaining.map((e) => e.experimentId)).toEqual(['b'])
  })

  it('stops at the first network failure without counting it as an attempt', async () => {
    const seen: string[] = []
    const r = await flushOutbox(q, 'u1', async (e) => {
      seen.push(e.experimentId)
      throw err(0)
    }, statusOf)
    expect(seen).toEqual(['a'])
    expect(r.remaining.map((e) => [e.experimentId, e.attempts])).toEqual([['a', 0], ['b', 0], ['c', 0]])
  })

  it('counts server errors and drops an entry the server keeps refusing', async () => {
    const tired = [{ ...q[0], attempts: MAX_ATTEMPTS - 1 }]
    const r = await flushOutbox(tired, 'u1', async () => Promise.reject(err(500)), statusOf)
    expect(r.dropped).toHaveLength(1)
    expect(r.remaining).toEqual([])
  })

  it('drops entries the server rejects as invalid and carries on', async () => {
    const r = await flushOutbox(q, 'u1', async (e) => {
      if (e.experimentId === 'a') throw err(404)
    }, statusOf)
    expect(r.dropped.map((e) => e.experimentId)).toEqual(['a'])
    expect(r.sent.map((e) => e.experimentId)).toEqual(['c'])
  })
})

describe('reconcile', () => {
  it('removes sent entries but keeps one that changed while the flush was running', async () => {
    const before = enqueue(enqueue([], 'u1', 'a', { score: 50 }, 1), 'u1', 'b', { score: 50 }, 2)
    const result = await flushOutbox(before, 'u1', async () => {}, statusOf)
    const during = enqueue(before, 'u1', 'b', { score: 90 }, 3)
    expect(reconcile(during, result).map((e) => [e.experimentId, e.input.score])).toEqual([['b', 90]])
  })
})

describe('withRetry', () => {
  it('retries with exponential backoff, then gives up', async () => {
    const waits: number[] = []
    let calls = 0
    await expect(
      withRetry(async () => {
        calls++
        throw new Error('down')
      }, { retries: 2, baseMs: 100, sleep: async (ms) => void waits.push(ms) }),
    ).rejects.toThrow('down')
    expect(calls).toBe(3)
    expect(waits).toEqual([100, 200])
  })

  it('does not retry when shouldRetry says no', async () => {
    let calls = 0
    await expect(withRetry(async () => { calls++; throw err(404) }, { shouldRetry: () => false })).rejects.toThrow()
    expect(calls).toBe(1)
  })

  it('returns the first success', async () => {
    let calls = 0
    const v = await withRetry(async () => (++calls < 2 ? Promise.reject(new Error()) : 'ok'), { sleep: async () => {} })
    expect(v).toBe('ok')
  })
})
