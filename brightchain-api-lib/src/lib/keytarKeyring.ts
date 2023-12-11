/**
 * @fileoverview KeytarKeyring — OS keyring-backed key storage via keytar.
 *
 * Tier 2 key protection: stores keys in the OS credential store
 * (libsecret/gnome-keyring on Linux, Keychain on macOS, Credential Manager on Windows).
 * Keys are password-encrypted (AES-256-GCM with scrypt derivation) before
 * being stored in the OS keyring, providing defense-in-depth.
 *
 * Falls back gracefully if keytar is not available (native module build failure).
 *
 * @see .kiro/specs/member-pool-security/follow-up-hardening.md — Item 2
 */

import * as crypto from 'crypto';
import type { IKeyring } from './keyring.types';

/** The service name used in the OS keyring */
const KEYRING_SERVICE = 'brightchain-node';

/**
 * Lazy-load keytar to handle environments where the native module
 * isn't available (CI, Docker without libsecret, etc.)
 */
let keytarModule: typeof import('keytar') | null = null;
async function getKeytar(): Promise<typeof import('keytar')> {
  if (!keytarModule) {
    try {
      keytarModule = await import('keytar');
    } catch {
      throw new Error(
        'keytar is not available. Install system dependencies: ' +
          'libsecret-1-dev (Debian/Ubuntu) or libsecret-devel (RHEL/CentOS)',
      );
    }
  }
  return keytarModule;
}

/**
 * KeytarKeyring — stores keys in the OS credential store via keytar.
 *
 * Each key is:
 * 1. Encrypted with AES-256-GCM using a key derived from the password via scrypt
 * 2. Base64-encoded
 * 3. Stored in the OS keyring under the service name "brightchain-node"
 *
 * The OS keyring provides:
 * - Linux: libsecret / gnome-keyring (encrypted at rest by the desktop session)
 * - macOS: Keychain (encrypted with the user's login password)
 * - Windows: Credential Manager (encrypted with DPAPI)
 */
export class KeytarKeyring implements IKeyring {
  private initialized = false;

  /**
   * Check if keytar is available on this platform.
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await getKeytar();
      return true;
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Verify keytar works by attempting a no-op read
    const keytar = await getKeytar();
    // findPassword returns null if not found — this just verifies the native module loads
    await keytar.findPassword(KEYRING_SERVICE);
    this.initialized = true;
  }

  async storeKey(
    id: string,
    data: Uint8Array,
    password: string,
  ): Promise<void> {
    await this.ensureInitialized();
    const keytar = await getKeytar();

    // Encrypt with password before storing in OS keyring
    const encrypted = this.passwordEncrypt(data, password);
    const encoded = Buffer.from(encrypted).toString('base64');

    await keytar.setPassword(KEYRING_SERVICE, id, encoded);
  }

  async retrieveKey(id: string, password: string): Promise<Uint8Array> {
    await this.ensureInitialized();
    const keytar = await getKeytar();

    const encoded = await keytar.getPassword(KEYRING_SERVICE, id);
    if (!encoded) {
      throw new Error(`Key "${id}" not found in OS keyring`);
    }

    const encrypted = Buffer.from(encoded, 'base64');
    return this.passwordDecrypt(encrypted, password);
  }

  async rotateKey(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const data = await this.retrieveKey(id, oldPassword);
    try {
      await this.storeKey(id, data, newPassword);
    } finally {
      // Zero the plaintext key
      data.fill(0);
    }
  }

  /**
   * Delete a key from the OS keyring.
   */
  async deleteKey(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const keytar = await getKeytar();
    return keytar.deletePassword(KEYRING_SERVICE, id);
  }

  /**
   * Check if a key exists in the OS keyring.
   */
  async hasKey(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const keytar = await getKeytar();
    const value = await keytar.getPassword(KEYRING_SERVICE, id);
    return value !== null;
  }

  /**
   * List all stored key IDs.
   */
  async listKeys(): Promise<string[]> {
    await this.ensureInitialized();
    const keytar = await getKeytar();
    const credentials = await keytar.findCredentials(KEYRING_SERVICE);
    return credentials.map((c) => c.account);
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Encrypt data with a password using AES-256-GCM + scrypt.
   * Format: salt(32) || iv(12) || authTag(16) || ciphertext
   */
  private passwordEncrypt(data: Uint8Array, password: string): Uint8Array {
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(password, salt, 32, {
      N: 2 ** 14,
      r: 8,
      p: 1,
    });

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Zero the derived key
    key.fill(0);

    const result = new Uint8Array(32 + 12 + 16 + encrypted.length);
    result.set(salt, 0);
    result.set(iv, 32);
    result.set(authTag, 44);
    result.set(encrypted, 60);
    return result;
  }

  /**
   * Decrypt data encrypted with passwordEncrypt.
   */
  private passwordDecrypt(encrypted: Uint8Array, password: string): Uint8Array {
    if (encrypted.length < 60) {
      throw new Error('Encrypted data too short');
    }

    const salt = encrypted.subarray(0, 32);
    const iv = encrypted.subarray(32, 44);
    const authTag = encrypted.subarray(44, 60);
    const ciphertext = encrypted.subarray(60);

    const key = crypto.scryptSync(password, Buffer.from(salt), 32, {
      N: 2 ** 14,
      r: 8,
      p: 1,
    });

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(iv),
    );
    decipher.setAuthTag(Buffer.from(authTag));

    try {
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext)),
        decipher.final(),
      ]);

      // Zero the derived key
      key.fill(0);

      return new Uint8Array(decrypted);
    } catch {
      key.fill(0);
      throw new Error('Decryption failed: invalid password or corrupted data');
    }
  }
}
