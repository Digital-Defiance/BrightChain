/**
 * Logging Module for BrightChain
 *
 * This module exports logging utilities for block operations.
 *
 * @module logging
 *
 * @example
 * ```typescript
 * import { BlockLogger, LogLevel, blockLogger } from 'brightchain-lib';
 *
 * // Use the global logger
 * blockLogger.setLevel(LogLevel.DEBUG);
 * blockLogger.info('encrypt', { blockId: '0x123...', recipientCount: 1 });
 *
 * // Or create a custom logger
 * const customLogger = new BlockLogger((entry) => {
 *   // Custom output handling
 *   myLoggingService.log(entry);
 * });
 * ```
 */

export * from './blockLogger';
