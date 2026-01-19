/**
 * Base error class for all BrightChain errors.
 *
 * This class provides a consistent error structure across the BrightChain library,
 * including error type, message, context, and cause tracking.
 *
 * @remarks
 * - All BrightChain-specific errors should extend this class
 * - The `type` property identifies the error category
 * - The `context` property provides additional debugging information
 * - The `cause` property preserves the original error when wrapping
 *
 * @example
 * ```typescript
 * class MyServiceError extends BrightChainError {
 *   constructor(message: string, context?: Record<string, unknown>) {
 *     super('MyService', message, context);
 *   }
 * }
 *
 * throw new MyServiceError('Operation failed', { operationId: '123' });
 * ```
 *
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 13.1, 13.2, 13.3, 13.4, 13.6
 */
export abstract class BrightChainError extends Error {
  /**
   * Creates a new BrightChainError instance.
   *
   * @param type - The error type/category identifier
   * @param message - Human-readable error message
   * @param context - Optional additional context for debugging
   * @param cause - Optional original error that caused this error
   */
  constructor(
    public readonly type: string,
    message: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintain proper stack trace in V8 environments (Node.js, Chrome)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get full error details including context as a JSON-serializable object.
   *
   * @returns An object containing all error details
   *
   * @example
   * ```typescript
   * try {
   *   // ... operation that throws
   * } catch {
   *   if (isBrightChainError(error)) {
   *     console.log(JSON.stringify(error.toJSON(), null, 2));
   *   }
   * }
   * ```
   */
  toJSON(): object {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

/**
 * Type guard to check if a value is a BrightChainError instance.
 *
 * @param error - The value to check
 * @returns true if the value is a BrightChainError instance
 *
 * @example
 * ```typescript
 * try {
 *   // ... operation that might throw
 * } catch {
 *   if (isBrightChainError(error)) {
 *     console.error(`${error.type}: ${error.message}`, error.context);
 *   }
 * }
 * ```
 *
 * @see Requirement 4.5
 */
export function isBrightChainError(error: unknown): error is BrightChainError {
  return error instanceof BrightChainError;
}
