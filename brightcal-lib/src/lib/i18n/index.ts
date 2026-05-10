/**
 * BrightCal i18n setup and configuration.
 *
 * Provides a translate function and component package for registration
 * with the BrightChain i18n engine. Follows the same pattern as
 * brightchain-lib/src/lib/i18n/i18n-setup.ts.
 */
import {
  ComponentConfig,
  CoreLanguageCode,
  LanguageCodes,
  RequiredBrandedMasterStringsCollection,
  type I18nComponentPackage,
} from '@digitaldefiance/i18n-lib';
import {
  BrightCalComponentId,
  BrightCalStringKey,
  BrightCalStrings,
} from '../enumerations/brightCalStrings';
import {
  AmericanEnglishStrings,
  BritishEnglishStrings,
  FrenchStrings,
  GermanStrings,
  JapaneseStrings,
  MandarinStrings,
  SpanishStrings,
  UkrainianStrings,
} from './strings';

export { BrightCalComponentId };

/**
 * Master strings collection for the BrightCal component.
 * All languages currently fall back to American English.
 * Replace individual entries with proper translations as they become available.
 */
export const BrightCalComponentStrings: RequiredBrandedMasterStringsCollection<
  typeof BrightCalStrings,
  CoreLanguageCode
> = {
  [LanguageCodes.EN_US]: AmericanEnglishStrings,
  [LanguageCodes.EN_GB]: BritishEnglishStrings,
  [LanguageCodes.FR]: FrenchStrings,
  [LanguageCodes.ZH_CN]: MandarinStrings,
  [LanguageCodes.ES]: SpanishStrings,
  [LanguageCodes.UK]: UkrainianStrings,
  [LanguageCodes.DE]: GermanStrings,
  [LanguageCodes.JA]: JapaneseStrings,
};

/**
 * Create BrightCal component configuration.
 */
export function createBrightCalComponentConfig(): ComponentConfig {
  return {
    id: BrightCalComponentId,
    strings: BrightCalComponentStrings,
    aliases: ['BrightCalStrings'],
  };
}

/**
 * Creates an I18nComponentPackage bundling the BrightCal ComponentConfig
 * with its branded string key enum. Use this with registerI18nComponentPackage()
 * from brightchain-lib to register BrightCal translations at app startup.
 */
export function createBrightCalComponentPackage(): I18nComponentPackage {
  return {
    config: createBrightCalComponentConfig(),
    stringKeyEnum: BrightCalStrings,
  };
}

/**
 * Simple translate function that resolves a BrightCal branded string key
 * to its English text, performing template variable substitution.
 *
 * This is a lightweight, engine-independent helper suitable for use in
 * controllers and services. For full i18n engine integration (multi-language,
 * context-aware), register the BrightCal component package with the
 * BrightChain i18n engine and use translateStringKey() instead.
 */
export function translate(
  key: BrightCalStringKey,
  variables?: Record<string, string | number>,
): string {
  const template = AmericanEnglishStrings[key];
  if (!template) {
    return String(key);
  }
  if (!variables) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    variables[name] !== undefined ? String(variables[name]) : `{${name}}`,
  );
}

// Alias
export const t = translate;

// Re-export strings and types
export { AmericanEnglishStrings, BrightCalStrings };
export type { BrightCalStringKey };
