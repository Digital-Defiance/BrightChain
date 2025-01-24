import { randomBytes } from 'crypto';
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

    it('should handle value dropping and validation', () => {
      // Test value dropping
      const tempBuffer = new SecureBuffer(testBuffer);
      tempBuffer.dropEncryptedValue();
      expect(() => tempBuffer.value).toThrow();

      // Test checksum validation
      const validBuffer = new SecureBuffer(testBuffer);
      expect(validBuffer.value).toEqual(testBuffer);

      validBuffer.dropEncryptedValue();
      expect(() => validBuffer.value).toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle invalid operations gracefully', () => {
      // Test accessing dropped value
      const droppedBuffer = new SecureBuffer(testBuffer);
      droppedBuffer.dropEncryptedValue();
      expect(() => droppedBuffer.value).toThrow();
      expect(() => droppedBuffer.valueAsString).toThrow();
      expect(() => droppedBuffer.valueAsHexString).toThrow();
      expect(() => droppedBuffer.valueAsBase64String).toThrow();
    });
  });
});
