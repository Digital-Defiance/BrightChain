import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { BrightChainStrings } from '../enumerations';
import { translate } from '../i18n';
import { BrightChainError } from './brightChainError';

/**
 * Enhanced validation error extending BrightChainError.
 *
 * This class provides a consistent validation error structure that includes
 * the field name that failed validation, a descriptive message, and optional
 * context for debugging.
 *
 * @remarks
 * - Use this class for validation errors in the new BrightChainError hierarchy
 * - The `field` property identifies which field/parameter failed validation
 * - The `context` property can include additional details like expected values
 * - The existing `ValidationError` class is maintained for backward compatibility
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new EnhancedValidationError('blockSize', 'Invalid block size: 999');
 *
 * // With context
 * throw new EnhancedValidationError(
 *   'recipientCount',
 *   'Recipient count must be at least 1 for multi-recipient encryption',
 *   { recipientCount: 0, encryptionType: 'MultiRecipient' }
 * );
 * ```
 *
 * @see Requirements 4.1, 5.4
 */
export class EnhancedValidationError extends BrightChainError {
  /**
   * Creates a new EnhancedValidationError instance.
   *
   * @param field - The name of the field/parameter that failed validation
   * @param message - Human-readable description of the validation failure
   * @param context - Optional additional context for debugging (merged with field)
   *
   * @example
   * ```typescript
   * // Validate block size
   * if (!isValidBlockSize(blockSize)) {
   *   throw new EnhancedValidationError(
   *     'blockSize',
   *     `Invalid block size: ${blockSize}`,
   *     { validSizes: [256, 512, 1024, 2048, 4096] }
   *   );
   * }
   * ```
   */
  constructor(
    public readonly field: string,
    message: BrightChainStrings,
    context?: Record<string, unknown>,
    language?: CoreLanguageCode,
    otherVars?: Record<string, string | number>,
  ) {
    super('Validation', translate(message, otherVars, language), {
      field,
      ...context,
    });
  }
}

/**
 * Type guard to check if a value is an EnhancedValidationError instance.
 *
 * @param error - The value to check
 * @returns true if the value is an EnhancedValidationError instance
 *
 * @example
 * ```typescript
 * try {
 *   validateInput(data);
 * } catch {
 *   if (isEnhancedValidationError(error)) {
 *     console.error(`Validation failed for field '${error.field}': ${error.message}`);
 *   }
 * }
 * ```
 *
 * @see Requirement 4.5
 */
export function isEnhancedValidationError(
  error: unknown,
): error is EnhancedValidationError {
  return error instanceof EnhancedValidationError;
}
