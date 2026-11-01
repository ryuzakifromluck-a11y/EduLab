/** Geometry shared by the 3D and 2D views of a volumetric flask (100 mL size; scaled by ∛(V/100)). */
export const BULB_R = 0.55
export const NECK_R = 0.075
export const NECK_H = 1.0
/** Fraction of the nominal volume held by the bulb; the rest fills the neck up to the mark. */
export const BULB_SHARE = 0.92
/** Height of the mark above the top of the bulb, as a fraction of the neck. */
export const MARK = 0.55

const capVolume = (h: number, r: number) => (Math.PI * h * h * (3 * r - h)) / 3

/** Liquid height from the bottom of the flask for a fill fraction (0–1 of the nominal volume). */
export function liquidHeight(fraction: number, r = BULB_R, neck = NECK_H): number {
  const f = Math.max(0, fraction)
  if (f <= BULB_SHARE) {
    const target = (f / BULB_SHARE) * capVolume(2 * r, r)
    let lo = 0
    let hi = 2 * r
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2
      if (capVolume(mid, r) < target) lo = mid
      else hi = mid
    }
    return lo
  }
  return 2 * r + ((f - BULB_SHARE) / (1 - BULB_SHARE)) * MARK * neck
}
