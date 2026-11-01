/**
 * Route metadata for search engines and social previews. Pure and DOM-free:
 * the runtime `useSEO` hook and the build-time prerender plugin both use it,
 * so the tags a crawler sees in the static HTML match what the app sets.
 */
import { EXPERIMENTS, SUBJECTS, experimentPath, findExperiment, type Experiment } from '../data/experiments.ts'
// Written by `npm run og:images`: a content hash for every card in public/og/.
import ogManifest from './og-manifest.json' with { type: 'json' }

export const SITE_NAME = 'EduLab'
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

/** Same signature as i18next's `t` for the plain-string keys used here. */
export type Translate = (key: string) => string

export interface PageMeta {
  /** Canonical path, e.g. `/physics/pendulum`. */
  path: string
  title: string
  description: string
  type: 'website' | 'article'
  /** Site-relative path of the 1200×630 social card. */
  image: string
  imageAlt: string
  noindex: boolean
  jsonLd: Record<string, unknown>[]
}

export type HeadTag =
  | { tag: 'meta'; attr: 'name' | 'property'; key: string; content: string }
  | { tag: 'link'; rel: string; href: string }

const OG_LOCALES: Record<string, string> = { en: 'en_US', uz: 'uz_UZ', ru: 'ru_RU' }

export const ogImagePath = (name: string) => `/og/${name}.png`

const OG_VERSIONS: Record<string, { png: string }> = ogManifest

/** Names of every generated social card, e.g. `pendulum`, `default`, `logo`. */
export const ogCardNames = () => Object.keys(OG_VERSIONS)

/**
 * Absolute URL of a social card with its content hash as `?v=`. Telegram,
 * Discord and Facebook cache images by URL, so a redrawn card gets a new URL
 * and shows up in previews instead of the stale copy.
 */
export function ogImageUrl(origin: string, path: string): string {
  const name = /^\/og\/([\w-]+)\.png$/.exec(path)?.[1]
  const version = name ? OG_VERSIONS[name]?.png : undefined
  return absoluteUrl(origin, path) + (version ? `?v=${version}` : '')
}

/** Static routes worth indexing, in sitemap order. Experiments are added from the catalog. */
const STATIC_PATHS = ['/', ...SUBJECTS.map((s) => `/${s}`), '/about', '/impact']

/** Every indexable path: static pages plus each experiment that can actually be run. */
export function sitemapPaths(): string[] {
  const experiments = EXPERIMENTS.filter((e) => e.status === 'available')
    .sort((a, b) => SUBJECTS.indexOf(a.subject) - SUBJECTS.indexOf(b.subject) || a.order - b.order)
    .map(experimentPath)
  const subjectPages = 1 + SUBJECTS.length
  return [...STATIC_PATHS.slice(0, subjectPages), ...experiments, ...STATIC_PATHS.slice(subjectPages)]
}

const normalizePath = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/') || '/'

export const absoluteUrl = (origin: string, path: string) => origin.replace(/\/+$/, '') + path

/** Appends the site name unless the page title already contains it (e.g. "About EduLab"). */
const titled = (page: string) => (page.includes(SITE_NAME) ? page : `${page} · ${SITE_NAME}`)

/** ISO 8601 duration for schema.org, e.g. 15 → `PT15M`. */
const isoMinutes = (minutes: number) => `PT${minutes}M`

function organization(origin: string, t: Translate) {
  return {
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: absoluteUrl(origin, '/'),
    logo: absoluteUrl(origin, ogImagePath('logo')),
    description: t('footer.mission'),
  }
}

function breadcrumbs(origin: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(origin, item.path),
    })),
  }
}

function experimentMeta(e: Experiment, origin: string, t: Translate, lang: string): PageMeta {
  const title = t(`catalog.${e.id}.title`)
  const description = t(`catalog.${e.id}.description`)
  const subjectName = t(`nav.${e.subject}`)
  const path = experimentPath(e)
  const image = ogImagePath(e.id)
  const available = e.status === 'available'
  return {
    path,
    title: titled(`${title} — ${subjectName}`),
    description,
    type: 'article',
    image,
    imageAlt: title,
    // A planned experiment only shows an "in development" notice, so keep it out of the index.
    noindex: !available,
    jsonLd: available
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: title,
            description,
            url: absoluteUrl(origin, path),
            image: absoluteUrl(origin, image),
            inLanguage: lang,
            availableLanguage: Object.keys(OG_LOCALES),
            isAccessibleForFree: true,
            educationalLevel: t(`difficulty.${e.difficulty}`),
            about: t(`categories.${e.subject}.${e.category}`),
            learningResourceType: 'Interactive simulation',
            timeRequired: isoMinutes(e.duration),
            provider: organization(origin, t),
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', category: 'Free' },
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: 'Online',
              courseWorkload: isoMinutes(e.duration),
            },
          },
          breadcrumbs(origin, [
            { name: SITE_NAME, path: '/' },
            { name: subjectName, path: `/${e.subject}` },
            { name: title, path },
          ]),
        ]
      : [],
  }
}

/** Metadata for any pathname. Unknown paths get the site defaults and are not indexed. */
export function resolvePageMeta(pathname: string, t: Translate, origin: string, lang = 'en'): PageMeta {
  const path = normalizePath(pathname)
  const site: PageMeta = {
    path,
    title: `${SITE_NAME} — ${t('brand.slogan').split('. ')[0]}`,
    description: t('footer.mission'),
    type: 'website',
    image: ogImagePath('default'),
    imageAlt: t('brand.slogan'),
    noindex: false,
    jsonLd: [],
  }
  const page = (title: string, description: string): PageMeta => ({ ...site, title: titled(title), description })

  if (path === '/') {
    return {
      ...site,
      jsonLd: [
        { '@context': 'https://schema.org', ...organization(origin, t) },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE_NAME,
          url: absoluteUrl(origin, '/'),
          description: t('footer.mission'),
          inLanguage: Object.keys(OG_LOCALES),
        },
      ],
    }
  }

  const [first, second, ...rest] = path.slice(1).split('/')
  const subject = SUBJECTS.find((s) => s === first)
  if (subject && !second) {
    return {
      ...page(t(`subject.${subject}.title`), t(`home.subjects.${subject}.description`)),
      image: ogImagePath(subject),
      imageAlt: t(`subject.${subject}.title`),
      jsonLd: [breadcrumbs(origin, [{ name: SITE_NAME, path: '/' }, { name: t(`nav.${subject}`), path }])],
    }
  }
  const experiment = subject && second && !rest.length ? findExperiment(subject, second) : undefined
  if (experiment) return experimentMeta(experiment, origin, t, lang)

  switch (path) {
    case '/about':
      return page(t('about.title'), t('about.intro'))
    case '/impact':
      return page(t('impact.title'), t('impact.intro'))
    case '/account':
      // Personal page: useful to open, not to index.
      return { ...page(t('nav.account'), t('footer.mission')), noindex: true }
    case '/teacher/remote':
      // Class tools: useful to share, but session pages are temporary and not indexed.
      return { ...page(t('remote.teacher.title'), t('remote.teacher.intro')), noindex: true }
  }
  if (path === '/student/remote' || path.startsWith('/student/remote/')) {
    return { ...page(t('remote.student.title'), t('remote.student.intro')), noindex: true }
  }
  return { ...site, title: titled(t('notFound.title')), description: t('notFound.text'), noindex: true }
}

/** The `<head>` tags for a page, shared by the runtime hook and the prerendered HTML. */
export function headTags(meta: PageMeta, origin: string, lang = 'en'): HeadTag[] {
  const url = absoluteUrl(origin, meta.path)
  const image = ogImageUrl(origin, meta.image)
  const ogLocale = OG_LOCALES[lang] ?? OG_LOCALES.en
  const name = (key: string, content: string): HeadTag => ({ tag: 'meta', attr: 'name', key, content })
  const property = (key: string, content: string): HeadTag => ({ tag: 'meta', attr: 'property', key, content })
  return [
    name('description', meta.description),
    name('robots', meta.noindex ? 'noindex, follow' : 'index, follow'),
    { tag: 'link', rel: 'canonical', href: url },
    property('og:site_name', SITE_NAME),
    property('og:type', meta.type),
    property('og:url', url),
    property('og:title', meta.title),
    property('og:description', meta.description),
    property('og:image', image),
    property('og:image:type', 'image/png'),
    property('og:image:width', String(OG_IMAGE_WIDTH)),
    property('og:image:height', String(OG_IMAGE_HEIGHT)),
    property('og:image:alt', meta.imageAlt),
    property('og:locale', ogLocale),
    name('twitter:card', 'summary_large_image'),
    name('twitter:title', meta.title),
    name('twitter:description', meta.description),
    name('twitter:image', image),
    name('twitter:image:alt', meta.imageAlt),
  ]
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON for a `<script type="application/ld+json">`, safe against `</script>` in strings. */
export const serializeJsonLd = (data: Record<string, unknown>[]) =>
  JSON.stringify(data.length === 1 ? data[0] : data).replace(/</g, '\\u003c')

/** Static HTML for the head block, used when prerendering each route at build time. */
export function renderHead(meta: PageMeta, origin: string, lang = 'en'): string {
  const lines = [`<title>${escapeHtml(meta.title)}</title>`]
  for (const tag of headTags(meta, origin, lang)) {
    lines.push(
      tag.tag === 'link'
        ? `<link rel="${tag.rel}" href="${escapeHtml(tag.href)}" />`
        : `<meta ${tag.attr}="${tag.key}" content="${escapeHtml(tag.content)}" />`,
    )
  }
  for (const alt of Object.values(OG_LOCALES).filter((l) => l !== OG_LOCALES[lang])) {
    lines.push(`<meta property="og:locale:alternate" content="${alt}" />`)
  }
  if (meta.jsonLd.length) {
    lines.push(`<script type="application/ld+json" id="seo-jsonld">${serializeJsonLd(meta.jsonLd)}</script>`)
  }
  return lines.join('\n    ')
}

export function renderSitemap(origin: string, lastmod: string): string {
  const urls = sitemapPaths()
    .map((p) => `  <url>\n    <loc>${escapeHtml(absoluteUrl(origin, p))}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

/** Paths crawlers should not fetch: the personal dashboard and the JSON API. */
export const ROBOTS_DISALLOW = ['/account', '/api/']

export function renderRobots(origin: string): string {
  const disallow = ROBOTS_DISALLOW.map((p) => `Disallow: ${p}\n`).join('')
  return `User-agent: *\nAllow: /\n${disallow}\nSitemap: ${absoluteUrl(origin, '/sitemap.xml')}\n`
}

/** Look up a dotted key in a translation object; used where i18next is not running (the build). */
export function translatorFor(strings: object): Translate {
  return (key) => {
    const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], strings)
    return typeof value === 'string' ? value : key
  }
}
