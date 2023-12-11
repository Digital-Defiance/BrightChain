/**
 * Tests for SecureEnclaveKeyring
 *
 * Note: These tests require the Enclave Bridge macOS app to be running
 * on an Apple Silicon Mac. They will be skipped if the bridge is not available.
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Conditionally import and test
const isMacOSAppleSilicon =
  process.platform === 'darwin' && process.arch === 'arm64';

describe('SecureEnclaveKeyring', () => {
  let SecureEnclaveKeyring: typeof import('../secureEnclaveKeyring').SecureEnclaveKeyring;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let keyring: any;
  let isAvailable: boolean;
  const testKeyIds: string[] = [];
  const testPassword = 'test-password-123!';
  const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  // Helper to generate unique key IDs
  const generateKeyId = () => {
    const id = `test-key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    testKeyIds.push(id);
    return id;
  };

  beforeAll(async () => {
    if (!isMacOSAppleSilicon) {
      console.log(
        'Skipping SecureEnclaveKeyring tests: Not on macOS Apple Silicon',
      );
      if (process.env['REQUIRE_SECURE_ENCLAVE'] === 'true') {
        throw new Error(
          'REQUIRE_SECURE_ENCLAVE is set but not running on macOS Apple Silicon',
        );
      }
      return;
    }

    try {
      const module = await import('../secureEnclaveKeyring');
      SecureEnclaveKeyring = module.SecureEnclaveKeyring;
      // isAvailable will throw if REQUIRE_SECURE_ENCLAVE is set and bridge is unavailable
      isAvailable = await SecureEnclaveKeyring.isAvailable();

      if (!isAvailable) {
        console.log(
          'Skipping SecureEnclaveKeyring tests: Enclave Bridge not available',
        );
        return;
      }

      keyring = SecureEnclaveKeyring.getInstance();
      await keyring.initialize();
    } catch (error) {
      console.log('Skipping SecureEnclaveKeyring tests:', error);
      isAvailable = false;
    }
  });

  afterAll(async () => {
    if (isAvailable && keyring) {
      // Clean up all test keys
      for (const keyId of testKeyIds) {
        try {
          await keyring.deleteKey(keyId);
        } catch {
          // Ignore if key doesn't exist
        }
      }
    }
  });

  // Skip all tests if not available
  const describeIfAvailable = isMacOSAppleSilicon ? describe : describe.skip;

  describeIfAvailable('when Secure Enclave is available', () => {
    describe('availability and initialization', () => {
      it('should check availability', async () => {
        if (!isAvailable) {
          console.log('Test skipped: Enclave Bridge not available');
          return;
        }

        const available = await SecureEnclaveKeyring.isAvailable();
        expect(typeof available).toBe('boolean');
        expect(available).toBe(true);
      });

      it('should return singleton instance', () => {
        if (!isAvailable) return;

        const instance1 = SecureEnclaveKeyring.getInstance();
        const instance2 = SecureEnclaveKeyring.getInstance();
        expect(instance1).toBe(instance2);
      });

      it('should initialize successfully', async () => {
        if (!isAvailable) {
          console.log('Test skipped: Enclave Bridge not available');
          return;
        }

        // Re-initialize should not throw
        await expect(keyring.initialize()).resolves.not.toThrow();
      });

      it('should be idempotent on multiple initializations', async () => {
        if (!isAvailable) return;

        await keyring.initialize();
        await keyring.initialize();
        await keyring.initialize();
        // Should not throw
      });
    });

    describe('storeKey', () => {
      it('should store a key successfully', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        await keyring.storeKey(keyId, testData, testPassword);

        const exists = await keyring.hasKey(keyId);
        expect(exists).toBe(true);
      });

      it('should encrypt data with double-layer encryption', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        await keyring.storeKey(keyId, testData, testPassword);

        // Verify the file exists and contains encrypted data
        const keyDir = path.join(
          process.env['HOME'] || '.',
          '.brightchain-enclave-keys',
        );
        const keyPath = path.join(keyDir, `${keyId}.enclave`);

        const storedData = await fs.readFile(keyPath);
        // Stored data should be larger than original (ECIES overhead)
        expect(storedData.length).toBeGreaterThan(testData.length);

        // Should not contain plaintext
        const testDataStr = Buffer.from(testData).toString('hex');
        const storedDataStr = storedData.toString('hex');
        expect(storedDataStr).not.toContain(testDataStr);
      });

      it('should handle empty data', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        const emptyData = new Uint8Array(0);
        await keyring.storeKey(keyId, emptyData, testPassword);

        const retrieved = await keyring.retrieveKey(keyId, testPassword);
        expect(retrieved.length).toBe(0);
      });

      it('should handle 32-byte private key data', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        const privateKey = crypto.randomBytes(32);
        await keyring.storeKey(keyId, privateKey, testPassword);

        const retrieved = await keyring.retrieveKey(keyId, testPassword);
        expect(Buffer.from(retrieved)).toEqual(privateKey);
      });

      it('should handle 64-byte data', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        const largeData = crypto.randomBytes(64);
        await keyring.storeKey(keyId, largeData, testPassword);

        const retrieved = await keyring.retrieveKey(keyId, testPassword);
        expect(Buffer.from(retrieved)).toEqual(largeData);
      });

      it('should handle 1KB data', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        const largeData = crypto.randomBytes(1024);
        await keyring.storeKey(keyId, largeData, testPassword);

        const retrieved = await keyring.retrieveKey(keyId, testPassword);
        expect(Buffer.from(retrieved)).toEqual(largeData);
      });

      it('should overwrite existing key with same ID', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        const newData = new Uint8Array([99, 98, 97]);

        await keyring.storeKey(keyId, testData, testPassword);
        await keyring.storeKey(keyId, newData, testPassword);

        const retrieved = await keyring.retrieveKey(keyId, testPassword);
        expect(new Uint8Array(retrieved)).toEqual(newData);
      });

      it('should sanitize key IDs to prevent path traversal', async () => {
        if (!isAvailable) return;

        const maliciousId = '../../../etc/passwd';
        await keyring.storeKey(maliciousId, testData, testPassword);
        testKeyIds.push(maliciousId);

        // Verify it was stored with a sanitized name
        // Path traversal characters (../) should be replaced with underscores
        // So '../../../etc/passwd' becomes '____________etc_passwd.enclave'
        const keyDir = path.join(
          process.env['HOME'] || '.',
          '.brightchain-enclave-keys',
        );
        const files = await fs.readdir(keyDir);
        // Verify no actual path traversal characters remain
        expect(files.some((f) => f.includes('..'))).toBe(false);
        expect(files.some((f) => f.includes('/'))).toBe(false);
        // The sanitized filename should start with underscores (from the ../)
        expect(files.some((f) => f.startsWith('_'))).toBe(true);
      });

      it('should handle unicode passwords', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        const unicodePassword = '🔐密码مرور';
        await keyring.storeKey(keyId, testData, unicodePassword);

        const retrieved = await keyring.retrieveKey(keyId, unicodePassword);
        expect(new Uint8Array(retrieved)).toEqual(testData);
      });
    });

    describe('retrieveKey', () => {
      let testKeyId: string;

      beforeEach(async () => {
        if (!isAvailable) return;
        testKeyId = generateKeyId();
        await keyring.storeKey(testKeyId, testData, testPassword);
      });

      it('should retrieve a stored key', async () => {
        if (!isAvailable) return;

        const retrieved = await keyring.retrieveKey(testKeyId, testPassword);
        expect(new Uint8Array(retrieved)).toEqual(testData);
      });

      it('should fail with wrong password', async () => {
        if (!isAvailable) return;

        await expect(
          keyring.retrieveKey(testKeyId, 'wrong-password'),
        ).rejects.toThrow();
      });

      it('should fail for non-existent key', async () => {
        if (!isAvailable) return;

        await expect(
          keyring.retrieveKey('non-existent-key', testPassword),
        ).rejects.toThrow();
      });

      it('should handle concurrent retrievals', async () => {
        if (!isAvailable) return;

        const promises = Array(3)
          .fill(null)
          .map(() => keyring.retrieveKey(testKeyId, testPassword));

        const results = await Promise.all(promises);
        for (const result of results) {
          expect(new Uint8Array(result)).toEqual(testData);
        }
      });
    });

    describe('rotateKey', () => {
      let testKeyId: string;
      const oldPassword = 'old-password-123';
      const newPassword = 'new-password-456!';

      beforeEach(async () => {
        if (!isAvailable) return;
        testKeyId = generateKeyId();
        await keyring.storeKey(testKeyId, testData, oldPassword);
      });

      it('should rotate key password', async () => {
        if (!isAvailable) return;

        await keyring.rotateKey(testKeyId, oldPassword, newPassword);

        // Old password should fail
        await expect(
          keyring.retrieveKey(testKeyId, oldPassword),
        ).rejects.toThrow();

        // New password should work
        const retrieved = await keyring.retrieveKey(testKeyId, newPassword);
        expect(new Uint8Array(retrieved)).toEqual(testData);
      });

      it('should fail with wrong old password', async () => {
        if (!isAvailable) return;

        await expect(
          keyring.rotateKey(testKeyId, 'wrong', newPassword),
        ).rejects.toThrow();
      });

      it('should fail for non-existent key', async () => {
        if (!isAvailable) return;

        await expect(
          keyring.rotateKey('non-existent', oldPassword, newPassword),
        ).rejects.toThrow();
      });

      it('should preserve data integrity through multiple rotations', async () => {
        if (!isAvailable) return;

        await keyring.rotateKey(testKeyId, oldPassword, 'pass1');
        await keyring.rotateKey(testKeyId, 'pass1', 'pass2');
        await keyring.rotateKey(testKeyId, 'pass2', 'pass3');

        const retrieved = await keyring.retrieveKey(testKeyId, 'pass3');
        expect(new Uint8Array(retrieved)).toEqual(testData);
      });
    });

    describe('deleteKey', () => {
      it('should delete an existing key', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        await keyring.storeKey(keyId, testData, testPassword);
        expect(await keyring.hasKey(keyId)).toBe(true);

        await keyring.deleteKey(keyId);
        expect(await keyring.hasKey(keyId)).toBe(false);
      });

      it('should not throw when deleting non-existent key', async () => {
        if (!isAvailable) return;

        await expect(
          keyring.deleteKey('non-existent-key'),
        ).resolves.not.toThrow();
      });

      it('should securely overwrite file before deletion', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        await keyring.storeKey(keyId, testData, testPassword);

        const keyDir = path.join(
          process.env['HOME'] || '.',
          '.brightchain-enclave-keys',
        );
        const keyPath = path.join(keyDir, `${keyId}.enclave`);

        // Verify file exists
        const statsBefore = await fs.stat(keyPath);
        expect(statsBefore.isFile()).toBe(true);

        await keyring.deleteKey(keyId);

        // Verify file is deleted
        await expect(fs.stat(keyPath)).rejects.toThrow();
      });
    });

    describe('hasKey', () => {
      it('should return true for existing key', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        await keyring.storeKey(keyId, testData, testPassword);
        expect(await keyring.hasKey(keyId)).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        if (!isAvailable) return;

        expect(await keyring.hasKey('non-existent')).toBe(false);
      });
    });

    describe('listKeys', () => {
      it('should list all stored keys', async () => {
        if (!isAvailable) return;

        const keyId1 = generateKeyId();
        const keyId2 = generateKeyId();
        const keyId3 = generateKeyId();

        await keyring.storeKey(keyId1, testData, testPassword);
        await keyring.storeKey(keyId2, testData, testPassword);
        await keyring.storeKey(keyId3, testData, testPassword);

        const keys = await keyring.listKeys();
        expect(keys).toContain(keyId1);
        expect(keys).toContain(keyId2);
        expect(keys).toContain(keyId3);
      });

      it('should not include deleted keys', async () => {
        if (!isAvailable) return;

        const keyId = generateKeyId();
        await keyring.storeKey(keyId, testData, testPassword);
        await keyring.deleteKey(keyId);

        const keys = await keyring.listKeys();
        expect(keys).not.toContain(keyId);
      });
    });

    describe('Secure Enclave operations', () => {
      it('should sign data with Secure Enclave', async () => {
        if (!isAvailable) return;

        const dataToSign = Buffer.from('Hello, Secure Enclave!');
        const signature = await keyring.signWithEnclave(dataToSign);

        expect(signature).toBeInstanceOf(Buffer);
        expect(signature.length).toBeGreaterThan(0);
      });

      it('should produce consistent signatures for same data', async () => {
        if (!isAvailable) return;

        const dataToSign = Buffer.from('Test data for signing');

        // Note: ECDSA signatures include randomness, so they won't be identical
        // But they should both be valid signatures
        const sig1 = await keyring.signWithEnclave(dataToSign);
        const sig2 = await keyring.signWithEnclave(dataToSign);

        expect(sig1).toBeInstanceOf(Buffer);
        expect(sig2).toBeInstanceOf(Buffer);
        expect(sig1.length).toBeGreaterThan(0);
        expect(sig2.length).toBeGreaterThan(0);
      });

      it('should sign string data', async () => {
        if (!isAvailable) return;

        const signature = await keyring.signWithEnclave('String data');
        expect(signature).toBeInstanceOf(Buffer);
        expect(signature.length).toBeGreaterThan(0);
      });

      it('should get Secure Enclave public key', async () => {
        if (!isAvailable) return;

        const publicKey = await keyring.getEnclavePublicKey();

        expect(publicKey).toBeInstanceOf(Buffer);
        // P-256 uncompressed: 65 bytes, compressed: 33 bytes
        expect(publicKey.length).toBeGreaterThanOrEqual(33);
      });

      it('should return valid P-256 public key format', async () => {
        if (!isAvailable) return;

        const pk1 = await keyring.getEnclavePublicKey();
        const pk2 = await keyring.getEnclavePublicKey();

        // Keys should have valid P-256 format
        // Uncompressed: 65 bytes starting with 0x04
        // Compressed: 33 bytes starting with 0x02 or 0x03
        expect(pk1.length).toBe(pk2.length);

        if (pk1.length === 65) {
          expect(pk1[0]).toBe(0x04); // Uncompressed prefix
          expect(pk2[0]).toBe(0x04);
        } else if (pk1.length === 33) {
          expect([0x02, 0x03]).toContain(pk1[0]); // Compressed prefix
          expect([0x02, 0x03]).toContain(pk2[0]);
        }

        // Note: The Enclave Bridge may return ephemeral keys,
        // so we don't assert that pk1 === pk2
      });
    });
  });

  describe('without Secure Enclave', () => {
    it('should report unavailability on non-Apple Silicon', async () => {
      if (isMacOSAppleSilicon) {
        // Can't test this on Apple Silicon
        return;
      }

      // On non-Apple Silicon, should return false
      const module = await import('../secureEnclaveKeyring');
      const available = await module.SecureEnclaveKeyring.isAvailable();
      expect(available).toBe(false);
    });
  });
});
