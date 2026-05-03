import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import he from './locales/he.json'
import en from './locales/en.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      he: { translation: he },
      en: { translation: en },
    },

    // Default language — Hebrew (RTL)
    lng: 'he',
    fallbackLng: 'en',

    // Direction metadata so i18n.dir() works correctly
    supportedLngs: ['he', 'en'],

    interpolation: {
      escapeValue: false, // React already handles XSS escaping
    },
  })

export default i18n
