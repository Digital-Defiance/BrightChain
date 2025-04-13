/**
 * String language codes - re-exported from i18n-lib for backward compatibility
 * @deprecated Use LanguageCodes from '@digitaldefiance/i18n-lib' instead
 */
import { LanguageCodes } from '@digitaldefiance/i18n-lib';

/**
 * @deprecated Use LanguageCodes from '@digitaldefiance/i18n-lib' instead
 */
export const StringLanguages = {
  EnglishUS: LanguageCodes.EN_US,
  EnglishGB: LanguageCodes.EN_GB,
  French: LanguageCodes.FR,
  Spanish: LanguageCodes.ES,
  German: LanguageCodes.DE,
  ChineseSimplified: LanguageCodes.ZH_CN,
  Japanese: LanguageCodes.JA,
  Ukrainian: LanguageCodes.UK,
} as const;

/**
 * @deprecated Use LanguageCode from '@digitaldefiance/i18n-lib' instead
 */
export type StringLanguages = (typeof StringLanguages)[keyof typeof StringLanguages];

// Also export as StringLanguage (singular) for API lib compatibility
export type StringLanguage = StringLanguages;
export const StringLanguage = StringLanguages;
