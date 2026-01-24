/**
 * Comprehensive edge case tests for block system
 * Tests empty data, maximum size, invalid checksums, and boundary conditions
 * Requirement 7.2: Add missing edge case tests
 */

import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../enumerations/blockSize';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ServiceProvider } from '../services/service.provider';
import { RawDataBlock } from './rawData';
import { RandomBlock } from './random';
import { WhitenedBlock } from './whitened';

describe('Block Edge Cases', () => {
  beforeEach(() => {
    ServiceProvider.resetInstance();
    ServiceProvider.getInstance(); // Initialize the service provider
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Empty Data Blocks', () => {
    it('should create RawDataBlock with zero-length data', () => {
      const emptyData = new Uint8Array(0);
      const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(emptyData);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        emptyData,
        new Date(),
        checksum,
      );

      expect(block.data.length).toBe(0);
      expect(block.layerPayload.length).toBe(0);
      expect(block.lengthBeforeEncryption).toBe(0);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should create RandomBlock with minimum size', () => {
      const block = RandomBlock.new(BlockSize.Message);
      
      expect(block.data.length).toBe(BlockSize.Message);
      expect(block.blockSize).toBe(BlockSize.Message);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should handle WhitenedBlock with minimal data', async () => {
      const minimalData = new Uint8Array(1);
      minimalData[0] = 42;
      
      const whitenedBlock = await WhitenedBlock.from(
        BlockSize.Small,
        minimalData,
        undefined,
        undefined,
        1,
      );

      expect(whitenedBlock.metadata.lengthWithoutPadding).toBe(1);
      expect(whitenedBlock.data.length).toBe(BlockSize.Small);
    });
  });

  describe('Maximum Size Blocks', () => {
    const fillRandomData = (data: Uint8Array): void => {
      // crypto.getRandomValues has a limit of 65,536 bytes
      const chunkSize = 65536;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.subarray(i, Math.min(i + chunkSize, data.length));
        crypto.getRandomValues(chunk);
      }
    };

    const testMaxSize = (blockSize: BlockSize, sizeName: string) => {
      it(`should create RawDataBlock at maximum ${sizeName} size`, () => {
        const maxData = new Uint8Array(blockSize as number);
        fillRandomData(maxData);
        const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(maxData);
        
        const block = new RawDataBlock(
          blockSize,
          maxData,
          new Date(),
          checksum,
        );

        expect(block.data.length).toBe(blockSize as number);
        expect(block.blockSize).toBe(blockSize);
        expect(() => block.validateSync()).not.toThrow();
      });

      it(`should reject oversized data for ${sizeName} blocks`, () => {
        const oversizedData = new Uint8Array((blockSize as number) + 1);
        fillRandomData(oversizedData);
        
        expect(() => {
          new RawDataBlock(
            blockSize,
            oversizedData,
            new Date(),
          );
        }).toThrow(`Data length (${(blockSize as number) + 1}) exceeds block size (${blockSize})`);
      });
    };

    testMaxSize(BlockSize.Message, 'Message (512B)');
    testMaxSize(BlockSize.Tiny, 'Tiny (1KB)');
    testMaxSize(BlockSize.Small, 'Small (4KB)');
    testMaxSize(BlockSize.Medium, 'Medium (1MB)');
    // Skip Large and Huge for performance reasons in tests
  });

  describe('Invalid Checksum Handling', () => {
    it('should detect checksum mismatch on validation', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);
      
      // Create a different checksum
      const wrongData = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(wrongData);
      const wrongChecksum = ServiceProvider.getInstance().checksumService.calculateChecksum(wrongData);
      
      // RawDataBlock doesn't validate checksum on construction, only on validation
      const block = new RawDataBlock(
        BlockSize.Small,
        data,
        new Date(),
        wrongChecksum,
      );

      expect(() => block.validateSync()).toThrow(ChecksumMismatchError);
    });

    it('should detect checksum mismatch on validation with corrupted data', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);
      const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(data);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        data,
        new Date(),
        checksum,
      );

      // Corrupt the internal data
      const corruptedData = new Uint8Array(data);
      corruptedData[0] = (corruptedData[0] + 1) % 256;
      Object.defineProperty(block, '_data', {
        value: corruptedData,
        writable: false,
      });

      expect(() => block.validateSync()).toThrow(ChecksumMismatchError);
    });

    it('should provide correct checksums in mismatch error', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);
      const correctChecksum = ServiceProvider.getInstance().checksumService.calculateChecksum(data);
      
      const wrongData = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(wrongData);
      const wrongChecksum = ServiceProvider.getInstance().checksumService.calculateChecksum(wrongData);
      
      // Create block with wrong checksum
      const block = new RawDataBlock(
        BlockSize.Small,
        data,
        new Date(),
        wrongChecksum,
      );

      try {
        block.validateSync();
        fail('Expected ChecksumMismatchError');
      } catch (error) {
        expect(error).toBeInstanceOf(ChecksumMismatchError);
        const checksumError = error as ChecksumMismatchError;
        expect(arraysEqual(
          checksumError.checksum.toUint8Array(),
          wrongChecksum.toUint8Array()
        )).toBe(true);
        expect(arraysEqual(
          checksumError.expected.toUint8Array(),
          correctChecksum.toUint8Array()
        )).toBe(true);
      }
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle data exactly at block size boundary', () => {
      const exactData = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(exactData);
      const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(exactData);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        exactData,
        new Date(),
        checksum,
      );

      expect(block.data.length).toBe(BlockSize.Small);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should handle data one byte below block size', () => {
      const almostFullData = new Uint8Array((BlockSize.Small as number) - 1);
      crypto.getRandomValues(almostFullData);
      const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(almostFullData);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        almostFullData,
        new Date(),
        checksum,
      );

      expect(block.data.length).toBe((BlockSize.Small as number) - 1);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should reject data one byte over block size', () => {
      const oversizedData = new Uint8Array((BlockSize.Small as number) + 1);
      crypto.getRandomValues(oversizedData);
      
      expect(() => {
        new RawDataBlock(
          BlockSize.Small,
          oversizedData,
          new Date(),
        );
      }).toThrow();
    });

    it('should handle single-byte blocks', () => {
      const singleByte = new Uint8Array(1);
      singleByte[0] = 42;
      const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(singleByte);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        singleByte,
        new Date(),
        checksum,
      );

      expect(block.data.length).toBe(1);
      expect(block.data[0]).toBe(42);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should handle all-zero data', () => {
      const zeroData = new Uint8Array(BlockSize.Small);
      // All zeros by default
      const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(zeroData);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        zeroData,
        new Date(),
        checksum,
      );

      expect(block.data.every(byte => byte === 0)).toBe(true);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should handle all-ones data', () => {
      const onesData = new Uint8Array(BlockSize.Small);
      onesData.fill(0xFF);
      const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(onesData);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        onesData,
        new Date(),
        checksum,
      );

      expect(block.data.every(byte => byte === 0xFF)).toBe(true);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should handle alternating bit patterns', () => {
      const alternatingData = new Uint8Array(BlockSize.Small);
      for (let i = 0; i < alternatingData.length; i++) {
        alternatingData[i] = i % 2 === 0 ? 0xAA : 0x55;
      }
      const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(alternatingData);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        alternatingData,
        new Date(),
        checksum,
      );

      expect(() => block.validateSync()).not.toThrow();
    });
  });

  describe('Date Boundary Conditions', () => {
    it('should handle epoch date (1970-01-01)', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);
      const epochDate = new Date(0);
      
      const block = new RawDataBlock(
        BlockSize.Small,
        data,
        epochDate,
      );

      expect(block.metadata.dateCreated.getTime()).toBe(0);
    });

    it('should handle current date', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);
      const now = new Date();
      
      const block = new RawDataBlock(
        BlockSize.Small,
        data,
        now,
      );

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(block.metadata.dateCreated.getTime() - now.getTime())).toBeLessThan(1000);
    });

    it('should reject future dates', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      expect(() => {
        new RawDataBlock(
          BlockSize.Small,
          data,
          futureDate,
        );
      }).toThrow(); // Just check that it throws, don't check specific error type
    });
  });

  describe('Padding Edge Cases', () => {
    it('should handle WhitenedBlock with data requiring maximum padding', async () => {
      // Create data that's 1 byte, requiring maximum padding
      const minimalData = new Uint8Array(1);
      minimalData[0] = 42;
      
      const whitenedBlock = await WhitenedBlock.from(
        BlockSize.Small,
        minimalData,
        undefined,
        undefined,
        1, // lengthWithoutPadding
      );

      expect(whitenedBlock.metadata.lengthWithoutPadding).toBe(1);
      expect(whitenedBlock.data.length).toBe(BlockSize.Small);
    });

    it('should handle WhitenedBlock with data requiring no padding', async () => {
      // Create data that exactly fills the block
      const fullData = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(fullData);
      
      const whitenedBlock = await WhitenedBlock.from(
        BlockSize.Small,
        fullData,
        undefined,
        undefined,
        fullData.length,
      );

      expect(whitenedBlock.metadata.lengthWithoutPadding).toBe(fullData.length);
      expect(whitenedBlock.data.length).toBe(BlockSize.Small);
    });
  });

  describe('Multiple Block Sizes', () => {
    const fillRandomData = (data: Uint8Array): void => {
      // crypto.getRandomValues has a limit of 65,536 bytes
      const chunkSize = 65536;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.subarray(i, Math.min(i + chunkSize, data.length));
        crypto.getRandomValues(chunk);
      }
    };

    const allBlockSizes = [
      BlockSize.Message,
      BlockSize.Tiny,
      BlockSize.Small,
      BlockSize.Medium,
    ];

    allBlockSizes.forEach(blockSize => {
      it(`should handle empty data for ${BlockSize[blockSize]} blocks`, () => {
        const emptyData = new Uint8Array(0);
        const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(emptyData);
        
        const block = new RawDataBlock(
          blockSize,
          emptyData,
          new Date(),
          checksum,
        );

        expect(block.data.length).toBe(0);
        expect(block.blockSize).toBe(blockSize);
      });

      it(`should handle maximum data for ${BlockSize[blockSize]} blocks`, () => {
        const maxData = new Uint8Array(blockSize as number);
        fillRandomData(maxData);
        const checksum = ServiceProvider.getInstance().checksumService.calculateChecksum(maxData);
        
        const block = new RawDataBlock(
          blockSize,
          maxData,
          new Date(),
          checksum,
        );

        expect(block.data.length).toBe(blockSize as number);
        expect(block.blockSize).toBe(blockSize);
      });
    });
  });
});
