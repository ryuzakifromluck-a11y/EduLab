/**
 * Reads public/_headers (Netlify/Cloudflare Pages syntax), the single source
 * of the site's response headers, and converts its rules for Vercel.
 */
import { readFileSync } from 'node:fs'

export const HEADERS_FILE = new URL('../../public/_headers', import.meta.url)

/**
 * @param {string} text contents of a _headers file
 * @returns {{ path: string; headers: Record<string, string> }[]}
 */
export function parseHeaders(text) {
  const rules = []
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      rules.push({ path: line.trim(), headers: {} })
      continue
    }
    const rule = rules.at(-1)
    const colon = line.indexOf(':')
    if (!rule || colon < 0) throw new Error(`_headers: unexpected line "${line.trim()}"`)
    rule.headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return rules
}

export const readHeaderRules = () => parseHeaders(readFileSync(HEADERS_FILE, 'utf8'))

/** `/og/*` → `/og/(.*)`, the path-to-regexp form vercel.json uses. */
export const vercelSource = (path) => path.replace(/\*/g, '(.*)')

/** `/og/*` → `^/og/(.*)$`, the regex form the Build Output API uses. */
export const vercelRouteSrc = (path) => `^${path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '(.*)')}$`

/** The `headers` array for vercel.json. */
export const vercelJsonHeaders = (rules) =>
  rules.map((r) => ({ source: vercelSource(r.path), headers: Object.entries(r.headers).map(([key, value]) => ({ key, value })) }))
