/**
 * Unit Tests for SystemKeyring
 *
 * Tests the SystemKeyring which automatically selects the appropriate
 * keyring implementation based on the environment.
 */

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { KeyringType, SystemKeyring } from '../systemKeyring';

describe('SystemKeyring', () => {
  let keyring: SystemKeyring;
  const originalHome = process.env['HOME'];

  // Test data
  const testKeyId = 'test-key-system';
  const testPassword = 'secure-password-123!@#';
  const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  beforeAll(async () => {
    // Use a test directory
    const testDir = path.join(__dirname, '.test-keys');
    process.env['HOME'] = testDir;
    await fs.mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up
    try {
      const testDir = path.join(__dirname, '.test-keys');
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
    process.env['HOME'] = originalHome;
  });

  beforeEach(() => {
    // Reset singleton for each test
    (
      SystemKeyring as unknown as { instance: SystemKeyring | undefined }
    ).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = SystemKeyring.getInstance();
      const instance2 = SystemKeyring.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return same instance across multiple calls', () => {
      const instances = Array(10)
        .fill(null)
        .map(() => SystemKeyring.getInstance());

      for (let i = 1; i < instances.length; i++) {
        expect(instances[i]).toBe(instances[0]);
      }
    });
  });

  describe('initialize', () => {
    it('should initialize without throwing', async () => {
      keyring = SystemKeyring.getInstance();
      await expect(keyring.initialize()).resolves.not.toThrow();
    });

    it('should be idempotent', async () => {
      keyring = SystemKeyring.getInstance();
      await keyring.initialize();
      await keyring.initialize();
      await keyring.initialize();
      // Should not throw
    });

    it('should set keyring type after initialization', async () => {
      keyring = SystemKeyring.getInstance();
      expect(keyring.getKeyringType()).toBeNull();

      await keyring.initialize();

      const type = keyring.getKeyringType();
      expect(type).not.toBeNull();
      expect([
        KeyringType.Node,
        KeyringType.SecureEnclave,
        KeyringType.Browser,
      ]).toContain(type);
    });
  });

  describe('isSecureEnclaveAvailable', () => {
    it('should return a boolean', async () => {
      const result = await SystemKeyring.isSecureEnclaveAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should return false on non-macOS or non-arm64', async () => {
      // This will naturally be false on CI/CD systems that aren't Apple Silicon Macs
      if (process.platform !== 'darwin' || process.arch !== 'arm64') {
        const result = await SystemKeyring.isSecureEnclaveAvailable();
        expect(result).toBe(false);
      }
    });
  });

  describe('setUseSecureEnclave', () => {
    it('should allow setting preference before initialization', () => {
      keyring = SystemKeyring.getInstance();
      expect(() => keyring.setUseSecureEnclave(false)).not.toThrow();
    });

    it('should throw if called after initialization', async () => {
      keyring = SystemKeyring.getInstance();
      await keyring.initialize();

      expect(() => keyring.setUseSecureEnclave(false)).toThrow(
        'Cannot change Secure Enclave preference after keyring is initialized',
      );
    });

    it('should force NodeKeyring when set to false on Apple Silicon', async () => {
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false);
      await keyring.initialize();

      // Even on Apple Silicon, should use Node keyring
      const type = keyring.getKeyringType();
      expect(type).toBe(KeyringType.Node);
    });
  });

  describe('getKeyringType', () => {
    it('should return null before initialization', () => {
      keyring = SystemKeyring.getInstance();
      expect(keyring.getKeyringType()).toBeNull();
    });

    it('should return a valid type after initialization', async () => {
      keyring = SystemKeyring.getInstance();
      await keyring.initialize();

      const type = keyring.getKeyringType();
      expect(Object.values(KeyringType)).toContain(type);
    });
  });

  describe('IKeyring interface implementation', () => {
    beforeEach(async () => {
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false); // Use NodeKeyring for predictable tests
      await keyring.initialize();
    });

    afterEach(async () => {
      // Clean up test keys
      try {
        const keyDir = path.join(
          process.env['HOME'] || '.',
          '.brightchain-keys',
        );
        const files = await fs.readdir(keyDir);
        for (const file of files) {
          if (file.startsWith('test-')) {
            await fs.unlink(path.join(keyDir, file));
          }
        }
      } catch {
        // Ignore
      }
    });

    describe('storeKey', () => {
      it('should store a key', async () => {
        await expect(
          keyring.storeKey(testKeyId, testData, testPassword),
        ).resolves.not.toThrow();
      });

      it('should auto-initialize if not initialized', async () => {
        // Reset singleton
        (
          SystemKeyring as unknown as { instance: SystemKeyring | undefined }
        ).instance = undefined;
        const freshKeyring = SystemKeyring.getInstance();
        freshKeyring.setUseSecureEnclave(false);

        // Should not throw even though not initialized
        await expect(
          freshKeyring.storeKey('test-auto-init', testData, testPassword),
        ).resolves.not.toThrow();
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
        await expect(keyring.retrieveKey(testKeyId, 'wrong')).rejects.toThrow();
      });

      it('should fail for non-existent key', async () => {
        await expect(
          keyring.retrieveKey('non-existent', testPassword),
        ).rejects.toThrow();
      });
    });

    describe('rotateKey', () => {
      const oldPassword = 'old-pass';
      const newPassword = 'new-pass';

      beforeEach(async () => {
        await keyring.storeKey(testKeyId, testData, oldPassword);
      });

      it('should rotate key password', async () => {
        await keyring.rotateKey(testKeyId, oldPassword, newPassword);

        await expect(
          keyring.retrieveKey(testKeyId, oldPassword),
        ).rejects.toThrow();

        const retrieved = await keyring.retrieveKey(testKeyId, newPassword);
        expect(new Uint8Array(retrieved)).toEqual(testData);
      });
    });
  });

  describe('lazy initialization', () => {
    it('should initialize lazily on storeKey', async () => {
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false);

      expect(keyring.getKeyringType()).toBeNull();

      await keyring.storeKey('test-lazy', testData, testPassword);

      expect(keyring.getKeyringType()).not.toBeNull();
    });

    it('should initialize lazily on retrieveKey', async () => {
      // First, store a key
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false);
      await keyring.storeKey('test-lazy-retrieve', testData, testPassword);

      // Reset singleton
      (
        SystemKeyring as unknown as { instance: SystemKeyring | undefined }
      ).instance = undefined;

      const freshKeyring = SystemKeyring.getInstance();
      freshKeyring.setUseSecureEnclave(false);

      expect(freshKeyring.getKeyringType()).toBeNull();

      await freshKeyring.retrieveKey('test-lazy-retrieve', testPassword);

      expect(freshKeyring.getKeyringType()).not.toBeNull();
    });
  });

  describe('concurrent operations', () => {
    beforeEach(async () => {
      keyring = SystemKeyring.getInstance();
      keyring.setUseSecureEnclave(false);
      await keyring.initialize();
    });

    it('should handle concurrent store operations', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          keyring.storeKey(`test-concurrent-${i}`, testData, testPassword),
        );
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle concurrent retrieve operations', async () => {
      await keyring.storeKey('test-concurrent-read', testData, testPassword);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          keyring.retrieveKey('test-concurrent-read', testPassword),
        );
      }

      const results = await Promise.all(promises);
      for (const result of results) {
        expect(new Uint8Array(result)).toEqual(testData);
      }
    });

    it('should handle mixed concurrent operations', async () => {
      const promises = [];

      // Store some keys
      for (let i = 0; i < 5; i++) {
        promises.push(
          keyring.storeKey(`test-mixed-${i}`, testData, testPassword),
        );
      }

      await Promise.all(promises);

      // Mix of operations
      const mixedPromises = [];
      for (let i = 0; i < 5; i++) {
        mixedPromises.push(
          keyring.retrieveKey(`test-mixed-${i}`, testPassword),
        );
        mixedPromises.push(
          keyring.storeKey(`test-mixed-new-${i}`, testData, testPassword),
        );
      }

      await expect(Promise.all(mixedPromises)).resolves.not.toThrow();
    });
  });
});

describe('IKeyring interface', () => {
  it('should define required methods', () => {
    const keyring = SystemKeyring.getInstance();

    expect(typeof keyring.storeKey).toBe('function');
    expect(typeof keyring.retrieveKey).toBe('function');
    expect(typeof keyring.initialize).toBe('function');
    expect(typeof keyring.rotateKey).toBe('function');
  });
});
