/**
 * Error types for message passing system.
 *
 * @remarks
 * Categorizes errors by operation type for better error handling.
 *
 * @see Design Document: Error Handling section
 */
export enum MessageErrorType {
  // Validation errors
  INVALID_RECIPIENT = 'invalid_recipient',
  INVALID_MESSAGE_TYPE = 'invalid_message_type',
  INVALID_PRIORITY = 'invalid_priority',
  INVALID_ENCRYPTION_SCHEME = 'invalid_encryption_scheme',
  MISSING_RECIPIENT_KEYS = 'missing_recipient_keys',
  INVALID_CONTENT_TYPE = 'invalid_content_type',

  // Storage errors
  MESSAGE_TOO_LARGE = 'message_too_large',
  STORAGE_FAILED = 'storage_failed',
  CBL_CREATION_FAILED = 'cbl_creation_failed',

  // Routing errors
  NO_ROUTE_TO_RECIPIENT = 'no_route_to_recipient',
  ROUTING_TIMEOUT = 'routing_timeout',
  DELIVERY_FAILED = 'delivery_failed',

  // Encryption errors
  ENCRYPTION_FAILED = 'encryption_failed',
  MISSING_PUBLIC_KEY = 'missing_public_key',
  INVALID_ENCRYPTION_KEY = 'invalid_encryption_key',

  // Query errors
  MESSAGE_NOT_FOUND = 'message_not_found',
  INVALID_QUERY_PARAMETERS = 'invalid_query_parameters',
  QUERY_TIMEOUT = 'query_timeout',

  // Event errors
  SUBSCRIPTION_FAILED = 'subscription_failed',
  EVENT_EMISSION_FAILED = 'event_emission_failed',
}
