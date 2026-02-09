/**
 * @fileoverview Configuration Validation
 *
 * Provides validation functions for availability system configurations.
 * Ensures all configuration values are valid and returns descriptive error messages.
 *
 * @see Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 13.6
 */

import {
  DEFAULT_DISCOVERY_CONFIG,
  DEFAULT_GOSSIP_CONFIG,
  DEFAULT_HEARTBEAT_CONFIG,
  DiscoveryConfig,
  GossipConfig,
  HeartbeatConfig,
} from '@brightchain/brightchain-lib';

/**
 * Configuration validation error.
 * Contains a descriptive error message about what is invalid.
 */
export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validate DiscoveryConfig.
 * Ensures all values are positive and within reasonable ranges.
 *
 * @param config - The discovery configuration to validate
 * @throws {ConfigValidationError} If configuration is invalid
 * @see Requirements 13.1, 13.2, 13.3, 13.6
 */
export function validateDiscoveryConfig(
  config: Partial<DiscoveryConfig>,
): void {
  // Validate queryTimeoutMs
  if (config.queryTimeoutMs !== undefined) {
    if (!Number.isFinite(config.queryTimeoutMs)) {
      throw new ConfigValidationError('queryTimeoutMs must be a finite number');
    }
    if (config.queryTimeoutMs <= 0) {
      throw new ConfigValidationError('queryTimeoutMs must be positive');
    }
    if (config.queryTimeoutMs > 300000) {
      // 5 minutes max
      throw new ConfigValidationError(
        'queryTimeoutMs must not exceed 300000ms (5 minutes)',
      );
    }
  }

  // Validate maxConcurrentQueries
  if (config.maxConcurrentQueries !== undefined) {
    if (!Number.isInteger(config.maxConcurrentQueries)) {
      throw new ConfigValidationError(
        'maxConcurrentQueries must be an integer',
      );
    }
    if (config.maxConcurrentQueries < 1) {
      throw new ConfigValidationError(
        'maxConcurrentQueries must be at least 1',
      );
    }
    if (config.maxConcurrentQueries > 1000) {
      throw new ConfigValidationError(
        'maxConcurrentQueries must not exceed 1000',
      );
    }
  }

  // Validate cacheTtlMs
  if (config.cacheTtlMs !== undefined) {
    if (!Number.isFinite(config.cacheTtlMs)) {
      throw new ConfigValidationError('cacheTtlMs must be a finite number');
    }
    if (config.cacheTtlMs < 0) {
      throw new ConfigValidationError('cacheTtlMs must be non-negative');
    }
    if (config.cacheTtlMs > 86400000) {
      // 24 hours max
      throw new ConfigValidationError(
        'cacheTtlMs must not exceed 86400000ms (24 hours)',
      );
    }
  }

  // Validate bloomFilterFalsePositiveRate
  if (config.bloomFilterFalsePositiveRate !== undefined) {
    if (!Number.isFinite(config.bloomFilterFalsePositiveRate)) {
      throw new ConfigValidationError(
        'bloomFilterFalsePositiveRate must be a finite number',
      );
    }
    if (
      config.bloomFilterFalsePositiveRate <= 0 ||
      config.bloomFilterFalsePositiveRate >= 1
    ) {
      throw new ConfigValidationError(
        'bloomFilterFalsePositiveRate must be between 0 and 1 (exclusive)',
      );
    }
  }

  // Validate bloomFilterHashCount
  if (config.bloomFilterHashCount !== undefined) {
    if (!Number.isInteger(config.bloomFilterHashCount)) {
      throw new ConfigValidationError(
        'bloomFilterHashCount must be an integer',
      );
    }
    if (config.bloomFilterHashCount < 1) {
      throw new ConfigValidationError(
        'bloomFilterHashCount must be at least 1',
      );
    }
    if (config.bloomFilterHashCount > 20) {
      throw new ConfigValidationError(
        'bloomFilterHashCount must not exceed 20',
      );
    }
  }
}

/**
 * Validate GossipConfig.
 * Ensures all values are positive and within reasonable ranges.
 *
 * @param config - The gossip configuration to validate
 * @throws {ConfigValidationError} If configuration is invalid
 * @see Requirements 13.4, 13.6
 */
export function validateGossipConfig(config: Partial<GossipConfig>): void {
  // Validate fanout
  if (config.fanout !== undefined) {
    if (!Number.isInteger(config.fanout)) {
      throw new ConfigValidationError('fanout must be an integer');
    }
    if (config.fanout < 1) {
      throw new ConfigValidationError('fanout must be at least 1');
    }
    if (config.fanout > 100) {
      throw new ConfigValidationError('fanout must not exceed 100');
    }
  }

  // Validate defaultTtl
  if (config.defaultTtl !== undefined) {
    if (!Number.isInteger(config.defaultTtl)) {
      throw new ConfigValidationError('defaultTtl must be an integer');
    }
    if (config.defaultTtl < 0) {
      throw new ConfigValidationError('defaultTtl must be non-negative');
    }
    if (config.defaultTtl > 10) {
      throw new ConfigValidationError('defaultTtl must not exceed 10');
    }
  }

  // Validate batchIntervalMs
  if (config.batchIntervalMs !== undefined) {
    if (!Number.isFinite(config.batchIntervalMs)) {
      throw new ConfigValidationError(
        'batchIntervalMs must be a finite number',
      );
    }
    if (config.batchIntervalMs < 0) {
      throw new ConfigValidationError('batchIntervalMs must be non-negative');
    }
    if (config.batchIntervalMs > 60000) {
      // 1 minute max
      throw new ConfigValidationError(
        'batchIntervalMs must not exceed 60000ms (1 minute)',
      );
    }
  }

  // Validate maxBatchSize
  if (config.maxBatchSize !== undefined) {
    if (!Number.isInteger(config.maxBatchSize)) {
      throw new ConfigValidationError('maxBatchSize must be an integer');
    }
    if (config.maxBatchSize < 1) {
      throw new ConfigValidationError('maxBatchSize must be at least 1');
    }
    if (config.maxBatchSize > 10000) {
      throw new ConfigValidationError('maxBatchSize must not exceed 10000');
    }
  }

  // Validate messagePriority (Req 10.3, 10.4)
  if (config.messagePriority !== undefined) {
    const { normal, high } = config.messagePriority;

    // Validate normal priority fanout
    if (!Number.isInteger(normal.fanout) || normal.fanout < 1) {
      throw new ConfigValidationError(
        'messagePriority.normal.fanout must be a positive integer',
      );
    }

    // Validate normal priority TTL
    if (!Number.isInteger(normal.ttl) || normal.ttl < 1) {
      throw new ConfigValidationError(
        'messagePriority.normal.ttl must be a positive integer',
      );
    }

    // Validate high priority fanout
    if (!Number.isInteger(high.fanout) || high.fanout < 1) {
      throw new ConfigValidationError(
        'messagePriority.high.fanout must be a positive integer',
      );
    }

    // Validate high priority TTL
    if (!Number.isInteger(high.ttl) || high.ttl < 1) {
      throw new ConfigValidationError(
        'messagePriority.high.ttl must be a positive integer',
      );
    }
  }
}

/**
 * Validate HeartbeatConfig.
 * Ensures all values are positive and within reasonable ranges.
 * Also validates that timeoutMs < intervalMs for proper operation.
 *
 * @param config - The heartbeat configuration to validate
 * @throws {ConfigValidationError} If configuration is invalid
 * @see Requirements 13.5, 13.6
 */
export function validateHeartbeatConfig(
  config: Partial<HeartbeatConfig>,
): void {
  // Validate intervalMs
  if (config.intervalMs !== undefined) {
    if (!Number.isFinite(config.intervalMs)) {
      throw new ConfigValidationError('intervalMs must be a finite number');
    }
    if (config.intervalMs <= 0) {
      throw new ConfigValidationError('intervalMs must be positive');
    }
    if (config.intervalMs > 300000) {
      // 5 minutes max
      throw new ConfigValidationError(
        'intervalMs must not exceed 300000ms (5 minutes)',
      );
    }
  }

  // Validate timeoutMs
  if (config.timeoutMs !== undefined) {
    if (!Number.isFinite(config.timeoutMs)) {
      throw new ConfigValidationError('timeoutMs must be a finite number');
    }
    if (config.timeoutMs <= 0) {
      throw new ConfigValidationError('timeoutMs must be positive');
    }
    if (config.timeoutMs > 60000) {
      // 1 minute max
      throw new ConfigValidationError(
        'timeoutMs must not exceed 60000ms (1 minute)',
      );
    }
  }

  // Validate missedThreshold
  if (config.missedThreshold !== undefined) {
    if (!Number.isInteger(config.missedThreshold)) {
      throw new ConfigValidationError('missedThreshold must be an integer');
    }
    if (config.missedThreshold < 1) {
      throw new ConfigValidationError('missedThreshold must be at least 1');
    }
    if (config.missedThreshold > 100) {
      throw new ConfigValidationError('missedThreshold must not exceed 100');
    }
  }

  // Cross-field validation: timeoutMs should be less than intervalMs
  if (
    config.timeoutMs !== undefined &&
    config.intervalMs !== undefined &&
    config.timeoutMs >= config.intervalMs
  ) {
    throw new ConfigValidationError(
      'timeoutMs must be less than intervalMs for proper heartbeat operation',
    );
  }
}

/**
 * Create a validated DiscoveryConfig by merging partial config with defaults.
 * Validates the merged configuration before returning.
 *
 * @param config - Partial configuration to merge with defaults
 * @returns Complete validated configuration
 * @throws {ConfigValidationError} If configuration is invalid
 */
export function createValidatedDiscoveryConfig(
  config: Partial<DiscoveryConfig> = {},
): DiscoveryConfig {
  validateDiscoveryConfig(config);
  return {
    ...DEFAULT_DISCOVERY_CONFIG,
    ...config,
  };
}

/**
 * Create a validated GossipConfig by merging partial config with defaults.
 * Validates the merged configuration before returning.
 *
 * @param config - Partial configuration to merge with defaults
 * @returns Complete validated configuration
 * @throws {ConfigValidationError} If configuration is invalid
 */
export function createValidatedGossipConfig(
  config: Partial<GossipConfig> = {},
): GossipConfig {
  validateGossipConfig(config);
  return {
    ...DEFAULT_GOSSIP_CONFIG,
    ...config,
  };
}

/**
 * Create a validated HeartbeatConfig by merging partial config with defaults.
 * Validates the merged configuration before returning.
 *
 * @param config - Partial configuration to merge with defaults
 * @returns Complete validated configuration
 * @throws {ConfigValidationError} If configuration is invalid
 */
export function createValidatedHeartbeatConfig(
  config: Partial<HeartbeatConfig> = {},
): HeartbeatConfig {
  const merged = {
    ...DEFAULT_HEARTBEAT_CONFIG,
    ...config,
  };
  // Validate the merged config to catch cross-field issues
  validateHeartbeatConfig(merged);
  return merged;
}
