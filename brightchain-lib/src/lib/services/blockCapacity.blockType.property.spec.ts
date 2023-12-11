/**
 * Property-Based Tests for Block Type Exhaustiveness
 *
 * **Property 7: Block Type Exhaustiveness**
 * *For any* valid BlockType enum value, services should either handle it
 * or throw UnsupportedBlockTypeError
 *
 * **Validates: Requirements 6.1, 6.2, 6.5**
 *
 * @module services/blockCapacity.blockType.property.spec
 */

import * as fc from 'fast-check';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockCapacityError } from '../errors/block/blockCapacity';
import { EnhancedValidationError } from '../errors/enhancedValidationError';
import { ServiceProvider } from './service.provider';

describe('BlockCapacityCalculator - Block Type Exhaustiveness Property Tests', () => {
  const blockCapacityCalculator =
    ServiceProvider.getInstance().blockCapacityCalculator;

  /**
   * Get all valid BlockType enum values (excluding Unknown)
   */
  const validBlockTypes = Object.values(BlockType).filter(
    (v): v is BlockType => typeof v === 'number' && v !== BlockType.Unknown,
  );

  /**
   * Property 7: Block Type Exhaustiveness
   *
   * For any valid BlockType enum value, the BlockCapacityCalculator should:
   * 1. Successfully calculate capacity, OR
   * 2. Throw a BlockCapacityError with appropriate error type
   *
   * It should NEVER throw an unexpected error or leave a block type unhandled.
   *
   * **Validates: Requirements 6.1, 6.2, 6.5**
   */
  describe('Property 7: Block Type Exhaustiveness', () => {
    it('should handle all valid block types without unexpected errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validBlockTypes),
          (blockType: BlockType) => {
            // Prepare parameters based on block type
            const params = {
              blockSize: BlockSize.Medium,
              blockType,
              encryptionType: BlockEncryptionType.None,
              // Add CBL data for extended CBL types
              ...(blockType === BlockType.ExtendedConstituentBlockListBlock ||
              blockType === BlockType.EncryptedExtendedConstituentBlockListBlock
                ? { cbl: { fileName: 'test.txt', mimeType: 'text/plain' } }
                : {}),
              // Add recipient count for multi-encrypted blocks
              ...(blockType === BlockType.MultiEncryptedBlock
                ? {
                    encryptionType: BlockEncryptionType.MultiRecipient,
                    recipientCount: 3,
                  }
                : {}),
            };

            try {
              const result = blockCapacityCalculator.calculateCapacity(params);

              // If successful, verify the result structure
              expect(result).toBeDefined();
              expect(result.totalCapacity).toBe(BlockSize.Medium);
              expect(result.availableCapacity).toBeGreaterThanOrEqual(0);
              expect(result.overhead).toBeGreaterThanOrEqual(0);
              expect(result.details).toBeDefined();
              expect(result.details.baseHeader).toBeGreaterThanOrEqual(0);
              expect(
                result.details.typeSpecificOverhead,
              ).toBeGreaterThanOrEqual(0);
              expect(result.details.encryptionOverhead).toBeGreaterThanOrEqual(
                0,
              );
              expect(result.details.variableOverhead).toBeGreaterThanOrEqual(0);

              return true;
            } catch (error) {
              // Expected errors are BlockCapacityError or EnhancedValidationError
              if (
                error instanceof BlockCapacityError ||
                error instanceof EnhancedValidationError
              ) {
                // These are expected - the block type is handled but validation failed
                return true;
              }

              // Unexpected error - fail the test
              throw new Error(
                `Unexpected error for block type ${BlockType[blockType]}: ${error}`,
              );
            }
          },
        ),
        { numRuns: validBlockTypes.length * 2 },
      );
    });

    it('should reject invalid block types with EnhancedValidationError', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 999 }), // Invalid block type values
          (invalidBlockType: number) => {
            expect(() =>
              blockCapacityCalculator.calculateCapacity({
                blockSize: BlockSize.Medium,
                blockType: invalidBlockType as BlockType,
                encryptionType: BlockEncryptionType.None,
              }),
            ).toThrow(EnhancedValidationError);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should handle BlockType.Unknown as invalid', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Medium,
          blockType: BlockType.Unknown,
          encryptionType: BlockEncryptionType.None,
        }),
      ).toThrow(EnhancedValidationError);
    });

    it('should handle all block types consistently across different block sizes', () => {
      const blockSizes = [
        BlockSize.Tiny,
        BlockSize.Small,
        BlockSize.Medium,
        BlockSize.Large,
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...validBlockTypes),
          fc.constantFrom(...blockSizes),
          (blockType: BlockType, blockSize: BlockSize) => {
            // Prepare parameters based on block type
            const params = {
              blockSize,
              blockType,
              encryptionType: BlockEncryptionType.None,
              // Add CBL data for extended CBL types
              ...(blockType === BlockType.ExtendedConstituentBlockListBlock ||
              blockType === BlockType.EncryptedExtendedConstituentBlockListBlock
                ? { cbl: { fileName: 'test.txt', mimeType: 'text/plain' } }
                : {}),
              // Add recipient count for multi-encrypted blocks
              ...(blockType === BlockType.MultiEncryptedBlock
                ? {
                    encryptionType: BlockEncryptionType.MultiRecipient,
                    recipientCount: 3,
                  }
                : {}),
            };

            try {
              const result = blockCapacityCalculator.calculateCapacity(params);

              // Verify basic invariants
              expect(result.totalCapacity).toBe(blockSize);
              expect(result.availableCapacity).toBeLessThanOrEqual(
                result.totalCapacity,
              );
              expect(result.overhead).toBe(
                result.details.baseHeader +
                  result.details.typeSpecificOverhead +
                  result.details.encryptionOverhead +
                  result.details.variableOverhead,
              );

              return true;
            } catch (error) {
              // Expected errors are acceptable
              if (
                error instanceof BlockCapacityError ||
                error instanceof EnhancedValidationError
              ) {
                return true;
              }
              throw error;
            }
          },
        ),
        { numRuns: validBlockTypes.length * blockSizes.length },
      );
    });
  });
});
