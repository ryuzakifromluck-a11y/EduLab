import { describe, expect, it } from 'vitest'
import {
  CD_RED,
  LIGHT_SPEED,
  MU_B,
  PLANCK,
  E_CHARGE,
  E_MASS,
  bohrMagnetonFrom,
  frequencyShift,
  levelShift,
  resolved,
  specificCharge,
  spectrum,
  spectrumProfile,
  transitions,
  wavelengthShift,
  wavenumberShift,
  zeemanLines,
} from './zeemanEffect'

describe('Zeeman effect', () => {
  it('shifts each sublevel by μ_B·B·m_l', () => {
    expect(levelShift(1, 1)).toBeCloseTo(MU_B, 30)
    expect(levelShift(0.5, -2)).toBeCloseTo(-MU_B, 30)
    expect(levelShift(0, 2)).toBe(0)
  })

  it('gives Δλ ≈ 0.0194 nm per tesla for the cadmium red line', () => {
    expect(wavelengthShift(1) * 1e12).toBeCloseTo(19.35, 1)
    expect(wavelengthShift(0.5)).toBeCloseTo(wavelengthShift(1) / 2, 20)
    expect(wavenumberShift(1)).toBeCloseTo(46.686, 2) // m⁻¹
    expect(frequencyShift(1) / 1e9).toBeCloseTo(13.996, 2) // GHz
  })

  it('has nine allowed transitions grouped onto three energies (normal Zeeman effect)', () => {
    const t = transitions(1)
    expect(t).toHaveLength(9)
    const energies = [...new Set(t.map((x) => Math.round(x.dE / MU_B)))].sort()
    expect(energies).toEqual([-1, 0, 1])
    expect(t.filter((x) => x.dm === 0)).toHaveLength(3)
    for (const x of t) expect(x.dE).toBeCloseTo(x.dm * MU_B, 30)
  })

  it('shows π and two σ lines across the field, σ only along it', () => {
    const tr = zeemanLines(1, 'transverse')
    expect(tr.map((l) => l.kind)).toEqual(['sigmaPlus', 'pi', 'sigmaMinus'])
    expect(tr[1].wavelength).toBe(CD_RED)
    expect(tr[1].intensity).toBeCloseTo(2 * tr[0].intensity, 12)
    expect(tr.reduce((s, l) => s + l.intensity, 0)).toBeCloseTo(1, 12)
    expect(tr[0].wavelength).toBeLessThan(CD_RED)
    expect(tr[2].wavelength - CD_RED).toBeCloseTo(wavelengthShift(1), 20)

    const lo = zeemanLines(1, 'longitudinal')
    expect(lo.some((l) => l.kind === 'pi')).toBe(false)
    expect(lo.map((l) => l.polarisation)).toEqual(['circularRight', 'circularLeft'])
  })

  it('photon energy of σ⁺ exceeds the zero-field energy by μ_B·B', () => {
    const [sp] = zeemanLines(0.8, 'transverse')
    const dE = PLANCK * LIGHT_SPEED * (1 / sp.wavelength - 1 / CD_RED)
    expect(dE / (MU_B * 0.8)).toBeCloseTo(1, 4)
  })

  it('recovers e/m and μ_B from a measured shift', () => {
    const B = 0.9
    const d = wavelengthShift(B)
    expect(specificCharge(d, B)! / (E_CHARGE / E_MASS)).toBeCloseTo(1, 4)
    expect(bohrMagnetonFrom(d, B)! / MU_B).toBeCloseTo(1, 10)
    expect(specificCharge(d, 0)).toBeNull()
  })

  it('merges into one peak at B = 0 and resolves at high field', () => {
    const zero = zeemanLines(0, 'transverse')
    expect(spectrum(zero, CD_RED)).toBeCloseTo(1, 12)
    expect(resolved(0.05)).toBe(false)
    expect(resolved(1)).toBe(true)
    const prof = spectrumProfile(zeemanLines(1, 'longitudinal'), 40e-12, 161)
    const centre = prof[80].I
    const peak = Math.max(...prof.map((p) => p.I))
    expect(centre).toBeLessThan(0.05 * peak)
  })
})
