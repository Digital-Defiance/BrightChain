/* eslint-disable @typescript-eslint/no-explicit-any */
import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { Readable } from '../browserStream';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';

describe('ChecksumService', () => {
  let checksumService: ChecksumService;

  // Helper function to create a web readable stream from a Uint8Array
  function uint8ArrayToStream(data: Uint8Array): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      }
    });
  }

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  describe('synchronous checksum', () => {
    const testData = new Uint8Array([
      104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]); // 'hello world'
    const differentData = new Uint8Array([
      103, 111, 111, 100, 98, 121, 101, 32, 119, 111, 114, 108, 100,
    ]); // 'goodbye world'

    it('should generate consistent checksums for the same data', () => {
      const checksum1 = checksumService.calculateChecksum(testData);
      const checksum2 = checksumService.calculateChecksum(testData);

      expect(checksum1.length).toBe(checksumService.checksumBufferLength);
      expect(
        arraysEqual(new Uint8Array(checksum1), new Uint8Array(checksum2)),
      ).toBe(true);
      expect(checksumService.compareChecksums(checksum1, checksum2)).toBe(true);
    });

    it('should generate different checksums for different data', () => {
      const checksum1 = checksumService.calculateChecksum(testData);
      const checksum2 = checksumService.calculateChecksum(differentData);

      expect(
        arraysEqual(new Uint8Array(checksum1), new Uint8Array(checksum2)),
      ).toBe(false);
      expect(checksumService.compareChecksums(checksum1, checksum2)).toBe(
        false,
      );
    });

    it('should handle empty buffer correctly', () => {
      const emptyData = new Uint8Array(0);
      const checksum = checksumService.calculateChecksum(emptyData);

      expect(checksum.length).toBe(checksumService.checksumBufferLength);
      expect(checksumService.validateChecksum(checksum)).toBe(true);
    });

    it('should handle large data correctly', () => {
      const largeData = new Uint8Array(100 * 1024); // 100KB
      largeData.fill(65); // Fill with 'A'
      const checksum = checksumService.calculateChecksum(largeData);

      expect(checksum.length).toBe(checksumService.checksumBufferLength);
      expect(checksumService.validateChecksum(checksum)).toBe(true);
    });

    it('should produce consistent results between sync and async methods for Uint8Array input', async () => {
      const syncChecksum = checksumService.calculateChecksum(testData);
      const asyncChecksum = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(testData),
      );

      expect(
        arraysEqual(
          new Uint8Array(syncChecksum),
          new Uint8Array(asyncChecksum),
        ),
      ).toBe(true);
    });

    describe('checksum string conversion', () => {
      it('should correctly convert between buffer and string formats', () => {
        const originalChecksum = checksumService.calculateChecksum(testData);
        const checksumString =
          checksumService.checksumToHexString(originalChecksum);
        const backToBuffer =
          checksumService.hexStringToChecksum(checksumString);

        expect(
          arraysEqual(
            new Uint8Array(originalChecksum),
            new Uint8Array(backToBuffer),
          ),
        ).toBe(true);
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
        const tamperedData = new Uint8Array(testData);
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
        // Create a copy of the checksum array and modify it
        const tamperedArray = new Uint8Array(originalChecksum);
        tamperedArray[0] = tamperedArray[0] + 1;
        const tamperedChecksum = tamperedArray as any;

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
    const testData = new Uint8Array([
      104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]); // 'hello world'
    const differentData = new Uint8Array([
      103, 111, 111, 100, 98, 121, 101, 32, 119, 111, 114, 108, 100,
    ]); // 'goodbye world'

    it('should generate the same checksum for the same data using Uint8Array', async () => {
      const checksum = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(testData),
      );
      expect(checksum.length).toBe(checksumService.checksumBufferLength);
      const checksum2 = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(testData),
      );
      expect(checksumService.compareChecksums(checksum, checksum2)).toBe(true);
    });

    it('should generate different checksums for different data using Uint8Array', async () => {
      const checksum1 = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(testData),
      );
      const checksum2 = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(differentData),
      );
      expect(
        arraysEqual(new Uint8Array(checksum1), new Uint8Array(checksum2)),
      ).toBe(false);
    });

    it('should generate the same checksum for the same data using Stream', async () => {
      const stream1 = uint8ArrayToStream(testData);
      const stream2 = uint8ArrayToStream(testData);
      const checksum =
        await checksumService.calculateChecksumForStream(stream1);
      expect(checksum.length).toBe(checksumService.checksumBufferLength);
      const checksum2 =
        await checksumService.calculateChecksumForStream(stream2);
      expect(checksumService.compareChecksums(checksum, checksum2)).toBe(true);
    });

    it('should generate different checksums for different data using Stream', async () => {
      const stream1 = uint8ArrayToStream(testData);
      const stream2 = uint8ArrayToStream(differentData);
      const checksum1 =
        await checksumService.calculateChecksumForStream(stream1);
      const checksum2 =
        await checksumService.calculateChecksumForStream(stream2);
      expect(
        arraysEqual(new Uint8Array(checksum1), new Uint8Array(checksum2)),
      ).toBe(false);
    });

    it('should generate the same checksum regardless of input type (Uint8Array vs Stream)', async () => {
      const arrayChecksum = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(testData),
      );
      const streamChecksum = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(testData),
      );
      expect(
        arraysEqual(
          new Uint8Array(arrayChecksum),
          new Uint8Array(streamChecksum),
        ),
      ).toBe(true);
    });

    it('should handle empty input correctly', async () => {
      const emptyData = new Uint8Array(0);
      const emptyStream = uint8ArrayToStream(new Uint8Array(0));

      const arrayChecksum = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(emptyData),
      );
      const streamChecksum = await checksumService.calculateChecksumForStream(
        emptyStream as any,
      );

      expect(arrayChecksum.length).toBe(checksumService.checksumBufferLength);
      expect(
        arraysEqual(
          new Uint8Array(arrayChecksum),
          new Uint8Array(streamChecksum),
        ),
      ).toBe(true);
    });

    it('should handle large data in chunks', async () => {
      // Create a large array (larger than the 64KB chunk size)
      const largeData = new Uint8Array(100 * 1024); // 100KB
      largeData.fill(65); // Fill with 'A'

      const arrayChecksum = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(largeData),
      );
      const streamChecksum = await checksumService.calculateChecksumForStream(
        uint8ArrayToStream(largeData),
      );

      expect(
        arraysEqual(
          new Uint8Array(arrayChecksum),
          new Uint8Array(streamChecksum),
        ),
      ).toBe(true);
    });

    it('should reject on stream error', async () => {
      const errorStream = new ReadableStream({
        start(controller) {
          controller.error(new Error('Test error'));
        }
      });

      await expect(
        checksumService.calculateChecksumForStream(errorStream),
      ).rejects.toThrow('Test error');
    });
  });
});
