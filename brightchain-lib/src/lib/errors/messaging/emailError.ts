import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { BrightChainError } from '../brightChainError';

/**
 * Error class for email messaging system errors.
 *
 * @remarks
 * Extends BrightChainError to provide consistent error handling
 * across the email messaging system. Covers validation, parsing,
 * delivery, storage, and security error categories.
 *
 * @example
 * ```typescript
 * throw new EmailError(
 *   EmailErrorType.INVALID_MAILBOX,
 *   'Invalid email address format',
 *   { address: 'not-an-email' }
 * );
 * ```
 *
 * @example
 * ```typescript
 * throw new EmailError(
 *   EmailErrorType.ATTACHMENT_TOO_LARGE,
 *   'Attachment exceeds maximum size limit',
 *   { filename: 'large-file.zip', size: 30_000_000, maxSize: 25_000_000 }
 * );
 * ```
 *
 * @see Design Document: Error Handling section
 * @see Requirement 15.5
 */
export class EmailError extends BrightChainError {
  constructor(
    public readonly errorType: EmailErrorType,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(errorType, message, details);
    this.name = 'EmailError';
  }
}

/**
 * Type guard to check if a value is an EmailError instance.
 *
 * @param error - The value to check
 * @returns true if the value is an EmailError instance
 *
 * @example
 * ```typescript
 * try {
 *   // ... email operation
 * } catch (error) {
 *   if (isEmailError(error)) {
 *     console.error(`Email error (${error.errorType}): ${error.message}`, error.details);
 *   }
 * }
 * ```
 */
export function isEmailError(error: unknown): error is EmailError {
  return error instanceof EmailError;
}
