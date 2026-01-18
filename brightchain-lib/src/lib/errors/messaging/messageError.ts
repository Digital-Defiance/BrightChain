import { BrightChainError } from '../brightChainError';
import { MessageErrorType } from '../../enumerations/messaging/messageErrorType';

/**
 * Error class for message passing system errors.
 * 
 * @remarks
 * Extends BrightChainError to provide consistent error handling
 * across the message passing system.
 * 
 * @example
 * ```typescript
 * throw new MessageError(
 *   MessageErrorType.INVALID_RECIPIENT,
 *   'Invalid recipient node ID format',
 *   { recipientId: 'invalid-id' }
 * );
 * ```
 * 
 * @see Design Document: Error Handling section
 */
export class MessageError extends BrightChainError {
  constructor(
    public readonly errorType: MessageErrorType,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(errorType, message, details);
    this.name = 'MessageError';
  }
}
