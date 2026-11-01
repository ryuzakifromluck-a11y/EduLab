/**
 * Conical (Erlenmeyer) flask profile in scene units. Used to map the solution
 * volume (mL) to a liquid height, so the level rises correctly as titrant is added.
 */
export const FLASK = {
  bottomRadius: 0.62,
  coneHeight: 1.0,
  neckRadius: 0.14,
  neckHeight: 0.35,
  /** Nominal capacity of the conical body, mL. */
  capacity: 250,
}

/** Inner radius at height y above the flask bottom. */
export function flaskRadius(y: number): number {
  if (y >= FLASK.coneHeight) return FLASK.neckRadius
  const k = Math.max(0, y) / FLASK.coneHeight
  return FLASK.bottomRadius + (FLASK.neckRadius - FLASK.bottomRadius) * k
}

const STEPS = 400
const dy = FLASK.coneHeight / STEPS
// Cumulative scene volume up to each step.
const cumulative: number[] = [0]
for (let i = 1; i <= STEPS; i++) {
  const r = flaskRadius((i - 0.5) * dy)
  cumulative.push(cumulative[i - 1] + Math.PI * r * r * dy)
}
const SCENE_PER_ML = cumulative[STEPS] / FLASK.capacity

/** Liquid height (scene units) for a given volume in mL. */
export function liquidHeight(volumeMl: number): number {
  const target = Math.max(0, volumeMl) * SCENE_PER_ML
  if (target >= cumulative[STEPS]) return FLASK.coneHeight
  let lo = 0
  let hi = STEPS
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cumulative[mid] < target) lo = mid
    else hi = mid
  }
  const frac = (target - cumulative[lo]) / (cumulative[hi] - cumulative[lo] || 1)
  return (lo + frac) * dy
}
