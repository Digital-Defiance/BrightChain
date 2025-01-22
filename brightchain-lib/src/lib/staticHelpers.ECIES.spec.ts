import { createECDH, randomBytes } from 'crypto';
import { StaticHelpersECIES } from './staticHelpers.ECIES';

describe('StaticHelpersECIES', () => {
  describe('encryption and decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const keyPair = {
        privateKey: ecdh.getPrivateKey(),
        publicKey: ecdh.getPublicKey(),
      };

      const originalData = Buffer.from('test data');
      const encryptedData = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        originalData,
      );

      // Verify encrypted data structure
      expect(encryptedData.length).toBeGreaterThan(
        StaticHelpersECIES.eciesOverheadLength,
      );

      // Extract components
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

      // Verify components
      expect(ephemeralPublicKey.length).toBe(
        StaticHelpersECIES.publicKeyLength,
      );
      expect(iv.length).toBe(StaticHelpersECIES.ivLength);
      expect(authTag.length).toBe(StaticHelpersECIES.authTagLength);
      // The encrypted data will be longer than the original due to padding
      expect(encrypted.length).toBeGreaterThanOrEqual(originalData.length);

      // Decrypt with components
      const decryptedData = StaticHelpersECIES.decryptWithComponents(
        keyPair.privateKey,
        ephemeralPublicKey,
        iv,
        authTag,
        encrypted,
      );

      // Verify decrypted data
      expect(decryptedData).toEqual(originalData);

      // Test decrypt method
      const decryptedWithHeader = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedData,
      );
      expect(decryptedWithHeader).toEqual(originalData);
    });

    it('should handle empty data', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const keyPair = {
        privateKey: ecdh.getPrivateKey(),
        publicKey: ecdh.getPublicKey(),
      };

      const originalData = Buffer.alloc(0);
      const encryptedData = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        originalData,
      );

      const decryptedData = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedData,
      );

      expect(decryptedData).toEqual(originalData);
    });

    it('should handle large data', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const keyPair = {
        privateKey: ecdh.getPrivateKey(),
        publicKey: ecdh.getPublicKey(),
      };

      const originalData = randomBytes(1024 * 1024); // 1MB
      const encryptedData = StaticHelpersECIES.encrypt(
        keyPair.publicKey,
        originalData,
      );

      const decryptedData = StaticHelpersECIES.decrypt(
        keyPair.privateKey,
        encryptedData,
      );

      expect(decryptedData).toEqual(originalData);
    });

    it('should fail with invalid data', () => {
      const keyPair = {
        publicKey: Buffer.alloc(65, 1),
        privateKey: Buffer.alloc(32, 2),
      };

      const invalidData = Buffer.alloc(10); // Too small for header

      expect(() =>
        StaticHelpersECIES.decrypt(keyPair.privateKey, invalidData),
      ).toThrow();
    });

    it('should fail with mismatched keys', () => {
      const ecdh1 = createECDH(StaticHelpersECIES.curveName);
      ecdh1.generateKeys();
      const keyPair1 = {
        privateKey: ecdh1.getPrivateKey(),
        publicKey: ecdh1.getPublicKey(),
      };

      const ecdh2 = createECDH(StaticHelpersECIES.curveName);
      ecdh2.generateKeys();
      const keyPair2 = {
        privateKey: ecdh2.getPrivateKey(),
        publicKey: ecdh2.getPublicKey(),
      };

      const originalData = Buffer.from('test data');
      const encryptedData = StaticHelpersECIES.encrypt(
        keyPair1.publicKey,
        originalData,
      );

      expect(() =>
        StaticHelpersECIES.decrypt(keyPair2.privateKey, encryptedData),
      ).toThrow();
    });
  });

  describe('string encryption and decryption', () => {
    it('should encrypt and decrypt strings correctly', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const keyPair = {
        privateKey: ecdh.getPrivateKey().toString('hex'),
        publicKey: ecdh.getPublicKey().toString('hex'),
      };

      const originalString = 'test string';
      const encryptedHex = StaticHelpersECIES.encryptString(
        keyPair.publicKey,
        originalString,
      );

      const decryptedString = StaticHelpersECIES.decryptString(
        keyPair.privateKey,
        encryptedHex,
      );

      expect(decryptedString).toBe(originalString);
    });

    it('should handle empty strings', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const keyPair = {
        privateKey: ecdh.getPrivateKey().toString('hex'),
        publicKey: ecdh.getPublicKey().toString('hex'),
      };

      const originalString = '';
      const encryptedHex = StaticHelpersECIES.encryptString(
        keyPair.publicKey,
        originalString,
      );

      const decryptedString = StaticHelpersECIES.decryptString(
        keyPair.privateKey,
        encryptedHex,
      );

      expect(decryptedString).toBe(originalString);
    });

    it('should handle unicode strings', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const keyPair = {
        privateKey: ecdh.getPrivateKey().toString('hex'),
        publicKey: ecdh.getPublicKey().toString('hex'),
      };

      const originalString = '🚀 Hello, 世界!';
      const encryptedHex = StaticHelpersECIES.encryptString(
        keyPair.publicKey,
        originalString,
      );

      const decryptedString = StaticHelpersECIES.decryptString(
        keyPair.privateKey,
        encryptedHex,
      );

      expect(decryptedString).toBe(originalString);
    });

    it('should fail with invalid hex strings', () => {
      const ecdh = createECDH(StaticHelpersECIES.curveName);
      ecdh.generateKeys();
      const keyPair = {
        privateKey: ecdh.getPrivateKey().toString('hex'),
        publicKey: ecdh.getPublicKey().toString('hex'),
      };

      const invalidHex = 'not a hex string';

      expect(() =>
        StaticHelpersECIES.decryptString(keyPair.privateKey, invalidHex),
      ).toThrow();
    });
  });

  describe('overhead calculations', () => {
    it('should calculate encrypted length correctly', () => {
      const dataLength = 1000;
      const blockSize = 4096;

      const result = StaticHelpersECIES.computeEncryptedLengthFromDataLength(
        dataLength,
        blockSize,
      );

      expect(result.capacityPerBlock).toBe(
        blockSize - StaticHelpersECIES.eciesOverheadLength,
      );
      expect(result.blocksNeeded).toBe(1);
      expect(result.padding).toBe(
        blockSize -
          StaticHelpersECIES.eciesOverheadLength -
          (dataLength % (blockSize - StaticHelpersECIES.eciesOverheadLength)),
      );
      expect(result.encryptedDataLength).toBe(blockSize - result.padding);
      expect(result.totalEncryptedSize).toBe(blockSize);
    });

    it('should calculate decrypted length correctly', () => {
      const encryptedLength = 4096;
      const blockSize = 4096;
      const padding = 100;

      const result =
        StaticHelpersECIES.computeDecryptedLengthFromEncryptedDataLength(
          encryptedLength,
          blockSize,
          padding,
        );

      expect(result).toBe(
        encryptedLength -
          StaticHelpersECIES.eciesOverheadLength -
          (padding ?? 0),
      );
    });

    it('should handle invalid encrypted lengths', () => {
      const encryptedLength = 4097; // Not a multiple of blockSize
      const blockSize = 4096;

      expect(() =>
        StaticHelpersECIES.computeDecryptedLengthFromEncryptedDataLength(
          encryptedLength,
          blockSize,
        ),
      ).toThrow('Invalid encrypted data length');
    });
  });
});
