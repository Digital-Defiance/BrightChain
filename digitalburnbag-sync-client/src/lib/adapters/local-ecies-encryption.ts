import type { ILocalEncryption } from '@brightchain/digitalburnbag-lib';
import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * Local file encryption using AES-256-GCM derived from the user's ECIES key material.
 * Encrypts cached files at rest on the local disk.
 *
 * Key derivation: HKDF(SHA-256) from the user's ECIES-derived key material
 * to produce a 256-bit AES key for local encryption.
 */
export class LocalEciesEncryption implements ILocalEncryption<string> {
  private aesKey: Buffer | null = null;

  async initialize(_userId: string, keyMaterial: Uint8Array): Promise<void> {
    // Derive a 256-bit AES key from the ECIES key material using HKDF
    const derived = crypto.hkdfSync(
      'sha256',
      Buffer.from(keyMaterial),
      Buffer.alloc(0), // no salt — the key material is already high-entropy
      Buffer.from('digitalburnbag-local-encryption'),
      32,
    );
    this.aesKey = Buffer.from(derived);
  }

  async encryptFile(localPath: string): Promise<void> {
    this.ensureInitialized();
    const plaintext = fs.readFileSync(localPath);
    const ciphertext = await this.encrypt(plaintext);
    fs.writeFileSync(localPath, Buffer.from(ciphertext));
  }

  async decryptFile(localPath: string): Promise<void> {
    this.ensureInitialized();
    const ciphertext = fs.readFileSync(localPath);
    const plaintext = await this.decrypt(new Uint8Array(ciphertext));
    fs.writeFileSync(localPath, Buffer.from(plaintext));
  }

  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    this.ensureInitialized();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.aesKey!, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext)),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Format: [12-byte IV] [16-byte authTag] [ciphertext]
    const result = new Uint8Array(12 + 16 + encrypted.length);
    result.set(iv, 0);
    result.set(authTag, 12);
    result.set(encrypted, 28);
    return result;
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    this.ensureInitialized();
    if (ciphertext.length < 28) {
      throw new Error(
        'Ciphertext too short — expected at least 28 bytes (IV + authTag)',
      );
    }
    const iv = ciphertext.slice(0, 12);
    const authTag = ciphertext.slice(12, 28);
    const encrypted = ciphertext.slice(28);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.aesKey!,
      Buffer.from(iv),
    );
    decipher.setAuthTag(Buffer.from(authTag));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted)),
      decipher.final(),
    ]);
    return new Uint8Array(decrypted);
  }

  destroy(): void {
    if (this.aesKey) {
      this.aesKey.fill(0);
      this.aesKey = null;
    }
  }

  private ensureInitialized(): void {
    if (!this.aesKey) {
      throw new Error(
        'LocalEciesEncryption not initialized — call initialize() first',
      );
    }
  }
}
