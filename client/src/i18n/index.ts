import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr }
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      lookupLocalStorage: 'nexus_lang',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false
    },
    parseMissingKeyHandler: (key) => {
      // Professionalization: Get rid of dots in raw keys
      return key.split('.').join(' ');
    }
  });

export default i18n;
