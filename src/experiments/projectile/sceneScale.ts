/**
 * Shared scaling for the 3D and 2D views: metres → view units, chosen so the
 * predicted trajectory fills about 8 × 5 units with equal x and y scale.
 */
export function viewScale(range: number, maxHeight: number, width = 8, height = 5): number {
  return 1 / Math.max(range / width, maxHeight / height, 0.25)
}

/** A "nice" tick step (1, 2 or 5 × 10ⁿ) giving about `target` ticks across `span`. */
export function niceStep(span: number, target = 5): number {
  const raw = Math.max(span, 1e-6) / target
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  return (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag
}
