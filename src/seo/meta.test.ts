import { describe, expect, it } from 'vitest'
import { EXPERIMENTS, experimentPath } from '../data/experiments'
import en from '../i18n/locales/en'
import ogManifest from './og-manifest.json' with { type: 'json' }
import { headTags, ogImageUrl, renderHead, renderRobots, renderSitemap, resolvePageMeta, sitemapPaths, translatorFor } from './meta'

const t = translatorFor(en)
const ORIGIN = 'https://edulab.example'
const meta = (path: string) => resolvePageMeta(path, t, ORIGIN)
const tag = (path: string, key: string) =>
  headTags(meta(path), ORIGIN).find((h) => (h.tag === 'meta' ? h.key : h.rel) === key)

describe('resolvePageMeta', () => {
  it('describes the home page with organization and website JSON-LD', () => {
    const home = meta('/')
    expect(home.title).toBe('EduLab — A Laboratory Without Borders')
    expect(home.description).toBe(en.footer.mission)
    expect(home.noindex).toBe(false)
    expect(home.jsonLd.map((d) => d['@type'])).toEqual(['EducationalOrganization', 'WebSite'])
  })

  it('uses the catalog for experiment pages, with a Course and breadcrumbs', () => {
    const page = meta('/physics/pendulum')
    expect(page.title).toBe('Pendulum Motion — Physics · EduLab')
    expect(page.description).toBe(en.catalog.pendulum.description)
    expect(page.image).toBe('/og/pendulum.png')
    expect(page.type).toBe('article')
    const [course, crumbs] = page.jsonLd
    expect(course).toMatchObject({ '@type': 'Course', name: 'Pendulum Motion', timeRequired: 'PT15M', isAccessibleForFree: true })
    expect(crumbs['@type']).toBe('BreadcrumbList')
  })

  it('gives subject pages their own title and image', () => {
    expect(meta('/chemistry')).toMatchObject({ title: 'Chemistry Laboratory · EduLab', image: '/og/chemistry.png' })
  })

  it('indexes the chemistry Items tab as its own page', () => {
    expect(meta('/chemistry/items')).toMatchObject({ title: 'Chemistry lab equipment and reagents · EduLab', image: '/og/chemistry.png', noindex: false })
    expect(sitemapPaths()).toContain('/chemistry/items')
  })

  it('ignores a trailing slash', () => {
    expect(meta('/physics/ohms-law/').path).toBe('/physics/ohms-law')
  })

  it('keeps planned experiments, personal and unknown pages out of the index', () => {
    // Every experiment in the catalogue is built now, so add a temporary planned one.
    const planned = { ...EXPERIMENTS[0], id: 'future-experiment', status: 'planned' as const }
    EXPERIMENTS.push(planned)
    try {
      expect(meta(experimentPath(planned)).noindex).toBe(true)
    } finally {
      EXPERIMENTS.pop()
    }
    expect(meta('/account').noindex).toBe(true)
    expect(meta('/teacher/remote').noindex).toBe(true)
    expect(meta('/student/remote/ABC-234').noindex).toBe(true)
    expect(meta('/nope').noindex).toBe(true)
    expect(meta('/physics/not-an-experiment').title).toBe('Page not found · EduLab')
  })
})

describe('headTags', () => {
  it('emits absolute Open Graph URLs', () => {
    expect(tag('/physics/pendulum', 'og:url')).toMatchObject({ content: `${ORIGIN}/physics/pendulum` })
    expect(tag('/physics/pendulum', 'og:image')).toMatchObject({
      content: `${ORIGIN}/og/pendulum.png?v=${ogManifest.pendulum.png}`,
    })
    expect(tag('/physics/pendulum', 'canonical')).toMatchObject({ href: `${ORIGIN}/physics/pendulum` })
    expect(tag('/about', 'robots')).toMatchObject({ content: 'index, follow' })
  })

  it('escapes HTML and keeps JSON-LD from closing its script tag', () => {
    const html = renderHead({ ...meta('/'), title: 'A <b> & "c"', jsonLd: [{ name: '</script>' }] }, ORIGIN)
    expect(html).toContain('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>')
    expect(html).not.toContain('"</script>')
  })
})

describe('ogImageUrl', () => {
  it('versions generated cards by content hash so social caches refresh', () => {
    expect(ogImageUrl(ORIGIN, '/og/default.png')).toBe(`${ORIGIN}/og/default.png?v=${ogManifest.default.png}`)
    expect(tag('/chemistry', 'twitter:image')).toMatchObject({ content: `${ORIGIN}/og/chemistry.png?v=${ogManifest.chemistry.png}` })
  })

  it('leaves images that are not generated cards alone', () => {
    expect(ogImageUrl(ORIGIN, '/og/unknown.png')).toBe(`${ORIGIN}/og/unknown.png`)
    expect(ogImageUrl(ORIGIN, '/icons/icon-512.png')).toBe(`${ORIGIN}/icons/icon-512.png`)
  })
})

describe('sitemap and robots', () => {
  it('lists every page and every available experiment, and nothing planned', () => {
    const paths = sitemapPaths()
    for (const p of ['/', '/physics', '/chemistry', '/biology', '/about', '/impact']) expect(paths).toContain(p)
    for (const e of EXPERIMENTS) expect(paths.includes(experimentPath(e))).toBe(e.status === 'available')
  })

  it('renders valid sitemap XML and a robots.txt that points at it', () => {
    const xml = renderSitemap(ORIGIN, '2026-01-01')
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain(`<loc>${ORIGIN}/physics/pendulum</loc>`)
    expect(xml.match(/<url>/g)).toHaveLength(sitemapPaths().length)
    expect(renderRobots(ORIGIN)).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
  })

  it('keeps crawlers out of the personal dashboard and the API', () => {
    const robots = renderRobots(ORIGIN)
    expect(robots).toContain('Disallow: /account\n')
    expect(robots).toContain('Disallow: /api/\n')
    for (const p of sitemapPaths()) expect(p.startsWith('/account') || p.startsWith('/api/')).toBe(false)
  })
})
