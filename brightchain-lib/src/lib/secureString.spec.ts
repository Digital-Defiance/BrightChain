import { faker } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import { SecureStorageErrorType } from './enumerations/secureStorageErrorType';
import { DisposedError } from './errors/disposed';
import { SecureStorageError } from './errors/secureStorage';
import { SecureString } from './secureString';
import { uint8ArrayToHex } from './utils';

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
      expect(new TextDecoder().decode(secureString.valueAsBuffer)).toBe(
        testString,
      );
    });

    it('should return the correct value as hex string', () => {
      expect(secureString.valueAsHexString).toBe(
        uint8ArrayToHex(new TextEncoder().encode(testString)),
      );
    });

    it('should return the correct value as base64 string', () => {
      const expectedBase64 = btoa(testString);
      expect(secureString.valueAsBase64String).toBe(expectedBase64);
    });
  });

  describe('dropEncryptedValue', () => {
    it('should clear the obfuscated value', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);
      secureString.dispose();
      expect(() => secureString.value).toThrow(DisposedError);
    });
  });

  describe('Uint8Array operations', () => {
    it('should handle Uint8Array input', () => {
      const testData = 'test data';
      const testArray = new TextEncoder().encode(testData);
      const secureString = new SecureString(testArray);
      expect(secureString.value).toEqual(testData);
    });

    it('should correctly obfuscate and deobfuscate Uint8Array', () => {
      const testArray = new Uint8Array(randomBytes(32));
      const secureString = new SecureString(testArray);
      expect(secureString.valueAsBuffer).toEqual(testArray);
    });

    it('should generate consistent checksums for Uint8Array', () => {
      const testArray = new Uint8Array(randomBytes(32));
      const secureString1 = new SecureString(testArray);
      const secureString2 = new SecureString(testArray);
      expect(secureString1.checksum).toEqual(secureString2.checksum);
    });

    it('should handle Uint8Array with different underlying types', () => {
      const testString = 'test data';
      const stringSecure = new SecureString(testString);
      const arraySecure = new SecureString(
        new TextEncoder().encode(testString),
      );
      expect(stringSecure.value).toEqual(arraySecure.value);
      expect(stringSecure.checksum).toEqual(arraySecure.checksum);
    });

    it('should handle empty Uint8Array', () => {
      const emptyArray = new Uint8Array(0);
      const secureString = new SecureString(emptyArray);
      expect(secureString.value).toBe('');
    });

    it('should handle Uint8Array with Unicode content', () => {
      const unicodeString = '🚀 世界';
      const testArray = new TextEncoder().encode(unicodeString);
      const secureString = new SecureString(testArray);
      expect(secureString.value).toEqual(unicodeString);
    });

    it('should handle Uint8Array checksum validation', () => {
      const testArray = new Uint8Array(randomBytes(32));
      const secureString = new SecureString(testArray);

      // Modify a single byte in the middle of the obfuscated data to corrupt it
      const originalArray = Reflect.get(
        secureString,
        '_obfuscatedValue',
      ) as Uint8Array;
      const corruptedArray = new Uint8Array(originalArray);
      const middleIndex = Math.floor(corruptedArray.length / 2);
      corruptedArray[middleIndex] ^= 0xff; // Flip bits in one byte

      // Replace the private field
      Object.defineProperty(secureString, '_obfuscatedValue', {
        value: corruptedArray,
        writable: false,
        configurable: true,
      });

      expect(() => secureString.valueAsBuffer).toThrow(SecureStorageError);
      try {
        secureString.valueAsBuffer;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueChecksumMismatch,
        );
      }
    });
    it('should generate consistent checksums', () => {
      const testString = randomBytes(32).toString('hex');
      const secureString1 = new SecureString(testString);
      const secureString2 = new SecureString(testString);
      // Checksum of the data should be the same, even if the key is different.
      const checksum1 = secureString1.checksum;
      const checksum2 = secureString2.checksum;
      expect(checksum1).toEqual(checksum2);
    });
  });

  describe('error handling', () => {
    it('should throw DecryptedValueLengthMismatch when deobfuscated length is incorrect', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);

      // Tamper with the length property
      Object.defineProperty(secureString, '_length', {
        value: testString.length + 1,
        writable: true,
      });

      expect(() => secureString.value).toThrow(SecureStorageError);
      try {
        secureString.value;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueLengthMismatch,
        );
      }
    });

    it('should throw DecryptedValueChecksumMismatch when checksum validation fails', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);

      // Modify a single byte in the middle of the obfuscated data to corrupt it
      const originalArray = Reflect.get(
        secureString,
        '_obfuscatedValue',
      ) as Uint8Array;
      const corruptedArray = new Uint8Array(originalArray);
      const middleIndex = Math.floor(corruptedArray.length / 2);
      corruptedArray[middleIndex] ^= 0xff; // Flip bits in one byte

      // Replace the private field
      Object.defineProperty(secureString, '_obfuscatedValue', {
        value: corruptedArray,
        writable: false,
        configurable: true,
      });

      expect(() => secureString.valueAsBuffer).toThrow(SecureStorageError);
      try {
        secureString.valueAsBuffer;
      } catch (e) {
        const error = e as SecureStorageError;
        expect(error.type).toBe(
          SecureStorageErrorType.DecryptedValueChecksumMismatch,
        );
      }
    });
  });
});
