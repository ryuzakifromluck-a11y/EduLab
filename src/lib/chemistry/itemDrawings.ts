import type { Ctx2D } from './canvasSheet'
import { GLASS_FILL, GLASS_STROKE, METAL_DARK, glass, highlight, label, metalFill, path, roundRect, symmetric } from './draw'

/**
 * Extra drawings for the Chemistry items catalog (reagent bottles, gas jars, small tools).
 * Like the rest of EduLab's chemistry artwork they are original, drawn with the canvas API in the
 * 0–1 frame units used by draw.ts, so they read well on the dark workbench.
 */

type Draw = (ctx: Ctx2D, w: number, h: number) => void

export interface BottleSpec {
  /** Liquid or solid colour; omit for an empty bottle. */
  fill?: string
  /** Fill height as a fraction of the body (0–1). */
  level?: number
  /** Amber glass for light-sensitive reagents. */
  amber?: boolean
  /** Dropping bottle (rubber teat) instead of a stoppered reagent bottle. */
  dropper?: boolean
  /** Wide neck (for solids) instead of a narrow one. */
  wide?: boolean
  /** Text on the paper label. */
  text?: string
}

/** Reagent bottle with a shoulder, a neck, a stopper or dropper and an optional paper label. */
export const reagentBottle =
  ({ fill, level = 0.62, amber = false, dropper = false, wide = false, text }: BottleSpec): Draw =>
  (ctx, w, h) => {
    const neck = wide ? 0.3 : 0.17
    const top = dropper ? 0.3 : 0.2
    const body = symmetric([
      [0.5 - neck, top],
      [0.5 - neck, top + 0.1],
      [0.12, top + 0.2],
      [0.12, 0.95],
    ])
    // glass body
    path(ctx, w, h, body, { close: true, smooth: false })
    ctx.fillStyle = amber ? 'rgba(150, 82, 24, 0.55)' : GLASS_FILL
    ctx.fill()
    if (fill) {
      ctx.save()
      path(ctx, w, h, body, { close: true })
      ctx.clip()
      const y = h * (0.95 - (0.95 - top - 0.22) * level)
      ctx.fillStyle = fill
      ctx.globalAlpha = amber ? 0.75 : 0.85
      ctx.fillRect(0, y, w, h)
      ctx.globalAlpha = 1
      ctx.restore()
    }
    path(ctx, w, h, body, { close: true })
    ctx.lineWidth = Math.max(2, w * 0.025)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = amber ? 'rgba(220, 160, 90, 0.95)' : GLASS_STROKE
    ctx.stroke()

    if (dropper) {
      // glass pipette cap and rubber teat
      ctx.fillStyle = '#d9dee6'
      roundRect(ctx, w * (0.5 - neck - 0.03), h * (top - 0.04), w * (neck * 2 + 0.06), h * 0.07, 4)
      ctx.fill()
      ctx.fillStyle = '#c0392b'
      ctx.beginPath()
      ctx.ellipse(w / 2, h * 0.14, w * 0.11, h * 0.12, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.ellipse(w * 0.46, h * 0.1, w * 0.03, h * 0.05, 0, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // ground-glass stopper
      ctx.fillStyle = amber ? 'rgba(170, 100, 40, 0.9)' : 'rgba(225, 235, 250, 0.85)'
      roundRect(ctx, w * (0.5 - neck - 0.04), h * (top - 0.06), w * (neck * 2 + 0.08), h * 0.07, 5)
      ctx.fill()
      roundRect(ctx, w * (0.5 - neck * 0.6), h * (top - 0.13), w * neck * 1.2, h * 0.08, 6)
      ctx.fill()
    }

    if (text) {
      const lw = w * 0.62
      const lh = h * 0.2
      const ly = h * 0.58
      ctx.fillStyle = '#f7f4ea'
      roundRect(ctx, (w - lw) / 2, ly, lw, lh, 4)
      ctx.fill()
      ctx.strokeStyle = '#4f86c6'
      ctx.lineWidth = 2
      roundRect(ctx, (w - lw) / 2 + 3, ly + 3, lw - 6, lh - 6, 3)
      ctx.stroke()
      label(ctx, text, w / 2, ly + lh / 2, h * 0.09, '#1d2433', lw - 10)
    }
    highlight(ctx, w * 0.74, h * (top + 0.25), h * 0.9, w * 0.04)
  }

/** Gas jar holding a coloured gas, covered with a ground-glass plate. */
export const gasJarWith =
  (tint: string | null, text?: string): Draw =>
  (ctx, w, h) => {
    if (tint) {
      const g = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.95)
      g.addColorStop(0, tint)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(w * 0.14, h * 0.1, w * 0.72, h * 0.84)
    }
    glass(ctx, w, h, [[0.12, 0.08], [0.12, 0.95], [0.88, 0.95], [0.88, 0.08]], { close: false })
    // lip and cover plate
    ctx.fillStyle = 'rgba(205,225,255,0.55)'
    ctx.fillRect(w * 0.08, h * 0.06, w * 0.84, h * 0.03)
    ctx.fillStyle = 'rgba(225,235,250,0.75)'
    ctx.fillRect(w * 0.02, h * 0.02, w * 0.96, h * 0.035)
    highlight(ctx, w * 0.72, h * 0.12, h * 0.9, w * 0.05)
    if (text) {
      const lw = w * 0.5
      const lh = h * 0.13
      ctx.fillStyle = '#f7f4ea'
      roundRect(ctx, (w - lw) / 2, h * 0.55, lw, lh, 4)
      ctx.fill()
      label(ctx, text, w / 2, h * 0.55 + lh / 2, h * 0.08, '#1d2433', lw - 8)
    }
  }

export const pneumaticTrough: Draw = (ctx, w, h) => {
  ctx.fillStyle = 'rgba(120, 180, 255, 0.3)'
  ctx.fillRect(w * 0.06, h * 0.35, w * 0.88, h * 0.57)
  glass(ctx, w, h, [[0.04, 0.12], [0.04, 0.94], [0.96, 0.94], [0.96, 0.12]], { close: false })
  // beehive shelf
  ctx.fillStyle = 'rgba(200, 120, 80, 0.85)'
  roundRect(ctx, w * 0.56, h * 0.58, w * 0.26, h * 0.16, 6)
  ctx.fill()
  highlight(ctx, w * 0.86, h * 0.2, h * 0.88, w * 0.025)
}

export const deliveryTube: Draw = (ctx, w, h) => {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = GLASS_STROKE
  ctx.lineWidth = Math.max(3, w * 0.035)
  ctx.beginPath()
  ctx.moveTo(w * 0.12, h * 0.95)
  ctx.lineTo(w * 0.12, h * 0.25)
  ctx.quadraticCurveTo(w * 0.12, h * 0.08, w * 0.3, h * 0.08)
  ctx.lineTo(w * 0.7, h * 0.08)
  ctx.quadraticCurveTo(w * 0.88, h * 0.08, w * 0.88, h * 0.25)
  ctx.lineTo(w * 0.88, h * 0.7)
  ctx.stroke()
  // rubber bung
  ctx.fillStyle = '#5b5f68'
  ctx.beginPath()
  ctx.moveTo(w * 0.02, h * 0.72)
  ctx.lineTo(w * 0.22, h * 0.72)
  ctx.lineTo(w * 0.19, h * 0.86)
  ctx.lineTo(w * 0.05, h * 0.86)
  ctx.closePath()
  ctx.fill()
}

export const gasSyringe: Draw = (ctx, w, h) => {
  glass(ctx, w, h, [[0.06, 0.3], [0.78, 0.3], [0.78, 0.7], [0.06, 0.7]])
  for (let i = 1; i < 10; i++) {
    ctx.strokeStyle = 'rgba(235,242,255,0.8)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(w * (0.06 + i * 0.07), h * 0.3)
    ctx.lineTo(w * (0.06 + i * 0.07), h * (i % 5 === 0 ? 0.45 : 0.4))
    ctx.stroke()
  }
  // plunger
  ctx.fillStyle = 'rgba(225,235,250,0.7)'
  ctx.fillRect(w * 0.4, h * 0.36, w * 0.5, h * 0.28)
  ctx.fillRect(w * 0.9, h * 0.2, w * 0.06, h * 0.6)
  // nozzle
  ctx.strokeStyle = GLASS_STROKE
  ctx.lineWidth = 3
  path(ctx, w, h, [[0.06, 0.5], [0.0, 0.5]])
  ctx.stroke()
}

export const stopwatch: Draw = (ctx, w, h) => {
  const cx = w / 2
  const cy = h * 0.58
  const r = Math.min(w, h) * 0.4
  ctx.fillStyle = METAL_DARK
  ctx.fillRect(cx - w * 0.06, h * 0.06, w * 0.12, h * 0.1)
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = metalFill(ctx, cx - r, cx + r)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2)
  ctx.fillStyle = '#f4f6f9'
  ctx.fill()
  ctx.strokeStyle = '#2b3240'
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    ctx.lineWidth = i % 3 === 0 ? 3 : 1.5
    ctx.beginPath()
    ctx.moveTo(cx + Math.sin(a) * r * 0.7, cy - Math.cos(a) * r * 0.7)
    ctx.lineTo(cx + Math.sin(a) * r * 0.8, cy - Math.cos(a) * r * 0.8)
    ctx.stroke()
  }
  ctx.strokeStyle = '#d6332a'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + r * 0.5, cy - r * 0.45)
  ctx.stroke()
}

export const spatula: Draw = (ctx, w, h) => {
  ctx.fillStyle = metalFill(ctx, w * 0.4, w * 0.6)
  ctx.fillRect(w * 0.45, h * 0.12, w * 0.1, h * 0.76)
  ctx.beginPath()
  ctx.ellipse(w / 2, h * 0.08, w * 0.22, h * 0.07, 0, 0, Math.PI * 2)
  ctx.fill()
  roundRect(ctx, w * 0.32, h * 0.86, w * 0.36, h * 0.12, 8)
  ctx.fill()
}

export const tongs: Draw = (ctx, w, h) => {
  ctx.strokeStyle = metalFill(ctx, 0, w)
  ctx.lineWidth = Math.max(3, w * 0.06)
  ctx.lineCap = 'round'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(w * (0.5 + s * 0.35), h * 0.97)
    ctx.lineTo(w * (0.5 + s * 0.08), h * 0.45)
    ctx.quadraticCurveTo(w * (0.5 + s * 0.28), h * 0.18, w * (0.5 + s * 0.04), h * 0.04)
    ctx.stroke()
  }
  ctx.fillStyle = METAL_DARK
  ctx.beginPath()
  ctx.arc(w / 2, h * 0.45, w * 0.06, 0, Math.PI * 2)
  ctx.fill()
}

export const tweezers: Draw = (ctx, w, h) => {
  ctx.strokeStyle = metalFill(ctx, 0, w)
  ctx.lineWidth = Math.max(3, w * 0.08)
  ctx.lineCap = 'round'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(w * 0.5, h * 0.04)
    ctx.lineTo(w * (0.5 + s * 0.25), h * 0.55)
    ctx.lineTo(w * (0.5 + s * 0.05), h * 0.97)
    ctx.stroke()
  }
}

export const glassRod: Draw = (ctx, w, h) => {
  ctx.strokeStyle = GLASS_STROKE
  ctx.lineWidth = Math.max(4, w * 0.3)
  ctx.lineCap = 'round'
  path(ctx, w, h, [[0.5, 0.04], [0.5, 0.96]])
  ctx.stroke()
  highlight(ctx, w * 0.55, h * 0.06, h * 0.94, w * 0.12)
}

export const testTubeRack: Draw = (ctx, w, h) => {
  const wood = '#b07a45'
  ctx.fillStyle = wood
  ctx.fillRect(w * 0.04, h * 0.3, w * 0.92, h * 0.1)
  ctx.fillRect(w * 0.04, h * 0.86, w * 0.92, h * 0.1)
  ctx.fillRect(w * 0.04, h * 0.3, w * 0.05, h * 0.66)
  ctx.fillRect(w * 0.91, h * 0.3, w * 0.05, h * 0.66)
  ctx.strokeStyle = GLASS_STROKE
  ctx.lineWidth = Math.max(2, w * 0.012)
  for (let i = 0; i < 5; i++) {
    const x = w * (0.17 + i * 0.165)
    ctx.beginPath()
    ctx.moveTo(x - w * 0.045, h * 0.08)
    ctx.lineTo(x - w * 0.045, h * 0.78)
    ctx.arc(x, h * 0.78, w * 0.045, Math.PI, 0, true)
    ctx.lineTo(x + w * 0.045, h * 0.08)
    ctx.stroke()
  }
  ctx.fillStyle = '#8a5a2e'
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.ellipse(w * (0.17 + i * 0.165), h * 0.35, w * 0.055, h * 0.025, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

export const matches: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#c8a35a'
  roundRect(ctx, w * 0.06, h * 0.35, w * 0.7, h * 0.5, 6)
  ctx.fill()
  ctx.fillStyle = '#d6332a'
  ctx.fillRect(w * 0.1, h * 0.45, w * 0.62, h * 0.18)
  ctx.fillStyle = '#4a3a2a'
  ctx.fillRect(w * 0.06, h * 0.8, w * 0.7, h * 0.05)
  // a match leaning out of the box
  ctx.strokeStyle = '#e8d3a8'
  ctx.lineWidth = Math.max(3, w * 0.025)
  ctx.lineCap = 'round'
  path(ctx, w, h, [[0.55, 0.5], [0.92, 0.18]])
  ctx.stroke()
  ctx.fillStyle = '#9c2a20'
  ctx.beginPath()
  ctx.ellipse(w * 0.93, h * 0.16, w * 0.035, h * 0.05, -0.7, 0, Math.PI * 2)
  ctx.fill()
}

export const retortStand: Draw = (ctx, w, h) => {
  ctx.fillStyle = metalFill(ctx, w * 0.05, w * 0.95)
  roundRect(ctx, w * 0.05, h * 0.9, w * 0.9, h * 0.08, 6)
  ctx.fill()
  ctx.fillStyle = metalFill(ctx, w * 0.25, w * 0.33)
  ctx.fillRect(w * 0.26, h * 0.03, w * 0.06, h * 0.88)
  // boss head and clamp
  ctx.fillStyle = METAL_DARK
  ctx.fillRect(w * 0.22, h * 0.32, w * 0.14, h * 0.07)
  ctx.fillStyle = metalFill(ctx, 0, w)
  ctx.fillRect(w * 0.36, h * 0.34, w * 0.36, h * 0.03)
  ctx.strokeStyle = METAL_DARK
  ctx.lineWidth = Math.max(3, w * 0.03)
  ctx.beginPath()
  ctx.arc(w * 0.78, h * 0.355, w * 0.08, 0, Math.PI * 2)
  ctx.stroke()
}

export const balance: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#e6e9ef'
  roundRect(ctx, w * 0.04, h * 0.45, w * 0.92, h * 0.5, 10)
  ctx.fill()
  ctx.fillStyle = '#1f2633'
  roundRect(ctx, w * 0.2, h * 0.62, w * 0.6, h * 0.2, 6)
  ctx.fill()
  label(ctx, '0.00 g', w / 2, h * 0.72, h * 0.13, '#7ef0a8', w * 0.55)
  // pan
  ctx.fillStyle = metalFill(ctx, w * 0.12, w * 0.88)
  ctx.fillRect(w * 0.45, h * 0.32, w * 0.1, h * 0.14)
  roundRect(ctx, w * 0.12, h * 0.26, w * 0.76, h * 0.07, 6)
  ctx.fill()
}

export const phMeter: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#2f6fdb'
  roundRect(ctx, w * 0.2, h * 0.03, w * 0.6, h * 0.42, 12)
  ctx.fill()
  ctx.fillStyle = '#d9f0e0'
  roundRect(ctx, w * 0.28, h * 0.09, w * 0.44, h * 0.16, 5)
  ctx.fill()
  label(ctx, '7.00', w / 2, h * 0.17, h * 0.1, '#1d2433', w * 0.4)
  ctx.fillStyle = '#d9dee6'
  ctx.fillRect(w * 0.44, h * 0.45, w * 0.12, h * 0.42)
  ctx.strokeStyle = GLASS_STROKE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(w / 2, h * 0.9, w * 0.07, 0, Math.PI * 2)
  ctx.stroke()
}
