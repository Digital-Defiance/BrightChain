/**
 * Property-based tests for BrightMail i18n correctness
 * Feature: brightmail-frontend
 */

import fc from 'fast-check';
import {
  BrightChainStringKey,
  BrightChainStrings,
} from '../enumerations/brightChainStrings';
import { BritishEnglishStrings } from './strings/englishUK';
import { AmericanEnglishStrings } from './strings/englishUs';
import { FrenchStrings } from './strings/french';
import { GermanStrings } from './strings/german';
import { JapaneseStrings } from './strings/japanese';
import { MandarinStrings } from './strings/mandarin';
import { SpanishStrings } from './strings/spanish';
import { UkrainianStrings } from './strings/ukrainian';

describe('Feature: brightmail-frontend, Property Tests', () => {
  const allLanguages = [
    { name: 'English (US)', translations: AmericanEnglishStrings },
    { name: 'English (UK)', translations: BritishEnglishStrings },
    { name: 'French', translations: FrenchStrings },
    { name: 'Mandarin', translations: MandarinStrings },
    { name: 'Spanish', translations: SpanishStrings },
    { name: 'Ukrainian', translations: UkrainianStrings },
    { name: 'German', translations: GermanStrings },
    { name: 'Japanese', translations: JapaneseStrings },
  ];

  const brightMailKeys = Object.values(BrightChainStrings).filter(
    (key) => key.startsWith('BrightMail_'),
  );

  /**
   * Property 1: I18n Translation Completeness
   * For any BrightMail string key (prefixed with `BrightMail_`) in the
   * `BrightChainStrings` enum, there SHALL exist a non-empty translation
   * string in each of the 8 supported language files (en-US, en-GB, fr,
   * zh-CN, es, uk, de, ja).
   *
   * **Validates: Requirements 1.4, 4.7, 7.2**
   */
  it('Property 1: I18n Translation Completeness', () => {
    expect(brightMailKeys.length).toBeGreaterThanOrEqual(28);

    fc.assert(
      fc.property(
        fc.constantFrom(...brightMailKeys),
        (key: BrightChainStringKey) => {
          const missingLanguages: string[] = [];

          for (const lang of allLanguages) {
            const translation = lang.translations[key];
            if (!translation || translation.trim() === '') {
              missingLanguages.push(lang.name);
            }
          }

          if (missingLanguages.length > 0) {
            return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
