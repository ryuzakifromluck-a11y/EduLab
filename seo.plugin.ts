/**
 * Build-time SEO: writes sitemap.xml and robots.txt from the experiment
 * catalog, and prerenders the <head> of every indexable route into its own
 * HTML file (e.g. dist/physics/pendulum.html) so link previews on Telegram,
 * Discord, Facebook and other crawlers that do not run JavaScript show the
 * right title, description and image.
 *
 * The public origin comes from VITE_SITE_URL (or SITE_URL), falling back to
 * the production URL Vercel or Netlify expose during their builds.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnv, type Plugin } from 'vite'
import en from './src/i18n/locales/en.ts'
import { EXPERIMENTS, experimentPath } from './src/data/experiments.ts'
import { renderHead, renderRobots, renderSitemap, resolvePageMeta, sitemapPaths, translatorFor } from './src/seo/meta.ts'

const SEO_BLOCK = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/
const DEV_ORIGIN = 'http://localhost:4173'

function resolveOrigin(mode: string, envDir: string): { origin: string; configured: boolean } {
  // An empty prefix loads every variable from .env files and the process environment.
  const env = loadEnv(mode, envDir, '')
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
  const origin = env.VITE_SITE_URL || env.SITE_URL || vercel || env.URL
  return origin ? { origin: origin.replace(/\/+$/, ''), configured: true } : { origin: DEV_ORIGIN, configured: false }
}

export function seo(): Plugin {
  let origin = DEV_ORIGIN
  let configured = false
  let publicDir = 'public'
  const t = translatorFor(en)

  return {
    name: 'edulab-seo',
    // Run after Vite has emitted index.html into the bundle.
    enforce: 'post',
    config(userConfig, { mode }) {
      const envDir = typeof userConfig.envDir === 'string' ? userConfig.envDir : (userConfig.root ?? '.')
      ;({ origin, configured } = resolveOrigin(mode, envDir))
      // The runtime hook uses the same origin for canonical and og:url.
      return configured ? { define: { 'import.meta.env.VITE_SITE_URL': JSON.stringify(origin) } } : undefined
    },
    configResolved(config) {
      publicDir = config.publicDir
    },
    generateBundle(_, bundle) {
      if (!configured) {
        this.warn(`VITE_SITE_URL is not set; sitemap and Open Graph URLs use ${DEV_ORIGIN}. Set it to the public site URL.`)
      }
      const index = bundle['index.html']
      if (!index || index.type !== 'asset') return
      const html = String(index.source)
      if (!SEO_BLOCK.test(html)) this.error('index.html is missing the <!-- seo:start --> … <!-- seo:end --> block')

      const missing = new Set<string>()
      const page = (path: string) => {
        const meta = resolvePageMeta(path, t, origin)
        if (!existsSync(join(publicDir, meta.image))) missing.add(meta.image)
        return html.replace(SEO_BLOCK, `<!-- seo:start -->\n    ${renderHead(meta, origin)}\n    <!-- seo:end -->`)
      }

      index.source = page('/')
      // Planned experiments are prerendered too (shared links still preview) but stay out of the sitemap.
      const paths = new Set([...sitemapPaths(), ...EXPERIMENTS.map(experimentPath), '/account'])
      paths.delete('/')
      for (const path of paths) {
        this.emitFile({ type: 'asset', fileName: `${path.slice(1)}.html`, source: page(path) })
      }
      if (missing.size) {
        this.error(`Missing social cards: ${[...missing].map((p) => `public${p}`).join(', ')}. Run: npm run og:images`)
      }
      const today = new Date().toISOString().slice(0, 10)
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap(origin, today) })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: renderRobots(origin) })
    },
  }
}
