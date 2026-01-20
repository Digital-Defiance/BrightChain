/**
 * @fileoverview Property-based tests for JsonCBLCapacityCalculator
 *
 * **Feature: super-cbl**
 *
 * This test suite verifies:
 * - Property 1: CBL Size Calculation Accuracy
 * - Property 3: Max Block References Calculation
 *
 * **Validates: Requirements 1.1, 1.3, 1.4**
 */

import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import type {
  CBLv1,
  RegularCBLv2,
  SubCBL,
  SuperCBL,
} from '../interfaces/storage/superCbl';
import { JsonCBLCapacityCalculator } from './jsonCblCapacity.service';

describe('JsonCBLCapacityCalculator - Property Tests', () => {
  const calculator = new JsonCBLCapacityCalculator();

  describe('Property 1: CBL Size Calculation Accuracy', () => {
    /**
     * **Feature: super-cbl, Property 1: CBL Size Calculation Accuracy**
     *
     * *For any* valid CBL data, the calculated size SHALL match the actual
     * serialized size including the 4-byte length prefix.
     *
     * **Validates: Requirements 1.1, 1.4**
     */
    it('should accurately calculate CBLv1 size', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 256, max: 8192 }),
          fc.integer({ min: 1, max: 100 }),
          fc.array(fc.string({ minLength: 128, maxLength: 128 }), {
            minLength: 0,
            maxLength: 10,
          }),
          (fileName, originalSize, blockSize, blockCount, blocks: string[]) => {
            const cbl: CBLv1 = {
              version: 1,
              fileName,
              originalSize,
              blockSize,
              blockCount,
              blocks,
            };

            const calculatedSize = calculator.calculateCBLSize(cbl);
            const actualJson = JSON.stringify(cbl);
            const actualSize = 4 + new TextEncoder().encode(actualJson).length;

            expect(calculatedSize).toBe(actualSize);
            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should accurately calculate RegularCBLv2 size', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 256, max: 8192 }),
          fc.integer({ min: 1, max: 100 }),
          fc.array(fc.string({ minLength: 128, maxLength: 128 }), {
            minLength: 0,
            maxLength: 10,
          }),
          (fileName, originalSize, blockSize, blockCount, blocks: string[]) => {
            const cbl: RegularCBLv2 = {
              version: 2,
              type: 'regular',
              fileName,
              originalSize,
              blockSize,
              blockCount,
              blocks,
            };

            const calculatedSize = calculator.calculateCBLSize(cbl);
            const actualJson = JSON.stringify(cbl);
            const actualSize = 4 + new TextEncoder().encode(actualJson).length;

            expect(calculatedSize).toBe(actualSize);
            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should accurately calculate SubCBL size', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 256, max: 8192 }),
          fc.integer({ min: 1, max: 100 }),
          fc.array(fc.string({ minLength: 128, maxLength: 128 }), {
            minLength: 0,
            maxLength: 10,
          }),
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          (
            fileName,
            originalSize,
            blockSize,
            blockCount,
            blocks: string[],
            subCblIndex,
            totalSubCbls,
          ) => {
            const cbl: SubCBL = {
              version: 2,
              type: 'sub-cbl',
              fileName,
              originalSize,
              blockSize,
              blockCount,
              blocks,
              subCblIndex,
              totalSubCbls,
            };

            const calculatedSize = calculator.calculateCBLSize(cbl);
            const actualJson = JSON.stringify(cbl);
            const actualSize = 4 + new TextEncoder().encode(actualJson).length;

            expect(calculatedSize).toBe(actualSize);
            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should accurately calculate SuperCBL size', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 256, max: 8192 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 1, max: 20 }),
          fc.array(fc.string({ minLength: 50, maxLength: 300 }), {
            minLength: 0,
            maxLength: 10,
          }),
          (
            fileName,
            originalSize,
            blockSize,
            totalBlockCount,
            depth,
            subCblCount,
            subCblMagnetUrls,
          ) => {
            const cbl: SuperCBL = {
              version: 2,
              type: 'super-cbl',
              fileName,
              originalSize,
              blockSize,
              totalBlockCount,
              depth,
              subCblCount,
              subCblMagnetUrls,
            };

            const calculatedSize = calculator.calculateCBLSize(cbl);
            const actualJson = JSON.stringify(cbl);
            const actualSize = 4 + new TextEncoder().encode(actualJson).length;

            expect(calculatedSize).toBe(actualSize);
            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 3: Max Block References Calculation', () => {
    /**
     * **Feature: super-cbl, Property 3: Max Block References Calculation**
     *
     * *For any* block size and metadata, a CBL with the maximum calculated
     * number of block references SHALL fit within the block size.
     *
     * **Validates: Requirements 1.3**
     */
    it('should calculate max references that fit in regular CBL', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1024, max: 8192 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          (blockSize, fileName, originalSize) => {
            const maxRefs = calculator.calculateMaxBlockReferences(
              blockSize,
              fileName,
              originalSize,
              'regular',
            );

            // Create a CBL with max references
            const blocks = Array(maxRefs).fill('a'.repeat(128));
            const cbl: RegularCBLv2 = {
              version: 2,
              type: 'regular',
              fileName,
              originalSize,
              blockSize,
              blockCount: maxRefs,
              blocks,
            };

            const size = calculator.calculateCBLSize(cbl);
            expect(size).toBeLessThanOrEqual(blockSize);
            return true;
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should calculate max references that fit in sub-CBL', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1024, max: 8192 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 1, max: 10 }),
          (blockSize, fileName, originalSize, subCblIndex, totalSubCbls) => {
            const maxRefs = calculator.calculateMaxBlockReferences(
              blockSize,
              fileName,
              originalSize,
              'sub-cbl',
              { subCblIndex, totalSubCbls },
            );

            // Create a sub-CBL with max references
            const blocks = Array(maxRefs).fill('b'.repeat(128));
            const cbl: SubCBL = {
              version: 2,
              type: 'sub-cbl',
              fileName,
              originalSize,
              blockSize,
              blockCount: maxRefs,
              blocks,
              subCblIndex,
              totalSubCbls,
            };

            const size = calculator.calculateCBLSize(cbl);
            expect(size).toBeLessThanOrEqual(blockSize);
            return true;
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should calculate max sub-CBL references that fit in Super CBL', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2048, max: 8192 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 2, max: 5 }),
          (blockSize, fileName, originalSize, totalBlockCount, depth) => {
            const maxRefs = calculator.calculateMaxSubCBLReferences(
              blockSize,
              fileName,
              originalSize,
              totalBlockCount,
              depth,
            );

            // Create a Super CBL with max magnet URLs
            const magnetUrls = Array(maxRefs).fill(
              'magnet:?xt=urn:brightchain:cbl&bs=4096&b1=' +
                'c'.repeat(128) +
                '&b2=' +
                'd'.repeat(128),
            );
            const cbl: SuperCBL = {
              version: 2,
              type: 'super-cbl',
              fileName,
              originalSize,
              blockSize,
              totalBlockCount,
              depth,
              subCblCount: maxRefs,
              subCblMagnetUrls: magnetUrls,
            };

            const size = calculator.calculateCBLSize(cbl);
            expect(size).toBeLessThanOrEqual(blockSize);
            return true;
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should correctly detect when Super CBL is required', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1024, max: 8192 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          (blockSize, fileName, originalSize) => {
            const maxRefs = calculator.calculateMaxBlockReferences(
              blockSize,
              fileName,
              originalSize,
              'regular',
            );

            // Block count at threshold should not require Super CBL
            expect(
              calculator.requiresSuperCBL(
                maxRefs,
                blockSize,
                fileName,
                originalSize,
              ),
            ).toBe(false);

            // Block count above threshold should require Super CBL
            expect(
              calculator.requiresSuperCBL(
                maxRefs + 1,
                blockSize,
                fileName,
                originalSize,
              ),
            ).toBe(true);

            return true;
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
