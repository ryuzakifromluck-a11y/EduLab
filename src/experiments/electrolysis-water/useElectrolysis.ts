import { useCallback, useRef, useState } from 'react'
import {
  ELECTRODES,
  current,
  gasVolumes,
  resistance,
  type ElectrodeMaterial,
  type Electrolyte,
  type ElectrolysisParams,
} from '../../engines/electrolysisWater'
import { useSimLoop } from '../shared/lab'

/** Electrolysis is slow in real time, so the simulation runs faster than the clock. */
export const SPEEDS = [1, 5, 10, 30]
const LOG_EVERY = 2 // s of simulated time
/** Least gas (mL) a splint test needs. */
export const TEST_MIN = 2

export type GasTest = 'pop' | 'relight' | 'tooLittle' | 'noGas'

export interface Reading {
  t: number
  q: number
  h2: number
  o2: number
}

/**
 * Hofmann voltameter: the power switch passes current, charge accumulates, and the gas volumes
 * follow Faraday's law. Splint tests vent a tube and report the result.
 */
export function useElectrolysis() {
  const [voltage, setVoltage] = useState(6)
  const [electrolyte, setElectrolyteState] = useState<Electrolyte>('na2so4')
  const [concentration, setConcentrationState] = useState(0.5)
  const [electrode, setElectrodeState] = useState<ElectrodeMaterial>('platinum')
  const [powerOn, setPowerOn] = useState(false)
  const [speed, setSpeed] = useState(10)
  const [test, setTest] = useState<{ gas: 'H2' | 'O2'; result: GasTest; at: number } | null>(null)
  const charge = useRef(0)
  const time = useRef(0)
  const vented = useRef({ h2: 0, o2: 0 })
  const log = useRef<Reading[]>([{ t: 0, q: 0, h2: 0, o2: 0 }])
  const nextLog = useRef(LOG_EVERY)
  const [, force] = useState(0)

  const params: ElectrolysisParams = { voltage, electrolyte, concentration, electrode }
  const paramsRef = useRef(params)
  paramsRef.current = params
  const I = current(params)

  const shown = useCallback(() => {
    const v = gasVolumes(charge.current, paramsRef.current.electrode)
    return { ...v, h2: Math.max(0, v.h2 - vented.current.h2), o2: Math.max(0, v.o2 - vented.current.o2) }
  }, [])

  useSimLoop((dt) => {
    const h = dt * speed
    const amps = current(paramsRef.current)
    charge.current += amps * h
    time.current += h
    if (time.current >= nextLog.current) {
      const v = shown()
      log.current.push({ t: +time.current.toFixed(1), q: charge.current, h2: v.h2, o2: v.o2 })
      if (log.current.length > 2000) log.current.shift()
      nextLog.current += LOG_EVERY
    }
    if (shown().h2 >= 50) setPowerOn(false)
  }, powerOn)

  const restart = useCallback(() => {
    charge.current = 0
    time.current = 0
    vented.current = { h2: 0, o2: 0 }
    log.current = [{ t: 0, q: 0, h2: 0, o2: 0 }]
    nextLog.current = LOG_EVERY
    setPowerOn(false)
    setTest(null)
    force((n) => n + 1)
  }, [])

  const v = shown()

  return {
    params,
    voltage,
    setVoltage,
    electrolyte,
    /** A new electrolyte or electrode means a fresh apparatus. */
    setElectrolyte: (e: Electrolyte) => {
      setElectrolyteState(e)
      restart()
    },
    concentration,
    setConcentration: setConcentrationState,
    electrode,
    setElectrode: (e: ElectrodeMaterial) => {
      setElectrodeState(e)
      restart()
    },
    powerOn,
    togglePower: () => {
      if (!powerOn && shown().h2 >= 50) return
      setPowerOn((p) => !p)
    },
    speed,
    setSpeed,
    reset: restart,
    current: powerOn ? I : 0,
    availableCurrent: I,
    resistance: resistance(params),
    charge: charge.current,
    time: time.current,
    volumes: v,
    ratio: v.o2 > 0.05 ? v.h2 / v.o2 : null,
    copperBlue: Math.min(1, v.copper * 2000),
    inertAnode: ELECTRODES[electrode].inertAnode,
    log: log.current.slice(),
    test,
    /** Hold a burning splint to the cathode tube and open its tap. */
    testHydrogen: (): GasTest => {
      const cur = shown().h2
      const result: GasTest = cur >= TEST_MIN ? 'pop' : 'tooLittle'
      if (result === 'pop') vented.current.h2 += cur
      setTest({ gas: 'H2', result, at: performance.now() })
      return result
    },
    /** Hold a glowing splint to the anode tube and open its tap. */
    testOxygen: (): GasTest => {
      const cur = shown().o2
      const result: GasTest = !ELECTRODES[paramsRef.current.electrode].inertAnode ? 'noGas' : cur >= TEST_MIN ? 'relight' : 'tooLittle'
      if (result === 'relight') vented.current.o2 += cur
      setTest({ gas: 'O2', result, at: performance.now() })
      return result
    },
  }
}

export type ElectrolysisController = ReturnType<typeof useElectrolysis>
