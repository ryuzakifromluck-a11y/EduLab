import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EXPERIMENTS, experimentPath } from '../../src/data/experiments'
import en from '../../src/i18n/locales/en'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, ogCardNames, resolvePageMeta, translatorFor } from '../../src/seo/meta'
import ogManifest from '../../src/seo/og-manifest.json' with { type: 'json' }

const OG_DIR = new URL('../../public/og/', import.meta.url)
const manifest: Record<string, { input: string; png: string }> = ogManifest
const png = (name: string) => readFileSync(new URL(`${name}.png`, OG_DIR))
const size = (buf: Buffer) => ({ width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) })
const t = translatorFor(en)

describe('social cards', () => {
  const expected = ['default', 'logo', 'physics', 'chemistry', 'biology', ...EXPERIMENTS.map((e) => e.id)]

  it('has a card for the site, each subject and every catalog experiment', () => {
    expect(ogCardNames().sort()).toEqual([...expected].sort())
    for (const name of expected) expect(existsSync(new URL(`${name}.png`, OG_DIR)), `public/og/${name}.png`).toBe(true)
  })

  it('has no PNGs in public/og that are not generated cards', () => {
    const files = readdirSync(OG_DIR).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4))
    expect(files.sort()).toEqual([...expected].sort())
  })

  it('records the hash of each PNG as it is on disk (run `npm run og:images` after editing a card)', () => {
    for (const name of expected) {
      const hash = createHash('sha256').update(png(name)).digest('hex').slice(0, 12)
      expect(hash, `${name}.png`).toBe(manifest[name].png)
    }
  })

  it('renders cards at 1200×630 and the logo square', () => {
    for (const name of expected.filter((n) => n !== 'logo')) {
      expect(size(png(name)), `${name}.png`).toEqual({ width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT })
    }
    expect(size(png('logo'))).toEqual({ width: 512, height: 512 })
  })

  it('points every page at a card that exists', () => {
    const paths = ['/', '/physics', '/chemistry', '/biology', '/about', '/impact', '/account', ...EXPERIMENTS.map(experimentPath)]
    for (const path of paths) {
      const { image } = resolvePageMeta(path, t, 'https://edulab.example')
      expect(manifest[image.replace(/^\/og\/|\.png$/g, '')], `${path} → ${image}`).toBeDefined()
    }
  })
})
