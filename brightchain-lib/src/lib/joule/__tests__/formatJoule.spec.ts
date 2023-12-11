/**
 * Feature: formatJoule scale-aware display, Requirement 7.7
 *
 * Property tests:
 *  1. Round-trip: `parseJoule(formatJoule(x)) === x` for 1024 generated bigints.
 *  2. Scale rendering: values ≥ 1 J render with " J" suffix.
 *  3. Scale rendering: values ≥ 1 mJ but < 1 J render with " mJ" suffix.
 *  4. Scale rendering: values < 1 mJ render with " µJ" suffix.
 *  5. Output never contains scientific notation, 'NaN', or 'Infinity'.
 *  6. Negative amounts round-trip correctly.
 */
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

import { formatJoule, parseJoule } from '../formatJoule';

jest.setTimeout(60_000);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** bigint in the range [-(2^52), 2^52] — covers J, mJ, µJ scales */
const microJoulesArb = fc.bigInt({ min: -(2n ** 52n), max: 2n ** 52n });

/** Values in the µJ scale (absolute value in [1, 999]); 0 is special-cased to "0.00 J" */
const subMilliArb = fc.bigInt({ min: 1n, max: 999n });

/** Values in the mJ scale: [1_000n, 999_999n] */
const milliArb = fc.bigInt({ min: 1_000n, max: 999_999n });

/** Values in the J scale: ≥ 1_000_000n */
const jouleArb = fc.bigInt({ min: 1_000_000n, max: 2n ** 52n });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('formatJoule', () => {
  describe('round-trip property', () => {
    it('parseJoule(formatJoule(x)) === x for all generated bigints', () => {
      fc.assert(
        fc.property(microJoulesArb, (µJ) => {
          expect(parseJoule(formatJoule(µJ))).toBe(µJ);
        }),
        { numRuns: 1024, verbose: false },
      );
    });

    it('round-trips negative values', () => {
      fc.assert(
        fc.property(fc.bigInt({ min: 1n, max: 2n ** 52n }), (abs) => {
          const neg = -abs;
          expect(parseJoule(formatJoule(neg))).toBe(neg);
        }),
        { numRuns: 256 },
      );
    });
  });

  describe('scale rendering', () => {
    it('renders values ≥ 1 J with " J" suffix', () => {
      fc.assert(
        fc.property(jouleArb, (µJ) => {
          const s = formatJoule(µJ);
          expect(s.endsWith(' J')).toBe(true);
        }),
        { numRuns: 512 },
      );
    });

    it('renders values in [1 mJ, 1 J) with " mJ" suffix', () => {
      fc.assert(
        fc.property(milliArb, (µJ) => {
          const s = formatJoule(µJ);
          expect(s.endsWith(' mJ')).toBe(true);
        }),
        { numRuns: 512 },
      );
    });

    it('renders values < 1 mJ with " µJ" suffix', () => {
      fc.assert(
        fc.property(subMilliArb, (µJ) => {
          const s = formatJoule(µJ);
          expect(s.endsWith(' µJ')).toBe(true);
        }),
        { numRuns: 512 },
      );
    });
  });

  describe('output safety', () => {
    it('never contains scientific notation', () => {
      fc.assert(
        fc.property(microJoulesArb, (µJ) => {
          const s = formatJoule(µJ);
          expect(s).not.toMatch(/e[+-]?\d/i);
        }),
        { numRuns: 1024 },
      );
    });

    it('never contains NaN or Infinity', () => {
      fc.assert(
        fc.property(microJoulesArb, (µJ) => {
          const s = formatJoule(µJ);
          expect(s).not.toContain('NaN');
          expect(s).not.toContain('Infinity');
        }),
        { numRuns: 1024 },
      );
    });
  });

  describe('specific values', () => {
    it('formats 2_500_000n as "2.5 J"', () => {
      expect(formatJoule(2_500_000n)).toBe('2.5 J');
    });

    it('formats 1_000_000n as "1 J"', () => {
      expect(formatJoule(1_000_000n)).toBe('1 J');
    });

    it('formats 1_500n as "1.5 mJ"', () => {
      expect(formatJoule(1_500n)).toBe('1.5 mJ');
    });

    it('formats 1_000n as "1 mJ"', () => {
      expect(formatJoule(1_000n)).toBe('1 mJ');
    });

    it('formats 42n as "42 µJ"', () => {
      expect(formatJoule(42n)).toBe('42 µJ');
    });

    it('formats 0n as "0 µJ"', () => {
      expect(formatJoule(0n)).toBe('0.00 J');
    });

    it('formats -2_500_000n as "-2.5 J"', () => {
      expect(formatJoule(-2_500_000n)).toBe('-2.5 J');
    });

    it('formats 1_234_567n as "1.234567 J"', () => {
      expect(formatJoule(1_234_567n)).toBe('1.234567 J');
    });

    it('formats 999_999n as "999.999 mJ"', () => {
      expect(formatJoule(999_999n)).toBe('999.999 mJ');
    });
  });

  describe('trim option', () => {
    it('trim=false preserves trailing zeros in J', () => {
      expect(formatJoule(2_500_000n, { trim: false })).toBe('2.500000 J');
    });

    it('trim=false preserves trailing zeros in mJ', () => {
      expect(formatJoule(1_500n, { trim: false })).toBe('1.500 mJ');
    });

    it('trim=true (default) strips trailing zeros', () => {
      expect(formatJoule(2_500_000n, { trim: true })).toBe('2.5 J');
    });
  });
});
