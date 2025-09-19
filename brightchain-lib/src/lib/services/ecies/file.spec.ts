import { ECIESService } from './service';
import { EciesFileService } from './file';
import { IECIESConfig } from '../../interfaces/ecies-config';

// Mock File API for Node.js environment
class MockFile {
  constructor(
    private data: Uint8Array,
    public name: string,
    public size: number = data.length
  ) {}

  slice(start: number, end?: number): MockFile {
    const slicedData = this.data.slice(start, end);
    return new MockFile(slicedData, this.name, slicedData.length);
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.data.buffer.slice(
      this.data.byteOffset,
      this.data.byteOffset + this.data.byteLength
    );
  }
}

// Mock DOM methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

Object.defineProperty(global, 'document', {
  value: {
    createElement: mockCreateElement,
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  },
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

describe('EciesFileService (Frontend)', () => {
  let eciesService: ECIESService;
  let fileService: EciesFileService;
  let userPrivateKey: Uint8Array;
  let recipientPublicKey: Uint8Array;
  let config: IECIESConfig;

  beforeAll(() => {
    config = {
      curveName: 'secp256k1',
      primaryKeyDerivationPath: "m/44'/60'/0'/0/0",
      mnemonicStrength: 128,
      symmetricAlgorithm: 'aes-256-gcm',
      symmetricKeyBits: 256,
      symmetricKeyMode: 'gcm',
    };

    eciesService = new ECIESService(config);
    
    // Generate test keys
    const { wallet } = eciesService.walletAndSeedFromMnemonic(
      eciesService.generateNewMnemonic()
    );
    userPrivateKey = new Uint8Array(wallet.getPrivateKey());
    recipientPublicKey = new Uint8Array(
      Buffer.concat([Buffer.from([0x04]), Buffer.from(wallet.getPublicKey())])
    );

    fileService = new EciesFileService(eciesService, userPrivateKey);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateElement.mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    });
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    
    // Force garbage collection before each test if available
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    // Clear any pending timers
    jest.clearAllTimers();
  });

  afterAll(() => {
    // Force cleanup of any remaining resources
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  describe('File Encryption/Decryption', () => {
    it('should encrypt and decrypt a small file', async () => {
      const originalData = new Uint8Array([1, 2, 3, 4, 5]);
      const file = new MockFile(originalData, 'test.txt') as unknown as File;

      const encrypted = await fileService.encryptFile(file, recipientPublicKey);
      expect(encrypted).toBeInstanceOf(Uint8Array);
      expect(encrypted.length).toBeGreaterThan(originalData.length);

      const decrypted = await fileService.decryptFile(encrypted);
      expect(decrypted).toEqual(originalData);
    });

    it('should encrypt and decrypt a large file (multiple chunks)', async () => {
      // Create a 2.5MB file (2.5 chunks)
      const chunkSize = 1024 * 1024; // 1MB
      const originalData = new Uint8Array(chunkSize * 2.5);
      for (let i = 0; i < originalData.length; i++) {
        originalData[i] = i % 256;
      }
      
      const file = new MockFile(originalData, 'large.bin') as unknown as File;

      try {
        const encrypted = await fileService.encryptFile(file, recipientPublicKey);
        expect(encrypted.length).toBeGreaterThan(originalData.length);

        const decrypted = await fileService.decryptFile(encrypted);
        expect(decrypted).toEqual(originalData);
      } finally {
        // Force cleanup
        if (global.gc) {
          global.gc();
        }
      }
    });

    it('should handle empty files', async () => {
      const originalData = new Uint8Array(0);
      const file = new MockFile(originalData, 'empty.txt') as unknown as File;

      const encrypted = await fileService.encryptFile(file, recipientPublicKey);
      const decrypted = await fileService.decryptFile(encrypted);
      
      expect(decrypted).toEqual(originalData);
    });

    it('should handle files with exact chunk size', async () => {
      const chunkSize = 1024 * 1024; // 1MB
      const originalData = new Uint8Array(chunkSize);
      originalData.fill(42);
      
      const file = new MockFile(originalData, 'exact-chunk.bin') as unknown as File;

      try {
        const encrypted = await fileService.encryptFile(file, recipientPublicKey);
        const decrypted = await fileService.decryptFile(encrypted);
        
        expect(decrypted).toEqual(originalData);
      } finally {
        // Force cleanup
        if (global.gc) {
          global.gc();
        }
      }
    });
  });

  describe('File Download', () => {
    it('should download encrypted file', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      fileService.downloadEncryptedFile(data, 'test.txt');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should download decrypted file', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      fileService.downloadDecryptedFile(data, 'test.txt');

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Header Serialization', () => {
    it('should correctly serialize and deserialize headers', async () => {
      const originalData = new Uint8Array([1, 2, 3]);
      const file = new MockFile(originalData, 'test.txt') as unknown as File;

      const encrypted = await fileService.encryptFile(file, recipientPublicKey);
      
      // The header should be properly embedded and parseable
      const decrypted = await fileService.decryptFile(encrypted);
      expect(decrypted).toEqual(originalData);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for corrupted encrypted data', async () => {
      const corruptedData = new Uint8Array([1, 2, 3, 4, 5]);
      
      await expect(fileService.decryptFile(corruptedData)).rejects.toThrow();
    });

    it('should throw error for truncated encrypted data', async () => {
      const originalData = new Uint8Array([1, 2, 3, 4, 5]);
      const file = new MockFile(originalData, 'test.txt') as unknown as File;

      const encrypted = await fileService.encryptFile(file, recipientPublicKey);
      const truncated = encrypted.slice(0, 10); // Truncate the data
      
      await expect(fileService.decryptFile(truncated)).rejects.toThrow();
    });
  });
});