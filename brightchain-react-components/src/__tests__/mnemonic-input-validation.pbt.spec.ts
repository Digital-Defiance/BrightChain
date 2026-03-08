/**
 * Property test: Client-side mnemonic regex validation
 *
 * Tests that the MnemonicRegex accepts valid BIP39 mnemonics (12, 15, 18, 21, 24 words)
 * and rejects non-matching strings.
 *
 * Validates: Requirements 8.3
 */
import * as fc from 'fast-check';

// The actual regex from @digitaldefiance/ecies-lib Constants.MnemonicRegex
const MnemonicRegex =
  /^(?:\w+\s){11}\w+$|^(?:\w+\s){14}\w+$|^(?:\w+\s){17}\w+$|^(?:\w+\s){20}\w+$|^(?:\w+\s){23}\w+$/i;

// Sample BIP39 words for generating valid mnemonics
const BIP39_WORDS = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb',
  'abstract', 'absurd', 'abuse', 'access', 'accident', 'account', 'accuse',
  'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act', 'action',
  'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address',
  'adjust', 'admit', 'adult', 'advance', 'advice', 'aerobic', 'affair',
  'afford', 'afraid', 'again', 'age', 'agent', 'agree', 'ahead', 'aim',
  'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
];

/** Arbitrary that picks a word from the BIP39 sample list */
const bip39Word = fc.constantFrom(...BIP39_WORDS);

/** Arbitrary that generates a valid mnemonic of the given word count */
const mnemonicOfLength = (n: number) =>
  fc.tuple(...Array.from({ length: n }, () => bip39Word)).map((words) => words.join(' '));

/** Arbitrary that generates a valid mnemonic of any accepted length */
const validMnemonic = fc.oneof(
  mnemonicOfLength(12),
  mnemonicOfLength(15),
  mnemonicOfLength(18),
  mnemonicOfLength(21),
  mnemonicOfLength(24),
);

/** Valid word counts for BIP39 mnemonics */
const VALID_WORD_COUNTS = new Set([12, 15, 18, 21, 24]);

describe('Property: Client-side mnemonic regex validation', () => {
  it('accepts all valid BIP39 mnemonics (12, 15, 18, 21, 24 words)', () => {
    fc.assert(
      fc.property(validMnemonic, (mnemonic) => {
        expect(MnemonicRegex.test(mnemonic)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('rejects strings with invalid word counts', () => {
    // Generate mnemonics with word counts NOT in {12, 15, 18, 21, 24}
    const invalidWordCount = fc.integer({ min: 1, max: 30 }).filter(
      (n) => !VALID_WORD_COUNTS.has(n),
    );

    fc.assert(
      fc.property(invalidWordCount, (wordCount) => {
        const words = Array.from({ length: wordCount }, (_, i) => BIP39_WORDS[i % BIP39_WORDS.length]);
        const mnemonic = words.join(' ');
        expect(MnemonicRegex.test(mnemonic)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects empty strings', () => {
    expect(MnemonicRegex.test('')).toBe(false);
  });

  it('rejects random non-word strings', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom('!', '@', '#', '$', '%'), { minLength: 1, maxLength: 50 }),
        (chars) => {
          const s = chars.join('');
          expect(MnemonicRegex.test(s)).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('accepts valid mnemonics case-insensitively', () => {
    fc.assert(
      fc.property(validMnemonic, (mnemonic) => {
        expect(MnemonicRegex.test(mnemonic.toUpperCase())).toBe(true);
        expect(MnemonicRegex.test(mnemonic.toLowerCase())).toBe(true);
      }),
      { numRuns: 50 },
    );
  });
});
