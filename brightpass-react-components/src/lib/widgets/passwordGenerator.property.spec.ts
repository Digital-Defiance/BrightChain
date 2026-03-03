/**
 * Property-based tests for PasswordGeneratorWidget — Property 8: Password strength classification
 *
 * **Validates: Requirements 6.3**
 *
 * Property 8: For any generated password string, the strength classification
 * function should return 'weak' for entropy < 40 bits, 'fair' for 40–59 bits,
 * 'strong' for 60–79 bits, and 'very_strong' for >= 80 bits, and the
 * classification should be deterministic (same entropy always yields same strength).
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
    generatePassword: jest.fn(),
  }),
}));

// Import AFTER mocks
import { classifyStrength } from './PasswordGeneratorWidget';

describe('Property 8: Password strength classification', () => {
  it('returns "weak" for entropy < 40', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 39.999, noNaN: true }),
        (entropy) => {
          expect(classifyStrength(entropy)).toBe('weak');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "fair" for entropy in [40, 60)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 40, max: 59.999, noNaN: true }),
        (entropy) => {
          expect(classifyStrength(entropy)).toBe('fair');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "strong" for entropy in [60, 80)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 60, max: 79.999, noNaN: true }),
        (entropy) => {
          expect(classifyStrength(entropy)).toBe('strong');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "very_strong" for entropy >= 80', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 80, max: 500, noNaN: true }),
        (entropy) => {
          expect(classifyStrength(entropy)).toBe('very_strong');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is deterministic — same entropy always yields same strength', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 500, noNaN: true }),
        (entropy) => {
          const first = classifyStrength(entropy);
          const second = classifyStrength(entropy);
          expect(first).toBe(second);
        },
      ),
      { numRuns: 100 },
    );
  });
});
