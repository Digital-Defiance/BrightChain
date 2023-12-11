/**
 * Feature: architectural-gaps, Property 22: ECDSA challenge-response round-trip
 *
 * For any valid ECDSA key pair, creating a challenge, signing it with the
 * private key, and verifying the signature with the corresponding public key
 * should succeed. Verifying with any other public key should fail.
 *
 * **Validates: Requirements 9.1, 9.2**
 */
import { describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';
import fc from 'fast-check';

import { ECDSANodeAuthenticator } from './ecdsaNodeAuthenticator';

/**
 * Generate a secp256k1 key pair as raw bytes.
 * Returns { privateKey: 32 bytes, publicKey: 65 bytes (uncompressed) }
 */
function generateKeyPair(): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} {
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.generateKeys();
  return {
    privateKey: new Uint8Array(ecdh.getPrivateKey()),
    publicKey: new Uint8Array(ecdh.getPublicKey()),
  };
}

/**
 * fast-check arbitrary that produces a fresh secp256k1 key pair on each draw.
 * We use fc.constant(null).map() to generate a new key pair per sample,
 * ensuring each iteration gets an independent key pair.
 */
const arbKeyPair = fc.constant(null).map(() => generateKeyPair());

describe('ECDSANodeAuthenticator Property Tests', () => {
  const auth = new ECDSANodeAuthenticator();

  it('Property 22a: sign+verify with correct key pair always succeeds — **Validates: Requirements 9.1, 9.2**', async () => {
    await fc.assert(
      fc.asyncProperty(arbKeyPair, async (keyPair) => {
        const challenge = auth.createChallenge();
        const signature = await auth.signChallenge(
          challenge,
          keyPair.privateKey,
        );
        const valid = await auth.verifySignature(
          challenge,
          signature,
          keyPair.publicKey,
        );
        expect(valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 22b: sign with key1 + verify with different key2 always fails — **Validates: Requirements 9.1, 9.2**', async () => {
    await fc.assert(
      fc.asyncProperty(arbKeyPair, arbKeyPair, async (keyPair1, keyPair2) => {
        // Only test when the two key pairs are actually different
        fc.pre(
          !Buffer.from(keyPair1.publicKey).equals(
            Buffer.from(keyPair2.publicKey),
          ),
        );

        const challenge = auth.createChallenge();
        const signature = await auth.signChallenge(
          challenge,
          keyPair1.privateKey,
        );
        const valid = await auth.verifySignature(
          challenge,
          signature,
          keyPair2.publicKey,
        );
        expect(valid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
