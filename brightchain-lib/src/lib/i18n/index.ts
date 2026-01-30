/**
 * BrightChain i18n using @digitaldefiance/i18n-lib
 * This provides a backward-compatible interface while using the new library under the hood
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  EciesComponentId,
  EciesStringKey,
  EciesStringKeyValue,
  getEciesI18nEngine,
} from '@digitaldefiance/ecies-lib';
import {
  LanguageCodes as I18nLanguageCodes,
  MasterStringsCollection,
  PluginI18nEngine,
} from '@digitaldefiance/i18n-lib';
import {
  SuiteCoreComponentId,
  SuiteCoreComponentStrings,
  SuiteCoreStringKey,
  SuiteCoreStringKeyValue,
} from '@digitaldefiance/suite-core-lib';

/**
 * Set of all ECIES string keys for O(1) lookup
 * This is more reliable than prefix matching since EciesStringKey
 * contains multiple prefixes (Error_ECIESError_*, Error_MemberError_*, Error_SecureStorageError_*)
 */
const eciesStringKeySet: Set<string> = new Set(Object.values(EciesStringKey));

/**
 * Set of all SuiteCore string keys for O(1) lookup
 */
const suiteCoreStringKeySet: Set<string> = new Set(
  Object.values(SuiteCoreStringKey),
);

/**
 * Set of all BrightChain string keys for O(1) lookup
 */
let brightChainStringKeySet: Set<string> | null = null;

/**
 * Get the BrightChain string key set (lazy initialization)
 */
function getBrightChainStringKeySet(): Set<string> {
  if (!brightChainStringKeySet) {
    brightChainStringKeySet = new Set(Object.values(BrightChainStrings));
  }
  return brightChainStringKeySet;
}
import { BrightChainStrings, BrightChainStringKey } from '../enumerations/brightChainStrings';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { BritishEnglishStrings } from './strings/englishUK';
import { AmericanEnglishStrings } from './strings/englishUs';
import { FrenchStrings } from './strings/french';
import { GermanStrings } from './strings/german';
import { JapaneseStrings } from './strings/japanese';
import { MandarinStrings } from './strings/mandarin';
import { SpanishStrings } from './strings/spanish';
import { UkrainianStrings } from './strings/ukrainian';

/**
 * String constants and utilities.
 */
export * from './strings';

// Note: LanguageCodes should be imported directly from @digitaldefiance/i18n-lib by consumers

/**
 * BrightChain i18n engine singleton
 */
let engine: PluginI18nEngine<BrightChainStringKey> | null = null;

/**
 * Component ID for all BrightChain strings
 */
export const BrightChainComponentId = 'brightchain.strings';

export const Strings: MasterStringsCollection<BrightChainStringKey, string> = {
  [I18nLanguageCodes.DE]: GermanStrings,
  [I18nLanguageCodes.EN_US]: AmericanEnglishStrings,
  [I18nLanguageCodes.EN_GB]: BritishEnglishStrings,
  [I18nLanguageCodes.ES]: SpanishStrings,
  [I18nLanguageCodes.FR]: FrenchStrings,
  [I18nLanguageCodes.JA]: JapaneseStrings,
  [I18nLanguageCodes.UK]: UkrainianStrings,
  [I18nLanguageCodes.ZH_CN]: MandarinStrings,
};

/**
 * Initialize the BrightChain i18n engine
 */
function initEngine(): PluginI18nEngine<BrightChainStringKey> {
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
    {
      id: I18nLanguageCodes.EN_GB,
      name: 'English (UK)',
      code: 'en-GB',
    },
    {
      id: I18nLanguageCodes.FR,
      name: 'Français',
      code: 'fr',
    },
    {
      id: I18nLanguageCodes.ES,
      name: 'Español',
      code: 'es',
    },
    {
      id: I18nLanguageCodes.DE,
      name: 'Deutsch',
      code: 'de',
    },
    {
      id: I18nLanguageCodes.ZH_CN,
      name: '中文 (简体)',
      code: 'zh-CN',
    },
    {
      id: I18nLanguageCodes.JA,
      name: '日本語',
      code: 'ja',
    },
    {
      id: I18nLanguageCodes.UK,
      name: 'Українська',
      code: 'uk',
    },
  ]);

  // Register all strings in a single component using branded enum
  engine.registerBrandedComponent({
    component: {
      id: BrightChainComponentId,
      name: 'BrightChain Strings',
      stringKeys: BrightChainStrings,
    },
    strings: Strings,
  });

  // Register SuiteCoreStringKey translations from the external library (assume branded)
  engine.registerBrandedComponent({
    component: {
      id: SuiteCoreComponentId,
      name: 'Suite Core Strings',
      stringKeys: SuiteCoreStringKey,
    },
    strings: SuiteCoreComponentStrings,
  });

  return engine;
}

/**
 * Get the BrightChain i18n engine
 */
export function getI18n(): PluginI18nEngine<BrightChainStringKey> {
  return engine || initEngine();
}

/**
 * Translate a string by StringNames key
 * Backward compatible with existing code
 * Now supports external string keys from @digitaldefiance packages
 *
 * Uses Set-based lookup for reliable enum detection instead of prefix matching,
 * since EciesStringKey contains multiple prefixes (Error_ECIESError_*,
 * Error_MemberError_*, Error_SecureStorageError_*)
 */
export function translate(
  stringName: BrightChainStringKey | SuiteCoreStringKeyValue | EciesStringKeyValue | string,
  vars?: Record<string, string | number>,
  language?: string,
): string {
  const key = String(stringName);

  // Check if it's an ECIES string key (O(1) Set lookup)
  if (eciesStringKeySet.has(key)) {
    try {
      const eciesEngine = getEciesI18nEngine();
      return eciesEngine.translate(
        EciesComponentId,
        key as EciesStringKeyValue,
        vars,
        language,
      );
    } catch (error) {
      console.warn(`ECIES translation failed for ${key}:`, error);
      return key;
    }
  }

  // Check if it's a SuiteCore string key (O(1) Set lookup)
  if (suiteCoreStringKeySet.has(key)) {
    const eng = getI18n();
    try {
      // SuiteCoreStringKey assumed branded
      return eng.translate(SuiteCoreComponentId, key as any, vars, language as any);
    } catch (error) {
      console.warn(`SuiteCore translation failed for ${key}:`, error);
      return key;
    }
  }

  // Default to BrightChain component
  const eng = getI18n();
  try {
    return eng.translate(BrightChainComponentId, key as BrightChainStringKey, vars, language as any);
  } catch (error) {
    console.warn(`Translation failed for ${key}:`, error);
    return key;
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
          throw new TranslatableBrightChainError(
            BrightChainStrings.Error_I18n_KeyConflictObjectTemplate,
            { KEY: k },
          );
        }
        current[k] = value;
      } else {
        if (!(k in current)) {
          current[k] = {};
        } else if (typeof current[k] !== 'object' || current[k] === null) {
          throw new TranslatableBrightChainError(
            BrightChainStrings.Error_I18n_KeyConflictValueTemplate,
            { KEY: k },
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
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_I18n_StringsNotFoundTemplate,
      { LANGUAGE: language },
    );
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
 */
export function registerTranslation<T extends Record<string, string | number>>(
  _enumObj: T,
  translations: Record<string, Record<T[keyof T], string>>,
): Record<string, Record<T[keyof T], string>> {
  return translations;
}

// Initialize on module load
initEngine();
