import { ECIES, PBKDF2, PBKDF2_PROFILES } from '../constants';
import { Pbkdf2ErrorType } from '../enumerations/pbkdf2-error-type';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2-profile';
import { Pbkdf2Error } from '../errors/pbkdf2-error';
import { IPbkdf2Config } from '../interfaces/pbkdf2-config';
import { IPbkdf2Result } from '../interfaces/pbkdf2-result';
import { Pbkdf2Service } from './pbkdf2';

// Mock crypto.subtle for testing
const mockCrypto = {
  subtle: {
    importKey: jest.fn(),
    deriveKey: jest.fn(),
    deriveBits: jest.fn(),
    exportKey: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

describe('Pbkdf2Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    });

    mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.deriveKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.deriveBits.mockResolvedValue(new ArrayBuffer(32));
    mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
  });

  describe('getProfileConfig', () => {
    it('should return correct config for BACKUP_CODES profile', () => {
      const config = Pbkdf2Service.getProfileConfig(
        Pbkdf2ProfileEnum.BACKUP_CODES,
      );

      expect(config).toEqual({
        hashBytes: 32,
        saltBytes: 16,
        iterations: 100000,
        algorithm: 'SHA-256',
      });
    });

    it('should return correct config for BROWSER_PASSWORD profile', () => {
      const config = Pbkdf2Service.getProfileConfig(
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
      );

      expect(config).toEqual({
        hashBytes: 32,
        saltBytes: 64,
        iterations: 2000000,
        algorithm: 'SHA-512',
      });
    });
  });

  describe('getConfig', () => {
    it('should return default config when no parameters provided', () => {
      const config = Pbkdf2Service.getConfig();

      expect(config).toEqual({
        hashBytes: ECIES.SYMMETRIC.KEY_SIZE,
        saltBytes: PBKDF2.SALT_BYTES,
        iterations: PBKDF2.ITERATIONS_PER_SECOND,
        algorithm: PBKDF2.ALGORITHM,
      });
    });

    it('should use provided parameters', () => {
      const config = Pbkdf2Service.getConfig(500000, 16, 64, 'SHA-512');

      expect(config).toEqual({
        hashBytes: 64,
        saltBytes: 16,
        iterations: 500000,
        algorithm: 'SHA-512',
      });
    });

    it('should use defaults for undefined parameters', () => {
      const config = Pbkdf2Service.getConfig(undefined, 16);

      expect(config).toEqual({
        hashBytes: ECIES.SYMMETRIC.KEY_SIZE,
        saltBytes: 16,
        iterations: PBKDF2.ITERATIONS_PER_SECOND,
        algorithm: PBKDF2.ALGORITHM,
      });
    });
  });

  describe('deriveKeyFromPasswordAsync', () => {
    const mockPassword = new Uint8Array([
      112, 97, 115, 115, 119, 111, 114, 100,
    ]); // "password"
    const mockSalt = new Uint8Array(32).fill(1);
    const mockDerivedKeyBuffer = new ArrayBuffer(32);
    const mockDerivedKey = new Uint8Array(mockDerivedKeyBuffer);

    beforeEach(() => {
      mockCrypto.subtle.deriveBits.mockResolvedValue(mockDerivedKeyBuffer);
    });

    it('should derive key successfully with default parameters', async () => {
      const result = await Pbkdf2Service.deriveKeyFromPasswordAsync(
        mockPassword,
      );

      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        mockPassword,
        'PBKDF2',
        false,
        ['deriveBits'],
      );

      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 1304000,
          hash: 'SHA-256',
        }),
        {},
        256,
      );

      expect(result).toEqual({
        salt: expect.any(Uint8Array),
        hash: mockDerivedKey,
        iterations: PBKDF2.ITERATIONS_PER_SECOND,
      });
    });

    it('should use provided salt', async () => {
      const result = await Pbkdf2Service.deriveKeyFromPasswordAsync(
        mockPassword,
        mockSalt,
      );

      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalledWith(
        expect.objectContaining({
          salt: mockSalt,
        }),
        {},
        256,
      );

      expect(result.salt).toEqual(mockSalt);
    });

    it('should use custom parameters', async () => {
      const iterations = 500000;
      const saltBytes = 16;
      const keySize = 64;
      const algorithm = 'SHA-512';
      const mockCustomKeyBuffer = new ArrayBuffer(64);
      mockCrypto.subtle.deriveBits.mockResolvedValue(mockCustomKeyBuffer);

      await Pbkdf2Service.deriveKeyFromPasswordAsync(
        mockPassword,
        undefined,
        iterations,
        saltBytes,
        keySize,
        algorithm,
      );

      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalledWith(
        expect.objectContaining({
          iterations,
          hash: algorithm,
        }),
        {},
        512,
      );
    });

    it('should throw error for invalid salt length', async () => {
      const invalidSalt = new Uint8Array(16); // Wrong length for default config

      await expect(
        Pbkdf2Service.deriveKeyFromPasswordAsync(mockPassword, invalidSalt),
      ).rejects.toThrow(new Pbkdf2Error(Pbkdf2ErrorType.InvalidSaltLength));
    });

    it('should throw error for invalid hash length', async () => {
      const wrongSizeBuffer = new ArrayBuffer(16); // Wrong size
      mockCrypto.subtle.deriveBits.mockResolvedValue(wrongSizeBuffer);

      await expect(
        Pbkdf2Service.deriveKeyFromPasswordAsync(mockPassword),
      ).rejects.toThrow(new Pbkdf2Error(Pbkdf2ErrorType.InvalidHashLength));
    });

    it('should generate random salt when not provided', async () => {
      const mockRandomSalt = new Uint8Array(32).fill(2);
      mockCrypto.getRandomValues.mockReturnValue(mockRandomSalt);

      const result = await Pbkdf2Service.deriveKeyFromPasswordAsync(
        mockPassword,
      );

      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );
      expect(result.salt).toEqual(mockRandomSalt);
    });
  });

  describe('deriveKeyFromPasswordWithProfileAsync', () => {
    const mockPassword = new Uint8Array([
      112, 97, 115, 115, 119, 111, 114, 100,
    ]); // "password"
    const mockSalt = new Uint8Array(64).fill(1); // Browser password profile uses 64-byte salt
    const mockDerivedKeyBuffer = new ArrayBuffer(32);

    beforeEach(() => {
      mockCrypto.subtle.deriveBits.mockResolvedValue(mockDerivedKeyBuffer);
    });

    it('should derive key with BACKUP_CODES profile', async () => {
      const result = await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
        mockPassword,
        Pbkdf2ProfileEnum.BACKUP_CODES,
      );

      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 100000,
          hash: 'SHA-256',
        }),
        {},
        256,
      );

      expect(result).toEqual({
        salt: expect.any(Uint8Array),
        hash: new Uint8Array(mockDerivedKeyBuffer),
        iterations: 100000,
      });
    });

    it('should derive key with BROWSER_PASSWORD profile', async () => {
      const result = await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
        mockPassword,
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
      );

      expect(mockCrypto.subtle.deriveBits).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'PBKDF2',
          iterations: 2000000,
          hash: 'SHA-512',
        }),
        {},
        256,
      );

      expect(result).toEqual({
        salt: expect.any(Uint8Array),
        hash: new Uint8Array(mockDerivedKeyBuffer),
        iterations: 2000000,
      });
    });

    it('should use provided salt with profile', async () => {
      const result = await Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
        mockPassword,
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
        mockSalt,
      );

      expect(result.salt).toEqual(mockSalt);
    });

    it('should throw error for invalid salt length with profile', async () => {
      const invalidSalt = new Uint8Array(16); // Wrong length for browser password profile

      await expect(
        Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync(
          mockPassword,
          Pbkdf2ProfileEnum.BROWSER_PASSWORD,
          invalidSalt,
        ),
      ).rejects.toThrow(new Pbkdf2Error(Pbkdf2ErrorType.InvalidSaltLength));
    });
  });

  describe('error handling', () => {
    const mockPassword = new Uint8Array([
      112, 97, 115, 115, 119, 111, 114, 100,
    ]);

    it('should handle crypto.subtle.importKey failure', async () => {
      mockCrypto.subtle.importKey.mockRejectedValue(new Error('Import failed'));

      await expect(
        Pbkdf2Service.deriveKeyFromPasswordAsync(mockPassword),
      ).rejects.toThrow('Import failed');
    });

    it('should handle crypto.subtle.deriveBits failure', async () => {
      mockCrypto.subtle.deriveBits.mockRejectedValue(new Error('Derive failed'));

      await expect(
        Pbkdf2Service.deriveKeyFromPasswordAsync(mockPassword),
      ).rejects.toThrow('Derive failed');
    });
  });

  describe('integration with constants', () => {
    it('should use correct default values from constants', () => {
      const config = Pbkdf2Service.getConfig();

      expect(config.hashBytes).toBe(ECIES.SYMMETRIC.KEY_SIZE);
      expect(config.saltBytes).toBe(PBKDF2.SALT_BYTES);
      expect(config.iterations).toBe(PBKDF2.ITERATIONS_PER_SECOND);
      expect(config.algorithm).toBe(PBKDF2.ALGORITHM);
    });

    it('should use correct profile values from constants', () => {
      const backupConfig = Pbkdf2Service.getProfileConfig(
        Pbkdf2ProfileEnum.BACKUP_CODES,
      );
      const browserConfig = Pbkdf2Service.getProfileConfig(
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
      );

      expect(backupConfig).toEqual(PBKDF2_PROFILES.BACKUP_CODES);
      expect(browserConfig).toEqual(PBKDF2_PROFILES.BROWSER_PASSWORD);
    });
  });

  describe('type safety', () => {
    it('should return correct interface types', () => {
      const config: IPbkdf2Config = Pbkdf2Service.getConfig();
      expect(typeof config.hashBytes).toBe('number');
      expect(typeof config.saltBytes).toBe('number');
      expect(typeof config.iterations).toBe('number');
      expect(typeof config.algorithm).toBe('string');
    });

    it('should return correct result interface', async () => {
      const mockPassword = new Uint8Array([
        112, 97, 115, 115, 119, 111, 114, 100,
      ]);
      const result: IPbkdf2Result =
        await Pbkdf2Service.deriveKeyFromPasswordAsync(mockPassword);

      expect(result.salt).toBeInstanceOf(Uint8Array);
      expect(result.hash).toBeInstanceOf(Uint8Array);
      expect(typeof result.iterations).toBe('number');
    });
  });
});
