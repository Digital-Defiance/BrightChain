/**
 * Enum Translation Types and Utilities
 *
 * Provides type-safe translation support for enumeration values.
 *
 * @module types/enumTranslation
 */

import { LanguageCodes } from '@digitaldefiance/i18n-lib';

/**
 * Type representing the language code values from the i18n-lib
 */
export type LanguageCodeValue =
  (typeof LanguageCodes)[keyof typeof LanguageCodes];

/**
 * Type representing translations for a specific enum type.
 * Maps language codes to a record of enum values to their translated strings.
 *
 * @template T - The enum type being translated
 *
 * @example
 * ```typescript
 * type MyEnumTranslation = EnumLanguageTranslation<MyEnum>;
 * const translations: MyEnumTranslation = {
 *   'en-US': {
 *     [MyEnum.Value1]: 'Value One',
 *     [MyEnum.Value2]: 'Value Two',
 *   },
 * };
 * ```
 */
export type EnumLanguageTranslation<T extends string | number> = {
  [languageCode: string]: Record<T, string>;
};

/**
 * Creates a type-safe translation object for an enum.
 *
 * This is a pass-through function that provides type checking
 * for translation objects.
 *
 * @template T - The enum type being translated
 * @param translations - The translation object mapping language codes to enum translations
 * @returns The same translation object with proper typing
 *
 * @example
 * ```typescript
 * const translations = createTranslations<MyEnum>({
 *   [LanguageCodes.EN_US]: {
 *     [MyEnum.Value1]: 'Value One',
 *     [MyEnum.Value2]: 'Value Two',
 *   },
 * });
 * ```
 */
export function createTranslations<T extends string | number>(
  translations: EnumLanguageTranslation<T>,
): EnumLanguageTranslation<T> {
  return translations;
}
