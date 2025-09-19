import { CurrencyCode } from './currencyCode';
import { StringLanguages } from './enumerations/stringLanguages';
import { IActiveContext } from './interfaces/active-context';
import {
  DefaultCurrencyCode,
  DefaultLanguage,
  LanguageContext,
} from './sharedTypes';
import { Timezone } from './timezone';

export const GlobalActiveContext: IActiveContext = {
  /**
   * The language to use for translations in the user facing ui
   */
  language: DefaultLanguage,
  /**
   * The language to use for console/admin logs
   */
  adminLanguage: DefaultLanguage,
  currencyCode: new CurrencyCode(DefaultCurrencyCode),
  /**
   * The current default context for language translations
   */
  currentContext: 'user',
  /**
   * The timezone for the user facing UI
   */
  timezone: new Timezone('UTC'),
  /**
   * The timezone for the admin console
   */
  adminTimezone: new Timezone('UTC'),
};

/**
 * Sets the admin language for console operations
 * @param language The language to set for admin operations
 */
export function setAdminLanguage(language: StringLanguages): void {
  GlobalActiveContext.adminLanguage = language;
}

/**
 * Sets the language context for the current context
 * @param context The language context to set
 */
export function setLanguageContext(context: LanguageContext): void {
  GlobalActiveContext.currentContext = context;
}

export function setTimezone(tz: Timezone): void {
  GlobalActiveContext.timezone = tz;
}

export function setAdminTimezone(tz: Timezone): void {
  GlobalActiveContext.adminTimezone = tz;
}
