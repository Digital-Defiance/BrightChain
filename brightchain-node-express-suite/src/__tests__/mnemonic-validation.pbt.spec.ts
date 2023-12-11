/**
 * Property-Based Tests: Mnemonic format validation against MnemonicRegex
 *
 * Feature: user-provided-mnemonic-brightchain, Property 2: Mnemonic format validation against MnemonicRegex
 *
 * Tests that `validateRegistration` produces a mnemonic validation error if and only if
 * a `mnemonic` field is present and does not match `MnemonicRegex`.
 * When no mnemonic is present, no mnemonic-related errors should appear.
 *
 * **Validates: Requirements 2.1, 2.2, 2.4**
 */

import { Constants as BaseConstants } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';
import {
  validateRegistration,
  type IValidationError,
} from '../lib/validation/userValidation';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** A valid base payload that passes username/email/password validation */
const validBase = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'Passw0rd!',
};

/** The regex used by validateRegistration for mnemonic validation */
const MnemonicRegex = BaseConstants.MnemonicRegex;

/** Valid BIP39 word counts */
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24];

/** Check if any validation error is mnemonic-related */
function hasMnemonicError(errors: IValidationError[]): boolean {
  return errors.some((e) => e.field === 'mnemonic');
}

// ─── Generators ─────────────────────────────────────────────────────────────

/** Generate a single lowercase word (mimics BIP39 wordlist words) */
const wordArb = fc.stringMatching(/^[a-z]{3,8}$/);

/**
 * Generate a valid mnemonic: exactly N words separated by single spaces,
 * where N is one of 12, 15, 18, 21, or 24.
 */
const validMnemonicArb = fc
  .constantFrom(...VALID_WORD_COUNTS)
  .chain((count) => fc.array(wordArb, { minLength: count, maxLength: count }))
  .map((words) => words.join(' '));

/**
 * Generate an invalid mnemonic by word count: a phrase with a word count
 * that is NOT in {12, 15, 18, 21, 24}. We pick counts from 1-11, 13-14,
 * 16-17, 19-20, 22-23, 25-30.
 */
const invalidWordCountArb = fc
  .constantFrom(
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    13,
    14,
    16,
    17,
    19,
    20,
    22,
    23,
    25,
    26,
  )
  .chain((count) => fc.array(wordArb, { minLength: count, maxLength: count }))
  .map((words) => words.join(' '));

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('Property 2: Mnemonic format validation against MnemonicRegex', () => {
  /**
   * Property: When no mnemonic field is present in the request body,
   * validateRegistration should produce NO mnemonic-related errors.
   *
   * **Validates: Requirements 2.4**
   */
  it('no mnemonic field → no mnemonic-related errors', () => {
    fc.assert(
      fc.property(fc.constant(true), () => {
        const result = validateRegistration({ ...validBase });
        expect(hasMnemonicError(result.errors)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any valid mnemonic (matching MnemonicRegex),
   * validateRegistration should produce NO mnemonic-related errors.
   *
   * **Validates: Requirements 2.1**
   */
  it('valid mnemonic (matches MnemonicRegex) → no mnemonic error', () => {
    fc.assert(
      fc.property(validMnemonicArb, (mnemonic) => {
        // Sanity: our generator should produce regex-matching strings
        expect(MnemonicRegex.test(mnemonic)).toBe(true);

        const result = validateRegistration({ ...validBase, mnemonic });
        expect(hasMnemonicError(result.errors)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any mnemonic with an invalid word count (not 12/15/18/21/24),
   * validateRegistration should produce a mnemonic validation error.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('invalid word count mnemonic → mnemonic validation error', () => {
    fc.assert(
      fc.property(invalidWordCountArb, (mnemonic) => {
        // Sanity: our generator should NOT match the regex
        expect(MnemonicRegex.test(mnemonic)).toBe(false);

        const result = validateRegistration({ ...validBase, mnemonic });
        expect(hasMnemonicError(result.errors)).toBe(true);

        const mnemonicError = result.errors.find((e) => e.field === 'mnemonic');
        expect(mnemonicError?.message).toBe(
          'Invalid mnemonic format: must be 12, 15, 18, 21, or 24 words',
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: For any string, validateRegistration produces a mnemonic error
   * if and only if the mnemonic is present and does not match MnemonicRegex.
   * This is the core bidirectional property.
   *
   * **Validates: Requirements 2.1, 2.2, 2.4**
   */
  it('mnemonic error ↔ mnemonic present AND does not match MnemonicRegex', () => {
    // Test with a mix of valid mnemonics, invalid mnemonics, and absent mnemonics
    const mnemonicOrAbsentArb = fc.oneof(
      validMnemonicArb.map((m) => ({ mnemonic: m })),
      invalidWordCountArb.map((m) => ({ mnemonic: m })),
      fc.constant({}),
    );

    fc.assert(
      fc.property(mnemonicOrAbsentArb, (mnemonicPart) => {
        const body = { ...validBase, ...mnemonicPart };
        const result = validateRegistration(body);
        const hasError = hasMnemonicError(result.errors);
        const mnemonicValue = (mnemonicPart as { mnemonic?: string }).mnemonic;

        // Compute expected outcome without conditional expects
        const expectNoError =
          mnemonicValue === undefined ||
          MnemonicRegex.test(mnemonicValue.trim());

        expect(hasError).toBe(!expectNoError);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Whitespace trimming before validation ──────────────────────

/**
 * Property-Based Tests: Whitespace trimming before validation
 *
 * Feature: user-provided-mnemonic-brightchain, Property 3: Whitespace trimming before validation
 *
 * Tests that valid BIP39 mnemonics padded with arbitrary leading/trailing
 * whitespace still pass `validateRegistration` format validation.
 *
 * **Validates: Requirements 2.3**
 */
describe('Property 3: Whitespace trimming before validation', () => {
  /** Generate arbitrary whitespace (spaces, tabs, newlines) of length 1-20 */
  const whitespaceArb = fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r', '  ', '\t\t'), {
      minLength: 1,
      maxLength: 10,
    })
    .map((parts) => parts.join(''));

  /**
   * Property: For any valid BIP39 mnemonic padded with arbitrary leading
   * and/or trailing whitespace, validateRegistration should produce
   * NO mnemonic-related errors.
   *
   * **Validates: Requirements 2.3**
   */
  it('valid mnemonic with leading/trailing whitespace → no mnemonic error', () => {
    fc.assert(
      fc.property(
        validMnemonicArb,
        whitespaceArb,
        whitespaceArb,
        (mnemonic, leadingWs, trailingWs) => {
          const padded = leadingWs + mnemonic + trailingWs;

          // The padded string should differ from the original
          expect(padded).not.toBe(mnemonic);

          // But validation should still pass (trimming happens internally)
          const result = validateRegistration({
            ...validBase,
            mnemonic: padded,
          });
          expect(hasMnemonicError(result.errors)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
