/**
 * @fileoverview Property-based tests for branded primitive validation correctness
 *
 * // Feature: branded-dto-integration, Property 1: Branded primitive validation correctness
 *
 * For any branded primitive definition and any string value, validate() returns
 * true iff the string matches the expected format for that primitive. Equivalently,
 * create() succeeds for valid strings and throws for invalid strings.
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 */

import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';

import { BlockIdPrimitive } from './blockId';
import { EmailStringPrimitive } from './emailString';
import { ISO8601TimestampPrimitive } from './iso8601Timestamp';
import { PoolIdPrimitive } from './poolId';
import { ShortHexGuidPrimitive } from './shortHexGuid';

jest.setTimeout(30000);

// ---------------------------------------------------------------------------
// Arbitraries for VALID inputs
// ---------------------------------------------------------------------------

/** Generates valid ShortHexGuid strings: exactly 8 lowercase hex chars */
const validShortHexGuidArb: fc.Arbitrary<string> =
  fc.stringMatching(/^[0-9a-f]{8}$/);

/** Generates valid EmailString values matching /^[^\s@]+@[^\s@]+\.[^\s@]+$/ */
const validEmailArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[^\s@]{1,20}$/),
    fc.stringMatching(/^[^\s@]{1,20}$/),
    fc.stringMatching(/^[^\s@]{1,10}$/),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generates valid BlockId strings: exactly 64 lowercase hex chars */
const validBlockIdArb: fc.Arbitrary<string> =
  fc.stringMatching(/^[0-9a-f]{64}$/);

/** Generates valid PoolId strings: 1–64 chars, only [a-zA-Z0-9_-] */
const validPoolIdArb: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,64}$/,
);

/** Generates valid ISO 8601 timestamps via Date.toISOString() */
const validISO8601Arb: fc.Arbitrary<string> = fc
  .date({
    min: new Date('1970-01-01T00:00:00.000Z'),
    max: new Date('2100-12-31T23:59:59.999Z'),
  })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

// ---------------------------------------------------------------------------
// Arbitraries for INVALID inputs
// ---------------------------------------------------------------------------

/** Generates strings that are NOT valid ShortHexGuids (wrong length or wrong chars) */
const invalidShortHexGuidArb: fc.Arbitrary<string> = fc
  .string({ minLength: 0, maxLength: 20 })
  .filter((s) => !/^[0-9a-f]{8}$/.test(s));

/** Generates strings that are NOT valid emails (no @ or no dot after @) */
const invalidEmailArb: fc.Arbitrary<string> = fc
  .string({ minLength: 0, maxLength: 30 })
  .filter((s) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));

/** Generates strings that are NOT valid BlockIds (wrong length or wrong chars) */
const invalidBlockIdArb: fc.Arbitrary<string> = fc
  .string({ minLength: 0, maxLength: 128 })
  .filter((s) => !/^[0-9a-f]{64}$/.test(s));

/** Generates strings that are NOT valid PoolIds (empty, too long, or invalid chars) */
const invalidPoolIdArb: fc.Arbitrary<string> = fc
  .string({ minLength: 0, maxLength: 80 })
  .filter((s) => !/^[a-zA-Z0-9_-]{1,64}$/.test(s));

/** Generates strings that are NOT valid ISO 8601 timestamps */
const invalidISO8601Arb: fc.Arbitrary<string> = fc
  .string({ minLength: 0, maxLength: 30 })
  .filter((s) => {
    if (s.length === 0) return true;
    const d = new Date(s);
    return isNaN(d.getTime()) || s !== d.toISOString();
  });

// ---------------------------------------------------------------------------
// Property 1: Branded primitive validation correctness
// ---------------------------------------------------------------------------

describe('Property 1: Branded primitive validation correctness', () => {
  // -------------------------------------------------------------------------
  // ShortHexGuid — Requirement 1.1
  // -------------------------------------------------------------------------
  describe('ShortHexGuidPrimitive', () => {
    it('validate() returns true for all valid 8-char lowercase hex strings', () => {
      fc.assert(
        fc.property(validShortHexGuidArb, (value: string) => {
          expect(ShortHexGuidPrimitive.validate(value)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('validate() returns false for strings that do not match /^[0-9a-f]{8}$/', () => {
      fc.assert(
        fc.property(invalidShortHexGuidArb, (value: string) => {
          expect(ShortHexGuidPrimitive.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('create() succeeds for valid ShortHexGuid strings', () => {
      fc.assert(
        fc.property(validShortHexGuidArb, (value: string) => {
          expect(() => ShortHexGuidPrimitive.create(value)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('create() throws for invalid ShortHexGuid strings (Requirement 1.6)', () => {
      fc.assert(
        fc.property(invalidShortHexGuidArb, (value: string) => {
          expect(() => ShortHexGuidPrimitive.create(value)).toThrow();
        }),
        { numRuns: 100 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // EmailString — Requirement 1.2
  // -------------------------------------------------------------------------
  describe('EmailStringPrimitive', () => {
    it('validate() returns true for all well-formed email addresses', () => {
      fc.assert(
        fc.property(validEmailArb, (value: string) => {
          expect(EmailStringPrimitive.validate(value)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('validate() returns false for strings that are not valid emails', () => {
      fc.assert(
        fc.property(invalidEmailArb, (value: string) => {
          expect(EmailStringPrimitive.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('create() succeeds for valid email strings', () => {
      fc.assert(
        fc.property(validEmailArb, (value: string) => {
          expect(() => EmailStringPrimitive.create(value)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('create() throws for invalid email strings (Requirement 1.6)', () => {
      fc.assert(
        fc.property(invalidEmailArb, (value: string) => {
          expect(() => EmailStringPrimitive.create(value)).toThrow();
        }),
        { numRuns: 100 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // BlockId — Requirement 1.3
  // -------------------------------------------------------------------------
  describe('BlockIdPrimitive', () => {
    it('validate() returns true for all valid 64-char lowercase hex strings', () => {
      fc.assert(
        fc.property(validBlockIdArb, (value: string) => {
          expect(BlockIdPrimitive.validate(value)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('validate() returns false for strings that do not match /^[0-9a-f]{64}$/', () => {
      fc.assert(
        fc.property(invalidBlockIdArb, (value: string) => {
          expect(BlockIdPrimitive.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('create() succeeds for valid BlockId strings', () => {
      fc.assert(
        fc.property(validBlockIdArb, (value: string) => {
          expect(() => BlockIdPrimitive.create(value)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('create() throws for invalid BlockId strings (Requirement 1.6)', () => {
      fc.assert(
        fc.property(invalidBlockIdArb, (value: string) => {
          expect(() => BlockIdPrimitive.create(value)).toThrow();
        }),
        { numRuns: 100 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // PoolId — Requirement 1.4
  // -------------------------------------------------------------------------
  describe('PoolIdPrimitive', () => {
    it('validate() returns true for all strings matching /^[a-zA-Z0-9_-]{1,64}$/', () => {
      fc.assert(
        fc.property(validPoolIdArb, (value: string) => {
          expect(PoolIdPrimitive.validate(value)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('validate() returns false for empty, too-long, or invalid-char strings', () => {
      fc.assert(
        fc.property(invalidPoolIdArb, (value: string) => {
          expect(PoolIdPrimitive.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('create() succeeds for valid PoolId strings', () => {
      fc.assert(
        fc.property(validPoolIdArb, (value: string) => {
          expect(() => PoolIdPrimitive.create(value)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('create() throws for invalid PoolId strings (Requirement 1.6)', () => {
      fc.assert(
        fc.property(invalidPoolIdArb, (value: string) => {
          expect(() => PoolIdPrimitive.create(value)).toThrow();
        }),
        { numRuns: 100 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // ISO8601Timestamp — Requirement 1.5
  // -------------------------------------------------------------------------
  describe('ISO8601TimestampPrimitive', () => {
    it('validate() returns true for all ISO 8601 date-time strings', () => {
      fc.assert(
        fc.property(validISO8601Arb, (value: string) => {
          expect(ISO8601TimestampPrimitive.validate(value)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('validate() returns false for strings that are not ISO 8601 timestamps', () => {
      fc.assert(
        fc.property(invalidISO8601Arb, (value: string) => {
          expect(ISO8601TimestampPrimitive.validate(value)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('create() succeeds for valid ISO 8601 timestamp strings', () => {
      fc.assert(
        fc.property(validISO8601Arb, (value: string) => {
          expect(() => ISO8601TimestampPrimitive.create(value)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('create() throws for invalid ISO 8601 timestamp strings (Requirement 1.6)', () => {
      fc.assert(
        fc.property(invalidISO8601Arb, (value: string) => {
          expect(() => ISO8601TimestampPrimitive.create(value)).toThrow();
        }),
        { numRuns: 100 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // Cross-primitive: validate() agrees with the expected predicate for any string
  // -------------------------------------------------------------------------
  describe('validate() iff format matches — biconditional property', () => {
    it('ShortHexGuidPrimitive.validate(s) === /^[0-9a-f]{8}$/.test(s) for any string', () => {
      fc.assert(
        fc.property(fc.string(), (s: string) => {
          expect(ShortHexGuidPrimitive.validate(s)).toBe(
            /^[0-9a-f]{8}$/.test(s),
          );
        }),
        { numRuns: 200 },
      );
    });

    it('EmailStringPrimitive.validate(s) === regex.test(s) for any string', () => {
      fc.assert(
        fc.property(fc.string(), (s: string) => {
          expect(EmailStringPrimitive.validate(s)).toBe(
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
          );
        }),
        { numRuns: 200 },
      );
    });

    it('BlockIdPrimitive.validate(s) === /^[0-9a-f]{64}$/.test(s) for any string', () => {
      fc.assert(
        fc.property(fc.string(), (s: string) => {
          expect(BlockIdPrimitive.validate(s)).toBe(/^[0-9a-f]{64}$/.test(s));
        }),
        { numRuns: 200 },
      );
    });

    /**
     * Property 2: PoolIdPrimitive accepts exactly the canonical pattern
     *
     * Feature: brightchain-db-branded-schema, Property 2: PoolIdPrimitive accepts exactly the canonical pattern
     * Validates: Requirements 3.1, 3.2, 3.3, 3.4
     */
    it('PoolIdPrimitive.validate(s) === /^[a-zA-Z0-9_-]{1,64}$/.test(s) for any string', () => {
      fc.assert(
        fc.property(fc.string(), (s: string) => {
          expect(PoolIdPrimitive.validate(s)).toBe(
            /^[a-zA-Z0-9_-]{1,64}$/.test(s),
          );
        }),
        { numRuns: 200 },
      );
    });

    it('ISO8601TimestampPrimitive.validate(s) === Date round-trip check for any string', () => {
      fc.assert(
        fc.property(fc.string(), (s: string) => {
          const d = new Date(s);
          const expected = !isNaN(d.getTime()) && s === d.toISOString();
          expect(ISO8601TimestampPrimitive.validate(s)).toBe(expected);
        }),
        { numRuns: 200 },
      );
    });
  });
});
