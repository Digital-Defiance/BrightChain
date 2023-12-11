/**
 * Property-based tests for Vault Key Derivation
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the vault key derivation
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import fc from 'fast-check';
import { VaultKeyDerivation } from './vaultKeyDerivation';

/**
 * Arbitrary for vault seed (64 bytes, typical BIP39 seed length)
 */
const vaultSeedArb = fc.uint8Array({ minLength: 64, maxLength: 64 });

/**
 * Arbitrary for master password (non-empty string)
 */
const masterPasswordArb = fc.string({ minLength: 1, maxLength: 128 });

/**
 * Arbitrary for vault ID (UUID-like string)
 */
const vaultIdArb = fc.uuid();

/**
 * Helper function to compare two Uint8Arrays for equality
 */
function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Property 10: Key Derivation Determinism and Uniqueness
 *
 * For any vault seed, master password, and vault ID, deriving the key multiple times
 * SHALL produce identical 32-byte results. Different vault IDs with the same seed/password
 * SHALL produce different keys.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */
describe('Feature: api-lib-to-lib-migration, Property 10: Key Derivation Determinism and Uniqueness', () => {
  /**
   * Property 10a: Derived key is always exactly 32 bytes (AES-256 key size)
   *
   * Validates Requirement 5.1: THE Vault_Key_Derivation SHALL derive 32-byte AES-256 keys using HKDF-SHA256
   */
  it('Property 10a: Derived key is always exactly 32 bytes', () => {
    fc.assert(
      fc.property(
        vaultSeedArb,
        masterPasswordArb,
        vaultIdArb,
        (seed, password, vaultId) => {
          const key = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId,
          );
          expect(key).toBeInstanceOf(Uint8Array);
          expect(key.length).toBe(32);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10b: Key derivation is deterministic - same inputs produce same output
   *
   * Validates Requirements 5.1, 5.2, 5.3: Deterministic key derivation from seed + password + vaultId
   */
  it('Property 10b: Key derivation is deterministic - same inputs produce same output', () => {
    fc.assert(
      fc.property(
        vaultSeedArb,
        masterPasswordArb,
        vaultIdArb,
        (seed, password, vaultId) => {
          const key1 = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId,
          );
          const key2 = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId,
          );
          const key3 = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId,
          );

          expect(uint8ArraysEqual(key1, key2)).toBe(true);
          expect(uint8ArraysEqual(key2, key3)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10c: Different vault IDs produce different keys (domain separation)
   *
   * Validates Requirement 5.3: Uses vault ID as the info parameter for domain separation
   */
  it('Property 10c: Different vault IDs produce different keys', () => {
    fc.assert(
      fc.property(
        vaultSeedArb,
        masterPasswordArb,
        vaultIdArb,
        (seed, password, vaultId1) => {
          // Create a guaranteed different vault ID by appending a suffix
          const vaultId2 = vaultId1 + '-different';

          const key1 = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId1,
          );
          const key2 = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId2,
          );

          expect(uint8ArraysEqual(key1, key2)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10d: Different master passwords produce different keys
   *
   * Validates Requirement 5.2: Combines vault seed and master password as input key material
   */
  it('Property 10d: Different master passwords produce different keys', () => {
    fc.assert(
      fc.property(
        vaultSeedArb,
        masterPasswordArb,
        vaultIdArb,
        (seed, password1, vaultId) => {
          // Create a guaranteed different password by appending a suffix
          const password2 = password1 + '-different';

          const key1 = VaultKeyDerivation.deriveVaultKey(
            seed,
            password1,
            vaultId,
          );
          const key2 = VaultKeyDerivation.deriveVaultKey(
            seed,
            password2,
            vaultId,
          );

          expect(uint8ArraysEqual(key1, key2)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10e: Different vault seeds produce different keys
   *
   * Validates Requirement 5.2: Combines vault seed and master password as input key material
   */
  it('Property 10e: Different vault seeds produce different keys', () => {
    fc.assert(
      fc.property(
        vaultSeedArb,
        masterPasswordArb,
        vaultIdArb,
        (seed1, password, vaultId) => {
          // Create a guaranteed different seed by flipping the first byte
          const seed2 = new Uint8Array(seed1);
          seed2[0] = (seed2[0] + 1) % 256;

          const key1 = VaultKeyDerivation.deriveVaultKey(
            seed1,
            password,
            vaultId,
          );
          const key2 = VaultKeyDerivation.deriveVaultKey(
            seed2,
            password,
            vaultId,
          );

          expect(uint8ArraysEqual(key1, key2)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10f: Key derivation works with various seed sizes
   *
   * While BIP39 seeds are typically 64 bytes, the implementation should handle
   * different seed sizes gracefully.
   */
  it('Property 10f: Key derivation works with various seed sizes', () => {
    const variableSeedArb = fc.uint8Array({ minLength: 16, maxLength: 128 });

    fc.assert(
      fc.property(
        variableSeedArb,
        masterPasswordArb,
        vaultIdArb,
        (seed, password, vaultId) => {
          const key = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId,
          );
          expect(key).toBeInstanceOf(Uint8Array);
          expect(key.length).toBe(32);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10g: Key derivation handles empty vault ID (edge case)
   *
   * Empty vault ID should still produce a valid 32-byte key
   */
  it('Property 10g: Key derivation handles empty vault ID', () => {
    fc.assert(
      fc.property(vaultSeedArb, masterPasswordArb, (seed, password) => {
        const key = VaultKeyDerivation.deriveVaultKey(seed, password, '');
        expect(key).toBeInstanceOf(Uint8Array);
        expect(key.length).toBe(32);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10h: Key derivation handles Unicode passwords
   *
   * Master passwords with Unicode characters should work correctly
   */
  it('Property 10h: Key derivation handles Unicode passwords', () => {
    // Use string arbitrary which includes various characters
    const unicodePasswordArb = fc.string({
      minLength: 1,
      maxLength: 64,
    });

    fc.assert(
      fc.property(
        vaultSeedArb,
        unicodePasswordArb,
        vaultIdArb,
        (seed, password, vaultId) => {
          const key = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId,
          );
          expect(key).toBeInstanceOf(Uint8Array);
          expect(key.length).toBe(32);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10i: Key derivation handles Unicode vault IDs
   *
   * Vault IDs with Unicode characters should work correctly
   */
  it('Property 10i: Key derivation handles Unicode vault IDs', () => {
    // Use string arbitrary which includes various characters
    const unicodeVaultIdArb = fc.string({
      minLength: 1,
      maxLength: 64,
    });

    fc.assert(
      fc.property(
        vaultSeedArb,
        masterPasswordArb,
        unicodeVaultIdArb,
        (seed, password, vaultId) => {
          const key = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId,
          );
          expect(key).toBeInstanceOf(Uint8Array);
          expect(key.length).toBe(32);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10j: Derived keys have high entropy (no obvious patterns)
   *
   * The derived key should not have obvious patterns like all zeros or repeated bytes
   */
  it('Property 10j: Derived keys have high entropy', () => {
    fc.assert(
      fc.property(
        vaultSeedArb,
        masterPasswordArb,
        vaultIdArb,
        (seed, password, vaultId) => {
          const key = VaultKeyDerivation.deriveVaultKey(
            seed,
            password,
            vaultId,
          );

          // Check that key is not all zeros
          const allZeros = key.every((byte) => byte === 0);
          expect(allZeros).toBe(false);

          // Check that key is not all the same byte
          const firstByte = key[0];
          const allSame = key.every((byte) => byte === firstByte);
          expect(allSame).toBe(false);

          // Check that key has at least some variety (at least 8 unique bytes)
          const uniqueBytes = new Set(key);
          expect(uniqueBytes.size).toBeGreaterThanOrEqual(8);
        },
      ),
      { numRuns: 100 },
    );
  });
});
