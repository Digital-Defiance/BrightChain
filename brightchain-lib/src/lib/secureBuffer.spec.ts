import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { SecureStorageError } from './errors/secureStorageError';
import { SecureBuffer } from './secureBuffer';

describe('SecureBuffer', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  let testBuffer: Buffer;
  let testString: string;
  let secureBuffer: SecureBuffer;
  let secureBufferFromString: SecureBuffer;

  beforeAll(() => {
    // Create test data once for all tests (32 bytes is sufficient for testing)
    testBuffer = randomBytes(32);
    // Use Buffer.byteLength to get correct byte length for Unicode strings
    testString = 'Test String with Unicode 🚀 世界';
    secureBuffer = new SecureBuffer(testBuffer);
    secureBufferFromString = SecureBuffer.fromString(testString);
  });

  describe('initialization', () => {
    it('should handle empty and non-empty buffers', () => {
      // Empty buffer
      const emptyBuffer = new SecureBuffer();
      expect(emptyBuffer.originalLength).toBe(0);
      expect(emptyBuffer.value.length).toBe(0);

      // Non-empty buffer
      expect(secureBuffer.originalLength).toBe(testBuffer.length);
      expect(secureBuffer.value).toEqual(testBuffer);
    });

    it('should create SecureBuffer from string with correct encoding', () => {
      // Use Buffer.byteLength to get correct byte length for Unicode strings
      const expectedLength = Buffer.byteLength(testString, 'utf8');
      expect(secureBufferFromString.originalLength).toBe(expectedLength);
      expect(secureBufferFromString.valueAsString).toBe(testString);
    });
  });

  describe('value access and encoding', () => {
    it('should provide correct values in different formats', () => {
      // Buffer format
      expect(secureBuffer.value).toEqual(testBuffer);

      // String formats
      expect(secureBufferFromString.valueAsString).toBe(testString);
      expect(secureBuffer.valueAsHexString).toBe(testBuffer.toString('hex'));
      expect(secureBuffer.valueAsBase64String).toBe(
        testBuffer.toString('base64'),
      );
    });
  });

  describe('error handling', () => {
    it('should throw DecryptedValueLengthMismatch when decrypted length is incorrect', () => {
      const testBuffer = Buffer.from(faker.lorem.word());
      const secureBuffer = new SecureBuffer(testBuffer);

      // Create a corrupted buffer with valid encryption format but wrong length
      const originalBuffer = (secureBuffer as any)._encryptedValue;
      const corruptedBuffer = Buffer.concat([
        originalBuffer,
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
      ]);

      // Replace the private field
      Object.defineProperty(secureBuffer, '_encryptedValue', {
        value: corruptedBuffer,
        writable: false,
        configurable: true,
      });

      expect(() => secureBuffer.value).toThrowType(
        SecureStorageError,
        (error: SecureStorageError) => {
          expect(error.reason).toBe(
            SecureStorageErrorType.DecryptedValueLengthMismatch,
          );
        },
      );
    });

    it('should throw DecryptedValueChecksumMismatch when checksum validation fails', () => {
      const testBuffer = Buffer.from(faker.lorem.word());
      const secureBuffer = new SecureBuffer(testBuffer);

      // Modify a single byte in the middle of the encrypted data to corrupt it
      const originalBuffer = (secureBuffer as any)._encryptedValue;
      const corruptedBuffer = Buffer.from(originalBuffer);
      const middleIndex = Math.floor(corruptedBuffer.length / 2);
      corruptedBuffer[middleIndex] ^= 0xff; // Flip bits in one byte

      // Replace the private field
      Object.defineProperty(secureBuffer, '_encryptedValue', {
        value: corruptedBuffer,
        writable: false,
        configurable: true,
      });

      expect(() => secureBuffer.value).toThrowType(
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
