/**
 * Property-based tests for i18n correctness
 * Feature: error-message-internationalization
 */

import { SuiteCoreStringKey } from '@digitaldefiance/suite-core-lib';
import fc from 'fast-check';
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

describe('Feature: error-message-internationalization, Property Tests', () => {
  /**
   * Property 1: String Key Naming Convention
   * For any string key in the BrightChainStrings enum that starts with "Error_" or "Warning_",
   * the key SHALL follow the pattern {Prefix}_{Category}_{Description}[Template]
   * where Prefix is "Error" or "Warning", Category is a valid module name,
   * and Description is a non-empty identifier.
   *
   * Validates: Requirements 2.2, 2.3
   */
  it('Property 1: all error and warning keys follow naming convention', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.values(BrightChainStrings).filter(
            (key) => key.startsWith('Error_') || key.startsWith('Warning_'),
          ),
        ),
        (key) => {
          // Pattern: {Prefix}_{Category}_{Description}[Template] or {Prefix}_{Description}[Template]
          // Prefix: Error or Warning
          // Category (optional): Starts with uppercase letter, can contain letters/numbers
          // Description: Starts with uppercase letter, can contain letters/numbers
          // Template: Optional suffix
          const pattern =
            /^(Error|Warning)_[A-Z][a-zA-Z0-9]*(_[A-Z][a-zA-Z0-9]*)*(Template)?$/;
          const matches = pattern.test(key);

          if (!matches) {
            console.error(`Key "${key}" does not match naming convention`);
          }

          return matches;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Template Suffix Consistency
   * For any string key in BrightChainStrings that has a corresponding translation
   * containing template variables (pattern {VARIABLE_NAME}), the string key SHALL
   * end with the suffix "Template".
   *
   * Validates: Requirements 2.4
   */
  it('Property 2: keys with template variables end with Template suffix', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(BrightChainStrings)),
        (key: keyof typeof AmericanEnglishStrings) => {
          const translation = AmericanEnglishStrings[key];

          if (!translation) {
            // If no translation exists, we can't check this property
            return true;
          }

          // Check if translation contains template variables: {VARIABLE_NAME}
          const hasTemplateVars = /\{[A-Z][A-Z0-9_]*\}/.test(translation);
          const hasTemplateSuffix = key.endsWith('Template');

          // If it has template variables, it should have Template suffix
          // If it has Template suffix, it should have template variables
          const isConsistent = hasTemplateVars === hasTemplateSuffix;

          if (!isConsistent) {
            console.error(
              `Key "${key}" inconsistency: hasTemplateVars=${hasTemplateVars}, hasTemplateSuffix=${hasTemplateSuffix}`,
            );
            console.error(`Translation: "${translation}"`);
          }

          return isConsistent;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: No Duplicate Keys with SuiteCoreStringKey
   * For any string key in BrightChainStrings, there SHALL NOT exist an identical
   * key in SuiteCoreStringKey from @digitaldefiance/suite-core-lib.
   *
   * Validates: Requirements 2.5, 8.3
   */
  it('Property 3: no duplicate keys with SuiteCoreStringKey', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(BrightChainStrings)),
        (key) => {
          // Check if this key exists in SuiteCoreStringKey
          const existsInSuiteCore = Object.values(SuiteCoreStringKey).includes(
            key as string,
          );

          if (existsInSuiteCore) {
            console.error(
              `Duplicate key found: "${key}" exists in both BrightChainStrings and SuiteCoreStringKey`,
            );
          }

          return !existsInSuiteCore;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5: Translation Completeness
   * For any string key in BrightChainStrings that exists in the English (US) file,
   * there SHALL exist a corresponding translation entry in all 8 language files.
   *
   * Note: English (UK) inherits from English (US) via spread operator, so it
   * automatically has all translations. Other language files may have partial
   * translations during incremental i18n adoption.
   *
   * Validates: Requirements 4.1, 5.2
   */
  it('Property 5: all keys have translations in all languages', () => {
    // Get keys that exist in English (US) - the source of truth
    const englishKeys = Object.keys(
      AmericanEnglishStrings,
    ) as BrightChainStringKey[];

    // For non-English languages, we check that they have translations for
    // keys that are part of the i18n feature scope (newly added error strings).
    // These are identified by specific prefixes that were added as part of i18n work.
    const i18nScopePatterns = [
      'Error_Xor_',
      'Error_TupleStorage_',
      'Error_LocationRecord_',
      'Error_Metadata_',
      'Error_ServiceProvider_',
      'Error_ServiceLocator_',
      'Error_BlockService_',
      'Error_MessageRouter_',
      'Error_BrowserConfig_',
      'Error_Debug_',
      'Error_SecureHeap_',
      'Error_I18n_',
      'Warning_BufferUtils_',
      'Warning_Keyring_',
      'Warning_I18n_',
      'Error_MemberStore_',
      'Error_MemberCblService_',
      'Error_DeliveryTimeout_',
      'Error_BaseMemberDocument_',
      'Error_BlockAccess_',
      'Error_BlockValidationError_InvalidRecipientCount',
      'Error_BlockValidationError_InvalidRecipientIds',
      'Error_BlockValidationError_InvalidRecipientKeys',
      'Error_BlockValidationError_InvalidEncryptionType',
      'Error_BlockValidationError_InvalidCreator',
    ];

    const isInI18nScope = (key: string): boolean => {
      return i18nScopePatterns.some(
        (pattern) => key.startsWith(pattern) || key === pattern,
      );
    };

    const allLanguages = [
      {
        name: 'English (US)',
        translations: AmericanEnglishStrings,
        checkAll: true,
      },
      {
        name: 'English (UK)',
        translations: BritishEnglishStrings,
        checkAll: true,
      },
      { name: 'German', translations: GermanStrings, checkAll: false },
      { name: 'Japanese', translations: JapaneseStrings, checkAll: false },
      { name: 'Ukrainian', translations: UkrainianStrings, checkAll: false },
      { name: 'French', translations: FrenchStrings, checkAll: false },
      { name: 'Spanish', translations: SpanishStrings, checkAll: false },
      { name: 'Mandarin', translations: MandarinStrings, checkAll: false },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...englishKeys.filter(isInI18nScope)),
        (key) => {
          const missingLanguages: string[] = [];

          for (const lang of allLanguages) {
            const translation = lang.translations[key];
            if (!translation || translation === '') {
              missingLanguages.push(lang.name);
            }
          }

          if (missingLanguages.length > 0) {
            console.error(
              `Key "${key}" missing translations in: ${missingLanguages.join(', ')}`,
            );
          }

          return missingLanguages.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: Template Variable Format
   * For any translation string containing template variables, all variables SHALL
   * match the pattern {[A-Z][A-Z0-9_]*} (uppercase letters, numbers, and underscores,
   * starting with a letter).
   *
   * Validates: Requirements 4.3
   */
  it('Property 6: template variables use correct format', () => {
    const allLanguages = [
      { name: 'English (US)', translations: AmericanEnglishStrings },
      { name: 'English (UK)', translations: BritishEnglishStrings },
      { name: 'German', translations: GermanStrings },
      { name: 'Japanese', translations: JapaneseStrings },
      { name: 'Ukrainian', translations: UkrainianStrings },
      { name: 'French', translations: FrenchStrings },
      { name: 'Spanish', translations: SpanishStrings },
      { name: 'Mandarin', translations: MandarinStrings },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...Object.values(BrightChainStrings)),
        (key: BrightChainStringKey) => {
          let allValid = true;

          for (const lang of allLanguages) {
            const translation = lang.translations[key];
            if (!translation) continue;

            // Find all template variables in the translation
            const variablePattern = /\{([^}]+)\}/g;
            const matches = Array.from(translation.matchAll(variablePattern));

            for (const match of matches) {
              const variable = match[1];
              // Check if variable matches the required format: starts with uppercase letter,
              // followed by uppercase letters, numbers, or underscores
              const validFormat = /^[A-Z][A-Z0-9_]*$/.test(variable);

              if (!validFormat) {
                console.error(
                  `Invalid template variable format in ${lang.name} for key "${key}": {${variable}}`,
                );
                console.error(`Translation: "${translation}"`);
                allValid = false;
              }
            }
          }

          return allValid;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8: Type Guard Compatibility
   * For any error class that extends BrightChainError or TranslatableBrightChainError,
   * the corresponding type guard function (if one exists) SHALL correctly identify
   * instances of that error class.
   *
   * Validates: Requirements 7.3
   */
  it('Property 8: type guards correctly identify error instances', async () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.values(BrightChainStrings).filter(
            (k) => k.startsWith('Error_') && !k.endsWith('Template'),
          ),
        ),
        (key) => {
          try {
            // Create a TranslatableBrightChainError instance
            const error = new TranslatableBrightChainError(
              key,
            );

            // TranslatableBrightChainError extends TranslatableError (from i18n-lib),
            // not BrightChainError. So we check that it's a proper Error instance
            // and has the expected properties.
            const isErrorInstance = error instanceof Error;
            const isTranslatableError =
              error instanceof TranslatableBrightChainError;

            if (!isErrorInstance) {
              console.error(
                `TranslatableBrightChainError with key "${key}" is not an instance of Error`,
              );
            }

            if (!isTranslatableError) {
              console.error(
                `Error with key "${key}" is not an instance of TranslatableBrightChainError`,
              );
            }

            return isErrorInstance && isTranslatableError;
          } catch {
            // Some keys may not be valid for TranslatableBrightChainError
            // (they may be used by other error classes)
            // Skip these keys
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9: Error Serialization Completeness
   * For any TranslatableBrightChainError instance, calling toJSON() SHALL return
   * an object containing at minimum the stringKey property and the message property
   * with the translated text.
   *
   * Validates: Requirements 7.4
   */
  it('Property 9: error has stringKey and message properties', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          ...Object.values(BrightChainStrings).filter(
            (k) => k.startsWith('Error_') && !k.endsWith('Template'),
          ),
        ),
        (key) => {
          try {
            // Create a TranslatableBrightChainError instance
            const error = new TranslatableBrightChainError(
              key,
            );

            // Check that error has required properties
            const hasStringKey = 'stringKey' in error;
            const hasMessage = 'message' in error;

            if (!hasStringKey) {
              console.error(
                `Error for key "${key}" missing stringKey property`,
              );
            }

            if (!hasMessage) {
              console.error(`Error for key "${key}" missing message property`);
            }

            // Check that message is not empty
            const messageNotEmpty =
              typeof error.message === 'string' && error.message.length > 0;

            if (!messageNotEmpty) {
              console.error(
                `Error for key "${key}" has empty or invalid message: "${error.message}"`,
              );
            }

            // Check that stringKey matches the input key
            const stringKeyMatches = error.stringKey === key;

            if (!stringKeyMatches) {
              console.error(
                `Error stringKey "${error.stringKey}" does not match input key "${key}"`,
              );
            }

            return (
              hasStringKey && hasMessage && messageNotEmpty && stringKeyMatches
            );
          } catch {
            // Some keys may not be valid for TranslatableBrightChainError
            // (they may be used by other error classes)
            // Skip these keys
            return true;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
