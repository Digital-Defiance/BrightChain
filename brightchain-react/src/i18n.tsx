// src/i18n.ts
import { LanguageCodes, StringLanguages } from '@brightchain/brightchain-lib';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { environment } from './environments/environment';

(async () => {
  await i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: LanguageCodes[StringLanguages.EnglishUS],
      debug: environment.debugI18n,
      interpolation: {
        escapeValue: false, // not needed for React
      },
      supportedLngs: Object.values(StringLanguages).map(
        (lang) => LanguageCodes[lang],
      ),
      backend: {
        loadPath: '/api/i18n/{{lng}}',
      },
    });
})();

export default i18n;
