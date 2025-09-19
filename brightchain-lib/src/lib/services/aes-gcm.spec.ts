import { ECIES } from '../constants';
import { AESGCMService } from './aesGCM';

describe('AESGCMService', () => {
  const testData = new TextEncoder().encode('Hello, World!');
  const key128 = crypto.getRandomValues(new Uint8Array(16)); // 128-bit key
  const key256 = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key

  describe('Constants', () => {
    it('should have correct algorithm name', () => {
      expect(AESGCMService.ALGORITHM_NAME).toBe('AES-GCM');
    });
  });

  describe('encrypt', () => {
    it('should encrypt data without auth tag', async () => {
      const result = await AESGCMService.encrypt(testData, key256, false);

      expect(result.encrypted).toBeInstanceOf(Uint8Array);
      expect(result.iv).toBeInstanceOf(Uint8Array);
      expect(result.iv.length).toBe(ECIES.IV_SIZE);
      expect(result.tag).toBeUndefined();
      expect(result.encrypted.length).toBeGreaterThan(0);
    });

    it('should encrypt data with auth tag', async () => {
      const result = await AESGCMService.encrypt(testData, key256, true);

      expect(result.encrypted).toBeInstanceOf(Uint8Array);
      expect(result.iv).toBeInstanceOf(Uint8Array);
      expect(result.tag).toBeInstanceOf(Uint8Array);
      expect(result.iv.length).toBe(ECIES.IV_SIZE);
      expect(result.tag!.length).toBe(ECIES.AUTH_TAG_SIZE); // 128 bits = 16 bytes
    });

    it('should work with 128-bit key', async () => {
      const result = await AESGCMService.encrypt(testData, key128, false);

      expect(result.encrypted).toBeInstanceOf(Uint8Array);
      expect(result.iv).toBeInstanceOf(Uint8Array);
    });

    it('should generate different IVs for each encryption', async () => {
      const result1 = await AESGCMService.encrypt(testData, key256, false);
      const result2 = await AESGCMService.encrypt(testData, key256, false);

      expect(result1.iv).not.toEqual(result2.iv);
    });

    it('should produce different ciphertext with different IVs', async () => {
      const result1 = await AESGCMService.encrypt(testData, key256, false);
      const result2 = await AESGCMService.encrypt(testData, key256, false);

      expect(result1.encrypted).not.toEqual(result2.encrypted);
    });

    it('should handle empty data', async () => {
      const emptyData = new Uint8Array(0);
      const result = await AESGCMService.encrypt(emptyData, key256, false);

      expect(result.encrypted).toBeInstanceOf(Uint8Array);
      expect(result.iv).toBeInstanceOf(Uint8Array);
    });

    it('should reject invalid key sizes', async () => {
      const invalidKey = new Uint8Array(15); // Invalid key size

      await expect(
        AESGCMService.encrypt(testData, invalidKey, false),
      ).rejects.toThrow();
    });
  });

  describe('decrypt', () => {
    it('should decrypt data without auth tag', async () => {
      const { encrypted, iv } = await AESGCMService.encrypt(
        testData,
        key256,
        false,
      );
      const decrypted = await AESGCMService.decrypt(
        iv,
        encrypted,
        key256,
        false,
      );

      expect(decrypted).toEqual(testData);
    });

    it('should decrypt data with auth tag', async () => {
      const { encrypted, iv, tag } = await AESGCMService.encrypt(
        testData,
        key256,
        true,
      );
      const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(
        encrypted,
        tag!,
      );
      const decrypted = await AESGCMService.decrypt(
        iv,
        encryptedWithTag,
        key256,
        true,
      );

      expect(decrypted).toEqual(testData);
    });

    it('should work with 128-bit key', async () => {
      const { encrypted, iv } = await AESGCMService.encrypt(
        testData,
        key128,
        false,
      );
      const decrypted = await AESGCMService.decrypt(
        iv,
        encrypted,
        key128,
        false,
      );

      expect(decrypted).toEqual(testData);
    });

    it('should handle empty data', async () => {
      const emptyData = new Uint8Array(0);
      const { encrypted, iv } = await AESGCMService.encrypt(
        emptyData,
        key256,
        false,
      );
      const decrypted = await AESGCMService.decrypt(
        iv,
        encrypted,
        key256,
        false,
      );

      expect(decrypted).toEqual(emptyData);
    });

    it('should fail with wrong key', async () => {
      const { encrypted, iv } = await AESGCMService.encrypt(
        testData,
        key256,
        false,
      );
      const wrongKey = crypto.getRandomValues(new Uint8Array(32));

      await expect(
        AESGCMService.decrypt(iv, encrypted, wrongKey, false),
      ).rejects.toThrow();
    });

    it('should fail with wrong IV', async () => {
      const { encrypted } = await AESGCMService.encrypt(
        testData,
        key256,
        false,
      );
      const wrongIv = crypto.getRandomValues(new Uint8Array(ECIES.IV_SIZE));

      await expect(
        AESGCMService.decrypt(wrongIv, encrypted, key256, false),
      ).rejects.toThrow();
    });

    it('should fail with corrupted ciphertext', async () => {
      const { encrypted, iv } = await AESGCMService.encrypt(
        testData,
        key256,
        false,
      );
      const corrupted = new Uint8Array(encrypted);
      corrupted[0] ^= 1; // Flip a bit

      await expect(
        AESGCMService.decrypt(iv, corrupted, key256, false),
      ).rejects.toThrow();
    });

    it('should fail with wrong auth tag', async () => {
      const { encrypted, iv, tag } = await AESGCMService.encrypt(
        testData,
        key256,
        true,
      );
      const wrongTag = crypto.getRandomValues(
        new Uint8Array(ECIES.AUTH_TAG_SIZE),
      );
      const encryptedWithWrongTag = AESGCMService.combineEncryptedDataAndTag(
        encrypted,
        wrongTag,
      );

      await expect(
        AESGCMService.decrypt(iv, encryptedWithWrongTag, key256, true),
      ).rejects.toThrow();
    });

    it('should fail with corrupted auth tag', async () => {
      const { encrypted, iv, tag } = await AESGCMService.encrypt(
        testData,
        key256,
        true,
      );
      const corruptedTag = new Uint8Array(tag!);
      corruptedTag[0] ^= 1; // Flip a bit
      const encryptedWithCorruptedTag =
        AESGCMService.combineEncryptedDataAndTag(encrypted, corruptedTag);

      await expect(
        AESGCMService.decrypt(iv, encryptedWithCorruptedTag, key256, true),
      ).rejects.toThrow();
    });
  });

  describe('combineEncryptedDataAndTag', () => {
    it('should combine encrypted data and auth tag', () => {
      const encrypted = new Uint8Array([1, 2, 3, 4]);
      const tag = new Uint8Array([5, 6, 7, 8]);

      const combined = AESGCMService.combineEncryptedDataAndTag(encrypted, tag);

      expect(combined).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
      expect(combined.length).toBe(encrypted.length + tag.length);
    });

    it('should handle empty encrypted data', () => {
      const encrypted = new Uint8Array(0);
      const tag = new Uint8Array([1, 2, 3, 4]);

      const combined = AESGCMService.combineEncryptedDataAndTag(encrypted, tag);

      expect(combined).toEqual(tag);
    });

    it('should handle empty tag', () => {
      const encrypted = new Uint8Array([1, 2, 3, 4]);
      const tag = new Uint8Array(0);

      const combined = AESGCMService.combineEncryptedDataAndTag(encrypted, tag);

      expect(combined).toEqual(encrypted);
    });
  });

  describe('combineIvAndEncryptedData', () => {
    it('should combine IV and encrypted data with tag', () => {
      const iv = new Uint8Array([1, 2, 3]);
      const encryptedWithTag = new Uint8Array([4, 5, 6, 7, 8, 9]);

      const combined = AESGCMService.combineIvAndEncryptedData(
        iv,
        encryptedWithTag,
      );

      expect(combined).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
      expect(combined.length).toBe(iv.length + encryptedWithTag.length);
    });

    it('should handle empty encrypted data', () => {
      const iv = new Uint8Array([1, 2, 3]);
      const encryptedWithTag = new Uint8Array(0);

      const combined = AESGCMService.combineIvAndEncryptedData(
        iv,
        encryptedWithTag,
      );

      expect(combined).toEqual(new Uint8Array([1, 2, 3]));
    });
  });

  describe('combineIvTagAndEncryptedData', () => {
    it('should combine IV, encrypted data and auth tag', () => {
      const iv = new Uint8Array([1, 2, 3]);
      const encrypted = new Uint8Array([4, 5, 6]);
      const tag = new Uint8Array([7, 8, 9]);

      const combined = AESGCMService.combineIvTagAndEncryptedData(
        iv,
        encrypted,
        tag,
      );

      expect(combined).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
      expect(combined.length).toBe(iv.length + encrypted.length + tag.length);
    });

    it('should handle empty components', () => {
      const iv = new Uint8Array([1, 2, 3]);
      const encrypted = new Uint8Array(0);
      const tag = new Uint8Array([7, 8, 9]);

      const combined = AESGCMService.combineIvTagAndEncryptedData(
        iv,
        encrypted,
        tag,
      );

      expect(combined).toEqual(new Uint8Array([1, 2, 3, 7, 8, 9]));
    });
  });

  describe('splitEncryptedData', () => {
    it('should split combined data with auth tag', () => {
      const originalIv = crypto.getRandomValues(new Uint8Array(ECIES.IV_SIZE));
      const originalEncrypted = new Uint8Array([1, 2, 3, 4, 5]);
      const originalTag = crypto.getRandomValues(
        new Uint8Array(ECIES.AUTH_TAG_SIZE),
      );

      const combined = AESGCMService.combineIvTagAndEncryptedData(
        originalIv,
        originalEncrypted,
        originalTag,
      );
      const { iv, encryptedDataWithTag } = AESGCMService.splitEncryptedData(
        combined,
        true,
      );

      expect(iv).toEqual(originalIv);
      expect(encryptedDataWithTag).toEqual(
        AESGCMService.combineEncryptedDataAndTag(
          originalEncrypted,
          originalTag,
        ),
      );
    });

    it('should split combined data without auth tag', () => {
      const originalIv = crypto.getRandomValues(new Uint8Array(ECIES.IV_SIZE));
      const originalEncrypted = new Uint8Array([1, 2, 3, 4, 5]);

      const combined = AESGCMService.combineIvAndEncryptedData(
        originalIv,
        originalEncrypted,
      );
      const { iv, encryptedDataWithTag } = AESGCMService.splitEncryptedData(
        combined,
        false,
      );

      expect(iv).toEqual(originalIv);
      expect(encryptedDataWithTag).toEqual(originalEncrypted);
    });

    it('should handle empty encrypted data with auth tag', () => {
      const originalIv = crypto.getRandomValues(new Uint8Array(ECIES.IV_SIZE));
      const originalEncrypted = new Uint8Array(0);
      const originalTag = crypto.getRandomValues(
        new Uint8Array(ECIES.AUTH_TAG_SIZE),
      );

      const combined = AESGCMService.combineIvTagAndEncryptedData(
        originalIv,
        originalEncrypted,
        originalTag,
      );
      const { iv, encryptedDataWithTag } = AESGCMService.splitEncryptedData(
        combined,
        true,
      );

      expect(iv).toEqual(originalIv);
      expect(encryptedDataWithTag).toEqual(originalTag); // Only tag since encrypted data is empty
    });

    it('should throw error for data too short', () => {
      const tooShort = new Uint8Array(10); // Less than IV length (16)

      expect(() => {
        AESGCMService.splitEncryptedData(tooShort, true);
      }).toThrow('Combined data is too short to contain required components');
    });

    it('should throw error for data too short with auth tag', () => {
      const tooShort = new Uint8Array(20); // Less than IV (16) + tag (16) = 32

      expect(() => {
        AESGCMService.splitEncryptedData(tooShort, true);
      }).toThrow('Combined data is too short to contain required components');
    });
  });

  describe('Integration tests', () => {
    it('should encrypt and decrypt large data', async () => {
      const largeData = crypto.getRandomValues(new Uint8Array(64 * 1024)); // 64KB

      const { encrypted, iv, tag } = await AESGCMService.encrypt(
        largeData,
        key256,
        true,
      );
      const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(
        encrypted,
        tag!,
      );
      const decrypted = await AESGCMService.decrypt(
        iv,
        encryptedWithTag,
        key256,
        true,
      );

      expect(decrypted).toEqual(largeData);
    });

    it('should work with combined data format', async () => {
      const { encrypted, iv, tag } = await AESGCMService.encrypt(
        testData,
        key256,
        true,
      );
      const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(
        encrypted,
        tag!,
      );
      const decrypted = await AESGCMService.decrypt(
        iv,
        encryptedWithTag,
        key256,
        true,
      );

      expect(decrypted).toEqual(testData);
    });

    it('should work with full combined format', async () => {
      const { encrypted, iv, tag } = await AESGCMService.encrypt(
        testData,
        key256,
        true,
      );
      const fullCombined = AESGCMService.combineIvTagAndEncryptedData(
        iv,
        encrypted,
        tag!,
      );

      // Extract components back using new split method
      const { iv: extractedIv, encryptedDataWithTag } =
        AESGCMService.splitEncryptedData(fullCombined, true);
      const decrypted = await AESGCMService.decrypt(
        extractedIv,
        encryptedDataWithTag,
        key256,
        true,
      );

      expect(decrypted).toEqual(testData);
    });

    it('should work with splitEncryptedData for data without auth tag', async () => {
      const { encrypted, iv } = await AESGCMService.encrypt(
        testData,
        key256,
        false,
      );
      const combined = AESGCMService.combineIvAndEncryptedData(iv, encrypted);

      // Split using new method
      const { iv: extractedIv, encryptedDataWithTag } =
        AESGCMService.splitEncryptedData(combined, false);
      const decrypted = await AESGCMService.decrypt(
        extractedIv,
        encryptedDataWithTag,
        key256,
        false,
      );

      expect(decrypted).toEqual(testData);
    });

    it('should maintain data integrity across multiple encrypt/decrypt cycles', async () => {
      let data = testData;

      for (let i = 0; i < 5; i++) {
        const { encrypted, iv, tag } = await AESGCMService.encrypt(
          data,
          key256,
          true,
        );
        const encryptedWithTag = AESGCMService.combineEncryptedDataAndTag(
          encrypted,
          tag!,
        );
        data = await AESGCMService.decrypt(iv, encryptedWithTag, key256, true);
      }

      expect(data).toEqual(testData);
    });

    it('should handle different key sizes correctly', async () => {
      const key192 = crypto.getRandomValues(new Uint8Array(24)); // 192-bit key

      const { encrypted, iv } = await AESGCMService.encrypt(
        testData,
        key192,
        false,
      );
      const decrypted = await AESGCMService.decrypt(
        iv,
        encrypted,
        key192,
        false,
      );

      expect(decrypted).toEqual(testData);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid key inputs', async () => {
      await expect(
        AESGCMService.encrypt(testData, null as any, false),
      ).rejects.toThrow();
    });

    it('should handle invalid IV length', async () => {
      const { encrypted } = await AESGCMService.encrypt(
        testData,
        key256,
        false,
      );
      const invalidIv = new Uint8Array(10); // Wrong length

      await expect(
        AESGCMService.decrypt(invalidIv, encrypted, key256, false),
      ).rejects.toThrow();
    });

    it('should handle invalid tag length', async () => {
      const { encrypted, iv } = await AESGCMService.encrypt(
        testData,
        key256,
        true,
      );
      const invalidTag = new Uint8Array(10); // Wrong length
      const encryptedWithInvalidTag = AESGCMService.combineEncryptedDataAndTag(
        encrypted,
        invalidTag,
      );

      await expect(
        AESGCMService.decrypt(iv, encryptedWithInvalidTag, key256, true),
      ).rejects.toThrow();
    });

    it('should handle multiple invalid key sizes', async () => {
      const invalidKeys = [
        new Uint8Array(15), // Too short
        new Uint8Array(17), // Invalid length
        new Uint8Array(23), // Invalid length
        new Uint8Array(31), // Too short for 256-bit
        new Uint8Array(33), // Too long
      ];

      for (const invalidKey of invalidKeys) {
        await expect(
          AESGCMService.encrypt(testData, invalidKey, false),
        ).rejects.toThrow();
      }
    });
  });
});
