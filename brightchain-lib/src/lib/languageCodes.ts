import { StringLanguages } from './enumerations/stringLanguages';
import { LanguageCodeCollection } from './sharedTypes';

export const LanguageCodes: LanguageCodeCollection = {
  [StringLanguages.EnglishUS]: 'en',
};

export const LanguageCodeValues = Object.values(LanguageCodes);

export function languageCodeToStringLanguages(
  code: string,
  fallback?: StringLanguages,
): StringLanguages {
  for (const lang of Object.values(StringLanguages)) {
    if (LanguageCodes[lang] === code) {
      return lang;
    }
  }

  return fallback ?? StringLanguages.EnglishUS;
}
