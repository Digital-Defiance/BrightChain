import { Wallet } from '@ethereumjs/wallet';
import { EciesEncryptionTypeEnum } from '../enumerations/eciesEncryptionType';
import { Pbkdf2ProfileEnum } from '../enumerations/pbkdf2Profile';
import { SecureString } from '../secureString';
import { hexToUint8Array, uint8ArrayToHex } from '../utils';
import { ECIESService } from './ecies/service';
import { PasswordLoginService } from './passwordLogin';
import { Pbkdf2Service } from './pbkdf2';

// Mock dependencies
jest.mock('./pbkdf2');
jest.mock('./ecies/service');
jest.mock('../utils', () => ({
  hexToUint8Array: jest.fn(),
  uint8ArrayToHex: jest.fn(),
  isValidTimezone: jest.fn().mockReturnValue(true),
  validateEnumCollection: jest.fn(),
}));

// Mock crypto.subtle for AES operations
const mockCrypto = {
  subtle: {
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  },
  getRandomValues: jest.fn(),
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('PasswordLoginService', () => {
  let passwordLoginService: PasswordLoginService;
  let mockEciesService: jest.Mocked<ECIESService>;
  let mockMnemonic: SecureString;
  let mockPassword: SecureString;
  let mockWallet: Wallet;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockEciesService = {
      walletAndSeedFromMnemonic: jest.fn(),
      encrypt: jest.fn(),
      decryptSimpleOrSingleWithHeader: jest.fn(),
    } as any;

    mockMnemonic = {
      valueAsBuffer: new Uint8Array([109, 110, 101, 109, 111, 110, 105, 99]), // "mnemonic"
    } as SecureString;

    mockPassword = {
      valueAsBuffer: new Uint8Array([112, 97, 115, 115, 119, 111, 114, 100]), // "password"
    } as SecureString;

    // Mock wallet
    const mockPrivateKey = new Uint8Array(32).fill(1);
    const mockPublicKey = new Uint8Array(65).fill(2);
    mockWallet = {
      getPrivateKey: jest.fn().mockReturnValue(mockPrivateKey),
      getPublicKey: jest.fn().mockReturnValue(mockPublicKey),
    } as any;

    passwordLoginService = new PasswordLoginService(mockEciesService);

    // Setup default mock implementations
    (
      Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync as jest.Mock
    ).mockResolvedValue({
      salt: new Uint8Array(64).fill(3),
      hash: new Uint8Array(32).fill(4),
      iterations: 2000000,
    });

    mockEciesService.walletAndSeedFromMnemonic.mockReturnValue({
      wallet: mockWallet,
      seed: new Uint8Array(32),
    });

    mockEciesService.encrypt.mockResolvedValue(new Uint8Array([5, 6, 7, 8]));

    (uint8ArrayToHex as jest.Mock).mockImplementation((arr: Uint8Array) =>
      Array.from(arr)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    );

    (hexToUint8Array as jest.Mock).mockImplementation((hex: string) => {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return bytes;
    });

    // Mock crypto operations
    mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    });

    mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
    mockCrypto.subtle.decrypt.mockResolvedValue(new ArrayBuffer(32));
  });

  describe('createPasswordLoginBundle', () => {
    it('should create password login bundle successfully', async () => {
      const result = await passwordLoginService.createPasswordLoginBundle(mockMnemonic, mockPassword);
      
      expect(result.salt).toBeInstanceOf(Uint8Array);
      expect(result.encryptedPrivateKey).toBeInstanceOf(Uint8Array);
      expect(result.encryptedMnemonic).toBeInstanceOf(Uint8Array);
      expect(result.wallet).toBe(mockWallet);
    });
  });

  describe('setupPasswordLoginLocalStorageBundle', () => {
    it('should setup password login successfully', async () => {
      await passwordLoginService.setupPasswordLoginLocalStorageBundle(mockMnemonic, mockPassword);

      // Verify PBKDF2 was called with correct parameters
      expect(
        Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync,
      ).toHaveBeenCalledWith(
        mockPassword.valueAsBuffer,
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
      );

      // Verify wallet was derived from mnemonic
      expect(mockEciesService.walletAndSeedFromMnemonic).toHaveBeenCalledWith(
        mockMnemonic,
      );

      // Verify private key encryption
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        { name: 'AES-GCM' },
        false,
        ['encrypt'],
      );

      expect(mockCrypto.subtle.encrypt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AES-GCM' }),
        {},
        expect.any(Uint8Array),
      );

      // Verify mnemonic encryption
      expect(mockEciesService.encrypt).toHaveBeenCalledWith(
        EciesEncryptionTypeEnum.Simple,
        [{ publicKey: mockWallet.getPublicKey() }],
        mockMnemonic.valueAsBuffer,
      );

      // Verify localStorage calls
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'passwordLoginSalt',
        expect.any(String),
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'encryptedPrivateKey',
        expect.any(String),
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'encryptedMnemonic',
        expect.any(String),
      );
    });

    it('should handle PBKDF2 derivation failure', async () => {
      (
        Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync as jest.Mock
      ).mockRejectedValue(new Error('PBKDF2 failed'));

      await expect(
        passwordLoginService.setupPasswordLoginLocalStorageBundle(mockMnemonic, mockPassword),
      ).rejects.toThrow('PBKDF2 failed');
    });

    it('should handle wallet derivation failure', async () => {
      mockEciesService.walletAndSeedFromMnemonic.mockImplementation(() => {
        throw new Error('Wallet derivation failed');
      });

      await expect(
        passwordLoginService.setupPasswordLoginLocalStorageBundle(mockMnemonic, mockPassword),
      ).rejects.toThrow('Wallet derivation failed');
    });

    it('should handle AES encryption failure', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(
        new Error('AES encryption failed'),
      );

      await expect(
        passwordLoginService.setupPasswordLoginLocalStorageBundle(mockMnemonic, mockPassword),
      ).rejects.toThrow('AES encryption failed');
    });

    it('should handle ECIES encryption failure', async () => {
      mockEciesService.encrypt.mockRejectedValue(
        new Error('ECIES encryption failed'),
      );

      await expect(
        passwordLoginService.setupPasswordLoginLocalStorageBundle(mockMnemonic, mockPassword),
      ).rejects.toThrow('ECIES encryption failed');
    });
  });

  describe('getWalletAndMnemonicFromEncryptedPasswordBundle', () => {
    it('should decrypt bundle successfully', async () => {
      const mockSalt = new Uint8Array(64).fill(3);
      const mockEncryptedKey = new Uint8Array(32).fill(4);
      const mockEncryptedMnemonic = new Uint8Array([5, 6, 7, 8]);
      
      (Wallet as any).fromPrivateKey = jest.fn().mockReturnValue(mockWallet);
      mockEciesService.decryptSimpleOrSingleWithHeader.mockResolvedValue(
        new Uint8Array([109, 110, 101, 109, 111, 110, 105, 99])
      );
      
      const result = await passwordLoginService.getWalletAndMnemonicFromEncryptedPasswordBundle(
        mockSalt, mockEncryptedKey, mockEncryptedMnemonic, mockPassword
      );
      
      expect(result.wallet).toBe(mockWallet);
      expect(result.mnemonic).toBeInstanceOf(SecureString);
    });
  });

  describe('getWalletAndMnemonicFromLocalStorageBundle', () => {
    const mockSaltHex =
      '0303030303030303030303030303030303030303030303030303030303030303';
    const mockEncryptedPrivateKeyHex =
      '0404040404040404040404040404040404040404040404040404040404040404';
    const mockEncryptedMnemonicHex = '05060708';
    const mockDecryptedMnemonic = new Uint8Array([
      109, 110, 101, 109, 111, 110, 105, 99,
    ]);

    beforeEach(() => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'passwordLoginSalt':
            return mockSaltHex;
          case 'encryptedPrivateKey':
            return mockEncryptedPrivateKeyHex;
          case 'encryptedMnemonic':
            return mockEncryptedMnemonicHex;
          default:
            return null;
        }
      });

      mockEciesService.decryptSimpleOrSingleWithHeader.mockResolvedValue(
        mockDecryptedMnemonic,
      );

      // Mock Wallet.fromPrivateKey
      (Wallet as any).fromPrivateKey = jest.fn().mockReturnValue(mockWallet);
    });

    it('should recover wallet and mnemonic successfully', async () => {
      const result =
        await passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(
          mockPassword,
        );

      // Verify localStorage reads
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        'passwordLoginSalt',
      );
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        'encryptedPrivateKey',
      );
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(
        'encryptedMnemonic',
      );

      // Verify PBKDF2 derivation with stored salt
      expect(
        Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync,
      ).toHaveBeenCalledWith(
        mockPassword.valueAsBuffer,
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
        expect.any(Uint8Array),
      );

      // Verify AES decryption
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
      );

      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();

      // Verify wallet creation
      expect(Wallet.fromPrivateKey).toHaveBeenCalledWith(
        expect.any(Uint8Array),
      );

      // Verify ECIES decryption
      expect(
        mockEciesService.decryptSimpleOrSingleWithHeader,
      ).toHaveBeenCalledWith(
        true,
        mockWallet.getPrivateKey(),
        expect.any(Uint8Array),
      );

      // Verify result
      expect(result.wallet).toBe(mockWallet);
      expect(result.mnemonic).toBeInstanceOf(SecureString);
    });

    it('should throw error when salt is missing', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'passwordLoginSalt') return null;
        return 'mock-value';
      });

      await expect(
        passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(mockPassword),
      ).rejects.toThrow('Password login not set up');
    });

    it('should throw error when encrypted private key is missing', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'encryptedPrivateKey') return null;
        return 'mock-value';
      });

      await expect(
        passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(mockPassword),
      ).rejects.toThrow('Password login not set up');
    });

    it('should throw error when encrypted mnemonic is missing', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'encryptedMnemonic') return null;
        return 'mock-value';
      });

      await expect(
        passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(mockPassword),
      ).rejects.toThrow('Password login not set up');
    });

    it('should handle PBKDF2 derivation failure during recovery', async () => {
      (
        Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync as jest.Mock
      ).mockRejectedValue(new Error('PBKDF2 failed'));

      await expect(
        passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(mockPassword),
      ).rejects.toThrow('PBKDF2 failed');
    });

    it('should handle AES decryption failure', async () => {
      mockCrypto.subtle.decrypt.mockRejectedValue(
        new Error('AES decryption failed'),
      );

      await expect(
        passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(mockPassword),
      ).rejects.toThrow('AES decryption failed');
    });

    it('should handle wallet creation failure', async () => {
      (Wallet as any).fromPrivateKey.mockImplementation(() => {
        throw new Error('Invalid private key');
      });

      await expect(
        passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(mockPassword),
      ).rejects.toThrow('Invalid private key');
    });

    it('should handle ECIES decryption failure', async () => {
      mockEciesService.decryptSimpleOrSingleWithHeader.mockRejectedValue(
        new Error('ECIES decryption failed'),
      );

      await expect(
        passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(mockPassword),
      ).rejects.toThrow('ECIES decryption failed');
    });
  });

  describe('integration scenarios', () => {
    it('should complete full setup and recovery cycle', async () => {
      // Setup
      await passwordLoginService.setupPasswordLoginLocalStorageBundle(mockMnemonic, mockPassword);

      // Verify setup calls
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3);

      // Mock localStorage for recovery
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'passwordLoginSalt':
            return '0303030303030303030303030303030303030303030303030303030303030303';
          case 'encryptedPrivateKey':
            return '0404040404040404040404040404040404040404040404040404040404040404';
          case 'encryptedMnemonic':
            return '05060708';
          default:
            return null;
        }
      });

      // Mock Wallet.fromPrivateKey for recovery
      (Wallet as any).fromPrivateKey = jest.fn().mockReturnValue(mockWallet);
      mockEciesService.decryptSimpleOrSingleWithHeader.mockResolvedValue(
        new Uint8Array([109, 110, 101, 109, 111, 110, 105, 99]),
      );

      // Recovery
      const result =
        await passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(
          mockPassword,
        );

      expect(result.wallet).toBe(mockWallet);
      expect(result.mnemonic).toBeInstanceOf(SecureString);
    });

    it('should handle different password profiles correctly', async () => {
      await passwordLoginService.setupPasswordLoginLocalStorageBundle(mockMnemonic, mockPassword);

      expect(
        Pbkdf2Service.deriveKeyFromPasswordWithProfileAsync,
      ).toHaveBeenCalledWith(
        mockPassword.valueAsBuffer,
        Pbkdf2ProfileEnum.BROWSER_PASSWORD,
      );
    });
  });

  describe('error edge cases', () => {
    it('should handle empty password', async () => {
      const emptyPassword = {
        valueAsBuffer: new Uint8Array(0),
      } as SecureString;

      // Should not throw during setup, but may fail during crypto operations
      await expect(
        passwordLoginService.setupPasswordLoginLocalStorageBundle(mockMnemonic, emptyPassword),
      ).resolves.not.toThrow();
    });

    it('should handle empty mnemonic', async () => {
      const emptyMnemonic = {
        valueAsBuffer: new Uint8Array(0),
      } as SecureString;

      await expect(
        passwordLoginService.setupPasswordLoginLocalStorageBundle(emptyMnemonic, mockPassword),
      ).resolves.not.toThrow();
    });

    it('should handle corrupted localStorage data', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'passwordLoginSalt':
            return 'invalid-hex';
          case 'encryptedPrivateKey':
            return 'also-invalid-hex';
          case 'encryptedMnemonic':
            return 'still-invalid-hex';
          default:
            return null;
        }
      });

      (hexToUint8Array as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid hex string');
      });

      await expect(
        passwordLoginService.getWalletAndMnemonicFromLocalStorageBundle(mockPassword),
      ).rejects.toThrow('Invalid hex string');
    });
  });
});