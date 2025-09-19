import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { SecureStorageError } from './errors/secureStorage';
import { SecureBuffer } from './secureBuffer';
import { uint8ArrayToHex } from './utils';

describe('SecureBuffer', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  let testBuffer: Uint8Array;
  let testString: string;
  let secureBuffer: SecureBuffer;
  let secureBufferFromString: SecureBuffer;

  beforeAll(() => {
    // Create test data once for all tests (32 bytes is sufficient for testing)
    testBuffer = new Uint8Array(randomBytes(32));
    // Use TextEncoder to get correct byte length for Unicode strings
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
      // Use TextEncoder to get correct byte length for Unicode strings
      const expectedLength = new TextEncoder().encode(testString).length;
      expect(secureBufferFromString.originalLength).toBe(expectedLength);
      expect(secureBufferFromString.valueAsString).toBe(testString);
    });

    it('should handle empty Uint8Array', () => {
      const emptySerializable = new Uint8Array(0);
      const secureBuffer = new SecureBuffer(emptySerializable);
      expect(secureBuffer.originalLength).toBe(0);
      expect(secureBuffer.value.length).toBe(0);
    });

    it('should handle Uint8Array with Unicode content', () => {
      const unicodeString = '🚀 世界';
      const testBuffer = new TextEncoder().encode(unicodeString);
      const secureBuffer = new SecureBuffer(testBuffer);
      expect(secureBuffer.valueAsString).toEqual(unicodeString);
    });
  });

  describe('value access and encoding', () => {
    it('should provide correct values in different formats', () => {
      // Uint8Array format
      expect(secureBuffer.value).toEqual(testBuffer);

      // String formats
      expect(secureBufferFromString.valueAsString).toBe(testString);
      expect(secureBuffer.valueAsHexString).toBe(uint8ArrayToHex(testBuffer));
      expect(secureBuffer.valueAsBase64String).toBe(
        btoa(String.fromCharCode(...testBuffer)),
      );
    });

    it('should generate consistent checksums for Uint8Array', () => {
      const testBuffer = new Uint8Array(randomBytes(32));
      const secureBuffer1 = new SecureBuffer(testBuffer);
      const secureBuffer2 = new SecureBuffer(testBuffer);
      expect(secureBuffer1.checksum).toEqual(secureBuffer2.checksum);
    });
  });

  describe('error handling', () => {
    it('should throw DecryptedValueLengthMismatch when deobfuscated length is incorrect', () => {
      const testBuffer = new TextEncoder().encode(faker.lorem.word());
      const secureBuffer = new SecureBuffer(testBuffer);

      // Tamper with the length property
      Object.defineProperty(secureBuffer, '_length', {
        value: testBuffer.length + 1,
        writable: true,
      });

      expect(() => secureBuffer.value).toThrow(SecureStorageError);
      try {
        secureBuffer.value;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueLengthMismatch,
        );
      }
    });

    it('should throw DecryptedValueChecksumMismatch when checksum validation fails', () => {
      const testBuffer = new TextEncoder().encode(faker.lorem.word());
      const secureBuffer = new SecureBuffer(testBuffer);

      // Modify a single byte in the middle of the obfuscated data to corrupt it
      const originalBuffer = Reflect.get(
        secureBuffer,
        '_obfuscatedValue',
      ) as Uint8Array;
      const corruptedBuffer = new Uint8Array(originalBuffer);
      const middleIndex = Math.floor(corruptedBuffer.length / 2);
      corruptedBuffer[middleIndex] ^= 0xff; // Flip bits in one byte

      // Replace the private field
      Object.defineProperty(secureBuffer, '_obfuscatedValue', {
        value: corruptedBuffer,
        writable: false,
        configurable: true,
      });

      expect(() => secureBuffer.value).toThrow(SecureStorageError);
      try {
        secureBuffer.value;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueChecksumMismatch,
        );
      }
    });

    it('should handle error cases', () => {
      const testSerializable = new Uint8Array(randomBytes(32));
      const secureBuffer = new SecureBuffer(testSerializable);

      // Modify a single byte in the middle of the obfuscated data to corrupt it
      const originalBuffer = Reflect.get(
        secureBuffer,
        '_obfuscatedValue',
      ) as Uint8Array;
      const corruptedBuffer = new Uint8Array(originalBuffer);
      const middleIndex = Math.floor(corruptedBuffer.length / 2);
      corruptedBuffer[middleIndex] ^= 0xff; // Flip bits in one byte

      // Replace the private field
      Object.defineProperty(secureBuffer, '_obfuscatedValue', {
        value: corruptedBuffer,
        writable: false,
        configurable: true,
      });

      expect(() => secureBuffer.value).toThrow(SecureStorageError);
      try {
        secureBuffer.value;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueChecksumMismatch,
        );
      }
    });
  });
});
