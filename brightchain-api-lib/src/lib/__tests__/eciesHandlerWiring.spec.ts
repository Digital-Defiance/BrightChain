/**
 * @fileoverview Unit tests for ECIES handler wiring in application.ts
 *
 * Tests the ECIES key encryption handler logic in isolation (without full App startup).
 * The handler uses ECIESService.core primitives (ECDH + HKDF + XOR) and produces
 * output in the format `ecies:ephemeralPubKeyHex:wrappedKeyHex`.
 *
 * Validates: Requirements 8.4, 8.5
 */

import { ECIESService } from '@digitaldefiance/ecies-lib';
import { MissingPublicKeyError } from '@brightchain/brightchain-lib';

// ─── Shared ECIES instance ─────────────────────────────────────────────────

const eciesService = new ECIESService();

// ─── Handler factory (mirrors application.ts logic) ─────────────────────────

/**
 * Builds the same ECIES key encryption handler that application.ts creates,
 * but accepts an explicit public key cache so we can test in isolation.
 */
function buildEciesKeyEncryptionHandler(
  memberPublicKeyCache: Map<string, Uint8Array>,
) {
  return (memberId: string, symmetricKey: Uint8Array): string => {
    const publicKey = memberPublicKeyCache.get(memberId);
    if (!publicKey) {
      throw new MissingPublicKeyError(memberId);
    }

    const ephemeralPrivateKey = eciesService.core.generatePrivateKey();
    const ephemeralPublicKey =
      eciesService.core.getPublicKey(ephemeralPrivateKey);

    const sharedSecret = eciesService.core.computeSharedSecret(
      ephemeralPrivateKey,
      publicKey,
    );
    const wrappingKey = eciesService.core.deriveSharedKey(sharedSecret);

    const wrapped = new Uint8Array(symmetricKey.length);
    for (let i = 0; i < symmetricKey.length; i++) {
      wrapped[i] = symmetricKey[i] ^ wrappingKey[i % wrappingKey.length];
    }

    const ephHex = Buffer.from(ephemeralPublicKey).toString('hex');
    const wrappedHex = Buffer.from(wrapped).toString('hex');
    return `ecies:${ephHex}:${wrappedHex}`;
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ECIES handler wiring (Requirements 8.4, 8.5)', () => {
  // Generate a member key pair once for all tests
  const memberPrivateKey = eciesService.core.generatePrivateKey();
  const memberPublicKey = eciesService.core.getPublicKey(memberPrivateKey);
  const memberId = 'test-member-001';

  // A 256-bit (32-byte) symmetric key
  const symmetricKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) symmetricKey[i] = i + 1;

  let handler: (memberId: string, symmetricKey: Uint8Array) => string;
  let cache: Map<string, Uint8Array>;

  beforeEach(() => {
    cache = new Map<string, Uint8Array>();
    cache.set(memberId, memberPublicKey);
    handler = buildEciesKeyEncryptionHandler(cache);
  });

  it('should return a string starting with "ecies:" (not placeholder "enc:" format)', () => {
    const result = handler(memberId, symmetricKey);
    expect(result.startsWith('ecies:')).toBe(true);
    expect(result.startsWith('enc:')).toBe(false);
  });

  it('should contain valid hex-encoded ephemeral public key and wrapped key', () => {
    const result = handler(memberId, symmetricKey);
    const parts = result.split(':');

    // Format: ecies:<ephemeralPubKeyHex>:<wrappedKeyHex>
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('ecies');

    const ephHex = parts[1];
    const wrappedHex = parts[2];

    // Both should be valid hex strings (even number of hex chars)
    expect(ephHex).toMatch(/^[0-9a-f]+$/);
    expect(wrappedHex).toMatch(/^[0-9a-f]+$/);

    // Ephemeral public key should be a compressed secp256k1 key (33 bytes = 66 hex chars)
    expect(ephHex.length).toBe(66);

    // Wrapped key should be same length as the input symmetric key (32 bytes = 64 hex chars)
    expect(wrappedHex.length).toBe(64);
  });

  it('should produce output decryptable by the corresponding ECIES private key', () => {
    const result = handler(memberId, symmetricKey);
    const parts = result.split(':');
    const ephemeralPublicKey = Buffer.from(parts[1], 'hex');
    const wrappedKey = Buffer.from(parts[2], 'hex');

    // Reverse the wrapping: compute the same shared secret using the
    // member's private key and the ephemeral public key, then XOR.
    const sharedSecret = eciesService.core.computeSharedSecret(
      memberPrivateKey,
      ephemeralPublicKey,
    );
    const wrappingKey = eciesService.core.deriveSharedKey(sharedSecret);

    const unwrapped = new Uint8Array(wrappedKey.length);
    for (let i = 0; i < wrappedKey.length; i++) {
      unwrapped[i] = wrappedKey[i] ^ wrappingKey[i % wrappingKey.length];
    }

    expect(unwrapped).toEqual(symmetricKey);
  });

  it('should throw MissingPublicKeyError when member public key is not in cache', () => {
    const unknownMemberId = 'unknown-member-999';

    expect(() => handler(unknownMemberId, symmetricKey)).toThrow(
      MissingPublicKeyError,
    );
    expect(() => handler(unknownMemberId, symmetricKey)).toThrow(
      /unknown-member-999/,
    );
  });

  it('should produce different ciphertext for each invocation (ephemeral key is random)', () => {
    const result1 = handler(memberId, symmetricKey);
    const result2 = handler(memberId, symmetricKey);

    // Both should be valid ecies: outputs
    expect(result1.startsWith('ecies:')).toBe(true);
    expect(result2.startsWith('ecies:')).toBe(true);

    // Ephemeral keys (and thus wrapped keys) should differ
    expect(result1).not.toBe(result2);
  });
});
