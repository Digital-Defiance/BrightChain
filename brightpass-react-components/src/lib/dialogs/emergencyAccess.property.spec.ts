/**
 * Property-based tests for EmergencyAccessDialog — Property 13: Emergency access threshold validation
 *
 * **Validates: Requirements 10.2**
 *
 * Property 13: For any threshold and trustees count, validateThreshold returns true
 * iff 1 <= threshold <= trusteesCount and trusteesCount >= 1.
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
    configureEmergencyAccess: jest.fn(),
    recoverWithShares: jest.fn(),
  }),
}));

// Import AFTER mocks
import { validateThreshold } from './EmergencyAccessDialog';

describe('Property 13: Emergency access threshold validation', () => {
  it('returns true when 1 <= threshold <= trusteesCount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (trusteesCount, offset) => {
          const threshold = Math.min(offset, trusteesCount);
          expect(validateThreshold(threshold, trusteesCount)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when threshold < 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 0 }),
        fc.integer({ min: 1, max: 100 }),
        (threshold, trusteesCount) => {
          expect(validateThreshold(threshold, trusteesCount)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when threshold > trusteesCount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (trusteesCount, extra) => {
          const threshold = trusteesCount + extra;
          expect(validateThreshold(threshold, trusteesCount)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when trusteesCount < 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: -100, max: 0 }),
        (threshold, trusteesCount) => {
          expect(validateThreshold(threshold, trusteesCount)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('is deterministic — same inputs always yield same result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 50 }),
        fc.integer({ min: -10, max: 50 }),
        (threshold, trusteesCount) => {
          const a = validateThreshold(threshold, trusteesCount);
          const b = validateThreshold(threshold, trusteesCount);
          expect(a).toBe(b);
        },
      ),
      { numRuns: 100 },
    );
  });
});
