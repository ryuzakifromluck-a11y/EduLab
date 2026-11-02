import { describe, expect, it, vi } from 'vitest'
import { applySharedSettings, bool, choice, num } from './sharedSettings'

describe('applySharedSettings', () => {
  it('applies changed values only, clamps numbers and ignores junk', () => {
    const setLength = vi.fn()
    const setAngle = vi.fn()
    const setGravity = vi.fn()
    const setSpring = vi.fn()
    const setTrail = vi.fn()
    const changed = applySharedSettings(
      { length: 9, angleDeg: 25, gravity: 'heavy', spring: 'stiff', trail: false, extra: 1 },
      {
        length: num(1, 0.2, 3, setLength),
        angleDeg: num(25, 1, 170, setAngle),
        gravity: num(9.81, 0.5, 25, setGravity),
        spring: choice('soft', ['soft', 'medium', 'stiff'], setSpring),
        trail: bool(true, setTrail),
      },
    )
    expect(setLength).toHaveBeenCalledWith(3)
    expect(setAngle).not.toHaveBeenCalled()
    expect(setGravity).not.toHaveBeenCalled()
    expect(setSpring).toHaveBeenCalledWith('stiff')
    expect(setTrail).toHaveBeenCalledWith(false)
    expect(changed).toEqual(['length', 'spring', 'trail'])
  })

  it('refuses options that are not on the list and non-finite numbers', () => {
    const set = vi.fn()
    applySharedSettings({ v2: 75, mass: Number.NaN }, { v2: choice(50, [50, 100, 250], set), mass: num(1, 0, 2, set) })
    expect(set).not.toHaveBeenCalled()
  })
})
