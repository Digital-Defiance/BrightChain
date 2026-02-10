/**
 * VaultEncryption - Symmetric AES-256-GCM encryption for vault data.
 *
 * This module provides authenticated encryption for vault entries using
 * AES-256-GCM, the industry standard for password managers. The vault key
 * is derived from the vault's BIP39 seed + master password using HKDF.
 *
 * Security Model (Hybrid Approach - same as 1Password/Bitwarden):
 * - Vault entries: Encrypted with symmetric AES-256-GCM (fast, efficient)
 * - Vault key sharing: Wrapped with ECIES when sharing with other members
 * - Master password: Never stored, used only for key derivation
 *
 * Format: [IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]
 *
 * Requirements: 2.2, 2.3, 2.4, 3.2
 */

import * as crypto from 'crypto';

/**
 * VaultEncryption provides AES-256-GCM authenticated encryption for vault data.
 *
 * This is the production implementation used for encrypting vault entries.
 * It uses:
 * - AES-256-GCM: Authenticated encryption with associated data
 * - 12-byte IV: Randomly generated for each encryption
 * - 16-byte Auth Tag: Provides integrity verification
 *
 * The vault key must be 32 bytes (256 bits), derived from the vault's
 * BIP39 seed and master password using HKDF-SHA256.
 */
export class VaultEncryption {
  /** AES-256-GCM algorithm identifier */
  private static readonly ALGORITHM = 'aes-256-gcm' as const;

  /** IV length in bytes (96 bits as recommended by NIST SP 800-38D) */
  private static readonly IV_LENGTH = 12;

  /** Authentication tag length in bytes (128 bits for maximum security) */
  private static readonly AUTH_TAG_LENGTH = 16;

  /** Required vault key length in bytes (256 bits for AES-256) */
  private static readonly KEY_LENGTH = 32;

  /**
   * Encrypt data using AES-256-GCM.
   *
   * @param vaultKey - 32-byte vault key derived from BIP39 seed + master password
   * @param plaintext - Data to encrypt
   * @returns Encrypted data in format: [IV][Auth Tag][Ciphertext]
   * @throws Error if vault key is not 32 bytes
   */
  public static encrypt(
    vaultKey: Uint8Array,
    plaintext: Uint8Array,
  ): Uint8Array {
    if (vaultKey.length !== VaultEncryption.KEY_LENGTH) {
      throw new Error(
        `Vault key must be ${VaultEncryption.KEY_LENGTH} bytes for AES-256, got ${vaultKey.length}`,
      );
    }

    // Generate cryptographically secure random IV
    const iv = crypto.randomBytes(VaultEncryption.IV_LENGTH);

    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv(
      VaultEncryption.ALGORITHM,
      Buffer.from(vaultKey),
      iv,
    );

    // Encrypt the plaintext
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext)),
      cipher.final(),
    ]);

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: [IV (12)][Auth Tag (16)][Ciphertext]
    const result = new Uint8Array(
      VaultEncryption.IV_LENGTH +
        VaultEncryption.AUTH_TAG_LENGTH +
        encrypted.length,
    );
    result.set(iv, 0);
    result.set(authTag, VaultEncryption.IV_LENGTH);
    result.set(
      encrypted,
      VaultEncryption.IV_LENGTH + VaultEncryption.AUTH_TAG_LENGTH,
    );

    return result;
  }

  /**
   * Decrypt data using AES-256-GCM.
   *
   * @param vaultKey - 32-byte vault key derived from BIP39 seed + master password
   * @param ciphertext - Encrypted data in format: [IV][Auth Tag][Ciphertext]
   * @returns Decrypted plaintext
   * @throws Error if vault key is not 32 bytes
   * @throws Error if ciphertext is too short
   * @throws Error if authentication fails (data tampered)
   */
  public static decrypt(
    vaultKey: Uint8Array,
    ciphertext: Uint8Array,
  ): Uint8Array {
    if (vaultKey.length !== VaultEncryption.KEY_LENGTH) {
      throw new Error(
        `Vault key must be ${VaultEncryption.KEY_LENGTH} bytes for AES-256, got ${vaultKey.length}`,
      );
    }

    const minLength =
      VaultEncryption.IV_LENGTH + VaultEncryption.AUTH_TAG_LENGTH;
    if (ciphertext.length < minLength) {
      throw new Error(
        `Ciphertext too short: expected at least ${minLength} bytes, got ${ciphertext.length}`,
      );
    }

    // Extract components: [IV (12)][Auth Tag (16)][Ciphertext]
    const iv = ciphertext.slice(0, VaultEncryption.IV_LENGTH);
    const authTag = ciphertext.slice(
      VaultEncryption.IV_LENGTH,
      VaultEncryption.IV_LENGTH + VaultEncryption.AUTH_TAG_LENGTH,
    );
    const encrypted = ciphertext.slice(
      VaultEncryption.IV_LENGTH + VaultEncryption.AUTH_TAG_LENGTH,
    );

    // Create decipher with AES-256-GCM
    const decipher = crypto.createDecipheriv(
      VaultEncryption.ALGORITHM,
      Buffer.from(vaultKey),
      Buffer.from(iv),
    );

    // Set the authentication tag for verification
    decipher.setAuthTag(Buffer.from(authTag));

    // Decrypt and verify authentication
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted)),
      decipher.final(), // Throws if auth tag verification fails
    ]);

    return new Uint8Array(decrypted);
  }

  /**
   * Encrypt a string and return base64-encoded ciphertext.
   *
   * @param vaultKey - 32-byte vault key
   * @param plaintext - String to encrypt
   * @returns Base64-encoded encrypted data
   */
  public static encryptString(vaultKey: Uint8Array, plaintext: string): string {
    const encoder = new TextEncoder();
    const encrypted = VaultEncryption.encrypt(
      vaultKey,
      encoder.encode(plaintext),
    );
    return Buffer.from(encrypted).toString('base64');
  }

  /**
   * Decrypt a base64-encoded ciphertext and return the original string.
   *
   * @param vaultKey - 32-byte vault key
   * @param ciphertext - Base64-encoded encrypted data
   * @returns Decrypted string
   */
  public static decryptString(
    vaultKey: Uint8Array,
    ciphertext: string,
  ): string {
    const encrypted = new Uint8Array(Buffer.from(ciphertext, 'base64'));
    const decrypted = VaultEncryption.decrypt(vaultKey, encrypted);
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Get the overhead size added by encryption.
   * This is useful for capacity calculations.
   *
   * @returns Number of bytes added to plaintext (IV + Auth Tag = 28 bytes)
   */
  public static getOverheadSize(): number {
    return VaultEncryption.IV_LENGTH + VaultEncryption.AUTH_TAG_LENGTH;
  }
}
