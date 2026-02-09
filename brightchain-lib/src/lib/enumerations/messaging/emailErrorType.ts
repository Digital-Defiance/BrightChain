/**
 * Error types for the email messaging system.
 *
 * @remarks
 * Categorizes email-specific errors by operation type for structured error handling.
 * Covers validation, size limits, parsing, delivery, storage, and security errors.
 *
 * @see Design Document: Error Handling section
 * @see Requirement 15.5
 */
export enum EmailErrorType {
  // Validation errors
  INVALID_HEADER_NAME = 'INVALID_HEADER_NAME',
  INVALID_MAILBOX = 'INVALID_MAILBOX',
  INVALID_MESSAGE_ID = 'INVALID_MESSAGE_ID',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
  INVALID_BOUNDARY = 'INVALID_BOUNDARY',
  MISSING_REQUIRED_HEADER = 'MISSING_REQUIRED_HEADER',
  NO_RECIPIENTS = 'NO_RECIPIENTS',

  // Size errors
  ATTACHMENT_TOO_LARGE = 'ATTACHMENT_TOO_LARGE',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',

  // Parsing errors
  PARSE_ERROR = 'PARSE_ERROR',
  MALFORMED_HEADER = 'MALFORMED_HEADER',
  MALFORMED_MIME = 'MALFORMED_MIME',
  ENCODING_ERROR = 'ENCODING_ERROR',

  // Delivery errors
  RECIPIENT_NOT_FOUND = 'RECIPIENT_NOT_FOUND',
  NODE_UNREACHABLE = 'NODE_UNREACHABLE',
  REPLICATION_FAILED = 'REPLICATION_FAILED',
  DELIVERY_TIMEOUT = 'DELIVERY_TIMEOUT',

  // Storage errors
  STORAGE_FAILED = 'STORAGE_FAILED',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',

  // Security errors
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
}
