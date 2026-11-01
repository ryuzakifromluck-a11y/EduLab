/**
 * Writes .vercel/output/config.json for `vercel deploy --prebuilt` (used by the
 * CI deploy job), so a prebuilt deploy behaves like a Git deploy with
 * vercel.json:
 *
 * - every prerendered page (dist/physics/pendulum.html, …) is served at its
 *   clean URL (/physics/pendulum). Without this, crawlers got the home page's
 *   tags for every link, so Telegram and Discord previews all looked the same;
 * - the response headers from public/_headers are applied;
 * - any other path falls back to index.html for the SPA router.
 *
 *   node scripts/deploy/vercel-output.mjs [output-dir]   (default: .vercel/output)
 *
 * The static files must already be in <output-dir>/static.
 */
import { existsSync } from 'node:fs'
import { readdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { readHeaderRules, vercelRouteSrc } from './headers.mjs'

const outDir = resolve(process.argv[2] ?? '.vercel/output')
const staticDir = join(outDir, 'static')
if (!existsSync(join(staticDir, 'index.html'))) {
  console.error(`${staticDir}/index.html not found; copy dist/ there first.`)
  process.exit(1)
}

async function htmlFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)))
    else if (entry.name.endsWith('.html')) out.push(relative(staticDir, full).split(sep).join('/'))
  }
  return out
}

const overrides = {}
for (const file of (await htmlFiles(staticDir)).sort()) {
  if (file === 'index.html' || file.endsWith('/index.html')) continue
  overrides[file] = { path: file.slice(0, -'.html'.length), contentType: 'text/html; charset=utf-8' }
}

const config = {
  version: 3,
  overrides,
  routes: [
    ...readHeaderRules().map((r) => ({ src: vercelRouteSrc(r.path), headers: r.headers, continue: true })),
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/index.html' },
  ],
}

await writeFile(join(outDir, 'config.json'), JSON.stringify(config, null, 2) + '\n')
console.log(`${join(outDir, 'config.json')}: ${Object.keys(overrides).length} clean URLs, ${config.routes.length - 2} header rules`)
