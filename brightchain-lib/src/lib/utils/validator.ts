/**
 * Validator Utility Class
 *
 * Provides comprehensive input validation utilities for BrightChain services.
 * All validation methods throw EnhancedValidationError with descriptive messages
 * when validation fails.
 *
 * @remarks
 * - Use these validators at service boundaries to catch invalid inputs early
 * - All validators include optional context for better error messages
 * - Validators are designed to be composable and reusable
 *
 * @example
 * ```typescript
 * // Validate block parameters
 * Validator.validateBlockSize(params.blockSize, 'calculateCapacity');
 * Validator.validateBlockType(params.blockType, 'calculateCapacity');
 * Validator.validateEncryptionType(params.encryptionType, 'calculateCapacity');
 *
 * // Validate required fields
 * Validator.validateRequired(params.cbl, 'cbl', 'ExtendedCBL');
 * Validator.validateNotEmpty(params.cbl.fileName, 'fileName', 'ExtendedCBL');
 * ```
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.5, 5.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 * @module utils/validator
 */

import { ECIES } from '@digitaldefiance/ecies-lib';
import { BrightChainStrings } from '../enumerations';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize, validBlockSizes } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { EnhancedValidationError } from '../errors/enhancedValidationError';

/**
 * Validation utilities for common patterns across BrightChain services.
 *
 * This class provides static methods for validating:
 * - Block sizes (enum validation)
 * - Block types (enum validation)
 * - Encryption types (enum validation)
 * - Recipient counts (range validation with encryption type context)
 * - Required fields (null/undefined checks)
 * - Non-empty strings (whitespace-only checks)
 *
 * @remarks
 * All validation methods follow a consistent pattern:
 * 1. Check the value against valid options
 * 2. Throw EnhancedValidationError with field name and context if invalid
 * 3. Return void if valid (or use type assertion for validateRequired)
 *
 * @example
 * ```typescript
 * // In a service method
 * public processBlock(params: IBlockParams): void {
 *   // Validate all inputs at the start
 *   Validator.validateBlockSize(params.blockSize, 'processBlock');
 *   Validator.validateBlockType(params.blockType, 'processBlock');
 *
 *   // Now safe to proceed with validated inputs
 *   // ...
 * }
 * ```
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.5, 5.6
 */
export class Validator {
  /**
   * Validate that a block size is a valid BlockSize enum value.
   *
   * @param blockSize - The block size to validate
   * @param context - Optional context string for error messages (e.g., method name)
   * @throws {EnhancedValidationError} If the block size is not a valid BlockSize enum value
   *
   * @remarks
   * - BlockSize.Unknown (0) is considered invalid for actual use
   * - Only values in validBlockSizes array are accepted
   *
   * @example
   * ```typescript
   * // Valid usage
   * Validator.validateBlockSize(BlockSize.Medium, 'calculateCapacity');
   *
   * // Throws EnhancedValidationError
   * Validator.validateBlockSize(999 as BlockSize, 'calculateCapacity');
   * Validator.validateBlockSize(BlockSize.Unknown, 'calculateCapacity');
   * ```
   *
   * @see Requirements 5.1, 12.3
   */
  static validateBlockSize(blockSize: BlockSize, context?: string): void {
    if (!validBlockSizes.includes(blockSize)) {
      throw new EnhancedValidationError(
        'blockSize',
        BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate,
        { context },
        undefined,
        {
          BLOCK_SIZE: blockSize,
          BLOCK_SIZES: validBlockSizes.map((s) => s.toString()).join(', '),
        },
      );
    }
  }

  /**
   * Validate that a block type is a valid BlockType enum value.
   *
   * @param blockType - The block type to validate
   * @param context - Optional context string for error messages (e.g., method name)
   * @throws {EnhancedValidationError} If the block type is not a valid BlockType enum value
   *
   * @remarks
   * - BlockType.Unknown (-1) is considered invalid for actual use
   * - All other BlockType enum values are valid
   *
   * @example
   * ```typescript
   * // Valid usage
   * Validator.validateBlockType(BlockType.RawData, 'processBlock');
   *
   * // Throws EnhancedValidationError
   * Validator.validateBlockType(999 as BlockType, 'processBlock');
   * Validator.validateBlockType(BlockType.Unknown, 'processBlock');
   * ```
   *
   * @see Requirements 5.1, 12.4
   */
  static validateBlockType(blockType: BlockType, context?: string): void {
    const validBlockTypes = Object.values(BlockType).filter(
      (v) => typeof v === 'number' && v !== BlockType.Unknown,
    ) as BlockType[];

    if (!validBlockTypes.includes(blockType)) {
      throw new EnhancedValidationError(
        'blockType',
        BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate,
        { context },
        undefined,
        {
          BLOCK_TYPE: blockType,
          BLOCK_TYPES: validBlockTypes.map((t) => t.toString()).join(', '),
        },
      );
    }
  }

  /**
   * Validate that an encryption type is a valid BlockEncryptionType enum value.
   *
   * @param encryptionType - The encryption type to validate
   * @param context - Optional context string for error messages (e.g., method name)
   * @throws {EnhancedValidationError} If the encryption type is not a valid BlockEncryptionType enum value
   *
   * @example
   * ```typescript
   * // Valid usage
   * Validator.validateEncryptionType(BlockEncryptionType.SingleRecipient, 'encrypt');
   *
   * // Throws EnhancedValidationError
   * Validator.validateEncryptionType(999 as BlockEncryptionType, 'encrypt');
   * ```
   *
   * @see Requirements 5.1, 12.5
   */
  static validateEncryptionType(
    encryptionType: BlockEncryptionType,
    context?: string,
  ): void {
    const validEncryptionTypes = Object.values(BlockEncryptionType).filter(
      (v) => typeof v === 'number',
    ) as BlockEncryptionType[];

    if (!validEncryptionTypes.includes(encryptionType)) {
      throw new EnhancedValidationError(
        'encryptionType',
        BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate,
        { context },
        undefined,
        {
          ENCRYPTION_TYPE: encryptionType,
          ENCRYPTION_TYPES: validEncryptionTypes
            .map((t) => t.toString())
            .join(', '),
        },
      );
    }
  }

  /**
   * Validate recipient count for multi-recipient encryption.
   *
   * @param recipientCount - The number of recipients (may be undefined for non-multi-recipient)
   * @param encryptionType - The encryption type being used
   * @param context - Optional context string for error messages (e.g., method name)
   * @throws {EnhancedValidationError} If recipient count is invalid for the encryption type
   *
   * @remarks
   * - For MultiRecipient encryption, recipientCount must be at least 1
   * - For MultiRecipient encryption, recipientCount cannot exceed ECIES.MULTIPLE.MAX_RECIPIENTS
   * - For other encryption types, recipientCount is ignored
   *
   * @example
   * ```typescript
   * // Valid usage
   * Validator.validateRecipientCount(5, BlockEncryptionType.MultiRecipient, 'encrypt');
   * Validator.validateRecipientCount(undefined, BlockEncryptionType.SingleRecipient, 'encrypt');
   *
   * // Throws EnhancedValidationError
   * Validator.validateRecipientCount(0, BlockEncryptionType.MultiRecipient, 'encrypt');
   * Validator.validateRecipientCount(undefined, BlockEncryptionType.MultiRecipient, 'encrypt');
   * Validator.validateRecipientCount(1000, BlockEncryptionType.MultiRecipient, 'encrypt');
   * ```
   *
   * @see Requirements 5.3, 12.6
   */
  static validateRecipientCount(
    recipientCount: number | undefined,
    encryptionType: BlockEncryptionType,
    context?: string,
  ): void {
    if (encryptionType === BlockEncryptionType.MultiRecipient) {
      if (recipientCount === undefined || recipientCount < 1) {
        throw new EnhancedValidationError(
          'recipientCount',
          BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne,
          { recipientCount, encryptionType, context },
        );
      }

      const maxRecipients = ECIES.MULTIPLE.MAX_RECIPIENTS;
      if (recipientCount > maxRecipients) {
        throw new EnhancedValidationError(
          'recipientCount',
          BrightChainStrings.Error_Validator_RecipientCountMaximumTemplate,
          { recipientCount, maxRecipients, encryptionType, context },
          undefined,
          {
            MAXIMUM: maxRecipients,
          },
        );
      }
    }
  }

  /**
   * Validate that a required field is present (not null or undefined).
   *
   * @param value - The value to check
   * @param fieldName - The name of the field being validated
   * @param context - Optional context string for error messages (e.g., method name)
   * @throws {EnhancedValidationError} If the value is null or undefined
   *
   * @remarks
   * This method uses TypeScript's assertion signature to narrow the type
   * after validation, allowing safe access to the value.
   *
   * @example
   * ```typescript
   * // Type narrowing example
   * function processData(data: string | undefined): void {
   *   Validator.validateRequired(data, 'data', 'processData');
   *   // TypeScript now knows data is string, not undefined
   *   console.log(data.length);
   * }
   *
   * // Throws EnhancedValidationError
   * Validator.validateRequired(undefined, 'config', 'initialize');
   * Validator.validateRequired(null, 'user', 'authenticate');
   * ```
   *
   * @see Requirements 5.2, 5.6
   */
  static validateRequired<T>(
    value: T | undefined | null,
    fieldName: string,
    context?: string,
  ): asserts value is T {
    if (value === undefined || value === null) {
      throw new EnhancedValidationError(
        fieldName,
        BrightChainStrings.Error_Validator_FieldRequiredTemplate,
        {
          context,
        },
        undefined,
        { FIELD: fieldName },
      );
    }
  }

  /**
   * Validate that a string is not empty or whitespace-only.
   *
   * @param value - The string value to check
   * @param fieldName - The name of the field being validated
   * @param context - Optional context string for error messages (e.g., method name)
   * @throws {EnhancedValidationError} If the value is empty or contains only whitespace
   *
   * @remarks
   * - Empty strings ('') are invalid
   * - Whitespace-only strings ('   ') are invalid
   * - Strings with leading/trailing whitespace but content are valid
   *
   * @example
   * ```typescript
   * // Valid usage
   * Validator.validateNotEmpty('hello', 'name', 'createUser');
   * Validator.validateNotEmpty('  hello  ', 'name', 'createUser'); // Valid - has content
   *
   * // Throws EnhancedValidationError
   * Validator.validateNotEmpty('', 'name', 'createUser');
   * Validator.validateNotEmpty('   ', 'name', 'createUser');
   * ```
   *
   * @see Requirements 5.2, 5.6, 12.7
   */
  static validateNotEmpty(
    value: string,
    fieldName: string,
    context?: string,
  ): void {
    if (!value || value.trim().length === 0) {
      throw new EnhancedValidationError(
        fieldName,
        BrightChainStrings.Error_Validator_FieldCannotBeEmptyTemplate,
        { context },
        undefined,
        { FIELD: fieldName },
      );
    }
  }
}
