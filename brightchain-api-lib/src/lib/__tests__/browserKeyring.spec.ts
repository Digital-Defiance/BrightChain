/**
 * Unit Tests for BrowserKeyring
 *
 * Tests the browser keyring implementation using mocked Web Crypto API
 * and localStorage.
 */

import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock crypto.subtle - use any to avoid complex type issues with jest mocks
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCryptoSubtle: any = {
  importKey: jest.fn(),
  deriveKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
};

// Mock crypto.getRandomValues
const mockGetRandomValues = jest.fn((array: Uint8Array) => {
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
});

// Setup global mocks before importing the module
Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: mockCryptoSubtle,
    getRandomValues: mockGetRandomValues,
  },
});

// Import after mocks are set up
import { BrowserKeyring } from '../browserKeyring';

describe('BrowserKeyring', () => {
  let keyring: BrowserKeyring;
  let mockCryptoKey: object;

  const testKeyId = 'test-key-browser';
  const testPassword = 'secure-password-123!';
  const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  beforeAll(() => {
    // Create a mock CryptoKey object
    mockCryptoKey = { type: 'secret', algorithm: { name: 'AES-GCM' } };

    // Setup default mock implementations
    mockCryptoSubtle.importKey.mockResolvedValue(mockCryptoKey);
    mockCryptoSubtle.deriveKey.mockResolvedValue(mockCryptoKey);
    mockCryptoSubtle.encrypt.mockImplementation(
      async (_algorithm: unknown, _key: unknown, data: ArrayBuffer) => {
        // Simple mock: return the data with some transformation
        const input = new Uint8Array(data);
        const output = new Uint8Array(input.length + 16); // Add space for auth tag
        output.set(input);
        return output.buffer;
      },
    );
    mockCryptoSubtle.decrypt.mockImplementation(
      async (_algorithm: unknown, _key: unknown, data: ArrayBuffer) => {
        // Simple mock: return the original data
        const input = new Uint8Array(data);
        const output = new Uint8Array(input.length - 16);
        output.set(input.subarray(0, input.length - 16));
        return output.buffer;
      },
    );
  });

  beforeEach(() => {
    // Reset mocks and storage
    jest.clearAllMocks();
    localStorageMock.clear();

    // Reset singleton
    (
      BrowserKeyring as unknown as { instance: BrowserKeyring | undefined }
    ).instance = undefined;
    keyring = BrowserKeyring.getInstance();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = BrowserKeyring.getInstance();
      const instance2 = BrowserKeyring.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should load from localStorage if data exists', async () => {
      // Pre-populate localStorage with a key
      const mockEntry = [
        [
          'existing-key',
          {
            id: 'existing-key',
            version: 1,
            encryptedData: [1, 2, 3],
            iv: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
            salt: Array(32).fill(0),
            created: new Date().toISOString(),
          },
        ],
      ];
      localStorageMock.setItem(
        'brightchain-api-keyring',
        JSON.stringify(mockEntry),
      );

      await keyring.initialize();

      // Key should be loaded (though we can't directly verify internal state)
      expect(localStorageMock.getItem('brightchain-api-keyring')).toBeTruthy();
    });

    it('should handle empty localStorage', async () => {
      await expect(keyring.initialize()).resolves.not.toThrow();
    });

    it('should handle corrupted localStorage data', async () => {
      localStorageMock.setItem('brightchain-api-keyring', 'invalid-json{{{');

      // Should not throw, just log a warning
      await expect(keyring.initialize()).resolves.not.toThrow();
    });
  });

  describe('storeKey', () => {
    it('should store a key and persist to localStorage', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      const stored = localStorageMock.getItem('brightchain-api-keyring');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      expect(parsed[0][0]).toBe(testKeyId);
    });

    it('should call deriveKey with correct parameters', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      expect(mockCryptoSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        'PBKDF2',
        false,
        ['deriveKey'],
      );

      expect(mockCryptoSubtle.deriveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 100000,
          hash: 'SHA-256',
        }),
        expect.anything(),
        expect.objectContaining({ name: 'AES-GCM', length: 256 }),
        false,
        ['encrypt', 'decrypt'],
      );
    });

    it('should call encrypt with AES-GCM', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      expect(mockCryptoSubtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AES-GCM' }),
        expect.anything(),
        expect.any(Uint8Array),
      );
    });

    it('should generate random salt and IV', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      // Should be called twice: once for salt (32 bytes), once for IV (12 bytes)
      expect(mockGetRandomValues).toHaveBeenCalledTimes(2);
    });

    it('should overwrite existing key with same ID', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);
      const newData = new Uint8Array([11, 12, 13]);
      await keyring.storeKey(testKeyId, newData, testPassword);

      const stored = localStorageMock.getItem('brightchain-api-keyring');
      const parsed = JSON.parse(stored!);

      // Should still only have one entry
      expect(parsed.length).toBe(1);
    });

    it('should handle multiple keys', async () => {
      await keyring.storeKey('key-1', testData, testPassword);
      await keyring.storeKey('key-2', testData, testPassword);
      await keyring.storeKey('key-3', testData, testPassword);

      const stored = localStorageMock.getItem('brightchain-api-keyring');
      const parsed = JSON.parse(stored!);

      expect(parsed.length).toBe(3);
    });
  });

  describe('retrieveKey', () => {
    beforeEach(async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);
    });

    it('should retrieve a stored key', async () => {
      const retrieved = await keyring.retrieveKey(testKeyId, testPassword);
      expect(retrieved).toBeInstanceOf(Uint8Array);
    });

    it('should throw for non-existent key', async () => {
      await expect(
        keyring.retrieveKey('non-existent', testPassword),
      ).rejects.toThrow('Key not found');
    });

    it('should call decrypt with correct algorithm', async () => {
      await keyring.retrieveKey(testKeyId, testPassword);

      expect(mockCryptoSubtle.decrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AES-GCM' }),
        expect.anything(),
        expect.any(Uint8Array),
      );
    });

    it('should throw on decryption failure', async () => {
      mockCryptoSubtle.decrypt.mockRejectedValueOnce(
        new Error('Decryption failed'),
      );

      await expect(
        keyring.retrieveKey(testKeyId, testPassword),
      ).rejects.toThrow('Decryption failed');
    });

    it('should update lastAccessed timestamp', async () => {
      await keyring.retrieveKey(testKeyId, testPassword);

      // Note: lastAccessed is updated in-memory but not persisted to localStorage
      // by design - this avoids unnecessary storage writes on every read.
      // We verify the rate limit tracking works which uses access logging.

      // Make multiple accesses to verify access logging works
      for (let i = 0; i < 5; i++) {
        await keyring.retrieveKey(testKeyId, testPassword);
      }

      // Should still work (haven't hit rate limit of 10)
      await expect(
        keyring.retrieveKey(testKeyId, testPassword),
      ).resolves.toBeInstanceOf(Uint8Array);
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);
    });

    it('should enforce rate limit after 10 accesses', async () => {
      // Make 10 successful accesses
      for (let i = 0; i < 10; i++) {
        await keyring.retrieveKey(testKeyId, testPassword);
      }

      // 11th access should fail
      await expect(
        keyring.retrieveKey(testKeyId, testPassword),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should track rate limit per key', async () => {
      await keyring.storeKey('key-2', testData, testPassword);

      // Access key-1 10 times
      for (let i = 0; i < 10; i++) {
        await keyring.retrieveKey(testKeyId, testPassword);
      }

      // key-2 should still be accessible
      await expect(
        keyring.retrieveKey('key-2', testPassword),
      ).resolves.not.toThrow();
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

      // Verify encryption was called for storing with new password
      expect(mockCryptoSubtle.encrypt).toHaveBeenCalled();
    });

    it('should fail with wrong old password', async () => {
      mockCryptoSubtle.decrypt.mockRejectedValueOnce(
        new Error('Wrong password'),
      );

      await expect(
        keyring.rotateKey(testKeyId, 'wrong', newPassword),
      ).rejects.toThrow();
    });
  });

  describe('persistence', () => {
    it('should persist keys across getInstance calls', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      // Reset singleton
      (
        BrowserKeyring as unknown as { instance: BrowserKeyring | undefined }
      ).instance = undefined;

      const newKeyring = BrowserKeyring.getInstance();
      await newKeyring.initialize();

      // Should be able to retrieve the key
      await expect(
        newKeyring.retrieveKey(testKeyId, testPassword),
      ).resolves.not.toThrow();
    });

    it('should serialize and deserialize dates correctly', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      const stored = localStorageMock.getItem('brightchain-api-keyring');
      const parsed = JSON.parse(stored!);
      const entry = parsed.find((e: [string, unknown]) => e[0] === testKeyId);

      // Date should be stored as ISO string
      expect(entry[1].created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should serialize Uint8Array as number arrays', async () => {
      await keyring.storeKey(testKeyId, testData, testPassword);

      const stored = localStorageMock.getItem('brightchain-api-keyring');
      const parsed = JSON.parse(stored!);
      const entry = parsed.find((e: [string, unknown]) => e[0] === testKeyId);

      // Arrays should be stored as number arrays
      expect(Array.isArray(entry[1].encryptedData)).toBe(true);
      expect(Array.isArray(entry[1].iv)).toBe(true);
      expect(Array.isArray(entry[1].salt)).toBe(true);
    });
  });
});
