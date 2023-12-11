import { LanguageCode } from '@digitaldefiance/i18n-lib';

/**
 * Language context for internationalization
 *
 * @remarks
 * This interface provides the current language setting for the application,
 * used by i18n services to determine which translations to use.
 *
 * @example
 * ```typescript
 * const context: ILanguageContext = {
 *   language: LanguageCode.EN_US
 * };
 * ```
 */
export interface ILanguageContext {
  /** The current language code for the application */
  language: LanguageCode;
}
