// src/i18n.ts
/* eslint-disable @nx/enforce-module-boundaries */
import { LanguageCodes, getCoreLanguageCodes } from '@digitaldefiance/i18n-lib';
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
      fallbackLng: LanguageCodes.EN_US,
      debug: environment.debugI18n,
      interpolation: {
        escapeValue: false, // not needed for React
      },
      supportedLngs: getCoreLanguageCodes(),
      backend: {
        loadPath: '/api/i18n/{{lng}}',
      },
    });
})();

export default i18n;
