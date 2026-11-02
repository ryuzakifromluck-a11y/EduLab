import { describe, expect, it } from 'vitest'
import { animationDuration, findFrame, frameIndexAt, framesByPrefix, frameUv, loadSpriteSheet, parseSpriteSheetJson } from './spriteLoader'
import { layoutSheet, packFrames, toAtlasJson } from './canvasSheet'

// A small atlas in the Flash Professional / TexturePacker JSON-hash format.
const HASH = {
  frames: {
    'Flask/0002': { frame: { x: 66, y: 2, w: 60, h: 100 }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: 60, h: 100 }, sourceSize: { w: 60, h: 100 } },
    'Flask/0010': { frame: { x: 128, y: 2, w: 60, h: 100 }, rotated: false, trimmed: true, spriteSourceSize: { x: 4, y: 6, w: 60, h: 100 }, sourceSize: { w: 68, h: 112 } },
    'Flask/0001': { frame: { x: 2, y: 2, w: 62, h: 100 }, rotated: false, trimmed: false },
    'Lid/0001': { frame: { x: 2, y: 104, w: 30, h: 10 } },
  },
  meta: { app: 'Adobe Flash Professional', version: '14.0.0.110', image: 'Flask.png', format: 'RGBA8888', size: { w: 256, h: 128 }, scale: '1' },
}

describe('parseSpriteSheetJson', () => {
  it('reads the hash format with meta, trim and source size', () => {
    const s = parseSpriteSheetJson(HASH)
    expect(s.frames).toHaveLength(4)
    expect(s.meta).toEqual({ app: 'Adobe Flash Professional', image: 'Flask.png', width: 256, height: 128, scale: 1 })
    const f = findFrame(s, 'Flask/0010')
    expect(f).toMatchObject({ x: 128, y: 2, w: 60, h: 100, sourceW: 68, sourceH: 112, offsetX: 4, offsetY: 6 })
    expect(findFrame(s, 'Flask/0001')).toMatchObject({ sourceW: 62, sourceH: 100, offsetX: 0 })
  })

  it('reads the array format', () => {
    const s = parseSpriteSheetJson({ frames: [{ filename: 'a', frame: { x: 0, y: 0, w: 4, h: 4 } }, { filename: 'b', frame: { x: 4, y: 0, w: 4, h: 4 } }], meta: {} })
    expect(s.frames.map((f) => f.name)).toEqual(['a', 'b'])
    // No size in meta: the atlas is assumed to just fit the frames.
    expect(s.meta).toMatchObject({ width: 8, height: 4, scale: 1 })
  })

  it('rejects malformed sheets with a readable error', () => {
    expect(() => parseSpriteSheetJson(null)).toThrow(/object/)
    expect(() => parseSpriteSheetJson({ meta: {} })).toThrow(/frames/)
    expect(() => parseSpriteSheetJson({ frames: {} })).toThrow(/no frames/)
    expect(() => parseSpriteSheetJson({ frames: { a: { frame: { x: 0, y: 0, w: 0, h: 4 } } } })).toThrow(/rectangle/)
    expect(() => parseSpriteSheetJson({ frames: { a: { frame: { x: 0, y: 0, w: 4, h: 4 }, rotated: true } } })).toThrow(/rotated/)
    expect(() => parseSpriteSheetJson({ frames: { a: { frame: { x: 10, y: 0, w: 4, h: 4 } } }, meta: { size: { w: 8, h: 8 } } })).toThrow(/outside/)
  })

  it('orders animation frames naturally by prefix', () => {
    const s = parseSpriteSheetJson(HASH)
    expect(framesByPrefix(s, 'Flask/').map((f) => f.name)).toEqual(['Flask/0001', 'Flask/0002', 'Flask/0010'])
    expect(() => findFrame(s, 'nope')).toThrow(/no frame/)
  })

  it('maps a frame to UVs with v measured from the bottom (three.js flipY)', () => {
    const s = parseSpriteSheetJson(HASH)
    const uv = frameUv(findFrame(s, 'Lid/0001'), s.meta)
    expect(uv.offset[0]).toBeCloseTo(2 / 256)
    expect(uv.offset[1]).toBeCloseTo(1 - 114 / 128)
    expect(uv.repeat[0]).toBeCloseTo(30 / 256)
    expect(uv.repeat[1]).toBeCloseTo(10 / 128)
  })

  it('fails clearly when the JSON cannot be fetched', async () => {
    const fetcher = (async () => new Response('nope', { status: 404 })) as typeof fetch
    await expect(loadSpriteSheet('/x.json', '/x.png', fetcher)).rejects.toThrow(/404/)
  })
})

describe('frame timing', () => {
  it('loops or holds the last frame', () => {
    expect(frameIndexAt(0, 12, 6, true)).toBe(0)
    expect(frameIndexAt(0.5, 12, 6, true)).toBe(0)
    expect(frameIndexAt(0.25, 12, 6, true)).toBe(3)
    expect(frameIndexAt(10, 12, 6, false)).toBe(5)
    expect(frameIndexAt(1, 0, 6, true)).toBe(0)
    expect(animationDuration(12, 24)).toBe(0.5)
  })
})

describe('canvas sheet layout', () => {
  it('packs frames without overlap inside a power-of-two atlas', () => {
    const sizes = [
      { w: 100, h: 200 },
      { w: 60, h: 60 },
      { w: 200, h: 120 },
      { w: 30, h: 300 },
      { w: 128, h: 128 },
    ]
    const p = packFrames(sizes, 256)
    expect(Math.log2(p.width) % 1).toBe(0)
    expect(Math.log2(p.height) % 1).toBe(0)
    const rects = sizes.map((s, i) => ({ ...s, ...p.positions[i] }))
    for (const r of rects) {
      expect(r.x + r.w).toBeLessThanOrEqual(p.width)
      expect(r.y + r.h).toBeLessThanOrEqual(p.height)
    }
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]
        const b = rects[j]
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
        expect(overlap, `${i} overlaps ${j}`).toBe(false)
      }
    expect(() => packFrames([{ w: 300, h: 10 }], 256)).toThrow(/does not fit/)
  })

  it('round-trips through the Flash/TexturePacker JSON format', () => {
    const layout = layoutSheet([
      { name: 'a/0', w: 20, h: 30 },
      { name: 'a/1', w: 20, h: 30 },
    ])
    const again = parseSpriteSheetJson(toAtlasJson(layout))
    expect(again.frames).toEqual(layout.frames)
    expect(again.meta.width).toBe(layout.meta.width)
    expect(() => layoutSheet([{ name: 'x', w: 1, h: 1 }, { name: 'x', w: 1, h: 1 }])).toThrow(/Duplicate/)
  })
})
