import { describe, expect, it } from 'vitest'
import en from './en'
import uz from './uz'
import ru from './ru'

/**
 * Translations are rendered with `escapeValue: false` (React escapes text
 * itself) and some go through <Trans>, which turns tags into elements. So a
 * translation string must never carry markup that could run script: only the
 * <b>…</b> tag that the <Trans> calls map to a component is allowed, and
 * nothing that looks like a script URL, event handler or HTML entity trick.
 */

const ALLOWED_TAGS = new Set(['b'])

const DANGEROUS: [string, RegExp][] = [
  ['<script', /<\s*script/i],
  ['javascript: URL', /javascript\s*:/i],
  ['data:text/html URL', /data\s*:\s*text\/html/i],
  ['vbscript: URL', /vbscript\s*:/i],
  ['inline event handler', /\bon[a-z]+\s*=/i],
  ['HTML entity', /&(#x?[0-9a-f]+|[a-z]+);/i],
  ['HTML comment', /<!--/],
  ['style attribute', /\bstyle\s*=/i],
]

function strings(tree: unknown, path = ''): [string, string][] {
  if (typeof tree === 'string') return [[path, tree]]
  if (!tree || typeof tree !== 'object') return []
  return Object.entries(tree).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k))
}

const LOCALES = { en, uz, ru }

describe.each(Object.entries(LOCALES))('%s translations are free of injected markup', (_name, locale) => {
  const all = strings(locale)

  it('has strings to check', () => {
    expect(all.length).toBeGreaterThan(100)
  })

  it.each(DANGEROUS)('contains no %s', (_label, pattern) => {
    expect(all.filter(([, s]) => pattern.test(s)).map(([p]) => p)).toEqual([])
  })

  it('uses only allowed, attribute-free tags, properly paired', () => {
    const problems: string[] = []
    for (const [path, s] of all) {
      for (const m of s.matchAll(/<\s*(\/?)\s*([a-zA-Z0-9-]*)([^>]*)>/g)) {
        const [, , tag, attrs] = m
        if (!ALLOWED_TAGS.has(tag.toLowerCase())) problems.push(`${path}: <${tag}>`)
        else if (attrs.trim()) problems.push(`${path}: attributes on <${tag}>`)
      }
      const opens = (s.match(/<b>/g) ?? []).length
      const closes = (s.match(/<\/b>/g) ?? []).length
      if (opens !== closes) problems.push(`${path}: unbalanced <b>`)
      // A stray "<" followed by a letter would start a tag in an HTML context.
      if (/<(?![/]?b>)[a-zA-Z!/?]/.test(s)) problems.push(`${path}: stray "<"`)
    }
    expect(problems).toEqual([])
  })
})
