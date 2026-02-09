import fc from 'fast-check';
import {
  DEFAULT_GOSSIP_CONFIG,
  GossipConfig,
  PriorityGossipConfig,
  validateGossipConfig,
} from '../../interfaces/availability/gossipService';

/**
 * Property tests for Gossip Config Validation
 *
 * **Validates: Requirements 10.3, 10.4**
 *
 * Property 16: Gossip Config Validation
 * For any GossipConfig or PriorityGossipConfig, all fanout and ttl values must be
 * positive integers. Configuration with zero, negative, or non-integer values for
 * fanout or TTL must be rejected with a validation error.
 */
describe('Feature: unified-gossip-delivery, Property 16: Gossip config validation', () => {
  // --- Smart Generators ---

  /** Generates a positive integer suitable for fanout/ttl values */
  const positiveIntegerArb = fc.integer({ min: 1, max: 1000 });

  /** Generates a valid PriorityGossipConfig */
  const validPriorityConfigArb: fc.Arbitrary<PriorityGossipConfig> = fc.record({
    fanout: positiveIntegerArb,
    ttl: positiveIntegerArb,
  });

  /** Generates a valid GossipConfig with all positive integer fanout/ttl values */
  const validGossipConfigArb: fc.Arbitrary<GossipConfig> = fc
    .tuple(
      positiveIntegerArb,
      positiveIntegerArb,
      fc.integer({ min: 100, max: 10000 }),
      fc.integer({ min: 1, max: 500 }),
      validPriorityConfigArb,
      validPriorityConfigArb,
    )
    .map(
      ([fanout, defaultTtl, batchIntervalMs, maxBatchSize, normal, high]) => ({
        fanout,
        defaultTtl,
        batchIntervalMs,
        maxBatchSize,
        messagePriority: { normal, high },
      }),
    );

  /** Generates a non-positive integer (zero or negative) */
  const nonPositiveIntegerArb = fc.integer({ min: -1000, max: 0 });

  /** Generates a non-integer number (has fractional part) */
  const nonIntegerArb = fc
    .tuple(fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 99 }))
    .map(([whole, frac]) => whole + frac / 100);

  /** Generates an invalid numeric value (zero, negative, or non-integer) */
  const invalidNumericArb = fc.oneof(nonPositiveIntegerArb, nonIntegerArb);

  /**
   * Identifies which field in the GossipConfig to corrupt.
   * Each field represents a fanout or ttl value that must be a positive integer.
   */
  const corruptibleFieldArb = fc.constantFrom(
    'fanout',
    'defaultTtl',
    'normalFanout',
    'normalTtl',
    'highFanout',
    'highTtl',
  );

  // --- Property Tests ---

  /**
   * Property 16a: A GossipConfig with all positive integer fanout and TTL values is accepted.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('Property 16a: config with all positive integer fanout/TTL values is accepted', () => {
    fc.assert(
      fc.property(validGossipConfigArb, (config) => {
        expect(validateGossipConfig(config)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16b: The default gossip config is valid.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('Property 16b: DEFAULT_GOSSIP_CONFIG passes validation', () => {
    expect(validateGossipConfig(DEFAULT_GOSSIP_CONFIG)).toBe(true);
  });

  /**
   * Property 16c: A GossipConfig with any zero, negative, or non-integer fanout/TTL value is rejected.
   * For any valid config, corrupting exactly one fanout or TTL field with an invalid value
   * must cause validation to fail.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('Property 16c: config with any invalid fanout/TTL value is rejected', () => {
    fc.assert(
      fc.property(
        validGossipConfigArb,
        corruptibleFieldArb,
        invalidNumericArb,
        (validConfig, field, badValue) => {
          // Deep clone the valid config and corrupt one field
          const config: GossipConfig = {
            ...validConfig,
            messagePriority: {
              normal: { ...validConfig.messagePriority.normal },
              high: { ...validConfig.messagePriority.high },
            },
          };

          switch (field) {
            case 'fanout':
              config.fanout = badValue;
              break;
            case 'defaultTtl':
              config.defaultTtl = badValue;
              break;
            case 'normalFanout':
              config.messagePriority.normal.fanout = badValue;
              break;
            case 'normalTtl':
              config.messagePriority.normal.ttl = badValue;
              break;
            case 'highFanout':
              config.messagePriority.high.fanout = badValue;
              break;
            case 'highTtl':
              config.messagePriority.high.ttl = badValue;
              break;
          }

          expect(validateGossipConfig(config)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16d: Zero values for fanout are always rejected.
   * Zero is not a positive integer, so any config with fanout=0 must fail.
   *
   * **Validates: Requirements 10.3**
   */
  it('Property 16d: zero fanout values are always rejected', () => {
    const fanoutFieldArb = fc.constantFrom(
      'fanout' as const,
      'normalFanout' as const,
      'highFanout' as const,
    );

    fc.assert(
      fc.property(
        validGossipConfigArb,
        fanoutFieldArb,
        (validConfig, field) => {
          const config: GossipConfig = {
            ...validConfig,
            messagePriority: {
              normal: { ...validConfig.messagePriority.normal },
              high: { ...validConfig.messagePriority.high },
            },
          };

          switch (field) {
            case 'fanout':
              config.fanout = 0;
              break;
            case 'normalFanout':
              config.messagePriority.normal.fanout = 0;
              break;
            case 'highFanout':
              config.messagePriority.high.fanout = 0;
              break;
          }

          expect(validateGossipConfig(config)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16e: Zero values for TTL are always rejected.
   * Zero is not a positive integer, so any config with ttl=0 must fail.
   *
   * **Validates: Requirements 10.4**
   */
  it('Property 16e: zero TTL values are always rejected', () => {
    const ttlFieldArb = fc.constantFrom(
      'defaultTtl' as const,
      'normalTtl' as const,
      'highTtl' as const,
    );

    fc.assert(
      fc.property(validGossipConfigArb, ttlFieldArb, (validConfig, field) => {
        const config: GossipConfig = {
          ...validConfig,
          messagePriority: {
            normal: { ...validConfig.messagePriority.normal },
            high: { ...validConfig.messagePriority.high },
          },
        };

        switch (field) {
          case 'defaultTtl':
            config.defaultTtl = 0;
            break;
          case 'normalTtl':
            config.messagePriority.normal.ttl = 0;
            break;
          case 'highTtl':
            config.messagePriority.high.ttl = 0;
            break;
        }

        expect(validateGossipConfig(config)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16f: Negative values for fanout or TTL are always rejected.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('Property 16f: negative fanout/TTL values are always rejected', () => {
    const negativeArb = fc.integer({ min: -1000, max: -1 });

    fc.assert(
      fc.property(
        validGossipConfigArb,
        corruptibleFieldArb,
        negativeArb,
        (validConfig, field, negValue) => {
          const config: GossipConfig = {
            ...validConfig,
            messagePriority: {
              normal: { ...validConfig.messagePriority.normal },
              high: { ...validConfig.messagePriority.high },
            },
          };

          switch (field) {
            case 'fanout':
              config.fanout = negValue;
              break;
            case 'defaultTtl':
              config.defaultTtl = negValue;
              break;
            case 'normalFanout':
              config.messagePriority.normal.fanout = negValue;
              break;
            case 'normalTtl':
              config.messagePriority.normal.ttl = negValue;
              break;
            case 'highFanout':
              config.messagePriority.high.fanout = negValue;
              break;
            case 'highTtl':
              config.messagePriority.high.ttl = negValue;
              break;
          }

          expect(validateGossipConfig(config)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16g: Non-integer values for fanout or TTL are always rejected.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('Property 16g: non-integer fanout/TTL values are always rejected', () => {
    fc.assert(
      fc.property(
        validGossipConfigArb,
        corruptibleFieldArb,
        nonIntegerArb,
        (validConfig, field, fracValue) => {
          const config: GossipConfig = {
            ...validConfig,
            messagePriority: {
              normal: { ...validConfig.messagePriority.normal },
              high: { ...validConfig.messagePriority.high },
            },
          };

          switch (field) {
            case 'fanout':
              config.fanout = fracValue;
              break;
            case 'defaultTtl':
              config.defaultTtl = fracValue;
              break;
            case 'normalFanout':
              config.messagePriority.normal.fanout = fracValue;
              break;
            case 'normalTtl':
              config.messagePriority.normal.ttl = fracValue;
              break;
            case 'highFanout':
              config.messagePriority.high.fanout = fracValue;
              break;
            case 'highTtl':
              config.messagePriority.high.ttl = fracValue;
              break;
          }

          expect(validateGossipConfig(config)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
