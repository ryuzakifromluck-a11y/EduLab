import { INDICATORS, indicatorColor, type Indicator } from '../../engines/indicators'

const WATER: [number, number, number] = [0.87, 0.92, 0.96]

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** Colour the liquid in a tube shows: the indicator colour over clear water. */
export function tubeColor(ind: Indicator, pH: number): string {
  const { hex, alpha } = indicatorColor(ind, pH)
  const c = hexRgb(hex)
  const a = alpha * 0.92
  const mixed = c.map((v, i) => Math.round((WATER[i] + (v - WATER[i]) * a) * 255))
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

export const TUBE_ORDER = INDICATORS
