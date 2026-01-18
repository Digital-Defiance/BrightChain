/**
 * @fileoverview Property-based tests for Configuration Validation
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 27: Configuration Validation
 *
 * **Validates: Requirements 13.6**
 */

import {
  DEFAULT_DISCOVERY_CONFIG,
  DEFAULT_GOSSIP_CONFIG,
  DEFAULT_HEARTBEAT_CONFIG,
  DiscoveryConfig,
  GossipConfig,
  HeartbeatConfig,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import {
  ConfigValidationError,
  createValidatedDiscoveryConfig,
  createValidatedGossipConfig,
  createValidatedHeartbeatConfig,
  validateDiscoveryConfig,
  validateGossipConfig,
  validateHeartbeatConfig,
} from './configValidation';

/**
 * Arbitrary for valid DiscoveryConfig
 */
const arbValidDiscoveryConfig = fc.record({
  queryTimeoutMs: fc.integer({ min: 1, max: 300000 }),
  maxConcurrentQueries: fc.integer({ min: 1, max: 1000 }),
  cacheTtlMs: fc.integer({ min: 0, max: 86400000 }),
  bloomFilterFalsePositiveRate: fc.double({
    min: 0.0001,
    max: 0.9999,
    noNaN: true,
  }),
  bloomFilterHashCount: fc.integer({ min: 1, max: 20 }),
});

/**
 * Arbitrary for valid GossipConfig
 */
const arbValidGossipConfig = fc.record({
  fanout: fc.integer({ min: 1, max: 100 }),
  defaultTtl: fc.integer({ min: 0, max: 10 }),
  batchIntervalMs: fc.integer({ min: 0, max: 60000 }),
  maxBatchSize: fc.integer({ min: 1, max: 10000 }),
});

/**
 * Arbitrary for valid HeartbeatConfig
 */
const arbValidHeartbeatConfig = fc
  .record({
    intervalMs: fc.integer({ min: 100, max: 300000 }),
    timeoutMs: fc.integer({ min: 1, max: 60000 }),
    missedThreshold: fc.integer({ min: 1, max: 100 }),
  })
  .filter((config) => config.timeoutMs < config.intervalMs);

/**
 * Arbitrary for invalid DiscoveryConfig (one invalid field)
 */
const arbInvalidDiscoveryConfig = fc.oneof(
  // Invalid queryTimeoutMs
  fc.record({
    queryTimeoutMs: fc.oneof(
      fc.constant(-1),
      fc.constant(0),
      fc.constant(300001),
      fc.constant(NaN),
      fc.constant(Infinity),
    ),
  }),
  // Invalid maxConcurrentQueries
  fc.record({
    maxConcurrentQueries: fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.constant(1001),
      fc.constant(1.5),
    ),
  }),
  // Invalid cacheTtlMs
  fc.record({
    cacheTtlMs: fc.oneof(
      fc.constant(-1),
      fc.constant(86400001),
      fc.constant(NaN),
      fc.constant(Infinity),
    ),
  }),
  // Invalid bloomFilterFalsePositiveRate
  fc.record({
    bloomFilterFalsePositiveRate: fc.oneof(
      fc.constant(0),
      fc.constant(1),
      fc.constant(-0.1),
      fc.constant(1.1),
      fc.constant(NaN),
    ),
  }),
  // Invalid bloomFilterHashCount
  fc.record({
    bloomFilterHashCount: fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.constant(21),
      fc.constant(1.5),
    ),
  }),
);

/**
 * Arbitrary for invalid GossipConfig (one invalid field)
 */
const arbInvalidGossipConfig = fc.oneof(
  // Invalid fanout
  fc.record({
    fanout: fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.constant(101),
      fc.constant(1.5),
    ),
  }),
  // Invalid defaultTtl
  fc.record({
    defaultTtl: fc.oneof(fc.constant(-1), fc.constant(11), fc.constant(1.5)),
  }),
  // Invalid batchIntervalMs
  fc.record({
    batchIntervalMs: fc.oneof(
      fc.constant(-1),
      fc.constant(60001),
      fc.constant(NaN),
      fc.constant(Infinity),
    ),
  }),
  // Invalid maxBatchSize
  fc.record({
    maxBatchSize: fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.constant(10001),
      fc.constant(1.5),
    ),
  }),
);

/**
 * Arbitrary for invalid HeartbeatConfig (one invalid field or cross-field violation)
 */
const arbInvalidHeartbeatConfig = fc.oneof(
  // Invalid intervalMs
  fc.record({
    intervalMs: fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.constant(300001),
      fc.constant(NaN),
      fc.constant(Infinity),
    ),
  }),
  // Invalid timeoutMs
  fc.record({
    timeoutMs: fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.constant(60001),
      fc.constant(NaN),
      fc.constant(Infinity),
    ),
  }),
  // Invalid missedThreshold
  fc.record({
    missedThreshold: fc.oneof(
      fc.constant(0),
      fc.constant(-1),
      fc.constant(101),
      fc.constant(1.5),
    ),
  }),
  // Cross-field violation: timeoutMs >= intervalMs
  fc
    .record({
      intervalMs: fc.integer({ min: 100, max: 10000 }),
      timeoutMs: fc.integer({ min: 100, max: 10000 }),
    })
    .filter((config) => config.timeoutMs >= config.intervalMs),
);

describe('Configuration Validation Property Tests', () => {
  describe('Property 27: Configuration Validation', () => {
    /**
     * **Feature: block-availability-discovery, Property 27: Configuration Validation**
     *
     * *For any* invalid configuration (negative timeouts, zero fanout, etc.),
     * the system SHALL reject the configuration with a descriptive error message.
     *
     * **Validates: Requirements 13.6**
     */

    describe('DiscoveryConfig Validation', () => {
      it('should accept all valid DiscoveryConfig values', () => {
        fc.assert(
          fc.property(arbValidDiscoveryConfig, (config) => {
            // Should not throw
            expect(() => validateDiscoveryConfig(config)).not.toThrow();
          }),
          { numRuns: 100 },
        );
      });

      it('should reject all invalid DiscoveryConfig values with descriptive errors', () => {
        fc.assert(
          fc.property(arbInvalidDiscoveryConfig, (config) => {
            // Should throw ConfigValidationError
            expect(() => validateDiscoveryConfig(config)).toThrow(
              ConfigValidationError,
            );

            // Error message should be descriptive (not empty)
            try {
              validateDiscoveryConfig(config);
              fail('Expected ConfigValidationError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(ConfigValidationError);
              expect((error as ConfigValidationError).message).toBeTruthy();
              expect(
                (error as ConfigValidationError).message.length,
              ).toBeGreaterThan(10);
            }
          }),
          { numRuns: 100 },
        );
      });

      it('should create valid config by merging with defaults', () => {
        fc.assert(
          fc.property(
            fc.record({
              queryTimeoutMs: fc.option(fc.integer({ min: 1, max: 300000 }), {
                nil: undefined,
              }),
              maxConcurrentQueries: fc.option(
                fc.integer({ min: 1, max: 1000 }),
                {
                  nil: undefined,
                },
              ),
              cacheTtlMs: fc.option(fc.integer({ min: 0, max: 86400000 }), {
                nil: undefined,
              }),
              bloomFilterFalsePositiveRate: fc.option(
                fc.double({ min: 0.0001, max: 0.9999, noNaN: true }),
                {
                  nil: undefined,
                },
              ),
              bloomFilterHashCount: fc.option(fc.integer({ min: 1, max: 20 }), {
                nil: undefined,
              }),
            }),
            (partialConfig) => {
              // Remove undefined values to avoid overriding defaults
              const cleanConfig = Object.fromEntries(
                Object.entries(partialConfig).filter(
                  ([_, v]) => v !== undefined,
                ),
              ) as Partial<DiscoveryConfig>;

              const config = createValidatedDiscoveryConfig(cleanConfig);

              // All fields should be defined
              expect(config.queryTimeoutMs).toBeDefined();
              expect(config.maxConcurrentQueries).toBeDefined();
              expect(config.cacheTtlMs).toBeDefined();
              expect(config.bloomFilterFalsePositiveRate).toBeDefined();
              expect(config.bloomFilterHashCount).toBeDefined();

              // Provided values should be preserved
              if (cleanConfig.queryTimeoutMs !== undefined) {
                expect(config.queryTimeoutMs).toBe(cleanConfig.queryTimeoutMs);
              }
              if (cleanConfig.maxConcurrentQueries !== undefined) {
                expect(config.maxConcurrentQueries).toBe(
                  cleanConfig.maxConcurrentQueries,
                );
              }
              if (cleanConfig.cacheTtlMs !== undefined) {
                expect(config.cacheTtlMs).toBe(cleanConfig.cacheTtlMs);
              }
              if (cleanConfig.bloomFilterFalsePositiveRate !== undefined) {
                expect(config.bloomFilterFalsePositiveRate).toBe(
                  cleanConfig.bloomFilterFalsePositiveRate,
                );
              }
              if (cleanConfig.bloomFilterHashCount !== undefined) {
                expect(config.bloomFilterHashCount).toBe(
                  cleanConfig.bloomFilterHashCount,
                );
              }
            },
          ),
          { numRuns: 100 },
        );
      });
    });

    describe('GossipConfig Validation', () => {
      it('should accept all valid GossipConfig values', () => {
        fc.assert(
          fc.property(arbValidGossipConfig, (config) => {
            // Should not throw
            expect(() => validateGossipConfig(config)).not.toThrow();
          }),
          { numRuns: 100 },
        );
      });

      it('should reject all invalid GossipConfig values with descriptive errors', () => {
        fc.assert(
          fc.property(arbInvalidGossipConfig, (config) => {
            // Should throw ConfigValidationError
            expect(() => validateGossipConfig(config)).toThrow(
              ConfigValidationError,
            );

            // Error message should be descriptive (not empty)
            try {
              validateGossipConfig(config);
              fail('Expected ConfigValidationError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(ConfigValidationError);
              expect((error as ConfigValidationError).message).toBeTruthy();
              expect(
                (error as ConfigValidationError).message.length,
              ).toBeGreaterThan(10);
            }
          }),
          { numRuns: 100 },
        );
      });

      it('should create valid config by merging with defaults', () => {
        fc.assert(
          fc.property(
            fc.record({
              fanout: fc.option(fc.integer({ min: 1, max: 100 }), {
                nil: undefined,
              }),
              defaultTtl: fc.option(fc.integer({ min: 0, max: 10 }), {
                nil: undefined,
              }),
              batchIntervalMs: fc.option(fc.integer({ min: 0, max: 60000 }), {
                nil: undefined,
              }),
              maxBatchSize: fc.option(fc.integer({ min: 1, max: 10000 }), {
                nil: undefined,
              }),
            }),
            (partialConfig) => {
              // Remove undefined values to avoid overriding defaults
              const cleanConfig = Object.fromEntries(
                Object.entries(partialConfig).filter(
                  ([_, v]) => v !== undefined,
                ),
              ) as Partial<GossipConfig>;

              const config = createValidatedGossipConfig(cleanConfig);

              // All fields should be defined
              expect(config.fanout).toBeDefined();
              expect(config.defaultTtl).toBeDefined();
              expect(config.batchIntervalMs).toBeDefined();
              expect(config.maxBatchSize).toBeDefined();

              // Provided values should be preserved
              if (cleanConfig.fanout !== undefined) {
                expect(config.fanout).toBe(cleanConfig.fanout);
              }
              if (cleanConfig.defaultTtl !== undefined) {
                expect(config.defaultTtl).toBe(cleanConfig.defaultTtl);
              }
              if (cleanConfig.batchIntervalMs !== undefined) {
                expect(config.batchIntervalMs).toBe(
                  cleanConfig.batchIntervalMs,
                );
              }
              if (cleanConfig.maxBatchSize !== undefined) {
                expect(config.maxBatchSize).toBe(cleanConfig.maxBatchSize);
              }
            },
          ),
          { numRuns: 100 },
        );
      });
    });

    describe('HeartbeatConfig Validation', () => {
      it('should accept all valid HeartbeatConfig values', () => {
        fc.assert(
          fc.property(arbValidHeartbeatConfig, (config) => {
            // Should not throw
            expect(() => validateHeartbeatConfig(config)).not.toThrow();
          }),
          { numRuns: 100 },
        );
      });

      it('should reject all invalid HeartbeatConfig values with descriptive errors', () => {
        fc.assert(
          fc.property(arbInvalidHeartbeatConfig, (config) => {
            // Should throw ConfigValidationError
            expect(() => validateHeartbeatConfig(config)).toThrow(
              ConfigValidationError,
            );

            // Error message should be descriptive (not empty)
            try {
              validateHeartbeatConfig(config);
              fail('Expected ConfigValidationError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(ConfigValidationError);
              expect((error as ConfigValidationError).message).toBeTruthy();
              expect(
                (error as ConfigValidationError).message.length,
              ).toBeGreaterThan(10);
            }
          }),
          { numRuns: 100 },
        );
      });

      it('should create valid config by merging with defaults', () => {
        fc.assert(
          fc.property(
            fc
              .record({
                intervalMs: fc.option(fc.integer({ min: 100, max: 300000 }), {
                  nil: undefined,
                }),
                timeoutMs: fc.option(fc.integer({ min: 1, max: 60000 }), {
                  nil: undefined,
                }),
                missedThreshold: fc.option(fc.integer({ min: 1, max: 100 }), {
                  nil: undefined,
                }),
              })
              .filter((config) => {
                // Ensure cross-field validation passes
                if (
                  config.intervalMs !== undefined &&
                  config.timeoutMs !== undefined
                ) {
                  return config.timeoutMs < config.intervalMs;
                }
                // If only one is defined, check against defaults
                if (
                  config.intervalMs !== undefined &&
                  config.timeoutMs === undefined
                ) {
                  return DEFAULT_HEARTBEAT_CONFIG.timeoutMs < config.intervalMs;
                }
                if (
                  config.timeoutMs !== undefined &&
                  config.intervalMs === undefined
                ) {
                  return config.timeoutMs < DEFAULT_HEARTBEAT_CONFIG.intervalMs;
                }
                return true;
              }),
            (partialConfig) => {
              // Remove undefined values to avoid overriding defaults
              const cleanConfig = Object.fromEntries(
                Object.entries(partialConfig).filter(
                  ([_, v]) => v !== undefined,
                ),
              ) as Partial<HeartbeatConfig>;

              const config = createValidatedHeartbeatConfig(cleanConfig);

              // All fields should be defined
              expect(config.intervalMs).toBeDefined();
              expect(config.timeoutMs).toBeDefined();
              expect(config.missedThreshold).toBeDefined();

              // Cross-field validation should pass
              expect(config.timeoutMs).toBeLessThan(config.intervalMs);

              // Provided values should be preserved
              if (cleanConfig.intervalMs !== undefined) {
                expect(config.intervalMs).toBe(cleanConfig.intervalMs);
              }
              if (cleanConfig.timeoutMs !== undefined) {
                expect(config.timeoutMs).toBe(cleanConfig.timeoutMs);
              }
              if (cleanConfig.missedThreshold !== undefined) {
                expect(config.missedThreshold).toBe(
                  cleanConfig.missedThreshold,
                );
              }
            },
          ),
          { numRuns: 100 },
        );
      });

      it('should reject config where timeoutMs >= intervalMs', () => {
        fc.assert(
          fc.property(
            fc
              .record({
                intervalMs: fc.integer({ min: 100, max: 10000 }),
                timeoutMs: fc.integer({ min: 100, max: 10000 }),
              })
              .filter((config) => config.timeoutMs >= config.intervalMs),
            (config) => {
              expect(() => validateHeartbeatConfig(config)).toThrow(
                ConfigValidationError,
              );
              expect(() => validateHeartbeatConfig(config)).toThrow(
                /timeoutMs must be less than intervalMs/,
              );
            },
          ),
          { numRuns: 100 },
        );
      });
    });

    describe('Edge Cases', () => {
      it('should accept empty partial configs and use defaults', () => {
        expect(() => createValidatedDiscoveryConfig({})).not.toThrow();
        expect(() => createValidatedGossipConfig({})).not.toThrow();
        expect(() => createValidatedHeartbeatConfig({})).not.toThrow();

        const discoveryConfig = createValidatedDiscoveryConfig({});
        expect(discoveryConfig).toEqual(DEFAULT_DISCOVERY_CONFIG);

        const gossipConfig = createValidatedGossipConfig({});
        expect(gossipConfig).toEqual(DEFAULT_GOSSIP_CONFIG);

        const heartbeatConfig = createValidatedHeartbeatConfig({});
        expect(heartbeatConfig).toEqual(DEFAULT_HEARTBEAT_CONFIG);
      });

      it('should handle boundary values correctly', () => {
        // Minimum valid values
        expect(() =>
          validateDiscoveryConfig({
            queryTimeoutMs: 1,
            maxConcurrentQueries: 1,
            cacheTtlMs: 0,
            bloomFilterFalsePositiveRate: 0.0001,
            bloomFilterHashCount: 1,
          }),
        ).not.toThrow();

        expect(() =>
          validateGossipConfig({
            fanout: 1,
            defaultTtl: 0,
            batchIntervalMs: 0,
            maxBatchSize: 1,
          }),
        ).not.toThrow();

        expect(() =>
          validateHeartbeatConfig({
            intervalMs: 100,
            timeoutMs: 1,
            missedThreshold: 1,
          }),
        ).not.toThrow();

        // Maximum valid values
        expect(() =>
          validateDiscoveryConfig({
            queryTimeoutMs: 300000,
            maxConcurrentQueries: 1000,
            cacheTtlMs: 86400000,
            bloomFilterFalsePositiveRate: 0.9999,
            bloomFilterHashCount: 20,
          }),
        ).not.toThrow();

        expect(() =>
          validateGossipConfig({
            fanout: 100,
            defaultTtl: 10,
            batchIntervalMs: 60000,
            maxBatchSize: 10000,
          }),
        ).not.toThrow();

        expect(() =>
          validateHeartbeatConfig({
            intervalMs: 300000,
            timeoutMs: 60000,
            missedThreshold: 100,
          }),
        ).not.toThrow();
      });

      it('should reject values just outside valid ranges', () => {
        // Just below minimum
        expect(() => validateDiscoveryConfig({ queryTimeoutMs: 0 })).toThrow();
        expect(() =>
          validateDiscoveryConfig({ maxConcurrentQueries: 0 }),
        ).toThrow();
        expect(() => validateDiscoveryConfig({ cacheTtlMs: -1 })).toThrow();
        expect(() =>
          validateDiscoveryConfig({ bloomFilterFalsePositiveRate: 0 }),
        ).toThrow();
        expect(() =>
          validateDiscoveryConfig({ bloomFilterHashCount: 0 }),
        ).toThrow();

        expect(() => validateGossipConfig({ fanout: 0 })).toThrow();
        expect(() => validateGossipConfig({ defaultTtl: -1 })).toThrow();
        expect(() => validateGossipConfig({ batchIntervalMs: -1 })).toThrow();
        expect(() => validateGossipConfig({ maxBatchSize: 0 })).toThrow();

        expect(() => validateHeartbeatConfig({ intervalMs: 0 })).toThrow();
        expect(() => validateHeartbeatConfig({ timeoutMs: 0 })).toThrow();
        expect(() => validateHeartbeatConfig({ missedThreshold: 0 })).toThrow();

        // Just above maximum
        expect(() =>
          validateDiscoveryConfig({ queryTimeoutMs: 300001 }),
        ).toThrow();
        expect(() =>
          validateDiscoveryConfig({ maxConcurrentQueries: 1001 }),
        ).toThrow();
        expect(() =>
          validateDiscoveryConfig({ cacheTtlMs: 86400001 }),
        ).toThrow();
        expect(() =>
          validateDiscoveryConfig({ bloomFilterFalsePositiveRate: 1 }),
        ).toThrow();
        expect(() =>
          validateDiscoveryConfig({ bloomFilterHashCount: 21 }),
        ).toThrow();

        expect(() => validateGossipConfig({ fanout: 101 })).toThrow();
        expect(() => validateGossipConfig({ defaultTtl: 11 })).toThrow();
        expect(() =>
          validateGossipConfig({ batchIntervalMs: 60001 }),
        ).toThrow();
        expect(() => validateGossipConfig({ maxBatchSize: 10001 })).toThrow();

        expect(() => validateHeartbeatConfig({ intervalMs: 300001 })).toThrow();
        expect(() => validateHeartbeatConfig({ timeoutMs: 60001 })).toThrow();
        expect(() =>
          validateHeartbeatConfig({ missedThreshold: 101 }),
        ).toThrow();
      });
    });
  });
});
