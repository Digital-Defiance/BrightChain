/**
 * Factory pattern violation error class for the BrightChain library.
 *
 * This error is thrown when code attempts to instantiate a class directly
 * instead of using its designated factory method. Factory patterns are used
 * to ensure proper validation and initialization of objects.
 *
 * @example
 * ```typescript
 * import {
 *   FactoryPatternViolationError,
 *   isFactoryPatternViolationError
 * } from './factoryPatternViolationError';
 *
 * // This error is thrown internally when bypassing factory methods
 * // For example, if MemberDocument is instantiated directly:
 * try {
 *   // Attempting to bypass factory method would throw:
 *   // throw new FactoryPatternViolationError('MemberDocument');
 * } catch (error) {
 *   if (isFactoryPatternViolationError(error)) {
 *     console.error(`Cannot instantiate ${error.className} directly`);
 *     console.error('Use the factory method instead');
 *   }
 * }
 * ```
 *
 * @see Requirements 2.2, 4.1
 */

import { BrightChainError } from './brightChainError';

/**
 * Error class for factory pattern violations.
 *
 * Extends BrightChainError to provide consistent error handling
 * when code attempts to bypass factory methods.
 *
 * @remarks
 * - The `className` property identifies which class was incorrectly instantiated
 * - Factory patterns ensure proper validation and initialization
 * - Use the `isFactoryPatternViolationError` type guard for type-safe error handling
 *
 * @see Requirements 2.2, 4.1
 */
export class FactoryPatternViolationError extends BrightChainError {
  /**
   * Creates a new FactoryPatternViolationError instance.
   *
   * @param className - The name of the class that was incorrectly instantiated
   * @param context - Optional additional context for debugging
   *
   * @example
   * ```typescript
   * // Inside a class constructor that requires factory method usage:
   * class MyClass {
   *   private constructor(factoryToken: symbol) {
   *     if (factoryToken !== FACTORY_TOKEN) {
   *       throw new FactoryPatternViolationError('MyClass');
   *     }
   *   }
   *
   *   static create(): MyClass {
   *     return new MyClass(FACTORY_TOKEN);
   *   }
   * }
   * ```
   */
  constructor(
    public readonly className: string,
    context?: Record<string, unknown>,
  ) {
    super(
      'FactoryPatternViolation',
      `Cannot instantiate ${className} directly. Use the factory method instead.`,
      { className, ...context },
    );
  }
}

/**
 * Type guard to check if a value is a FactoryPatternViolationError instance.
 *
 * @param error - The value to check
 * @returns true if the value is a FactoryPatternViolationError instance
 *
 * @example
 * ```typescript
 * try {
 *   // Some operation that might violate factory pattern
 * } catch (error) {
 *   if (isFactoryPatternViolationError(error)) {
 *     // error is narrowed to FactoryPatternViolationError type
 *     console.error(`Use ${error.className}.create() instead of new ${error.className}()`);
 *   }
 * }
 * ```
 *
 * @see Requirement 14.4
 */
export function isFactoryPatternViolationError(
  error: unknown,
): error is FactoryPatternViolationError {
  return error instanceof FactoryPatternViolationError;
}
