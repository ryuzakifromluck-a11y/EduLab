import { describe, expect, it } from 'vitest'
import { SALTS, SolutionSimulation, massPercent, saturationTemperature, solubility, solubilityCurves } from './solubility'

describe('solubility curves', () => {
  it('pass through the tabulated values', () => {
    for (const s of SALTS) s.table.forEach((v, i) => expect(solubility(s.id, i * 10)).toBeCloseTo(v, 9))
  })

  it('increase with temperature and never overshoot between data points', () => {
    for (const s of SALTS) {
      for (let T = 0; T < 100; T += 0.5) {
        const a = solubility(s.id, T)
        const b = solubility(s.id, T + 0.5)
        expect(b, `${s.id} at ${T}`).toBeGreaterThanOrEqual(a - 1e-9)
        const i = Math.floor(T / 10)
        expect(a).toBeGreaterThanOrEqual(Math.min(s.table[i], s.table[i + 1]) - 1e-9)
        expect(a).toBeLessThanOrEqual(Math.max(s.table[i], s.table[i + 1]) + 1e-9)
      }
    }
  })

  it('KNO₃ is far more temperature-sensitive than NaCl', () => {
    const kno3 = solubility('kno3', 80) - solubility('kno3', 20)
    const nacl = solubility('nacl', 80) - solubility('nacl', 20)
    expect(kno3).toBeGreaterThan(30 * nacl)
  })

  it('finds the saturation temperature', () => {
    expect(saturationTemperature('kno3', 63.9)).toBeCloseTo(40, 6)
    expect(saturationTemperature('kno3', 10)).toBe(0)
    expect(saturationTemperature('nacl', 50)).toBeNull()
  })

  it('tabulates every salt', () => {
    const rows = solubilityCurves(11)
    expect(rows[2].T).toBe(20)
    expect(rows[2].nacl).toBeCloseTo(36.0, 9)
  })
})

describe('dissolving', () => {
  it('dissolves everything below saturation', () => {
    const s = new SolutionSimulation('kno3', 40)
    s.add(50)
    s.advance(120)
    expect(s.dissolved).toBeCloseTo(50, 6)
    expect(s.state).toBe('unsaturated')
  })

  it('leaves the excess at the bottom of a saturated solution', () => {
    const s = new SolutionSimulation('nacl', 20)
    s.add(50)
    s.advance(200)
    expect(s.dissolved).toBeCloseTo(36, 3)
    expect(s.undissolved).toBeCloseTo(14, 3)
    expect(s.state).toBe('saturated')
    expect(massPercent(s.dissolved, 100)).toBeCloseTo((100 * 36) / 136, 2)
  })

  it('crystallises when a saturated solution is cooled', () => {
    const s = new SolutionSimulation('kno3', 60)
    s.add(100)
    s.advance(200)
    expect(s.undissolved).toBeCloseTo(0, 6)
    s.temperature = 20
    expect(s.state).toBe('supersaturated')
    s.advance(300)
    expect(s.dissolved).toBeCloseTo(31.6, 2)
    expect(s.undissolved).toBeCloseTo(68.4, 2)
  })
})
