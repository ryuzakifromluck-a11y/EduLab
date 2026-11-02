import type { Ctx2D } from './canvasSheet'

/** Shared drawing helpers for EduLab's procedurally drawn lab equipment (all original artwork). */

export const GLASS_STROKE = 'rgba(205, 225, 255, 0.95)'
export const GLASS_FILL = 'rgba(210, 230, 255, 0.16)'
export const METAL = '#9aa3b4'
export const METAL_DARK = '#5d6578'

type Pt = readonly [number, number]

/** Path through points given in 0–1 units of the frame, optionally smoothed with quadratic curves. */
export function path(ctx: Ctx2D, w: number, h: number, pts: readonly Pt[], { close = false, smooth = false } = {}) {
  const P = pts.map(([x, y]) => [x * w, y * h] as const)
  ctx.beginPath()
  ctx.moveTo(P[0][0], P[0][1])
  if (!smooth || P.length < 3) {
    for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1])
  } else {
    for (let i = 1; i < P.length - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2
      const my = (P[i][1] + P[i + 1][1]) / 2
      ctx.quadraticCurveTo(P[i][0], P[i][1], mx, my)
    }
    ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1])
  }
  if (close) ctx.closePath()
}

/** Mirror a left-half outline (top to bottom) into a closed symmetric outline. */
export function symmetric(half: readonly Pt[]): Pt[] {
  const right = [...half].reverse().map(([x, y]) => [1 - x, y] as const)
  return [...half, ...right]
}

export function glass(ctx: Ctx2D, w: number, h: number, pts: readonly Pt[], opts: { smooth?: boolean; close?: boolean } = {}) {
  const lw = Math.max(2, Math.min(w, h) * 0.03)
  path(ctx, w, h, pts, { close: opts.close ?? true, smooth: opts.smooth })
  ctx.fillStyle = GLASS_FILL
  ctx.fill()
  ctx.lineWidth = lw
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = GLASS_STROKE
  ctx.stroke()
}

/** Vertical white highlight that reads as a reflection on glass. */
export function highlight(ctx: Ctx2D, x: number, y0: number, y1: number, width: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(x, y0, width, y1 - y0)
}

/** Graduation marks on the left side of a vessel; every `major`-th mark is longer. */
export function graduations(ctx: Ctx2D, x: number, y0: number, y1: number, count: number, major = 5, len = 10) {
  ctx.strokeStyle = 'rgba(235, 242, 255, 0.85)'
  ctx.lineWidth = 1.5
  for (let i = 0; i <= count; i++) {
    const y = y1 - ((y1 - y0) * i) / count
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (i % major === 0 ? len : len * 0.55), y)
    ctx.stroke()
  }
}

export function metalFill(ctx: Ctx2D, x0: number, x1: number, light = METAL, dark = METAL_DARK) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  g.addColorStop(0, dark)
  g.addColorStop(0.35, light)
  g.addColorStop(0.6, '#e4e8ef')
  g.addColorStop(1, dark)
  return g
}

export function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Text that fits inside `maxWidth`, centred at (x, y). */
export function label(ctx: Ctx2D, text: string, x: number, y: number, size: number, color: string, maxWidth: number, weight = 700) {
  let s = size
  ctx.font = `${weight} ${s}px "Inter Variable", system-ui, sans-serif`
  while (ctx.measureText(text).width > maxWidth && s > 8) {
    s -= 1
    ctx.font = `${weight} ${s}px "Inter Variable", system-ui, sans-serif`
  }
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}
