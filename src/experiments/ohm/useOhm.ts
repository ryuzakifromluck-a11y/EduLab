import { useCallback, useRef, useState } from 'react'
import { solveCircuit } from '../../engines/ohm'
import { useReducedMotion } from '../../lib/hooks'

export const V_MAX = 24
export const R_MIN = 1
export const R_MAX = 200

export interface Reading {
  voltage: number
  resistance: number
  current: number
  power: number
}

export function useOhm() {
  const reducedMotion = useReducedMotion()
  const [voltage, setVoltage] = useState(9)
  const [resistance, setResistance] = useState(30)
  const [closed, setClosed] = useState(true)
  const [running, setRunning] = useState(!reducedMotion)
  const [readings, setReadings] = useState<Reading[]>([])
  // Live values for the animation loop, read every frame by the scene.
  const live = useRef({ current: 0, power: 0, closed: true, running: true })

  const reading = solveCircuit({ voltage, resistance, closed })
  live.current = { current: reading.current, power: reading.power, closed, running }

  const record = useCallback(() => {
    if (!closed) return
    setReadings((rs) => [...rs, { voltage, resistance, current: reading.current, power: reading.power }].slice(-50))
  }, [closed, voltage, resistance, reading.current, reading.power])

  return {
    voltage,
    setVoltage,
    resistance,
    setResistance,
    closed,
    setClosed,
    toggleSwitch: () => setClosed((c) => !c),
    running,
    togglePlay: () => setRunning((r) => !r),
    reset: () => {
      setVoltage(9)
      setResistance(30)
      setClosed(true)
      setReadings([])
    },
    reading,
    readings,
    record,
    clearReadings: () => setReadings([]),
    live,
  }
}

export type OhmController = ReturnType<typeof useOhm>
