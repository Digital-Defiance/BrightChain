import { IECIESConfig } from '@brightchain/brightchain-lib';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EciesFileService } from './file';
import { ECIESService } from './service';

describe('EciesFileService (Backend)', () => {
  let eciesService: ECIESService;
  let fileService: EciesFileService;
  let userPrivateKey: Buffer;
  let recipientPublicKey: Buffer;
  let config: IECIESConfig;
  let tempDir: string;

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
      eciesService.generateNewMnemonic(),
    );
    userPrivateKey = Buffer.from(wallet.getPrivateKey());
    recipientPublicKey = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(wallet.getPublicKey()),
    ]);

    fileService = new EciesFileService(eciesService, userPrivateKey);

    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecies-file-test-'));
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('File Path Operations', () => {
    it('should encrypt and decrypt a small file from path', () => {
      const testData = Buffer.from('Hello, World!');
      const inputPath = path.join(tempDir, 'input.txt');
      const outputPath = path.join(tempDir, 'output.txt');

      // Write test file
      fs.writeFileSync(inputPath, testData);

      // Encrypt file
      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      expect(encrypted).toBeInstanceOf(Buffer);
      expect(encrypted.length).toBeGreaterThan(testData.length);

      // Decrypt to file
      fileService.decryptFileToPath(encrypted, outputPath);

      // Verify decrypted content
      const decryptedData = fs.readFileSync(outputPath);
      expect(decryptedData).toEqual(testData);
    });

    it('should encrypt and decrypt a large file (multiple chunks)', () => {
      const chunkSize = 1024 * 1024; // 1MB
      const testData = Buffer.alloc(chunkSize * 2.5); // 2.5MB
      for (let i = 0; i < testData.length; i++) {
        testData[i] = i % 256;
      }

      const inputPath = path.join(tempDir, 'large-input.bin');
      const outputPath = path.join(tempDir, 'large-output.bin');

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      expect(encrypted.length).toBeGreaterThan(testData.length);

      fileService.decryptFileToPath(encrypted, outputPath);

      const decryptedData = fs.readFileSync(outputPath);
      expect(decryptedData).toEqual(testData);
    });

    it('should handle empty files', () => {
      const testData = Buffer.alloc(0);
      const inputPath = path.join(tempDir, 'empty-input.txt');
      const outputPath = path.join(tempDir, 'empty-output.txt');

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      fileService.decryptFileToPath(encrypted, outputPath);

      const decryptedData = fs.readFileSync(outputPath);
      expect(decryptedData).toEqual(testData);
    });

    it('should handle files with exact chunk size', () => {
      const chunkSize = 1024 * 1024; // 1MB
      const testData = Buffer.alloc(chunkSize);
      testData.fill(42);

      const inputPath = path.join(tempDir, 'exact-chunk-input.bin');
      const outputPath = path.join(tempDir, 'exact-chunk-output.bin');

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      fileService.decryptFileToPath(encrypted, outputPath);

      const decryptedData = fs.readFileSync(outputPath);
      expect(decryptedData).toEqual(testData);
    });
  });

  describe('Buffer Operations', () => {
    it('should decrypt encrypted buffer data', () => {
      const testData = Buffer.from('Test buffer data');
      const inputPath = path.join(tempDir, 'buffer-input.txt');

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      const decrypted = fileService.decryptFile(encrypted);

      expect(decrypted).toEqual(testData);
    });

    it('should handle large buffer decryption', () => {
      const testData = Buffer.alloc(1024 * 1024 * 3); // 3MB
      testData.fill(123);

      const inputPath = path.join(tempDir, 'large-buffer-input.bin');

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      const decrypted = fileService.decryptFile(encrypted);

      expect(decrypted).toEqual(testData);
    });
  });

  describe('Header Validation', () => {
    it('should correctly parse file headers', () => {
      const testData = Buffer.from('Header test data');
      const inputPath = path.join(tempDir, 'header-test.txt');

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );

      // Should be able to decrypt without errors (validates header parsing)
      const decrypted = fileService.decryptFile(encrypted);
      expect(decrypted).toEqual(testData);
    });

    it('should handle multiple chunk headers correctly', () => {
      const chunkSize = 1024 * 1024;
      const testData = Buffer.alloc(chunkSize * 3 + 500); // 3.5 chunks
      for (let i = 0; i < testData.length; i++) {
        testData[i] = (i * 7) % 256; // Some pattern
      }

      const inputPath = path.join(tempDir, 'multi-chunk-header.bin');

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      const decrypted = fileService.decryptFile(encrypted);

      expect(decrypted).toEqual(testData);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent file', () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist.txt');

      expect(() => {
        fileService.encryptFileFromPath(nonExistentPath, recipientPublicKey);
      }).toThrow();
    });

    it('should throw error for corrupted encrypted data', () => {
      const corruptedData = Buffer.from([1, 2, 3, 4, 5]);

      expect(() => {
        fileService.decryptFile(corruptedData);
      }).toThrow();
    });

    it('should throw error for truncated encrypted data', () => {
      const testData = Buffer.from('Test data for truncation');
      const inputPath = path.join(tempDir, 'truncation-test.txt');

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      const truncated = encrypted.slice(0, 50); // Truncate

      expect(() => {
        fileService.decryptFile(truncated);
      }).toThrow();
    });

    it('should handle invalid output path gracefully', () => {
      const testData = Buffer.from('Test data');
      const inputPath = path.join(tempDir, 'valid-input.txt');
      const invalidOutputPath = '/invalid/path/output.txt';

      fs.writeFileSync(inputPath, testData);

      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );

      expect(() => {
        fileService.decryptFileToPath(encrypted, invalidOutputPath);
      }).toThrow();
    });
  });

  describe('Performance and Memory', () => {
    it('should handle very large files efficiently', () => {
      const chunkSize = 1024 * 1024;
      const testData = Buffer.alloc(chunkSize * 10); // 10MB
      testData.fill(255);

      const inputPath = path.join(tempDir, 'performance-test.bin');
      const outputPath = path.join(tempDir, 'performance-output.bin');

      fs.writeFileSync(inputPath, testData);

      const startTime = Date.now();
      const encrypted = fileService.encryptFileFromPath(
        inputPath,
        recipientPublicKey,
      );
      fileService.decryptFileToPath(encrypted, outputPath);
      const endTime = Date.now();

      const decryptedData = fs.readFileSync(outputPath);
      expect(decryptedData).toEqual(testData);

      // Should complete within reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
    });
  });
});
