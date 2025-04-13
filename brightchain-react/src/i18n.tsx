// src/i18n.ts
/* eslint-disable @nx/enforce-module-boundaries */
import { StringLanguages } from '@brightchain/brightchain-lib';
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
      fallbackLng: StringLanguages.EnglishUS,
      debug: environment.debugI18n,
      interpolation: {
        escapeValue: false, // not needed for React
      },
      supportedLngs: Object.values(StringLanguages),
      backend: {
        loadPath: '/api/i18n/{{lng}}',
      },
    });
})();

export default i18n;
