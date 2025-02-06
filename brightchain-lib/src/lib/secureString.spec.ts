import { faker } from '@faker-js/faker';
import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { SecureStorageError } from './errors/secureStorageError';
import { SecureString } from './secureString';

describe('SecureString', () => {
  describe('constructor', () => {
    it('should handle null input', () => {
      const secureString = new SecureString(null);
      expect(secureString.value).toBeNull();
    });

    it('should handle undefined input', () => {
      const secureString = new SecureString(undefined);
      expect(secureString.value).toBeNull();
    });

    it('should encrypt non-null input', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);
      expect(secureString.value).toEqual(testString);
    });
  });

  describe('getters', () => {
    let testString: string;
    let secureString: SecureString;

    beforeEach(() => {
      testString = faker.lorem.word();
      secureString = new SecureString(testString);
    });

    it('should return the correct id', () => {
      expect(secureString.id).toBeDefined();
    });

    it('should return the correct original length', () => {
      expect(secureString.originalLength).toBe(testString.length);
    });

    it('should return the correct value as buffer', () => {
      expect(secureString.valueAsBuffer.toString()).toBe(testString);
    });

    it('should return the correct value as hex string', () => {
      expect(secureString.valueAsHexString).toBe(
        Buffer.from(testString).toString('hex'),
      );
    });

    it('should return the correct value as base64 string', () => {
      expect(secureString.valueAsBase64String).toBe(
        Buffer.from(testString).toString('base64'),
      );
    });
  });

  describe('dropEncryptedValue', () => {
    it('should clear the encrypted value', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);
      secureString.dropEncryptedValue();
      expect(() => secureString.value).toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw DecryptedValueLengthMismatch when decrypted length is incorrect', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);

      // Create a corrupted buffer with valid encryption format but wrong length
      const originalBuffer = (secureString as any)._encryptedValue;
      const corruptedBuffer = Buffer.concat([
        originalBuffer,
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
      ]);

      // Replace the private field
      Object.defineProperty(secureString, '_encryptedValue', {
        value: corruptedBuffer,
        writable: false,
        configurable: true,
      });

      expect(() => secureString.value).toThrowType(
        SecureStorageError,
        (error: SecureStorageError) => {
          expect(error.reason).toBe(
            SecureStorageErrorType.DecryptedValueLengthMismatch,
          );
        },
      );
    });

    it('should throw DecryptedValueChecksumMismatch when checksum validation fails', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);

      // Modify a single byte in the middle of the encrypted data to corrupt it
      const originalBuffer = (secureString as any)._encryptedValue;
      const corruptedBuffer = Buffer.from(originalBuffer);
      const middleIndex = Math.floor(corruptedBuffer.length / 2);
      corruptedBuffer[middleIndex] ^= 0xff; // Flip bits in one byte

      // Replace the private field
      Object.defineProperty(secureString, '_encryptedValue', {
        value: corruptedBuffer,
        writable: false,
        configurable: true,
      });

      expect(() => secureString.valueAsBuffer).toThrowType(
        SecureStorageError,
        (error: SecureStorageError) => {
          expect(error.reason).toBe(
            SecureStorageErrorType.DecryptedValueChecksumMismatch,
          );
        },
      );
    });
  });
});
