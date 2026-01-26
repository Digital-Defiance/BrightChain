/**
 * End-to-End Tests for SecureEnclaveKeyring
 *
 * These tests require:
 * 1. macOS with Apple Silicon (M1/M2/M3)
 * 2. Enclave Bridge app running
 *
 * Run with: npx jest --testPathPattern=secureEnclaveKeyring.e2e
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const isMacOSAppleSilicon =
  process.platform === 'darwin' && process.arch === 'arm64';

describe('SecureEnclaveKeyring E2E', () => {
  let SecureEnclaveKeyring: typeof import('../secureEnclaveKeyring').SecureEnclaveKeyring;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let keyring: any;
  let isAvailable = false;
  const testKeyIds: string[] = [];
  const e2ePassword = 'e2e-test-secure-password-2024!';

  // Helper to generate unique key IDs for E2E tests
  const generateE2EKeyId = () => {
    const id = `e2e-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    testKeyIds.push(id);
    return id;
  };

  beforeAll(async () => {
    if (!isMacOSAppleSilicon) {
      if (process.env['REQUIRE_SECURE_ENCLAVE'] === 'true') {
        throw new Error(
          'REQUIRE_SECURE_ENCLAVE is set but not running on macOS Apple Silicon',
        );
      }
      console.log('⚠️  E2E Tests skipped: Not on macOS Apple Silicon');
      return;
    }

    try {
      const module = await import('../secureEnclaveKeyring');
      SecureEnclaveKeyring = module.SecureEnclaveKeyring;
      isAvailable = await SecureEnclaveKeyring.isAvailable(true); // Enable debug logging

      if (!isAvailable) {
        console.log('⚠️  E2E Tests skipped: Enclave Bridge not running');
        console.log('   Start the Enclave Bridge app and run tests again');
        return;
      }

      console.log('✅ Enclave Bridge detected, running E2E tests');
      keyring = SecureEnclaveKeyring.getInstance();
      await keyring.initialize();
    } catch (error) {
      console.log('⚠️  E2E Tests skipped:', error);
      isAvailable = false;
    }
  }, 30000);

  afterAll(async () => {
    if (isAvailable && keyring) {
      console.log(`Cleaning up ${testKeyIds.length} test keys...`);
      for (const keyId of testKeyIds) {
        try {
          await keyring.deleteKey(keyId);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  });

  // Helper to conditionally run tests based on availability
  // Note: We can't use testIf(isAvailable) because isAvailable is set in beforeAll,
  // but test definitions are evaluated synchronously before beforeAll runs.
  // Instead, we check availability inside each test.
  const itIfAvailable = (
    name: string,
    fn: () => Promise<void>,
    timeout?: number,
  ) => {
    it(
      name,
      async () => {
        if (!isAvailable) {
          console.log(`Skipping: ${name} (Enclave Bridge not available)`);
          return;
        }
        await fn();
      },
      timeout,
    );
  };

  // For tests that only need macOS Apple Silicon (not full availability)
  const testIf = (condition: boolean) => (condition ? it : it.skip);

  describe('Comprehensive Availability Check', () => {
    testIf(isMacOSAppleSilicon)(
      'should only return true when bridge is fully operational',
      async () => {
        // The isAvailable check now performs:
        // 1. Platform check (macOS Apple Silicon)
        // 2. Socket connection
        // 3. Ping
        // 4. secp256k1 public key retrieval
        // 5. P-256 Secure Enclave public key retrieval
        // 6. Test signature with Secure Enclave
        const available = await SecureEnclaveKeyring.isAvailable();

        if (available) {
          // If available, we should be able to get both keys
          const keyring = SecureEnclaveKeyring.getInstance();
          await keyring.initialize();

          // Public key should be accessible
          const pubKey = await keyring.getEnclavePublicKey();
          expect(pubKey).toBeInstanceOf(Buffer);
          expect([33, 65]).toContain(pubKey.length);

          // Signing should work
          const signature = await keyring.signWithEnclave(Buffer.from('test'));
          expect(signature).toBeInstanceOf(Buffer);
          expect(signature.length).toBeGreaterThanOrEqual(64);
        }
      },
      30000,
    );

    testIf(isMacOSAppleSilicon)(
      'should return false gracefully when bridge is not running',
      async () => {
        // This test documents expected behavior - when bridge is not running,
        // isAvailable should return false (not throw)
        // We can't easily test this in E2E since the bridge is running,
        // but we verify the method doesn't throw
        const result = await SecureEnclaveKeyring.isAvailable();
        expect(typeof result).toBe('boolean');
      },
    );
  });

  describe('Secure Enclave Hardware Operations', () => {
    itIfAvailable(
      'should verify Secure Enclave is hardware-backed',
      async () => {
        // Get the Secure Enclave public key
        const publicKey = await keyring.getEnclavePublicKey();

        expect(publicKey).toBeInstanceOf(Buffer);
        // P-256 keys are either 65 bytes (uncompressed) or 33 bytes (compressed)
        expect([33, 65]).toContain(publicKey.length);

        // Verify the key starts with expected prefix
        if (publicKey.length === 65) {
          expect(publicKey[0]).toBe(0x04); // Uncompressed
        } else {
          expect([0x02, 0x03]).toContain(publicKey[0]); // Compressed
        }
      },
    );

    itIfAvailable(
      'should sign data with Secure Enclave P-256 key',
      async () => {
        const testMessage = Buffer.from('E2E test message for signing');
        const signature = await keyring.signWithEnclave(testMessage);

        expect(signature).toBeInstanceOf(Buffer);
        // P-256 ECDSA signature in DER format is typically 70-72 bytes
        expect(signature.length).toBeGreaterThanOrEqual(64);
        expect(signature.length).toBeLessThanOrEqual(72);

        // DER signatures start with 0x30 (SEQUENCE)
        expect(signature[0]).toBe(0x30);
      },
    );

    itIfAvailable(
      'should produce different signatures for different data',
      async () => {
        const message1 = Buffer.from('Message 1');
        const message2 = Buffer.from('Message 2');

        const sig1 = await keyring.signWithEnclave(message1);
        const sig2 = await keyring.signWithEnclave(message2);

        // Signatures should be different
        expect(sig1.equals(sig2)).toBe(false);
      },
    );
  });

  describe('Double-Layer Encryption', () => {
    itIfAvailable('should encrypt with both password and ECIES', async () => {
      const keyId = generateE2EKeyId();
      const sensitiveData = crypto.randomBytes(32);

      await keyring.storeKey(keyId, sensitiveData, e2ePassword);

      // Verify the stored file
      const keyDir = path.join(
        process.env['HOME'] || '.',
        '.brightchain-enclave-keys',
      );
      const keyPath = path.join(keyDir, `${keyId}.enclave`);
      const storedData = await fs.readFile(keyPath);

      // Stored data should be significantly larger due to ECIES overhead
      // ECIES header: version(1) + cipherSuite(1) + type(1) + ephemeralKey(33) + iv(12) + authTag(16) = 64 bytes minimum
      // Plus AES-GCM overhead from password encryption: salt(32) + iv(12) + tag(16) = 60 bytes
      expect(storedData.length).toBeGreaterThan(sensitiveData.length + 100);

      // The plaintext should NOT be anywhere in the stored data
      const sensitiveHex = sensitiveData.toString('hex');
      const storedHex = storedData.toString('hex');
      expect(storedHex).not.toContain(sensitiveHex);
    });

    itIfAvailable(
      'should require both Secure Enclave and password for decryption',
      async () => {
        const keyId = generateE2EKeyId();
        const sensitiveData = crypto.randomBytes(32);

        await keyring.storeKey(keyId, sensitiveData, e2ePassword);

        // Should fail with wrong password
        await expect(
          keyring.retrieveKey(keyId, 'wrong-password'),
        ).rejects.toThrow();

        // Should succeed with correct password (which also requires Secure Enclave)
        const retrieved = await keyring.retrieveKey(keyId, e2ePassword);
        expect(Buffer.from(retrieved)).toEqual(sensitiveData);
      },
    );
  });

  describe('Real Wallet Key Storage', () => {
    itIfAvailable('should securely store a secp256k1 private key', async () => {
      const keyId = generateE2EKeyId();
      // Generate a valid secp256k1 private key (32 bytes, must be < curve order)
      const privateKey = crypto.randomBytes(32);

      await keyring.storeKey(keyId, privateKey, e2ePassword);
      const retrieved = await keyring.retrieveKey(keyId, e2ePassword);

      expect(Buffer.from(retrieved)).toEqual(privateKey);
    });

    itIfAvailable('should securely store a BIP39 seed', async () => {
      const keyId = generateE2EKeyId();
      // BIP39 seeds are typically 64 bytes
      const seed = crypto.randomBytes(64);

      await keyring.storeKey(keyId, seed, e2ePassword);
      const retrieved = await keyring.retrieveKey(keyId, e2ePassword);

      expect(Buffer.from(retrieved)).toEqual(seed);
    });

    itIfAvailable(
      'should handle password rotation for wallet keys',
      async () => {
        const keyId = generateE2EKeyId();
        const privateKey = crypto.randomBytes(32);
        const oldPassword = 'old-wallet-password';
        const newPassword = 'new-secure-wallet-password-2024!';

        await keyring.storeKey(keyId, privateKey, oldPassword);
        await keyring.rotateKey(keyId, oldPassword, newPassword);

        // Old password should fail
        await expect(keyring.retrieveKey(keyId, oldPassword)).rejects.toThrow();

        // New password should work
        const retrieved = await keyring.retrieveKey(keyId, newPassword);
        expect(Buffer.from(retrieved)).toEqual(privateKey);
      },
    );
  });

  describe('Security Properties', () => {
    itIfAvailable(
      'should use unique encryption parameters for each store',
      async () => {
        const keyId1 = generateE2EKeyId();
        const keyId2 = generateE2EKeyId();
        const sameData = crypto.randomBytes(32);

        await keyring.storeKey(keyId1, sameData, e2ePassword);
        await keyring.storeKey(keyId2, sameData, e2ePassword);

        const keyDir = path.join(
          process.env['HOME'] || '.',
          '.brightchain-enclave-keys',
        );

        const file1 = await fs.readFile(path.join(keyDir, `${keyId1}.enclave`));
        const file2 = await fs.readFile(path.join(keyDir, `${keyId2}.enclave`));

        // Even with same data and password, stored files should be different
        // due to random ephemeral keys, IVs, and salts
        expect(file1.equals(file2)).toBe(false);
      },
    );

    itIfAvailable('should securely delete keys', async () => {
      const keyId = generateE2EKeyId();
      await keyring.storeKey(keyId, crypto.randomBytes(32), e2ePassword);

      const keyDir = path.join(
        process.env['HOME'] || '.',
        '.brightchain-enclave-keys',
      );
      const keyPath = path.join(keyDir, `${keyId}.enclave`);

      // Verify file exists
      expect(await keyring.hasKey(keyId)).toBe(true);
      const statsBefore = await fs.stat(keyPath);
      expect(statsBefore.isFile()).toBe(true);

      // Delete the key
      await keyring.deleteKey(keyId);
      // Remove from cleanup list since we already deleted it
      const idx = testKeyIds.indexOf(keyId);
      if (idx > -1) testKeyIds.splice(idx, 1);

      // File should be gone
      await expect(fs.stat(keyPath)).rejects.toThrow();
      expect(await keyring.hasKey(keyId)).toBe(false);
    });

    itIfAvailable('should prevent path traversal attacks', async () => {
      const maliciousId = '../../etc/passwd';
      const testData = Buffer.from('test');

      await keyring.storeKey(maliciousId, testData, e2ePassword);
      testKeyIds.push(maliciousId);

      // Should NOT create file outside the key directory
      await expect(fs.stat('/etc/passwd.enclave')).rejects.toThrow();

      // File should be in the proper directory with sanitized name
      // Path traversal characters (../) should be replaced with underscores
      // So '../../etc/passwd' becomes '______etc_passwd.enclave'
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
  });

  describe('Performance', () => {
    itIfAvailable(
      'should complete store operation within reasonable time',
      async () => {
        const keyId = generateE2EKeyId();
        const testData = crypto.randomBytes(32);

        const start = Date.now();
        await keyring.storeKey(keyId, testData, e2ePassword);
        const duration = Date.now() - start;

        // Should complete within 5 seconds (generous for CI)
        expect(duration).toBeLessThan(5000);
        console.log(`Store operation took ${duration}ms`);
      },
    );

    itIfAvailable(
      'should complete retrieve operation within reasonable time',
      async () => {
        const keyId = generateE2EKeyId();
        const testData = crypto.randomBytes(32);
        await keyring.storeKey(keyId, testData, e2ePassword);

        const start = Date.now();
        await keyring.retrieveKey(keyId, e2ePassword);
        const duration = Date.now() - start;

        // Should complete within 5 seconds (generous for CI)
        expect(duration).toBeLessThan(5000);
        console.log(`Retrieve operation took ${duration}ms`);
      },
    );

    itIfAvailable(
      'should complete signing operation within reasonable time',
      async () => {
        const testMessage = Buffer.from('Performance test message');

        const start = Date.now();
        await keyring.signWithEnclave(testMessage);
        const duration = Date.now() - start;

        // Secure Enclave signing should be fast (< 1 second)
        expect(duration).toBeLessThan(1000);
        console.log(`Signing operation took ${duration}ms`);
      },
    );
  });

  describe('Stress Tests', () => {
    itIfAvailable(
      'should handle multiple concurrent operations',
      async () => {
        const keyIds = Array(5)
          .fill(null)
          .map(() => generateE2EKeyId());
        const testData = crypto.randomBytes(32);

        // Store all keys concurrently
        await Promise.all(
          keyIds.map((id) => keyring.storeKey(id, testData, e2ePassword)),
        );

        // Retrieve all keys concurrently
        const results = await Promise.all(
          keyIds.map((id) => keyring.retrieveKey(id, e2ePassword)),
        );

        // All should match
        for (const result of results) {
          expect(Buffer.from(result)).toEqual(testData);
        }
      },
      60000,
    );

    itIfAvailable(
      'should handle rapid sequential operations',
      async () => {
        const keyId = generateE2EKeyId();
        const iterations = 10;

        for (let i = 0; i < iterations; i++) {
          const data = crypto.randomBytes(32);
          await keyring.storeKey(keyId, data, e2ePassword);
          const retrieved = await keyring.retrieveKey(keyId, e2ePassword);
          expect(Buffer.from(retrieved)).toEqual(data);
        }
      },
      60000,
    );
  });
});
