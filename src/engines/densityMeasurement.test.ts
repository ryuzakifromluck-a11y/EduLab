import { describe, expect, it } from 'vitest'
import {
  HYDROMETER,
  LIQUIDS,
  blockVolume,
  cylinderReading,
  density,
  displacementVolume,
  floats,
  gPerCm3ToKgPerM3,
  hydrometerDepth,
  hydrometerScale,
  liquidById,
  liquidDensity,
  massOf,
  percentError,
  pycnometerDensity,
  pycnometerMasses,
  readInstrument,
  solidById,
  submergedFraction,
  waterDensity,
} from './densityMeasurement'

describe('density measurement', () => {
  it('ρ = m/V and unit conversion', () => {
    expect(density(54, 20)).toBeCloseTo(2.7, 12)
    expect(gPerCm3ToKgPerM3(2.7)).toBeCloseTo(2700, 9)
    expect(density(5, 0)).toBeNull()
  })

  it('regular block: dimensions give the volume', () => {
    const al = solidById('aluminium')
    expect(blockVolume(...al.dims!)).toBe(al.volume)
    expect(massOf(al)).toBeCloseTo(64.8, 9)
    expect(gPerCm3ToKgPerM3(density(massOf(al), blockVolume(...al.dims!))!)).toBeCloseTo(2700, 6)
  })

  it('irregular solid: the water level rise is its volume', () => {
    const stone = solidById('stone')
    const after = cylinderReading(50, stone)
    expect(displacementVolume(50, after)).toBeCloseTo(21, 12)
    expect(gPerCm3ToKgPerM3(massOf(stone) / displacementVolume(50, after))).toBeCloseTo(2650, 6)
    expect(displacementVolume(60, 50)).toBe(0)
  })

  it('a floating sample displaces only part of its volume unless pushed under', () => {
    const wood = solidById('wood')
    expect(floats(wood.density, 998.2)).toBe(true)
    expect(submergedFraction(wood.density, 998.2)).toBeCloseTo(650 / 998.2, 12)
    expect(cylinderReading(50, wood) - 50).toBeCloseTo((48 * 650) / 998.2, 9)
    expect(cylinderReading(50, wood, 998.2, true) - 50).toBe(48)
    expect(floats(7850, 998.2)).toBe(false)
  })

  it('water is densest near 4 °C and lighter when warm', () => {
    expect(waterDensity(4)).toBeCloseTo(999.97, 1)
    expect(waterDensity(20)).toBeCloseTo(998.2, 1)
    expect(waterDensity(40)).toBeCloseTo(992.2, 0)
    expect(waterDensity(4)).toBeGreaterThan(waterDensity(0))
    expect(waterDensity(4)).toBeGreaterThan(waterDensity(10))
    const eth = liquidById('ethanol')
    expect(liquidDensity(eth, 20)).toBeCloseTo(789.3, 9)
    expect(liquidDensity(eth, 30)).toBeLessThan(789.3)
  })

  it('pycnometer recovers the liquid density', () => {
    for (const l of LIQUIDS) {
      const m = pycnometerMasses(l, 20)
      expect(pycnometerDensity(m, waterDensity(20))).toBeCloseTo(liquidDensity(l, 20), 6)
    }
    expect(pycnometerDensity({ empty: 10, water: 10, liquid: 12 }, 998)).toBeNull()
  })

  it('hydrometer floats deeper in less dense liquids and its scale inverts the depth', () => {
    const dw = hydrometerDepth(998.2)!
    const de = hydrometerDepth(910)!
    expect(de).toBeGreaterThan(dw)
    expect(hydrometerScale(dw)).toBeCloseTo(998.2, 6)
    expect(hydrometerDepth(1300)).toBeNull() // floats too high: bulb not covered
    expect(HYDROMETER.mass).toBeGreaterThan(0)
  })

  it('instrument readings and percent error', () => {
    expect(readInstrument(64.83, 0.1)).toBeCloseTo(64.8, 9)
    expect(readInstrument(70.6, 1)).toBe(71)
    expect(percentError(2650, 2700)).toBeCloseTo(1.851851, 4)
  })
})
