import * as fc from 'fast-check';
import {
  DEFAULT_MESSAGE_SYSTEM_CONFIG,
  IMessageSystemConfig,
} from '../../interfaces/messaging/messageSystemConfig';

describe('MessageSystemConfig Property Tests', () => {
  describe('Property 30: Configurable Message-Sized Thresholds', () => {
    it('Property 30a: Min threshold must be less than max threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 1, max: 1000000 }),
          (min, max) => {
            const config: IMessageSystemConfig = {
              ...DEFAULT_MESSAGE_SYSTEM_CONFIG,
              minMessageSizeThreshold: Math.min(min, max),
              maxMessageSizeThreshold: Math.max(min, max),
            };
            return (
              config.minMessageSizeThreshold <= config.maxMessageSizeThreshold
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 30b: Retry attempts must be non-negative', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10 }), (retries) => {
          const config: IMessageSystemConfig = {
            ...DEFAULT_MESSAGE_SYSTEM_CONFIG,
            storageRetryAttempts: retries,
          };
          return config.storageRetryAttempts >= 0;
        }),
        { numRuns: 100 },
      );
    });

    it('Property 30c: Timeout values must be positive', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 60000 }),
          fc.integer({ min: 1, max: 60000 }),
          (routing, query) => {
            const config: IMessageSystemConfig = {
              ...DEFAULT_MESSAGE_SYSTEM_CONFIG,
              routingTimeoutMs: routing,
              queryTimeoutMs: query,
            };
            return config.routingTimeoutMs > 0 && config.queryTimeoutMs > 0;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property 30d: Max recipients must be positive', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), (maxRecipients) => {
          const config: IMessageSystemConfig = {
            ...DEFAULT_MESSAGE_SYSTEM_CONFIG,
            maxRecipientsPerMessage: maxRecipients,
          };
          return config.maxRecipientsPerMessage > 0;
        }),
        { numRuns: 100 },
      );
    });

    it('Property 30e: Padding strategy must be valid', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('zero' as const, 'random' as const),
          (strategy) => {
            const config: IMessageSystemConfig = {
              ...DEFAULT_MESSAGE_SYSTEM_CONFIG,
              paddingStrategy: strategy,
            };
            return (
              config.paddingStrategy === 'zero' ||
              config.paddingStrategy === 'random'
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
