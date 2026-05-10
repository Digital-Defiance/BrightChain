/**
 * Property-based tests for BrightMail i18n correctness
 * Feature: brightmail-frontend
 */

import fc from 'fast-check';
import {
  BrightMailStringKey,
  BrightMailStrings,
} from '../enumerations/brightMailStrings';
import { BrightMailBritishEnglishStrings } from './strings/englishUK';
import { BrightMailAmericanEnglishStrings } from './strings/englishUs';
import { BrightMailFrenchStrings } from './strings/french';
import { BrightMailGermanStrings } from './strings/german';
import { BrightMailJapaneseStrings } from './strings/japanese';
import { BrightMailMandarinStrings } from './strings/mandarin';
import { BrightMailSpanishStrings } from './strings/spanish';
import { BrightMailUkrainianStrings } from './strings/ukrainian';

describe('Feature: brightmail-frontend, Property Tests', () => {
  const allLanguages = [
    { name: 'English (US)', translations: BrightMailAmericanEnglishStrings },
    { name: 'English (UK)', translations: BrightMailBritishEnglishStrings },
    { name: 'French', translations: BrightMailFrenchStrings },
    { name: 'Mandarin', translations: BrightMailMandarinStrings },
    { name: 'Spanish', translations: BrightMailSpanishStrings },
    { name: 'Ukrainian', translations: BrightMailUkrainianStrings },
    { name: 'German', translations: BrightMailGermanStrings },
    { name: 'Japanese', translations: BrightMailJapaneseStrings },
  ];

  const brightMailKeys = Object.values(BrightMailStrings).filter(
    (v): v is BrightMailStringKey => typeof v === 'string',
  );

  /**
   * Property 1: I18n Translation Completeness
   * For any BrightMail string key in the `BrightMailStrings` enum,
   * there SHALL exist a non-empty translation string in each of the
   * 8 supported language files (en-US, en-GB, fr, zh-CN, es, uk, de, ja).
   *
   * **Validates: Requirements 1.4, 4.7, 7.2**
   */
  it('Property 1: I18n Translation Completeness', () => {
    expect(brightMailKeys.length).toBeGreaterThanOrEqual(28);

    fc.assert(
      fc.property(
        fc.constantFrom(...brightMailKeys),
        (key: BrightMailStringKey) => {
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
