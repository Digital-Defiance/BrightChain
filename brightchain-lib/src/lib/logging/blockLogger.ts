/**
 * Block Logger Module
 *
 * Provides structured logging for block operations in BrightChain.
 * Supports configurable log levels and JSON-formatted output.
 *
 * @module logging/blockLogger
 *
 * @example
 * ```typescript
 * import { BlockLogger, LogLevel } from 'brightchain-lib';
 *
 * const logger = new BlockLogger();
 * logger.setLevel(LogLevel.DEBUG);
 *
 * logger.info('encrypt', { blockId: '0x123...', blockType: 'EncryptedBlock' });
 * logger.error('decrypt', new Error('Decryption failed'), { blockId: '0x456...' });
 * ```
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

/**
 * Log levels for block operations.
 * Ordered from most verbose (DEBUG) to least verbose (ERROR).
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Numeric priority for log levels (higher = more severe).
 * Used for log level filtering.
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Structured log entry for block operations.
 * All entries are JSON-serializable for machine parsing.
 *
 * @see Requirement 8.4 - Structured JSON format
 */
export interface BlockLogEntry {
  /** ISO 8601 timestamp of the log entry */
  timestamp: string;
  /** Log level (debug, info, warn, error) */
  level: LogLevel;
  /** Operation being performed (e.g., 'encrypt', 'decrypt', 'validate') */
  operation: string;
  /** Block ID (hex-encoded checksum) - not sensitive */
  blockId?: string;
  /** Block type name */
  blockType?: string;
  /** Additional metadata (never contains sensitive data) */
  metadata?: Record<string, unknown>;
  /** Error information if applicable */
  error?: {
    /** Error class name */
    type: string;
    /** Error message (sanitized) */
    message: string;
  };
}

/**
 * Interface for block logging operations.
 * Implementations must ensure sensitive data is never logged.
 *
 * @see Requirement 8.6 - No sensitive data in logs
 */
export interface IBlockLogger {
  /**
   * Log a debug-level message.
   * @param operation - The operation being performed
   * @param metadata - Optional metadata (must not contain sensitive data)
   */
  debug(operation: string, metadata?: Record<string, unknown>): void;

  /**
   * Log an info-level message.
   * @param operation - The operation being performed
   * @param metadata - Optional metadata (must not contain sensitive data)
   */
  info(operation: string, metadata?: Record<string, unknown>): void;

  /**
   * Log a warning-level message.
   * @param operation - The operation being performed
   * @param metadata - Optional metadata (must not contain sensitive data)
   */
  warn(operation: string, metadata?: Record<string, unknown>): void;

  /**
   * Log an error-level message.
   * @param operation - The operation being performed
   * @param error - The error that occurred
   * @param metadata - Optional metadata (must not contain sensitive data)
   */
  error(
    operation: string,
    error: Error,
    metadata?: Record<string, unknown>,
  ): void;

  /**
   * Set the minimum log level.
   * Messages below this level will be suppressed.
   * @param level - The minimum log level to emit
   */
  setLevel(level: LogLevel): void;

  /**
   * Get the current log level.
   * @returns The current minimum log level
   */
  getLevel(): LogLevel;
}

/**
 * Default output function that writes to console.
 * @param entry - The log entry to output
 */
function defaultOutput(entry: BlockLogEntry): void {
  const json = JSON.stringify(entry);
  switch (entry.level) {
    case LogLevel.DEBUG:
      console.debug(json);
      break;
    case LogLevel.INFO:
      console.info(json);
      break;
    case LogLevel.WARN:
      console.warn(json);
      break;
    case LogLevel.ERROR:
      console.error(json);
      break;
  }
}

/**
 * Patterns that indicate sensitive data that should never be logged.
 * Used to sanitize metadata before logging.
 */
const SENSITIVE_PATTERNS = [
  /privateKey/i,
  /secretKey/i,
  /password/i,
  /secret/i,
  /credential/i,
  /token/i,
  /apiKey/i,
  /encryptionKey/i,
  /decryptionKey/i,
  /plaintext/i,
  /cleartext/i,
];

/**
 * Check if a key name indicates sensitive data.
 * @param key - The key name to check
 * @returns true if the key indicates sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Check if a value looks like a private key (long hex string in key-related context).
 * @param value - The value to check
 * @param key - Optional key name to check for safe fields
 * @returns true if the value looks like a private key
 */
function looksLikePrivateKey(value: unknown, key?: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Known safe fields that may contain long hex strings (like checksums/block IDs)
  const safeHexFields = ['blockId', 'checksum', 'id', 'hash', 'signature'];
  if (key && safeHexFields.some((safe) => key.toLowerCase().includes(safe.toLowerCase()))) {
    return false;
  }
  
  // Private keys are typically 64+ hex characters
  return /^(0x)?[0-9a-fA-F]{64,}$/.test(value);
}

/**
 * Sanitize metadata to remove any sensitive data.
 * @param metadata - The metadata to sanitize
 * @returns Sanitized metadata safe for logging
 */
function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip sensitive keys entirely
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Check for values that look like private keys (pass key for context)
    if (looksLikePrivateKey(value, key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      // Sanitize array elements
      sanitized[key] = value.map((item) => {
        if (looksLikePrivateKey(item)) {
          return '[REDACTED]';
        }
        if (item !== null && typeof item === 'object') {
          return sanitizeMetadata(item as Record<string, unknown>);
        }
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * BlockLogger implementation with configurable output and log levels.
 *
 * Features:
 * - Structured JSON log entries
 * - Configurable log levels with filtering
 * - Automatic sensitive data sanitization
 * - Configurable output destination
 *
 * @see Requirements 8.4, 8.5, 8.6
 *
 * @example
 * ```typescript
 * // Create logger with custom output
 * const entries: BlockLogEntry[] = [];
 * const logger = new BlockLogger((entry) => entries.push(entry));
 *
 * // Set log level
 * logger.setLevel(LogLevel.WARN);
 *
 * // These will be suppressed
 * logger.debug('operation', { detail: 'value' });
 * logger.info('operation', { detail: 'value' });
 *
 * // These will be logged
 * logger.warn('operation', { detail: 'value' });
 * logger.error('operation', new Error('Failed'), { detail: 'value' });
 * ```
 */
export class BlockLogger implements IBlockLogger {
  private level: LogLevel = LogLevel.INFO;
  private output: (entry: BlockLogEntry) => void;

  /**
   * Create a new BlockLogger.
   * @param output - Optional custom output function. Defaults to console output.
   */
  constructor(output?: (entry: BlockLogEntry) => void) {
    this.output = output ?? defaultOutput;
  }

  /**
   * Set the minimum log level.
   * @param level - The minimum log level to emit
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level.
   * @returns The current minimum log level
   */
  public getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Check if a log level should be emitted based on current level setting.
   * @param level - The level to check
   * @returns true if the level should be emitted
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  /**
   * Create a log entry with common fields.
   * @param level - The log level
   * @param operation - The operation being performed
   * @param metadata - Optional metadata
   * @returns The log entry
   */
  private createEntry(
    level: LogLevel,
    operation: string,
    metadata?: Record<string, unknown>,
  ): BlockLogEntry {
    const sanitizedMetadata = sanitizeMetadata(metadata);

    const entry: BlockLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
    };

    // Extract blockId and blockType from metadata if present
    if (sanitizedMetadata) {
      if (typeof sanitizedMetadata['blockId'] === 'string') {
        entry.blockId = sanitizedMetadata['blockId'];
        delete sanitizedMetadata['blockId'];
      }
      if (typeof sanitizedMetadata['blockType'] === 'string') {
        entry.blockType = sanitizedMetadata['blockType'];
        delete sanitizedMetadata['blockType'];
      }

      // Only include metadata if there are remaining fields
      if (Object.keys(sanitizedMetadata).length > 0) {
        entry.metadata = sanitizedMetadata;
      }
    }

    return entry;
  }

  /**
   * Emit a log entry if the level is enabled.
   * @param entry - The log entry to emit
   */
  private emit(entry: BlockLogEntry): void {
    if (this.shouldLog(entry.level)) {
      try {
        this.output(entry);
      } catch {
        // Never let logging failures affect block operations
        // Silently ignore logging errors
      }
    }
  }

  /**
   * Log a debug-level message.
   * @param operation - The operation being performed
   * @param metadata - Optional metadata (must not contain sensitive data)
   */
  public debug(operation: string, metadata?: Record<string, unknown>): void {
    const entry = this.createEntry(LogLevel.DEBUG, operation, metadata);
    this.emit(entry);
  }

  /**
   * Log an info-level message.
   * @param operation - The operation being performed
   * @param metadata - Optional metadata (must not contain sensitive data)
   */
  public info(operation: string, metadata?: Record<string, unknown>): void {
    const entry = this.createEntry(LogLevel.INFO, operation, metadata);
    this.emit(entry);
  }

  /**
   * Log a warning-level message.
   * @param operation - The operation being performed
   * @param metadata - Optional metadata (must not contain sensitive data)
   */
  public warn(operation: string, metadata?: Record<string, unknown>): void {
    const entry = this.createEntry(LogLevel.WARN, operation, metadata);
    this.emit(entry);
  }

  /**
   * Log an error-level message.
   * @param operation - The operation being performed
   * @param error - The error that occurred
   * @param metadata - Optional metadata (must not contain sensitive data)
   */
  public error(
    operation: string,
    error: Error,
    metadata?: Record<string, unknown>,
  ): void {
    const entry = this.createEntry(LogLevel.ERROR, operation, metadata);
    entry.error = {
      type: error.constructor.name,
      message: error.message,
    };
    this.emit(entry);
  }
}

/**
 * Global block logger instance.
 * Can be used directly or replaced with a custom logger.
 */
export const blockLogger = new BlockLogger();

/**
 * Log a validation failure with error type and metadata.
 * This is a convenience function for block validation operations.
 *
 * @param blockId - The block ID (hex-encoded checksum)
 * @param blockType - The block type name
 * @param error - The validation error
 * @param metadata - Optional additional metadata
 *
 * @see Requirement 8.3 - Validation failure logging
 */
export function logValidationFailure(
  blockId: string | undefined,
  blockType: string | undefined,
  error: Error,
  metadata?: Record<string, unknown>,
): void {
  blockLogger.error('validate', error, {
    blockId,
    blockType,
    errorType: error.constructor.name,
    ...metadata,
  });
}
