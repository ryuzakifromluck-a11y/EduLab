/**
 * Renders the social card PNGs in public/og/ from scripts/og/cards.tsx and
 * records them in src/seo/og-manifest.json.
 *
 *   npm run og:images              render only cards whose markup changed (or are missing)
 *   npm run og:images -- --force   render every card again
 *   npm run og:images -- --check   render nothing; exit 1 if any card is missing or stale
 *
 * The manifest stores two hashes per card: `input` (the card markup and font,
 * used to skip unchanged cards and by --check) and `png` (the image bytes,
 * appended to og:image as ?v=… so Telegram, Discord and Facebook fetch the new
 * image instead of a cached one). --check needs no browser, so CI can run it.
 *
 * Rendering needs Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`).
 */
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

/** Bump when a change here (viewport, screenshot options) alters the PNGs without changing card markup. */
const RENDERER_VERSION = 2

const root = fileURLToPath(new URL('../..', import.meta.url))
const outDir = fileURLToPath(new URL('../../public/og/', import.meta.url))
const manifestPath = fileURLToPath(new URL('../../src/seo/og-manifest.json', import.meta.url))

const args = new Set(process.argv.slice(2))
const check = args.has('--check')
const force = args.has('--force')

const sha = (data) => createHash('sha256').update(data).digest('hex')
const short = (data) => sha(data).slice(0, 12)

const inter = await readFile(new URL('../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', import.meta.url))
const fontFace = `@font-face { font-family: 'Inter Variable'; font-weight: 100 900; src: url(data:font/woff2;base64,${inter.toString('base64')}) format('woff2'); }`
const fontHash = sha(inter)

/** @type {Record<string, { input: string; png: string }>} */
const previous = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {}

const vite = await createServer({ root, configFile: false, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let browser
try {
  const { cards, logo } = await vite.ssrLoadModule('/scripts/og/cards.tsx')
  /** @type {{ name: string; html: string; size: { width: number; height: number }; transparent?: boolean }[]} */
  const jobs = [
    ...cards().map((c) => ({ ...c, size: { width: 1200, height: 630 } })),
    { name: 'logo', html: logo(), size: { width: 512, height: 512 }, transparent: true },
  ]

  const plan = jobs.map((job) => {
    const input = short(`${RENDERER_VERSION}\n${fontHash}\n${job.size.width}x${job.size.height}\n${job.html}`)
    const file = `${outDir}${job.name}.png`
    const prev = previous[job.name]
    const reason = !existsSync(file) ? 'missing' : !prev ? 'not in manifest' : prev.input !== input ? 'changed' : null
    return { ...job, input, file, reason: force ? reason ?? 'forced' : reason }
  })
  const todo = plan.filter((p) => p.reason)
  const names = new Set(jobs.map((j) => j.name))
  const orphans = Object.keys(previous).filter((n) => !names.has(n))

  if (check) {
    const problems = [...todo.map((p) => `${p.name}.png: ${p.reason}`), ...orphans.map((n) => `${n}: in manifest but no longer a card`)]
    // A hand-edited or re-exported PNG would ship under a stale ?v= cache key.
    for (const p of plan.filter((p) => !p.reason)) {
      if (short(await readFile(p.file)) !== previous[p.name].png) problems.push(`${p.name}.png: file differs from the manifest`)
    }
    if (problems.length) {
      console.error(`Social cards are out of date:\n  ${problems.join('\n  ')}\nRun: npm run og:images`)
      process.exit(1)
    }
    console.log(`All ${plan.length} social cards are up to date.`)
  } else {
    if (todo.length) {
      let chromium
      try {
        // require() also finds a globally installed Playwright via NODE_PATH.
        ;({ chromium } = createRequire(import.meta.url)('playwright'))
      } catch {
        console.error('Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium')
        process.exit(1)
      }
      browser = await chromium.launch()
      await mkdir(outDir, { recursive: true })
      const page = await browser.newPage()
      for (const job of todo) {
        await page.setViewportSize(job.size)
        await page.setContent(job.html, { waitUntil: 'load' })
        await page.addStyleTag({ content: fontFace })
        await page.evaluate(() => document.fonts.ready)
        await page.screenshot({ path: job.file, omitBackground: job.transparent })
        console.log(`public/og/${job.name}.png (${job.reason})`)
      }
    }
    for (const n of orphans) {
      await rm(`${outDir}${n}.png`, { force: true })
      console.log(`removed public/og/${n}.png`)
    }
    const manifest = {}
    for (const p of [...plan].sort((a, b) => a.name.localeCompare(b.name))) {
      manifest[p.name] = { input: p.input, png: short(await readFile(p.file)) }
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    console.log(`${todo.length} of ${plan.length} social cards rendered; manifest: src/seo/og-manifest.json`)
  }
} finally {
  await browser?.close()
  await vite.close()
}
