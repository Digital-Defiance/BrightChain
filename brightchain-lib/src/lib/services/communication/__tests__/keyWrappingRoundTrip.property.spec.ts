/**
 * Property-based tests for ECIES Key Encryption Handler — Property 1: Key wrapping round-trip.
 *
 * Feature: brightchat-e2e-encryption, Property 1: Key wrapping round-trip
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 8.5**
 *
 * For any 256-bit symmetric key and for any valid ECIES key pair (public key, private key),
 * wrapping the symmetric key under the public key using `ECIESService.encryptBasic` and then
 * unwrapping with the private key SHALL produce the original symmetric key byte-for-byte.
 *
 * Generator strategy: Random 32-byte keys, random ECIES key pairs via `eciesService.core.generatePrivateKey()`
 */

import { ECIESService } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { createEciesKeyEncryptionHandler } from '../eciesKeyEncryptionHandler';

// ─── Shared ECIES instance ─────────────────────────────────────────────────

const ecies = new ECIESService();

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for a random 32-byte (256-bit) symmetric key. */
const arbSymmetricKey = fc
  .uint8Array({ minLength: 32, maxLength: 32 })
  .filter((arr) => arr.some((b) => b !== 0)); // avoid all-zero keys

/** Arbitrary for a random member ID string. */
const arbMemberId = fc.uuid();

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 1: Key wrapping round-trip', () => {
  /**
   * Property 1: Key wrapping round-trip
   *
   * **Validates: Requirements 10.1, 10.2, 10.3, 8.5**
   *
   * For any 256-bit symmetric key and for any valid ECIES key pair,
   * wrapping the symmetric key under the public key and then unwrapping
   * with the private key SHALL produce the original symmetric key byte-for-byte.
   */
  it('should produce the original key after wrap then unwrap for any 256-bit key and any ECIES key pair', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSymmetricKey,
        arbMemberId,
        async (symmetricKey, memberId) => {
          // Generate a fresh ECIES key pair for this iteration
          const privateKey = ecies.core.generatePrivateKey();
          const publicKey = ecies.getPublicKey(privateKey);

          // Build the handler with real ECIES encryption
          const handler = createEciesKeyEncryptionHandler({
            eciesService: {
              encryptBasic: (pk: Uint8Array, pt: Uint8Array) =>
                ecies.encryptBasic(pk, pt),
            },
            getMemberPublicKey: async () => publicKey,
          });

          // Wrap: encrypt the symmetric key under the member's public key
          const wrappedKey = await handler(memberId, symmetricKey);

          // Unwrap: decrypt the wrapped key with the member's private key
          const unwrappedKey = await ecies.decryptBasicWithHeader(
            privateKey,
            wrappedKey,
          );

          // Assert byte-for-byte equality
          expect(new Uint8Array(unwrappedKey)).toEqual(symmetricKey);
        },
      ),
      { numRuns: 100 },
    );
  });
});
