import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import type { Language } from '../api/types'
import en from './locales/en.json'
import kk from './locales/kk.json'
import ru from './locales/ru.json'

export const LANGUAGES: Language[] = ['kk', 'ru', 'en']
const STORAGE_KEY = 'ustaz_language'

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

function savedLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // Storage unavailable: fall back to Russian.
  }
  return 'ru'
}

i18n.on('languageChanged', (lang) => {
  document.documentElement.lang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // The choice then lasts until reload.
  }
})

void i18n.use(initReactI18next).init({
  resources: { kk: { translation: kk }, ru: { translation: ru }, en: { translation: en } },
  lng: savedLanguage(),
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18n.language

export default i18n
