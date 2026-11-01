/**
 * Ohm's law engine for a single-loop DC circuit: ideal battery (no internal
 * resistance), ideal wires, one ohmic resistor, ideal ammeter (0 Ω, in series)
 * and ideal voltmeter (∞ Ω, in parallel with the resistor).
 *
 *   V = I · R      I = V / R      P = V · I = I² R = V² / R
 *
 * With the switch open no current can flow, so I = 0 and P = 0, while the
 * voltmeter across the resistor reads 0 V (no current → no voltage drop).
 */

export interface CircuitParams {
  /** Battery EMF in volts. */
  voltage: number
  /** Resistance in ohms (must be > 0). */
  resistance: number
  /** Whether the switch is closed. */
  closed: boolean
}

export interface CircuitReading {
  /** Current through the loop, amperes. */
  current: number
  /** Voltage across the resistor, volts. */
  resistorVoltage: number
  /** Power dissipated in the resistor, watts. */
  power: number
}

export function current(voltage: number, resistance: number): number {
  if (!(resistance > 0)) throw new RangeError('Resistance must be greater than zero')
  return voltage / resistance
}

export function power(voltage: number, currentA: number): number {
  return voltage * currentA
}

export function solveCircuit({ voltage, resistance, closed }: CircuitParams): CircuitReading {
  if (!closed) return { current: 0, resistorVoltage: 0, power: 0 }
  const I = current(voltage, resistance)
  return { current: I, resistorVoltage: voltage, power: power(voltage, I) }
}

/** V–I line for a fixed resistance (V from 0 to vMax). */
export function voltageCurrentSeries(resistance: number, vMax: number, points = 25) {
  return Array.from({ length: points }, (_, i) => {
    const v = (vMax * i) / (points - 1)
    return { voltage: v, current: current(v, resistance) }
  })
}

/** I–R curve for a fixed voltage. */
export function currentResistanceSeries(voltage: number, rMin: number, rMax: number, points = 60) {
  return Array.from({ length: points }, (_, i) => {
    const r = rMin + ((rMax - rMin) * i) / (points - 1)
    return { resistance: r, current: current(voltage, r) }
  })
}

/** P–V parabola for a fixed resistance. */
export function powerVoltageSeries(resistance: number, vMax: number, points = 25) {
  return Array.from({ length: points }, (_, i) => {
    const v = (vMax * i) / (points - 1)
    return { voltage: v, power: (v * v) / resistance }
  })
}
