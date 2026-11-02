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

describe('hypothesis coverage', () => {
  it('every available experiment has a hypothesis stage', () => {
    const missing = EXPERIMENTS.filter((e) => e.status === 'available' && !HYPOTHESIS_SPECS[e.id]).map((e) => e.id)
    expect(missing).toEqual([])
  })

  it('every outcome changes when some variable changes (no dead readings)', () => {
    for (const spec of Object.values(HYPOTHESIS_SPECS)) {
      for (const o of spec.outcomes) {
        const moves = spec.variables.some((v) => (['increase', 'decrease'] as const).some((c) => effect(spec.experimentId, v.id, o.id, c) !== 'same'))
        expect(moves, `${spec.experimentId}.${o.id}`).toBe(true)
      }
    }
  })
})

describe('hypothesis specs for the other physics experiments', () => {
  it("Newton's laws: more force → more acceleration; more mass → less", () => {
    expect(effect('newtons-laws', 'force', 'acceleration')).toBe('increase')
    expect(effect('newtons-laws', 'mass', 'acceleration')).toBe('decrease')
    expect(effect('newtons-laws', 'force', 'maxFriction')).toBe('same')
    expect(effect('newtons-laws', 'friction', 'netForce')).toBe('decrease')
  })

  it('energy conservation: higher start → faster at the bottom; mass does not change the speed', () => {
    expect(effect('energy-conservation', 'height', 'bottomSpeed')).toBe('increase')
    expect(effect('energy-conservation', 'mass', 'bottomSpeed')).toBe('same')
    expect(effect('energy-conservation', 'mass', 'startEnergy')).toBe('increase')
    expect(effect('energy-conservation', 'friction', 'bottomSpeed')).toBe('decrease')
    const spec = hypothesisSpec('energy-conservation')!
    const v = spec.evaluate({ ...spec.defaults, friction: 0 }).bottomSpeed
    expect(v).toBeCloseTo(Math.sqrt(2 * 9.81 * 3), 2)
  })

  it('SHM: heavier → slower; stiffer → faster; amplitude does not change the period', () => {
    expect(effect('simple-harmonic-motion', 'mass', 'period')).toBe('increase')
    expect(effect('simple-harmonic-motion', 'k', 'period')).toBe('decrease')
    expect(effect('simple-harmonic-motion', 'amplitude', 'period')).toBe('same')
    expect(effect('simple-harmonic-motion', 'amplitude', 'energy')).toBe('increase')
  })

  it("Hooke's law: more mass → more extension", () => {
    expect(effect('hookes-law', 'mass', 'extension')).toBe('increase')
    expect(effect('hookes-law', 'mass', 'extension', 'decrease', { mass: 600 })).toBe('decrease')
  })

  it('induction: faster magnet → bigger EMF, same flux', () => {
    expect(effect('electromagnetic-induction', 'frequency', 'peakEmf')).toBe('increase')
    expect(effect('electromagnetic-induction', 'frequency', 'maxFlux')).toBe('same')
    expect(effect('electromagnetic-induction', 'turns', 'peakEmf')).toBe('increase')
    expect(effect('electromagnetic-induction', 'turns', 'magnetSpeed')).toBe('same')
  })

  it('refraction: a steeper ray bends and reflects more; the reflection angle equals the incidence', () => {
    expect(effect('refraction-reflection', 'angle', 'refraction')).toBe('increase')
    expect(effect('refraction-reflection', 'angle', 'reflection')).toBe('increase')
    expect(effect('refraction-reflection', 'angle', 'reflected')).toBe('increase')
    const spec = hypothesisSpec('refraction-reflection')!
    expect(spec.evaluate({ angle: 60, top: 'glass', bottom: 'air' }).refraction).toBe(90)
  })

  it('heat transfer: a hotter bath drives more heat; a longer rod carries less and warms slower', () => {
    expect(effect('heat-transfer', 'tHot', 'flowA')).toBe('increase')
    expect(effect('heat-transfer', 'tHot', 'warmUpA')).toBe('same')
    expect(effect('heat-transfer', 'length', 'flowB')).toBe('decrease')
    expect(effect('heat-transfer', 'length', 'warmUpA')).toBe('increase')
  })

  it('Zeeman: a stronger field splits the line further', () => {
    for (const o of ['wavelengthShift', 'frequencyShift', 'levelSpacing']) expect(effect('zeeman-effect', 'field', o)).toBe('increase')
  })

  it('density: warm liquids are less dense', () => {
    expect(effect('density-measurement', 'temperature', 'waterDensity', 'increase', { temperature: 10 })).toBe('decrease')
    expect(effect('density-measurement', 'temperature', 'liquidDensity', 'increase', { mode: 'liquid', liquid: 'ethanol' })).toBe('decrease')
  })

  it("Joule: more work → a bigger temperature rise; electrical settings only matter for the coil", () => {
    expect(effect('joules-experiment', 'mass', 'temperatureRise')).toBe('increase')
    expect(effect('joules-experiment', 'voltage', 'work')).toBe('same')
    expect(effect('joules-experiment', 'resistance', 'work', 'increase', { method: 'electrical' })).toBe('decrease')
    expect(effect('joules-experiment', 'voltage', 'temperatureRise', 'increase', { method: 'electrical', voltage: 6 })).toBe('increase')
  })

  it('ballistic pendulum: a heavier block swings up less', () => {
    expect(effect('ballistic-pendulum', 'block', 'rise')).toBe('decrease')
    expect(effect('ballistic-pendulum', 'block', 'keptEnergy')).toBe('decrease')
  })

  it('RC circuits: τ = RC does not depend on the battery', () => {
    for (const id of ['rc-circuit-charging', 'rc-circuit-discharging']) {
      expect(effect(id, 'resistance', 'tau')).toBe('increase')
      expect(effect(id, 'capacitance', 'tau')).toBe('increase')
      expect(effect(id, 'voltage', 'tau')).toBe('same')
      expect(effect(id, 'resistance', 'startCurrent')).toBe('decrease')
    }
  })

  it('Archimedes: lowering the body raises the buoyancy and lowers the balance reading', () => {
    expect(effect('archimedes-principle', 'lowered', 'buoyancy')).toBe('increase')
    expect(effect('archimedes-principle', 'lowered', 'apparent')).toBe('decrease')
    // Once it is fully under, going deeper changes nothing.
    expect(effect('archimedes-principle', 'lowered', 'buoyancy', 'increase', { lowered: 6 })).toBe('same')
  })
})

describe('hypothesis specs for the other chemistry experiments', () => {
  it('exo/endo: more solid → hotter for NaOH, colder for NH₄NO₃', () => {
    expect(effect('exo-endo', 'mass', 'finalTemperature')).toBe('increase')
    expect(effect('exo-endo', 'mass', 'finalTemperature', 'increase', { substance: 'nh4no3' })).toBe('decrease')
    expect(effect('exo-endo', 'water', 'heat')).toBe('same')
  })

  it('solubility: KNO₃ dissolves much better when hot', () => {
    expect(effect('solubility', 'temperature', 'solubility')).toBe('increase')
  })

  it('pH: higher pH → less H⁺, more OH⁻', () => {
    expect(effect('ph-indicators', 'pH', 'hydrogen')).toBe('decrease')
    expect(effect('ph-indicators', 'pH', 'hydroxide')).toBe('increase')
    expect(effect('ph-indicators', 'pH', 'pOH')).toBe('decrease')
  })

  it('dilution: a bigger flask dilutes more; moles of solute stay the same', () => {
    expect(effect('dilution', 'v2', 'c2')).toBe('decrease')
    expect(effect('dilution', 'v2', 'moles')).toBe('same')
    expect(effect('dilution', 'v1', 'absorbance')).toBe('increase')
  })

  it('equilibrium: heating favours NO₂ (endothermic); expanding favours more molecules', () => {
    expect(effect('chemical-equilibrium', 'temperature', 'k')).toBe('increase')
    expect(effect('chemical-equilibrium', 'temperature', 'no2')).toBe('increase')
    expect(effect('chemical-equilibrium', 'volume', 'dissociated')).toBe('increase')
    expect(effect('chemical-equilibrium', 'volume', 'k')).toBe('same')
  })

  it('Diels–Alder: hotter → faster; more concentrated → shorter half-life, same k', () => {
    expect(effect('diels-alder-reaction', 'temperature', 'rateConstant')).toBe('increase')
    expect(effect('diels-alder-reaction', 'concentration', 'halfLife')).toBe('decrease')
    expect(effect('diels-alder-reaction', 'concentration', 'rateConstant')).toBe('same')
    expect(effect('diels-alder-reaction', 'temperature', 'endo')).toBe('decrease')
  })

  it('aspirin: more salicylic acid raises the theoretical yield until the anhydride runs out', () => {
    expect(effect('synthesis-of-aspirin', 'saMass', 'theoretical')).toBe('increase')
    expect(effect('synthesis-of-aspirin', 'ac2oVolume', 'theoretical')).toBe('same')
    expect(effect('synthesis-of-aspirin', 'temperature', 'conversion', 'increase', { minutes: 5 })).toBe('increase')
  })

  it('weak base titration: adding acid lowers the pH', () => {
    expect(effect('weak-base-strong-acid-titration', 'addedVolume', 'ph')).toBe('decrease')
    expect(effect('weak-base-strong-acid-titration', 'acidConcentration', 'equivalenceVolume')).toBe('decrease')
    expect(effect('weak-base-strong-acid-titration', 'baseVolume', 'startPh')).toBe('same')
  })

  it('flame test: longer wavelength → lower photon energy', () => {
    expect(effect('flame-test', 'wavelength', 'photonEnergy')).toBe('decrease')
    const spec = hypothesisSpec('flame-test')!
    expect(spec.evaluate({ wavelength: 589 }).photonEnergy).toBeCloseTo(2.105, 2)
  })

  it('GC: a hotter oven elutes sooner but separates worse', () => {
    expect(effect('gc-ms-analysis', 'temperature', 'firstPeak')).toBe('decrease')
    expect(effect('gc-ms-analysis', 'temperature', 'resolution')).toBe('decrease')
    expect(effect('gc-ms-analysis', 'flow', 'firstPeak')).toBe('decrease')
  })
})

describe('hypothesis specs for biology', () => {
  it('DNA extraction: more fruit → more DNA; ratio stays the same', () => {
    expect(effect('dna-extraction', 'amount', 'yield')).toBe('increase')
    expect(effect('dna-extraction', 'amount', 'purity')).toBe('same')
    expect(effect('dna-extraction', 'ethanolTemp', 'yield', 'increase')).toBe('decrease')
  })

  it('PCR: annealing far above the primer Tm makes no product', () => {
    expect(effect('pcr', 'annealTemp', 'product', 'increase', { annealTemp: 55 })).toBe('decrease')
    expect(effect('pcr', 'cycles', 'product', 'increase', { cycles: 10 })).toBe('increase')
    expect(effect('pcr', 'annealTemp', 'nonspecific', 'decrease', { annealTemp: 60 })).toBe('increase')
  })

  it('gel: denser agarose slows DNA; longer runs move it further; time does not change the field', () => {
    expect(effect('gel-electrophoresis', 'agarose', 'largeBand')).toBe('decrease')
    expect(effect('gel-electrophoresis', 'minutes', 'smallBand')).toBe('increase')
    expect(effect('gel-electrophoresis', 'minutes', 'field')).toBe('same')
    expect(effect('gel-electrophoresis', 'voltage', 'field')).toBe('increase')
  })
})
