import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseHeaders, readHeaderRules, vercelJsonHeaders, vercelRouteSrc } from './headers.mjs'

const vercelJson = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))

describe('response headers', () => {
  it('parses the _headers format', () => {
    expect(parseHeaders('# c\n/a/*\n  X-One: 1\n  Cache-Control: no-cache, max-age=0\n\n/b\n  X: y\n')).toEqual([
      { path: '/a/*', headers: { 'X-One': '1', 'Cache-Control': 'no-cache, max-age=0' } },
      { path: '/b', headers: { X: 'y' } },
    ])
  })

  it('keeps vercel.json in sync with public/_headers', () => {
    expect(vercelJson.headers).toEqual(vercelJsonHeaders(readHeaderRules()))
  })

  it('caches the service worker never, hashed assets forever and social cards for a day', () => {
    const rules = Object.fromEntries(readHeaderRules().map((r) => [r.path, r.headers['Cache-Control']]))
    expect(rules['/sw.js']).toMatch(/no-store/)
    expect(rules['/assets/*']).toMatch(/immutable/)
    expect(rules['/og/*']).toMatch(/max-age=86400/)
    expect(rules['/og/*']).not.toMatch(/immutable/)
    expect(rules['/sitemap.xml']).toBeDefined()
    expect(rules['/robots.txt']).toBeDefined()
  })

  it('escapes route regexes for the Build Output API', () => {
    expect(vercelRouteSrc('/sw.js')).toBe('^/sw\\.js$')
    expect(new RegExp(vercelRouteSrc('/og/*')).test('/og/pendulum.png')).toBe(true)
    expect(new RegExp(vercelRouteSrc('/sw.js')).test('/swxjs')).toBe(false)
  })
})

describe('vercel-output.mjs', () => {
  it('serves each prerendered page at its clean URL and keeps the SPA fallback last', () => {
    const out = mkdtempSync(join(tmpdir(), 'edulab-vercel-'))
    try {
      mkdirSync(join(out, 'static/physics'), { recursive: true })
      for (const f of ['index.html', 'about.html', 'physics.html', 'physics/pendulum.html']) writeFileSync(join(out, 'static', f), '<!doctype html>')
      const script = new URL('./vercel-output.mjs', import.meta.url).pathname
      execFileSync(process.execPath, [script, out], { stdio: 'pipe' })
      const config = JSON.parse(readFileSync(join(out, 'config.json'), 'utf8'))
      expect(config.version).toBe(3)
      expect(Object.keys(config.overrides).sort()).toEqual(['about.html', 'physics.html', 'physics/pendulum.html'])
      expect(config.overrides['physics/pendulum.html']).toEqual({ path: 'physics/pendulum', contentType: 'text/html; charset=utf-8' })
      expect(config.routes.at(-2)).toEqual({ handle: 'filesystem' })
      expect(config.routes.at(-1)).toEqual({ src: '/(.*)', dest: '/index.html' })
      expect(config.routes.filter((r: { continue?: boolean }) => r.continue)).toHaveLength(readHeaderRules().length)
    } finally {
      rmSync(out, { recursive: true, force: true })
    }
  })
})
