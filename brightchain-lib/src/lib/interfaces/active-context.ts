import { LanguageCodes, Timezone } from '@digitaldefiance/i18n-lib';
import { CurrencyCode } from '../currencyCode';
// Temporary interface until LanguageContext is available
interface LanguageContext {
  language: string;
  region?: string;
}

/**
 * Type representing the language code values from the i18n-lib
 */
type LanguageCodeValue = (typeof LanguageCodes)[keyof typeof LanguageCodes];

export interface IActiveContext {
  /**
   * The default language for the user facing application
   */
  language: LanguageCodeValue;
  /**
   * The default language for the admin interface
   */
  adminLanguage: LanguageCodeValue;
  /**
   * The default currency code for the user facing application
   */
  currencyCode: CurrencyCode;
  /**
   * The default language context for the current context
   */
  currentContext: LanguageContext;
  /**
   * The default timezone for the user facing application
   */
  timezone: Timezone;
  /**
   * The default timezone for the admin interface
   */
  adminTimezone: Timezone;
}
