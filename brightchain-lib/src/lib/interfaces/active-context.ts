import { CurrencyCode } from '../currency-code';
import { StringLanguages } from '../enumerations/stringLanguages';
import { LanguageContext } from '../sharedTypes';
import { Timezone } from '../timezone';

export interface IActiveContext {
  /**
   * The default language for the user facing application
   */
  language: StringLanguages;
  /**
   * The default language for the admin interface
   */
  adminLanguage: StringLanguages;
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
