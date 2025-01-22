import { randomBytes } from 'crypto';
import { SecureBuffer } from './secureBuffer';

describe('SecureBuffer', () => {
  describe('constructor', () => {
    it('should handle empty buffer', () => {
      const secureBuffer = new SecureBuffer();
      expect(secureBuffer.originalLength).toBe(0);
      expect(secureBuffer.value.length).toBe(0);
    });

    it('should encrypt non-empty buffer', () => {
      const testData = randomBytes(128);
      const secureBuffer = new SecureBuffer(testData);
      expect(secureBuffer.originalLength).toBe(testData.length);
      expect(secureBuffer.value).toEqual(testData);
    });
  });

  describe('fromString', () => {
    it('should create SecureBuffer from string', () => {
      const testString = 'Test String';
      const secureBuffer = SecureBuffer.fromString(testString);
      expect(secureBuffer.originalLength).toBe(testString.length);
      expect(secureBuffer.valueAsString).toBe(testString);
    });
  });

  describe('value getters', () => {
    const testData = randomBytes(128);
    const secureBuffer = new SecureBuffer(testData);

    it('should return correct value as Buffer', () => {
      expect(secureBuffer.value).toEqual(testData);
    });

    it('should return correct value as String', () => {
      const secureBufferFromString = SecureBuffer.fromString(
        testData.toString(),
      );
      expect(secureBufferFromString.valueAsString).toBe(testData.toString());
    });

    it('should return correct value as Hex String', () => {
      expect(secureBuffer.valueAsHexString).toBe(testData.toString('hex'));
    });

    it('should return correct value as Base64 String', () => {
      expect(secureBuffer.valueAsBase64String).toBe(
        testData.toString('base64'),
      );
    });
  });

  describe('dropEncryptedValue', () => {
    it('should clear the encrypted value', () => {
      const testData = randomBytes(128);
      const secureBuffer = new SecureBuffer(testData);
      secureBuffer.dropEncryptedValue();
      expect(() => secureBuffer.value).toThrow();
    });
  });

  describe('checksum validation', () => {
    it('should validate checksum correctly', () => {
      const testData = randomBytes(128);
      const secureBuffer = new SecureBuffer(testData);
      expect(secureBuffer.value).toEqual(testData);
    });

    it('should throw error for tampered data', () => {
      const testData = randomBytes(128);
      const secureBuffer = new SecureBuffer(testData);
      secureBuffer.dropEncryptedValue();
      expect(() => secureBuffer.value).toThrow();
    });
  });
});
