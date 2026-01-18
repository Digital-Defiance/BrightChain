/**
 * Centralized type guards for all BrightChain error types.
 *
 * This module provides type guards for type-safe error handling across the
 * BrightChain library. Type guards enable TypeScript to narrow error types
 * at runtime, allowing for proper type-safe error handling.
 *
 * @remarks
 * - All type guards use `instanceof` checks for O(1) performance
 * - Type guards return TypeScript type predicates for proper narrowing
 * - Use these guards in catch blocks for type-safe error handling
 *
 * @example
 * ```typescript
 * import {
 *   isBrightChainError,
 *   isValidationError,
 *   isChecksumError,
 *   isEnhancedValidationError
 * } from './typeGuards';
 *
 * try {
 *   // ... operation that might throw
 * } catch (error) {
 *   if (isChecksumError(error)) {
 *     console.error(`Checksum error (${error.checksumErrorType}): ${error.message}`);
 *   } else if (isEnhancedValidationError(error)) {
 *     console.error(`Validation failed for '${error.field}': ${error.message}`);
 *   } else if (isBrightChainError(error)) {
 *     console.error(`BrightChain error (${error.type}): ${error.message}`);
 *   } else {
 *     throw error; // Re-throw unknown errors
 *   }
 * }
 * ```
 *
 * @see Requirements 4.5, 14.4, 14.5, 14.6
 * @module
 */

// Re-export existing type guards from their source files
export { isBrightChainError } from './brightChainError';
export { isChecksumError } from './checksumError';
export { isEnhancedValidationError } from './enhancedValidationError';
export { isFactoryPatternViolationError } from './factoryPatternViolationError';

// Import error classes for additional type guards
import { BrightChainError } from './brightChainError';
import { CblError } from './cblError';
import { ChecksumError } from './checksumError';
import { EciesError } from './eciesError';
import { EnhancedValidationError } from './enhancedValidationError';
import { FactoryPatternViolationError } from './factoryPatternViolationError';
import { FecError } from './fecError';
import { TypedError } from './typedError';
import { ValidationError } from './validationError';

/**
 * Type guard to check if a value is a ValidationError instance.
 *
 * @remarks
 * This checks for the original ValidationError class (not EnhancedValidationError).
 * For the new error hierarchy, use `isEnhancedValidationError` instead.
 *
 * @param error - The value to check
 * @returns true if the value is a ValidationError instance
 *
 * @example
 * ```typescript
 * try {
 *   validateInput(data);
 * } catch (error) {
 *   if (isValidationError(error)) {
 *     console.error(`Validation error (${error.type}): ${error.message}`);
 *   }
 * }
 * ```
 *
 * @see Requirement 14.4
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if a value is an EciesError instance.
 *
 * @param error - The value to check
 * @returns true if the value is an EciesError instance
 *
 * @example
 * ```typescript
 * try {
 *   eciesService.encrypt(data);
 * } catch (error) {
 *   if (isEciesError(error)) {
 *     console.error(`ECIES error (${error.type}): ${error.message}`);
 *   }
 * }
 * ```
 *
 * @see Requirement 14.4
 */
export function isEciesError(error: unknown): error is EciesError {
  return error instanceof EciesError;
}

/**
 * Type guard to check if a value is a CblError instance.
 *
 * @param error - The value to check
 * @returns true if the value is a CblError instance
 *
 * @example
 * ```typescript
 * try {
 *   cblService.createCbl(data);
 * } catch (error) {
 *   if (isCblError(error)) {
 *     console.error(`CBL error (${error.type}): ${error.message}`);
 *   }
 * }
 * ```
 *
 * @see Requirement 14.4
 */
export function isCblError(error: unknown): error is CblError {
  return error instanceof CblError;
}

/**
 * Type guard to check if a value is a FecError instance.
 *
 * @param error - The value to check
 * @returns true if the value is a FecError instance
 *
 * @example
 * ```typescript
 * try {
 *   fecService.encode(data);
 * } catch (error) {
 *   if (isFecError(error)) {
 *     console.error(`FEC error (${error.type}): ${error.message}`);
 *   }
 * }
 * ```
 *
 * @see Requirement 14.4
 */
export function isFecError(error: unknown): error is FecError {
  return error instanceof FecError;
}

/**
 * Type guard to check if a value is a TypedError instance.
 *
 * @remarks
 * TypedError is the base class for many error types in the codebase.
 * This guard is useful for catching any typed error regardless of specific type.
 *
 * @param error - The value to check
 * @returns true if the value is a TypedError instance
 *
 * @example
 * ```typescript
 * try {
 *   someOperation();
 * } catch (error) {
 *   if (isTypedError(error)) {
 *     console.error(`Typed error (${error.type}): ${error.message}`);
 *   }
 * }
 * ```
 *
 * @see Requirement 14.4
 */
export function isTypedError<T extends string | number = string | number>(
  error: unknown,
): error is TypedError<T> {
  return error instanceof TypedError;
}

/**
 * Type guard to check if a value is any kind of BrightChain-related error.
 *
 * @remarks
 * This is a broad check that returns true for:
 * - BrightChainError and all its subclasses
 * - TypedError and all its subclasses
 * - ValidationError
 *
 * Use more specific type guards when you need to handle specific error types.
 *
 * @param error - The value to check
 * @returns true if the value is any BrightChain-related error
 *
 * @example
 * ```typescript
 * try {
 *   someOperation();
 * } catch (error) {
 *   if (isAnyBrightChainError(error)) {
 *     // Handle any BrightChain error
 *     console.error('BrightChain operation failed:', error.message);
 *   } else {
 *     // Handle unexpected errors
 *     throw error;
 *   }
 * }
 * ```
 *
 * @see Requirement 14.4
 */
export function isAnyBrightChainError(error: unknown): error is Error {
  return (
    error instanceof BrightChainError ||
    error instanceof TypedError ||
    error instanceof ValidationError
  );
}

/**
 * Utility type for error handling that combines all BrightChain error types.
 *
 * @remarks
 * This type is useful for function signatures that need to handle
 * any BrightChain error type.
 */
export type AnyBrightChainError =
  | BrightChainError
  | ChecksumError
  | EnhancedValidationError
  | FactoryPatternViolationError
  | ValidationError
  | EciesError
  | CblError
  | FecError
  | TypedError<string | number>;
