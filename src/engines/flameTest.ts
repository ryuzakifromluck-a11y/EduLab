/**
 * Flame test for metal cations.
 *
 * In the hot flame a metal salt is vaporised and atoms (or small molecules such as CaOH, BaOH
 * and CuCl) are thermally excited. When an electron falls back to a lower level it emits a
 * photon whose energy equals the gap between the levels:
 *
 *   ΔE = h·c / λ          h = 6.626 × 10⁻³⁴ J·s,  c = 2.998 × 10⁸ m/s
 *
 * Every element has its own set of levels, so its emission lines (and the colour the eye sees)
 * identify it. The colour shown here is the sum of each line's colour weighted by its
 * relative visible intensity, mixed with the pale blue of a clean Bunsen flame.
 *
 * Line positions are literature values (nm). Intensities are relative visual weights, not
 * absolute emission strengths. Wavelength → RGB uses Dan Bruton's piecewise approximation of
 * the CIE colour-matching functions with reduced brightness at the edges of vision.
 *
 * A wire that is not cleaned in HCl between tests keeps traces of the previous salt; sodium in
 * particular is so bright that a trace hides other colours. Cobalt-blue glass absorbs the
 * yellow sodium light, letting the lilac of potassium be seen.
 */

export const H = 6.62607015e-34 // J·s
export const C = 2.99792458e8 // m/s
export const EV = 1.602176634e-19 // J

export type MetalId = 'Na' | 'K' | 'Ca' | 'Ba' | 'Cu' | 'Sr'
export type FlameColorName = 'yellow' | 'lilac' | 'brickRed' | 'appleGreen' | 'blueGreen' | 'crimson'

export interface EmissionLine {
  /** Wavelength, nm. */
  wavelength: number
  /** Relative visual intensity. */
  intensity: number
  /** Emitting species. */
  emitter: string
  /** Electronic transition (atomic lines only). */
  transition?: string
  /** Molecular bands are broader than atomic lines. */
  band?: boolean
}

export interface Metal {
  id: MetalId
  salt: string
  /** Cation with its charge, e.g. Ca²⁺. */
  ion: string
  colorName: FlameColorName
  /** How strongly a given amount of salt colours the flame (sodium is extremely bright). */
  brightness: number
  lines: EmissionLine[]
}

export const METALS: Record<MetalId, Metal> = {
  Na: {
    id: 'Na',
    ion: 'Na⁺',
    salt: 'NaCl',
    colorName: 'yellow',
    brightness: 5,
    lines: [
      { wavelength: 589.0, intensity: 1, emitter: 'Na', transition: '3p → 3s' },
      { wavelength: 589.6, intensity: 0.5, emitter: 'Na', transition: '3p → 3s' },
    ],
  },
  K: {
    id: 'K',
    ion: 'K⁺',
    salt: 'KCl',
    colorName: 'lilac',
    brightness: 0.8,
    lines: [
      { wavelength: 766.5, intensity: 1, emitter: 'K', transition: '4p → 4s' },
      { wavelength: 769.9, intensity: 0.5, emitter: 'K', transition: '4p → 4s' },
      { wavelength: 404.4, intensity: 2.6, emitter: 'K', transition: '5p → 4s' },
    ],
  },
  Ca: {
    id: 'Ca',
    ion: 'Ca²⁺',
    salt: 'CaCl₂',
    colorName: 'brickRed',
    brightness: 1,
    lines: [
      { wavelength: 622, intensity: 1, emitter: 'CaOH', band: true },
      { wavelength: 646, intensity: 0.6, emitter: 'CaOH', band: true },
      { wavelength: 554, intensity: 0.08, emitter: 'CaOH', band: true },
      { wavelength: 422.7, intensity: 0.08, emitter: 'Ca', transition: '4s4p → 4s²' },
    ],
  },
  Ba: {
    id: 'Ba',
    ion: 'Ba²⁺',
    salt: 'BaCl₂',
    colorName: 'appleGreen',
    brightness: 1,
    lines: [
      { wavelength: 524, intensity: 1, emitter: 'BaCl', band: true },
      { wavelength: 514, intensity: 0.7, emitter: 'BaCl', band: true },
      { wavelength: 553.5, intensity: 0.6, emitter: 'Ba', transition: '6s6p → 6s²' },
    ],
  },
  Cu: {
    id: 'Cu',
    ion: 'Cu²⁺',
    salt: 'CuCl₂',
    colorName: 'blueGreen',
    brightness: 1,
    lines: [
      { wavelength: 521.8, intensity: 0.5, emitter: 'Cu', transition: '4p → 4s²' },
      { wavelength: 515.3, intensity: 0.4, emitter: 'Cu', transition: '4p → 4s²' },
      { wavelength: 488, intensity: 0.6, emitter: 'CuCl', band: true },
      { wavelength: 452, intensity: 0.5, emitter: 'CuCl', band: true },
      { wavelength: 435, intensity: 0.4, emitter: 'CuCl', band: true },
    ],
  },
  Sr: {
    id: 'Sr',
    ion: 'Sr²⁺',
    salt: 'SrCl₂',
    colorName: 'crimson',
    brightness: 1,
    lines: [
      { wavelength: 682, intensity: 1, emitter: 'SrOH', band: true },
      { wavelength: 662, intensity: 0.8, emitter: 'SrCl', band: true },
      { wavelength: 640, intensity: 0.6, emitter: 'SrCl', band: true },
      { wavelength: 606, intensity: 0.2, emitter: 'SrOH', band: true },
      { wavelength: 460.7, intensity: 0.1, emitter: 'Sr', transition: '5s5p → 5s²' },
    ],
  },
}

export const METAL_IDS = Object.keys(METALS) as MetalId[]

/** Photon energy for a wavelength in nm. */
export function photonEnergy(wavelengthNm: number) {
  const joules = (H * C) / (wavelengthNm * 1e-9)
  return { joules, eV: joules / EV }
}

/** Wavelength (nm) of a photon with the given energy in eV. */
export function wavelengthFromEnergy(eV: number): number {
  return ((H * C) / (eV * EV)) * 1e9
}

/** Approximate sRGB (0–1) for a monochromatic wavelength (Dan Bruton). */
export function wavelengthToRgb(nm: number): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / 60
    b = 1
  } else if (nm < 490) {
    g = (nm - 440) / 50
    b = 1
  } else if (nm < 510) {
    g = 1
    b = -(nm - 510) / 20
  } else if (nm < 580) {
    r = (nm - 510) / 70
    g = 1
  } else if (nm < 645) {
    r = 1
    g = -(nm - 645) / 65
  } else if (nm <= 780) {
    r = 1
  }
  let f = 0
  if (nm >= 380 && nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40
  else if (nm >= 420 && nm < 701) f = 1
  else if (nm >= 701 && nm <= 780) f = 0.3 + (0.7 * (780 - nm)) / 80
  const gamma = (v: number) => (v <= 0 ? 0 : Math.pow(v * f, 0.8))
  return [gamma(r), gamma(g), gamma(b)]
}

/** Transmission of cobalt-blue glass: passes blue/violet and deep red, blocks yellow. */
export function cobaltTransmission(nm: number): number {
  if (nm < 500) return 0.9
  if (nm > 690) return 0.8
  if (nm > 640) return 0.35
  return 0.02
}

export type Mixture = Partial<Record<MetalId, number>>

export interface RGB {
  r: number
  g: number
  b: number
}

const WHITE = 0.2

export const BASE_FLAME: RGB = { r: 90, g: 130, b: 255 }

/**
 * Colour of the flame (0–255 sRGB) for amounts of each metal (0–1 scale) seen with or without
 * cobalt glass. With no salt it is the pale blue of a clean, non-luminous flame.
 */
export function flameColor(mix: Mixture, cobaltGlass = false): { rgb: RGB; hex: string; strength: number } {
  let r = 0
  let g = 0
  let b = 0
  let total = 0
  for (const id of METAL_IDS) {
    const amount = mix[id] ?? 0
    if (amount <= 0) continue
    const m = METALS[id]
    for (const line of m.lines) {
      const w = amount * m.brightness * line.intensity * (cobaltGlass ? cobaltTransmission(line.wavelength) : 1)
      const [lr, lg, lb] = wavelengthToRgb(line.wavelength)
      r += lr * w
      g += lg * w
      b += lb * w
      total += w
    }
  }
  const max = Math.max(r, g, b)
  // How much the salt colour dominates the blue background flame.
  const strength = Math.min(1, total / 1.2)
  const base = cobaltGlass ? { r: 40, g: 60, b: 200 } : BASE_FLAME
  // A little white: the hot flame and glowing wire are never perfectly monochromatic.
  const tint = (v: number) => (v / max) * 255 * (1 - WHITE) + 255 * WHITE
  const salt = max > 0 ? { r: tint(r), g: tint(g), b: tint(b) } : base
  const rgb = {
    r: Math.round(base.r + (salt.r - base.r) * strength),
    g: Math.round(base.g + (salt.g - base.g) * strength),
    b: Math.round(base.b + (salt.b - base.b) * strength),
  }
  return { rgb, hex: rgbToHex(rgb), strength }
}

export const rgbToHex = (c: RGB) => '#' + [c.r, c.g, c.b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')

/** Hue in degrees (0–360) of an RGB colour. */
export function hue({ r, g, b }: RGB): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  return h
}

/** Emission spectrum 380–780 nm as summed Gaussian lines (for the chart). */
export function emissionSpectrum(mix: Mixture, cobaltGlass = false, step = 2) {
  const out: { nm: number; I: number }[] = []
  const lines: { nm: number; w: number; sigma: number }[] = []
  for (const id of METAL_IDS) {
    const amount = mix[id] ?? 0
    if (amount <= 0) continue
    for (const l of METALS[id].lines) {
      lines.push({ nm: l.wavelength, w: amount * METALS[id].brightness * l.intensity * (cobaltGlass ? cobaltTransmission(l.wavelength) : 1), sigma: l.band ? 5 : 1.5 })
    }
  }
  for (let nm = 380; nm <= 780; nm += step) {
    let I = 0
    for (const l of lines) I += l.w * Math.exp(-((nm - l.nm) ** 2) / (2 * l.sigma * l.sigma))
    out.push({ nm, I })
  }
  const max = Math.max(1e-12, ...out.map((p) => p.I))
  return out.map((p) => ({ nm: p.nm, I: p.I / max }))
}

/** The strongest visible line of a metal (used for the ΔE = hc/λ calculation). */
export function strongestLine(id: MetalId): EmissionLine {
  return METALS[id].lines.reduce((a, b) => (b.intensity > a.intensity ? b : a))
}

/** Pick a random unknown that differs from `previous` (if given). */
export function randomUnknown(random: () => number = Math.random, previous?: MetalId): MetalId {
  const pool = previous ? METAL_IDS.filter((m) => m !== previous) : METAL_IDS
  return pool[Math.floor(random() * pool.length) % pool.length]
}
