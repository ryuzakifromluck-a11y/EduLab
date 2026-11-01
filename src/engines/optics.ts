/**
 * Reflection and refraction of a light ray at a flat boundary.
 *
 *   law of reflection:  θ_r = θ₁
 *   Snell's law:        n₁ sin θ₁ = n₂ sin θ₂
 *   critical angle:     sin θ_c = n₂ / n₁            (only when n₁ > n₂)
 *
 * The share of the light that is reflected comes from the Fresnel equations
 * for unpolarised light (the average of the s and p reflectances). Beyond the
 * critical angle all of the light is reflected (total internal reflection).
 */

export const C = 299_792_458

export interface Medium {
  id: 'air' | 'water' | 'glass' | 'diamond'
  n: number
}

export const MEDIA: Medium[] = [
  { id: 'air', n: 1.0003 },
  { id: 'water', n: 1.333 },
  { id: 'glass', n: 1.52 },
  { id: 'diamond', n: 2.417 },
]

export const mediumById = (id: Medium['id']) => MEDIA.find((m) => m.id === id) ?? MEDIA[0]

const rad = (deg: number) => (deg * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Refraction angle in degrees, or null when the ray is totally internally reflected. */
export function refractionAngle(n1: number, n2: number, incidenceDeg: number): number | null {
  const s = (n1 / n2) * Math.sin(rad(incidenceDeg))
  if (s > 1 + 1e-12) return null
  return deg(Math.asin(Math.min(1, s)))
}

/** Critical angle in degrees, or null when n₁ ≤ n₂ (no total internal reflection possible). */
export function criticalAngle(n1: number, n2: number): number | null {
  return n1 > n2 ? deg(Math.asin(n2 / n1)) : null
}

/** Fresnel reflectances (0–1) for s- and p-polarised light and their average. */
export function reflectance(n1: number, n2: number, incidenceDeg: number) {
  const t2 = refractionAngle(n1, n2, incidenceDeg)
  if (t2 === null) return { rs: 1, rp: 1, r: 1 }
  const ci = Math.cos(rad(incidenceDeg))
  const ct = Math.cos(rad(t2))
  const rs = ((n1 * ci - n2 * ct) / (n1 * ci + n2 * ct)) ** 2
  const rp = ((n1 * ct - n2 * ci) / (n1 * ct + n2 * ci)) ** 2
  return { rs, rp, r: (rs + rp) / 2 }
}

/** Speed of light in a medium, m/s. */
export const lightSpeed = (n: number) => C / n

export interface RayResult {
  incidence: number
  reflection: number
  refraction: number | null
  critical: number | null
  reflected: number
  transmitted: number
  totalInternal: boolean
}

export function traceRay(n1: number, n2: number, incidenceDeg: number): RayResult {
  const refraction = refractionAngle(n1, n2, incidenceDeg)
  const { r } = reflectance(n1, n2, incidenceDeg)
  return {
    incidence: incidenceDeg,
    reflection: incidenceDeg,
    refraction,
    critical: criticalAngle(n1, n2),
    reflected: r,
    transmitted: 1 - r,
    totalInternal: refraction === null,
  }
}

/** θ₂ and reflectance for every incidence angle 0–89.5°. */
export function angleSweep(n1: number, n2: number, points = 91) {
  return Array.from({ length: points }, (_, i) => {
    const a = (89.5 * i) / (points - 1)
    const t2 = refractionAngle(n1, n2, a)
    const { r } = reflectance(n1, n2, a)
    return {
      incidence: a,
      refraction: t2,
      reflected: r * 100,
      transmitted: (1 - r) * 100,
      sin1: Math.sin(rad(a)),
      sin2: t2 === null ? null : Math.sin(rad(t2)),
    }
  })
}
