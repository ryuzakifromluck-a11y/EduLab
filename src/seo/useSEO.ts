import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { headTags, resolvePageMeta, serializeJsonLd, type HeadTag } from './meta'

/** Production origin injected by the SEO build plugin; falls back to the current origin in dev. */
const siteOrigin = () => import.meta.env.VITE_SITE_URL || window.location.origin

function upsert(tag: HeadTag) {
  const selector = tag.tag === 'link' ? `link[rel="${tag.rel}"]` : `meta[${tag.attr}="${tag.key}"]`
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) {
    el = document.createElement(tag.tag)
    if (tag.tag === 'link') el.setAttribute('rel', tag.rel)
    else el.setAttribute(tag.attr, tag.key)
    document.head.appendChild(el)
  }
  if (tag.tag === 'link') el.setAttribute('href', tag.href)
  else el.setAttribute('content', tag.content)
}

/**
 * Keeps the document title, description, canonical URL, Open Graph/Twitter
 * tags and JSON-LD in sync with the current route and language. The build
 * prerenders the same tags into static HTML for crawlers that do not run JS.
 */
export function useSEO() {
  const { pathname } = useLocation()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  useEffect(() => {
    const origin = siteOrigin()
    const meta = resolvePageMeta(pathname, (key) => t(key), origin, lang)
    document.title = meta.title
    headTags(meta, origin, lang).forEach(upsert)

    let script = document.getElementById('seo-jsonld')
    if (meta.jsonLd.length) {
      if (!script) {
        script = document.createElement('script')
        script.id = 'seo-jsonld'
        script.setAttribute('type', 'application/ld+json')
        document.head.appendChild(script)
      }
      script.textContent = serializeJsonLd(meta.jsonLd)
    } else {
      script?.remove()
    }
  }, [pathname, lang, t])
}

export function SEO() {
  useSEO()
  return null
}
