/**
 * Security event types for audit logging
 */
export enum SecurityEventType {
  // Authentication & Authorization
  AuthenticationAttempt = 'AUTH_ATTEMPT',
  AuthenticationSuccess = 'AUTH_SUCCESS',
  AuthenticationFailure = 'AUTH_FAILURE',

  // Signature Operations
  SignatureValidationSuccess = 'SIG_VALID',
  SignatureValidationFailure = 'SIG_INVALID',
  SignatureCreated = 'SIG_CREATED',

  // Block Operations
  BlockCreated = 'BLOCK_CREATED',
  BlockValidated = 'BLOCK_VALIDATED',
  BlockValidationFailed = 'BLOCK_VALIDATION_FAILED',

  // Encryption Operations
  EncryptionPerformed = 'ENCRYPTED',
  DecryptionPerformed = 'DECRYPTED',
  DecryptionFailed = 'DECRYPT_FAILED',

  // Access Control
  AccessDenied = 'ACCESS_DENIED',
  UnauthorizedAccess = 'UNAUTHORIZED',

  // Rate Limiting
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',

  // Security Violations
  InvalidInput = 'INVALID_INPUT',
  SuspiciousActivity = 'SUSPICIOUS',
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  Info = 'INFO',
  Warning = 'WARNING',
  Error = 'ERROR',
  Critical = 'CRITICAL',
}

/**
 * Security event data structure
 */
export interface SecurityEvent {
  timestamp: Date;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  message: string;
  correlationId?: string;
  userId?: string;
  blockId?: string;
  metadata?: Record<string, unknown>;
}
