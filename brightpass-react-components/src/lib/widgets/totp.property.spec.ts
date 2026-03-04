/**
 * Property-based tests for TOTPWidget — Properties 9, 10, 11
 *
 * Property 9: TOTP code format — formatTotpCode produces "XXX XXX" for 6-digit codes
 * Property 10: TOTP countdown accuracy — calculateRemainingSeconds returns value in [0, period-1]
 * Property 11: TOTP secret input validation — isValidTotpSecret accepts valid base32 or otpauth:// URIs
 *
 * **Validates: Requirements 7.1, 7.2, 7.5**
 */

import fc from 'fast-check';

// Mock brightchain-lib to avoid the heavy ECIES/GUID init chain
jest.mock('@brightchain/brightchain-lib', () => ({
  __esModule: true,
  BrightPassStrings: new Proxy({}, { get: (_target, prop) => String(prop) }),
}));

jest.mock('../hooks/useBrightPassTranslation', () => ({
  __esModule: true,
  useBrightPassTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../hooks/useBrightPassApi', () => ({
  __esModule: true,
  useBrightPassApi: () => ({
    generateTotp: jest.fn(),
  }),
}));

// Import AFTER mocks
import {
  calculateRemainingSeconds,
  formatTotpCode,
  isValidBase32,
  isValidOtpauthUri,
  isValidTotpSecret,
} from './TOTPWidget';

describe('Property 9: TOTP code format', () => {
  it('formats 6-digit codes as "XXX XXX"', () => {
    const digitChar = fc.constantFrom(
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
    );
    fc.assert(
      fc.property(
        fc
          .array(digitChar, { minLength: 6, maxLength: 6 })
          .map((arr) => arr.join('')),
        (code) => {
          const formatted = formatTotpCode(code);
          expect(formatted).toBe(`${code.slice(0, 3)} ${code.slice(3)}`);
          expect(formatted).toMatch(/^\d{3} \d{3}$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns non-6-digit codes unchanged', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter((s) => s.length !== 6),
        (code) => {
          expect(formatTotpCode(code)).toBe(code);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 10: TOTP countdown accuracy', () => {
  it('returns value in [0, period - 1] for any timestamp and period', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 2_000_000_000_000 }), // timestampMs up to ~2033
        fc.integer({ min: 1, max: 120 }), // period in seconds
        (timestampMs, period) => {
          const remaining = calculateRemainingSeconds(timestampMs, period);
          expect(remaining).toBeGreaterThanOrEqual(0);
          expect(remaining).toBeLessThanOrEqual(period - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is deterministic — same inputs always yield same result', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 2_000_000_000_000 }),
        fc.integer({ min: 1, max: 120 }),
        (timestampMs, period) => {
          const a = calculateRemainingSeconds(timestampMs, period);
          const b = calculateRemainingSeconds(timestampMs, period);
          expect(a).toBe(b);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 11: TOTP secret input validation', () => {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  it('accepts valid base32 strings', () => {
    const base32Char = fc.constantFrom(...base32Chars.split(''));
    fc.assert(
      fc.property(
        fc
          .array(base32Char, { minLength: 1, maxLength: 32 })
          .map((arr) => arr.join('')),
        (secret) => {
          expect(isValidBase32(secret)).toBe(true);
          expect(isValidTotpSecret(secret)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('accepts valid otpauth:// URIs with base32 secret', () => {
    const base32Char = fc.constantFrom(...base32Chars.split(''));
    const alphaNum = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
    );
    fc.assert(
      fc.property(
        fc
          .array(base32Char, { minLength: 8, maxLength: 32 })
          .map((arr) => arr.join('')),
        fc
          .array(alphaNum, { minLength: 1, maxLength: 20 })
          .map((arr) => arr.join('')),
        (secret, issuer) => {
          const uri = `otpauth://totp/${issuer}:user@example.com?secret=${secret}&issuer=${issuer}`;
          expect(isValidOtpauthUri(uri)).toBe(true);
          expect(isValidTotpSecret(uri)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects empty strings', () => {
    expect(isValidBase32('')).toBe(false);
    expect(isValidTotpSecret('')).toBe(false);
  });

  it('rejects strings with invalid base32 characters (when not otpauth URI)', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1, maxLength: 20 })
          .filter(
            (s) => !/^[A-Z2-7]+=*$/i.test(s) && !s.startsWith('otpauth://'),
          ),
        (invalid) => {
          expect(isValidTotpSecret(invalid)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
