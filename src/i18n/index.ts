import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'
import uz from './locales/uz'
import ru from './locales/ru'

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'uz', label: "O'zbekcha", short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['code']

const LANG_KEY = 'edulab-lang'

function initialLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved as LanguageCode
  } catch {
    /* storage unavailable */
  }
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, uz: { translation: uz }, ru: { translation: ru } },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

const syncHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}
syncHtmlLang(i18n.language)

i18n.on('languageChanged', (lng) => {
  syncHtmlLang(lng)
  try {
    localStorage.setItem(LANG_KEY, lng)
  } catch {
    /* ignore */
  }
})

export default i18n
