import { buildCanvasSheet, cachedSheet, type Ctx2D, type FrameSpec } from './canvasSheet'
import { GLASS_STROKE, METAL_DARK, glass, graduations, highlight, metalFill, path, roundRect, symmetric } from './draw'
import type { SpriteSheet } from './spriteLoader'
import { frameTexture } from './spriteLoader'
import type { Localized } from './types'

/**
 * Laboratory equipment catalog. Every item is original EduLab artwork drawn with the canvas API
 * (see draw.ts), packed into one sprite sheet the first time a scene asks for it.
 */

export type EquipmentType = 'container' | 'heater' | 'tool' | 'glass'

export const EQUIPMENT_IDS = [
  'beaker',
  'conical-flask-100',
  'conical-flask-250',
  'test-tube',
  'big-test-tube',
  'round-bottom-flask',
  'florence-flask',
  'distilling-flask',
  'evaporating-dish',
  'crucible',
  'funnel',
  'measuring-cylinder-10',
  'measuring-cylinder-50',
  'measuring-cylinder-100',
  'volumetric-flask-50',
  'volumetric-flask-100',
  'volumetric-flask-250',
  'separating-funnel',
  'watch-glass',
  'spot-plate',
  'mortar-and-pestle',
  'tripod',
  'wire-gauze',
  'alcohol-lamp',
  'bunsen-burner',
  'thermometer',
  'dropper',
  'burette',
  'u-tube',
  'gas-jar',
  'battery',
  'nichrome-wire',
] as const

export type EquipmentId = (typeof EQUIPMENT_IDS)[number]

export interface Equipment {
  id: EquipmentId
  name: Localized
  type: EquipmentType
  /** Drawing size in px (also the frame size in the sheet). */
  px: { w: number; h: number }
  /** Height in scene units when rendered with <ChemEquipment>. */
  scale: number
  /** Nominal capacity in mL, for vessels. */
  capacity?: number
  draw: (ctx: Ctx2D, w: number, h: number) => void
}

// ---------------------------------------------------------------------------------------------
// Drawings

const beaker = (ctx: Ctx2D, w: number, h: number) => {
  glass(ctx, w, h, [[0.12, 0.06], [0.2, 0.1], [0.2, 0.92], [0.26, 0.97], [0.74, 0.97], [0.8, 0.92], [0.8, 0.06]], { close: false })
  graduations(ctx, w * 0.25, h * 0.3, h * 0.85, 10, 5, w * 0.1)
  highlight(ctx, w * 0.68, h * 0.15, h * 0.85, w * 0.04)
}

const conical = (neck: number) => (ctx: Ctx2D, w: number, h: number) => {
  const n = neck
  glass(ctx, w, h, symmetric([[0.5 - n, 0.03], [0.5 - n, 0.3], [0.08, 0.92], [0.14, 0.97]]))
  graduations(ctx, w * 0.32, h * 0.55, h * 0.85, 6, 3, w * 0.08)
  highlight(ctx, w * 0.6, h * 0.4, h * 0.88, w * 0.035)
}

const testTube = (ctx: Ctx2D, w: number, h: number) => {
  ctx.beginPath()
  ctx.moveTo(w * 0.15, h * 0.03)
  ctx.lineTo(w * 0.15, h * 0.85)
  ctx.arc(w * 0.5, h * 0.85, w * 0.35, Math.PI, 0, true)
  ctx.lineTo(w * 0.85, h * 0.03)
  ctx.fillStyle = 'rgba(210,230,255,0.16)'
  ctx.fill()
  ctx.lineWidth = Math.max(2, w * 0.07)
  ctx.strokeStyle = GLASS_STROKE
  ctx.stroke()
  highlight(ctx, w * 0.62, h * 0.1, h * 0.8, w * 0.1)
}

const roundFlask = (neckLen: number, flatBottom: boolean) => (ctx: Ctx2D, w: number, h: number) => {
  const cx = w / 2
  const r = w * 0.42
  const cy = h - r - h * 0.03
  const nw = w * 0.11
  ctx.beginPath()
  ctx.moveTo(cx - nw, h * 0.03)
  ctx.lineTo(cx - nw, cy - r * 0.92 + h * 0.02 - (1 - neckLen) * 0)
  const a0 = Math.asin(nw / r)
  ctx.arc(cx, cy, r, -Math.PI / 2 - a0, -Math.PI / 2 + a0, true)
  ctx.lineTo(cx + nw, h * 0.03)
  ctx.fillStyle = 'rgba(210,230,255,0.16)'
  ctx.fill()
  ctx.lineWidth = Math.max(2, w * 0.025)
  ctx.strokeStyle = GLASS_STROKE
  ctx.stroke()
  if (flatBottom) {
    ctx.beginPath()
    ctx.moveTo(cx - r * 0.45, cy + r * 0.9)
    ctx.lineTo(cx + r * 0.45, cy + r * 0.9)
    ctx.stroke()
  }
  highlight(ctx, cx + r * 0.45, cy - r * 0.5, cy + r * 0.5, w * 0.035)
}

const distillingFlask = (ctx: Ctx2D, w: number, h: number) => {
  roundFlask(1, false)(ctx, w * 0.8, h)
  ctx.strokeStyle = GLASS_STROKE
  ctx.lineWidth = 3
  path(ctx, w, h, [[0.47, 0.2], [0.98, 0.42]])
  ctx.stroke()
}

const evaporatingDish = (ctx: Ctx2D, w: number, h: number) => {
  ctx.beginPath()
  ctx.moveTo(w * 0.04, h * 0.2)
  ctx.quadraticCurveTo(w * 0.1, h * 0.95, w * 0.5, h * 0.92)
  ctx.quadraticCurveTo(w * 0.9, h * 0.95, w * 0.96, h * 0.2)
  ctx.closePath()
  ctx.fillStyle = '#eef0f3'
  ctx.fill()
  ctx.strokeStyle = '#b9bfca'
  ctx.lineWidth = 3
  ctx.stroke()
}

const crucible = (ctx: Ctx2D, w: number, h: number) => {
  path(ctx, w, h, [[0.08, 0.12], [0.22, 0.95], [0.78, 0.95], [0.92, 0.12]], { close: true })
  ctx.fillStyle = '#f2ece2'
  ctx.fill()
  ctx.strokeStyle = '#bdb3a2'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = '#ddd3c2'
  roundRect(ctx, w * 0.02, h * 0.04, w * 0.96, h * 0.1, 4)
  ctx.fill()
}

const funnel = (ctx: Ctx2D, w: number, h: number) => {
  glass(ctx, w, h, symmetric([[0.04, 0.03], [0.44, 0.52], [0.44, 0.97]]), { close: false })
}

const cylinder = (ctx: Ctx2D, w: number, h: number) => {
  glass(ctx, w, h, [[0.18, 0.02], [0.26, 0.05], [0.26, 0.9], [0.74, 0.9], [0.74, 0.04]], { close: false })
  ctx.fillStyle = 'rgba(205,225,255,0.5)'
  path(ctx, w, h, [[0.06, 0.9], [0.94, 0.9], [0.94, 0.97], [0.06, 0.97]], { close: true })
  ctx.fill()
  graduations(ctx, w * 0.27, h * 0.1, h * 0.86, 20, 5, w * 0.15)
  highlight(ctx, w * 0.62, h * 0.08, h * 0.86, w * 0.06)
}

const volumetric = (ctx: Ctx2D, w: number, h: number) => {
  const cx = w / 2
  const r = w * 0.4
  const cy = h - r * 0.9 - h * 0.02
  const nw = w * 0.07
  ctx.beginPath()
  ctx.moveTo(cx - nw, h * 0.02)
  ctx.lineTo(cx - nw, cy - r * 0.9)
  ctx.bezierCurveTo(cx - r * 1.2, cy - r * 0.6, cx - r * 1.15, cy + r * 0.9, cx - r * 0.6, cy + r * 0.9)
  ctx.lineTo(cx + r * 0.6, cy + r * 0.9)
  ctx.bezierCurveTo(cx + r * 1.15, cy + r * 0.9, cx + r * 1.2, cy - r * 0.6, cx + nw, cy - r * 0.9)
  ctx.lineTo(cx + nw, h * 0.02)
  ctx.fillStyle = 'rgba(210,230,255,0.16)'
  ctx.fill()
  ctx.lineWidth = Math.max(2, w * 0.025)
  ctx.strokeStyle = GLASS_STROKE
  ctx.stroke()
  // calibration ring
  ctx.beginPath()
  ctx.moveTo(cx - nw, h * 0.25)
  ctx.lineTo(cx + nw, h * 0.25)
  ctx.stroke()
}

const separatingFunnel = (ctx: Ctx2D, w: number, h: number) => {
  glass(ctx, w, h, symmetric([[0.44, 0.02], [0.44, 0.08], [0.1, 0.45], [0.45, 0.68], [0.47, 0.98]]), { smooth: true })
  ctx.fillStyle = METAL_DARK
  ctx.fillRect(w * 0.3, h * 0.72, w * 0.4, h * 0.04)
}

const watchGlass = (ctx: Ctx2D, w: number, h: number) => {
  ctx.beginPath()
  ctx.moveTo(w * 0.02, h * 0.15)
  ctx.quadraticCurveTo(w * 0.5, h * 1.4, w * 0.98, h * 0.15)
  ctx.fillStyle = 'rgba(210,230,255,0.25)'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = GLASS_STROKE
  ctx.stroke()
}

const spotPlate = (ctx: Ctx2D, w: number, h: number) => {
  ctx.fillStyle = '#f5f6f8'
  roundRect(ctx, w * 0.02, h * 0.1, w * 0.96, h * 0.8, 12)
  ctx.fill()
  ctx.strokeStyle = '#c3c8d2'
  ctx.lineWidth = 2
  ctx.stroke()
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 4; c++) {
      ctx.beginPath()
      ctx.ellipse(w * (0.16 + c * 0.227), h * (0.33 + r * 0.36), w * 0.08, h * 0.12, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#e3e6eb'
      ctx.fill()
    }
}

const mortar = (ctx: Ctx2D, w: number, h: number) => {
  ctx.save()
  ctx.translate(w * 0.62, h * 0.05)
  ctx.rotate(0.45)
  ctx.fillStyle = '#e9e4da'
  roundRect(ctx, 0, 0, w * 0.12, h * 0.6, w * 0.06)
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.moveTo(w * 0.05, h * 0.42)
  ctx.quadraticCurveTo(w * 0.1, h * 0.95, w * 0.5, h * 0.95)
  ctx.quadraticCurveTo(w * 0.9, h * 0.95, w * 0.95, h * 0.42)
  ctx.closePath()
  ctx.fillStyle = '#f2eee6'
  ctx.fill()
  ctx.strokeStyle = '#c4bba9'
  ctx.lineWidth = 3
  ctx.stroke()
}

const tripod = (ctx: Ctx2D, w: number, h: number) => {
  ctx.strokeStyle = METAL_DARK
  ctx.lineWidth = w * 0.035
  ctx.lineCap = 'round'
  path(ctx, w, h, [[0.12, 0.98], [0.2, 0.1]])
  ctx.stroke()
  path(ctx, w, h, [[0.88, 0.98], [0.8, 0.1]])
  ctx.stroke()
  path(ctx, w, h, [[0.5, 0.9], [0.5, 0.1]])
  ctx.stroke()
  ctx.lineWidth = w * 0.05
  path(ctx, w, h, [[0.1, 0.08], [0.9, 0.08]])
  ctx.stroke()
}

const wireGauze = (ctx: Ctx2D, w: number, h: number) => {
  ctx.fillStyle = '#7d8494'
  ctx.fillRect(0, h * 0.3, w, h * 0.4)
  ctx.fillStyle = '#e6e7ea'
  ctx.beginPath()
  ctx.ellipse(w / 2, h / 2, w * 0.25, h * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(30,34,44,0.5)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 6) {
    ctx.beginPath()
    ctx.moveTo(x, h * 0.3)
    ctx.lineTo(x, h * 0.7)
    ctx.stroke()
  }
}

const alcoholLamp = (ctx: Ctx2D, w: number, h: number) => {
  glass(ctx, w, h, [[0.35, 0.35], [0.12, 0.55], [0.08, 0.8], [0.15, 0.97], [0.85, 0.97], [0.92, 0.8], [0.88, 0.55], [0.65, 0.35]], { smooth: true })
  ctx.fillStyle = 'rgba(180, 210, 255, 0.35)'
  ctx.fillRect(w * 0.15, h * 0.7, w * 0.7, h * 0.25)
  ctx.fillStyle = metalFill(ctx, w * 0.36, w * 0.64)
  ctx.fillRect(w * 0.36, h * 0.25, w * 0.28, h * 0.12)
  ctx.fillStyle = '#f2ead8'
  ctx.fillRect(w * 0.46, h * 0.12, w * 0.08, h * 0.14)
}

const bunsenBurner = (ctx: Ctx2D, w: number, h: number) => {
  ctx.fillStyle = metalFill(ctx, w * 0.38, w * 0.62)
  ctx.fillRect(w * 0.4, h * 0.05, w * 0.2, h * 0.8)
  ctx.fillStyle = metalFill(ctx, w * 0.34, w * 0.66, '#8d95a6')
  ctx.fillRect(w * 0.35, h * 0.6, w * 0.3, h * 0.12)
  ctx.fillStyle = '#2d3342'
  ctx.fillRect(w * 0.45, h * 0.63, w * 0.1, h * 0.06)
  ctx.fillStyle = metalFill(ctx, w * 0.05, w * 0.95, '#6c7385')
  roundRect(ctx, w * 0.05, h * 0.86, w * 0.9, h * 0.12, 6)
  ctx.fill()
  ctx.fillStyle = '#c4473a'
  ctx.fillRect(w * 0.62, h * 0.78, w * 0.36, h * 0.05)
}

const thermometer = (ctx: Ctx2D, w: number, h: number) => {
  ctx.fillStyle = 'rgba(230,240,255,0.5)'
  roundRect(ctx, w * 0.3, h * 0.01, w * 0.4, h * 0.9, w * 0.2)
  ctx.fill()
  ctx.strokeStyle = GLASS_STROKE
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#d6332a'
  ctx.beginPath()
  ctx.arc(w / 2, h * 0.92, w * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(w * 0.45, h * 0.45, w * 0.1, h * 0.45)
  graduations(ctx, w * 0.3, h * 0.06, h * 0.82, 20, 5, w * 0.18)
}

const dropper = (ctx: Ctx2D, w: number, h: number) => {
  ctx.fillStyle = '#d0453b'
  roundRect(ctx, w * 0.2, h * 0.01, w * 0.6, h * 0.3, w * 0.3)
  ctx.fill()
  ctx.fillStyle = '#9f2f27'
  ctx.fillRect(w * 0.2, h * 0.26, w * 0.6, h * 0.05)
  glass(ctx, w, h, [[0.3, 0.31], [0.3, 0.75], [0.46, 0.99], [0.54, 0.99], [0.7, 0.75], [0.7, 0.31]], { close: false })
}

const burette = (ctx: Ctx2D, w: number, h: number) => {
  glass(ctx, w, h, [[0.3, 0.01], [0.3, 0.84], [0.7, 0.84], [0.7, 0.01]], { close: false })
  graduations(ctx, w * 0.3, h * 0.04, h * 0.8, 50, 10, w * 0.25)
  ctx.fillStyle = '#2f3a52'
  ctx.fillRect(w * 0.1, h * 0.85, w * 0.8, h * 0.04)
  ctx.fillStyle = '#3b5bdb'
  ctx.fillRect(w * 0.75, h * 0.83, w * 0.22, h * 0.08)
  glass(ctx, w, h, [[0.4, 0.89], [0.47, 0.99], [0.53, 0.99], [0.6, 0.89]], { close: false })
}

const uTube = (ctx: Ctx2D, w: number, h: number) => {
  const lw = Math.max(3, w * 0.03)
  ctx.lineWidth = lw
  ctx.strokeStyle = GLASS_STROKE
  for (const off of [0, 0.18]) {
    ctx.beginPath()
    ctx.moveTo(w * (0.1 + off * 0.5), h * 0.02)
    ctx.lineTo(w * (0.1 + off * 0.5), h * 0.7)
    ctx.arc(w * 0.5, h * 0.7, w * (0.4 - off * 0.5), Math.PI, 0, true)
    ctx.lineTo(w * (0.9 - off * 0.5), h * 0.02)
    ctx.stroke()
  }
}

const gasJar = (ctx: Ctx2D, w: number, h: number) => {
  glass(ctx, w, h, [[0.12, 0.06], [0.12, 0.95], [0.88, 0.95], [0.88, 0.06]], { close: false })
  ctx.fillStyle = 'rgba(205,225,255,0.55)'
  ctx.fillRect(w * 0.04, h * 0.02, w * 0.92, h * 0.05)
  highlight(ctx, w * 0.7, h * 0.1, h * 0.9, w * 0.05)
}

const battery = (ctx: Ctx2D, w: number, h: number) => {
  ctx.fillStyle = '#2f3644'
  roundRect(ctx, w * 0.04, h * 0.25, w * 0.92, h * 0.7, 10)
  ctx.fill()
  ctx.fillStyle = '#f2c94c'
  ctx.fillRect(w * 0.04, h * 0.25, w * 0.92, h * 0.16)
  ctx.fillStyle = '#d6332a'
  ctx.fillRect(w * 0.15, h * 0.08, w * 0.14, h * 0.17)
  ctx.fillStyle = '#1f2430'
  ctx.fillRect(w * 0.71, h * 0.08, w * 0.14, h * 0.17)
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${h * 0.2}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('+', w * 0.22, h * 0.6)
  ctx.fillText('−', w * 0.78, h * 0.6)
}

const nichromeWire = (ctx: Ctx2D, w: number, h: number) => {
  ctx.fillStyle = '#6b4b2a'
  roundRect(ctx, w * 0.38, h * 0.55, w * 0.24, h * 0.44, 6)
  ctx.fill()
  ctx.strokeStyle = '#c9ced6'
  ctx.lineWidth = Math.max(2, w * 0.05)
  path(ctx, w, h, [[0.5, 0.56], [0.5, 0.14]])
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(w / 2, h * 0.08, w * 0.14, 0, Math.PI * 2)
  ctx.stroke()
}

// ---------------------------------------------------------------------------------------------

const E = (
  id: EquipmentId,
  type: EquipmentType,
  name: Localized,
  w: number,
  h: number,
  scale: number,
  draw: Equipment['draw'],
  capacity?: number,
): Equipment => ({ id, type, name, px: { w, h }, scale, draw, capacity })

export const EQUIPMENT: Record<EquipmentId, Equipment> = {
  beaker: E('beaker', 'container', { en: 'Beaker', uz: 'Kimyoviy stakan', ru: 'Химический стакан' }, 200, 230, 0.9, beaker, 250),
  'conical-flask-100': E('conical-flask-100', 'container', { en: 'Conical flask, 100 mL', uz: 'Konussimon kolba, 100 mL', ru: 'Коническая колба, 100 мл' }, 150, 200, 0.75, conical(0.1), 100),
  'conical-flask-250': E('conical-flask-250', 'container', { en: 'Conical flask, 250 mL', uz: 'Konussimon kolba, 250 mL', ru: 'Коническая колба, 250 мл' }, 190, 250, 1, conical(0.09), 250),
  'test-tube': E('test-tube', 'container', { en: 'Test tube', uz: 'Probirka', ru: 'Пробирка' }, 60, 260, 0.8, testTube, 20),
  'big-test-tube': E('big-test-tube', 'container', { en: 'Boiling tube', uz: 'Katta probirka', ru: 'Большая пробирка' }, 80, 300, 1, testTube, 40),
  'round-bottom-flask': E('round-bottom-flask', 'container', { en: 'Round-bottom flask', uz: 'Yumaloq tubli kolba', ru: 'Круглодонная колба' }, 200, 260, 1, roundFlask(1, false), 250),
  'florence-flask': E('florence-flask', 'container', { en: 'Florence flask', uz: 'Yassi tubli kolba', ru: 'Плоскодонная колба' }, 200, 260, 1, roundFlask(1, true), 250),
  'distilling-flask': E('distilling-flask', 'container', { en: 'Distilling flask', uz: 'Haydash kolbasi', ru: 'Колба Вюрца' }, 250, 260, 1, distillingFlask, 250),
  'evaporating-dish': E('evaporating-dish', 'container', { en: 'Evaporating dish', uz: 'Bugʻlatish kosachasi', ru: 'Выпарительная чашка' }, 220, 90, 0.35, evaporatingDish, 100),
  crucible: E('crucible', 'container', { en: 'Crucible', uz: 'Tigel', ru: 'Тигель' }, 120, 120, 0.35, crucible, 30),
  funnel: E('funnel', 'glass', { en: 'Funnel', uz: 'Voronka', ru: 'Воронка' }, 160, 200, 0.6, funnel),
  'measuring-cylinder-10': E('measuring-cylinder-10', 'glass', { en: 'Measuring cylinder, 10 mL', uz: 'Oʻlchov silindri, 10 mL', ru: 'Мерный цилиндр, 10 мл' }, 70, 260, 0.7, cylinder, 10),
  'measuring-cylinder-50': E('measuring-cylinder-50', 'glass', { en: 'Measuring cylinder, 50 mL', uz: 'Oʻlchov silindri, 50 mL', ru: 'Мерный цилиндр, 50 мл' }, 80, 320, 1, cylinder, 50),
  'measuring-cylinder-100': E('measuring-cylinder-100', 'glass', { en: 'Measuring cylinder, 100 mL', uz: 'Oʻlchov silindri, 100 mL', ru: 'Мерный цилиндр, 100 мл' }, 90, 380, 1.25, cylinder, 100),
  'volumetric-flask-50': E('volumetric-flask-50', 'glass', { en: 'Volumetric flask, 50 mL', uz: 'Oʻlchov kolbasi, 50 mL', ru: 'Мерная колба, 50 мл' }, 120, 240, 0.8, volumetric, 50),
  'volumetric-flask-100': E('volumetric-flask-100', 'glass', { en: 'Volumetric flask, 100 mL', uz: 'Oʻlchov kolbasi, 100 mL', ru: 'Мерная колба, 100 мл' }, 140, 280, 0.95, volumetric, 100),
  'volumetric-flask-250': E('volumetric-flask-250', 'glass', { en: 'Volumetric flask, 250 mL', uz: 'Oʻlchov kolbasi, 250 mL', ru: 'Мерная колба, 250 мл' }, 170, 320, 1.15, volumetric, 250),
  'separating-funnel': E('separating-funnel', 'glass', { en: 'Separating funnel', uz: 'Ajratish voronkasi', ru: 'Делительная воронка' }, 150, 320, 1.1, separatingFunnel, 250),
  'watch-glass': E('watch-glass', 'glass', { en: 'Watch glass', uz: 'Soat oynasi', ru: 'Часовое стекло' }, 200, 60, 0.25, watchGlass),
  'spot-plate': E('spot-plate', 'tool', { en: 'Spot plate', uz: 'Tomchi plastinkasi', ru: 'Капельная пластинка' }, 240, 110, 0.35, spotPlate),
  'mortar-and-pestle': E('mortar-and-pestle', 'tool', { en: 'Mortar and pestle', uz: 'Hovoncha va dasta', ru: 'Ступка с пестиком' }, 200, 170, 0.55, mortar),
  tripod: E('tripod', 'heater', { en: 'Tripod', uz: 'Uchoyoq', ru: 'Треножник' }, 200, 220, 0.75, tripod),
  'wire-gauze': E('wire-gauze', 'heater', { en: 'Wire gauze', uz: 'Metall toʻr', ru: 'Металлическая сетка' }, 220, 60, 0.2, wireGauze),
  'alcohol-lamp': E('alcohol-lamp', 'heater', { en: 'Spirit lamp', uz: 'Spirt lampasi', ru: 'Спиртовка' }, 170, 200, 0.6, alcoholLamp),
  'bunsen-burner': E('bunsen-burner', 'heater', { en: 'Bunsen burner', uz: 'Bunzen gorelkasi', ru: 'Горелка Бунзена' }, 140, 280, 0.9, bunsenBurner),
  thermometer: E('thermometer', 'tool', { en: 'Thermometer', uz: 'Termometr', ru: 'Термометр' }, 40, 360, 1, thermometer),
  dropper: E('dropper', 'tool', { en: 'Dropper', uz: 'Tomizgich', ru: 'Пипетка-капельница' }, 50, 220, 0.5, dropper),
  burette: E('burette', 'glass', { en: 'Burette', uz: 'Byuretka', ru: 'Бюретка' }, 60, 480, 2.2, burette, 50),
  'u-tube': E('u-tube', 'glass', { en: 'U-tube', uz: 'U-simon nay', ru: 'U-образная трубка' }, 200, 260, 1, uTube),
  'gas-jar': E('gas-jar', 'container', { en: 'Gas jar', uz: 'Gaz yigʻish idishi', ru: 'Газосборник' }, 140, 260, 0.9, gasJar, 250),
  battery: E('battery', 'tool', { en: 'DC power supply', uz: 'Oʻzgarmas tok manbai', ru: 'Источник постоянного тока' }, 200, 150, 0.6, battery),
  'nichrome-wire': E('nichrome-wire', 'tool', { en: 'Nichrome wire loop', uz: 'Nixrom sim halqa', ru: 'Нихромовая петля' }, 60, 240, 0.7, nichromeWire),
}

export const equipmentFrames = (): FrameSpec[] => EQUIPMENT_IDS.map((id) => ({ name: id, ...EQUIPMENT[id].px, draw: EQUIPMENT[id].draw }))

/** The equipment sprite sheet, drawn on first use. Browser only. */
export const equipmentSheet = (): SpriteSheet => cachedSheet('equipment', () => buildCanvasSheet(equipmentFrames()))

/** A texture showing one piece of equipment. */
export const getEquipmentTexture = (id: EquipmentId) => frameTexture(equipmentSheet(), id)

export const equipmentByType = (type: EquipmentType) => EQUIPMENT_IDS.filter((id) => EQUIPMENT[id].type === type).map((id) => EQUIPMENT[id])
