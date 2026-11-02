import { buildCanvasSheet, cachedSheet, mulberry32, type Ctx2D } from './canvasSheet'
import type { SoundId } from './soundSynth'
import { framesByPrefix, type SpriteFrame, type SpriteSheet } from './spriteLoader'
import type { Localized } from './types'

/**
 * Reaction animations (flames, smoke, bubbles, precipitate, explosions…) drawn frame by frame
 * with the canvas API. Each effect gets its own small sprite sheet, built the first time it is
 * shown. Effects meant to be tinted (smoke, vapour, bubbles, clouds) are drawn in white.
 */

export type ReactionKind = 'fire' | 'smoke' | 'bubble' | 'precipitate' | 'explode' | 'vapor' | 'spark' | 'cloud'

export const EFFECT_IDS = [
  'fire',
  'sodium-fire',
  'potassium-fire',
  'spirit-fire-blue',
  'candle-fire',
  'bunsen-inner',
  'smoke',
  'vapor',
  'bubble',
  'electrolytic-bubble',
  'precipitate',
  'explode',
  'spark',
  'cloud',
] as const

export type EffectId = (typeof EFFECT_IDS)[number]

export interface ReactionEffectDef {
  id: EffectId
  kind: ReactionKind
  name: Localized
  frameCount: number
  /** Frame size in px. */
  px: { w: number; h: number }
  fps: number
  loop: boolean
  /** Seconds for one pass. */
  duration: number
  /** Light-emitting effects use additive blending. */
  additive: boolean
  sound: SoundId | null
  draw: (ctx: Ctx2D, w: number, h: number, frame: number, frames: number) => void
}

// ---------------------------------------------------------------------------------------------
// Drawings

type FlameColors = { core: string; mid: string; edge: string }

/** Several flickering tongues; the phase loops exactly over `frames`. */
const flame = (c: FlameColors, tongues = 5, seed = 1) => (ctx: Ctx2D, w: number, h: number, f: number, frames: number) => {
  const rand = mulberry32(seed)
  const phase = (f / frames) * Math.PI * 2
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < tongues; i++) {
    const p0 = rand() * Math.PI * 2
    const k = 1 + Math.floor(rand() * 2)
    const sway = Math.sin(phase * k + p0) * w * 0.06
    const height = h * (0.62 + 0.25 * Math.sin(phase * k + p0 * 1.7) * 0.5 + rand() * 0.2)
    const width = w * (0.22 + rand() * 0.1)
    const cx = w / 2 + (rand() - 0.5) * w * 0.18
    const base = h * 0.95
    const g = ctx.createRadialGradient(cx, base - height * 0.25, 1, cx, base - height * 0.35, height * 0.75)
    g.addColorStop(0, c.core)
    g.addColorStop(0.35, c.mid)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(cx - width, base)
    ctx.quadraticCurveTo(cx - width * 1.1, base - height * 0.5, cx + sway, base - height)
    ctx.quadraticCurveTo(cx + width * 1.1, base - height * 0.5, cx + width, base)
    ctx.closePath()
    ctx.fill()
  }
  // soft glow at the base
  const glow = ctx.createRadialGradient(w / 2, h * 0.88, 2, w / 2, h * 0.88, w * 0.45)
  glow.addColorStop(0, c.edge)
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
}

/** Puffs that rise, grow and fade; positions wrap so the loop is seamless. */
const puffs = (count: number, alpha: number, seed: number) => (ctx: Ctx2D, w: number, h: number, f: number, frames: number) => {
  const rand = mulberry32(seed)
  for (let i = 0; i < count; i++) {
    const offset = rand()
    const x0 = w * (0.35 + rand() * 0.3)
    const drift = (rand() - 0.5) * w * 0.4
    const life = (f / frames + offset) % 1
    const y = h * (0.95 - life * 0.85)
    const r = w * (0.08 + life * 0.25)
    const a = alpha * Math.sin(Math.PI * life)
    const g = ctx.createRadialGradient(x0 + drift * life, y, 0, x0 + drift * life, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x0 + drift * life, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

const bubbles = (count: number, rMin: number, rMax: number, seed: number) => (ctx: Ctx2D, w: number, h: number, f: number, frames: number) => {
  const rand = mulberry32(seed)
  for (let i = 0; i < count; i++) {
    const offset = rand()
    const x = w * (0.15 + rand() * 0.7)
    const r = rMin + rand() * (rMax - rMin)
    const life = (f / frames + offset) % 1
    const y = h - life * (h + 2 * r) + r
    const wobble = Math.sin((life * 6 + offset * 10) * Math.PI) * r * 0.6
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = Math.max(1, r * 0.25)
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.beginPath()
    ctx.arc(x + wobble, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.arc(x + wobble - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2)
    ctx.fill()
  }
}

const precipitate = (ctx: Ctx2D, w: number, h: number, f: number, frames: number) => {
  const rand = mulberry32(42)
  const t = f / (frames - 1)
  for (let i = 0; i < 90; i++) {
    const x = w * (0.08 + rand() * 0.84)
    const start = rand() * 0.5
    const speed = 0.6 + rand() * 0.6
    const k = Math.max(0, Math.min(1, (t - start * 0.5) * speed * 1.6))
    const settle = h * (0.88 + rand() * 0.1)
    const y = h * 0.05 + (settle - h * 0.05) * k
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.55 * k})`
    ctx.beginPath()
    ctx.arc(x, y, 1.5 + rand() * 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // the settled layer grows
  ctx.fillStyle = `rgba(255,255,255,${0.8 * t})`
  ctx.fillRect(w * 0.06, h * (0.97 - 0.07 * t), w * 0.88, h * 0.07 * t + 1)
}

const explode = (ctx: Ctx2D, w: number, h: number, f: number, frames: number) => {
  const t = f / (frames - 1)
  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w, h) * 0.48
  const flash = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * (0.3 + 0.7 * t))
  const a = 1 - t
  flash.addColorStop(0, `rgba(255,255,240,${a})`)
  flash.addColorStop(0.3, `rgba(255,200,80,${a * 0.9})`)
  flash.addColorStop(0.7, `rgba(255,90,20,${a * 0.6})`)
  flash.addColorStop(1, 'rgba(255,60,0,0)')
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = flash
  ctx.fillRect(0, 0, w, h)
  const rand = mulberry32(9)
  ctx.strokeStyle = `rgba(255,220,140,${a})`
  ctx.lineWidth = 2
  for (let i = 0; i < 22; i++) {
    const ang = rand() * Math.PI * 2
    const r0 = R * t * (0.4 + rand() * 0.4)
    const r1 = r0 + R * 0.15 * (1 - t)
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0)
    ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

const sparks = (ctx: Ctx2D, w: number, h: number, f: number, frames: number) => {
  const rand = mulberry32(5)
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 26; i++) {
    const ang = -Math.PI / 2 + (rand() - 0.5) * 2.4
    const speed = 0.5 + rand() * 0.5
    const life = (f / frames + rand()) % 1
    const r = life * speed * Math.min(w, h) * 0.5
    const x = w / 2 + Math.cos(ang) * r
    const y = h * 0.7 + Math.sin(ang) * r + life * life * h * 0.25
    const a = 1 - life
    ctx.strokeStyle = `rgba(255,${180 + Math.floor(rand() * 60)},90,${a})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

/** A soft cloud that spreads and fades (a drop of indicator or titrant mixing in). */
const cloud = (ctx: Ctx2D, w: number, h: number, f: number, frames: number) => {
  const t = f / (frames - 1)
  const rand = mulberry32(3)
  for (let i = 0; i < 7; i++) {
    const x = w / 2 + (rand() - 0.5) * w * 0.5 * t
    const y = h * 0.35 + rand() * h * 0.4 * t
    const r = w * (0.12 + 0.3 * t) * (0.6 + rand() * 0.4)
    const a = 0.75 * (1 - t)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}

// ---------------------------------------------------------------------------------------------

const FX = (
  id: EffectId,
  kind: ReactionKind,
  name: Localized,
  frameCount: number,
  w: number,
  h: number,
  fps: number,
  loop: boolean,
  additive: boolean,
  sound: SoundId | null,
  draw: ReactionEffectDef['draw'],
): ReactionEffectDef => ({ id, kind, name, frameCount, px: { w, h }, fps, loop, duration: frameCount / fps, additive, sound, draw })

const ORANGE: FlameColors = { core: 'rgba(255,250,220,0.95)', mid: 'rgba(255,150,40,0.75)', edge: 'rgba(255,110,20,0.35)' }
const SODIUM: FlameColors = { core: 'rgba(255,255,220,0.95)', mid: 'rgba(255,200,40,0.8)', edge: 'rgba(255,170,20,0.4)' }
const LILAC: FlameColors = { core: 'rgba(250,235,255,0.95)', mid: 'rgba(190,120,255,0.75)', edge: 'rgba(160,90,240,0.35)' }
const BLUE: FlameColors = { core: 'rgba(220,235,255,0.9)', mid: 'rgba(80,130,255,0.65)', edge: 'rgba(60,100,255,0.3)' }
const CANDLE: FlameColors = { core: 'rgba(255,255,235,1)', mid: 'rgba(255,190,80,0.8)', edge: 'rgba(255,140,40,0.3)' }

export const EFFECTS: Record<EffectId, ReactionEffectDef> = {
  fire: FX('fire', 'fire', { en: 'Fire', uz: 'Olov', ru: 'Огонь' }, 12, 96, 160, 16, true, true, 'fire', flame(ORANGE, 5, 11)),
  'sodium-fire': FX('sodium-fire', 'fire', { en: 'Sodium flame (yellow-orange)', uz: 'Natriy alangasi (sariq-toʻq sariq)', ru: 'Пламя натрия (жёлто-оранжевое)' }, 12, 96, 160, 18, true, true, 'fizz', flame(SODIUM, 5, 21)),
  'potassium-fire': FX('potassium-fire', 'fire', { en: 'Potassium flame (lilac)', uz: 'Kaliy alangasi (siyohrang)', ru: 'Пламя калия (сиреневое)' }, 12, 96, 160, 18, true, true, 'fizz', flame(LILAC, 5, 31)),
  'spirit-fire-blue': FX('spirit-fire-blue', 'fire', { en: 'Spirit-lamp flame', uz: 'Spirt lampasi alangasi', ru: 'Пламя спиртовки' }, 10, 64, 128, 14, true, true, 'fire', flame(BLUE, 3, 41)),
  'candle-fire': FX('candle-fire', 'fire', { en: 'Candle flame', uz: 'Sham alangasi', ru: 'Пламя свечи' }, 10, 48, 112, 12, true, true, null, flame(CANDLE, 2, 51)),
  'bunsen-inner': FX('bunsen-inner', 'fire', { en: 'Bunsen inner cone', uz: 'Bunzen alangasining ichki konusi', ru: 'Внутренний конус пламени Бунзена' }, 8, 48, 96, 20, true, true, 'fire', flame(BLUE, 2, 61)),
  smoke: FX('smoke', 'smoke', { en: 'Smoke', uz: 'Tutun', ru: 'Дым' }, 16, 128, 192, 12, true, false, null, puffs(8, 0.5, 71)),
  vapor: FX('vapor', 'vapor', { en: 'Steam', uz: 'Bugʻ', ru: 'Пар' }, 16, 128, 192, 10, true, false, null, puffs(6, 0.35, 81)),
  bubble: FX('bubble', 'bubble', { en: 'Gas bubbles', uz: 'Gaz pufakchalari', ru: 'Пузырьки газа' }, 16, 96, 192, 14, true, false, 'bubble', bubbles(14, 3, 7, 91)),
  'electrolytic-bubble': FX('electrolytic-bubble', 'bubble', { en: 'Electrolysis bubbles', uz: 'Elektroliz pufakchalari', ru: 'Пузырьки при электролизе' }, 16, 48, 192, 16, true, false, 'bubble', bubbles(22, 1.5, 3, 101)),
  precipitate: FX('precipitate', 'precipitate', { en: 'Precipitate', uz: 'Choʻkma', ru: 'Осадок' }, 16, 128, 160, 8, false, false, null, precipitate),
  explode: FX('explode', 'explode', { en: 'Explosion', uz: 'Portlash', ru: 'Взрыв' }, 12, 192, 192, 20, false, true, 'boom', explode),
  spark: FX('spark', 'spark', { en: 'Sparks', uz: 'Uchqunlar', ru: 'Искры' }, 12, 128, 128, 16, true, true, 'sizzle', sparks),
  cloud: FX('cloud', 'cloud', { en: 'Mixing cloud', uz: 'Aralashish buluti', ru: 'Облако смешивания' }, 12, 128, 128, 14, false, false, 'drip', cloud),
}

/** The sprite sheet for one effect, drawn on first use. Browser only. */
export function effectSheet(id: EffectId): SpriteSheet {
  return cachedSheet(`effect:${id}`, () => {
    const def = EFFECTS[id]
    return buildCanvasSheet(
      Array.from({ length: def.frameCount }, (_, i) => ({
        name: `${id}/${String(i).padStart(2, '0')}`,
        ...def.px,
        draw: (ctx: Ctx2D, w: number, h: number) => def.draw(ctx, w, h, i, def.frameCount),
      })),
      1024,
    )
  })
}

export function effectFrames(id: EffectId): { sheet: SpriteSheet; frames: SpriteFrame[] } {
  const sheet = effectSheet(id)
  return { sheet, frames: framesByPrefix(sheet, `${id}/`) }
}

export const effectsByKind = (kind: ReactionKind) => EFFECT_IDS.filter((id) => EFFECTS[id].kind === kind)
