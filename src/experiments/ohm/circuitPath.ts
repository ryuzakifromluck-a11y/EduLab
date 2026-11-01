/** Rectangular loop on the bench (x–z plane), traversed in the conventional-current direction. */
export const LOOP = { x0: -2, x1: 2, z0: -1.2, z1: 1.2 }

const W = LOOP.x1 - LOOP.x0
const H = LOOP.z1 - LOOP.z0
const PERIM = 2 * (W + H)

/**
 * Point at fraction s ∈ [0,1) of the loop. Starts at the battery's + terminal
 * (left side, top) and runs clockwise when seen from above: left → top (resistor)
 * → right (ammeter) → bottom (switch) → back to the battery's − terminal.
 */
export function pointOnLoop(s: number): [number, number] {
  let d = (((s % 1) + 1) % 1) * PERIM
  if (d < W) return [LOOP.x0 + d, LOOP.z0]
  d -= W
  if (d < H) return [LOOP.x1, LOOP.z0 + d]
  d -= H
  if (d < W) return [LOOP.x1 - d, LOOP.z1]
  d -= W
  return [LOOP.x0, LOOP.z1 - d]
}

/** Visual speed of the current markers (loop fractions per second); qualitative, increases with I. */
export function markerSpeed(currentA: number): number {
  if (currentA <= 0) return 0
  return Math.min(0.5, 0.02 + 0.18 * Math.sqrt(currentA))
}
