import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

/**
 * Files in dist/ that are never precached: the worker itself, host config, source maps,
 * and files only crawlers and link previews fetch (OG images, store screenshots, sitemap),
 * which would only cost students mobile data.
 */
export const SKIP: RegExp[] = [
  /^sw\.js$/,
  /^_redirects$/,
  /^_headers$/,
  /\.map$/,
  /^og\//,
  /^screenshots\//,
  /^robots\.txt$/,
  /^sitemap\.xml$/,
  /^precache-manifest\.json$/,
]

/** Warn when one precached file is bigger than this; it is downloaded on every install. */
const LARGE_FILE_BYTES = 2 * 1024 * 1024

export interface PrecacheFile {
  /** Path relative to dist/, with forward slashes. */
  path: string
  bytes: number
}

/** Turns the dist/ listing into the worker's URL list: `/` first, then every file not skipped, sorted. */
export function precacheUrls(files: PrecacheFile[], skip: RegExp[] = SKIP): string[] {
  const kept = files.filter((f) => !skip.some((re) => re.test(f.path))).map((f) => `/${f.path}`)
  return ['/', ...kept.sort()]
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? listFiles(full) : [full]
  })
}

/**
 * Fills public/sw.js's placeholders after the build: the precache list (every emitted
 * file, so all lazy experiment chunks and their 3D scenes work offline) and a build id
 * derived from their contents, so any change to any file ships a new worker.
 * Also writes dist/precache-manifest.json for inspection, and checks the web manifest.
 */
export function serviceWorker(): Plugin {
  let config: ResolvedConfig
  return {
    name: 'edulab-sw',
    apply: 'build',
    configResolved(c) {
      config = c
    },
    closeBundle() {
      const outDir = config.build.outDir
      const swPath = join(outDir, 'sw.js')
      const template = readFileSync(swPath, 'utf8')
      if (!template.includes('__EDULAB_BUILD_ID__') || !template.includes('self.__EDULAB_PRECACHE__')) {
        throw new Error('edulab-sw: dist/sw.js has no placeholders (already processed, or public/sw.js changed)')
      }

      const files = listFiles(outDir)
        .map((full) => ({ path: relative(outDir, full).split(sep).join('/'), bytes: statSync(full).size }))
        .sort((a, b) => a.path.localeCompare(b.path))
      const urls = precacheUrls(files)

      const hash = createHash('sha256').update(template)
      let total = 0
      for (const url of urls.slice(1)) {
        const file = files.find((f) => `/${f.path}` === url)!
        total += file.bytes
        hash.update(file.path).update(readFileSync(join(outDir, file.path)))
        if (file.bytes > LARGE_FILE_BYTES) {
          config.logger.warn(`edulab-sw: ${file.path} is ${(file.bytes / 1024 / 1024).toFixed(1)} MB and is precached on every install`)
        }
      }
      const buildId = hash.digest('hex').slice(0, 12)

      checkManifest(outDir, urls, config)

      writeFileSync(swPath, template.replace('__EDULAB_BUILD_ID__', buildId).replace('self.__EDULAB_PRECACHE__', JSON.stringify(urls)))
      writeFileSync(join(outDir, 'precache-manifest.json'), JSON.stringify({ buildId, bytes: total, urls }, null, 2))
      config.logger.info(`edulab-sw: precaching ${urls.length} files, ${(total / 1024 / 1024).toFixed(2)} MB (build ${buildId})`)
    },
  }
}

/** Fails the build when the web manifest is missing what browsers need to offer installation. */
function checkManifest(outDir: string, urls: string[], config: ResolvedConfig) {
  const manifest = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'))
  const problems: string[] = []
  for (const key of ['name', 'short_name', 'start_url', 'display', 'icons']) if (!manifest[key]) problems.push(`missing "${key}"`)
  if (manifest.short_name && manifest.short_name.length > 12) problems.push('"short_name" is longer than 12 characters')
  const icons: { src: string; sizes: string; purpose?: string }[] = manifest.icons ?? []
  for (const size of ['192x192', '512x512']) if (!icons.some((i) => i.sizes === size)) problems.push(`no ${size} icon`)
  if (!icons.some((i) => i.purpose?.includes('maskable'))) problems.push('no maskable icon')
  for (const icon of icons) if (!urls.includes(icon.src)) problems.push(`icon ${icon.src} is not in dist/`)
  if (problems.length) throw new Error(`edulab-sw: manifest.json: ${problems.join('; ')}`)
  config.logger.info('edulab-sw: manifest.json passes the installability checks')
}
