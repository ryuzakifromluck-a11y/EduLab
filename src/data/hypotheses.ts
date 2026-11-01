import type { HypothesisSpec } from '../lib/hypothesis'
import type { ProgressSettings } from '../lib/progressModel'
import { exactPeriod, maxAngularSpeed } from '../engines/pendulum'
import { solveCircuit } from '../engines/ohm'
import { equivalenceVolume, titrationPoint } from '../engines/titration'
import { flightTime, maxHeight, range, simulateFlight, TENNIS_BALL_DRAG } from '../engines/projectile'
import { crossTime, rateAt, rateConstant } from '../engines/reactionRate'

/**
 * What a student can change and predict in each experiment, and how the
 * engines compute the outcome. Variable ids match the keys each experiment
 * saves as progress settings; ranges match its sliders.
 */

const n = (s: ProgressSettings, k: string) => Number(s[k])

const pendulum: HypothesisSpec = {
  experimentId: 'pendulum',
  variables: [
    { id: 'length', labelKey: 'exp.pendulum.p.length', unit: 'm', min: 0.2, max: 3, digits: 2 },
    { id: 'angleDeg', labelKey: 'exp.pendulum.p.angle', unit: '°', min: 1, max: 170, digits: 0 },
    { id: 'gravity', labelKey: 'exp.pendulum.p.gravity', unit: 'm/s²', min: 0.5, max: 25, digits: 2 },
  ],
  outcomes: [
    { id: 'period', labelKey: 'hypothesis.outcomes.pendulum.period', unit: 's', digits: 3 },
    { id: 'frequency', labelKey: 'hypothesis.outcomes.pendulum.frequency', unit: 'Hz', digits: 3 },
    { id: 'maxSpeed', labelKey: 'hypothesis.outcomes.pendulum.maxSpeed', unit: 'rad/s', digits: 2 },
  ],
  defaults: { length: 1, angleDeg: 25, gravity: 9.81 },
  evaluate: (s) => {
    const p = { length: n(s, 'length'), gravity: n(s, 'gravity') }
    const amp = (n(s, 'angleDeg') * Math.PI) / 180
    const T = exactPeriod(p, amp)
    return { period: T, frequency: 1 / T, maxSpeed: maxAngularSpeed(p, amp) }
  },
}

const ohm: HypothesisSpec = {
  experimentId: 'ohms-law',
  variables: [
    { id: 'voltage', labelKey: 'exp.ohm.p.voltage', unit: 'V', min: 0, max: 24, digits: 1 },
    { id: 'resistance', labelKey: 'exp.ohm.p.resistance', unit: 'Ω', min: 1, max: 200, digits: 0 },
  ],
  outcomes: [
    { id: 'current', labelKey: 'hypothesis.outcomes.ohms-law.current', unit: 'A', digits: 3 },
    { id: 'power', labelKey: 'hypothesis.outcomes.ohms-law.power', unit: 'W', digits: 3 },
    { id: 'resistorVoltage', labelKey: 'hypothesis.outcomes.ohms-law.resistorVoltage', unit: 'V', digits: 1 },
  ],
  defaults: { voltage: 9, resistance: 30 },
  evaluate: (s) => {
    const r = solveCircuit({ voltage: n(s, 'voltage'), resistance: Math.max(1e-6, n(s, 'resistance')), closed: true })
    return { current: r.current, power: r.power, resistorVoltage: r.resistorVoltage }
  },
}

const titration: HypothesisSpec = {
  experimentId: 'titration',
  variables: [
    { id: 'addedVolume', labelKey: 'exp.titration.p.added', unit: 'mL', min: 0, max: 50, digits: 2 },
    { id: 'acidConcentration', labelKey: 'exp.titration.p.acidConc', unit: 'mol/L', min: 0.01, max: 1, digits: 2 },
    { id: 'acidVolume', labelKey: 'exp.titration.p.acidVol', unit: 'mL', min: 10, max: 50, digits: 0 },
    { id: 'baseConcentration', labelKey: 'exp.titration.p.baseConc', unit: 'mol/L', min: 0.01, max: 1, digits: 2 },
  ],
  outcomes: [
    { id: 'ph', labelKey: 'hypothesis.outcomes.titration.ph', unit: '', digits: 2 },
    { id: 'equivalenceVolume', labelKey: 'hypothesis.outcomes.titration.equivalenceVolume', unit: 'mL', digits: 2 },
    { id: 'startPh', labelKey: 'hypothesis.outcomes.titration.startPh', unit: '', digits: 2 },
  ],
  defaults: { addedVolume: 0, acidConcentration: 0.1, acidVolume: 25, baseConcentration: 0.1 },
  evaluate: (s) => {
    const p = { acidConcentration: n(s, 'acidConcentration'), acidVolume: n(s, 'acidVolume'), baseConcentration: n(s, 'baseConcentration') }
    return {
      ph: titrationPoint(p, n(s, 'addedVolume')).pH,
      equivalenceVolume: equivalenceVolume(p),
      startPh: titrationPoint(p, 0).pH,
    }
  },
}

const projectile: HypothesisSpec = {
  experimentId: 'projectile-motion',
  variables: [
    { id: 'speed', labelKey: 'exp.projectile-motion.p.speed', unit: 'm/s', min: 1, max: 40, digits: 1 },
    { id: 'angleDeg', labelKey: 'exp.projectile-motion.p.angle', unit: '°', min: 0, max: 90, digits: 0 },
    { id: 'height', labelKey: 'exp.projectile-motion.p.height', unit: 'm', min: 0, max: 30, digits: 1 },
    { id: 'gravity', labelKey: 'exp.projectile-motion.p.gravity', unit: 'm/s²', min: 0.5, max: 25, digits: 2 },
  ],
  outcomes: [
    { id: 'range', labelKey: 'hypothesis.outcomes.projectile-motion.range', unit: 'm', digits: 2 },
    { id: 'maxHeight', labelKey: 'hypothesis.outcomes.projectile-motion.maxHeight', unit: 'm', digits: 2 },
    { id: 'flightTime', labelKey: 'hypothesis.outcomes.projectile-motion.flightTime', unit: 's', digits: 2 },
  ],
  defaults: { speed: 18, angleDeg: 45, height: 0, gravity: 9.81, airResistance: false },
  evaluate: (s) => {
    const air = s.airResistance === true
    const p = { speed: n(s, 'speed'), angleDeg: n(s, 'angleDeg'), height: n(s, 'height'), gravity: n(s, 'gravity'), drag: air ? TENNIS_BALL_DRAG : 0 }
    if (air) {
      const f = simulateFlight(p)
      return { range: f.range, maxHeight: f.maxHeight, flightTime: f.flightTime }
    }
    return { range: range(p), maxHeight: maxHeight(p), flightTime: flightTime(p) }
  },
}

const reactionRate: HypothesisSpec = {
  experimentId: 'reaction-rate',
  variables: [
    { id: 'temperatureC', labelKey: 'exp.reaction-rate.p.temperature', unit: '°C', min: 10, max: 60, digits: 0 },
    { id: 'concentration', labelKey: 'exp.reaction-rate.p.concentration', unit: 'mol/L', min: 0.02, max: 0.25, digits: 3 },
  ],
  outcomes: [
    { id: 'crossTime', labelKey: 'hypothesis.outcomes.reaction-rate.crossTime', unit: 's', digits: 1 },
    { id: 'initialRate', labelKey: 'hypothesis.outcomes.reaction-rate.initialRate', unit: 'mol/(L·s)', digits: 6 },
    { id: 'rateConstant', labelKey: 'hypothesis.outcomes.reaction-rate.rateConstant', unit: '1/s', digits: 5 },
  ],
  defaults: { concentration: 0.15, temperatureC: 25 },
  evaluate: (s) => {
    const p = { concentration: n(s, 'concentration'), temperatureC: n(s, 'temperatureC') }
    return { crossTime: crossTime(p), initialRate: rateAt(p, 0), rateConstant: rateConstant(p.temperatureC) }
  },
}

export const HYPOTHESIS_SPECS: Record<string, HypothesisSpec> = Object.fromEntries(
  [pendulum, ohm, titration, projectile, reactionRate].map((s) => [s.experimentId, s]),
)

export const hypothesisSpec = (experimentId: string): HypothesisSpec | undefined => HYPOTHESIS_SPECS[experimentId]
