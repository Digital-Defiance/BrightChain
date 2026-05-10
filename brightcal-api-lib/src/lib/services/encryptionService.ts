/**
 * EncryptionService
 *
 * Abstraction layer for calendar event encryption. Provides encrypt/decrypt,
 * re-encryption for sharing, key generation, and key rotation.
 *
 * The default implementation uses a simple XOR-based cipher suitable for
 * testing and demonstrating the encryption concepts. In production, this
 * would be replaced by the real ECIES integration from
 * `@digitaldefiance/ecies-lib`.
 *
 * @see Requirements 17.1, 17.2, 17.4, 17.5
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ─── Interface ───────────────────────────────────────────────────────────────

/**
 * Encryption service interface for calendar event data.
 *
 * Implementations must guarantee:
 * - encrypt(data, key) produces non-plaintext output
 * - decrypt(encrypt(data, key), key) === data (round-trip)
 * - decrypt(encrypt(data, keyA), keyB) !== data when keyA !== keyB
 * - reEncrypt transfers data from one key to another
 * - rotateKey produces a new key distinct from the old one
 */
export interface IEncryptionService {
  /** Encrypt plaintext data with the given key. */
  encrypt(data: string, key: string): Promise<string>;

  /** Decrypt encrypted data with the given key. */
  decrypt(encryptedData: string, key: string): Promise<string>;

  /**
   * Re-encrypt data from owner's key to recipient's key.
   * Decrypts with ownerKey, then encrypts with recipientKey.
   */
  reEncrypt(
    encryptedData: string,
    ownerKey: string,
    recipientKey: string,
  ): Promise<string>;

  /** Generate a new random encryption key (hex string). */
  generateKey(): string;

  /**
   * Rotate a key — returns a new key. The old key will no longer work
   * for data encrypted with the new key.
   */
  rotateKey(oldKey: string): string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wire format stored as base64. */
interface AesGcmPayload {
  iv: string;
  authTag: string;
  data: string;
}

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * AES-256-GCM encryption service for calendar event data.
 *
 * Wire format: base64( JSON({ iv, authTag, data }) ) where iv is a 12-byte
 * hex string, authTag is a 16-byte hex string, and data is the ciphertext
 * encoded as a hex string.
 *
 * @requirements 17.1, 17.2, 17.4, 17.5
 */
export class EncryptionService implements IEncryptionService {
  /**
   * Encrypt plaintext data using AES-256-GCM with the given 64-char hex key.
   * Returns a base64-encoded JSON payload containing iv, authTag, and data.
   */
  async encrypt(data: string, key: string): Promise<string> {
    const iv = randomBytes(12);
    const keyBuffer = Buffer.from(key, 'hex');
    const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf-8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const payload: AesGcmPayload = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted.toString('hex'),
    };
    return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
  }

  /**
   * Decrypt base64-encoded AES-256-GCM payload with the given 64-char hex key.
   * Returns the original plaintext if the correct key and auth tag are used.
   */
  async decrypt(encryptedData: string, key: string): Promise<string> {
    const payload: AesGcmPayload = JSON.parse(
      Buffer.from(encryptedData, 'base64').toString('utf-8'),
    ) as AesGcmPayload;
    const keyBuffer = Buffer.from(key, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const ciphertext = Buffer.from(payload.data, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf-8');
  }

  /**
   * Re-encrypt data from owner's key to recipient's key.
   * Decrypts with ownerKey, then encrypts with recipientKey.
   */
  async reEncrypt(
    encryptedData: string,
    ownerKey: string,
    recipientKey: string,
  ): Promise<string> {
    const plaintext = await this.decrypt(encryptedData, ownerKey);
    return this.encrypt(plaintext, recipientKey);
  }

  /**
   * Generate a new random 32-byte (256-bit) key as a 64-character hex string.
   */
  generateKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Rotate a key by generating a completely new one.
   * The old key is not derivable from the new key and vice versa.
   */
  rotateKey(_oldKey: string): string {
    return this.generateKey();
  }
}
