import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';
import he from './locales/he.json';

export const SUPPORTED_LANGUAGES = ['ar', 'he', 'en'];
export const RTL_LANGUAGES = ['ar', 'he'];

export function directionFor(lang) {
  return RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
}

const storedLang = localStorage.getItem('clinic_lang');
const initialLang = SUPPORTED_LANGUAGES.includes(storedLang) ? storedLang : 'ar';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    he: { translation: he },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function applyDocumentDirection(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = directionFor(lang);
}

export function changeLanguage(lang) {
  i18n.changeLanguage(lang);
  localStorage.setItem('clinic_lang', lang);
  applyDocumentDirection(lang);
}

applyDocumentDirection(initialLang);

export default i18n;
