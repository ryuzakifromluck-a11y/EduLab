import * as THREE from 'three'

/**
 * Sprite-sheet pipeline for chemistry experiments.
 *
 * Reads the JSON atlas format written by Adobe Flash Professional / Animate and TexturePacker
 * ("JSON (Hash)" and "JSON (Array)"): a `frames` map or list of `{ frame: { x, y, w, h } }`
 * rectangles plus a `meta` block with the atlas `size` and `image`. The same {@link SpriteSheet}
 * shape is produced by `buildCanvasSheet` (canvasSheet.ts) for EduLab's procedurally drawn
 * equipment, substances and effects, so scenes do not care where a sheet came from.
 *
 * Rotated frames (TexturePacker's "allow rotation") are rejected: export atlases without rotation.
 */

export interface SpriteFrame {
  /** Key in the atlas, e.g. "Beaker/0001". */
  name: string
  /** Rectangle in the atlas image, px from the top-left corner. */
  x: number
  y: number
  w: number
  h: number
  /** Size of the untrimmed source image and where the trimmed rectangle sits in it. */
  sourceW: number
  sourceH: number
  offsetX: number
  offsetY: number
}

export interface SpriteSheetMeta {
  app?: string
  image?: string
  /** Atlas size in px. */
  width: number
  height: number
  scale: number
}

export interface SpriteSheetData {
  frames: SpriteFrame[]
  meta: SpriteSheetMeta
}

export interface SpriteSheet extends SpriteSheetData {
  texture: THREE.Texture
}

type Rect = { x: number; y: number; w: number; h: number }
type RawFrame = {
  filename?: string
  frame: Rect
  rotated?: boolean
  trimmed?: boolean
  spriteSourceSize?: Rect
  sourceSize?: { w: number; h: number }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isRect = (v: unknown): v is Rect => isObject(v) && isNum(v.x) && isNum(v.y) && isNum(v.w) && isNum(v.h) && v.w > 0 && v.h > 0

function toFrame(name: string, raw: unknown): SpriteFrame {
  if (!isObject(raw) || !isRect(raw.frame)) throw new Error(`Sprite frame "${name}" has no valid frame rectangle`)
  if (raw.rotated === true) throw new Error(`Sprite frame "${name}" is rotated; export the atlas without rotation`)
  const r = raw as RawFrame
  const src = isObject(r.sourceSize) && isNum(r.sourceSize.w) && isNum(r.sourceSize.h) ? r.sourceSize : { w: r.frame.w, h: r.frame.h }
  const off = isRect(r.spriteSourceSize) ? r.spriteSourceSize : { x: 0, y: 0 }
  return { name, x: r.frame.x, y: r.frame.y, w: r.frame.w, h: r.frame.h, sourceW: src.w, sourceH: src.h, offsetX: off.x, offsetY: off.y }
}

/** Parses an atlas JSON document (hash or array form). Throws with a readable message on malformed input. */
export function parseSpriteSheetJson(json: unknown): SpriteSheetData {
  if (!isObject(json)) throw new Error('Sprite sheet JSON must be an object')
  const { frames: rawFrames, meta: rawMeta } = json
  let frames: SpriteFrame[]
  if (Array.isArray(rawFrames)) {
    frames = rawFrames.map((f, i) => toFrame(isObject(f) && typeof f.filename === 'string' ? f.filename : String(i), f))
  } else if (isObject(rawFrames)) {
    frames = Object.entries(rawFrames).map(([name, f]) => toFrame(name, f))
  } else {
    throw new Error('Sprite sheet JSON has no "frames"')
  }
  if (frames.length === 0) throw new Error('Sprite sheet has no frames')
  const meta = isObject(rawMeta) ? rawMeta : {}
  const size = isObject(meta.size) && isNum(meta.size.w) && isNum(meta.size.h) ? { w: meta.size.w, h: meta.size.h } : null
  const width = size?.w ?? Math.max(...frames.map((f) => f.x + f.w))
  const height = size?.h ?? Math.max(...frames.map((f) => f.y + f.h))
  const scale = typeof meta.scale === 'string' || isNum(meta.scale) ? Number(meta.scale) || 1 : 1
  for (const f of frames) {
    if (f.x + f.w > width || f.y + f.h > height) throw new Error(`Sprite frame "${f.name}" lies outside the ${width}×${height} atlas`)
  }
  return {
    frames,
    meta: {
      app: typeof meta.app === 'string' ? meta.app : undefined,
      image: typeof meta.image === 'string' ? meta.image : undefined,
      width,
      height,
      scale,
    },
  }
}

/** Frames whose name starts with `prefix`, in natural order ("f2" before "f10"). */
export function framesByPrefix(sheet: SpriteSheetData, prefix: string): SpriteFrame[] {
  const collator = new Intl.Collator('en', { numeric: true })
  return sheet.frames.filter((f) => f.name.startsWith(prefix)).sort((a, b) => collator.compare(a.name, b.name))
}

export function findFrame(sheet: SpriteSheetData, name: string): SpriteFrame {
  const f = sheet.frames.find((fr) => fr.name === name)
  if (!f) throw new Error(`Sprite sheet has no frame "${name}"`)
  return f
}

/**
 * UV offset and repeat that show one frame of the atlas on a texture. three.js flips images
 * vertically on upload (flipY), so v is measured from the bottom of the atlas.
 */
export function frameUv(frame: SpriteFrame, meta: Pick<SpriteSheetMeta, 'width' | 'height'>) {
  return {
    offset: [frame.x / meta.width, 1 - (frame.y + frame.h) / meta.height] as [number, number],
    repeat: [frame.w / meta.width, frame.h / meta.height] as [number, number],
  }
}

/** Points a texture (usually a clone of the atlas texture) at one frame. */
export function showFrame(texture: THREE.Texture, frame: SpriteFrame, meta: SpriteSheetMeta) {
  const { offset, repeat } = frameUv(frame, meta)
  texture.offset.set(offset[0], offset[1])
  texture.repeat.set(repeat[0], repeat[1])
}

/** A texture clone that shows one frame; clones share the uploaded image, so this is cheap. */
export function frameTexture(sheet: SpriteSheet, frame: SpriteFrame | string): THREE.Texture {
  const f = typeof frame === 'string' ? findFrame(sheet, frame) : frame
  const tex = sheet.texture.clone()
  showFrame(tex, f, sheet.meta)
  tex.needsUpdate = true
  return tex
}

/** A sprite material that shows one frame. */
export function frameMaterial(sheet: SpriteSheet, frame: SpriteFrame | string, params: THREE.SpriteMaterialParameters = {}) {
  return new THREE.SpriteMaterial({ map: frameTexture(sheet, frame), transparent: true, depthWrite: false, ...params })
}

/** Index of the frame to show after `elapsed` seconds of an animation. */
export function frameIndexAt(elapsed: number, fps: number, count: number, loop: boolean): number {
  if (count <= 1 || fps <= 0 || elapsed <= 0) return 0
  const i = Math.floor(elapsed * fps)
  return loop ? i % count : Math.min(count - 1, i)
}

/** Duration of one pass through the animation, in seconds. */
export const animationDuration = (count: number, fps: number) => (fps > 0 ? count / fps : 0)

/**
 * Loads a JSON atlas and its PNG. The PNG defaults to `meta.image` next to the JSON file.
 * Both URLs are fetched only when called, so sheets never enter the main bundle.
 */
export async function loadSpriteSheet(jsonUrl: string, pngUrl?: string, fetcher: typeof fetch = fetch): Promise<SpriteSheet> {
  const res = await fetcher(jsonUrl)
  if (!res.ok) throw new Error(`Could not load sprite sheet ${jsonUrl} (${res.status})`)
  const data = parseSpriteSheetJson(await res.json())
  const image = pngUrl ?? (data.meta.image ? new URL(data.meta.image, new URL(jsonUrl, globalThis.location?.href ?? 'http://localhost/')).href : null)
  if (!image) throw new Error(`Sprite sheet ${jsonUrl} names no image; pass the PNG URL`)
  const texture = await new THREE.TextureLoader().loadAsync(image)
  texture.colorSpace = THREE.SRGBColorSpace
  return { ...data, texture }
}
