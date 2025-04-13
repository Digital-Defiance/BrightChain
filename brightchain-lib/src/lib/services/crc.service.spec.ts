import { crc16ccitt, crc32, crc8 } from 'crc';
import { Readable } from 'stream';
import { CrcService } from './crc.service';

describe('CrcService', () => {
  const testData = Buffer.from('This is some test data', 'utf8');
  const differentData = Buffer.from('This is also some more test data', 'utf8');
  let crcService: CrcService;
  beforeEach(() => {
    crcService = new CrcService();
  });

  // Helper function to create a readable stream from a buffer
  function bufferToStream(buffer: Buffer): Readable {
    return Readable.from(buffer);
  }

  describe('synchronous CRC', () => {
    describe('crc8', () => {
      it('should calculate CRC8 correctly', () => {
        const expectedCrc8 = Buffer.alloc(1);
        expectedCrc8.writeUInt8(crc8(testData)); // Use the 'crc' library directly for the expected value
        expect(crcService.crc8(testData)).toEqual(expectedCrc8);
      });
      it('should verify CRC8 correctly', () => {
        const crc8 = crcService.crc8(testData);
        expect(crcService.verifyCrc8(testData, crc8)).toBe(true);
        expect(crcService.verifyCrc8(testData, crc8.readUInt8())).toBe(true); // Test with number input
        const badCrc = Buffer.from([0x01]);
        expect(crcService.verifyCrc8(testData, badCrc)).toBe(false);
        expect(crcService.verifyCrc8(testData, 1)).toBe(false); // Test with incorrect number input
      });
      it('should handle empty buffer correctly', () => {
        const emptyBuffer = Buffer.from('');
        const crc = crcService.crc8(emptyBuffer);
        expect(crc.length).toBe(1);
        expect(crcService.verifyCrc8(emptyBuffer, crc)).toBe(true);
      });

      it('should generate consistent CRC8 for the same data', () => {
        const crc1 = crcService.crc8(testData);
        const crc2 = crcService.crc8(testData);
        expect(crc1).toEqual(crc2);
      });

      it('should generate different CRC8 for different data', () => {
        const crc1 = crcService.crc8(testData);
        const crc2 = crcService.crc8(differentData);
        expect(crc1).not.toEqual(crc2);
      });
    });
    describe('crc16', () => {
      it('should calculate CRC16 correctly', () => {
        const expectedCrc16 = Buffer.alloc(2);
        expectedCrc16.writeUInt16BE(crc16ccitt(testData)); // Use the 'crc' library directly for the expected value
        expect(crcService.crc16(testData)).toEqual(expectedCrc16);
      });
      it('should verify CRC16 correctly', () => {
        const crc16 = crcService.crc16(testData);
        expect(crcService.verifyCrc16(testData, crc16)).toBe(true);
        expect(crcService.verifyCrc16(testData, crc16.readUInt16BE())).toBe(
          true,
        ); // Test with number input
        const badCrc = Buffer.from([0x00, 0x01]);
        expect(crcService.verifyCrc16(testData, badCrc)).toBe(false);
        expect(crcService.verifyCrc16(testData, 1)).toBe(false); // Test with incorrect number input
      });
      it('should handle empty buffer correctly', () => {
        const emptyBuffer = Buffer.from('');
        const crc = crcService.crc16(emptyBuffer);
        expect(crc.length).toBe(2);
        expect(crcService.verifyCrc16(emptyBuffer, crc)).toBe(true);
      });

      it('should generate consistent CRC16 for the same data', () => {
        const crc1 = crcService.crc16(testData);
        const crc2 = crcService.crc16(testData);
        expect(crc1).toEqual(crc2);
      });

      it('should generate different CRC16 for different data', () => {
        const crc1 = crcService.crc16(testData);
        const crc2 = crcService.crc16(differentData);
        expect(crc1).not.toEqual(crc2);
      });
    });

    describe('crc32', () => {
      it('should calculate CRC32 correctly', () => {
        const expectedCrc32 = Buffer.alloc(4);
        expectedCrc32.writeUInt32BE(crc32(testData)); // Use the 'crc' library directly for the expected value
        expect(crcService.crc32(testData)).toEqual(expectedCrc32);
      });

      it('should verify CRC32 correctly', () => {
        const crc32 = crcService.crc32(testData);
        expect(crcService.verifyCrc32(testData, crc32)).toBe(true);
        expect(crcService.verifyCrc32(testData, crc32.readUInt32BE())).toBe(
          true,
        ); // Test with number input
        const badCrc = Buffer.from([0x00, 0x01, 0x02, 0x03]);
        expect(crcService.verifyCrc32(testData, badCrc)).toBe(false);
        expect(crcService.verifyCrc32(testData, 1)).toBe(false); // Test with incorrect number input
      });
      it('should generate consistent CRC32 for the same data', () => {
        const crc1 = crcService.crc32(testData);
        const crc2 = crcService.crc32(testData);

        expect(crc1).toEqual(crc2);
        expect(crcService.verifyCrc32(testData, crc1)).toBe(true);
      });

      it('should generate different CRC32 for different data', () => {
        const crc1 = crcService.crc32(testData);
        const crc2 = crcService.crc32(differentData);

        expect(crc1).not.toBe(crc2);
        expect(crcService.verifyCrc32(testData, crc2)).toBe(false);
      });

      it('should handle empty buffer correctly', () => {
        const emptyBuffer = Buffer.from('');
        const crc = crcService.crc32(emptyBuffer);

        expect(crc instanceof Buffer).toBe(true);
        expect(crcService.verifyCrc32(emptyBuffer, crc)).toBe(true);
      });
    });
  });
  describe('asynchronous CRC', () => {
    describe('crc8', () => {
      it('should generate consistent CRC8 for the same data using Buffer', async () => {
        const crc = await crcService.crc8Async(testData);
        const isValid = await crcService.verifyCrc8Async(testData, crc);
        expect(isValid).toBe(true);
      });

      it('should generate different CRC8 for different data using Buffer', async () => {
        const crc1 = await crcService.crc8Async(testData);
        const crc2 = await crcService.crc8Async(differentData);
        expect(crc1).not.toEqual(crc2);
      });

      it('should generate the same CRC8 for the same data using Stream', async () => {
        const stream1 = bufferToStream(testData);
        const stream2 = bufferToStream(testData);
        const crc = await crcService.crc8Async(stream1);
        const isValid = await crcService.verifyCrc8Async(stream2, crc);
        expect(isValid).toBe(true);
      });

      it('should handle empty input correctly', async () => {
        const emptyBuffer = Buffer.from('');
        const emptyStream = bufferToStream(Buffer.from(''));

        const bufferCrc = await crcService.crc8Async(emptyBuffer);
        const streamCrc = await crcService.crc8Async(emptyStream);

        expect(bufferCrc).toEqual(streamCrc);
      });

      it('should produce consistent results between sync and async methods for Buffer input', async () => {
        const syncCrc = crcService.crc8(testData);
        const asyncCrc = await crcService.crc8Async(testData);
        expect(syncCrc).toEqual(asyncCrc);
      });
      it('should handle large data in chunks', async () => {
        const largeBuffer = Buffer.alloc(100 * 1024); // 100KB
        largeBuffer.fill('A');

        const bufferCrc = await crcService.crc8Async(largeBuffer);
        const streamCrc = await crcService.crc8Async(
          bufferToStream(largeBuffer),
        );

        expect(bufferCrc).toEqual(streamCrc);
      });

      it('should reject on stream error', async () => {
        const errorStream = new Readable({
          read() {
            this.emit('error', new Error('Test error'));
          },
        });

        await expect(crcService.crc8Async(errorStream)).rejects.toThrow(
          'Test error',
        );
      });
    });
    describe('crc16', () => {
      it('should generate consistent CRC16 for the same data using Buffer', async () => {
        const crc = await crcService.crc16Async(testData);
        const isValid = await crcService.verifyCrc16Async(testData, crc);
        expect(isValid).toBe(true);
      });

      it('should generate different CRC16 for different data using Buffer', async () => {
        const crc1 = await crcService.crc16Async(testData);
        const crc2 = await crcService.crc16Async(differentData);
        expect(crc1).not.toEqual(crc2);
      });

      it('should generate the same CRC16 for the same data using Stream', async () => {
        const stream1 = bufferToStream(testData);
        const stream2 = bufferToStream(testData);
        const crc = await crcService.crc16Async(stream1);
        const isValid = await crcService.verifyCrc16Async(stream2, crc);
        expect(isValid).toBe(true);
      });

      it('should handle empty input correctly', async () => {
        const emptyBuffer = Buffer.from('');
        const emptyStream = bufferToStream(Buffer.from(''));

        const bufferCrc = await crcService.crc16Async(emptyBuffer);
        const streamCrc = await crcService.crc16Async(emptyStream);

        expect(bufferCrc).toEqual(streamCrc);
      });

      it('should handle large data in chunks', async () => {
        const largeBuffer = Buffer.alloc(100 * 1024); // 100KB
        largeBuffer.fill('A');

        const bufferCrc = await crcService.crc16Async(largeBuffer);
        const streamCrc = await crcService.crc16Async(
          bufferToStream(largeBuffer),
        );

        expect(bufferCrc).toEqual(streamCrc);
      });

      it('should reject on stream error', async () => {
        const errorStream = new Readable({
          read() {
            this.emit('error', new Error('Test error'));
          },
        });

        await expect(crcService.crc16Async(errorStream)).rejects.toThrow(
          'Test error',
        );
      });

      it('should produce consistent results between sync and async methods for Buffer input', async () => {
        const syncCrc = crcService.crc16(testData);
        const asyncCrc = await crcService.crc16Async(testData);
        expect(syncCrc).toEqual(asyncCrc);
      });
    });
    describe('crc32', () => {
      it('should generate consistent CRC32 for the same data using Buffer', async () => {
        const crc = await crcService.crc32Async(testData);
        const isValid = await crcService.verifyCrc32Async(testData, crc);
        expect(isValid).toBe(true);
      });

      it('should generate different CRC32 for different data using Buffer', async () => {
        const crc1 = await crcService.crc32Async(testData);
        const crc2 = await crcService.crc32Async(differentData);
        expect(crc1).not.toEqual(crc2);
      });

      it('should generate the same CRC32 for the same data using Stream', async () => {
        const stream1 = bufferToStream(testData);
        const stream2 = bufferToStream(testData);
        const crc = await crcService.crc32Async(stream1);
        const isValid = await crcService.verifyCrc32Async(stream2, crc);
        expect(isValid).toBe(true);
      });

      it('should handle empty input correctly', async () => {
        const emptyBuffer = Buffer.from('');
        const emptyStream = bufferToStream(emptyBuffer);
        const bufferCrc = await crcService.crc32Async(emptyBuffer);
        const streamCrc = await crcService.crc32Async(emptyStream);
        expect(bufferCrc.equals(streamCrc)).toBe(true); // Compare using .equals()
      });

      it('should handle large data in chunks', async () => {
        const largeBuffer = Buffer.alloc(100 * 1024); // 100KB
        largeBuffer.fill('A');

        const bufferCrc = crcService.crc32(largeBuffer); //Sync calculation
        const streamCrc = await crcService.crc32Async(
          bufferToStream(largeBuffer),
        );

        expect(bufferCrc.equals(streamCrc)).toBe(true); // Compare using .equals()
      });

      it('should reject on stream error', async () => {
        const errorStream = new Readable({
          read() {
            this.emit('error', new Error('Test error'));
          },
        });

        await expect(crcService.crc32Async(errorStream)).rejects.toThrow(
          'Test error',
        );
      });

      it('should produce consistent results between sync and async methods for Buffer input', async () => {
        const syncCrc = crcService.crc32(testData);
        const asyncCrc = await crcService.crc32Async(testData);

        expect(syncCrc).toEqual(asyncCrc);
      });
    });
  });
  describe('verify methods with number input', () => {
    it('should verify CRC8 with number input in async context', async () => {
      const crc = await crcService.crc8Async(testData);
      const numberValue = crc.readUInt8();
      expect(crcService.verifyCrc8(testData, numberValue)).toBe(true);
    });

    it('should verify CRC16 with number input in async context', async () => {
      const crc = await crcService.crc16Async(testData);
      const numberValue = crc.readUInt16BE();
      expect(crcService.verifyCrc16(testData, numberValue)).toBe(true);
    });

    it('should verify CRC32 with number input in async context', async () => {
      const crc = await crcService.crc32Async(testData);
      const numberValue = crc.readUInt32BE();
      expect(crcService.verifyCrc32(testData, numberValue)).toBe(true);
    });
  });

  describe('buffer size verification', () => {
    it('should produce correct buffer sizes for CRC8', async () => {
      const crc = await crcService.crc8Async(testData);
      expect(crc.length).toBe(1);
    });

    it('should produce correct buffer sizes for CRC16', async () => {
      const crc = await crcService.crc16Async(testData);
      expect(crc.length).toBe(2);
    });

    it('should produce correct buffer sizes for CRC32', async () => {
      const crc = await crcService.crc32Async(testData);
      expect(crc.length).toBe(4);
    });
  });
});
