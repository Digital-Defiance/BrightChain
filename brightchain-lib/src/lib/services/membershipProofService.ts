/**
 * @fileoverview MembershipProofService — generates and verifies ring signatures
 * proving quorum membership without revealing which specific member created content.
 *
 * Uses an Abe-Ohkubo-Suzuki (AOS) style ring signature scheme built on
 * secp256k1 ECDSA primitives. The proof is bound to a specific content hash,
 * preventing reuse across different content items.
 *
 * Ring Signature Scheme:
 * - For a ring of n public keys, the signer (at index s) generates a ring
 *   of challenges and responses such that the verification equation holds
 *   for all members, but only the signer knows which position is theirs.
 * - The challenge chain is: c_{i+1} = H(L || m || g^{r_i} * y_i^{c_i})
 *   where L is the key set, m is the message, g is the generator, y_i is
 *   the public key at index i, r_i is the response, and c_i is the challenge.
 * - The ring closes when c_0 (computed) matches c_0 (stored).
 *
 * @see Requirements 18
 * @see Design: MembershipProofService (Section 7)
 */

import { PlatformID } from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import * as secp256k1 from 'secp256k1';

import { IMembershipProofService } from '../interfaces/services/membershipProof';

/** Proof format version byte for forward compatibility */
const PROOF_VERSION = 0x01;

/**
 * Compute a 32-byte challenge hash from the ring context.
 *
 * H(keyRing || contentHash || point) → 32 bytes
 *
 * Uses SHA3-512 truncated to 32 bytes to produce a scalar suitable
 * for secp256k1 operations.
 */
function computeChallenge(
  keyRing: Uint8Array,
  contentHash: Uint8Array,
  point: Uint8Array,
): Uint8Array {
  const input = new Uint8Array(
    keyRing.length + contentHash.length + point.length,
  );
  input.set(keyRing, 0);
  input.set(contentHash, keyRing.length);
  input.set(point, keyRing.length + contentHash.length);

  const fullHash = sha3_512(input);
  // Truncate to 32 bytes for secp256k1 scalar
  return fullHash.slice(0, 32);
}

/**
 * Serialize the sorted key ring into a single buffer for hashing.
 * Keys are sorted lexicographically to ensure deterministic ordering
 * regardless of input order.
 */
function serializeKeyRing(memberPublicKeys: Uint8Array[]): Uint8Array {
  // Sort keys lexicographically for deterministic ring ordering
  const sorted = [...memberPublicKeys].sort((a, b) => {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  });

  const totalLen = sorted.reduce((sum, k) => sum + k.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const key of sorted) {
    result.set(key, offset);
    offset += key.length;
  }
  return result;
}

/**
 * Find the index of the signer's public key in the member key array.
 * Derives the public key from the private key and matches against
 * compressed public keys.
 */
function findSignerIndex(
  signerPrivateKey: Uint8Array,
  memberPublicKeys: Uint8Array[],
): number {
  const signerPubKey = secp256k1.publicKeyCreate(signerPrivateKey, true);

  for (let i = 0; i < memberPublicKeys.length; i++) {
    const compressed = secp256k1.publicKeyConvert(memberPublicKeys[i], true);
    if (
      compressed.length === signerPubKey.length &&
      compressed.every((byte, idx) => byte === signerPubKey[idx])
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * Generate cryptographically secure random bytes.
 */
function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  // Use Node.js crypto for secure random generation
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  crypto.randomFillSync(bytes);
  return bytes;
}

/**
 * Generate a valid random secp256k1 private key (scalar).
 * Ensures the key is valid (non-zero, less than curve order).
 */
function generateRandomScalar(): Uint8Array {
  let key: Uint8Array;
  do {
    key = getRandomBytes(32);
  } while (!secp256k1.privateKeyVerify(key));
  return key;
}

/**
 * Compute g^response * pubKey^challenge (EC point addition).
 *
 * This is the core ring signature verification equation for one step:
 *   R_i = g * r_i + y_i * c_i
 *
 * Where g is the secp256k1 generator, r_i is the response scalar,
 * y_i is the public key, and c_i is the challenge scalar.
 */
function computeRingPoint(
  response: Uint8Array,
  publicKey: Uint8Array,
  challenge: Uint8Array,
): Uint8Array {
  // g * response = publicKeyCreate(response)
  const gR = secp256k1.publicKeyCreate(response, true);

  // pubKey * challenge = publicKeyTweakMul(pubKey, challenge)
  const compressed = secp256k1.publicKeyConvert(publicKey, true);
  const yC = secp256k1.publicKeyTweakMul(compressed, challenge);

  // Point addition: gR + yC
  return secp256k1.publicKeyCombine([gR, yC], true);
}

/**
 * Subtract two 32-byte scalars modulo the secp256k1 curve order.
 * result = (a - b) mod n
 *
 * Uses privateKeyNegate and privateKeyTweakAdd:
 *   a - b = a + (-b)
 */
function scalarSubtract(a: Uint8Array, b: Uint8Array): Uint8Array {
  // Negate b: -b mod n
  const negB = new Uint8Array(b);
  secp256k1.privateKeyNegate(negB);

  // a + (-b) mod n
  const result = new Uint8Array(a);
  secp256k1.privateKeyTweakAdd(result, negB);
  return result;
}

/**
 * Multiply two 32-byte scalars modulo the secp256k1 curve order.
 * result = (a * b) mod n
 *
 * Uses privateKeyTweakMul which computes (key * tweak) mod n.
 */
function scalarMultiply(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a);
  secp256k1.privateKeyTweakMul(result, b);
  return result;
}

/**
 * MembershipProofService generates and verifies ring signatures
 * proving quorum membership without revealing which member.
 *
 * The ring signature scheme ensures:
 * - Any member can generate a valid proof
 * - The proof is bound to specific content (content hash)
 * - Verification succeeds against the full member key set
 * - No information about which member generated the proof is leaked
 *
 * Proof format (serialized):
 * [version: 1 byte] [n: 2 bytes (uint16 BE)] [c0: 32 bytes] [r0: 32 bytes] ... [r_{n-1}: 32 bytes]
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class MembershipProofService<TID extends PlatformID = Uint8Array>
  implements IMembershipProofService<TID>
{
  /** Generic marker for DTO compatibility */
  _platformId?: TID;

  /**
   * Generate a ring signature proving the signer is one of the current
   * quorum members. The proof is bound to the specific content hash.
   *
   * Algorithm (AOS ring signature):
   * 1. Find signer's index s in the key ring
   * 2. Generate random k (nonce) for the signer's position
   * 3. Compute initial point: g^k
   * 4. For positions (s+1) to (s-1) mod n, generate random responses
   *    and compute the challenge chain
   * 5. Close the ring by computing the signer's response:
   *    r_s = k - c_s * privateKey mod n
   *
   * @param signerPrivateKey - The signer's secp256k1 private key (32 bytes)
   * @param memberPublicKeys - Public keys of all current quorum members
   * @param contentHash - Hash of the content being signed
   * @returns The serialized ring signature proof
   * @throws Error if signer is not in the member set or member set is empty
   */
  async generateProof(
    signerPrivateKey: Uint8Array,
    memberPublicKeys: Uint8Array[],
    contentHash: Uint8Array,
  ): Promise<Uint8Array> {
    const n = memberPublicKeys.length;
    if (n === 0) {
      throw new Error('Member public key set must not be empty');
    }

    // Find signer's position in the ring
    const signerIndex = findSignerIndex(signerPrivateKey, memberPublicKeys);
    if (signerIndex === -1) {
      throw new Error('Signer is not a member of the provided key set');
    }

    const keyRing = serializeKeyRing(memberPublicKeys);

    // Step 1: Generate random nonce k for the signer
    const k = generateRandomScalar();

    // Step 2: Compute the initial point g^k
    const gK = secp256k1.publicKeyCreate(k, true);

    // Step 3: Compute challenge at position (signerIndex + 1) mod n
    const challenges: Uint8Array[] = new Array(n);
    const responses: Uint8Array[] = new Array(n);

    const nextIdx = (signerIndex + 1) % n;
    challenges[nextIdx] = computeChallenge(keyRing, contentHash, gK);

    // Step 4: For each position from (s+1) to (s-1), generate random
    // responses and compute the challenge chain
    for (let offset = 1; offset < n; offset++) {
      const i = (signerIndex + offset) % n;
      const nextI = (i + 1) % n;

      // Generate random response for position i
      responses[i] = generateRandomScalar();

      // Compute ring point: g^{r_i} * y_i^{c_i}
      const point = computeRingPoint(
        responses[i],
        memberPublicKeys[i],
        challenges[i],
      );

      // Compute next challenge
      challenges[nextI] = computeChallenge(keyRing, contentHash, point);
    }

    // Step 5: Close the ring — compute signer's response
    // r_s = k - c_s * privateKey mod n
    const cTimesKey = scalarMultiply(challenges[signerIndex], signerPrivateKey);
    responses[signerIndex] = scalarSubtract(k, cTimesKey);

    // Wipe the nonce from memory
    k.fill(0);

    // Serialize the proof
    return this.serializeProof(challenges[0], responses, n);
  }

  /**
   * Verify a membership proof against the current member set and content hash.
   *
   * Algorithm:
   * 1. Deserialize the proof to extract c_0 and all responses
   * 2. Recompute the challenge chain starting from c_0:
   *    For each i: point_i = g^{r_i} * y_i^{c_i}, c_{i+1} = H(L, m, point_i)
   * 3. The ring is valid if the recomputed c_0 matches the stored c_0
   *
   * @param proof - The serialized ring signature proof
   * @param memberPublicKeys - Public keys of all current quorum members
   * @param contentHash - Hash of the content the proof should be bound to
   * @returns True if the proof is valid
   */
  async verifyProof(
    proof: Uint8Array,
    memberPublicKeys: Uint8Array[],
    contentHash: Uint8Array,
  ): Promise<boolean> {
    try {
      const n = memberPublicKeys.length;
      if (n === 0) {
        return false;
      }

      // Deserialize the proof
      const parsed = this.deserializeProof(proof);
      if (!parsed) {
        return false;
      }

      const { c0, responses } = parsed;

      // The proof must have the same number of responses as member keys
      if (responses.length !== n) {
        return false;
      }

      // Validate all public keys
      for (const key of memberPublicKeys) {
        if (!secp256k1.publicKeyVerify(key)) {
          return false;
        }
      }

      const keyRing = serializeKeyRing(memberPublicKeys);

      // Recompute the challenge chain
      let currentChallenge = c0;
      for (let i = 0; i < n; i++) {
        // Validate the response is a valid scalar
        if (!secp256k1.privateKeyVerify(responses[i])) {
          return false;
        }

        // Compute ring point: g^{r_i} * y_i^{c_i}
        const point = computeRingPoint(
          responses[i],
          memberPublicKeys[i],
          currentChallenge,
        );

        // Compute next challenge
        currentChallenge = computeChallenge(keyRing, contentHash, point);
      }

      // The ring is valid if we arrive back at c_0
      if (currentChallenge.length !== c0.length) {
        return false;
      }

      // Constant-time comparison to prevent timing attacks
      let diff = 0;
      for (let i = 0; i < c0.length; i++) {
        diff |= currentChallenge[i] ^ c0[i];
      }
      return diff === 0;
    } catch {
      return false;
    }
  }

  /**
   * Serialize a ring signature proof into bytes.
   *
   * Format:
   * [version: 1 byte] [n: 2 bytes uint16 BE] [c0: 32 bytes] [r_0: 32 bytes] ... [r_{n-1}: 32 bytes]
   */
  private serializeProof(
    c0: Uint8Array,
    responses: Uint8Array[],
    n: number,
  ): Uint8Array {
    // 1 (version) + 2 (n) + 32 (c0) + n * 32 (responses)
    const totalLen = 1 + 2 + 32 + n * 32;
    const result = new Uint8Array(totalLen);

    let offset = 0;

    // Version byte
    result[offset] = PROOF_VERSION;
    offset += 1;

    // Ring size as uint16 big-endian
    result[offset] = (n >> 8) & 0xff;
    result[offset + 1] = n & 0xff;
    offset += 2;

    // Initial challenge c0
    result.set(c0, offset);
    offset += 32;

    // Responses
    for (let i = 0; i < n; i++) {
      result.set(responses[i], offset);
      offset += 32;
    }

    return result;
  }

  /**
   * Deserialize a ring signature proof from bytes.
   *
   * @returns Parsed proof components or null if the format is invalid
   */
  private deserializeProof(
    proof: Uint8Array,
  ): { c0: Uint8Array; responses: Uint8Array[] } | null {
    // Minimum size: 1 (version) + 2 (n) + 32 (c0) + 32 (at least 1 response)
    if (proof.length < 1 + 2 + 32 + 32) {
      return null;
    }

    let offset = 0;

    // Check version
    const version = proof[offset];
    if (version !== PROOF_VERSION) {
      return null;
    }
    offset += 1;

    // Read ring size
    const n = (proof[offset] << 8) | proof[offset + 1];
    offset += 2;

    if (n === 0) {
      return null;
    }

    // Verify total length matches
    const expectedLen = 1 + 2 + 32 + n * 32;
    if (proof.length !== expectedLen) {
      return null;
    }

    // Read c0
    const c0 = proof.slice(offset, offset + 32);
    offset += 32;

    // Read responses
    const responses: Uint8Array[] = [];
    for (let i = 0; i < n; i++) {
      responses.push(proof.slice(offset, offset + 32));
      offset += 32;
    }

    return { c0, responses };
  }
}
