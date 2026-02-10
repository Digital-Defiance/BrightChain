/**
 * Property-based tests for Password Generator
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the password generator
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 1.1, 1.4, 1.5, 1.6**
 */

import fc from 'fast-check';
import {
  PasswordGenerator,
  PasswordGeneratorOptions,
} from './passwordGenerator';

/**
 * Character set constants for validation
 */
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Helper function to count characters from a specific charset in a string
 */
function countCharsFromSet(str: string, charset: string): number {
  return [...str].filter((c) => charset.includes(c)).length;
}

/**
 * Helper function to check if all characters in a string are from allowed charsets
 */
function allCharsFromAllowedSets(
  str: string,
  options: PasswordGeneratorOptions,
): boolean {
  let allowedChars = '';
  if (options.uppercase) allowedChars += UPPERCASE;
  if (options.lowercase) allowedChars += LOWERCASE;
  if (options.numbers) allowedChars += NUMBERS;
  if (options.symbols) allowedChars += SYMBOLS;

  return [...str].every((c) => allowedChars.includes(c));
}

/**
 * Arbitrary for valid password generator options
 * Ensures at least one character set is enabled and minimum counts don't exceed length
 */
const validPasswordOptionsArb = fc
  .record({
    length: fc.integer({ min: 8, max: 128 }),
    uppercase: fc.boolean(),
    lowercase: fc.boolean(),
    numbers: fc.boolean(),
    symbols: fc.boolean(),
  })
  .filter(
    (opts) => opts.uppercase || opts.lowercase || opts.numbers || opts.symbols,
  )
  .chain((baseOpts) => {
    // Calculate max possible minimum counts based on enabled sets
    const enabledSets = [
      baseOpts.uppercase,
      baseOpts.lowercase,
      baseOpts.numbers,
      baseOpts.symbols,
    ].filter(Boolean).length;

    // Each enabled set can have at most length/enabledSets minimum chars
    const maxPerSet = Math.floor(baseOpts.length / enabledSets);

    return fc.record({
      length: fc.constant(baseOpts.length),
      uppercase: fc.constant(baseOpts.uppercase),
      lowercase: fc.constant(baseOpts.lowercase),
      numbers: fc.constant(baseOpts.numbers),
      symbols: fc.constant(baseOpts.symbols),
      minUppercase: baseOpts.uppercase
        ? fc.integer({ min: 0, max: Math.min(maxPerSet, baseOpts.length) })
        : fc.constant(undefined),
      minLowercase: baseOpts.lowercase
        ? fc.integer({ min: 0, max: Math.min(maxPerSet, baseOpts.length) })
        : fc.constant(undefined),
      minNumbers: baseOpts.numbers
        ? fc.integer({ min: 0, max: Math.min(maxPerSet, baseOpts.length) })
        : fc.constant(undefined),
      minSymbols: baseOpts.symbols
        ? fc.integer({ min: 0, max: Math.min(maxPerSet, baseOpts.length) })
        : fc.constant(undefined),
    });
  })
  .filter((opts) => {
    // Ensure sum of minimums doesn't exceed length
    const minTotal =
      (opts.minUppercase || 0) +
      (opts.minLowercase || 0) +
      (opts.minNumbers || 0) +
      (opts.minSymbols || 0);
    return minTotal <= opts.length;
  });

/**
 * Property 1: Password Generation Correctness
 *
 * For any valid PasswordGeneratorOptions (length 8-128, at least one character set enabled,
 * minimum counts not exceeding length), the generated password SHALL have exactly the
 * specified length, contain at least the minimum required characters from each enabled set,
 * and only contain characters from enabled sets.
 *
 * **Validates: Requirements 1.1, 1.4, 1.5**
 */
describe('Feature: api-lib-to-lib-migration, Property 1: Password Generation Correctness', () => {
  /**
   * Property 1a: Generated password has exactly the specified length
   */
  it('Property 1a: Generated password has exactly the specified length', () => {
    fc.assert(
      fc.property(validPasswordOptionsArb, (options) => {
        const password = PasswordGenerator.generate(options);
        expect(password.length).toBe(options.length);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1b: Generated password contains at least minimum required uppercase characters
   */
  it('Property 1b: Generated password contains at least minimum required uppercase characters', () => {
    fc.assert(
      fc.property(
        validPasswordOptionsArb.filter(
          (opts) => opts.uppercase && (opts.minUppercase ?? 0) > 0,
        ),
        (options) => {
          const password = PasswordGenerator.generate(options);
          const uppercaseCount = countCharsFromSet(password, UPPERCASE);
          expect(uppercaseCount).toBeGreaterThanOrEqual(options.minUppercase!);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1c: Generated password contains at least minimum required lowercase characters
   */
  it('Property 1c: Generated password contains at least minimum required lowercase characters', () => {
    fc.assert(
      fc.property(
        validPasswordOptionsArb.filter(
          (opts) => opts.lowercase && (opts.minLowercase ?? 0) > 0,
        ),
        (options) => {
          const password = PasswordGenerator.generate(options);
          const lowercaseCount = countCharsFromSet(password, LOWERCASE);
          expect(lowercaseCount).toBeGreaterThanOrEqual(options.minLowercase!);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1d: Generated password contains at least minimum required numbers
   */
  it('Property 1d: Generated password contains at least minimum required numbers', () => {
    fc.assert(
      fc.property(
        validPasswordOptionsArb.filter(
          (opts) => opts.numbers && (opts.minNumbers ?? 0) > 0,
        ),
        (options) => {
          const password = PasswordGenerator.generate(options);
          const numbersCount = countCharsFromSet(password, NUMBERS);
          expect(numbersCount).toBeGreaterThanOrEqual(options.minNumbers!);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1e: Generated password contains at least minimum required symbols
   */
  it('Property 1e: Generated password contains at least minimum required symbols', () => {
    fc.assert(
      fc.property(
        validPasswordOptionsArb.filter(
          (opts) => opts.symbols && (opts.minSymbols ?? 0) > 0,
        ),
        (options) => {
          const password = PasswordGenerator.generate(options);
          const symbolsCount = countCharsFromSet(password, SYMBOLS);
          expect(symbolsCount).toBeGreaterThanOrEqual(options.minSymbols!);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1f: Generated password only contains characters from enabled sets
   */
  it('Property 1f: Generated password only contains characters from enabled sets', () => {
    fc.assert(
      fc.property(validPasswordOptionsArb, (options) => {
        const password = PasswordGenerator.generate(options);
        expect(allCharsFromAllowedSets(password, options)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1g: Validation rejects length less than 8
   */
  it('Property 1g: Validation rejects length less than 8', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 7 }), (length) => {
        expect(() =>
          PasswordGenerator.generate({
            length,
            uppercase: true,
          }),
        ).toThrow('Password length must be between 8 and 128');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1h: Validation rejects length greater than 128
   */
  it('Property 1h: Validation rejects length greater than 128', () => {
    fc.assert(
      fc.property(fc.integer({ min: 129, max: 500 }), (length) => {
        expect(() =>
          PasswordGenerator.generate({
            length,
            uppercase: true,
          }),
        ).toThrow('Password length must be between 8 and 128');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1i: Validation rejects when no character set is enabled
   */
  it('Property 1i: Validation rejects when no character set is enabled', () => {
    fc.assert(
      fc.property(fc.integer({ min: 8, max: 128 }), (length) => {
        expect(() =>
          PasswordGenerator.generate({
            length,
            uppercase: false,
            lowercase: false,
            numbers: false,
            symbols: false,
          }),
        ).toThrow('At least one character set must be enabled');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1j: Validation rejects when minimum counts exceed length
   */
  it('Property 1j: Validation rejects when minimum counts exceed length', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 32 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (length, minUpper, minLower) => {
          // Only test when sum exceeds length
          fc.pre(minUpper + minLower > length);

          expect(() =>
            PasswordGenerator.generate({
              length,
              uppercase: true,
              lowercase: true,
              minUppercase: minUpper,
              minLowercase: minLower,
            }),
          ).toThrow('Sum of minimum counts exceeds password length');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1k: Generated passwords are different on successive calls
   * (with high probability for reasonable lengths)
   */
  it('Property 1k: Generated passwords are different on successive calls', () => {
    fc.assert(
      fc.property(validPasswordOptionsArb, (options) => {
        const password1 = PasswordGenerator.generate(options);
        const password2 = PasswordGenerator.generate(options);

        // With cryptographically secure randomness and reasonable length,
        // two passwords should be different with overwhelming probability
        expect(password1).not.toBe(password2);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 2: Password Shuffle Uniformity
 *
 * For any password generation with multiple character sets, running the generator
 * many times (1000+) should produce passwords where each position has roughly
 * uniform distribution of characters from the combined charset.
 *
 * **Validates: Requirements 1.6**
 */
describe('Feature: api-lib-to-lib-migration, Property 2: Password Shuffle Uniformity', () => {
  /**
   * Property 2a: Character positions show uniform distribution across multiple generations
   *
   * This test generates many passwords and checks that each position has a reasonable
   * distribution of character types. We use chi-squared-like analysis to verify
   * that the Fisher-Yates shuffle produces uniform distribution.
   */
  it('Property 2a: Character positions show uniform distribution across multiple generations', () => {
    const options: PasswordGeneratorOptions = {
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      minUppercase: 2,
      minLowercase: 2,
      minNumbers: 2,
      minSymbols: 2,
    };

    const iterations = 1000;
    const positionCounts: Array<{
      uppercase: number;
      lowercase: number;
      numbers: number;
      symbols: number;
    }> = [];

    // Initialize position counts
    for (let i = 0; i < options.length; i++) {
      positionCounts.push({
        uppercase: 0,
        lowercase: 0,
        numbers: 0,
        symbols: 0,
      });
    }

    // Generate many passwords and count character types at each position
    for (let i = 0; i < iterations; i++) {
      const password = PasswordGenerator.generate(options);
      for (let pos = 0; pos < password.length; pos++) {
        const char = password[pos];
        if (UPPERCASE.includes(char)) {
          positionCounts[pos].uppercase++;
        } else if (LOWERCASE.includes(char)) {
          positionCounts[pos].lowercase++;
        } else if (NUMBERS.includes(char)) {
          positionCounts[pos].numbers++;
        } else if (SYMBOLS.includes(char)) {
          positionCounts[pos].symbols++;
        }
      }
    }

    // Check that each position has a reasonable distribution
    // With 4 character sets and 1000 iterations, we expect ~250 of each type per position
    // Allow for statistical variance (expect at least 100 of each type)
    const minExpected = 100; // Very conservative threshold

    for (let pos = 0; pos < options.length; pos++) {
      const counts = positionCounts[pos];
      const total =
        counts.uppercase + counts.lowercase + counts.numbers + counts.symbols;

      // Verify total matches iterations
      expect(total).toBe(iterations);

      // Each character type should appear at least minExpected times at each position
      // This is a weak test but catches obvious non-uniformity
      expect(counts.uppercase).toBeGreaterThan(minExpected);
      expect(counts.lowercase).toBeGreaterThan(minExpected);
      expect(counts.numbers).toBeGreaterThan(minExpected);
      expect(counts.symbols).toBeGreaterThan(minExpected);
    }
  });

  /**
   * Property 2b: First and last positions have similar distribution
   *
   * A common shuffle bug is that certain positions (especially first/last)
   * have biased distributions. This test verifies that first and last positions
   * have similar character type distributions.
   */
  it('Property 2b: First and last positions have similar distribution', () => {
    const options: PasswordGeneratorOptions = {
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      minUppercase: 2,
      minLowercase: 2,
      minNumbers: 2,
      minSymbols: 2,
    };

    const iterations = 1000;
    const firstPositionCounts = {
      uppercase: 0,
      lowercase: 0,
      numbers: 0,
      symbols: 0,
    };
    const lastPositionCounts = {
      uppercase: 0,
      lowercase: 0,
      numbers: 0,
      symbols: 0,
    };

    for (let i = 0; i < iterations; i++) {
      const password = PasswordGenerator.generate(options);

      // Count first position
      const firstChar = password[0];
      if (UPPERCASE.includes(firstChar)) firstPositionCounts.uppercase++;
      else if (LOWERCASE.includes(firstChar)) firstPositionCounts.lowercase++;
      else if (NUMBERS.includes(firstChar)) firstPositionCounts.numbers++;
      else if (SYMBOLS.includes(firstChar)) firstPositionCounts.symbols++;

      // Count last position
      const lastChar = password[password.length - 1];
      if (UPPERCASE.includes(lastChar)) lastPositionCounts.uppercase++;
      else if (LOWERCASE.includes(lastChar)) lastPositionCounts.lowercase++;
      else if (NUMBERS.includes(lastChar)) lastPositionCounts.numbers++;
      else if (SYMBOLS.includes(lastChar)) lastPositionCounts.symbols++;
    }

    // The distributions should be similar (within 20% of each other)
    // This catches severe biases while allowing for statistical variance
    const tolerance = 0.3; // 30% tolerance

    const checkSimilar = (first: number, last: number) => {
      const avg = (first + last) / 2;
      if (avg === 0) return true;
      const diff = Math.abs(first - last) / avg;
      return diff < tolerance;
    };

    expect(
      checkSimilar(firstPositionCounts.uppercase, lastPositionCounts.uppercase),
    ).toBe(true);
    expect(
      checkSimilar(firstPositionCounts.lowercase, lastPositionCounts.lowercase),
    ).toBe(true);
    expect(
      checkSimilar(firstPositionCounts.numbers, lastPositionCounts.numbers),
    ).toBe(true);
    expect(
      checkSimilar(firstPositionCounts.symbols, lastPositionCounts.symbols),
    ).toBe(true);
  });

  /**
   * Property 2c: Minimum required characters are distributed across positions
   *
   * When minimum counts are specified, those characters should be shuffled
   * throughout the password, not clustered at the beginning.
   */
  it('Property 2c: Minimum required characters are distributed across positions', () => {
    const options: PasswordGeneratorOptions = {
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      minUppercase: 4,
      minLowercase: 4,
      minNumbers: 4,
      minSymbols: 4,
    };

    const iterations = 500;

    // Track which half of the password contains each character type
    const firstHalfCounts = {
      uppercase: 0,
      lowercase: 0,
      numbers: 0,
      symbols: 0,
    };
    const secondHalfCounts = {
      uppercase: 0,
      lowercase: 0,
      numbers: 0,
      symbols: 0,
    };

    for (let i = 0; i < iterations; i++) {
      const password = PasswordGenerator.generate(options);
      const midpoint = Math.floor(password.length / 2);

      for (let pos = 0; pos < password.length; pos++) {
        const char = password[pos];
        const counts = pos < midpoint ? firstHalfCounts : secondHalfCounts;

        if (UPPERCASE.includes(char)) counts.uppercase++;
        else if (LOWERCASE.includes(char)) counts.lowercase++;
        else if (NUMBERS.includes(char)) counts.numbers++;
        else if (SYMBOLS.includes(char)) counts.symbols++;
      }
    }

    // Each half should have roughly equal distribution
    // With proper shuffling, each half should have ~50% of each character type
    const tolerance = 0.35; // 35% tolerance for statistical variance

    const checkBalanced = (first: number, second: number) => {
      const total = first + second;
      if (total === 0) return true;
      const ratio = first / total;
      return ratio > 0.5 - tolerance && ratio < 0.5 + tolerance;
    };

    expect(
      checkBalanced(firstHalfCounts.uppercase, secondHalfCounts.uppercase),
    ).toBe(true);
    expect(
      checkBalanced(firstHalfCounts.lowercase, secondHalfCounts.lowercase),
    ).toBe(true);
    expect(
      checkBalanced(firstHalfCounts.numbers, secondHalfCounts.numbers),
    ).toBe(true);
    expect(
      checkBalanced(firstHalfCounts.symbols, secondHalfCounts.symbols),
    ).toBe(true);
  });

  /**
   * Property 2d: Single character set passwords have uniform character distribution
   *
   * When only one character set is enabled, each character in that set should
   * appear with roughly equal frequency across many generations.
   */
  it('Property 2d: Single character set passwords have uniform character distribution', () => {
    const options: PasswordGeneratorOptions = {
      length: 26, // Same as uppercase alphabet length
      uppercase: true,
      lowercase: false,
      numbers: false,
      symbols: false,
    };

    const iterations = 1000;
    const charCounts: Record<string, number> = {};

    // Initialize counts for all uppercase letters
    for (const char of UPPERCASE) {
      charCounts[char] = 0;
    }

    // Generate many passwords and count character occurrences
    for (let i = 0; i < iterations; i++) {
      const password = PasswordGenerator.generate(options);
      for (const char of password) {
        charCounts[char]++;
      }
    }

    // Calculate expected count per character
    const totalChars = iterations * options.length;
    const expectedPerChar = totalChars / UPPERCASE.length;

    // Each character should appear within reasonable bounds
    // Allow 50% variance from expected (very conservative)
    const minCount = expectedPerChar * 0.5;
    const maxCount = expectedPerChar * 1.5;

    for (const char of UPPERCASE) {
      expect(charCounts[char]).toBeGreaterThan(minCount);
      expect(charCounts[char]).toBeLessThan(maxCount);
    }
  });
});
