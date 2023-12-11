/**
 * Password Generator - Generates cryptographically secure random passwords
 *
 * This module provides a platform-agnostic password generator that works in both
 * browser and Node.js environments using the platformCrypto abstraction.
 *
 * Uses Fisher-Yates shuffle with cryptographically secure random indices for
 * uniform distribution of characters.
 *
 * @module passwordGenerator
 * @see Requirements 1.1, 1.4, 1.5, 1.6
 */

import { getRandomBytes } from '../../crypto/platformCrypto';

/**
 * Options for password generation.
 */
export interface PasswordGeneratorOptions {
  /** Length of the password (8-128 characters) */
  length: number;
  /** Include uppercase letters (A-Z) */
  uppercase?: boolean;
  /** Include lowercase letters (a-z) */
  lowercase?: boolean;
  /** Include numbers (0-9) */
  numbers?: boolean;
  /** Include symbols (!@#$%^&*()_+-=[]{}|;:,.<>?) */
  symbols?: boolean;
  /** Minimum number of uppercase letters required */
  minUppercase?: number;
  /** Minimum number of lowercase letters required */
  minLowercase?: number;
  /** Minimum number of numbers required */
  minNumbers?: number;
  /** Minimum number of symbols required */
  minSymbols?: number;
}

/**
 * PasswordGenerator - Generates cryptographically secure random passwords
 *
 * Uses Fisher-Yates shuffle with cryptographically secure random bytes for
 * uniform distribution of characters.
 *
 * @see Requirement 1.1 - Cryptographically secure random passwords using platform-agnostic random byte generation
 * @see Requirement 1.4 - Validates password options (length 8-128, at least one character set enabled, minimum counts not exceeding length)
 * @see Requirement 1.5 - Supports configurable character sets with minimum count requirements
 * @see Requirement 1.6 - Uses Fisher-Yates shuffle with cryptographically secure random indices
 *
 * @example
 * ```typescript
 * // Generate a 16-character password with all character sets
 * const password = PasswordGenerator.generate({
 *   length: 16,
 *   uppercase: true,
 *   lowercase: true,
 *   numbers: true,
 *   symbols: true,
 *   minUppercase: 2,
 *   minLowercase: 2,
 *   minNumbers: 2,
 *   minSymbols: 2
 * });
 * ```
 */
export class PasswordGenerator {
  private static readonly UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  private static readonly LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
  private static readonly NUMBERS = '0123456789';
  private static readonly SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  /**
   * Validate password generation options.
   *
   * @param options - Password generation options to validate
   * @throws Error if length is not between 8 and 128
   * @throws Error if no character set is enabled
   * @throws Error if sum of minimum counts exceeds password length
   *
   * @see Requirement 1.4 - Validates password options
   */
  public static validate(options: PasswordGeneratorOptions): void {
    if (options.length < 8 || options.length > 128) {
      throw new Error('Password length must be between 8 and 128');
    }

    const hasCharset =
      options.uppercase ||
      options.lowercase ||
      options.numbers ||
      options.symbols;
    if (!hasCharset) {
      throw new Error('At least one character set must be enabled');
    }

    const minTotal =
      (options.minUppercase || 0) +
      (options.minLowercase || 0) +
      (options.minNumbers || 0) +
      (options.minSymbols || 0);
    if (minTotal > options.length) {
      throw new Error('Sum of minimum counts exceeds password length');
    }
  }

  /**
   * Generate a cryptographically secure random password.
   *
   * @param options - Password generation options
   * @returns Generated password string
   * @throws Error if options are invalid
   *
   * @see Requirement 1.1 - Cryptographically secure random passwords
   * @see Requirement 1.5 - Configurable character sets with minimum count requirements
   * @see Requirement 1.6 - Fisher-Yates shuffle with cryptographically secure random indices
   */
  public static generate(options: PasswordGeneratorOptions): string {
    this.validate(options);

    let charset = '';
    if (options.uppercase) charset += this.UPPERCASE;
    if (options.lowercase) charset += this.LOWERCASE;
    if (options.numbers) charset += this.NUMBERS;
    if (options.symbols) charset += this.SYMBOLS;

    const result: string[] = [];

    // Add minimum required characters from each enabled set
    if (options.minUppercase) {
      for (let i = 0; i < options.minUppercase; i++) {
        result.push(this.randomChar(this.UPPERCASE));
      }
    }
    if (options.minLowercase) {
      for (let i = 0; i < options.minLowercase; i++) {
        result.push(this.randomChar(this.LOWERCASE));
      }
    }
    if (options.minNumbers) {
      for (let i = 0; i < options.minNumbers; i++) {
        result.push(this.randomChar(this.NUMBERS));
      }
    }
    if (options.minSymbols) {
      for (let i = 0; i < options.minSymbols; i++) {
        result.push(this.randomChar(this.SYMBOLS));
      }
    }

    // Fill remaining positions with random characters from full charset
    while (result.length < options.length) {
      result.push(this.randomChar(charset));
    }

    // Fisher-Yates shuffle for uniform distribution
    // @see Requirement 1.6
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result.join('');
  }

  /**
   * Get a random character from a charset.
   *
   * @param charset - String of characters to choose from
   * @returns A single random character from the charset
   */
  private static randomChar(charset: string): string {
    return charset[this.randomInt(charset.length)];
  }

  /**
   * Generate a cryptographically secure random integer in range [0, max).
   *
   * Uses getRandomBytes from platformCrypto for cross-platform compatibility.
   * Uses DataView for reading uint32 from Uint8Array.
   *
   * @param max - Upper bound (exclusive)
   * @returns Random integer in range [0, max)
   *
   * @see Requirement 1.1 - Platform-agnostic random byte generation
   */
  private static randomInt(max: number): number {
    const bytes = getRandomBytes(4);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const value = view.getUint32(0);
    return value % max;
  }
}
