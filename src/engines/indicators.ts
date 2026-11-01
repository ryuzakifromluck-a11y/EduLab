/**
 * Acid–base indicators.
 *
 * A two-colour indicator is a weak acid HIn whose conjugate base In⁻ has a
 * different colour. From the Henderson–Hasselbalch equation the fraction in
 * the base form is
 *
 *   f(In⁻) = 1 / (1 + 10^(pKₐ − pH))
 *
 * and the observed colour is the mixture of the two forms. Mixed and natural
 * indicators (universal indicator, red cabbage) contain several dyes, so their
 * colour is described by a list of colour stops along the pH scale instead.
 * Colours are mixed in linear-light RGB.
 */

export const KW = 1e-14

export interface TwoColourIndicator {
  id: 'methylOrange' | 'methylRed' | 'bromothymolBlue' | 'litmus' | 'phenolphthalein'
  kind: 'two'
  pKa: number
  /** Visible transition range [low, high]. */
  range: [number, number]
  acidColor: string
  baseColor: string
  /** Opacity of each form; phenolphthalein's acid form is colourless. */
  acidAlpha?: number
}

export interface MixedIndicator {
  id: 'universal' | 'redCabbage'
  kind: 'mixed'
  stops: { pH: number; color: string }[]
}

export type Indicator = TwoColourIndicator | MixedIndicator
export type IndicatorId = Indicator['id']

export const INDICATORS: Indicator[] = [
  { id: 'methylOrange', kind: 'two', pKa: 3.7, range: [3.1, 4.4], acidColor: '#d6301f', baseColor: '#f2c12e' },
  { id: 'methylRed', kind: 'two', pKa: 5.1, range: [4.4, 6.2], acidColor: '#d42a3c', baseColor: '#f0cf2c' },
  { id: 'bromothymolBlue', kind: 'two', pKa: 7.1, range: [6.0, 7.6], acidColor: '#e3cf37', baseColor: '#1f5fc4' },
  { id: 'litmus', kind: 'two', pKa: 6.5, range: [4.5, 8.3], acidColor: '#c7283a', baseColor: '#3a4bb5' },
  { id: 'phenolphthalein', kind: 'two', pKa: 9.4, range: [8.2, 10.0], acidColor: '#ffffff', baseColor: '#e0338f', acidAlpha: 0 },
  {
    id: 'universal',
    kind: 'mixed',
    stops: [
      { pH: 0, color: '#c0162c' },
      { pH: 2, color: '#e5432a' },
      { pH: 4, color: '#f29b2b' },
      { pH: 6, color: '#e8d63a' },
      { pH: 7, color: '#5fb446' },
      { pH: 8, color: '#2e9c71' },
      { pH: 10, color: '#2a5fb8' },
      { pH: 12, color: '#4a3a9c' },
      { pH: 14, color: '#6b2a8c' },
    ],
  },
  {
    id: 'redCabbage',
    kind: 'mixed',
    stops: [
      { pH: 0, color: '#c4122f' },
      { pH: 2, color: '#d6286a' },
      { pH: 4, color: '#b2408f' },
      { pH: 6, color: '#7a46a8' },
      { pH: 7, color: '#5a4fb8' },
      { pH: 8, color: '#3a6fc7' },
      { pH: 10, color: '#2f9e72' },
      { pH: 12, color: '#a8c43a' },
      { pH: 14, color: '#e8cf22' },
    ],
  },
]

export const indicatorById = (id: IndicatorId) => INDICATORS.find((i) => i.id === id) ?? INDICATORS[0]

export interface Substance {
  id: string
  pH: number
}

/** Typical pH values of everyday solutions. */
export const SUBSTANCES: Substance[] = [
  { id: 'stomachAcid', pH: 1.5 },
  { id: 'lemon', pH: 2.2 },
  { id: 'vinegar', pH: 2.9 },
  { id: 'tomato', pH: 4.3 },
  { id: 'coffee', pH: 5.0 },
  { id: 'milk', pH: 6.6 },
  { id: 'water', pH: 7.0 },
  { id: 'blood', pH: 7.4 },
  { id: 'seawater', pH: 8.1 },
  { id: 'bakingSoda', pH: 8.3 },
  { id: 'soap', pH: 10.0 },
  { id: 'ammonia', pH: 11.6 },
  { id: 'bleach', pH: 12.6 },
  { id: 'drainCleaner', pH: 13.5 },
]

export const hydrogenIon = (pH: number) => Math.pow(10, -pH)
export const hydroxideIon = (pH: number) => KW / hydrogenIon(pH)
export const pOH = (pH: number) => 14 - pH
export const phFromHydrogen = (h: number) => -Math.log10(h)

export type Nature = 'acidic' | 'neutral' | 'basic'
export function nature(pH: number): Nature {
  if (pH < 6.95) return 'acidic'
  if (pH > 7.05) return 'basic'
  return 'neutral'
}

/** Fraction of a two-colour indicator in its base form, 0–1. */
export function baseFraction(pKa: number, pH: number): number {
  return 1 / (1 + Math.pow(10, pKa - pH))
}

type RGBA = [number, number, number, number]

function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  return c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number]
}

function linearToHex([r, g, b]: [number, number, number]): string {
  const enc = (v: number) => {
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
    return Math.round(Math.min(1, Math.max(0, s)) * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${enc(r)}${enc(g)}${enc(b)}`
}

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [0, 1, 2, 3].map((i) => a[i] + (b[i] - a[i]) * t) as RGBA
}

/** Colour of the indicator in a solution of the given pH: hex colour plus opacity 0–1. */
export function indicatorColor(ind: Indicator, pH: number): { hex: string; alpha: number } {
  let rgba: RGBA
  if (ind.kind === 'two') {
    const f = baseFraction(ind.pKa, pH)
    const acid: RGBA = [...hexToLinear(ind.acidColor), ind.acidAlpha ?? 1]
    const base: RGBA = [...hexToLinear(ind.baseColor), 1]
    // A colourless form contributes no colour, only less intensity.
    if ((ind.acidAlpha ?? 1) === 0) acid.splice(0, 3, ...base.slice(0, 3))
    rgba = mix(acid, base, f)
  } else {
    const s = ind.stops
    const p = Math.min(s[s.length - 1].pH, Math.max(s[0].pH, pH))
    let i = 0
    while (i < s.length - 2 && p > s[i + 1].pH) i++
    const t = (p - s[i].pH) / (s[i + 1].pH - s[i].pH)
    rgba = mix([...hexToLinear(s[i].color), 1], [...hexToLinear(s[i + 1].color), 1], t)
  }
  return { hex: linearToHex([rgba[0], rgba[1], rgba[2]]), alpha: rgba[3] }
}

/** Which colour band a two-colour indicator shows: 'acid', 'transition' or 'base'. */
export function indicatorZone(ind: TwoColourIndicator, pH: number): 'acid' | 'transition' | 'base' {
  if (pH < ind.range[0]) return 'acid'
  if (pH > ind.range[1]) return 'base'
  return 'transition'
}

/** Base-form fraction of each two-colour indicator across the pH scale. */
export function transitionCurves(points = 141) {
  return Array.from({ length: points }, (_, i) => {
    const pH = (14 * i) / (points - 1)
    const row: Record<string, number> = { pH }
    for (const ind of INDICATORS) if (ind.kind === 'two') row[ind.id] = baseFraction(ind.pKa, pH) * 100
    return row
  })
}

/** log₁₀ of [H⁺] and [OH⁻] across the pH scale. */
export function ionCurves(points = 29) {
  return Array.from({ length: points }, (_, i) => {
    const pH = (14 * i) / (points - 1)
    return { pH, logH: -pH, logOH: pH - 14 }
  })
}
