/**
 * Integration Tests for Keyring System
 *
 * These tests verify that the different keyring implementations work
 * together correctly and that SystemKeyring properly delegates to them.
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
import { NodeKeyring } from '../nodeKeyring';
import { KeyringType, SystemKeyring } from '../systemKeyring';

describe('Keyring Integration Tests', () => {
  const originalHome = process.env['HOME'];
  const testDir = path.join(__dirname, '.integration-test-keys');
  const testKeyIds: string[] = [];

  // Helper to generate unique key IDs
  const generateKeyId = () => {
    const id = `integration-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    testKeyIds.push(id);
    return id;
  };

  beforeAll(async () => {
    process.env['HOME'] = testDir;
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
    process.env['HOME'] = originalHome;
  });

  beforeEach(() => {
    // Reset singletons
    (
      SystemKeyring as unknown as { instance: SystemKeyring | undefined }
    ).instance = undefined;
    (NodeKeyring as unknown as { instance: NodeKeyring | undefined }).instance =
      undefined;
  });

  describe('SystemKeyring to NodeKeyring delegation', () => {
    it('should use NodeKeyring in Node.js environment', async () => {
      const systemKeyring = SystemKeyring.getInstance();
      systemKeyring.setUseSecureEnclave(false);
      await systemKeyring.initialize();

      expect(systemKeyring.getKeyringType()).toBe(KeyringType.Node);
    });

    it('should store keys through SystemKeyring and retrieve through NodeKeyring', async () => {
      const keyId = generateKeyId();
      const testData = crypto.randomBytes(32);
      const testPassword = 'integration-test-password';

      // Store through SystemKeyring
      const systemKeyring = SystemKeyring.getInstance();
      systemKeyring.setUseSecureEnclave(false);
      await systemKeyring.initialize();
      await systemKeyring.storeKey(keyId, testData, testPassword);

      // Reset SystemKeyring
      (
        SystemKeyring as unknown as { instance: SystemKeyring | undefined }
      ).instance = undefined;

      // Retrieve through NodeKeyring directly
      const nodeKeyring = NodeKeyring.getInstance();
      await nodeKeyring.initialize();
      const retrieved = await nodeKeyring.retrieveKey(keyId, testPassword);

      expect(Buffer.from(retrieved)).toEqual(testData);
    });

    it('should store keys through NodeKeyring and retrieve through SystemKeyring', async () => {
      const keyId = generateKeyId();
      const testData = crypto.randomBytes(32);
      const testPassword = 'integration-test-password';

      // Store through NodeKeyring
      const nodeKeyring = NodeKeyring.getInstance();
      await nodeKeyring.initialize();
      await nodeKeyring.storeKey(keyId, testData, testPassword);

      // Reset NodeKeyring
      (
        NodeKeyring as unknown as { instance: NodeKeyring | undefined }
      ).instance = undefined;

      // Retrieve through SystemKeyring
      const systemKeyring = SystemKeyring.getInstance();
      systemKeyring.setUseSecureEnclave(false);
      await systemKeyring.initialize();
      const retrieved = await systemKeyring.retrieveKey(keyId, testPassword);

      expect(Buffer.from(retrieved)).toEqual(testData);
    });
  });

  describe('Key lifecycle', () => {
    let keyring: SystemKeyring;
    const testPassword = 'lifecycle-test-password';

    beforeEach(async () => {
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false);
      await keyring.initialize();
    });

    it('should handle complete key lifecycle: create, read, update, delete', async () => {
      const keyId = generateKeyId();
      const initialData = crypto.randomBytes(32);
      const updatedPassword = 'updated-password';

      // Create
      await keyring.storeKey(keyId, initialData, testPassword);

      // Read
      let retrieved = await keyring.retrieveKey(keyId, testPassword);
      expect(Buffer.from(retrieved)).toEqual(initialData);

      // Update (rotate password)
      await keyring.rotateKey(keyId, testPassword, updatedPassword);

      // Read with new password
      retrieved = await keyring.retrieveKey(keyId, updatedPassword);
      expect(Buffer.from(retrieved)).toEqual(initialData);

      // Old password should fail
      await expect(keyring.retrieveKey(keyId, testPassword)).rejects.toThrow();
    });

    it('should isolate keys with different IDs', async () => {
      const key1Id = generateKeyId();
      const key2Id = generateKeyId();
      const data1 = crypto.randomBytes(32);
      const data2 = crypto.randomBytes(32);

      await keyring.storeKey(key1Id, data1, testPassword);
      await keyring.storeKey(key2Id, data2, testPassword);

      const retrieved1 = await keyring.retrieveKey(key1Id, testPassword);
      const retrieved2 = await keyring.retrieveKey(key2Id, testPassword);

      expect(Buffer.from(retrieved1)).toEqual(data1);
      expect(Buffer.from(retrieved2)).toEqual(data2);
      expect(Buffer.from(retrieved1)).not.toEqual(Buffer.from(retrieved2));
    });

    it('should isolate keys with different passwords', async () => {
      const key1Id = generateKeyId();
      const key2Id = generateKeyId();
      const data = crypto.randomBytes(32);
      const password1 = 'password-1';
      const password2 = 'password-2';

      await keyring.storeKey(key1Id, data, password1);
      await keyring.storeKey(key2Id, data, password2);

      // Each key should only work with its password
      const retrieved1 = await keyring.retrieveKey(key1Id, password1);
      const retrieved2 = await keyring.retrieveKey(key2Id, password2);

      expect(Buffer.from(retrieved1)).toEqual(data);
      expect(Buffer.from(retrieved2)).toEqual(data);

      // Cross-password access should fail
      await expect(keyring.retrieveKey(key1Id, password2)).rejects.toThrow();
      await expect(keyring.retrieveKey(key2Id, password1)).rejects.toThrow();
    });
  });

  describe('Data integrity', () => {
    let keyring: SystemKeyring;
    const testPassword = 'integrity-test-password';

    beforeEach(async () => {
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false);
      await keyring.initialize();
    });

    it('should preserve exact binary data', async () => {
      const keyId = generateKeyId();

      // Test with all byte values
      const allBytes = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        allBytes[i] = i;
      }

      await keyring.storeKey(keyId, allBytes, testPassword);
      const retrieved = await keyring.retrieveKey(keyId, testPassword);

      expect(new Uint8Array(retrieved)).toEqual(allBytes);
    });

    it('should preserve empty data', async () => {
      const keyId = generateKeyId();
      const emptyData = new Uint8Array(0);

      await keyring.storeKey(keyId, emptyData, testPassword);
      const retrieved = await keyring.retrieveKey(keyId, testPassword);

      expect(retrieved.length).toBe(0);
    });

    it('should preserve data through password rotation', async () => {
      const keyId = generateKeyId();
      const originalData = crypto.randomBytes(64);
      const passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5'];

      await keyring.storeKey(keyId, originalData, passwords[0]);

      // Rotate through all passwords
      for (let i = 1; i < passwords.length; i++) {
        await keyring.rotateKey(keyId, passwords[i - 1], passwords[i]);
      }

      // Verify data is preserved
      const retrieved = await keyring.retrieveKey(
        keyId,
        passwords[passwords.length - 1],
      );
      expect(Buffer.from(retrieved)).toEqual(originalData);
    });

    it('should handle concurrent store and retrieve operations', async () => {
      const keyId = generateKeyId();
      const testData = crypto.randomBytes(32);

      await keyring.storeKey(keyId, testData, testPassword);

      // Concurrent retrieves
      const results = await Promise.all([
        keyring.retrieveKey(keyId, testPassword),
        keyring.retrieveKey(keyId, testPassword),
        keyring.retrieveKey(keyId, testPassword),
      ]);

      for (const result of results) {
        expect(Buffer.from(result)).toEqual(testData);
      }
    });
  });

  describe('Error handling', () => {
    let keyring: SystemKeyring;
    const testPassword = 'error-test-password';

    beforeEach(async () => {
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false);
      await keyring.initialize();
    });

    it('should throw on retrieve with wrong password', async () => {
      const keyId = generateKeyId();
      await keyring.storeKey(keyId, crypto.randomBytes(32), testPassword);

      await expect(
        keyring.retrieveKey(keyId, 'wrong-password'),
      ).rejects.toThrow();
    });

    it('should throw on retrieve of non-existent key', async () => {
      await expect(
        keyring.retrieveKey('non-existent-key', testPassword),
      ).rejects.toThrow();
    });

    it('should throw on rotate with wrong old password', async () => {
      const keyId = generateKeyId();
      await keyring.storeKey(keyId, crypto.randomBytes(32), testPassword);

      await expect(
        keyring.rotateKey(keyId, 'wrong-password', 'new-password'),
      ).rejects.toThrow();
    });

    it('should throw on rotate of non-existent key', async () => {
      await expect(
        keyring.rotateKey('non-existent', testPassword, 'new-password'),
      ).rejects.toThrow();
    });
  });

  describe('Persistence', () => {
    const testPassword = 'persistence-test-password';

    it('should persist keys across SystemKeyring instances', async () => {
      const keyId = generateKeyId();
      const testData = crypto.randomBytes(32);

      // Store with first instance
      const keyring1 = SystemKeyring.getInstance();
      keyring1.setUseSecureEnclave(false);
      await keyring1.initialize();
      await keyring1.storeKey(keyId, testData, testPassword);

      // Reset singleton
      (
        SystemKeyring as unknown as { instance: SystemKeyring | undefined }
      ).instance = undefined;

      // Retrieve with new instance
      const keyring2 = SystemKeyring.getInstance();
      keyring2.setUseSecureEnclave(false);
      await keyring2.initialize();
      const retrieved = await keyring2.retrieveKey(keyId, testPassword);

      expect(Buffer.from(retrieved)).toEqual(testData);
    });

    it('should persist password rotation across instances', async () => {
      const keyId = generateKeyId();
      const testData = crypto.randomBytes(32);
      const oldPassword = 'old-password';
      const newPassword = 'new-password';

      // Store with first instance
      const keyring1 = SystemKeyring.getInstance();
      keyring1.setUseSecureEnclave(false);
      await keyring1.initialize();
      await keyring1.storeKey(keyId, testData, oldPassword);

      // Reset singleton
      (
        SystemKeyring as unknown as { instance: SystemKeyring | undefined }
      ).instance = undefined;

      // Rotate with new instance
      const keyring2 = SystemKeyring.getInstance();
      keyring2.setUseSecureEnclave(false);
      await keyring2.initialize();
      await keyring2.rotateKey(keyId, oldPassword, newPassword);

      // Reset singleton
      (
        SystemKeyring as unknown as { instance: SystemKeyring | undefined }
      ).instance = undefined;

      // Retrieve with third instance
      const keyring3 = SystemKeyring.getInstance();
      keyring3.setUseSecureEnclave(false);
      await keyring3.initialize();
      const retrieved = await keyring3.retrieveKey(keyId, newPassword);

      expect(Buffer.from(retrieved)).toEqual(testData);
    });
  });

  describe('Real-world scenarios', () => {
    let keyring: SystemKeyring;

    beforeEach(async () => {
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false);
      await keyring.initialize();
    });

    it('should store and retrieve a 32-byte secp256k1 private key', async () => {
      const keyId = generateKeyId();
      // Generate a realistic secp256k1 private key
      const privateKey = crypto.randomBytes(32);
      const password = 'my-wallet-password-2024!';

      await keyring.storeKey(keyId, privateKey, password);
      const retrieved = await keyring.retrieveKey(keyId, password);

      expect(Buffer.from(retrieved)).toEqual(privateKey);
    });

    it('should store and retrieve a BIP39 seed phrase as bytes', async () => {
      const keyId = generateKeyId();
      // 64-byte seed (typical for BIP39)
      const seed = crypto.randomBytes(64);
      const password = 'master-seed-password!';

      await keyring.storeKey(keyId, seed, password);
      const retrieved = await keyring.retrieveKey(keyId, password);

      expect(Buffer.from(retrieved)).toEqual(seed);
    });

    it('should handle multiple wallet keys for one user', async () => {
      const walletKeys = [
        {
          id: generateKeyId(),
          data: crypto.randomBytes(32),
          name: 'Main Wallet',
        },
        {
          id: generateKeyId(),
          data: crypto.randomBytes(32),
          name: 'Trading Wallet',
        },
        {
          id: generateKeyId(),
          data: crypto.randomBytes(32),
          name: 'Cold Storage',
        },
      ];
      const masterPassword = 'user-master-password!';

      // Store all keys
      for (const wallet of walletKeys) {
        await keyring.storeKey(wallet.id, wallet.data, masterPassword);
      }

      // Retrieve and verify all keys
      for (const wallet of walletKeys) {
        const retrieved = await keyring.retrieveKey(wallet.id, masterPassword);
        expect(Buffer.from(retrieved)).toEqual(wallet.data);
      }
    });

    it('should support key derivation password change without losing data', async () => {
      const keyId = generateKeyId();
      const privateKey = crypto.randomBytes(32);
      const oldPassword = 'initial-password';
      const newPassword = 'updated-secure-password-2024!';

      await keyring.storeKey(keyId, privateKey, oldPassword);
      await keyring.rotateKey(keyId, oldPassword, newPassword);

      const retrieved = await keyring.retrieveKey(keyId, newPassword);
      expect(Buffer.from(retrieved)).toEqual(privateKey);
    });
  });
});
