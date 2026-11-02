import type { HypothesisSpec } from '../lib/hypothesis'
import type { ProgressSettings } from '../lib/progressModel'
import { exactPeriod, maxAngularSpeed } from '../engines/pendulum'
import { solveCircuit } from '../engines/ohm'
import { equivalenceVolume, titrationPoint } from '../engines/titration'
import { flightTime, maxHeight, range, simulateFlight, TENNIS_BALL_DRAG } from '../engines/projectile'
import { crossTime, rateAt, rateConstant } from '../engines/reactionRate'
import * as archimedes from '../engines/archimedesPrinciple'
import * as ballistic from '../engines/ballisticPendulum'
import * as calorimetry from '../engines/calorimetry'
import * as density from '../engines/densityMeasurement'
import * as dielsAlder from '../engines/dielsAlderReaction'
import * as dilution from '../engines/dilution'
import * as dna from '../engines/dnaExtraction'
import * as electrolysis from '../engines/electrolysisWater'
import * as energy from '../engines/energyConservation'
import * as equilibrium from '../engines/equilibrium'
import * as flame from '../engines/flameTest'
import * as gcms from '../engines/gcMsAnalysis'
import * as gel from '../engines/gelElectrophoresis'
import * as shm from '../engines/harmonicMotion'
import * as heat from '../engines/heatTransfer'
import * as hooke from '../engines/hookesLaw'
import * as indicators from '../engines/indicators'
import * as induction from '../engines/induction'
import * as joule from '../engines/joulesExperiment'
import * as newton from '../engines/newtonsLaws'
import * as optics from '../engines/optics'
import * as pcr from '../engines/pcr'
import * as rcCharge from '../engines/rcCircuitCharging'
import * as rcDischarge from '../engines/rcCircuitDischarging'
import * as sodium from '../engines/sodiumWater'
import * as solubility from '../engines/solubility'
import * as aspirin from '../engines/synthesisOfAspirin'
import * as weakBase from '../engines/weakBaseStrongAcidTitration'
import * as zeeman from '../engines/zeemanEffect'

/**
 * What a student can change and predict in each experiment, and how the
 * engines compute the outcome. Variable ids match the keys each experiment
 * saves as progress settings; ranges match its sliders.
 */

const n = (s: ProgressSettings, k: string) => Number(s[k])
/** A text setting (e.g. a chosen material), falling back to `fallback` when missing. */
const str = <T extends string>(s: ProgressSettings, k: string, fallback: T): T => (typeof s[k] === 'string' ? (s[k] as T) : fallback)
/** Outcome label key: hypothesis.outcomes.<experiment>.<outcome>. */
const out = (experimentId: string, id: string, unit: string, digits: number) => ({ id, labelKey: `hypothesis.outcomes.${experimentId}.${id}`, unit, digits })
/** Label key for a variable that has no slider label of its own: hypothesis.variables.<experiment>.<variable>. */
const varKey = (experimentId: string, id: string) => `hypothesis.variables.${experimentId}.${id}`

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

// ── Physics ─────────────────────────────────────────────────────────────────

const newtonsLaws: HypothesisSpec = {
  experimentId: 'newtons-laws',
  variables: [
    { id: 'force', labelKey: 'exp.newtons-laws.p.force', unit: 'N', min: 0, max: 40, digits: 0 },
    { id: 'mass', labelKey: 'exp.newtons-laws.p.mass', unit: 'kg', min: 0.5, max: 10, digits: 1 },
    { id: 'friction', labelKey: 'exp.newtons-laws.p.friction', unit: '', min: 0, max: 0.5, digits: 2 },
  ],
  outcomes: [
    out('newtons-laws', 'acceleration', 'm/s²', 2),
    out('newtons-laws', 'netForce', 'N', 2),
    out('newtons-laws', 'maxFriction', 'N', 2),
  ],
  defaults: { force: 10, mass: 2, friction: 0.05 },
  evaluate: (s) => {
    const p = { force: n(s, 'force'), mass: Math.max(1e-6, n(s, 'mass')), friction: n(s, 'friction'), pushing: true }
    return { acceleration: newton.acceleration(p), netForce: newton.netForce(p), maxFriction: newton.maxFriction(p) }
  },
}

/** Skater speed the first time it passes the bottom of the bowl, from the same RK4 model the page runs. */
function firstBottomSpeed(p: energy.EnergyParams): number {
  let st: energy.TrackState = { x: energy.releaseX(p.height), vx: 0 }
  for (let i = 0; i < 40_000 && st.x < 0; i++) {
    const next = energy.rk4Step(p, st, energy.RK4_DT)
    if (next.x >= 0) {
      // Interpolate to x = 0 between the two steps.
      const f = st.x / (st.x - next.x)
      return energy.speed({ x: 0, vx: st.vx + f * (next.vx - st.vx) })
    }
    st = next
  }
  return energy.speed(st)
}

const energyConservation: HypothesisSpec = {
  experimentId: 'energy-conservation',
  variables: [
    { id: 'height', labelKey: 'exp.energy-conservation.p.height', unit: 'm', min: 0.5, max: 4, digits: 1 },
    { id: 'mass', labelKey: 'exp.energy-conservation.p.mass', unit: 'kg', min: 10, max: 100, digits: 0 },
    { id: 'friction', labelKey: 'exp.energy-conservation.p.friction', unit: 's⁻¹', min: 0, max: 0.5, digits: 2 },
  ],
  outcomes: [
    out('energy-conservation', 'startEnergy', 'J', 0),
    out('energy-conservation', 'bottomSpeed', 'm/s', 2),
    out('energy-conservation', 'bottomKinetic', 'J', 0),
  ],
  defaults: { height: 3, mass: 50, friction: 0, gravity: 9.81 },
  evaluate: (s) => {
    const p = { height: n(s, 'height'), mass: n(s, 'mass'), friction: n(s, 'friction'), gravity: n(s, 'gravity') || 9.81 }
    const v = firstBottomSpeed(p)
    return {
      startEnergy: energy.potentialEnergy(p.mass, p.gravity, p.height),
      bottomSpeed: v,
      bottomKinetic: energy.kineticEnergy(p.mass, v),
    }
  },
}

const harmonicMotion: HypothesisSpec = {
  experimentId: 'simple-harmonic-motion',
  variables: [
    { id: 'mass', labelKey: 'exp.simple-harmonic-motion.p.mass', unit: 'kg', min: 0.1, max: 2, digits: 2 },
    { id: 'k', labelKey: 'exp.simple-harmonic-motion.p.k', unit: 'N/m', min: 5, max: 100, digits: 0 },
    { id: 'amplitude', labelKey: 'exp.simple-harmonic-motion.p.amplitude', unit: 'm', min: 0.02, max: 0.3, digits: 2 },
    { id: 'damping', labelKey: 'exp.simple-harmonic-motion.p.damping', unit: '', min: 0, max: 0.3, digits: 2 },
  ],
  outcomes: [
    out('simple-harmonic-motion', 'period', 's', 3),
    out('simple-harmonic-motion', 'maxSpeed', 'm/s', 3),
    out('simple-harmonic-motion', 'energy', 'J', 3),
  ],
  defaults: { mass: 0.5, k: 20, amplitude: 0.15, damping: 0, phaseDeg: 0 },
  evaluate: (s) => {
    const p = { mass: Math.max(1e-6, n(s, 'mass')), k: n(s, 'k'), amplitude: n(s, 'amplitude'), damping: n(s, 'damping'), phaseDeg: n(s, 'phaseDeg') || 0 }
    // With damping the oscillation is a little slower: T = 2π/ωd.
    return { period: (2 * Math.PI) / shm.dampedAngularFrequency(p), maxSpeed: shm.maxima(p).vMax, energy: shm.totalEnergy(p) }
  },
}

const hookesLaw: HypothesisSpec = {
  experimentId: 'hookes-law',
  variables: [{ id: 'mass', labelKey: 'exp.hookes-law.p.mass', unit: 'g', min: 0, max: 1000, digits: 0 }],
  outcomes: [out('hookes-law', 'extension', 'cm', 2), out('hookes-law', 'force', 'N', 2), out('hookes-law', 'energy', 'J', 3)],
  defaults: { spring: 'medium', mass: 200 },
  evaluate: (s) => {
    const spring = hooke.springById(str(s, 'spring', 'medium'))
    const F = hooke.weight(n(s, 'mass') / 1000)
    return { extension: hooke.extension(spring, F) * 100, force: F, energy: hooke.elasticEnergy(spring.k, F / spring.k) }
  },
}

const induction_: HypothesisSpec = {
  experimentId: 'electromagnetic-induction',
  variables: [
    { id: 'frequency', labelKey: 'exp.electromagnetic-induction.p.frequency', unit: 'Hz', min: 0, max: 3, digits: 1 },
    { id: 'turns', labelKey: 'exp.electromagnetic-induction.p.turns', unit: '', min: 50, max: 1000, digits: 0 },
    { id: 'moment', labelKey: 'exp.electromagnetic-induction.p.moment', unit: 'A·m²', min: 0.2, max: 2, digits: 1 },
  ],
  outcomes: [
    out('electromagnetic-induction', 'peakEmf', 'mV', 2),
    out('electromagnetic-induction', 'maxFlux', 'µWb', 2),
    out('electromagnetic-induction', 'magnetSpeed', 'm/s', 2),
  ],
  defaults: { turns: 300, moment: 1, frequency: 1, polarity: 1 },
  evaluate: (s) => {
    const p = { turns: n(s, 'turns'), moment: n(s, 'moment'), frequency: n(s, 'frequency'), polarity: 1 as const }
    return {
      peakEmf: induction.peakEmf(p) * 1000,
      // The magnet passes through the middle of the coil, where one turn links the most flux.
      maxFlux: p.turns * induction.fluxPerTurn(p.moment, 0) * 1e6,
      magnetSpeed: induction.TRAVEL * 2 * Math.PI * p.frequency,
    }
  },
}

const refraction: HypothesisSpec = {
  experimentId: 'refraction-reflection',
  variables: [{ id: 'angle', labelKey: 'exp.refraction-reflection.p.angle', unit: '°', min: 0, max: 89, digits: 0 }],
  outcomes: [
    out('refraction-reflection', 'refraction', '°', 1),
    out('refraction-reflection', 'reflection', '°', 1),
    out('refraction-reflection', 'reflected', '%', 1),
  ],
  defaults: { angle: 40, top: 'air', bottom: 'glass' },
  evaluate: (s) => {
    const n1 = optics.mediumById(str(s, 'top', 'air')).n
    const n2 = optics.mediumById(str(s, 'bottom', 'glass')).n
    const r = optics.traceRay(n1, n2, n(s, 'angle'))
    // Past the critical angle there is no refracted ray; it has bent all the way to 90° (grazing).
    return { refraction: r.refraction ?? 90, reflection: r.reflection, reflected: r.reflected * 100 }
  },
}

const heatTransfer: HypothesisSpec = {
  experimentId: 'heat-transfer',
  variables: [
    { id: 'tHot', labelKey: 'exp.heat-transfer.p.hot', unit: '°C', min: 40, max: 100, digits: 0 },
    { id: 'length', labelKey: 'exp.heat-transfer.p.length', unit: 'm', min: 0.1, max: 0.4, digits: 2 },
  ],
  outcomes: [out('heat-transfer', 'flowA', 'W', 3), out('heat-transfer', 'flowB', 'W', 3), out('heat-transfer', 'warmUpA', 's', 0)],
  defaults: { a: 'copper', b: 'steel', tHot: 90, length: 0.2 },
  evaluate: (s) => {
    const a = heat.materialById(str(s, 'a', 'copper'))
    const b = heat.materialById(str(s, 'b', 'steel'))
    const L = Math.max(1e-3, n(s, 'length'))
    const tHot = n(s, 'tHot')
    return { flowA: heat.steadyHeatFlow(a, L, tHot, 20), flowB: heat.steadyHeatFlow(b, L, tHot, 20), warmUpA: heat.timeConstant(a, L) }
  },
}

const zeemanEffect: HypothesisSpec = {
  experimentId: 'zeeman-effect',
  variables: [{ id: 'field', labelKey: 'exp.zeeman-effect.p.field', unit: 'T', min: 0, max: 1.5, digits: 2 }],
  outcomes: [
    out('zeeman-effect', 'wavelengthShift', 'pm', 2),
    out('zeeman-effect', 'frequencyShift', 'GHz', 2),
    out('zeeman-effect', 'levelSpacing', 'µeV', 1),
  ],
  defaults: { field: 0.8, mode: 'transverse' },
  evaluate: (s) => {
    const B = n(s, 'field')
    return {
      wavelengthShift: zeeman.wavelengthShift(B) * 1e12,
      frequencyShift: zeeman.frequencyShift(B) / 1e9,
      levelSpacing: (zeeman.levelSpacing(B) / zeeman.E_CHARGE) * 1e6,
    }
  },
}

const densityMeasurement: HypothesisSpec = {
  experimentId: 'density-measurement',
  variables: [{ id: 'temperature', labelKey: 'exp.density-measurement.p.temperature', unit: '°C', min: 0, max: 40, digits: 0 }],
  outcomes: [
    // Densities change by only a fraction of a percent over the slider, so even small changes count.
    { ...out('density-measurement', 'liquidDensity', 'kg/m³', 1), tolerance: 1e-4 },
    { ...out('density-measurement', 'waterDensity', 'kg/m³', 2), tolerance: 1e-4 },
    { ...out('density-measurement', 'pycnometerMass', 'g', 2), tolerance: 1e-4 },
  ],
  defaults: { mode: 'solid', temperature: 20 },
  evaluate: (s) => {
    const T = n(s, 'temperature')
    // In solid mode the liquid that matters is the water in the measuring cylinder.
    const liquid = density.liquidById(s.mode === 'liquid' ? str(s, 'liquid', 'oil') : 'water')
    const rho = density.liquidDensity(liquid, T)
    return { liquidDensity: rho, waterDensity: density.waterDensity(T), pycnometerMass: (rho * density.PYCNOMETER.volume) / 1000 }
  },
}

/** Work done in one run: 20 drops of the weight, or one minute of the heating coil. */
const JOULE_DROPS = 20
const JOULE_SECONDS = 60

const joulesExperiment: HypothesisSpec = {
  experimentId: 'joules-experiment',
  variables: [
    { id: 'mass', labelKey: 'exp.joules-experiment.p.mass', unit: 'kg', min: 1, max: 20, digits: 0 },
    { id: 'height', labelKey: 'exp.joules-experiment.p.height', unit: 'm', min: 0.5, max: 2, digits: 1 },
    { id: 'voltage', labelKey: 'exp.joules-experiment.p.voltage', unit: 'V', min: 2, max: 12, digits: 1 },
    { id: 'resistance', labelKey: 'exp.joules-experiment.p.resistance', unit: 'Ω', min: 2, max: 10, digits: 1 },
  ],
  outcomes: [out('joules-experiment', 'work', 'J', 0), out('joules-experiment', 'temperatureRise', 'K', 2)],
  defaults: { method: 'mechanical', mass: 10, height: 1.5, voltage: 12, resistance: 4 },
  evaluate: (s) => {
    if (s.method === 'electrical') {
      const R = Math.max(1e-6, n(s, 'resistance'))
      const W = joule.electricalWork(n(s, 'voltage'), joule.coilCurrent(n(s, 'voltage'), R), JOULE_SECONDS)
      return { work: W, temperatureRise: joule.temperatureRise(W, joule.APPARATUS, 1) }
    }
    const W = joule.fallingWork(n(s, 'mass'), n(s, 'height'), JOULE_DROPS)
    return { work: W, temperatureRise: joule.temperatureRise(W) }
  },
}

const ballisticPendulum: HypothesisSpec = {
  experimentId: 'ballistic-pendulum',
  variables: [{ id: 'block', labelKey: 'exp.ballistic-pendulum.p.block', unit: 'g', min: 150, max: 500, digits: 0 }],
  outcomes: [
    out('ballistic-pendulum', 'speedAfter', 'm/s', 3),
    out('ballistic-pendulum', 'rise', 'cm', 2),
    out('ballistic-pendulum', 'keptEnergy', '%', 1),
  ],
  defaults: { range: 'medium', block: 250 },
  evaluate: (s) => {
    const v = ballistic.launcherSpeed(str(s, 'range', 'medium'))
    const M = n(s, 'block') / 1000
    const shot = ballistic.shot(v, ballistic.BALL_MASS, { ...ballistic.PENDULUM, M })
    return { speedAfter: shot.V, rise: shot.h * 100, keptEnergy: ballistic.keptFraction(ballistic.BALL_MASS, M) * 100 }
  },
}

const rcVariables = (id: string) => [
  { id: 'voltage', labelKey: `exp.${id}.p.voltage`, unit: 'V', min: 1, max: 12, digits: 1 },
  { id: 'resistance', labelKey: `exp.${id}.p.resistance`, unit: 'kΩ', min: 1, max: 100, digits: 0 },
  { id: 'capacitance', labelKey: `exp.${id}.p.capacitance`, unit: 'µF', min: 100, max: 2200, digits: 0 },
]
const rc = (s: ProgressSettings) => ({ V: n(s, 'voltage'), R: Math.max(1e-3, n(s, 'resistance')) * 1e3, C: Math.max(1e-3, n(s, 'capacitance')) * 1e-6 })

const rcCharging: HypothesisSpec = {
  experimentId: 'rc-circuit-charging',
  variables: rcVariables('rc-circuit-charging'),
  outcomes: [
    out('rc-circuit-charging', 'tau', 's', 2),
    out('rc-circuit-charging', 'startCurrent', 'mA', 3),
    out('rc-circuit-charging', 'finalCharge', 'mC', 2),
    out('rc-circuit-charging', 'finalEnergy', 'mJ', 2),
  ],
  defaults: { voltage: 9, resistance: 10, capacitance: 470 },
  evaluate: (s) => {
    const { V, R, C } = rc(s)
    return {
      tau: rcCharge.timeConstant(R, C),
      startCurrent: rcCharge.chargingCurrent(0, V, R, C) * 1000,
      finalCharge: C * V * 1000,
      finalEnergy: 0.5 * C * V * V * 1000,
    }
  },
}

const rcDischarging: HypothesisSpec = {
  experimentId: 'rc-circuit-discharging',
  variables: rcVariables('rc-circuit-discharging'),
  outcomes: [
    out('rc-circuit-discharging', 'tau', 's', 2),
    out('rc-circuit-discharging', 'halfTime', 's', 2),
    out('rc-circuit-discharging', 'startCurrent', 'mA', 3),
    out('rc-circuit-discharging', 'startEnergy', 'mJ', 2),
  ],
  defaults: { voltage: 9, resistance: 10, capacitance: 470 },
  evaluate: (s) => {
    const { V, R, C } = rc(s)
    return {
      tau: rcDischarge.timeConstant(R, C),
      halfTime: rcDischarge.halfTime(R, C),
      startCurrent: Math.abs(rcDischarge.dischargeCurrent(0, V, R, C)) * 1000,
      startEnergy: rcDischarge.capacitorEnergy(C, V) * 1000,
    }
  },
}

const archimedesPrinciple: HypothesisSpec = {
  experimentId: 'archimedes-principle',
  // `lowered` is how far (cm) the balance has lowered the body below first contact; the deepest setting is 8 cm.
  variables: [{ id: 'lowered', labelKey: 'exp.archimedes-principle.p.lower', unit: 'cm', min: 0, max: 8, digits: 1 }],
  outcomes: [
    out('archimedes-principle', 'buoyancy', 'N', 3),
    out('archimedes-principle', 'apparent', 'N', 3),
    out('archimedes-principle', 'displaced', 'cm³', 1),
  ],
  defaults: { body: 'aluminium', fluid: 'water', lowered: 0 },
  evaluate: (s) => {
    const body = archimedes.bodyById(str(s, 'body', 'aluminium'))
    const fluid = archimedes.fluidById(str(s, 'fluid', 'water'))
    const r = archimedes.immerse(body, fluid, Math.min(1, n(s, 'lowered') / body.height))
    return { buoyancy: r.buoyancy, apparent: r.apparent, displaced: r.displaced }
  },
}

// ── Chemistry ───────────────────────────────────────────────────────────────

const exoEndo: HypothesisSpec = {
  experimentId: 'exo-endo',
  variables: [
    { id: 'mass', labelKey: 'exp.exo-endo.p.mass', unit: 'g', min: 1, max: 15, digits: 1 },
    { id: 'water', labelKey: 'exp.exo-endo.p.water', unit: 'mL', min: 50, max: 200, digits: 0 },
  ],
  outcomes: [out('exo-endo', 'finalTemperature', '°C', 1), out('exo-endo', 'heat', 'J', 0), out('exo-endo', 'moles', 'mol', 3)],
  defaults: { substance: 'naoh', mass: 5, water: 100 },
  evaluate: (s) => {
    const p = { substance: str(s, 'substance', 'naoh'), mass: n(s, 'mass'), water: Math.max(1, n(s, 'water')), startT: calorimetry.ROOM_T }
    return {
      finalTemperature: p.startT + calorimetry.idealDeltaT(p),
      heat: Math.abs(calorimetry.heatReleased(p)),
      moles: calorimetry.moles(p),
    }
  },
}

const solubility_: HypothesisSpec = {
  experimentId: 'solubility',
  variables: [{ id: 'temperature', labelKey: 'exp.solubility.p.temperature', unit: '°C', min: 0, max: 100, digits: 0 }],
  outcomes: [out('solubility', 'solubility', 'g/100 g', 1), out('solubility', 'massPercent', '%', 1)],
  defaults: { salt: 'kno3', temperature: 20 },
  evaluate: (s) => {
    const sol = solubility.solubility(str(s, 'salt', 'kno3'), n(s, 'temperature'))
    return { solubility: sol, massPercent: solubility.massPercent(sol, 100) }
  },
}

const phIndicators: HypothesisSpec = {
  experimentId: 'ph-indicators',
  variables: [{ id: 'pH', labelKey: varKey('ph-indicators', 'pH'), unit: '', min: 0, max: 14, digits: 1 }],
  outcomes: [out('ph-indicators', 'hydrogen', 'mol/L', 6), out('ph-indicators', 'hydroxide', 'mol/L', 6), out('ph-indicators', 'pOH', '', 1)],
  defaults: { sample: 'lemon', pH: 2.2, indicator: 'universal' },
  evaluate: (s) => {
    const pH = n(s, 'pH')
    return { hydrogen: indicators.hydrogenIon(pH), hydroxide: indicators.hydroxideIon(pH), pOH: indicators.pOH(pH) }
  },
}

const dilution_: HypothesisSpec = {
  experimentId: 'dilution',
  variables: [
    { id: 'c1', labelKey: 'exp.dilution.p.c1', unit: 'mol/L', min: 0.1, max: 2, digits: 2 },
    { id: 'v1', labelKey: 'exp.dilution.p.v1', unit: 'mL', min: 1, max: 125, digits: 0 },
    { id: 'v2', labelKey: 'exp.dilution.p.v2', unit: 'mL', min: 50, max: 250, digits: 0 },
  ],
  outcomes: [out('dilution', 'c2', 'mol/L', 3), out('dilution', 'absorbance', '', 3), out('dilution', 'moles', 'mmol', 2)],
  defaults: { c1: 1, v1: 10, v2: 100 },
  evaluate: (s) => {
    const c1 = n(s, 'c1')
    const v2 = Math.max(1, n(s, 'v2'))
    const v1 = Math.min(n(s, 'v1'), v2)
    const c2 = dilution.diluted(c1, v1, v2)
    return { c2, absorbance: dilution.absorbance(c2), moles: dilution.molesIn(c1, v1) * 1000 }
  },
}

/** Starting amount of N₂O₄ in the syringe, mol (as on the experiment page). */
const START_N2O4 = 0.04

const chemicalEquilibrium: HypothesisSpec = {
  experimentId: 'chemical-equilibrium',
  variables: [
    { id: 'temperature', labelKey: 'exp.chemical-equilibrium.p.temperature', unit: '°C', min: 0, max: 100, digits: 0 },
    { id: 'volume', labelKey: 'exp.chemical-equilibrium.p.volume', unit: 'L', min: 0.5, max: 2, digits: 2 },
  ],
  outcomes: [
    out('chemical-equilibrium', 'k', 'mol/L', 4),
    out('chemical-equilibrium', 'no2', 'mol/L', 4),
    out('chemical-equilibrium', 'n2o4', 'mol/L', 4),
    out('chemical-equilibrium', 'dissociated', '%', 1),
  ],
  defaults: { temperature: 25, volume: 1 },
  evaluate: (s) => {
    const T = n(s, 'temperature')
    const V = Math.max(1e-3, n(s, 'volume'))
    const c = equilibrium.equilibriumConcentrations(START_N2O4, V, T)
    const c0 = START_N2O4 / V
    return { k: equilibrium.equilibriumConstant(T), no2: c.no2, n2o4: c.n2o4, dissociated: (c.no2 / 2 / c0) * 100 }
  },
}

const dielsAlderReaction: HypothesisSpec = {
  experimentId: 'diels-alder-reaction',
  variables: [
    { id: 'temperature', labelKey: 'exp.diels-alder-reaction.p.temperature', unit: '°C', min: 0, max: 200, digits: 0 },
    { id: 'concentration', labelKey: 'exp.diels-alder-reaction.p.concentration', unit: 'mol/L', min: 0.1, max: 2, digits: 1 },
  ],
  outcomes: [
    out('diels-alder-reaction', 'rateConstant', 'L/(mol·s)', 4),
    out('diels-alder-reaction', 'halfLife', 's', 1),
    out('diels-alder-reaction', 'endo', '%', 1),
  ],
  defaults: { diene: 'cyclopentadiene', dienophile: 'maleicAnhydride', temperature: 25, concentration: 0.5 },
  evaluate: (s) => {
    const a = dielsAlder.analyse(
      str(s, 'diene', 'cyclopentadiene'),
      str(s, 'dienophile', 'maleicAnhydride'),
      n(s, 'temperature'),
      Math.max(1e-6, n(s, 'concentration')),
    )
    return { rateConstant: a.k, halfLife: a.halfLife, endo: a.endoFraction * 100 }
  },
}

const synthesisOfAspirin: HypothesisSpec = {
  experimentId: 'synthesis-of-aspirin',
  variables: [
    { id: 'saMass', labelKey: 'exp.synthesis-of-aspirin.p.saMass', unit: 'g', min: 0.5, max: 5, digits: 1 },
    { id: 'ac2oVolume', labelKey: 'exp.synthesis-of-aspirin.p.ac2o', unit: 'mL', min: 1, max: 10, digits: 1 },
    { id: 'temperature', labelKey: 'exp.synthesis-of-aspirin.p.temperature', unit: '°C', min: 50, max: 100, digits: 0 },
    { id: 'minutes', labelKey: varKey('synthesis-of-aspirin', 'minutes'), unit: 'min', min: 0, max: 60, digits: 1 },
  ],
  outcomes: [
    out('synthesis-of-aspirin', 'theoretical', 'g', 2),
    out('synthesis-of-aspirin', 'conversion', '%', 1),
    out('synthesis-of-aspirin', 'aspirinMass', 'g', 2),
  ],
  defaults: { saMass: 2, ac2oVolume: 5, catalyst: 'phosphoric', temperature: 85, minutes: 15, recrystallise: false },
  evaluate: (s) => {
    const p = { saMass: n(s, 'saMass'), ac2oVolume: n(s, 'ac2oVolume'), catalyst: str(s, 'catalyst', 'phosphoric'), tempC: n(s, 'temperature') }
    const r = aspirin.isolate(p, n(s, 'minutes'), s.recrystallise === true)
    return { theoretical: r.stoich.theoretical, conversion: r.conversion * 100, aspirinMass: r.aspirinMass }
  },
}

const weakBaseTitration: HypothesisSpec = {
  experimentId: 'weak-base-strong-acid-titration',
  variables: [
    { id: 'addedVolume', labelKey: 'exp.weak-base-strong-acid-titration.m.added', unit: 'mL', min: 0, max: 50, digits: 2 },
    { id: 'baseConcentration', labelKey: 'exp.weak-base-strong-acid-titration.p.baseConc', unit: 'mol/L', min: 0.02, max: 0.5, digits: 2 },
    { id: 'baseVolume', labelKey: 'exp.weak-base-strong-acid-titration.p.baseVol', unit: 'mL', min: 10, max: 50, digits: 0 },
    { id: 'acidConcentration', labelKey: 'exp.weak-base-strong-acid-titration.p.acidConc', unit: 'mol/L', min: 0.02, max: 0.5, digits: 2 },
  ],
  outcomes: [
    out('weak-base-strong-acid-titration', 'ph', '', 2),
    out('weak-base-strong-acid-titration', 'equivalenceVolume', 'mL', 2),
    out('weak-base-strong-acid-titration', 'startPh', '', 2),
  ],
  defaults: { addedVolume: 0, baseConcentration: 0.1, baseVolume: 25, acidConcentration: 0.1 },
  evaluate: (s) => {
    const p = { baseConcentration: n(s, 'baseConcentration'), baseVolume: n(s, 'baseVolume'), acidConcentration: Math.max(1e-6, n(s, 'acidConcentration')) }
    return {
      ph: weakBase.titrationPoint(p, n(s, 'addedVolume')).pH,
      equivalenceVolume: weakBase.equivalenceVolume(p),
      startPh: weakBase.titrationPoint(p, 0).pH,
    }
  },
}

const flameTest: HypothesisSpec = {
  experimentId: 'flame-test',
  // Changed by choosing a different salt: the wavelength of its brightest emission line.
  variables: [{ id: 'wavelength', labelKey: varKey('flame-test', 'wavelength'), unit: 'nm', min: 380, max: 780, digits: 0 }],
  outcomes: [out('flame-test', 'photonEnergy', 'eV', 3), out('flame-test', 'frequency', 'THz', 0), out('flame-test', 'molarEnergy', 'kJ/mol', 0)],
  defaults: { sample: 'Na', wavelength: flame.strongestLine('Na').wavelength },
  evaluate: (s) => {
    const nm = Math.max(1, n(s, 'wavelength'))
    const e = flame.photonEnergy(nm)
    return { photonEnergy: e.eV, frequency: flame.C / (nm * 1e-9) / 1e12, molarEnergy: (e.joules * 6.02214076e23) / 1000 }
  },
}

const gcMsAnalysis: HypothesisSpec = {
  experimentId: 'gc-ms-analysis',
  variables: [
    { id: 'temperature', labelKey: 'exp.gc-ms-analysis.p.temperature', unit: '°C', min: 40, max: 200, digits: 0 },
    { id: 'flow', labelKey: 'exp.gc-ms-analysis.p.flow', unit: 'mL/min', min: 0.5, max: 3, digits: 1 },
  ],
  outcomes: [
    out('gc-ms-analysis', 'firstPeak', 'min', 2),
    out('gc-ms-analysis', 'runTime', 'min', 1),
    out('gc-ms-analysis', 'resolution', '', 2),
  ],
  defaults: { mixture: 'A', column: 'nonpolar', temperature: 60, flow: 1 },
  evaluate: (s) => {
    const cond = { column: str<gcms.ColumnId>(s, 'column', 'nonpolar'), tempC: n(s, 'temperature'), flow: Math.max(0.01, n(s, 'flow')) }
    const els = gcms.elutions(gcms.MIXTURES[str<gcms.MixtureId>(s, 'mixture', 'A')] ?? gcms.MIXTURES.A, cond)
    // The worst-separated pair of neighbouring peaks decides whether every compound can be identified.
    let worst = Infinity
    for (let i = 1; i < els.length; i++) worst = Math.min(worst, gcms.resolution(els[i - 1], els[i]))
    return { firstPeak: els[0]?.tR ?? 0, runTime: gcms.runTime(els), resolution: worst }
  },
}

// ── Biology ─────────────────────────────────────────────────────────────────

const dnaExtraction: HypothesisSpec = {
  experimentId: 'dna-extraction',
  variables: [
    { id: 'amount', labelKey: 'exp.dna-extraction.p.amount', unit: 'g', min: 2, max: 30, digits: 0 },
    { id: 'mashTime', labelKey: 'exp.dna-extraction.p.mash', unit: 's', min: 0, max: 180, digits: 0 },
    { id: 'detergent', labelKey: 'exp.dna-extraction.p.detergent', unit: '%', min: 0, max: 10, digits: 1 },
    { id: 'salt', labelKey: 'exp.dna-extraction.p.salt', unit: 'mol/L', min: 0, max: 1, digits: 2 },
    { id: 'ethanolTemp', labelKey: 'exp.dna-extraction.p.ethanolTemp', unit: '°C', min: -20, max: 25, digits: 0 },
    { id: 'ethanolRatio', labelKey: 'exp.dna-extraction.p.ethanolRatio', unit: '×', min: 0.25, max: 3, digits: 2 },
  ],
  outcomes: [out('dna-extraction', 'yield', 'µg', 1), out('dna-extraction', 'released', '%', 1), out('dna-extraction', 'purity', '', 2)],
  defaults: { ...dna.DEFAULT_SETTINGS },
  evaluate: (s) => {
    const r = dna.extract({
      source: str(s, 'source', 'strawberry'),
      amount: n(s, 'amount'),
      mashTime: n(s, 'mashTime'),
      detergent: n(s, 'detergent'),
      salt: n(s, 'salt'),
      protease: s.protease !== false,
      ethanolTemp: n(s, 'ethanolTemp'),
      ethanolRatio: n(s, 'ethanolRatio'),
    })
    return { yield: r.yield, released: r.lysis * 100, purity: r.ratio }
  },
}

const pcr_: HypothesisSpec = {
  experimentId: 'pcr',
  variables: [
    { id: 'cycles', labelKey: 'exp.pcr.p.cycles', unit: '', min: 1, max: 40, digits: 0 },
    { id: 'denatureTemp', labelKey: 'exp.pcr.p.denature', unit: '°C', min: 85, max: 100, digits: 1 },
    { id: 'annealTemp', labelKey: 'exp.pcr.p.anneal', unit: '°C', min: 40, max: 72, digits: 0 },
    { id: 'extensionTime', labelKey: 'exp.pcr.p.extension', unit: 's', min: 10, max: 120, digits: 0 },
  ],
  outcomes: [out('pcr', 'product', 'ng', 2), out('pcr', 'efficiency', '%', 1), out('pcr', 'nonspecific', '%', 1)],
  defaults: { target: pcr.DEFAULT_SETTINGS.target, cycles: 30, denatureTemp: 95, annealTemp: 55, extensionTime: 60, polymerase: 'taq' },
  evaluate: (s) => {
    const o = pcr.outcome({
      ...pcr.DEFAULT_SETTINGS,
      target: str(s, 'target', pcr.DEFAULT_SETTINGS.target),
      cycles: Math.max(0, Math.round(n(s, 'cycles'))),
      denatureTemp: n(s, 'denatureTemp'),
      annealTemp: n(s, 'annealTemp'),
      extensionTime: n(s, 'extensionTime'),
      polymerase: str(s, 'polymerase', 'taq'),
    })
    return { product: o.ng, efficiency: o.meanEfficiency * 100, nonspecific: o.nonspecific * 100 }
  },
}

const gelElectrophoresis: HypothesisSpec = {
  experimentId: 'gel-electrophoresis',
  variables: [
    { id: 'agarose', labelKey: 'exp.gel-electrophoresis.p.agarose', unit: '%', min: 0.5, max: 2.5, digits: 1 },
    { id: 'voltage', labelKey: 'exp.gel-electrophoresis.p.voltage', unit: 'V', min: 0, max: 150, digits: 0 },
    { id: 'minutes', labelKey: varKey('gel-electrophoresis', 'minutes'), unit: 'min', min: 0, max: 120, digits: 0 },
  ],
  outcomes: [
    out('gel-electrophoresis', 'smallBand', 'cm', 2),
    out('gel-electrophoresis', 'largeBand', 'cm', 2),
    out('gel-electrophoresis', 'field', 'V/cm', 2),
  ],
  defaults: { agarose: 1, voltage: 100, minutes: 40 },
  evaluate: (s) => {
    const g = { agarose: n(s, 'agarose'), voltage: n(s, 'voltage'), polarity: 'normal' as const }
    const seconds = n(s, 'minutes') * 60
    return {
      smallBand: gel.migrationDistance(200, g, seconds),
      largeBand: gel.migrationDistance(3000, g, seconds),
      field: gel.fieldStrength(g.voltage),
    }
  },
}

const sodiumWater: HypothesisSpec = {
  experimentId: 'sodium-water',
  variables: [
    { id: 'mass', labelKey: 'exp.sodium-water.p.mass', unit: 'g', min: 0.05, max: 1, digits: 2 },
    { id: 'waterVolume', labelKey: 'exp.sodium-water.p.water', unit: 'mL', min: 50, max: 250, digits: 0 },
    { id: 'initialTemp', labelKey: 'exp.sodium-water.p.temp', unit: '°C', min: 5, max: 50, digits: 0 },
  ],
  outcomes: [out('sodium-water', 'hydrogen', 'mL', 1), out('sodium-water', 'ph', '', 2), out('sodium-water', 'tempRise', '°C', 2)],
  defaults: { metal: 'Na', mass: 0.25, waterVolume: 100, initialTemp: 20 },
  evaluate: (s) => {
    const p = { metal: str<sodium.AlkaliMetal>(s, 'metal', 'Na'), mass: n(s, 'mass'), waterVolume: Math.max(1, n(s, 'waterVolume')), initialTemp: n(s, 'initialTemp'), beakerRadius: 3.4 }
    const moles = sodium.totalMoles(p)
    return {
      hydrogen: sodium.hydrogenVolume(moles),
      ph: sodium.solutionPH(moles, p.waterVolume),
      tempRise: sodium.finalTemperature(p) - p.initialTemp,
    }
  },
}

const electrolysisWater: HypothesisSpec = {
  experimentId: 'electrolysis-water',
  variables: [
    { id: 'voltage', labelKey: 'exp.electrolysis-water.p.voltage', unit: 'V', min: 0, max: 12, digits: 1 },
    { id: 'concentration', labelKey: 'exp.electrolysis-water.p.concentration', unit: 'mol/L', min: 0.05, max: 1, digits: 2 },
  ],
  outcomes: [out('electrolysis-water', 'current', 'A', 3), out('electrolysis-water', 'hydrogenRate', 'mL/min', 2), out('electrolysis-water', 'oxygenRate', 'mL/min', 2)],
  defaults: { voltage: 6, electrolyte: 'na2so4', concentration: 0.5, electrode: 'platinum' },
  evaluate: (s) => {
    const electrode = str<electrolysis.ElectrodeMaterial>(s, 'electrode', 'platinum')
    const p = { voltage: n(s, 'voltage'), electrolyte: str<electrolysis.Electrolyte>(s, 'electrolyte', 'na2so4'), concentration: n(s, 'concentration'), electrode }
    const I = electrolysis.current(p)
    // Theoretical gas per minute from Faraday's law (losses to dissolution fade once the water is saturated).
    const mol = electrolysis.faraday(I * 60)
    return {
      current: I,
      hydrogenRate: electrolysis.mmolToMl(mol.H2 * 1000),
      oxygenRate: electrolysis.ELECTRODES[electrode].inertAnode ? electrolysis.mmolToMl(mol.O2 * 1000) : 0,
    }
  },
}

export const HYPOTHESIS_SPECS: Record<string, HypothesisSpec> = Object.fromEntries(
  [
    // Physics
    pendulum,
    ohm,
    projectile,
    newtonsLaws,
    energyConservation,
    harmonicMotion,
    hookesLaw,
    induction_,
    refraction,
    heatTransfer,
    zeemanEffect,
    densityMeasurement,
    joulesExperiment,
    ballisticPendulum,
    rcCharging,
    rcDischarging,
    archimedesPrinciple,
    // Chemistry
    titration,
    reactionRate,
    exoEndo,
    solubility_,
    phIndicators,
    dilution_,
    chemicalEquilibrium,
    dielsAlderReaction,
    synthesisOfAspirin,
    weakBaseTitration,
    flameTest,
    gcMsAnalysis,
    sodiumWater,
    electrolysisWater,
    // Biology
    dnaExtraction,
    pcr_,
    gelElectrophoresis,
  ].map((s) => [s.experimentId, s]),
)

export const hypothesisSpec = (experimentId: string): HypothesisSpec | undefined => HYPOTHESIS_SPECS[experimentId]
