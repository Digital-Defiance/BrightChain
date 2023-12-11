/**
 * Property-based tests for ECIES Key Encryption Handler — Property 10: Missing public key produces descriptive error.
 *
 * Feature: brightchat-e2e-encryption, Property 10: Missing public key produces descriptive error
 *
 * **Validates: Requirements 4.6, 12.1, 12.2**
 *
 * For any member ID that has no registered ECIES public key, any operation that requires
 * wrapping a key for that member (channel creation, member addition, DM creation) SHALL
 * throw an error whose message contains the affected member ID.
 *
 * Generator strategy: Random member IDs with no registered key
 */

import fc from 'fast-check';
import { createEciesKeyEncryptionHandler } from '../eciesKeyEncryptionHandler';
import { MissingPublicKeyError } from '../../../errors/encryptionErrors';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for a random member ID string (UUIDs). */
const arbMemberId = fc.uuid();

/** Arbitrary for a random 32-byte (256-bit) symmetric key. */
const arbSymmetricKey = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .filter((arr) => arr.some((b) => b !== 0));

/**
 * Arbitrary that returns null or undefined — simulating a missing public key lookup.
 */
const arbNullish = fc.constantFrom(null, undefined);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 10: Missing public key produces descriptive error', () => {
  /**
   * Property 10: Missing public key produces descriptive error
   *
   * **Validates: Requirements 4.6, 12.1, 12.2**
   *
   * For any member ID with no registered key, wrapping SHALL throw
   * a MissingPublicKeyError whose message contains the member ID.
   */
  it('should throw MissingPublicKeyError containing the member ID when public key is missing', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbSymmetricKey,
        arbNullish,
        async (memberId, symmetricKey, nullishValue) => {
          // Build handler where getMemberPublicKey always returns null or undefined
          const handler = createEciesKeyEncryptionHandler({
            eciesService: {
              encryptBasic: async () => new Uint8Array(0),
            },
            getMemberPublicKey: async () => nullishValue,
          });

          // Attempt to wrap a key for the member — should throw
          try {
            await handler(memberId, symmetricKey);
            // If we reach here, the handler did not throw — fail the property
            throw new Error('Expected MissingPublicKeyError but handler did not throw');
          } catch (err: unknown) {
            // Assert the error is a MissingPublicKeyError
            expect(err).toBeInstanceOf(MissingPublicKeyError);

            const error = err as MissingPublicKeyError;

            // Assert the error message contains the member ID
            expect(error.message).toContain(memberId);

            // Assert the error exposes the memberId property
            expect(error.memberId).toBe(memberId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
