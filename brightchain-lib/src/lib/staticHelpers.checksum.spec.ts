import { Readable } from 'stream';
import { StaticHelpersChecksum } from './staticHelpers.checksum';
import { ChecksumBuffer } from './types';

describe('brightchain staticHelpers.checksum', () => {
  describe('synchronous checksum', () => {
    const testData = Buffer.from('hello world');
    const differentData = Buffer.from('goodbye world');

    it('should generate consistent checksums for the same data', () => {
      const checksum1 = StaticHelpersChecksum.calculateChecksum(testData);
      const checksum2 = StaticHelpersChecksum.calculateChecksum(testData);

      expect(checksum1.length).toBe(
        StaticHelpersChecksum.Sha3ChecksumBufferLength,
      );
      expect(checksum1.equals(checksum2)).toBe(true);
      expect(StaticHelpersChecksum.validateChecksum(testData, checksum1)).toBe(
        true,
      );
    });

    it('should generate different checksums for different data', () => {
      const checksum1 = StaticHelpersChecksum.calculateChecksum(testData);
      const checksum2 = StaticHelpersChecksum.calculateChecksum(differentData);

      expect(checksum1.equals(checksum2)).toBe(false);
      expect(StaticHelpersChecksum.validateChecksum(testData, checksum2)).toBe(
        false,
      );
    });

    it('should handle empty buffer correctly', () => {
      const emptyBuffer = Buffer.from('');
      const checksum = StaticHelpersChecksum.calculateChecksum(emptyBuffer);

      expect(checksum.length).toBe(
        StaticHelpersChecksum.Sha3ChecksumBufferLength,
      );
      expect(
        StaticHelpersChecksum.validateChecksum(emptyBuffer, checksum),
      ).toBe(true);
    });

    it('should handle large data correctly', () => {
      const largeBuffer = Buffer.alloc(100 * 1024); // 100KB
      largeBuffer.fill('A');
      const checksum = StaticHelpersChecksum.calculateChecksum(largeBuffer);

      expect(checksum.length).toBe(
        StaticHelpersChecksum.Sha3ChecksumBufferLength,
      );
      expect(
        StaticHelpersChecksum.validateChecksum(largeBuffer, checksum),
      ).toBe(true);
    });

    it('should produce consistent results between sync and async methods for Buffer input', async () => {
      const syncChecksum = StaticHelpersChecksum.calculateChecksum(testData);
      const asyncChecksum =
        await StaticHelpersChecksum.calculateChecksumAsync(testData);

      expect(syncChecksum.equals(asyncChecksum)).toBe(true);
    });

    describe('checksum string conversion', () => {
      it('should correctly convert between buffer and string formats', () => {
        const originalChecksum =
          StaticHelpersChecksum.calculateChecksum(testData);
        const checksumString =
          StaticHelpersChecksum.checksumBufferToChecksumString(
            originalChecksum,
          );
        const backToBuffer =
          StaticHelpersChecksum.checksumStringToChecksumBuffer(checksumString);

        expect(originalChecksum.equals(backToBuffer)).toBe(true);
      });

      it('should maintain correct length after conversion', () => {
        const checksum = StaticHelpersChecksum.calculateChecksum(testData);
        const checksumString =
          StaticHelpersChecksum.checksumBufferToChecksumString(checksum);

        // Each byte becomes two hex characters
        expect(checksumString.length).toBe(
          StaticHelpersChecksum.Sha3ChecksumBufferLength * 2,
        );
      });
    });

    describe('validation', () => {
      it('should detect tampered data', () => {
        const originalChecksum =
          StaticHelpersChecksum.calculateChecksum(testData);
        const tamperedData = Buffer.from(testData);
        tamperedData[0] = tamperedData[0] + 1;

        expect(
          StaticHelpersChecksum.validateChecksum(
            tamperedData,
            originalChecksum,
          ),
        ).toBe(false);
      });

      it('should detect tampered checksums', () => {
        const originalChecksum =
          StaticHelpersChecksum.calculateChecksum(testData);
        const tamperedChecksum = Buffer.from(originalChecksum);
        tamperedChecksum[0] = tamperedChecksum[0] + 1;

        expect(
          StaticHelpersChecksum.validateChecksum(
            testData,
            tamperedChecksum as ChecksumBuffer,
          ),
        ).toBe(false);
      });
    });
  });

  describe('async checksum methods', () => {
    const testData = Buffer.from('hello world');
    const differentData = Buffer.from('goodbye world');

    // Helper function to create a readable stream from a buffer
    function bufferToStream(buffer: Buffer): Readable {
      return Readable.from(buffer);
    }

    it('should generate the same checksum for the same data using Buffer', async () => {
      const checksum =
        await StaticHelpersChecksum.calculateChecksumAsync(testData);
      expect(checksum.length).toBe(
        StaticHelpersChecksum.Sha3ChecksumBufferLength,
      );
      const isValid = await StaticHelpersChecksum.validateChecksumAsync(
        testData,
        checksum,
      );
      expect(isValid).toBe(true);
    });

    it('should generate different checksums for different data using Buffer', async () => {
      const checksum1 =
        await StaticHelpersChecksum.calculateChecksumAsync(testData);
      const checksum2 =
        await StaticHelpersChecksum.calculateChecksumAsync(differentData);
      expect(checksum1.equals(checksum2)).toBe(false);
    });

    it('should generate the same checksum for the same data using Stream', async () => {
      const stream1 = bufferToStream(testData);
      const stream2 = bufferToStream(testData);
      const checksum =
        await StaticHelpersChecksum.calculateChecksumAsync(stream1);
      expect(checksum.length).toBe(
        StaticHelpersChecksum.Sha3ChecksumBufferLength,
      );
      const isValid = await StaticHelpersChecksum.validateChecksumAsync(
        stream2,
        checksum,
      );
      expect(isValid).toBe(true);
    });

    it('should generate different checksums for different data using Stream', async () => {
      const stream1 = bufferToStream(testData);
      const stream2 = bufferToStream(differentData);
      const checksum1 =
        await StaticHelpersChecksum.calculateChecksumAsync(stream1);
      const checksum2 =
        await StaticHelpersChecksum.calculateChecksumAsync(stream2);
      expect(checksum1.equals(checksum2)).toBe(false);
    });

    it('should generate the same checksum regardless of input type (Buffer vs Stream)', async () => {
      const bufferChecksum =
        await StaticHelpersChecksum.calculateChecksumAsync(testData);
      const streamChecksum = await StaticHelpersChecksum.calculateChecksumAsync(
        bufferToStream(testData),
      );
      expect(bufferChecksum.equals(streamChecksum)).toBe(true);
    });

    it('should handle empty input correctly', async () => {
      const emptyBuffer = Buffer.from('');
      const emptyStream = bufferToStream(Buffer.from(''));

      const bufferChecksum =
        await StaticHelpersChecksum.calculateChecksumAsync(emptyBuffer);
      const streamChecksum =
        await StaticHelpersChecksum.calculateChecksumAsync(emptyStream);

      expect(bufferChecksum.length).toBe(
        StaticHelpersChecksum.Sha3ChecksumBufferLength,
      );
      expect(bufferChecksum.equals(streamChecksum)).toBe(true);
    });

    it('should handle large data in chunks', async () => {
      // Create a large buffer (larger than the 64KB chunk size)
      const largeBuffer = Buffer.alloc(100 * 1024); // 100KB
      largeBuffer.fill('A');

      const bufferChecksum =
        await StaticHelpersChecksum.calculateChecksumAsync(largeBuffer);
      const streamChecksum = await StaticHelpersChecksum.calculateChecksumAsync(
        bufferToStream(largeBuffer),
      );

      expect(bufferChecksum.equals(streamChecksum)).toBe(true);
    });

    it('should reject on stream error', async () => {
      const errorStream = new Readable({
        read() {
          this.emit('error', new Error('Test error'));
        },
      });

      await expect(
        StaticHelpersChecksum.calculateChecksumAsync(errorStream),
      ).rejects.toThrow('Test error');
    });
  });
});
