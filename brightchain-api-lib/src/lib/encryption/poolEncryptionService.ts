/**
 * Pool Encryption Service — Node.js implementation of pool-level encryption.
 *
 * Supports two encryption modes:
 * - Node-specific: ECIES encrypt/decrypt using the node's secp256k1 key pair
 * - Pool-shared: AES-256-GCM with a shared symmetric key, distributed per-member via ECIES
 *
 * Block IDs are computed from ciphertext (not plaintext) so Bloom filters
 * and block lookups work correctly on encrypted pools.
 *
 * ECIES scheme:
 *   1. Generate ephemeral secp256k1 key pair
 *   2. Derive shared secret via ECDH with recipient's public key
 *   3. Derive AES-256 key from shared secret using HKDF-SHA256
 *   4. Encrypt with AES-256-GCM (random 12-byte IV)
 *   5. Output: ephemeral public key (33 bytes) + IV (12 bytes) + auth tag (16 bytes) + ciphertext
 *
 * @see Requirements 14.2, 14.3, 14.5
 */

import * as crypto from 'crypto';
import { DecryptionError, EncryptionError } from './errors';

/** Byte lengths for ECIES wire format components */
const COMPRESSED_PUBLIC_KEY_LENGTH = 33;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const AES_KEY_LENGTH = 32; // 256 bits
const HKDF_INFO = Buffer.from('brightchain-ecies-v1');

export class PoolEncryptionService {
  // ─── Node-Specific (ECIES) ───────────────────────────────────────────

  /**
   * Encrypt data using ECIES with the recipient's secp256k1 public key.
   *
   * @param data - Plaintext data to encrypt
   * @param publicKey - Recipient's secp256k1 public key (33 or 65 bytes)
   * @returns Ciphertext: ephemeralPubKey (33) + IV (12) + authTag (16) + encrypted data
   */
  async encryptNodeSpecific(
    data: Uint8Array,
    publicKey: Uint8Array,
  ): Promise<Uint8Array> {
    try {
      const recipientKey = this.ensureUncompressed(publicKey);

      // Generate ephemeral key pair
      const ephemeral = crypto.createECDH('secp256k1');
      ephemeral.generateKeys();
      const ephemeralPublicKey = ephemeral.getPublicKey(
        undefined,
        'compressed',
      );

      // Derive shared secret via ECDH
      const sharedSecret = ephemeral.computeSecret(recipientKey);

      // Derive AES key via HKDF
      const aesKey = this.hkdfDeriveKey(sharedSecret);

      // Encrypt with AES-256-GCM
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(data)),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      // Pack: ephemeralPubKey + IV + authTag + ciphertext
      const result = new Uint8Array(
        COMPRESSED_PUBLIC_KEY_LENGTH +
          IV_LENGTH +
          AUTH_TAG_LENGTH +
          encrypted.length,
      );
      result.set(ephemeralPublicKey, 0);
      result.set(iv, COMPRESSED_PUBLIC_KEY_LENGTH);
      result.set(authTag, COMPRESSED_PUBLIC_KEY_LENGTH + IV_LENGTH);
      result.set(
        encrypted,
        COMPRESSED_PUBLIC_KEY_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
      );

      return result;
    } catch (err) {
      if (err instanceof EncryptionError) throw err;
      throw new EncryptionError('ECIES encryption failed', err);
    }
  }

  /**
   * Decrypt ECIES-encrypted data using the recipient's secp256k1 private key.
   *
   * @param ciphertext - Output from encryptNodeSpecific
   * @param privateKey - Recipient's raw 32-byte secp256k1 private key
   * @returns Decrypted plaintext
   */
  async decryptNodeSpecific(
    ciphertext: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<Uint8Array> {
    const minLength =
      COMPRESSED_PUBLIC_KEY_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;
    if (ciphertext.length < minLength) {
      throw new DecryptionError(
        `ECIES ciphertext too short: expected at least ${minLength} bytes, got ${ciphertext.length}`,
      );
    }

    try {
      // Unpack components
      const ephemeralPubKey = ciphertext.slice(0, COMPRESSED_PUBLIC_KEY_LENGTH);
      const iv = ciphertext.slice(
        COMPRESSED_PUBLIC_KEY_LENGTH,
        COMPRESSED_PUBLIC_KEY_LENGTH + IV_LENGTH,
      );
      const authTag = ciphertext.slice(
        COMPRESSED_PUBLIC_KEY_LENGTH + IV_LENGTH,
        COMPRESSED_PUBLIC_KEY_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
      );
      const encryptedData = ciphertext.slice(
        COMPRESSED_PUBLIC_KEY_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH,
      );

      // Reconstruct shared secret
      const ecdh = crypto.createECDH('secp256k1');
      ecdh.setPrivateKey(Buffer.from(privateKey));
      const ephemeralUncompressed = this.ensureUncompressed(ephemeralPubKey);
      const sharedSecret = ecdh.computeSecret(ephemeralUncompressed);

      // Derive AES key via HKDF
      const aesKey = this.hkdfDeriveKey(sharedSecret);

      // Decrypt with AES-256-GCM
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        aesKey,
        Buffer.from(iv),
      );
      decipher.setAuthTag(Buffer.from(authTag));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData)),
        decipher.final(),
      ]);

      return new Uint8Array(decrypted);
    } catch (err) {
      if (err instanceof DecryptionError) throw err;
      throw new DecryptionError('ECIES decryption failed', err);
    }
  }

  // ─── Pool-Shared (AES-256-GCM) ──────────────────────────────────────

  /**
   * Encrypt data using AES-256-GCM with the shared pool key.
   *
   * @param data - Plaintext data to encrypt
   * @param sharedKey - 32-byte (256-bit) symmetric pool key
   * @returns Ciphertext: IV (12 bytes) + authTag (16 bytes) + encrypted data
   */
  async encryptPoolShared(
    data: Uint8Array,
    sharedKey: Uint8Array,
  ): Promise<Uint8Array> {
    if (sharedKey.length !== AES_KEY_LENGTH) {
      throw new EncryptionError(
        `Invalid shared key length: expected ${AES_KEY_LENGTH} bytes, got ${sharedKey.length}`,
      );
    }

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(sharedKey),
        iv,
      );
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(data)),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      // Pack: IV + authTag + ciphertext
      const result = new Uint8Array(
        IV_LENGTH + AUTH_TAG_LENGTH + encrypted.length,
      );
      result.set(iv, 0);
      result.set(authTag, IV_LENGTH);
      result.set(encrypted, IV_LENGTH + AUTH_TAG_LENGTH);

      return result;
    } catch (err) {
      if (err instanceof EncryptionError) throw err;
      throw new EncryptionError('AES-256-GCM encryption failed', err);
    }
  }

  /**
   * Decrypt AES-256-GCM-encrypted data using the shared pool key.
   *
   * @param ciphertext - Output from encryptPoolShared
   * @param sharedKey - 32-byte (256-bit) symmetric pool key
   * @returns Decrypted plaintext
   */
  async decryptPoolShared(
    ciphertext: Uint8Array,
    sharedKey: Uint8Array,
  ): Promise<Uint8Array> {
    if (sharedKey.length !== AES_KEY_LENGTH) {
      throw new DecryptionError(
        `Invalid shared key length: expected ${AES_KEY_LENGTH} bytes, got ${sharedKey.length}`,
      );
    }

    const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
    if (ciphertext.length < minLength) {
      throw new DecryptionError(
        `AES-256-GCM ciphertext too short: expected at least ${minLength} bytes, got ${ciphertext.length}`,
      );
    }

    try {
      // Unpack components
      const iv = ciphertext.slice(0, IV_LENGTH);
      const authTag = ciphertext.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encryptedData = ciphertext.slice(IV_LENGTH + AUTH_TAG_LENGTH);

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(sharedKey),
        Buffer.from(iv),
      );
      decipher.setAuthTag(Buffer.from(authTag));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedData)),
        decipher.final(),
      ]);

      return new Uint8Array(decrypted);
    } catch (err) {
      if (err instanceof DecryptionError) throw err;
      throw new DecryptionError('AES-256-GCM decryption failed', err);
    }
  }

  // ─── Block ID & Key Management ──────────────────────────────────────

  /**
   * Compute a block ID from ciphertext using SHA-256.
   * Per Requirement 14.5, block IDs are hashes of encrypted data, not plaintext.
   *
   * @param ciphertext - Encrypted block data
   * @returns Hex-encoded SHA-256 hash
   */
  computeBlockId(ciphertext: Uint8Array): string {
    return crypto
      .createHash('sha256')
      .update(Buffer.from(ciphertext))
      .digest('hex');
  }

  /**
   * Generate a random 256-bit symmetric key for pool-shared encryption.
   *
   * @returns 32-byte random key
   */
  generatePoolKey(): Uint8Array {
    return new Uint8Array(crypto.randomBytes(AES_KEY_LENGTH));
  }

  /**
   * Encrypt a pool key for a specific member using ECIES.
   * Used during key distribution for pool-shared encryption.
   *
   * @param poolKey - The 32-byte symmetric pool key
   * @param memberPublicKey - Member's secp256k1 public key (33 or 65 bytes)
   * @returns ECIES-encrypted pool key
   */
  async encryptKeyForMember(
    poolKey: Uint8Array,
    memberPublicKey: Uint8Array,
  ): Promise<Uint8Array> {
    return this.encryptNodeSpecific(poolKey, memberPublicKey);
  }

  /**
   * Decrypt a pool key that was encrypted for this member.
   *
   * @param encryptedKey - ECIES-encrypted pool key (from encryptKeyForMember)
   * @param memberPrivateKey - Member's raw 32-byte secp256k1 private key
   * @returns The 32-byte symmetric pool key
   */
  async decryptKeyForMember(
    encryptedKey: Uint8Array,
    memberPrivateKey: Uint8Array,
  ): Promise<Uint8Array> {
    return this.decryptNodeSpecific(encryptedKey, memberPrivateKey);
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Derive a 256-bit AES key from a shared secret using HKDF-SHA256.
   */
  private hkdfDeriveKey(sharedSecret: Buffer): Buffer {
    const derived = crypto.hkdfSync(
      'sha256',
      sharedSecret,
      Buffer.alloc(0), // no salt
      HKDF_INFO,
      AES_KEY_LENGTH,
    );
    return Buffer.from(derived);
  }

  /**
   * Ensure a secp256k1 public key is in uncompressed (65-byte) format.
   * Accepts compressed (33 bytes) or uncompressed (65 bytes) input.
   */
  private ensureUncompressed(publicKey: Uint8Array): Buffer {
    if (publicKey.length === 65 && publicKey[0] === 0x04) {
      return Buffer.from(publicKey);
    }
    if (
      publicKey.length === 33 &&
      (publicKey[0] === 0x02 || publicKey[0] === 0x03)
    ) {
      return crypto.ECDH.convertKey(
        Buffer.from(publicKey),
        'secp256k1',
        undefined,
        undefined,
        'uncompressed',
      ) as Buffer;
    }
    throw new EncryptionError(
      `Invalid secp256k1 public key: expected 33 or 65 bytes, got ${publicKey.length}`,
    );
  }
}
