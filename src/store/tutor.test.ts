import { describe, expect, it } from 'vitest'
import { DAILY_MESSAGE_LIMIT, HISTORY_LIMIT, remainingToday, sanitizeChats, trimHistory, useTutor } from './tutor'

const msg = (i: number) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${i}` })

describe('tutor history', () => {
  it('keeps the last 10 messages, starting on a question', () => {
    const out = trimHistory(Array.from({ length: 15 }, (_, i) => msg(i)))
    expect(HISTORY_LIMIT).toBe(10)
    expect(out.length).toBeLessThanOrEqual(10)
    expect(out[0].role).toBe('user')
    expect(out.at(-1)!.content).toBe('m14')
  })

  it('caps each conversation in the store', () => {
    const { append, clearChat } = useTutor.getState()
    for (let i = 0; i < 30; i++) append('pendulum', msg(i))
    expect(useTutor.getState().chats.pendulum.length).toBeLessThanOrEqual(HISTORY_LIMIT)
    clearChat('pendulum')
    expect(useTutor.getState().chats.pendulum).toBeUndefined()
  })

  it('clears every conversation on sign-out', () => {
    useTutor.getState().append('titration', msg(0))
    useTutor.getState().clearAll()
    expect(useTutor.getState().chats).toEqual({})
  })

  it('ignores malformed saved conversations', () => {
    expect(sanitizeChats(null)).toEqual({})
    expect(
      sanitizeChats({
        pendulum: [{ role: 'system', content: 'x' }, msg(0), { role: 'user', content: 5 }, msg(1)],
        'Bad Id!': [msg(0)],
        titration: 'nope',
      }),
    ).toEqual({ pendulum: [msg(0), msg(1)] })
  })
})

describe('remainingToday', () => {
  it('uses the lower of the device and server counts', () => {
    expect(remainingToday({ usedToday: 4, serverRemaining: null })).toBe(DAILY_MESSAGE_LIMIT - 4)
    expect(remainingToday({ usedToday: 4, serverRemaining: 2 })).toBe(2)
    expect(remainingToday({ usedToday: 40, serverRemaining: 9 })).toBe(0)
  })
})
