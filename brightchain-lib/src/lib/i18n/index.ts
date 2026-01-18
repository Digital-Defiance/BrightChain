/**
 * BrightChain i18n using @digitaldefiance/i18n-lib
 * This provides a backward-compatible interface while using the new library under the hood
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  LanguageCodes as I18nLanguageCodes,
  PluginI18nEngine,
} from '@digitaldefiance/i18n-lib';
import { StringNames } from '../enumerations/stringNames';
import { AmericanEnglishStrings } from '../strings/englishUs';

// Re-export language codes
export { LanguageCodes } from '@digitaldefiance/i18n-lib';

/**
 * BrightChain i18n engine singleton
 */
let engine: PluginI18nEngine<string> | null = null;

/**
 * Component ID for all BrightChain strings
 */
const BRIGHTCHAIN_STRINGS = 'brightchain.strings';

/**
 * Initialize the BrightChain i18n engine
 */
function initEngine(): PluginI18nEngine<string> {
  if (engine) {
    return engine;
  }

  engine = PluginI18nEngine.createInstance('brightchain', [
    {
      id: I18nLanguageCodes.EN_US,
      name: 'English (US)',
      code: 'en-US',
      isDefault: true,
    },
  ]);

  // Convert StringNames enum values to an array of string keys
  const stringKeys = Object.values(StringNames);

  // Convert AmericanEnglishStrings to a simple key-value object
  const translations: Record<string, string> = {};
  for (const [key, value] of Object.entries(AmericanEnglishStrings)) {
    if (value !== undefined) {
      translations[key] = value;
    }
  }

  // Register all strings in a single component
  engine.registerComponent({
    component: {
      id: BRIGHTCHAIN_STRINGS,
      name: 'BrightChain Strings',
      stringKeys,
    },
    strings: {
      [I18nLanguageCodes.EN_US]: translations,
    },
  });

  return engine;
}

/**
 * Get the BrightChain i18n engine
 */
export function getI18n(): PluginI18nEngine<string> {
  return engine || initEngine();
}

/**
 * Translate a string by StringNames key
 * Backward compatible with existing code
 */
export function translate(
  stringName: StringNames,
  vars?: Record<string, string | number>,
  language?: string,
): string {
  const eng = getI18n();
  try {
    return eng.translate(BRIGHTCHAIN_STRINGS, stringName, vars, language);
  } catch (error) {
    // Fallback to string name if translation fails
    console.warn(`Translation failed for ${stringName}:`, error);
    return stringName;
  }
}

/**
 * Short alias for translate
 */
export const t = translate;

/**
 * Translate enum value (placeholder for enum translation support)
 */
export function translateEnumValue<T extends string | number>(
  _enumObj: Record<string, string | number>,
  value: T,
  _language?: string,
): string {
  // Simple implementation - can be enhanced later
  return String(value);
}

/**
 * Build nested i18n structure (compatibility function)
 */
export const buildNestedI18n = (
  strings: Record<string, string>,
): Record<string, any> => {
  const result: Record<string, any> = {};

  Object.entries(strings).forEach(([key, value]) => {
    const keys = key.split('_');
    let current = result;

    keys.forEach((k, index) => {
      if (index === keys.length - 1) {
        if (typeof current[k] === 'object' && current[k] !== null) {
          throw new Error(
            `Key conflict detected: Cannot assign string to key '${k}' because it's already used as an object.`,
          );
        }
        current[k] = value;
      } else {
        if (!(k in current)) {
          current[k] = {};
        } else if (typeof current[k] !== 'object' || current[k] === null) {
          throw new Error(
            `Key conflict detected: Key '${k}' is assigned both a value and an object.`,
          );
        }
        current = current[k];
      }
    });
  });

  return result;
};

/**
 * Build nested i18n for a specific language (compatibility function)
 */
export const buildNestedI18nForLanguage = (language: string) => {
  if (language !== 'en-US' && language !== I18nLanguageCodes.EN_US) {
    throw new Error(`Strings not found for language: ${language}`);
  }

  // Filter out undefined values before building nested structure
  const filteredStrings: Record<string, string> = {};
  for (const [key, value] of Object.entries(AmericanEnglishStrings)) {
    if (value !== undefined) {
      filteredStrings[key] = value;
    }
  }

  return buildNestedI18n(filteredStrings);
};

/**
 * Register a translation for an enum type.
 *
 * This is a pass-through function that stores enum translations
 * and returns them for use in the application.
 *
 * @template T - The enum type being translated
 * @param _enumObj - The enum object (used for type inference)
 * @param translations - The translation object mapping language codes to enum translations
 * @returns The same translation object
 *
 * @example
 * ```typescript
 * const translations = registerTranslation(
 *   MyEnum,
 *   createTranslations({
 *     [LanguageCodes.EN_US]: {
 *       [MyEnum.Value1]: 'Value One',
 *     },
 *   }),
 * );
 * ```
 */
export function registerTranslation<
  E extends Record<string, string | number>,
  T extends E[keyof E],
>(
  _enumObj: E,
  translations: { [languageCode: string]: Record<T, string> },
): { [languageCode: string]: Record<T, string> } {
  // In the future, this could register translations with the i18n engine
  // For now, it's a pass-through that enables type-safe translation definitions
  return translations;
}

// Initialize on module load
initEngine();
