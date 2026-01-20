/**
 * @fileoverview Test for Super CBL threshold detection
 *
 * **Feature: super-cbl**
 *
 * **Validates: Requirements 1.2, 8.1**
 */

import { describe, expect, it } from '@jest/globals';
import { JsonCBLCapacityCalculator } from './jsonCblCapacity.service';

describe('Super CBL Threshold Detection', () => {
  const calculator = new JsonCBLCapacityCalculator();

  describe('Property 2: Super CBL Threshold Detection', () => {
    /**
     * **Feature: super-cbl, Property 2: Super CBL Threshold Detection**
     *
     * *For any* block size and file metadata, the system SHALL correctly
     * detect when the number of blocks requires a Super CBL structure.
     *
     * **Validates: Requirements 1.2, 8.1**
     */
    it('should detect when Super CBL is not needed for small block counts', () => {
      const blockSize = 4096;
      const fileName = 'small.txt';
      const originalSize = 1000;
      const smallBlockCount = 5;

      const requiresSuperCBL = calculator.requiresSuperCBL(
        smallBlockCount,
        blockSize,
        fileName,
        originalSize,
      );

      expect(requiresSuperCBL).toBe(false);
    });

    it('should detect when Super CBL is needed for large block counts', () => {
      const blockSize = 4096;
      const fileName = 'large.txt';
      const originalSize = 100000;

      // Calculate the threshold
      const maxBlocks = calculator.calculateMaxBlockReferences(
        blockSize,
        fileName,
        originalSize,
        'regular',
      );

      // Just above threshold should require Super CBL
      const requiresSuperCBL = calculator.requiresSuperCBL(
        maxBlocks + 1,
        blockSize,
        fileName,
        originalSize,
      );

      expect(requiresSuperCBL).toBe(true);
    });

    it('should handle edge case at exact threshold', () => {
      const blockSize = 4096;
      const fileName = 'edge.txt';
      const originalSize = 50000;

      const maxBlocks = calculator.calculateMaxBlockReferences(
        blockSize,
        fileName,
        originalSize,
        'regular',
      );

      // At threshold should not require Super CBL
      const atThreshold = calculator.requiresSuperCBL(
        maxBlocks,
        blockSize,
        fileName,
        originalSize,
      );
      expect(atThreshold).toBe(false);

      // One above threshold should require Super CBL
      const aboveThreshold = calculator.requiresSuperCBL(
        maxBlocks + 1,
        blockSize,
        fileName,
        originalSize,
      );
      expect(aboveThreshold).toBe(true);
    });

    it('should work with different block sizes', () => {
      const fileName = 'test.txt';
      const originalSize = 10000;

      // Smaller block size = fewer max blocks = lower threshold
      const smallBlockSize = 2048;
      const maxSmall = calculator.calculateMaxBlockReferences(
        smallBlockSize,
        fileName,
        originalSize,
        'regular',
      );

      // Larger block size = more max blocks = higher threshold
      const largeBlockSize = 8192;
      const maxLarge = calculator.calculateMaxBlockReferences(
        largeBlockSize,
        fileName,
        originalSize,
        'regular',
      );

      expect(maxLarge).toBeGreaterThan(maxSmall);

      // Same block count should require Super CBL for small but not large
      const testBlockCount = maxSmall + 1;
      expect(
        calculator.requiresSuperCBL(
          testBlockCount,
          smallBlockSize,
          fileName,
          originalSize,
        ),
      ).toBe(true);

      if (testBlockCount <= maxLarge) {
        expect(
          calculator.requiresSuperCBL(
            testBlockCount,
            largeBlockSize,
            fileName,
            originalSize,
          ),
        ).toBe(false);
      }
    });
  });
});
