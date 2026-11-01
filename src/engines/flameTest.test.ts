import { describe, expect, it } from 'vitest'
import {
  METALS,
  METAL_IDS,
  emissionSpectrum,
  flameColor,
  hue,
  photonEnergy,
  randomUnknown,
  strongestLine,
  wavelengthFromEnergy,
  wavelengthToRgb,
} from './flameTest'

const hueOf = (id: keyof typeof METALS) => hue(flameColor({ [id]: 1 }).rgb)

describe('flame test', () => {
  it('converts wavelength to photon energy with ΔE = hc/λ', () => {
    // Sodium D line: 589 nm → 2.105 eV = 3.37 × 10⁻¹⁹ J
    const e = photonEnergy(589.0)
    expect(e.eV).toBeCloseTo(2.105, 3)
    expect(e.joules).toBeCloseTo(3.373e-19, 21)
    expect(wavelengthFromEnergy(e.eV)).toBeCloseTo(589.0, 9)
    // Shorter wavelength = larger energy gap.
    expect(photonEnergy(404.4).eV).toBeGreaterThan(photonEnergy(766.5).eV)
  })

  it('maps wavelengths to the right part of the visible spectrum', () => {
    const [r, g, b] = wavelengthToRgb(450)
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(g)
    expect(wavelengthToRgb(530)[1]).toBeGreaterThan(wavelengthToRgb(530)[2])
    expect(wavelengthToRgb(680)).toEqual([1, 0, 0])
    expect(wavelengthToRgb(300)).toEqual([0, 0, 0])
    expect(wavelengthToRgb(900)).toEqual([0, 0, 0])
  })

  it('gives each cation its characteristic flame colour', () => {
    expect(hueOf('Na')).toBeGreaterThan(45) // yellow
    expect(hueOf('Na')).toBeLessThan(60)
    expect(hueOf('K')).toBeGreaterThan(270) // lilac / violet-pink
    expect(hueOf('K')).toBeLessThan(320)
    expect(hueOf('Ca')).toBeGreaterThan(8) // brick red (orange-red)
    expect(hueOf('Ca')).toBeLessThan(30)
    expect(hueOf('Ba')).toBeGreaterThan(80) // apple green
    expect(hueOf('Ba')).toBeLessThan(130)
    expect(hueOf('Cu')).toBeGreaterThan(150) // blue-green
    expect(hueOf('Cu')).toBeLessThan(200)
    const sr = hueOf('Sr') // crimson: red, slightly towards blue or orange
    expect(sr < 10 || sr > 340).toBe(true)
  })

  it('every metal has distinct strongest lines in the visible range', () => {
    const seen = new Set<number>()
    for (const id of METAL_IDS) {
      const l = strongestLine(id)
      expect(l.wavelength).toBeGreaterThan(380)
      expect(l.wavelength).toBeLessThan(780)
      seen.add(l.wavelength)
    }
    expect(seen.size).toBe(METAL_IDS.length)
    expect(strongestLine('Na').transition).toBe('3p → 3s')
  })

  it('a clean flame is pale blue; a trace of sodium masks potassium', () => {
    const clean = flameColor({})
    expect(clean.strength).toBe(0)
    expect(clean.rgb.b).toBeGreaterThan(clean.rgb.r)
    const masked = hue(flameColor({ K: 1, Na: 0.5 }).rgb)
    expect(masked).toBeLessThan(60) // towards yellow-orange, no longer lilac
  })

  it('cobalt-blue glass removes the sodium yellow and reveals potassium', () => {
    const seen = hue(flameColor({ K: 1, Na: 0.5 }, true).rgb)
    expect(seen).toBeGreaterThan(270)
    const naOnly = flameColor({ Na: 1 }, true)
    expect(naOnly.strength).toBeLessThan(0.2)
  })

  it('builds a normalised emission spectrum with peaks at the lines', () => {
    const s = emissionSpectrum({ Na: 1 }, false, 1)
    const peak = s.reduce((a, b) => (b.I > a.I ? b : a))
    expect(peak.nm).toBe(589)
    expect(peak.I).toBeCloseTo(1, 9)
    expect(s.find((p) => p.nm === 450)!.I).toBeLessThan(1e-6)
  })

  it('picks a different random unknown each time when asked', () => {
    for (let i = 0; i < 20; i++) expect(randomUnknown(Math.random, 'Na')).not.toBe('Na')
    expect(randomUnknown(() => 0)).toBe('Na')
    expect(randomUnknown(() => 0.999999)).toBe('Sr')
  })
})
