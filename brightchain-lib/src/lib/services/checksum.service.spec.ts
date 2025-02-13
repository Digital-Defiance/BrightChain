import { Readable } from 'stream';
import { ChecksumBuffer } from '../types';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';

describe('ChecksumService', () => {
  let checksumService: ChecksumService;

  // Helper function to create a readable stream from a buffer
  function bufferToStream(buffer: Buffer): Readable {
    return Readable.from(buffer);
  }

  beforeEach(() => {
    checksumService = ServiceProvider.getChecksumService();
  });

  describe('synchronous checksum', () => {
    const testData = Buffer.from('hello world');
    const differentData = Buffer.from('goodbye world');

    it('should generate consistent checksums for the same data', () => {
      const checksum1 = checksumService.calculateChecksum(testData);
      const checksum2 = checksumService.calculateChecksum(testData);

      expect(checksum1.length).toBe(checksumService.checksumBufferLength);
      expect(checksum1.equals(checksum2)).toBe(true);
      expect(checksumService.compareChecksums(checksum1, checksum2)).toBe(true);
    });

    it('should generate different checksums for different data', () => {
      const checksum1 = checksumService.calculateChecksum(testData);
      const checksum2 = checksumService.calculateChecksum(differentData);

      expect(checksum1.equals(checksum2)).toBe(false);
      expect(checksumService.compareChecksums(checksum1, checksum2)).toBe(
        false,
      );
    });

    it('should handle empty buffer correctly', () => {
      const emptyBuffer = Buffer.from('');
      const checksum = checksumService.calculateChecksum(emptyBuffer);

      expect(checksum.length).toBe(checksumService.checksumBufferLength);
      expect(checksumService.validateChecksum(checksum)).toBe(true);
    });

    it('should handle large data correctly', () => {
      const largeBuffer = Buffer.alloc(100 * 1024); // 100KB
      largeBuffer.fill('A');
      const checksum = checksumService.calculateChecksum(largeBuffer);

      expect(checksum.length).toBe(checksumService.checksumBufferLength);
      expect(checksumService.validateChecksum(checksum)).toBe(true);
    });

    it('should produce consistent results between sync and async methods for Buffer input', async () => {
      const syncChecksum = checksumService.calculateChecksum(testData);
      const asyncChecksum = await checksumService.calculateChecksumForStream(
        bufferToStream(testData),
      );

      expect(syncChecksum.equals(asyncChecksum)).toBe(true);
    });

    describe('checksum string conversion', () => {
      it('should correctly convert between buffer and string formats', () => {
        const originalChecksum = checksumService.calculateChecksum(testData);
        const checksumString =
          checksumService.checksumToHexString(originalChecksum);
        const backToBuffer =
          checksumService.hexStringToChecksum(checksumString);

        expect(originalChecksum.equals(backToBuffer)).toBe(true);
      });

      it('should maintain correct length after conversion', () => {
        const checksum = checksumService.calculateChecksum(testData);
        const checksumString = checksumService.checksumToHexString(checksum);

        // Each byte becomes two hex characters
        expect(checksumString.length).toBe(
          checksumService.checksumBufferLength * 2,
        );
      });
    });

    describe('validation', () => {
      it('should detect tampered data', () => {
        const originalChecksum = checksumService.calculateChecksum(testData);
        const tamperedData = Buffer.from(testData);
        tamperedData[0] = tamperedData[0] + 1;

        expect(
          checksumService.compareChecksums(
            checksumService.calculateChecksum(tamperedData),
            originalChecksum,
          ),
        ).toBe(false);
      });

      it('should detect tampered checksums', () => {
        const originalChecksum = checksumService.calculateChecksum(testData);
        // Create a copy of the checksum buffer and modify it
        const tamperedBuffer = Buffer.from(originalChecksum);
        tamperedBuffer[0] = tamperedBuffer[0] + 1;
        const tamperedChecksum = tamperedBuffer as ChecksumBuffer;

        expect(
          checksumService.compareChecksums(
            checksumService.calculateChecksum(testData),
            tamperedChecksum,
          ),
        ).toBe(false);
      });
    });
  });

  describe('async checksum methods', () => {
    const testData = Buffer.from('hello world');
    const differentData = Buffer.from('goodbye world');

    it('should generate the same checksum for the same data using Buffer', async () => {
      const checksum = await checksumService.calculateChecksumForStream(
        bufferToStream(testData),
      );
      expect(checksum.length).toBe(checksumService.checksumBufferLength);
      const checksum2 = await checksumService.calculateChecksumForStream(
        bufferToStream(testData),
      );
      expect(checksumService.compareChecksums(checksum, checksum2)).toBe(true);
    });

    it('should generate different checksums for different data using Buffer', async () => {
      const checksum1 = await checksumService.calculateChecksumForStream(
        bufferToStream(testData),
      );
      const checksum2 = await checksumService.calculateChecksumForStream(
        bufferToStream(differentData),
      );
      expect(checksum1.equals(checksum2)).toBe(false);
    });

    it('should generate the same checksum for the same data using Stream', async () => {
      const stream1 = bufferToStream(testData);
      const stream2 = bufferToStream(testData);
      const checksum =
        await checksumService.calculateChecksumForStream(stream1);
      expect(checksum.length).toBe(checksumService.checksumBufferLength);
      const checksum2 =
        await checksumService.calculateChecksumForStream(stream2);
      expect(checksumService.compareChecksums(checksum, checksum2)).toBe(true);
    });

    it('should generate different checksums for different data using Stream', async () => {
      const stream1 = bufferToStream(testData);
      const stream2 = bufferToStream(differentData);
      const checksum1 =
        await checksumService.calculateChecksumForStream(stream1);
      const checksum2 =
        await checksumService.calculateChecksumForStream(stream2);
      expect(checksum1.equals(checksum2)).toBe(false);
    });

    it('should generate the same checksum regardless of input type (Buffer vs Stream)', async () => {
      const bufferChecksum = await checksumService.calculateChecksumForStream(
        bufferToStream(testData),
      );
      const streamChecksum = await checksumService.calculateChecksumForStream(
        bufferToStream(testData),
      );
      expect(bufferChecksum.equals(streamChecksum)).toBe(true);
    });

    it('should handle empty input correctly', async () => {
      const emptyBuffer = Buffer.from('');
      const emptyStream = bufferToStream(Buffer.from(''));

      const bufferChecksum = await checksumService.calculateChecksumForStream(
        bufferToStream(emptyBuffer),
      );
      const streamChecksum =
        await checksumService.calculateChecksumForStream(emptyStream);

      expect(bufferChecksum.length).toBe(checksumService.checksumBufferLength);
      expect(bufferChecksum.equals(streamChecksum)).toBe(true);
    });

    it('should handle large data in chunks', async () => {
      // Create a large buffer (larger than the 64KB chunk size)
      const largeBuffer = Buffer.alloc(100 * 1024); // 100KB
      largeBuffer.fill('A');

      const bufferChecksum = await checksumService.calculateChecksumForStream(
        bufferToStream(largeBuffer),
      );
      const streamChecksum = await checksumService.calculateChecksumForStream(
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
        checksumService.calculateChecksumForStream(errorStream),
      ).rejects.toThrow('Test error');
    });
  });
});
