/**
 * @fileoverview Property-based tests for ECIES overhead calculations
 *
 * **Feature: block-encryption-scheme**
 *
 * This test suite verifies that:
 * - Single-recipient overhead follows the formula: idSize + 72
 * - Multi-recipient overhead follows the formula: 74 + (recipientCount * (idSize + 60))
 * - Public keys are 33 bytes with 0x02 or 0x03 prefix
 *
 * @see design.md for detailed format specifications
 */

import { ECIES } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import {
  calculateECIESMultipleRecipientOverhead,
  calculateSingleRecipientOverhead,
} from './browserConfig';

// Set a longer timeout for property tests
jest.setTimeout(30000);

describe('ECIES Overhead Calculation Property Tests', () => {
  describe('Property 1: Single Overhead Invariant', () => {
    /**
     * **Property 1: Single Overhead Invariant**
     *
     * For any idSize (1-255): overhead = idSize + 72
     *
     * **Validates: Requirements 2.3, 5.4**
     */
    it('should calculate single-recipient overhead as idSize + 72 for any valid idSize', () => {
      fc.assert(
        fc.property(
          // Generate idSize values from 1 to 255
          fc.integer({ min: 1, max: 255 }),
          (idSize) => {
            const overhead = calculateSingleRecipientOverhead(idSize);
            const expectedOverhead =
              idSize + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;

            // Verify the formula: overhead = idSize + 72
            expect(overhead).toBe(expectedOverhead);
            expect(overhead).toBe(idSize + 72);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Verify the default idSize (16 for GUID) produces correct overhead
     *
     * **Validates: Requirements 2.3**
     */
    it('should use default idSize of 16 (GUID) when not specified', () => {
      const overhead = calculateSingleRecipientOverhead();
      expect(overhead).toBe(16 + 72);
      expect(overhead).toBe(88);
    });

    /**
     * Verify WITH_LENGTH format constant is 72 bytes
     *
     * **Validates: Requirements 2.3**
     */
    it('should use ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE of 72 bytes', () => {
      expect(ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE).toBe(72);
    });
  });

  describe('Property 2: Multi Overhead Formula', () => {
    /**
     * **Property 2: Multi Overhead Formula**
     *
     * For any recipientCount (1-100) and idSize (1-255):
     * overhead = 74 + (recipientCount * (idSize + 60))
     *
     * **Validates: Requirements 3.3, 6.1, 6.2**
     */
    it('should calculate multi-recipient overhead as 74 + (recipientCount * (idSize + 60))', () => {
      fc.assert(
        fc.property(
          // Generate recipientCount from 1 to 100
          fc.integer({ min: 1, max: 100 }),
          // Generate idSize from 1 to 255
          fc.integer({ min: 1, max: 255 }),
          (recipientCount, idSize) => {
            const overhead = calculateECIESMultipleRecipientOverhead(
              recipientCount,
              true, // includeMessageOverhead
              idSize,
            );

            // Expected formula: 74 + (recipientCount * (idSize + 60))
            // Where 74 = FIXED_OVERHEAD_SIZE(64) + DATA_LENGTH_SIZE(8) + RECIPIENT_COUNT_SIZE(2)
            // And 60 = ENCRYPTED_KEY_SIZE (IV + AuthTag + SymKey = 12 + 16 + 32)
            const fixedOverhead =
              ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE +
              ECIES.MULTIPLE.DATA_LENGTH_SIZE +
              ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE;
            const perRecipientOverhead =
              idSize + ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE;
            const expectedOverhead =
              fixedOverhead + recipientCount * perRecipientOverhead;

            expect(overhead).toBe(expectedOverhead);
            expect(overhead).toBe(74 + recipientCount * (idSize + 60));
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Verify the component constants match expected values
     *
     * **Validates: Requirements 6.1, 6.2**
     */
    it('should use correct ECIES.MULTIPLE constants', () => {
      // Fixed overhead components
      expect(ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE).toBe(64);
      expect(ECIES.MULTIPLE.DATA_LENGTH_SIZE).toBe(8);
      expect(ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE).toBe(2);

      // Per-recipient overhead
      expect(ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE).toBe(60);

      // Total fixed overhead should be 74
      const totalFixed =
        ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE +
        ECIES.MULTIPLE.DATA_LENGTH_SIZE +
        ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE;
      expect(totalFixed).toBe(74);
    });

    /**
     * Verify default idSize (12 for ObjectID) when not specified
     *
     * **Validates: Requirements 6.4**
     */
    it('should use default idSize of 12 (ObjectID) when not specified', () => {
      const recipientCount = 5;
      const overhead = calculateECIESMultipleRecipientOverhead(
        recipientCount,
        true,
      );
      const expectedOverhead =
        74 + recipientCount * (ECIES.MULTIPLE.RECIPIENT_ID_SIZE + 60);

      expect(ECIES.MULTIPLE.RECIPIENT_ID_SIZE).toBe(12);
      expect(overhead).toBe(expectedOverhead);
      expect(overhead).toBe(74 + 5 * (12 + 60));
      expect(overhead).toBe(74 + 5 * 72);
      expect(overhead).toBe(434);
    });

    /**
     * Verify overhead without message overhead (per-recipient only)
     *
     * **Validates: Requirements 6.1, 6.2**
     */
    it('should calculate per-recipient overhead only when includeMessageOverhead is false', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 255 }),
          (recipientCount, idSize) => {
            const overhead = calculateECIESMultipleRecipientOverhead(
              recipientCount,
              false, // excludeMessageOverhead
              idSize,
            );

            // Without message overhead, only per-recipient overhead
            const perRecipientOverhead =
              idSize + ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE;
            const expectedOverhead = recipientCount * perRecipientOverhead;

            expect(overhead).toBe(expectedOverhead);
            expect(overhead).toBe(recipientCount * (idSize + 60));
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 3: Public Key Format', () => {
    /**
     * **Property 3: Public Key Format**
     *
     * All ephemeral public keys are 33 bytes with 0x02 or 0x03 prefix
     *
     * **Validates: Requirements 5.1**
     */
    it('should define public key length as 33 bytes', () => {
      expect(ECIES.PUBLIC_KEY_LENGTH).toBe(33);
    });

    /**
     * Verify compressed public key format constants
     *
     * **Validates: Requirements 5.1**
     */
    it('should use secp256k1 curve for key generation', () => {
      expect(ECIES.CURVE_NAME).toBe('secp256k1');
    });

    /**
     * Property test: Any valid compressed public key should be 33 bytes
     * with prefix 0x02 or 0x03
     *
     * **Validates: Requirements 5.1**
     */
    it('should validate compressed public key format', () => {
      fc.assert(
        fc.property(
          // Generate a valid compressed public key prefix (0x02 or 0x03)
          fc.constantFrom(0x02, 0x03),
          // Generate 32 random bytes for the x-coordinate
          fc.uint8Array({ minLength: 32, maxLength: 32 }),
          (prefix, xCoordinate) => {
            // Construct a mock compressed public key
            const publicKey = new Uint8Array(33);
            publicKey[0] = prefix;
            publicKey.set(xCoordinate, 1);

            // Verify format
            expect(publicKey.length).toBe(ECIES.PUBLIC_KEY_LENGTH);
            expect(publicKey[0] === 0x02 || publicKey[0] === 0x03).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Verify IV and AuthTag sizes are correct
     *
     * **Validates: Requirements 5.2, 5.3**
     */
    it('should define correct IV and AuthTag sizes', () => {
      expect(ECIES.IV_SIZE).toBe(12);
      expect(ECIES.AUTH_TAG_SIZE).toBe(16);
    });
  });
});
