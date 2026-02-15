/**
 * BrightChain i18n setup and configuration.
 *
 * Uses createI18nSetup factory for proper engine initialization and registers:
 * - Core component (automatic via factory)
 * - Suite Core component (via createSuiteCoreComponentPackage)
 * - ECIES component (via createEciesComponentPackage)
 * - BrightChain component (translations defined here)
 *
 * All components support translateStringKey for direct branded enum translation.
 */
import {
  createEciesComponentPackage,
  EciesStringKeyValue,
} from '@digitaldefiance/ecies-lib';
import {
  BrandedMasterStringsCollection,
  ComponentConfig,
  ContextManager,
  CoreLanguageCode,
  createI18nSetup,
  GlobalActiveContext,
  I18nEngine,
  IActiveContext,
  LanguageCodes,
  LanguageContextSpace,
  type I18nComponentPackage,
  type I18nSetupResult,
} from '@digitaldefiance/i18n-lib';
import {
  createSuiteCoreComponentPackage,
  SuiteCoreComponentId,
  SuiteCoreStringKeyValue,
} from '@digitaldefiance/suite-core-lib';
import type { ISuiteCoreI18nConstants } from '@digitaldefiance/suite-core-lib/src/interfaces/i18n-constants';
import { CONSTANTS, CoreConstants } from '../constants';
import type { BrightChainStringKeyValue } from '../enumerations/brightChainStrings';
import {
  BrightChainComponentId,
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import type { IBrightChainI18nConstants } from '../interfaces/i18nConstants';
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

// Re-export BrightChainComponentId for backward compatibility
export { BrightChainComponentId };

/**
 * Master strings collection for the BrightChain component.
 * These are the translations specific to brightchain-lib.
 */
export const BrightChainComponentStrings: BrandedMasterStringsCollection<
  typeof BrightChainStrings,
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
 * Create BrightChain component configuration
 */
export function createBrightChainComponentConfig(): ComponentConfig {
  return {
    id: BrightChainComponentId,
    strings: BrightChainComponentStrings,
    aliases: ['BrightChainStrings'],
  };
}

/**
 * Creates an I18nComponentPackage bundling the BrightChain ComponentConfig
 * with its branded string key enum. Use this with createI18nSetup's
 * libraryComponents array.
 */
export function createBrightChainComponentPackage(): I18nComponentPackage {
  return {
    config: createBrightChainComponentConfig(),
    stringKeyEnum: BrightChainStrings,
    constants: CONSTANTS as IBrightChainI18nConstants,
  };
}

let _brightChainI18nEngine: I18nEngine | null = null;
let _i18nSetupResult: I18nSetupResult<typeof BrightChainStrings> | null = null;

/**
 * Get or create the BrightChain i18n engine.
 *
 * Uses createI18nSetup factory which handles:
 * - Engine creation/reuse (idempotent via instanceKey 'default')
 * - Core component registration (automatic)
 * - Library component registration (SuiteCore, ECIES)
 * - BrightChain component and branded enum registration
 * - GlobalActiveContext initialization
 */
export function getBrightChainI18nEngine(): I18nEngine {
  if (_brightChainI18nEngine && I18nEngine.hasInstance('default')) {
    return _brightChainI18nEngine;
  }

  const result = createI18nSetup({
    componentId: BrightChainComponentId,
    stringKeyEnum: BrightChainStrings,
    strings: BrightChainComponentStrings,
    aliases: ['BrightChainStrings'],
    constants: CONSTANTS as IBrightChainI18nConstants,
    libraryComponents: [
      createSuiteCoreComponentPackage(),
      createEciesComponentPackage(),
    ],
  });

  _brightChainI18nEngine = result.engine as I18nEngine;
  _i18nSetupResult = result;

  // Override SuiteCore default constants (Site: 'New Site', etc.) with
  // BrightChain values (Site: 'BrightChain', etc.) so that template
  // variables like {Site} in Common_SiteTemplate resolve correctly.
  const suiteCoreOverrides: ISuiteCoreI18nConstants = {
    Site: CoreConstants.Site,
    SiteTagline: CoreConstants.SiteTagline,
    SiteDescription: CoreConstants.SiteDescription,
    SiteEmailDomain: CoreConstants.SiteEmailDomain,
    SiteHostname: CoreConstants.SiteHostname,
    EmailTokenResendIntervalMinutes:
      CoreConstants.EmailTokenResendIntervalMinutes,
  };
  result.updateConstants(SuiteCoreComponentId, suiteCoreOverrides);

  return _brightChainI18nEngine;
}

/**
 * Reset the engine instance (useful for testing)
 */
export function resetBrightChainI18nEngine(): void {
  if (_i18nSetupResult) {
    _i18nSetupResult.reset();
  }
  _brightChainI18nEngine = null;
  _i18nSetupResult = null;
}

// Export the engine instance for backward compatibility
// Use getBrightChainI18nEngine() for new code
export const i18nEngine = getBrightChainI18nEngine();
export { i18nEngine as pluginI18nEngine };

// Get global context instance
const globalContext = GlobalActiveContext.getInstance<
  CoreLanguageCode,
  IActiveContext<CoreLanguageCode>
>();

// Create dynamic context that uses GlobalActiveContext
export const i18nContext: IActiveContext<CoreLanguageCode> = {
  get language() {
    return globalContext.getContext(BrightChainComponentId).language;
  },
  get adminLanguage() {
    return globalContext.getContext(BrightChainComponentId).adminLanguage;
  },
  get currentContext() {
    return globalContext.getContext(BrightChainComponentId).currentContext;
  },
  get currencyCode() {
    return globalContext.getContext(BrightChainComponentId).currencyCode;
  },
  get timezone() {
    return globalContext.getContext(BrightChainComponentId).timezone;
  },
  get adminTimezone() {
    return globalContext.getContext(BrightChainComponentId).adminTimezone;
  },
};

/**
 * Translate any registered branded string key.
 * Works with EciesStringKey, SuiteCoreStringKey, BrightChainStrings.
 *
 * The engine's built-in browser-safe fallback handles Symbol mismatch
 * in bundled environments (Vite/webpack) automatically — no manual
 * component lookup needed.
 */
export function translateStringKey(
  stringKey: RegisteredStringKey,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
): string {
  return getBrightChainI18nEngine().translateStringKey(
    stringKey,
    variables,
    language,
  );
}

/**
 * Safe translation helper that returns a placeholder on failure.
 * Works with any registered branded string key.
 */
export function safeTranslateStringKey(
  stringKey: RegisteredStringKey,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
): string {
  return getBrightChainI18nEngine().safeTranslateStringKey(
    stringKey,
    variables,
    language,
  );
}

// Legacy aliases for backward compatibility
export const getBrightChainTranslation = translateStringKey;
export const safeGetBrightChainTranslation = safeTranslateStringKey;

/**
 * Legacy translate function for backward compatibility.
 * Prefer getBrightChainTranslation() for new code.
 */
export const translate = (
  name: BrightChainStringKey,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
  context?: LanguageContextSpace,
): string => {
  const activeContext =
    context ?? globalContext.getContext(BrightChainComponentId).currentContext;
  const lang =
    language ??
    (activeContext === 'admin'
      ? globalContext.getContext(BrightChainComponentId).adminLanguage
      : globalContext.getContext(BrightChainComponentId).language);

  return getBrightChainI18nEngine().translate(
    BrightChainComponentId,
    name,
    variables,
    lang,
  );
};

/**
 * Helper function to translate core strings
 */
export const translateCore = (
  key: string,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
): string => {
  const lang =
    language ?? globalContext.getContext(BrightChainComponentId).language;
  return getBrightChainI18nEngine().translate(
    SuiteCoreComponentId,
    key,
    variables,
    lang,
  );
};

// Context manager for change notifications
export const contextManager = new ContextManager();

// Language management helpers
export const setLanguage = (language: CoreLanguageCode) => {
  globalContext.setUserLanguage(language, BrightChainComponentId);
  getBrightChainI18nEngine().setLanguage(language);
};

export const setAdminLanguage = (language: CoreLanguageCode) => {
  globalContext.setAdminLanguage(language, BrightChainComponentId);
};

export const setContext = (context: LanguageContextSpace) => {
  globalContext.setLanguageContextSpace(context, BrightChainComponentId);
};

export const getLanguage = (): CoreLanguageCode => {
  return globalContext.getContext(BrightChainComponentId).language;
};

export const getAdminLanguage = (): CoreLanguageCode => {
  return globalContext.getContext(BrightChainComponentId).adminLanguage;
};

// Re-export for convenience
export { BrightChainStrings };
export type { BrightChainStringKey, BrightChainStringKeyValue };

/**
 * Union type of all registered branded string keys.
 * Use this for type-safe translation calls.
 */
export type RegisteredStringKey =
  | BrightChainStringKeyValue
  | EciesStringKeyValue
  | SuiteCoreStringKeyValue;

// Re-export i18n constants interface
export type { IBrightChainI18nConstants } from '../interfaces/i18nConstants';
