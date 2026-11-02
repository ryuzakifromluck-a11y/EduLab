/** Text authored side by side in every UI language (same pattern as the quiz content). */
export type Localized = Record<'en' | 'uz' | 'ru', string>

export type LocaleId = keyof Localized

/** Resolves a localized string, falling back to English for unknown languages. */
export function pick(text: Localized, lang: string): string {
  const base = lang.slice(0, 2) as LocaleId
  return text[base] ?? text.en
}
