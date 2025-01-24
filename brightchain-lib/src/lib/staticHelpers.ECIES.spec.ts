import { createECDH, randomBytes } from 'crypto';
import { StaticHelpersECIES } from './staticHelpers.ECIES';

describe('StaticHelpersECIES', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  let keyPair: { privateKey: Buffer; publicKey: Buffer };
  let keyPairHex: { privateKey: string; publicKey: string };
  let testData: Buffer;

  beforeAll(() => {
    // Create key pairs once for all tests
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.generateKeys();
    keyPair = {
      privateKey: ecdh.getPrivateKey(),
      publicKey: ecdh.getPublicKey(),
    };
    keyPairHex = {
      privateKey: keyPair.privateKey.toString('hex'),
      publicKey: keyPair.publicKey.toString('hex'),
    };
    testData = Buffer.from('test data');
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt data with proper structure', () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        testData,
      );

      // Verify encrypted data structure
      expect(encryptedData.length).toBeGreaterThan(
        StaticHelpersECIES.eciesOverheadLength,
      );

      // Extract and verify components
      const ephemeralPublicKey = encryptedData.subarray(
        0,
        StaticHelpersECIES.publicKeyLength,
      );
      const iv = encryptedData.subarray(
        StaticHelpersECIES.publicKeyLength,
        StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
      );
      const authTag = encryptedData.subarray(
        StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
        StaticHelpersECIES.publicKeyLength +
          StaticHelpersECIES.ivLength +
          StaticHelpersECIES.authTagLength,
      );
      const encrypted = encryptedData.subarray(
        StaticHelpersECIES.publicKeyLength +
          StaticHelpersECIES.ivLength +
          StaticHelpersECIES.authTagLength,
      );

      expect(ephemeralPublicKey.length).toBe(
        StaticHelpersECIES.publicKeyLength,
      );
      expect(iv.length).toBe(StaticHelpersECIES.ivLength);
      expect(authTag.length).toBe(StaticHelpersECIES.authTagLength);
      expect(encrypted.length).toBeGreaterThanOrEqual(testData.length);

      // Test both decryption methods
      const decryptedWithComponents = StaticHelpersECIES.decryptWithComponents(
        keyPair.privateKey,
        ephemeralPublicKey,
        iv,
        authTag,
        encrypted,
      );
      expect(decryptedWithComponents).toEqual(testData);

      const decryptedWithHeader = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedData,
      );
      expect(decryptedWithHeader).toEqual(testData);
    });

    it('should handle empty and large data', () => {
      // Empty data
      const emptyData = Buffer.alloc(0);
      const encryptedEmpty = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        emptyData,
      );
      const decryptedEmpty = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedEmpty,
      );
      expect(decryptedEmpty).toEqual(emptyData);

      // Large data (64KB - sufficient for testing encryption/decryption of larger payloads)
      const largeData = randomBytes(64 * 1024);
      const encryptedLarge = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        largeData,
      );
      const decryptedLarge = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedLarge,
      );
      expect(decryptedLarge).toEqual(largeData);
    });

    it('should fail with invalid data or mismatched keys', () => {
      // Invalid data
      const invalidData = Buffer.alloc(10);
      expect(() =>
        StaticHelpersECIES.decrypt(keyPair.privateKey, invalidData),
      ).toThrow();

      // Mismatched keys
      const otherEcdh = createECDH(StaticHelpersECIES.curveName);
      otherEcdh.generateKeys();
      const encryptedData = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        testData,
      );
      expect(() =>
        StaticHelpersECIES.decrypt(otherEcdh.getPrivateKey(), encryptedData),
      ).toThrow();
    });
  });

  describe('string encryption and decryption', () => {
    const testStrings = {
      normal: 'test string',
      empty: '',
      unicode: '🚀 Hello, 世界!',
    };

    it('should handle various string types correctly', () => {
      // Test all string types
      for (const str of Object.values(testStrings)) {
        const encryptedHex = StaticHelpersECIES.encryptString(
          keyPairHex.publicKey,
          str,
        );
        const decrypted = StaticHelpersECIES.decryptString(
          keyPairHex.privateKey,
          encryptedHex,
        );
        expect(decrypted).toBe(str);
      }
    });

    it('should fail with invalid hex strings', () => {
      const invalidHex = 'not a hex string';
      expect(() =>
        StaticHelpersECIES.decryptString(keyPairHex.privateKey, invalidHex),
      ).toThrow();
    });
  });

  describe('overhead calculations', () => {
    const blockSize = 4096;

    it('should calculate encrypted length correctly', () => {
      const dataLength = 1000;
      const result = StaticHelpersECIES.computeEncryptedLengthFromDataLength(
        dataLength,
        blockSize,
      );

      const expectedCapacityPerBlock =
        blockSize - StaticHelpersECIES.eciesOverheadLength;
      const expectedPadding =
        blockSize -
        StaticHelpersECIES.eciesOverheadLength -
        (dataLength % expectedCapacityPerBlock);

      expect(result.capacityPerBlock).toBe(expectedCapacityPerBlock);
      expect(result.blocksNeeded).toBe(1);
      expect(result.padding).toBe(expectedPadding);
      expect(result.encryptedDataLength).toBe(blockSize - result.padding);
      expect(result.totalEncryptedSize).toBe(blockSize);
    });

    it('should calculate decrypted length correctly', () => {
      const encryptedLength = blockSize;
      const padding = 100;

      const result =
        StaticHelpersECIES.computeDecryptedLengthFromEncryptedDataLength(
          encryptedLength,
          blockSize,
          padding,
        );

      expect(result).toBe(
        encryptedLength - StaticHelpersECIES.eciesOverheadLength - padding,
      );

      // Test invalid length
      expect(() =>
        StaticHelpersECIES.computeDecryptedLengthFromEncryptedDataLength(
          blockSize + 1,
          blockSize,
        ),
      ).toThrow('Invalid encrypted data length');
    });
  });
});
