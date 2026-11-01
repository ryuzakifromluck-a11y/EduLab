/**
 * Normal Zeeman effect of the red cadmium line (643.847 nm, ¹D₂ → ¹P₁).
 *
 * Both levels are singlets (S = 0, g = 1), so a magnetic field B shifts every
 * sublevel by
 *
 *   ΔE = μ_B · B · m_l
 *
 * The upper level (l = 2) splits into five sublevels, the lower (l = 1) into
 * three. The selection rule Δm_l = 0, ±1 allows nine transitions, but because
 * both levels split by the same step they fall on just three lines:
 *
 *   π  (Δm_l = 0)  at λ₀                    linearly polarised ∥ B
 *   σ± (Δm_l = ±1) at λ₀ ∓ Δλ,  Δλ = λ₀² μ_B B / (h c)
 *
 * Observed across the field (transverse) all three lines appear, the π line
 * twice as bright as each σ line, all linearly polarised. Observed along the
 * field (longitudinal, through a hole in the pole piece) the π line vanishes
 * and the two σ lines are circularly polarised in opposite senses.
 */

export const MU_B = 9.2740100783e-24 // J/T
export const PLANCK = 6.62607015e-34 // J·s
export const LIGHT_SPEED = 299_792_458 // m/s
export const E_CHARGE = 1.602176634e-19 // C
export const E_MASS = 9.1093837015e-31 // kg
/** Wavelength of the cadmium red line in air, m. */
export const CD_RED = 643.847e-9

export type Observation = 'transverse' | 'longitudinal'
export type ComponentKind = 'pi' | 'sigmaPlus' | 'sigmaMinus'
export type Polarisation = 'linearParallel' | 'linearPerpendicular' | 'circularRight' | 'circularLeft'

export interface SpectralLine {
  kind: ComponentKind
  /** Change of m_l in the transition (upper − lower): 0, +1 or −1. */
  dm: -1 | 0 | 1
  /** Wavelength, m. */
  wavelength: number
  /** Shift from λ₀, m (negative = towards blue). */
  shift: number
  /** Relative intensity; the three transverse lines add up to 1. */
  intensity: number
  polarisation: Polarisation
}

export interface Transition {
  mUpper: number
  mLower: number
  dm: -1 | 0 | 1
  /** Photon energy minus the zero-field photon energy, J. */
  dE: number
}

/** Energy shift of a sublevel with magnetic quantum number m_l (g = 1). */
export const levelShift = (B: number, ml: number) => MU_B * B * ml

/** Splitting between neighbouring sublevels, J. */
export const levelSpacing = (B: number) => MU_B * B

/** Photon energy of the zero-field line, J. */
export const photonEnergy = (lambda = CD_RED) => (PLANCK * LIGHT_SPEED) / lambda

/** Wavelength shift of the σ lines, Δλ = λ² μ_B B / (h c), m. */
export const wavelengthShift = (B: number, lambda = CD_RED) => (lambda * lambda * MU_B * B) / (PLANCK * LIGHT_SPEED)

/** Shift in wavenumber, Δν̃ = μ_B B / (h c), m⁻¹. */
export const wavenumberShift = (B: number) => (MU_B * B) / (PLANCK * LIGHT_SPEED)

/** Frequency shift (Larmor frequency) Δν = μ_B B / h, Hz. */
export const frequencyShift = (B: number) => (MU_B * B) / PLANCK

/** Specific charge of the electron from a measured shift: e/m = 4π c Δλ / (λ² B). */
export function specificCharge(deltaLambda: number, B: number, lambda = CD_RED): number | null {
  if (B <= 0 || deltaLambda <= 0) return null
  return (4 * Math.PI * LIGHT_SPEED * deltaLambda) / (lambda * lambda * B)
}

/** Bohr magneton from a measured shift: μ_B = h c Δλ / (λ² B). */
export function bohrMagnetonFrom(deltaLambda: number, B: number, lambda = CD_RED): number | null {
  if (B <= 0 || deltaLambda <= 0) return null
  return (PLANCK * LIGHT_SPEED * deltaLambda) / (lambda * lambda * B)
}

/** All nine allowed transitions ¹D₂(m) → ¹P₁(m′) with Δm = 0, ±1. */
export function transitions(B: number): Transition[] {
  const out: Transition[] = []
  for (let mu = -2; mu <= 2; mu++) {
    for (let ml = -1; ml <= 1; ml++) {
      const dm = mu - ml
      if (Math.abs(dm) > 1) continue
      out.push({ mUpper: mu, mLower: ml, dm: dm as -1 | 0 | 1, dE: levelShift(B, mu) - levelShift(B, ml) })
    }
  }
  return out
}

/**
 * The lines seen through the spectrometer. σ⁺ (Δm = +1) has the higher photon
 * energy, so the shorter wavelength.
 */
export function zeemanLines(B: number, mode: Observation, lambda = CD_RED): SpectralLine[] {
  const d = wavelengthShift(Math.abs(B), lambda)
  if (mode === 'longitudinal') {
    return [
      { kind: 'sigmaPlus', dm: 1, wavelength: lambda - d, shift: -d, intensity: 0.5, polarisation: 'circularRight' },
      { kind: 'sigmaMinus', dm: -1, wavelength: lambda + d, shift: d, intensity: 0.5, polarisation: 'circularLeft' },
    ]
  }
  return [
    { kind: 'sigmaPlus', dm: 1, wavelength: lambda - d, shift: -d, intensity: 0.25, polarisation: 'linearPerpendicular' },
    { kind: 'pi', dm: 0, wavelength: lambda, shift: 0, intensity: 0.5, polarisation: 'linearParallel' },
    { kind: 'sigmaMinus', dm: -1, wavelength: lambda + d, shift: d, intensity: 0.25, polarisation: 'linearPerpendicular' },
  ]
}

/** Doppler/instrument width of each line (FWHM), m. Sets when the lines are resolved. */
export const LINE_WIDTH = 2.5e-12

/** Intensity seen at wavelength λ: each line as a Gaussian of width `width`. */
export function spectrum(lines: SpectralLine[], wavelength: number, width = LINE_WIDTH): number {
  const s = width / (2 * Math.sqrt(2 * Math.log(2)))
  let I = 0
  for (const l of lines) {
    const x = (wavelength - l.wavelength) / s
    I += l.intensity * Math.exp(-0.5 * x * x)
  }
  return I
}

/** Sampled spectrum around λ₀ (± span), for plots. Wavelength offsets in pm. */
export function spectrumProfile(lines: SpectralLine[], span = 40e-12, points = 241, lambda = CD_RED, width = LINE_WIDTH) {
  return Array.from({ length: points }, (_, i) => {
    const off = -span + (2 * span * i) / (points - 1)
    return { offset: off * 1e12, I: spectrum(lines, lambda + off, width) }
  })
}

/** Lines count as resolved once they are further apart than the line width. */
export const resolved = (B: number, lambda = CD_RED, width = LINE_WIDTH) => wavelengthShift(B, lambda) > width
