/**
 * Checks link previews in a production build the way Telegram, Discord and
 * other crawlers see them: no JavaScript, just the HTML served for each URL.
 *
 *   npm run build && npm run seo:check
 *
 * Serves dist/ with `vite preview`, requests every URL in sitemap.xml with a
 * crawler User-Agent and fails if a page is missing its title, description,
 * canonical/og:url, or a reachable 1200×630 PNG og:image, if two pages share a
 * title (the sign that a route fell back to the home page), or if robots.txt
 * does not point at the sitemap.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const root = fileURLToPath(new URL('../..', import.meta.url))
const dist = fileURLToPath(new URL('../../dist/', import.meta.url))
const AGENTS = ['TelegramBot (like TwitterBot)', 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)']
/** Telegram and Discord cut titles around here; longer ones still work but get truncated. */
const TITLE_SOFT_LIMIT = 70
const DESCRIPTION_SOFT_LIMIT = 200

if (!existsSync(`${dist}sitemap.xml`)) {
  console.error('dist/sitemap.xml not found. Run `npm run build` first.')
  process.exit(1)
}

const errors = []
const warnings = []
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** Reads `<meta property|name="key" content="…">` and `<link rel="key" href="…">` from static HTML. */
function headOf(html) {
  const tags = {}
  for (const [, attr, key, content] of html.matchAll(/<meta (property|name)="([^"]+)" content="([^"]*)"/g)) {
    ;(tags[`${attr}:${key}`] ??= []).push(decode(content))
  }
  for (const [, rel, href] of html.matchAll(/<link rel="([^"]+)" href="([^"]*)"/g)) tags[`link:${rel}`] = [decode(href)]
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1])
  return { get: (key) => tags[key]?.[0], title: title && decode(title), jsonLd }
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(buf) {
  const signature = '89504e470d0a1a0a'
  if (buf.subarray(0, 8).toString('hex') !== signature) return undefined
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

const sitemap = await readFile(`${dist}sitemap.xml`, 'utf8')
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]))
if (!urls.length) errors.push('sitemap.xml lists no URLs')
const origin = new URL(urls[0]).origin

const server = await preview({ root, logLevel: 'silent', preview: { port: 0, open: false } })
const local = server.resolvedUrls?.local[0]?.replace(/\/$/, '')
const toLocal = (url) => local + new URL(url).pathname + new URL(url).search

try {
  const robots = await (await fetch(`${local}/robots.txt`)).text()
  if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) errors.push(`robots.txt does not point at ${origin}/sitemap.xml`)

  const titles = new Map()
  const images = new Map()
  for (const url of urls) {
    const fail = (msg) => errors.push(`${new URL(url).pathname}: ${msg}`)
    const warn = (msg) => warnings.push(`${new URL(url).pathname}: ${msg}`)
    for (const agent of AGENTS) {
      const res = await fetch(toLocal(url), { headers: { 'User-Agent': agent } })
      if (res.status !== 200) {
        fail(`HTTP ${res.status} for ${agent}`)
        continue
      }
      if (agent !== AGENTS[0]) continue
      const head = headOf(await res.text())
      const ogTitle = head.get('property:og:title')
      const description = head.get('property:og:description')
      const image = head.get('property:og:image')

      if (!head.title) fail('no <title>')
      if (!ogTitle) fail('no og:title')
      else if (ogTitle !== head.title) fail(`og:title "${ogTitle}" differs from <title> "${head.title}"`)
      if (ogTitle && ogTitle.length > TITLE_SOFT_LIMIT) warn(`title is ${ogTitle.length} characters; previews cut it near ${TITLE_SOFT_LIMIT}`)
      if (!description) fail('no og:description')
      else if (description.length > DESCRIPTION_SOFT_LIMIT) warn(`description is ${description.length} characters; previews cut it near ${DESCRIPTION_SOFT_LIMIT}`)
      if (!head.get('name:description')) fail('no meta description')
      if (head.get('property:og:url') !== url) fail(`og:url is ${head.get('property:og:url')}, expected ${url}`)
      if (head.get('link:canonical') !== url) fail(`canonical is ${head.get('link:canonical')}, expected ${url}`)
      if (head.get('name:robots')?.includes('noindex')) fail('listed in the sitemap but marked noindex')
      if (head.get('name:twitter:card') !== 'summary_large_image') fail('twitter:card is not summary_large_image')
      for (const block of head.jsonLd) {
        try {
          JSON.parse(block)
        } catch {
          fail('JSON-LD is not valid JSON')
        }
      }
      if (head.title) titles.set(head.title, [...(titles.get(head.title) ?? []), new URL(url).pathname])

      if (!image) {
        fail('no og:image')
      } else if (!image.startsWith(`${origin}/`)) {
        fail(`og:image ${image} is not on ${origin}`)
      } else {
        if (!images.has(image)) {
          const img = await fetch(toLocal(image))
          const size = img.ok ? pngSize(Buffer.from(await img.arrayBuffer())) : undefined
          images.set(image, img.ok ? (size ? `${size.width}x${size.height}` : 'not a PNG') : `HTTP ${img.status}`)
        }
        const result = images.get(image)
        if (result !== '1200x630') fail(`og:image ${new URL(image).pathname}: ${result}, expected a 1200x630 PNG`)
        if (head.get('property:og:image:width') !== '1200' || head.get('property:og:image:height') !== '630') {
          fail('og:image:width/height are not 1200×630')
        }
      }
    }
  }
  for (const [title, paths] of titles) {
    if (paths.length > 1) errors.push(`${paths.join(', ')} share the title "${title}" (did a route fall back to index.html?)`)
  }
} finally {
  await server.close()
}

for (const w of warnings) console.warn(`warning  ${w}`)
for (const e of errors) console.error(`error    ${e}`)
if (errors.length) {
  console.error(`\n${errors.length} link preview problem(s) in ${urls.length} pages.`)
  process.exit(1)
}
console.log(`Link previews OK for ${urls.length} pages on ${origin}${warnings.length ? ` (${warnings.length} warnings)` : ''}.`)
