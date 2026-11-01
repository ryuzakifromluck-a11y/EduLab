import { describe, expect, it } from 'vitest'
import { compareHypothesis, type HypothesisDraft } from '../lib/hypothesis'
import en from '../i18n/locales/en'
import { EXPERIMENTS } from './experiments'
import { HYPOTHESIS_SPECS, hypothesisSpec } from './hypotheses'

const lookup = (key: string): unknown => key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), en)

/** Tests "if I <change> <variable>, <outcome> will …" with the model, from the experiment's defaults. */
function effect(experimentId: string, variable: string, outcome: string, change: 'increase' | 'decrease' = 'increase', at = {}) {
  const spec = hypothesisSpec(experimentId)!
  const d: HypothesisDraft = { variable, change, plan: '', outcome, expected: 'same', prediction: '...', affected: [] }
  const settings = { ...spec.defaults, ...at }
  return compareHypothesis(spec, d, settings, settings).outcomes.find((o) => o.id === outcome)!.direction
}

describe('hypothesis specs', () => {
  it('exist for exactly the available experiments flagged with hasHypothesis', () => {
    for (const e of EXPERIMENTS.filter((x) => x.hasHypothesis)) {
      expect(e.status, e.id).toBe('available')
      expect(HYPOTHESIS_SPECS[e.id], e.id).toBeDefined()
    }
    for (const id of Object.keys(HYPOTHESIS_SPECS)) expect(EXPERIMENTS.find((e) => e.id === id)?.hasHypothesis, id).toBe(true)
  })

  it('label every variable and outcome with an existing English string', () => {
    for (const spec of Object.values(HYPOTHESIS_SPECS)) {
      for (const item of [...spec.variables, ...spec.outcomes]) {
        expect(typeof lookup(item.labelKey), `${spec.experimentId}: ${item.labelKey}`).toBe('string')
      }
    }
  })

  it('give every variable a numeric default inside its range, and evaluate every outcome', () => {
    for (const spec of Object.values(HYPOTHESIS_SPECS)) {
      for (const v of spec.variables) {
        const d = spec.defaults[v.id]
        expect(typeof d, `${spec.experimentId}.${v.id}`).toBe('number')
        expect(d as number).toBeGreaterThanOrEqual(v.min)
        expect(d as number).toBeLessThanOrEqual(v.max)
      }
      const values = spec.evaluate(spec.defaults)
      for (const o of spec.outcomes) expect(typeof values[o.id], `${spec.experimentId}.${o.id}`).toBe('number')
    }
  })
})

describe('hypothesis specs follow the physics and chemistry', () => {
  it('pendulum: longer → slower, stronger gravity → faster', () => {
    expect(effect('pendulum', 'length', 'period')).toBe('increase')
    expect(effect('pendulum', 'length', 'frequency')).toBe('decrease')
    expect(effect('pendulum', 'gravity', 'period')).toBe('decrease')
    expect(effect('pendulum', 'angleDeg', 'period')).toBe('increase')
  })

  it("Ohm's law: more resistance → less current; voltage across the resistor follows the battery", () => {
    expect(effect('ohms-law', 'resistance', 'current')).toBe('decrease')
    expect(effect('ohms-law', 'voltage', 'current')).toBe('increase')
    expect(effect('ohms-law', 'resistance', 'resistorVoltage')).toBe('same')
  })

  it('titration: adding base raises the pH but not the equivalence volume', () => {
    expect(effect('titration', 'addedVolume', 'ph')).toBe('increase')
    expect(effect('titration', 'addedVolume', 'equivalenceVolume')).toBe('same')
    expect(effect('titration', 'baseConcentration', 'equivalenceVolume')).toBe('decrease')
    expect(effect('titration', 'acidConcentration', 'startPh')).toBe('decrease')
  })

  it('projectile: faster → further; complementary angles land at the same spot', () => {
    expect(effect('projectile-motion', 'speed', 'range')).toBe('increase')
    expect(effect('projectile-motion', 'angleDeg', 'range', 'increase', { angleDeg: 45 })).toBe('decrease')
    expect(effect('projectile-motion', 'angleDeg', 'maxHeight')).toBe('increase')
    const spec = hypothesisSpec('projectile-motion')!
    const d: HypothesisDraft = { variable: 'angleDeg', change: 'increase', plan: '', outcome: 'range', expected: 'same', prediction: '...', affected: [] }
    const c = compareHypothesis(spec, d, { ...spec.defaults, angleDeg: 30 }, { ...spec.defaults, angleDeg: 60 })
    expect(c.outcomes.find((o) => o.id === 'range')!.direction).toBe('same')
    expect(c.predictionCorrect).toBe(true)
  })

  it('projectile with air resistance uses the drag simulation', () => {
    const spec = hypothesisSpec('projectile-motion')!
    const still = spec.evaluate({ ...spec.defaults, airResistance: false }).range
    const air = spec.evaluate({ ...spec.defaults, airResistance: true }).range
    expect(air).toBeLessThan(still)
  })

  it('reaction rate: hotter or more concentrated → cross vanishes sooner', () => {
    expect(effect('reaction-rate', 'temperatureC', 'crossTime')).toBe('decrease')
    expect(effect('reaction-rate', 'concentration', 'crossTime')).toBe('decrease')
    expect(effect('reaction-rate', 'concentration', 'rateConstant')).toBe('same')
    expect(effect('reaction-rate', 'concentration', 'initialRate')).toBe('increase')
  })
})
