import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
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

  describe('Buffer operations', () => {
    it('should handle Buffer input', () => {
      const testBuffer = Buffer.from('test data');
      const secureString = new SecureString(testBuffer);
      expect(secureString.value).toEqual(testBuffer.toString());
    });

    it('should correctly encrypt and decrypt Buffer', () => {
      const testBuffer = randomBytes(32);
      const secureString = new SecureString(testBuffer);
      expect(secureString.valueAsBuffer).toEqual(testBuffer);
    });

    it('should generate consistent checksums for Buffer', () => {
      const testBuffer = randomBytes(32);
      const secureString1 = new SecureString(testBuffer);
      const secureString2 = new SecureString(testBuffer);
      expect(secureString1.checksum).toEqual(secureString2.checksum);
    });

    it('should handle Buffer with different underlying types', () => {
      const testString = 'test data';
      const stringSecure = new SecureString(testString);
      const bufferSecure = new SecureString(Buffer.from(testString));
      expect(stringSecure.value).toEqual(bufferSecure.value);
      expect(stringSecure.checksum).toEqual(bufferSecure.checksum);
    });

    it('should handle empty Buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      const secureString = new SecureString(emptyBuffer);
      expect(secureString.value).toBeNull();
    });

    it('should handle Buffer with Unicode content', () => {
      const unicodeString = '🚀 世界';
      const testBuffer = Buffer.from(unicodeString);
      const secureString = new SecureString(testBuffer);
      expect(secureString.value).toEqual(unicodeString);
    });

    it('should handle Buffer checksum validation', () => {
      const testBuffer = randomBytes(32);
      const secureString = new SecureString(testBuffer);

      // Modify a single byte in the middle of the encrypted data to corrupt it
      const originalBuffer = Reflect.get(
        secureString,
        '_encryptedValue',
      ) as Buffer;
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
          expect(error.type).toBe(
            SecureStorageErrorType.DecryptedValueChecksumMismatch,
          );
        },
      );
    });
    it('should generate consistent checksums', () => {
      const testString = randomBytes(32).toString('hex');
      const secureString1 = new SecureString(testString);
      const secureString2 = new SecureString(testString);
      expect(secureString1.checksum).toEqual(secureString2.checksum);
    });
  });

  describe('error handling', () => {
    it('should throw DecryptedValueChecksumMismatch when encrypted data is corrupted', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);

      // Create a corrupted buffer with valid encryption format but wrong length
      const originalBuffer = Reflect.get(
        secureString,
        '_encryptedValue',
      ) as Buffer;
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
          expect(error.type).toBe(
            SecureStorageErrorType.DecryptedValueChecksumMismatch,
          );
        },
      );
    });

    it('should throw DecryptedValueChecksumMismatch when checksum validation fails', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);

      // Modify a single byte in the middle of the encrypted data to corrupt it
      const originalBuffer = Reflect.get(
        secureString,
        '_encryptedValue',
      ) as Buffer;
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
          expect(error.type).toBe(
            SecureStorageErrorType.DecryptedValueChecksumMismatch,
          );
        },
      );
    });
  });
});
