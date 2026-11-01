import { describe, expect, it } from 'vitest'
import en from './en'
import uz from './uz'
import ru from './ru'

/**
 * en.ts is the source of truth. Every other locale must contain every key from it, with the same
 * shape (string vs. nested object), the same {{placeholders}}, and a non-empty value wherever
 * en has one (planned experiments deliberately leave `intro` empty in every language).
 *
 * i18next plural keys (`name_one`, `name_other`, …) are compared per plural group: a locale must
 * provide each form its language needs according to Intl.PluralRules (Russian needs `_few` and
 * `_many` too), so those extra forms are not reported as extra keys.
 */

type Tree = { [key: string]: unknown }

const PLURAL_SUFFIX = /^(.*)_(zero|one|two|few|many|other)$/

/** Flattens a translation tree into dotted paths, keeping both leaves and the objects above them. */
function flatten(tree: Tree, prefix = '', out = new Map<string, unknown>()): Map<string, unknown> {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    out.set(path, value)
    if (isTree(value)) flatten(value, path, out)
  }
  return out
}

function isTree(value: unknown): value is Tree {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parentOf(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot < 0 ? '' : path.slice(0, dot)
}

function kind(value: unknown): string {
  if (isTree(value)) return 'object'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(/\{\{\s*([\w.-]+)[^}]*\}\}/g)].map((m) => m[1]))].sort()
}

interface LocaleReport {
  /** Keys present in en but absent from the locale. */
  missing: string[]
  /** Keys whose type differs from en, e.g. a string where en has a nested object. */
  shape: string[]
  /** Strings that are empty or whitespace only although the English string is not. */
  empty: string[]
  /** Strings whose {{placeholders}} differ from the English string. */
  interpolation: string[]
  /** Keys in the locale that en does not have. */
  extra: string[]
}

function compareLocale(source: Tree, target: Tree, lang: string): LocaleReport {
  const src = flatten(source)
  const tgt = flatten(target)
  const forms = new Intl.PluralRules(lang).resolvedOptions().pluralCategories

  // Expected key in the target -> the English value it must match.
  const expected = new Map<string, unknown>()
  for (const [path, value] of src) {
    const plural = typeof value === 'string' ? PLURAL_SUFFIX.exec(path) : null
    if (!plural) {
      expected.set(path, value)
      continue
    }
    const base = plural[1]
    const reference = src.get(`${base}_other`) ?? value
    for (const form of forms) if (!expected.has(`${base}_${form}`)) expected.set(`${base}_${form}`, reference)
  }

  const report: LocaleReport = { missing: [], shape: [], empty: [], interpolation: [], extra: [] }

  for (const [path, want] of expected) {
    if (!tgt.has(path)) {
      // Report only the top-most missing key; a parent with the wrong type is a shape error.
      const parent = parentOf(path)
      if (!parent || isTree(tgt.get(parent))) report.missing.push(path)
      continue
    }
    const got = tgt.get(path)
    if (kind(got) !== kind(want)) {
      report.shape.push(`${path}: expected ${kind(want)}, got ${kind(got)}`)
      continue
    }
    if (typeof got !== 'string' || typeof want !== 'string') continue
    if (!got.trim() && want.trim()) report.empty.push(path)
    const a = placeholders(want).join(', ')
    const b = placeholders(got).join(', ')
    if (a !== b) report.interpolation.push(`${path}: expected {{${a}}}, got {{${b}}}`)
  }

  for (const path of tgt.keys()) {
    if (expected.has(path)) continue
    const parent = parentOf(path)
    if (!parent || expected.has(parent)) report.extra.push(path)
  }

  return report
}

const LOCALES = [
  { lang: 'uz', name: 'uz.ts', messages: uz },
  { lang: 'ru', name: 'ru.ts', messages: ru },
] as const

describe.each(LOCALES)('$name mirrors en.ts', ({ lang, name, messages }) => {
  const report = compareLocale(en, messages, lang)

  it('has every key from en.ts', () => {
    expect(report.missing, `${name} is missing these keys from en.ts`).toEqual([])
  })

  it('has the same shape as en.ts', () => {
    expect(report.shape, `${name} has keys whose type differs from en.ts`).toEqual([])
  })

  it('has no empty strings', () => {
    expect(report.empty, `${name} has empty translations`).toEqual([])
  })

  it('keeps the same {{placeholders}} as en.ts', () => {
    expect(report.interpolation, `${name} has placeholders that differ from en.ts`).toEqual([])
  })

  it('reports keys that en.ts does not have', () => {
    if (report.extra.length > 0) {
      console.warn(`[i18n] ${name} has keys that are not in en.ts:\n  ${report.extra.join('\n  ')}`)
    }
  })
})

describe('compareLocale', () => {
  const source = {
    a: 'A',
    blank: '',
    nested: { b: 'B {{x}}', deep: { c: 'C' } },
    items_one: '{{count}} item',
    items_other: '{{count}} items',
  }

  it('accepts a complete locale, including extra plural forms the language needs', () => {
    const target = {
      a: 'А',
      blank: '',
      nested: { b: 'Б {{x}}', deep: { c: 'В' } },
      items_one: '{{count}} штука',
      items_few: '{{count}} штуки',
      items_many: '{{count}} штук',
      items_other: '{{count}} штуки',
    }
    expect(compareLocale(source, target, 'ru')).toEqual({ missing: [], shape: [], empty: [], interpolation: [], extra: [] })
  })

  it('finds missing, mistyped, empty, mismatched and extra keys', () => {
    const target = {
      a: '',
      blank: '',
      nested: { b: 'B', deep: 'oops' },
      items_one: '{{count}} item',
      items_other: '{{count}} items',
      stray: 'S',
    }
    expect(compareLocale(source, target, 'ru')).toEqual({
      missing: ['items_few', 'items_many'],
      shape: ['nested.deep: expected object, got string'],
      empty: ['a'],
      interpolation: ['nested.b: expected {{x}}, got {{}}'],
      extra: ['stray'],
    })
  })

  it('reports a missing section once, not every key inside it', () => {
    expect(compareLocale(source, { a: 'A', blank: '', items_one: '1', items_other: '{{count}}' }, 'en').missing).toEqual(['nested'])
  })
})
