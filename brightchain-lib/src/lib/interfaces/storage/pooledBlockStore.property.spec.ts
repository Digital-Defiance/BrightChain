/**
 * @fileoverview Property-based tests for Pool ID validation and Storage Key round-trip
 *
 * **Feature: pool-based-storage-isolation, Property 1: Pool ID validation accepts exactly valid identifiers**
 * **Feature: pool-based-storage-isolation, Property 2: Storage key round-trip**
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 3.1, 3.2, 3.3**
 */

import fc from 'fast-check';
import {
  isValidPoolId,
  makeStorageKey,
  parseStorageKey,
  validatePoolId,
} from './pooledBlockStore';

// Set a longer timeout for property tests
jest.setTimeout(30000);

/** Regex that defines valid pool IDs */
const POOL_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Arbitrary that generates valid pool ID strings:
 * 1-64 characters from [a-zA-Z0-9_-]
 */
const validPoolIdArb: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,64}$/,
);

/**
 * Arbitrary that generates empty strings (rejected: length < 1).
 */
const emptyStringArb: fc.Arbitrary<string> = fc.constant('');

/**
 * Arbitrary that generates strings exceeding 64 characters using only valid chars.
 * This isolates the "too long" rejection reason.
 */
const tooLongPoolIdArb: fc.Arbitrary<string> = fc
  .integer({ min: 65, max: 128 })
  .chain((len) =>
    fc.stringMatching(new RegExp(`^[a-zA-Z0-9_-]{${len},${len}}$`)),
  );

/**
 * Arbitrary that generates strings containing at least one invalid character.
 * Uses fc.string() filtered to those that contain chars outside [a-zA-Z0-9_-]
 * and are non-empty with length <= 64.
 */
const invalidCharsPoolIdArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => /[^a-zA-Z0-9_-]/.test(s));

/**
 * Arbitrary that generates hex hash strings (even-length, lowercase hex).
 * Hashes in BrightChain are hex-encoded digests, so they contain only [0-9a-f].
 * We generate strings of length 8-128 to cover realistic hash sizes.
 */
const hexHashArb: fc.Arbitrary<string> = fc
  .integer({ min: 4, max: 64 })
  .chain((halfLen) =>
    fc
      .array(
        fc.integer({ min: 0, max: 15 }).map((n) => n.toString(16)),
        { minLength: halfLen * 2, maxLength: halfLen * 2 },
      )
      .map((chars) => chars.join('')),
  );

describe('Pool ID Validation Property Tests', () => {
  describe('Property 1: Pool ID validation accepts exactly valid identifiers', () => {
    /**
     * **Property 1: Pool ID validation accepts exactly valid identifiers**
     *
     * isValidPoolId returns true for any string matching /^[a-zA-Z0-9_-]{1,64}$/
     *
     * **Validates: Requirements 1.1, 1.2, 1.3**
     */
    it('isValidPoolId returns true for all valid pool IDs', () => {
      fc.assert(
        fc.property(validPoolIdArb, (poolId: string) => {
          expect(isValidPoolId(poolId)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * validatePoolId does not throw for any valid pool ID
     *
     * **Validates: Requirements 1.1**
     */
    it('validatePoolId does not throw for valid pool IDs', () => {
      fc.assert(
        fc.property(validPoolIdArb, (poolId: string) => {
          expect(() => validatePoolId(poolId)).not.toThrow();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * isValidPoolId returns false for empty strings
     *
     * **Validates: Requirements 1.2**
     */
    it('isValidPoolId rejects empty strings', () => {
      fc.assert(
        fc.property(emptyStringArb, (poolId: string) => {
          expect(isValidPoolId(poolId)).toBe(false);
        }),
        { numRuns: 1 },
      );
    });

    /**
     * validatePoolId throws for empty strings
     *
     * **Validates: Requirements 1.2**
     */
    it('validatePoolId throws for empty strings', () => {
      fc.assert(
        fc.property(emptyStringArb, (poolId: string) => {
          expect(() => validatePoolId(poolId)).toThrow(/Invalid pool ID/);
        }),
        { numRuns: 1 },
      );
    });

    /**
     * isValidPoolId returns false for strings exceeding 64 characters
     *
     * **Validates: Requirements 1.2**
     */
    it('isValidPoolId rejects strings exceeding 64 characters', () => {
      fc.assert(
        fc.property(tooLongPoolIdArb, (poolId: string) => {
          expect(isValidPoolId(poolId)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * validatePoolId throws for strings exceeding 64 characters
     *
     * **Validates: Requirements 1.2**
     */
    it('validatePoolId throws for strings exceeding 64 characters', () => {
      fc.assert(
        fc.property(tooLongPoolIdArb, (poolId: string) => {
          expect(() => validatePoolId(poolId)).toThrow(/Invalid pool ID/);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * isValidPoolId returns false for strings with invalid characters
     *
     * **Validates: Requirements 1.3**
     */
    it('isValidPoolId rejects strings with invalid characters', () => {
      fc.assert(
        fc.property(invalidCharsPoolIdArb, (poolId: string) => {
          expect(isValidPoolId(poolId)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * validatePoolId throws for strings with invalid characters
     *
     * **Validates: Requirements 1.3**
     */
    it('validatePoolId throws for strings with invalid characters', () => {
      fc.assert(
        fc.property(invalidCharsPoolIdArb, (poolId: string) => {
          expect(() => validatePoolId(poolId)).toThrow(/Invalid pool ID/);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * isValidPoolId agrees with the regex for any arbitrary string.
     * This is the core biconditional property: accepted iff matches regex.
     *
     * **Validates: Requirements 1.1, 1.2, 1.3**
     */
    it('isValidPoolId matches regex for any arbitrary string', () => {
      fc.assert(
        fc.property(fc.string(), (s: string) => {
          expect(isValidPoolId(s)).toBe(POOL_ID_REGEX.test(s));
        }),
        { numRuns: 200 },
      );
    });

    /**
     * validatePoolId throws iff isValidPoolId returns false.
     * Ensures the two functions are consistent with each other.
     *
     * **Validates: Requirements 1.1, 1.2, 1.3**
     */
    it('validatePoolId throws if and only if isValidPoolId returns false', () => {
      fc.assert(
        fc.property(fc.string(), (s: string) => {
          const valid = isValidPoolId(s);
          if (valid) {
            expect(() => validatePoolId(s)).not.toThrow();
          } else {
            expect(() => validatePoolId(s)).toThrow();
          }
        }),
        { numRuns: 200 },
      );
    });
  });
});

/**
 * @description Property-based tests for Storage Key round-trip
 *
 * **Feature: pool-based-storage-isolation, Property 2: Storage key round-trip**
 *
 * For any valid PoolId and any hash string (hex strings — no colons),
 * constructing a storage key with `makeStorageKey(poolId, hash)` and then
 * parsing it with `parseStorageKey` yields the original `poolId` and `hash`.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */
describe('Storage Key Round-Trip Property Tests', () => {
  describe('Property 2: Storage key round-trip', () => {
    /**
     * **Property 2: Storage key round-trip**
     *
     * For any valid PoolId and hex hash, makeStorageKey followed by
     * parseStorageKey yields the original poolId and hash.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3**
     */
    it('parseStorageKey(makeStorageKey(poolId, hash)) returns original poolId and hash', () => {
      fc.assert(
        fc.property(
          validPoolIdArb,
          hexHashArb,
          (poolId: string, hash: string) => {
            const key = makeStorageKey(poolId, hash);
            const parsed = parseStorageKey(key);
            expect(parsed.poolId).toBe(poolId);
            expect(parsed.hash).toBe(hash);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * The constructed storage key has the format "${poolId}:${hash}".
     *
     * **Validates: Requirements 3.1**
     */
    it('makeStorageKey produces keys in the format poolId:hash', () => {
      fc.assert(
        fc.property(
          validPoolIdArb,
          hexHashArb,
          (poolId: string, hash: string) => {
            const key = makeStorageKey(poolId, hash);
            expect(key).toBe(`${poolId}:${hash}`);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * The first colon in the storage key is the delimiter.
     * Since valid pool IDs cannot contain colons, the pool portion
     * is always everything before the first colon.
     *
     * **Validates: Requirements 3.2**
     */
    it('the first colon in the key is always the pool/hash delimiter', () => {
      fc.assert(
        fc.property(
          validPoolIdArb,
          hexHashArb,
          (poolId: string, hash: string) => {
            const key = makeStorageKey(poolId, hash);
            const colonIndex = key.indexOf(':');
            expect(colonIndex).toBe(poolId.length);
            expect(key.substring(0, colonIndex)).toBe(poolId);
            expect(key.substring(colonIndex + 1)).toBe(hash);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Distinct (poolId, hash) pairs produce distinct storage keys,
     * ensuring no collisions in the key space.
     *
     * **Validates: Requirements 3.3**
     */
    it('distinct poolId/hash pairs produce distinct storage keys', () => {
      fc.assert(
        fc.property(
          validPoolIdArb,
          hexHashArb,
          validPoolIdArb,
          hexHashArb,
          (poolId1: string, hash1: string, poolId2: string, hash2: string) => {
            fc.pre(poolId1 !== poolId2 || hash1 !== hash2);
            const key1 = makeStorageKey(poolId1, hash1);
            const key2 = makeStorageKey(poolId2, hash2);
            expect(key1).not.toBe(key2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
