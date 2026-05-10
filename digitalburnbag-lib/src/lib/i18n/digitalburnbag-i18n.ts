/**
 * DigitalBurnbag i18n setup and translation helper.
 *
 * Uses createI18nSetup factory for proper engine initialization and registers
 * the DigitalBurnbag component translations.
 *
 * Usage:
 *   import { getDigitalBurnbagTranslation, DigitalBurnbagStrings } from '@digitaldefiance/digitalburnbag-lib';
 *   const msg = getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Error_AuthMissing);
 */
import {
  CoreLanguageCode,
  createI18nSetup,
  I18nEngine,
  LanguageCodes,
  type I18nSetupResult,
} from '@digitaldefiance/i18n-lib';
import type { DigitalBurnbagStringKeyValue } from '../enumerations/digitalburnbag-strings';
import {
  DigitalBurnbagComponentId,
  DigitalBurnbagStrings,
} from '../enumerations/digitalburnbag-strings';
import { DigitalBurnbagComponentStrings } from './digitalburnbag-component';

export const DigitalBurnbagI18nEngineKey = 'digitalburnbag' as const;

let _digitalBurnbagI18nEngine: I18nEngine | null = null;
let _i18nSetupResult: I18nSetupResult<typeof DigitalBurnbagStrings> | null =
  null;

/**
 * Get or create the DigitalBurnbag i18n engine.
 * Idempotent — returns the existing engine if already initialized.
 */
export function getDigitalBurnbagI18nEngine(): I18nEngine {
  if (
    _digitalBurnbagI18nEngine &&
    I18nEngine.hasInstance(DigitalBurnbagI18nEngineKey)
  ) {
    return _digitalBurnbagI18nEngine;
  }

  const result = createI18nSetup({
    instanceKey: DigitalBurnbagI18nEngineKey,
    componentId: DigitalBurnbagComponentId,
    stringKeyEnum: DigitalBurnbagStrings,
    strings: DigitalBurnbagComponentStrings,
    aliases: ['DigitalBurnbagStrings'],
    defaultLanguage: LanguageCodes.EN_US,
  });

  _digitalBurnbagI18nEngine = result.engine as I18nEngine;
  _i18nSetupResult = result;

  return _digitalBurnbagI18nEngine;
}

/**
 * Translate a DigitalBurnbag string key, optionally with template variables.
 *
 * @param key - A branded DigitalBurnbag string key
 * @param variables - Optional template variables, e.g. `{ fileId: '123' }`
 * @param language - Optional language override (defaults to EN_US)
 */
export function getDigitalBurnbagTranslation(
  key: DigitalBurnbagStringKeyValue,
  variables?: Record<string, string | number>,
  language?: CoreLanguageCode,
): string {
  return getDigitalBurnbagI18nEngine().translateStringKey(
    key,
    variables,
    language,
  );
}

/**
 * Reset the engine instance. Useful for testing.
 */
export function resetDigitalBurnbagI18nEngine(): void {
  if (_i18nSetupResult) {
    _i18nSetupResult.reset();
  }
  _digitalBurnbagI18nEngine = null;
  _i18nSetupResult = null;
}
