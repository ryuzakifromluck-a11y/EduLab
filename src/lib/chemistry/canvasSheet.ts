import * as THREE from 'three'
import type { SpriteFrame, SpriteSheet, SpriteSheetData } from './spriteLoader'

/**
 * Builds sprite sheets at runtime by drawing frames on a canvas. EduLab's chemistry equipment,
 * substance blocks and reaction effects are all drawn this way: nothing is downloaded, the sheets
 * cost only the code that draws them, and they are generated the first time a scene needs them.
 */

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export interface FrameSpec {
  name: string
  w: number
  h: number
  draw: (ctx: Ctx2D, w: number, h: number) => void
}

export interface Packing {
  positions: { x: number; y: number }[]
  width: number
  height: number
}

const nextPow2 = (n: number) => 2 ** Math.ceil(Math.log2(Math.max(1, n)))

/**
 * Shelf packing: frames are placed left to right in rows, tallest first, wrapping at `maxWidth`.
 * The atlas is rounded up to powers of two so mipmaps work on every GPU.
 */
export function packFrames(sizes: { w: number; h: number }[], maxWidth = 2048, padding = 2): Packing {
  const order = sizes.map((s, i) => ({ ...s, i })).sort((a, b) => b.h - a.h || b.w - a.w)
  const positions: { x: number; y: number }[] = new Array(sizes.length)
  let x = padding
  let y = padding
  let rowH = 0
  let used = 0
  for (const s of order) {
    if (s.w + 2 * padding > maxWidth) throw new Error(`Frame ${s.w}px wide does not fit a ${maxWidth}px atlas`)
    if (x + s.w + padding > maxWidth) {
      x = padding
      y += rowH + padding
      rowH = 0
    }
    positions[s.i] = { x, y }
    x += s.w + padding
    used = Math.max(used, x)
    rowH = Math.max(rowH, s.h)
  }
  return { positions, width: nextPow2(used), height: nextPow2(y + rowH + padding) }
}

/** Atlas layout for a list of frame specs, without drawing anything (testable in Node). */
export function layoutSheet(specs: Pick<FrameSpec, 'name' | 'w' | 'h'>[], maxWidth = 2048): SpriteSheetData {
  const names = new Set<string>()
  for (const s of specs) {
    if (names.has(s.name)) throw new Error(`Duplicate frame name "${s.name}"`)
    names.add(s.name)
  }
  const pack = packFrames(specs, maxWidth)
  const frames: SpriteFrame[] = specs.map((s, i) => ({
    name: s.name,
    x: pack.positions[i].x,
    y: pack.positions[i].y,
    w: s.w,
    h: s.h,
    sourceW: s.w,
    sourceH: s.h,
    offsetX: 0,
    offsetY: 0,
  }))
  return { frames, meta: { app: 'EduLab canvasSheet', width: pack.width, height: pack.height, scale: 1 } }
}

/** The atlas description in the Flash/TexturePacker JSON-hash format, for export or debugging. */
export function toAtlasJson(sheet: SpriteSheetData) {
  return {
    frames: Object.fromEntries(
      sheet.frames.map((f) => [
        f.name,
        {
          frame: { x: f.x, y: f.y, w: f.w, h: f.h },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: f.offsetX, y: f.offsetY, w: f.w, h: f.h },
          sourceSize: { w: f.sourceW, h: f.sourceH },
        },
      ]),
    ),
    meta: { app: sheet.meta.app, image: sheet.meta.image, size: { w: sheet.meta.width, h: sheet.meta.height }, scale: String(sheet.meta.scale) },
  }
}

function makeCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h)
  throw new Error('No canvas available to draw sprite sheets')
}

/** Draws every frame into one canvas and wraps it in a three.js texture. */
export function buildCanvasSheet(specs: FrameSpec[], maxWidth = 2048): SpriteSheet {
  const layout = layoutSheet(specs, maxWidth)
  const canvas = makeCanvas(layout.meta.width, layout.meta.height)
  const ctx = canvas.getContext('2d') as Ctx2D | null
  if (!ctx) throw new Error('2D canvas context unavailable')
  specs.forEach((s, i) => {
    const f = layout.frames[i]
    ctx.save()
    ctx.beginPath()
    ctx.rect(f.x, f.y, f.w, f.h)
    ctx.clip()
    ctx.translate(f.x, f.y)
    s.draw(ctx, s.w, s.h)
    ctx.restore()
  })
  const texture = new THREE.CanvasTexture(canvas as HTMLCanvasElement)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return { ...layout, texture }
}

const cache = new Map<string, SpriteSheet>()

/** Builds a sheet once per page load and reuses it in every scene that asks for the same key. */
export function cachedSheet(key: string, build: () => SpriteSheet): SpriteSheet {
  let sheet = cache.get(key)
  if (!sheet) {
    sheet = build()
    cache.set(key, sheet)
  }
  return sheet
}

/** Small deterministic PRNG so procedural frames look the same on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
