/**
 * Property-based tests for VaultEncryption.
 *
 * Tests the AES-256-GCM encryption implementation used for vault entries.
 * Validates round-trip encryption, key validation, and error handling.
 *
 * Requirements: 2.2, 2.3, 2.4, 3.2
 */

import * as crypto from 'crypto';
import fc from 'fast-check';
import { VaultEncryption } from './vaultEncryption';

describe('VaultEncryption', () => {
  // Generate valid 32-byte vault keys
  const vaultKeyArb = fc.uint8Array({ minLength: 32, maxLength: 32 });

  // Generate arbitrary plaintext data
  const plaintextArb = fc.uint8Array({ minLength: 0, maxLength: 10000 });

  // Generate arbitrary string data
  const stringArb = fc.string({ minLength: 0, maxLength: 5000 });

  describe('Property 1: Encrypt-decrypt round-trip preserves data', () => {
    /**
     * For any valid vault key and plaintext, encrypting then decrypting
     * should return the original plaintext exactly.
     *
     * **Validates: Requirements 2.2, 2.3**
     */
    it('binary data round-trip', () => {
      fc.assert(
        fc.property(vaultKeyArb, plaintextArb, (vaultKey, plaintext) => {
          const encrypted = VaultEncryption.encrypt(vaultKey, plaintext);
          const decrypted = VaultEncryption.decrypt(vaultKey, encrypted);

          expect(decrypted.length).toBe(plaintext.length);
          expect(Buffer.from(decrypted).equals(Buffer.from(plaintext))).toBe(
            true,
          );
        }),
        { numRuns: 100 },
      );
    });

    /**
     * For any valid vault key and string, encrypting then decrypting
     * should return the original string exactly.
     *
     * **Validates: Requirements 2.2, 2.3**
     */
    it('string data round-trip', () => {
      fc.assert(
        fc.property(vaultKeyArb, stringArb, (vaultKey, plaintext) => {
          const encrypted = VaultEncryption.encryptString(vaultKey, plaintext);
          const decrypted = VaultEncryption.decryptString(vaultKey, encrypted);

          expect(decrypted).toBe(plaintext);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 2: Different IVs produce different ciphertexts', () => {
    /**
     * For any vault key and plaintext, encrypting the same data twice
     * should produce different ciphertexts (due to random IV).
     *
     * **Validates: Requirement 2.4 (security)**
     */
    it('same plaintext produces different ciphertexts', () => {
      fc.assert(
        fc.property(vaultKeyArb, plaintextArb, (vaultKey, plaintext) => {
          fc.pre(plaintext.length > 0); // Empty plaintext would have same auth tag

          const encrypted1 = VaultEncryption.encrypt(vaultKey, plaintext);
          const encrypted2 = VaultEncryption.encrypt(vaultKey, plaintext);

          // Ciphertexts should differ (different random IVs)
          expect(Buffer.from(encrypted1).equals(Buffer.from(encrypted2))).toBe(
            false,
          );

          // But both should decrypt to the same plaintext
          const decrypted1 = VaultEncryption.decrypt(vaultKey, encrypted1);
          const decrypted2 = VaultEncryption.decrypt(vaultKey, encrypted2);
          expect(Buffer.from(decrypted1).equals(Buffer.from(decrypted2))).toBe(
            true,
          );
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 3: Wrong key fails decryption', () => {
    /**
     * For any two different vault keys, data encrypted with one key
     * should fail to decrypt with the other key.
     *
     * **Validates: Requirement 2.3 (security)**
     */
    it('decryption with wrong key throws', () => {
      fc.assert(
        fc.property(
          vaultKeyArb,
          vaultKeyArb,
          plaintextArb,
          (key1, key2, plaintext) => {
            // Ensure keys are different
            fc.pre(!Buffer.from(key1).equals(Buffer.from(key2)));
            fc.pre(plaintext.length > 0);

            const encrypted = VaultEncryption.encrypt(key1, plaintext);

            // Decryption with wrong key should throw (auth tag mismatch)
            expect(() => VaultEncryption.decrypt(key2, encrypted)).toThrow();
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 4: Tampered ciphertext fails authentication', () => {
    /**
     * For any encrypted data, modifying any byte should cause
     * decryption to fail (authenticated encryption).
     *
     * **Validates: Requirement 2.4 (integrity)**
     */
    it('modified ciphertext throws on decryption', () => {
      fc.assert(
        fc.property(vaultKeyArb, plaintextArb, (vaultKey, plaintext) => {
          fc.pre(plaintext.length > 0);

          const encrypted = VaultEncryption.encrypt(vaultKey, plaintext);

          // Modify a random byte in the ciphertext (after IV and auth tag)
          const tampered = new Uint8Array(encrypted);
          const modifyIndex =
            28 + (Math.floor(Math.random() * (tampered.length - 28)) || 0);
          if (modifyIndex < tampered.length) {
            tampered[modifyIndex] ^= 0xff; // Flip all bits

            // Decryption should fail due to auth tag mismatch
            expect(() => VaultEncryption.decrypt(vaultKey, tampered)).toThrow();
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 5: Key length validation', () => {
    /**
     * Keys that are not exactly 32 bytes should be rejected.
     *
     * **Validates: Requirement 2.2 (security)**
     */
    it('rejects keys shorter than 32 bytes', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 0, maxLength: 31 }),
          plaintextArb,
          (shortKey, plaintext) => {
            expect(() => VaultEncryption.encrypt(shortKey, plaintext)).toThrow(
              /32 bytes/,
            );
          },
        ),
        { numRuns: 30 },
      );
    });

    it('rejects keys longer than 32 bytes', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 33, maxLength: 64 }),
          plaintextArb,
          (longKey, plaintext) => {
            expect(() => VaultEncryption.encrypt(longKey, plaintext)).toThrow(
              /32 bytes/,
            );
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 6: Ciphertext length is predictable', () => {
    /**
     * Ciphertext length should be plaintext length + overhead (28 bytes).
     *
     * **Validates: Requirement 2.2**
     */
    it('ciphertext length equals plaintext + 28 bytes overhead', () => {
      fc.assert(
        fc.property(vaultKeyArb, plaintextArb, (vaultKey, plaintext) => {
          const encrypted = VaultEncryption.encrypt(vaultKey, plaintext);
          const overhead = VaultEncryption.getOverheadSize();

          expect(encrypted.length).toBe(plaintext.length + overhead);
          expect(overhead).toBe(28); // 12 (IV) + 16 (auth tag)
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 7: Empty plaintext handling', () => {
    /**
     * Empty plaintext should encrypt and decrypt correctly.
     *
     * **Validates: Requirement 2.2**
     */
    it('handles empty plaintext', () => {
      fc.assert(
        fc.property(vaultKeyArb, (vaultKey) => {
          const empty = new Uint8Array(0);
          const encrypted = VaultEncryption.encrypt(vaultKey, empty);
          const decrypted = VaultEncryption.decrypt(vaultKey, encrypted);

          expect(decrypted.length).toBe(0);
          expect(encrypted.length).toBe(28); // Just overhead
        }),
        { numRuns: 20 },
      );
    });

    it('handles empty string', () => {
      fc.assert(
        fc.property(vaultKeyArb, (vaultKey) => {
          const encrypted = VaultEncryption.encryptString(vaultKey, '');
          const decrypted = VaultEncryption.decryptString(vaultKey, encrypted);

          expect(decrypted).toBe('');
        }),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 8: Unicode string handling', () => {
    /**
     * Unicode strings should encrypt and decrypt correctly.
     *
     * **Validates: Requirement 2.2**
     */
    it('handles unicode strings', () => {
      fc.assert(
        fc.property(
          vaultKeyArb,
          fc.string({ minLength: 1, maxLength: 1000 }),
          (vaultKey, plaintext) => {
            const encrypted = VaultEncryption.encryptString(
              vaultKey,
              plaintext,
            );
            const decrypted = VaultEncryption.decryptString(
              vaultKey,
              encrypted,
            );

            expect(decrypted).toBe(plaintext);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Deterministic tests for known vectors', () => {
    it('encrypts and decrypts a known string', () => {
      const key = crypto.randomBytes(32);
      const plaintext = 'Hello, BrightPass!';

      const encrypted = VaultEncryption.encryptString(key, plaintext);
      const decrypted = VaultEncryption.decryptString(key, encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('encrypts and decrypts JSON data', () => {
      const key = crypto.randomBytes(32);
      const data = {
        username: 'test@example.com',
        password: 'super-secret-123!',
        notes: 'This is a test entry with émojis 🔐',
      };
      const plaintext = JSON.stringify(data);

      const encrypted = VaultEncryption.encryptString(key, plaintext);
      const decrypted = VaultEncryption.decryptString(key, encrypted);
      const parsed = JSON.parse(decrypted);

      expect(parsed).toEqual(data);
    });
  });
});
