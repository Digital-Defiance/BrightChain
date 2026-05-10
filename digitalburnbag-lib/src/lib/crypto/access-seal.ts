import { hmac } from '@noble/hashes/hmac';
import { sha3_512 } from '@noble/hashes/sha3';

/**
 * Access seal derivation and verification using HMAC-SHA3-512.
 * Domain-separated: pristine and accessed seals are cryptographically independent.
 *
 * Validates: Requirements 1.3, 3.1–3.6, 18.3
 */
export class AccessSeal {
  static readonly PRISTINE_DOMAIN = 'burn-bag-v1-pristine';
  static readonly ACCESSED_DOMAIN = 'burn-bag-v1-accessed';

  /** Derive a seal from tree seed and domain separator. */
  static derive(treeSeed: Uint8Array, domain: string): Uint8Array {
    return hmac(sha3_512, treeSeed, new TextEncoder().encode(domain));
  }

  /** Check if a seal matches the pristine state. */
  static verifyPristine(treeSeed: Uint8Array, seal: Uint8Array): boolean {
    const expected = AccessSeal.derive(treeSeed, AccessSeal.PRISTINE_DOMAIN);
    return AccessSeal.constantTimeEqual(expected, seal);
  }

  /** Check if a seal matches the accessed state. */
  static verifyAccessed(treeSeed: Uint8Array, seal: Uint8Array): boolean {
    const expected = AccessSeal.derive(treeSeed, AccessSeal.ACCESSED_DOMAIN);
    return AccessSeal.constantTimeEqual(expected, seal);
  }

  private static constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }
    return diff === 0;
  }
}
