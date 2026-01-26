/**
 * Unit Tests for NodeKeyring
 *
 * Tests the Node.js keyring implementation with file-based encrypted storage.
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

describe('NodeKeyring', () => {
  let keyring: NodeKeyring;
  const testKeyDir = path.join(
    process.env['HOME'] || process.env['USERPROFILE'] || '.',
    '.brightchain-keys-test',
  );
  const originalHome = process.env['HOME'];

  // Test data
  const testKeyId = 'test-key-node';
  const testPassword = 'secure-password-123!@#';
  const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  beforeAll(async () => {
    // Use a test directory to avoid polluting real key storage
    process.env['HOME'] = path.dirname(testKeyDir);

    // Reset singleton for tests
    (NodeKeyring as unknown as { instance: NodeKeyring | undefined }).instance =
      undefined;
    keyring = NodeKeyring.getInstance();
    await keyring.initialize();
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');
      await fs.rm(keyDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    process.env['HOME'] = originalHome;
  });

  beforeEach(async () => {
    // Clean up any existing test keys
    try {
      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');
      const files = await fs.readdir(keyDir);
      for (const file of files) {
        if (file.startsWith('test-')) {
          await fs.unlink(path.join(keyDir, file));
        }
      }
    } catch {
      // Directory might not exist
    }
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = NodeKeyring.getInstance();
      const instance2 = NodeKeyring.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should create the key directory', async () => {
      await keyring.initialize();
      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');
      const stats = await fs.stat(keyDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      await keyring.initialize();
      await keyring.initialize();
      await keyring.initialize();
      // Should not throw
    });
  });

  describe('storeKey', () => {
    it('should store a key successfully', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');
      const keyPath = path.join(keyDir, `${testKeyId}.key`);
      const stats = await fs.stat(keyPath);
      expect(stats.isFile()).toBe(true);
    });

    it('should encrypt the key data', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');
      const keyPath = path.join(keyDir, `${testKeyId}.key`);
      const storedData = await fs.readFile(keyPath);

      // Stored data should not contain the plaintext
      const testDataStr = Buffer.from(testData).toString('hex');
      const storedDataStr = storedData.toString('hex');
      expect(storedDataStr).not.toContain(testDataStr);
    });

    it('should create files with restricted permissions (0o600)', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');
      const keyPath = path.join(keyDir, `${testKeyId}.key`);
      const stats = await fs.stat(keyPath);

      // Check file permissions (owner read/write only)
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it('should overwrite existing key with same ID', async () => {
      const newData = new Uint8Array([11, 12, 13, 14, 15]);

      await keyring.storeKey(testKeyId, testData, testPassword);
      await keyring.storeKey(testKeyId, newData, testPassword);

      const retrieved = await keyring.retrieveKey(testKeyId, testPassword);
      expect(new Uint8Array(retrieved)).toEqual(newData);
    });

    it('should handle empty data', async () => {
      const emptyData = new Uint8Array(0);
      await keyring.storeKey('test-empty', emptyData, testPassword);

      const retrieved = await keyring.retrieveKey('test-empty', testPassword);
      expect(retrieved.length).toBe(0);
    });

    it('should handle large data (1KB)', async () => {
      const largeData = crypto.randomBytes(1024);
      await keyring.storeKey('test-large', largeData, testPassword);

      const retrieved = await keyring.retrieveKey('test-large', testPassword);
      expect(Buffer.from(retrieved)).toEqual(largeData);
    });

    it('should handle very large data (100KB)', async () => {
      const veryLargeData = crypto.randomBytes(100 * 1024);
      await keyring.storeKey('test-very-large', veryLargeData, testPassword);

      const retrieved = await keyring.retrieveKey(
        'test-very-large',
        testPassword,
      );
      expect(Buffer.from(retrieved)).toEqual(veryLargeData);
    });

    it('should sanitize key IDs to prevent path traversal', async () => {
      const maliciousId = '../../../etc/passwd';
      await keyring.storeKey(maliciousId, testData, testPassword);

      // The key should be stored with a sanitized name (path traversal chars replaced with _)
      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');
      const files = await fs.readdir(keyDir);
      // Path traversal characters (../) should be replaced with underscores
      // So '../../../etc/passwd' becomes '____________etc_passwd.key'
      // Verify no actual path traversal (no files outside keyDir)
      expect(files.some((f) => f.includes('..'))).toBe(false);
      expect(files.some((f) => f.includes('/'))).toBe(false);
      // The sanitized filename should start with underscores (from the ../)
      expect(files.some((f) => f.startsWith('_'))).toBe(true);
    });

    it('should handle special characters in key IDs', async () => {
      const specialId = 'key-with-special_chars-123';
      await keyring.storeKey(specialId, testData, testPassword);

      const retrieved = await keyring.retrieveKey(specialId, testPassword);
      expect(new Uint8Array(retrieved)).toEqual(testData);
    });

    it('should handle unicode in passwords', async () => {
      const unicodePassword = '密码🔐مرور';
      await keyring.storeKey('test-unicode-pass', testData, unicodePassword);

      const retrieved = await keyring.retrieveKey(
        'test-unicode-pass',
        unicodePassword,
      );
      expect(new Uint8Array(retrieved)).toEqual(testData);
    });
  });

  describe('retrieveKey', () => {
    beforeEach(async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);
    });

    it('should retrieve a stored key', async () => {
      const retrieved = await keyring.retrieveKey(testKeyId, testPassword);
      expect(new Uint8Array(retrieved)).toEqual(testData);
    });

    it('should fail with wrong password', async () => {
      await expect(
        keyring.retrieveKey(testKeyId, 'wrong-password'),
      ).rejects.toThrow();
    });

    it('should fail for non-existent key', async () => {
      await expect(
        keyring.retrieveKey('non-existent-key', testPassword),
      ).rejects.toThrow();
    });

    it('should fail with empty password if stored with non-empty', async () => {
      await expect(keyring.retrieveKey(testKeyId, '')).rejects.toThrow();
    });

    it('should handle concurrent retrieval of same key', async () => {
      const promises = Array(5)
        .fill(null)
        .map(() => keyring.retrieveKey(testKeyId, testPassword));

      const results = await Promise.all(promises);

      for (const result of results) {
        expect(new Uint8Array(result)).toEqual(testData);
      }
    });

    it('should detect corrupted data', async () => {
      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');
      const keyPath = path.join(keyDir, `${testKeyId}.key`);

      // Corrupt the stored file
      const data = await fs.readFile(keyPath);
      data[data.length - 1] ^= 0xff; // Flip bits in last byte
      await fs.writeFile(keyPath, data);

      await expect(
        keyring.retrieveKey(testKeyId, testPassword),
      ).rejects.toThrow();
    });
  });

  describe('rotateKey', () => {
    const oldPassword = 'old-password-123';
    const newPassword = 'new-password-456';

    beforeEach(async () => {
      await keyring.storeKey(testKeyId, testData, oldPassword);
    });

    it('should change the password for a key', async () => {
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
      await expect(
        keyring.rotateKey(testKeyId, 'wrong-password', newPassword),
      ).rejects.toThrow();
    });

    it('should fail for non-existent key', async () => {
      await expect(
        keyring.rotateKey('non-existent', oldPassword, newPassword),
      ).rejects.toThrow();
    });

    it('should preserve data integrity after rotation', async () => {
      await keyring.rotateKey(testKeyId, oldPassword, newPassword);
      await keyring.rotateKey(testKeyId, newPassword, 'another-password');

      const retrieved = await keyring.retrieveKey(
        testKeyId,
        'another-password',
      );
      expect(new Uint8Array(retrieved)).toEqual(testData);
    });

    it('should allow rotation to same password', async () => {
      await keyring.rotateKey(testKeyId, oldPassword, oldPassword);

      const retrieved = await keyring.retrieveKey(testKeyId, oldPassword);
      expect(new Uint8Array(retrieved)).toEqual(testData);
    });
  });

  describe('encryption properties', () => {
    it('should use different salt for each store operation', async () => {
      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');

      await keyring.storeKey('test-salt-1', testData, testPassword);
      const file1 = await fs.readFile(path.join(keyDir, 'test-salt-1.key'));
      const salt1 = file1.subarray(0, 16);

      await keyring.storeKey('test-salt-2', testData, testPassword);
      const file2 = await fs.readFile(path.join(keyDir, 'test-salt-2.key'));
      const salt2 = file2.subarray(0, 16);

      expect(Buffer.compare(salt1, salt2)).not.toBe(0);
    });

    it('should use different IV for each store operation', async () => {
      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');

      await keyring.storeKey('test-iv-1', testData, testPassword);
      const file1 = await fs.readFile(path.join(keyDir, 'test-iv-1.key'));
      const iv1 = file1.subarray(16, 28);

      await keyring.storeKey('test-iv-2', testData, testPassword);
      const file2 = await fs.readFile(path.join(keyDir, 'test-iv-2.key'));
      const iv2 = file2.subarray(16, 28);

      expect(Buffer.compare(iv1, iv2)).not.toBe(0);
    });

    it('should produce different ciphertext for same data with different passwords', async () => {
      const keyDir = path.join(process.env['HOME'] || '.', '.brightchain-keys');

      await keyring.storeKey('test-cipher-1', testData, 'password1');
      const file1 = await fs.readFile(path.join(keyDir, 'test-cipher-1.key'));

      await keyring.storeKey('test-cipher-2', testData, 'password2');
      const file2 = await fs.readFile(path.join(keyDir, 'test-cipher-2.key'));

      // Entire files should be different (due to different salts, IVs, and keys)
      expect(Buffer.compare(file1, file2)).not.toBe(0);
    });
  });

  describe('stress tests', () => {
    it('should handle many keys (100)', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          keyring.storeKey(`test-stress-${i}`, testData, testPassword),
        );
      }
      await Promise.all(promises);

      // Verify all keys
      for (let i = 0; i < 100; i++) {
        const retrieved = await keyring.retrieveKey(
          `test-stress-${i}`,
          testPassword,
        );
        expect(new Uint8Array(retrieved)).toEqual(testData);
      }
    }, 60000); // Increase timeout for stress test
  });
});
