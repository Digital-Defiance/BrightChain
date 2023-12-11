import { faker } from '@faker-js/faker';
import { SecureString } from "./secureString";

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
      expect(secureString.valueAsHexString).toBe(Buffer.from(testString).toString('hex'));
    });

    it('should return the correct value as base64 string', () => {
      expect(secureString.valueAsBase64String).toBe(Buffer.from(testString).toString('base64'));
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

  describe('checksum validation', () => {
    it('should validate checksum correctly', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);
      expect(secureString.value).toBe(testString);
    });

    it('should throw error for tampered data', () => {
      const testString = faker.lorem.word();
      const secureString = new SecureString(testString);
      secureString.dropEncryptedValue();
      expect(() => secureString.value).toThrow();
    });
  });
});
