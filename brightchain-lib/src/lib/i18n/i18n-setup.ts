/**
 * BrightChain i18n setup and configuration.
 *
 * This is the single source of truth for i18n in brightchain-lib.
 * Uses I18nBuilder pattern for proper engine initialization and registers:
 * - Core component (for error messages)
 * - Suite Core component (for common UI strings)
 * - ECIES component (imported from ecies-lib - translations defined there)
 * - BrightChain component (translations defined here)
 *
 * All components support translateStringKey for direct branded enum translation.
 */
import {
  createEciesComponentConfig,
  EciesComponentId,
  EciesStringKey,
  EciesStringKeyValue,
} from '@digitaldefiance/ecies-lib';
import {
  BrandedMasterStringsCollection,
  ContextManager,
  CoreLanguageCode,
  createCoreComponentConfig,
  getCoreLanguageDefinitions,
  GlobalActiveContext,
  I18nBuilder,
  I18nEngine,
  IActiveContext,
  LanguageCodes,
  LanguageContextSpace,
} from '@digitaldefiance/i18n-lib';
import {
  createSuiteCoreComponentConfig,
  SuiteCoreComponentId,
  SuiteCoreStringKey,
  SuiteCoreStringKeyValue,
} from '@digitaldefiance/suite-core-lib';
import { CONSTANTS } from '../constants';
import type { BrightChainStringKeyValue } from '../enumerations/brightChainStrings';
import {
  BrightChainComponentId,
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
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
export function createBrightChainComponentConfig() {
  return {
    id: BrightChainComponentId,
    strings: BrightChainComponentStrings,
    aliases: ['BrightChainStrings'],
  };
}

let _brightChainI18nEngine: I18nEngine | null = null;
let _componentRegistered = false;

/**
 * Safely register a branded string key enum.
 * In browser environments (Vite), branded Symbol identity may differ across
 * pre-bundled packages, causing registerStringKeyEnum to reject valid enums.
 * Logs a warning on failure — translateStringKey has a manual fallback.
 */
function safeRegisterStringKeyEnum(
  engine: I18nEngine,
  enumObj: unknown,
  name: string,
): boolean {
  try {
    if (!engine.hasStringKeyEnum(enumObj as never)) {
      engine.registerStringKeyEnum(enumObj as never);
    }
    return true;
  } catch (e) {
    console.warn(
      `[i18n-setup] Failed to register ${name} as branded string key enum ` +
        `(likely Symbol mismatch in browser bundle). ` +
        `translateStringKey will use manual component routing as fallback.`,
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/**
 * Cached component ID lookup for browser fallback.
 * Maps raw string key values → component IDs so translateStringKey
 * can route translations even when branded enum registration fails.
 */
let _componentLookup: Map<string, string> | null = null;

function getComponentLookup(): Map<string, string> {
  if (!_componentLookup) {
    _componentLookup = new Map<string, string>();
    for (const value of Object.values(BrightChainStrings)) {
      if (typeof value === 'string') {
        _componentLookup.set(value, BrightChainComponentId);
      }
    }
    for (const value of Object.values(EciesStringKey)) {
      if (typeof value === 'string') {
        _componentLookup.set(value, EciesComponentId);
      }
    }
    for (const value of Object.values(SuiteCoreStringKey)) {
      if (typeof value === 'string') {
        _componentLookup.set(value, SuiteCoreComponentId);
      }
    }
  }
  return _componentLookup;
}

/**
 * Register the engine with all required components using I18nBuilder
 */
function registerEngine(): I18nEngine {
  const newEngine = I18nBuilder.create()
    .withLanguages(getCoreLanguageDefinitions())
    .withDefaultLanguage(LanguageCodes.EN_US)
    .withConstants(CONSTANTS)
    .withInstanceKey('default')
    .build();

  // Register Core i18n component (required for error messages)
  newEngine.register(createCoreComponentConfig());

  // Register Suite Core component (common UI strings)
  newEngine.register(createSuiteCoreComponentConfig());

  // Register ECIES component from ecies-lib (translations are defined there)
  const eciesConfig = createEciesComponentConfig();
  newEngine.register({
    ...eciesConfig,
    aliases: ['EciesStringKey'],
  });

  // Register BrightChain component (translations defined in this lib)
  newEngine.register(createBrightChainComponentConfig());

  // Register branded string key enums for translateStringKey support.
  // Done after build to avoid issues with jest.resetModules() in tests.
  // Uses safe registration — in browser bundles (Vite) the branded Symbol
  // may differ across pre-bundled packages. The translateStringKey wrapper
  // has a manual fallback for that case.
  safeRegisterStringKeyEnum(newEngine, EciesStringKey, 'EciesStringKey');
  safeRegisterStringKeyEnum(
    newEngine,
    SuiteCoreStringKey,
    'SuiteCoreStringKey',
  );
  safeRegisterStringKeyEnum(
    newEngine,
    BrightChainStrings,
    'BrightChainStrings',
  );

  return newEngine;
}

/**
 * Get or create the BrightChain i18n engine.
 *
 * This engine has Core, SuiteCore, ECIES, and BrightChain components registered,
 * allowing translateStringKey to work with both EciesStringKey and BrightChainStrings.
 */
export function getBrightChainI18nEngine(): I18nEngine {
  if (I18nEngine.hasInstance('default')) {
    _brightChainI18nEngine = I18nEngine.getInstance('default');

    // Ensure our components are registered on existing instance
    if (!_componentRegistered) {
      // Merge our constants
      _brightChainI18nEngine.mergeConstants(CONSTANTS);

      // Register Suite Core component if not present
      _brightChainI18nEngine.registerIfNotExists(
        createSuiteCoreComponentConfig(),
      );

      // Register ECIES component if not present (translations from ecies-lib)
      const eciesConfig = createEciesComponentConfig();
      _brightChainI18nEngine.registerIfNotExists({
        ...eciesConfig,
        aliases: ['EciesStringKey'],
      });

      // Register BrightChain component if not present
      _brightChainI18nEngine.registerIfNotExists(
        createBrightChainComponentConfig(),
      );

      // Register branded string key enums (safe — see safeRegisterStringKeyEnum)
      safeRegisterStringKeyEnum(
        _brightChainI18nEngine,
        EciesStringKey,
        'EciesStringKey',
      );
      safeRegisterStringKeyEnum(
        _brightChainI18nEngine,
        SuiteCoreStringKey,
        'SuiteCoreStringKey',
      );
      safeRegisterStringKeyEnum(
        _brightChainI18nEngine,
        BrightChainStrings,
        'BrightChainStrings',
      );

      _componentRegistered = true;
    }
  } else {
    _brightChainI18nEngine = registerEngine();
    _componentRegistered = true;
  }

  return _brightChainI18nEngine;
}

/**
 * Reset the engine instance (useful for testing)
 */
export function resetBrightChainI18nEngine(): void {
  _brightChainI18nEngine = null;
  _componentRegistered = false;
  _componentLookup = null;
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

// Create context for the brightchain instance
globalContext.createContext(
  LanguageCodes.EN_US,
  LanguageCodes.EN_US,
  BrightChainComponentId,
);

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
 * Tries the engine's native branded-enum routing first. If that fails
 * (e.g. in browser bundles where the branding Symbol differs across
 * pre-bundled packages), falls back to manual component ID resolution
 * via a cached value → componentId lookup.
 */
export function translateStringKey(
  stringKey: RegisteredStringKey,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
): string {
  const engine = getBrightChainI18nEngine();
  try {
    return engine.translateStringKey(stringKey, variables, language);
  } catch {
    // Fallback: resolve component ID manually from enum value tables
    const componentId =
      getComponentLookup().get(stringKey as string) ?? BrightChainComponentId;
    return engine.translate(
      componentId,
      stringKey as string,
      variables,
      language,
    );
  }
}

/**
 * Safe translation helper that returns a placeholder on failure.
 * Works with any registered branded string key.
 * Uses the same fallback strategy as translateStringKey.
 */
export function safeTranslateStringKey(
  stringKey: RegisteredStringKey,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
): string {
  const engine = getBrightChainI18nEngine();
  try {
    return engine.safeTranslateStringKey(stringKey, variables, language);
  } catch {
    // Fallback: resolve component ID manually
    const componentId =
      getComponentLookup().get(stringKey as string) ?? BrightChainComponentId;
    return engine.safeTranslate(
      componentId,
      stringKey as string,
      variables,
      language,
    );
  }
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
