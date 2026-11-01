import { describe, expect, it } from 'vitest'
import { current, currentResistanceSeries, powerVoltageSeries, solveCircuit, voltageCurrentSeries } from './ohm'

describe("Ohm's law", () => {
  it('computes I = V/R and P = VI for a closed circuit', () => {
    const r = solveCircuit({ voltage: 12, resistance: 4, closed: true })
    expect(r.current).toBe(3)
    expect(r.power).toBe(36)
    expect(r.resistorVoltage).toBe(12)
  })

  it('gives zero current, voltage drop and power when the switch is open', () => {
    expect(solveCircuit({ voltage: 12, resistance: 4, closed: false })).toEqual({
      current: 0,
      resistorVoltage: 0,
      power: 0,
    })
  })

  it('satisfies P = I²R = V²/R', () => {
    const { current: I, power: P } = solveCircuit({ voltage: 9, resistance: 30, closed: true })
    expect(P).toBeCloseTo(I * I * 30, 12)
    expect(P).toBeCloseTo((9 * 9) / 30, 12)
  })

  it('rejects non-positive resistance', () => {
    expect(() => current(5, 0)).toThrow(RangeError)
    expect(() => current(5, -2)).toThrow(RangeError)
  })

  it('produces a straight V–I line whose slope is 1/R', () => {
    const s = voltageCurrentSeries(20, 24, 5)
    expect(s[0]).toEqual({ voltage: 0, current: 0 })
    s.forEach((p) => expect(p.current).toBeCloseTo(p.voltage / 20, 12))
  })

  it('produces an inverse I–R curve and a parabolic P–V curve', () => {
    const ir = currentResistanceSeries(12, 1, 100, 10)
    ir.forEach((p) => expect(p.current * p.resistance).toBeCloseTo(12, 10))
    const pv = powerVoltageSeries(10, 20, 3)
    expect(pv.map((p) => p.power)).toEqual([0, 10, 40])
  })
})
