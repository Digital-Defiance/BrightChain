import fc from 'fast-check';
import {
  BlockLogEntry,
  BlockLogger,
  LogLevel,
  blockLogger,
} from './blockLogger';

/**
 * Helper to generate hex strings using fast-check
 */
const hexString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength, maxLength })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Property-based tests for block logging operations
 * Feature: block-security-hardening
 * Validates Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

/**
 * Property 10: Log Entry Structure
 * For any block operation that triggers logging, the log entry SHALL be valid JSON
 * containing timestamp, level, operation, and optionally blockId, blockType, and metadata.
 *
 * Validates Requirements 8.1, 8.2, 8.3, 8.4
 */
describe('Feature: block-security-hardening, Property 10: Log Entry Structure', () => {
  /**
   * Property 10a: Log entries contain required fields
   * All log entries must have timestamp, level, and operation fields.
   */
  it('Property 10a: Log entries contain required fields', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          LogLevel.DEBUG,
          LogLevel.INFO,
          LogLevel.WARN,
          LogLevel.ERROR,
        ),
        fc.string({ minLength: 1, maxLength: 50 }),
        (level, operation) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG); // Ensure all levels are logged

          switch (level) {
            case LogLevel.DEBUG:
              logger.debug(operation);
              break;
            case LogLevel.INFO:
              logger.info(operation);
              break;
            case LogLevel.WARN:
              logger.warn(operation);
              break;
            case LogLevel.ERROR:
              logger.error(operation, new Error('Test error'));
              break;
          }

          expect(entries.length).toBe(1);
          const entry = entries[0];

          // Required fields
          expect(entry.timestamp).toBeDefined();
          expect(typeof entry.timestamp).toBe('string');
          expect(entry.level).toBe(level);
          expect(entry.operation).toBe(operation);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10b: Timestamps are valid ISO 8601 format
   * All timestamps must be parseable as valid dates.
   */
  it('Property 10b: Timestamps are valid ISO 8601 format', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (operation) => {
        const entries: BlockLogEntry[] = [];
        const logger = new BlockLogger((entry) => entries.push(entry));
        logger.setLevel(LogLevel.DEBUG);

        logger.info(operation);

        expect(entries.length).toBe(1);
        const timestamp = entries[0].timestamp;

        // Should be parseable as a date
        const date = new Date(timestamp);
        expect(date.toString()).not.toBe('Invalid Date');

        // Should be in ISO 8601 format
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10c: Log entries are valid JSON
   * All log entries must be serializable to valid JSON.
   */
  it('Property 10c: Log entries are valid JSON', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.record({
          blockId: hexString(8, 64),
          blockType: fc.string({ minLength: 1, maxLength: 30 }),
          count: fc.integer({ min: 0, max: 1000 }),
        }),
        (operation, metadata) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG);

          logger.info(operation, metadata);

          expect(entries.length).toBe(1);

          // Should be serializable to JSON
          const json = JSON.stringify(entries[0]);
          expect(typeof json).toBe('string');

          // Should be parseable back
          const parsed = JSON.parse(json);
          expect(parsed.operation).toBe(operation);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10d: Error entries include error type and message
   * Error log entries must include error.type and error.message fields.
   */
  it('Property 10d: Error entries include error type and message', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (operation, errorMessage) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG);

          const error = new Error(errorMessage);
          logger.error(operation, error);

          expect(entries.length).toBe(1);
          const entry = entries[0];

          expect(entry.error).toBeDefined();
          expect(entry.error?.type).toBe('Error');
          expect(entry.error?.message).toBe(errorMessage);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10e: BlockId and blockType are extracted from metadata
   * When metadata contains blockId or blockType, they are promoted to top-level fields.
   */
  it('Property 10e: BlockId and blockType are extracted from metadata', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        hexString(8, 64),
        fc.string({ minLength: 1, maxLength: 30 }),
        (operation, blockId, blockType) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG);

          logger.info(operation, { blockId, blockType, otherField: 'value' });

          expect(entries.length).toBe(1);
          const entry = entries[0];

          // blockId and blockType should be top-level
          expect(entry.blockId).toBe(blockId);
          expect(entry.blockType).toBe(blockType);

          // They should not be in metadata
          expect(entry.metadata?.['blockId']).toBeUndefined();
          expect(entry.metadata?.['blockType']).toBeUndefined();

          // Other fields should remain in metadata
          expect(entry.metadata?.['otherField']).toBe('value');
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 11: Log Level Filtering
 * For any log level setting, only log entries at or above that level SHALL be emitted.
 * Setting level to ERROR SHALL suppress DEBUG, INFO, and WARN entries.
 *
 * Validates Requirements 8.5
 */
describe('Feature: block-security-hardening, Property 11: Log Level Filtering', () => {
  /**
   * Property 11a: DEBUG level logs all messages
   * When level is DEBUG, all log levels should be emitted.
   */
  it('Property 11a: DEBUG level logs all messages', () => {
    const entries: BlockLogEntry[] = [];
    const logger = new BlockLogger((entry) => entries.push(entry));
    logger.setLevel(LogLevel.DEBUG);

    logger.debug('debug-op');
    logger.info('info-op');
    logger.warn('warn-op');
    logger.error('error-op', new Error('test'));

    expect(entries.length).toBe(4);
    expect(entries.map((e) => e.level)).toEqual([
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ]);
  });

  /**
   * Property 11b: INFO level suppresses DEBUG
   * When level is INFO, DEBUG messages should be suppressed.
   */
  it('Property 11b: INFO level suppresses DEBUG', () => {
    const entries: BlockLogEntry[] = [];
    const logger = new BlockLogger((entry) => entries.push(entry));
    logger.setLevel(LogLevel.INFO);

    logger.debug('debug-op');
    logger.info('info-op');
    logger.warn('warn-op');
    logger.error('error-op', new Error('test'));

    expect(entries.length).toBe(3);
    expect(entries.map((e) => e.level)).toEqual([
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ]);
  });

  /**
   * Property 11c: WARN level suppresses DEBUG and INFO
   * When level is WARN, DEBUG and INFO messages should be suppressed.
   */
  it('Property 11c: WARN level suppresses DEBUG and INFO', () => {
    const entries: BlockLogEntry[] = [];
    const logger = new BlockLogger((entry) => entries.push(entry));
    logger.setLevel(LogLevel.WARN);

    logger.debug('debug-op');
    logger.info('info-op');
    logger.warn('warn-op');
    logger.error('error-op', new Error('test'));

    expect(entries.length).toBe(2);
    expect(entries.map((e) => e.level)).toEqual([
      LogLevel.WARN,
      LogLevel.ERROR,
    ]);
  });

  /**
   * Property 11d: ERROR level suppresses DEBUG, INFO, and WARN
   * When level is ERROR, only ERROR messages should be emitted.
   */
  it('Property 11d: ERROR level suppresses DEBUG, INFO, and WARN', () => {
    const entries: BlockLogEntry[] = [];
    const logger = new BlockLogger((entry) => entries.push(entry));
    logger.setLevel(LogLevel.ERROR);

    logger.debug('debug-op');
    logger.info('info-op');
    logger.warn('warn-op');
    logger.error('error-op', new Error('test'));

    expect(entries.length).toBe(1);
    expect(entries[0].level).toBe(LogLevel.ERROR);
  });

  /**
   * Property 11e: Level filtering is consistent across random operations
   * For any sequence of log operations, filtering should be consistent.
   */
  it('Property 11e: Level filtering is consistent across random operations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          LogLevel.DEBUG,
          LogLevel.INFO,
          LogLevel.WARN,
          LogLevel.ERROR,
        ),
        fc.array(
          fc.record({
            level: fc.constantFrom(
              LogLevel.DEBUG,
              LogLevel.INFO,
              LogLevel.WARN,
              LogLevel.ERROR,
            ),
            operation: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (minLevel, operations) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(minLevel);

          const levelPriority: Record<LogLevel, number> = {
            [LogLevel.DEBUG]: 0,
            [LogLevel.INFO]: 1,
            [LogLevel.WARN]: 2,
            [LogLevel.ERROR]: 3,
          };

          const minPriority = levelPriority[minLevel];

          for (const op of operations) {
            switch (op.level) {
              case LogLevel.DEBUG:
                logger.debug(op.operation);
                break;
              case LogLevel.INFO:
                logger.info(op.operation);
                break;
              case LogLevel.WARN:
                logger.warn(op.operation);
                break;
              case LogLevel.ERROR:
                logger.error(op.operation, new Error('test'));
                break;
            }
          }

          // Count expected entries
          const expectedCount = operations.filter(
            (op) => levelPriority[op.level] >= minPriority,
          ).length;

          expect(entries.length).toBe(expectedCount);

          // All entries should be at or above min level
          for (const entry of entries) {
            expect(levelPriority[entry.level]).toBeGreaterThanOrEqual(
              minPriority,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11f: getLevel returns current level
   * The getLevel method should return the currently set level.
   */
  it('Property 11f: getLevel returns current level', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          LogLevel.DEBUG,
          LogLevel.INFO,
          LogLevel.WARN,
          LogLevel.ERROR,
        ),
        (level) => {
          const logger = new BlockLogger();
          logger.setLevel(level);
          expect(logger.getLevel()).toBe(level);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 12: Sensitive Data Exclusion from Logs
 * For any log entry produced by block operations, the entry SHALL NOT contain
 * patterns matching private keys, plaintext content, or encryption keys.
 *
 * Validates Requirements 8.6
 */
describe('Feature: block-security-hardening, Property 12: Sensitive Data Exclusion from Logs', () => {
  /**
   * Property 12a: Private key fields are redacted
   * Fields with names indicating private keys should be redacted.
   */
  it('Property 12a: Private key fields are redacted', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'privateKey',
          'secretKey',
          'encryptionKey',
          'decryptionKey',
        ),
        hexString(64, 128),
        (keyField, keyValue) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG);

          const metadata: Record<string, unknown> = {
            [keyField]: keyValue,
            safeField: 'safe-value',
          };

          logger.info('operation', metadata);

          expect(entries.length).toBe(1);
          const entry = entries[0];

          // Sensitive field should be redacted
          expect(entry.metadata?.[keyField]).toBe('[REDACTED]');

          // Safe field should remain
          expect(entry.metadata?.['safeField']).toBe('safe-value');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12b: Long hex strings in key-related contexts are redacted
   * Values that look like private keys (64+ hex chars) should be redacted,
   * EXCEPT for known safe fields like blockId, checksum, hash, etc.
   */
  it('Property 12b: Long hex strings that look like keys are redacted (except safe fields)', () => {
    fc.assert(
      fc.property(hexString(64, 128), (hexValue) => {
        const entries: BlockLogEntry[] = [];
        const logger = new BlockLogger((entry) => entries.push(entry));
        logger.setLevel(LogLevel.DEBUG);

        // In a non-safe field name, long hex strings should be redacted
        logger.info('operation', { someRandomValue: hexValue });

        expect(entries.length).toBe(1);
        const entry = entries[0];

        // Long hex string in non-safe field should be redacted
        expect(entry.metadata?.['someRandomValue']).toBe('[REDACTED]');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12b2: Safe hex fields are NOT redacted
   * Fields like blockId, checksum, hash should preserve long hex strings.
   */
  it('Property 12b2: Safe hex fields (blockId, checksum, hash) are NOT redacted', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('blockId', 'checksum', 'hash', 'transactionId'),
        hexString(64, 128),
        (safeField, hexValue) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG);

          // Safe fields should NOT be redacted even with long hex strings
          const metadata: Record<string, unknown> = {
            [safeField]: hexValue,
          };
          logger.info('operation', metadata);

          expect(entries.length).toBe(1);
          const entry = entries[0];

          // For blockId, it gets extracted to top-level
          if (safeField === 'blockId') {
            expect(entry.blockId).toBe(hexValue);
          } else {
            // Other safe fields should be preserved in metadata
            expect(entry.metadata?.[safeField]).toBe(hexValue);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12c: Password and secret fields are redacted
   * Fields with names containing password, secret, token, etc. should be redacted.
   */
  it('Property 12c: Password and secret fields are redacted', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('password', 'secret', 'token', 'apiKey', 'credential'),
        fc.string({ minLength: 1, maxLength: 50 }),
        (sensitiveField, value) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG);

          const metadata: Record<string, unknown> = {
            [sensitiveField]: value,
            normalField: 'normal-value',
          };

          logger.info('operation', metadata);

          expect(entries.length).toBe(1);
          const entry = entries[0];

          // Sensitive field should be redacted
          expect(entry.metadata?.[sensitiveField]).toBe('[REDACTED]');

          // Normal field should remain
          expect(entry.metadata?.['normalField']).toBe('normal-value');
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12d: Nested sensitive data is redacted
   * Sensitive data in nested objects should also be redacted.
   */
  it('Property 12d: Nested sensitive data is redacted', () => {
    fc.assert(
      fc.property(hexString(64, 128), (keyValue) => {
        const entries: BlockLogEntry[] = [];
        const logger = new BlockLogger((entry) => entries.push(entry));
        logger.setLevel(LogLevel.DEBUG);

        const metadata = {
          nested: {
            privateKey: keyValue,
            safeField: 'safe',
          },
        };

        logger.info('operation', metadata);

        expect(entries.length).toBe(1);
        const entry = entries[0];

        // Nested sensitive field should be redacted
        const nested = entry.metadata?.['nested'] as Record<string, unknown>;
        expect(nested?.['privateKey']).toBe('[REDACTED]');
        expect(nested?.['safeField']).toBe('safe');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12e: Arrays with sensitive data are sanitized
   * Sensitive data in arrays should be redacted.
   */
  it('Property 12e: Arrays with sensitive data are sanitized', () => {
    fc.assert(
      fc.property(
        fc.array(hexString(64, 128), {
          minLength: 1,
          maxLength: 5,
        }),
        (keyValues) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG);

          logger.info('operation', { keys: keyValues });

          expect(entries.length).toBe(1);
          const entry = entries[0];

          // All array elements should be redacted
          const keys = entry.metadata?.['keys'] as string[];
          expect(keys).toBeDefined();
          expect(keys.every((k) => k === '[REDACTED]')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12f: Safe data is preserved
   * Non-sensitive data should be preserved in logs.
   */
  it('Property 12f: Safe data is preserved', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.boolean(),
        (stringValue, intValue, boolValue) => {
          const entries: BlockLogEntry[] = [];
          const logger = new BlockLogger((entry) => entries.push(entry));
          logger.setLevel(LogLevel.DEBUG);

          const metadata = {
            name: stringValue,
            count: intValue,
            enabled: boolValue,
          };

          logger.info('operation', metadata);

          expect(entries.length).toBe(1);
          const entry = entries[0];

          // Safe data should be preserved
          expect(entry.metadata?.['name']).toBe(stringValue);
          expect(entry.metadata?.['count']).toBe(intValue);
          expect(entry.metadata?.['enabled']).toBe(boolValue);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12g: Short hex strings are not redacted
   * Short hex strings (like block IDs) should not be redacted.
   */
  it('Property 12g: Short hex strings are not redacted', () => {
    fc.assert(
      fc.property(hexString(8, 63), (shortHex) => {
        const entries: BlockLogEntry[] = [];
        const logger = new BlockLogger((entry) => entries.push(entry));
        logger.setLevel(LogLevel.DEBUG);

        logger.info('operation', { checksum: shortHex });

        expect(entries.length).toBe(1);
        const entry = entries[0];

        // Short hex strings should be preserved
        expect(entry.metadata?.['checksum']).toBe(shortHex);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Additional tests for global logger instance
 */
describe('Feature: block-security-hardening, Global Logger Instance', () => {
  it('Global blockLogger instance is available', () => {
    expect(blockLogger).toBeDefined();
    expect(blockLogger).toBeInstanceOf(BlockLogger);
  });

  it('Global blockLogger can be configured', () => {
    const originalLevel = blockLogger.getLevel();

    blockLogger.setLevel(LogLevel.ERROR);
    expect(blockLogger.getLevel()).toBe(LogLevel.ERROR);

    // Restore original level
    blockLogger.setLevel(originalLevel);
  });
});
