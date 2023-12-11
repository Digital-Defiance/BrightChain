/**
 * Secure Enclave Keyring - Key storage using Apple Secure Enclave via enclave-bridge-client
 *
 * This implementation uses the Enclave Bridge to encrypt keys with ECIES (secp256k1)
 * before storing them on disk. The secp256k1 private key used for ECIES is stored
 * in the macOS Keychain and protected by the Secure Enclave.
 *
 * Architecture:
 * - Keys are encrypted using ECIES with the bridge's secp256k1 public key
 * - Encrypted keys are stored locally on disk
 * - Decryption requires the Enclave Bridge app to be running
 * - An additional password-based encryption layer is applied for defense in depth
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { IKeyring } from './keyring.types';

/**
 * Possible socket paths for the Enclave Bridge
 * Ordered by preference (sandboxed app first, then non-sandboxed, then legacy)
 */
const ENCLAVE_SOCKET_PATHS = [
  // Sandboxed app path (Mac App Store version)
  `${process.env['HOME']}/Library/Containers/com.JessicaMulein.EnclaveBridge/Data/.enclave/enclave-bridge.sock`,
  // Non-sandboxed path (direct install)
  `${process.env['HOME']}/.enclave/enclave-bridge.sock`,
  // Legacy/default path
  '/tmp/enclave-bridge.sock',
];

/**
 * Find the first available socket path
 * @returns The socket path if found, null otherwise
 */
async function findSocketPath(): Promise<string | null> {
  for (const socketPath of ENCLAVE_SOCKET_PATHS) {
    try {
      await fs.access(socketPath);
      return socketPath;
    } catch {
      // Try next path
    }
  }
  return null;
}

// Dynamic import for the enclave bridge client (ESM module)
type EnclaveBridgeClientType =
  typeof import('@digitaldefiance/enclave-bridge-client').EnclaveBridgeClient;
let EnclaveBridgeClientClass: EnclaveBridgeClientType | null = null;

/**
 * Loads the EnclaveBridgeClient dynamically
 * This is needed because the enclave-bridge-client is an ESM module
 */
async function loadEnclaveBridgeClient(): Promise<EnclaveBridgeClientType> {
  if (EnclaveBridgeClientClass) {
    return EnclaveBridgeClientClass;
  }

  try {
    const module = await import('@digitaldefiance/enclave-bridge-client');
    EnclaveBridgeClientClass = module.EnclaveBridgeClient;
    return EnclaveBridgeClientClass;
  } catch (error) {
    throw new Error(
      `Failed to load enclave-bridge-client: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * ECIES encryption utilities for encrypting data before sending to the bridge
 * We use ECIESService from node-ecies-lib for encryption
 */
type ECIESServiceType = InstanceType<
  typeof import('@digitaldefiance/node-ecies-lib').ECIESService
>;
let eciesServiceInstance: ECIESServiceType | null = null;

async function getEciesService(): Promise<ECIESServiceType> {
  if (eciesServiceInstance) {
    return eciesServiceInstance;
  }
  try {
    const eciesLib = await import('@digitaldefiance/node-ecies-lib');
    eciesServiceInstance = new eciesLib.ECIESService();
    return eciesServiceInstance;
  } catch (error) {
    throw new Error(
      `Failed to load node-ecies-lib: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * SecureEnclaveKeyring: Secure key storage using Apple Secure Enclave
 *
 * Keys are encrypted with two layers:
 * 1. Password-based encryption (AES-256-GCM with scrypt-derived key)
 * 2. ECIES encryption with the Secure Enclave's secp256k1 key
 *
 * This provides defense in depth - even if an attacker obtains the encrypted
 * key file, they need both the password AND access to the Secure Enclave.
 */
export class SecureEnclaveKeyring implements IKeyring {
  private static instance: SecureEnclaveKeyring;
  private keyDir: string;
  private clientPublicKey: Buffer | null = null;
  private initialized = false;

  private constructor() {
    // Store keys in user home directory under .brightchain-enclave-keys
    this.keyDir = path.join(
      process.env['HOME'] || process.env['USERPROFILE'] || '.',
      '.brightchain-enclave-keys',
    );
  }

  public static getInstance(): SecureEnclaveKeyring {
    if (!SecureEnclaveKeyring.instance) {
      SecureEnclaveKeyring.instance = new SecureEnclaveKeyring();
    }
    return SecureEnclaveKeyring.instance;
  }

  /**
   * Check if the Secure Enclave bridge is available and fully operational
   *
   * This performs a comprehensive check that:
   * 1. Verifies we're on macOS Apple Silicon
   * 2. Finds an available socket path
   * 3. Connects to the Enclave Bridge socket
   * 4. Pings the bridge to verify it's responsive
   * 5. Retrieves the secp256k1 public key (verifies key handshake works)
   * 6. Signs test data with the Secure Enclave (verifies enclave access)
   *
   * @param debug - Enable debug logging
   * @throws Error if REQUIRE_SECURE_ENCLAVE=true and bridge is not available
   * @returns true only if all checks pass
   */
  public static async isAvailable(debug = false): Promise<boolean> {
    const log = debug ? console.log.bind(console) : () => {};
    const requireBridge = process.env['REQUIRE_SECURE_ENCLAVE'] === 'true';

    // Only available on macOS Apple Silicon
    if (process.platform !== 'darwin' || process.arch !== 'arm64') {
      log('❌ Not macOS Apple Silicon');
      if (requireBridge) {
        throw new Error(
          'REQUIRE_SECURE_ENCLAVE is set but not running on macOS Apple Silicon (darwin/arm64)',
        );
      }
      return false;
    }
    log('✅ Platform check passed');

    // Find an available socket
    const socketPath = await findSocketPath();
    if (!socketPath) {
      log('❌ No socket found');
      if (requireBridge) {
        throw new Error(
          `REQUIRE_SECURE_ENCLAVE is set but Enclave Bridge socket not found. ` +
            `Checked paths: ${ENCLAVE_SOCKET_PATHS.join(', ')}. ` +
            `Please ensure the Enclave Bridge app is running.`,
        );
      }
      return false;
    }
    log('✅ Socket found:', socketPath);

    let client: InstanceType<EnclaveBridgeClientType> | null = null;

    try {
      const EnclaveBridgeClient = await loadEnclaveBridgeClient();
      client = new EnclaveBridgeClient({ socketPath, timeout: 5000 });

      // Step 1: Connect to the socket
      await client.connect();
      if (!client.isConnected) {
        log('❌ Failed to connect');
        return false;
      }
      log('✅ Connected');

      // Step 2: Ping the bridge
      const pingOk = await client.ping();
      if (!pingOk) {
        log('❌ Ping failed');
        return false;
      }
      log('✅ Ping OK');

      // Step 3: Get the secp256k1 public key (required for ECIES)
      const publicKeyInfo = await client.getPublicKey();
      log('📦 Public key info:', {
        length: publicKeyInfo.buffer?.length,
        firstByte: publicKeyInfo.buffer?.[0]?.toString(16),
      });
      if (!publicKeyInfo.buffer || publicKeyInfo.buffer.length === 0) {
        log('❌ No public key returned');
        return false; // Invalid or missing public key
      }
      // For compressed keys, verify prefix (0x02 or 0x03)
      if (publicKeyInfo.buffer.length === 33) {
        if (
          publicKeyInfo.buffer[0] !== 0x02 &&
          publicKeyInfo.buffer[0] !== 0x03
        ) {
          log('❌ Invalid compressed key prefix');
          return false;
        }
      }
      log('✅ Public key OK');

      // Step 4: Get the Secure Enclave public key (P-256)
      const enclaveKey = await client.getEnclavePublicKey();
      log('📦 Enclave key info:', { length: enclaveKey.buffer?.length });
      if (!enclaveKey.buffer || enclaveKey.buffer.length === 0) {
        log('❌ No enclave key returned');
        return false; // Invalid P-256 key
      }
      log('✅ Enclave key OK');

      // Step 5: Test signing with Secure Enclave
      const testData = Buffer.from('enclave-availability-test');
      const signature = await client.enclaveSign(testData);
      log('📦 Signature info:', { length: signature.buffer?.length });
      if (!signature.buffer || signature.buffer.length === 0) {
        log('❌ No signature returned');
        return false; // Invalid signature
      }
      log('✅ Signature OK');

      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log('❌ Error:', errorMsg);
      if (requireBridge) {
        throw new Error(
          `REQUIRE_SECURE_ENCLAVE is set but Enclave Bridge check failed: ${errorMsg}`,
        );
      }
      return false;
    } finally {
      if (client?.isConnected) {
        try {
          await client.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
    }
  }

  /**
   * Initialize the keyring
   * - Creates the key storage directory
   * - Connects to the Enclave Bridge to get the public key
   *
   * @throws Error if bridge is not available and REQUIRE_SECURE_ENCLAVE is set
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Check availability first if required
    const requireBridge = process.env['REQUIRE_SECURE_ENCLAVE'] === 'true';
    if (requireBridge) {
      // This will throw if not available
      await SecureEnclaveKeyring.isAvailable();
    }

    // Create key directory
    await fs.mkdir(this.keyDir, { recursive: true, mode: 0o700 });

    // Find the socket path
    const socketPath = await findSocketPath();
    if (!socketPath) {
      const error = new Error(
        'Enclave Bridge socket not found. Is the Enclave Bridge app running? ' +
          `Checked paths: ${ENCLAVE_SOCKET_PATHS.join(', ')}`,
      );
      if (requireBridge) {
        throw error;
      }
      throw error;
    }

    // Get the Enclave Bridge public key for ECIES encryption
    const EnclaveBridgeClient = await loadEnclaveBridgeClient();
    const client = new EnclaveBridgeClient({ socketPath });
    try {
      await client.connect();
      const publicKeyInfo = await client.getPublicKey();
      this.clientPublicKey = publicKeyInfo.buffer;
    } finally {
      await client.disconnect();
    }

    this.initialized = true;
  }

  /**
   * Store a key securely
   *
   * @param id - Unique identifier for the key
   * @param data - The raw key data to store
   * @param password - Password for additional encryption layer
   */
  public async storeKey(
    id: string,
    data: Uint8Array,
    password: string,
  ): Promise<void> {
    await this.ensureInitialized();

    // Step 1: Password-based encryption (inner layer)
    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const derivedKey = await this.deriveKey(password, salt);

    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
    const passwordEncrypted = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Combine password-encrypted data: salt || iv || authTag || ciphertext
    const innerEncrypted = Buffer.concat([
      salt,
      iv,
      authTag,
      passwordEncrypted,
    ]);

    // Step 2: ECIES encryption with Secure Enclave key (outer layer)
    const eciesService = await getEciesService();
    const enclaveEncrypted = eciesService.encryptBasic(
      this.clientPublicKey!,
      innerEncrypted,
    );

    // Store the double-encrypted data
    await fs.writeFile(this.keyPath(id), enclaveEncrypted, { mode: 0o600 });

    // Zero out sensitive data
    this.zeroBuffer(derivedKey);
    this.zeroBuffer(passwordEncrypted);
    this.zeroBuffer(innerEncrypted);
  }

  /**
   * Retrieve a key
   *
   * @param id - Unique identifier for the key
   * @param password - Password for decryption
   * @returns The decrypted key data
   */
  public async retrieveKey(id: string, password: string): Promise<Uint8Array> {
    await this.ensureInitialized();

    // Read the encrypted file
    const enclaveEncrypted = await fs.readFile(this.keyPath(id));

    // Find the socket path
    const socketPath = await findSocketPath();
    if (!socketPath) {
      throw new Error('Enclave Bridge socket not found');
    }

    // Step 1: Decrypt with Secure Enclave (outer layer)
    const EnclaveBridgeClient = await loadEnclaveBridgeClient();
    const client = new EnclaveBridgeClient({ socketPath });
    let innerEncrypted: Buffer;

    try {
      await client.connect();
      const decryptResult = await client.decrypt(enclaveEncrypted);
      innerEncrypted = decryptResult.buffer;
    } finally {
      await client.disconnect();
    }

    // Step 2: Decrypt with password (inner layer)
    // Format: salt (32) || iv (12) || authTag (16) || ciphertext
    const salt = innerEncrypted.subarray(0, 32);
    const iv = innerEncrypted.subarray(32, 44);
    const authTag = innerEncrypted.subarray(44, 60);
    const passwordEncrypted = innerEncrypted.subarray(60);

    const derivedKey = await this.deriveKey(password, salt);

    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(passwordEncrypted),
        decipher.final(),
      ]);

      // Zero out sensitive data
      this.zeroBuffer(derivedKey);
      this.zeroBuffer(innerEncrypted);

      return decrypted;
    } catch {
      this.zeroBuffer(derivedKey);
      this.zeroBuffer(innerEncrypted);
      throw new Error('Decryption failed: invalid password or corrupted data');
    }
  }

  /**
   * Rotate a key's password
   *
   * @param id - Unique identifier for the key
   * @param oldPassword - Current password
   * @param newPassword - New password to set
   */
  public async rotateKey(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Retrieve with old password, store with new password
    const data = await this.retrieveKey(id, oldPassword);
    try {
      await this.storeKey(id, data, newPassword);
    } finally {
      this.zeroBuffer(data);
    }
  }

  /**
   * Delete a key from storage
   *
   * @param id - Unique identifier for the key to delete
   */
  public async deleteKey(id: string): Promise<void> {
    const keyPath = this.keyPath(id);
    try {
      // Overwrite with random data before deletion for security
      const stats = await fs.stat(keyPath);
      await fs.writeFile(keyPath, crypto.randomBytes(stats.size));
      await fs.unlink(keyPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if a key exists
   *
   * @param id - Unique identifier for the key
   * @returns true if the key exists in storage
   */
  public async hasKey(id: string): Promise<boolean> {
    try {
      await fs.access(this.keyPath(id));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all stored key IDs
   *
   * @returns Array of key IDs
   */
  public async listKeys(): Promise<string[]> {
    await this.ensureInitialized();
    const files = await fs.readdir(this.keyDir);
    return files
      .filter((f) => f.endsWith('.enclave'))
      .map((f) => f.replace('.enclave', ''));
  }

  /**
   * Sign data using the Secure Enclave's P-256 key
   * This is a bonus feature - allows signing with hardware-backed keys
   *
   * @param data - Data to sign
   * @returns Signature in DER format
   */
  public async signWithEnclave(data: Buffer | string): Promise<Buffer> {
    const socketPath = await findSocketPath();
    if (!socketPath) {
      throw new Error('Enclave Bridge socket not found');
    }

    const EnclaveBridgeClient = await loadEnclaveBridgeClient();
    const client = new EnclaveBridgeClient({ socketPath });
    try {
      await client.connect();
      const result = await client.enclaveSign(data);
      return result.buffer;
    } finally {
      await client.disconnect();
    }
  }

  /**
   * Get the Secure Enclave's P-256 public key
   * Can be used for signature verification
   *
   * @returns The P-256 public key
   */
  public async getEnclavePublicKey(): Promise<Buffer> {
    const socketPath = await findSocketPath();
    if (!socketPath) {
      throw new Error('Enclave Bridge socket not found');
    }

    const EnclaveBridgeClient = await loadEnclaveBridgeClient();
    const client = new EnclaveBridgeClient({ socketPath });
    try {
      await client.connect();
      const result = await client.getEnclavePublicKey();
      return result.buffer;
    } finally {
      await client.disconnect();
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private keyPath(id: string): string {
    // Sanitize the ID to prevent path traversal
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.keyDir, `${safeId}.enclave`);
  }

  /**
   * Derive an encryption key from a password using scrypt
   */
  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        32,
        { N: 2 ** 14, r: 8, p: 1 },
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey as Buffer);
        },
      );
    });
  }

  /**
   * Securely zero a buffer to prevent sensitive data from lingering in memory
   */
  private zeroBuffer(buf: Buffer | Uint8Array): void {
    buf.fill(0);
  }
}
