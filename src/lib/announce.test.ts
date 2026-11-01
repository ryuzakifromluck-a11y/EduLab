import { describe, expect, it, vi } from 'vitest'
import { announce, subscribeAnnouncements } from './announce'

describe('announce', () => {
  it('delivers messages to subscribers with their politeness', () => {
    const fn = vi.fn()
    const off = subscribeAnnouncements(fn)
    announce('Experiment completed')
    announce('Quiz score: 4/5', 'assertive')
    expect(fn).toHaveBeenNthCalledWith(1, 'Experiment completed', 'polite')
    expect(fn).toHaveBeenNthCalledWith(2, 'Quiz score: 4/5', 'assertive')
    off()
    announce('ignored')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('skips empty messages', () => {
    const fn = vi.fn()
    const off = subscribeAnnouncements(fn)
    announce('')
    expect(fn).not.toHaveBeenCalled()
    off()
  })
})
