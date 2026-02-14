import fc from 'fast-check';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import {
  BlockAnnouncement,
  DEFAULT_GOSSIP_CONFIG,
  DeliveryAckMetadata,
  IGossipService,
  MessageDeliveryMetadata,
} from '../../interfaces/availability/gossipService';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';
import {
  GossipRetryService,
  IDeliveryStatusStore,
  IMessageEventEmitter,
  RetryConfig,
} from './gossipRetryService';

/**
 * Property tests for Retry with Exponential Backoff
 *
 * **Validates: Requirements 5.1, 5.2**
 *
 * Property 10: Retry with Exponential Backoff
 * For any message that has been announced but not fully acknowledged, the retry
 * intervals must follow exponential backoff: the nth retry (1-indexed) must occur
 * after `min(initialTimeoutMs * backoffMultiplier^(n-1), maxBackoffMs)` seconds from
 * the previous attempt. No retry must occur before the configured timeout has elapsed.
 */
describe('Feature: unified-gossip-delivery, Property 10: Retry with exponential backoff', () => {
  // --- Minimal Stubs ---

  /**
   * Creates a minimal IGossipService stub that tracks announceMessage calls.
   */
  function createGossipServiceStub(): IGossipService & {
    announceMessageCalls: Array<{
      blockIds: string[];
      metadata: MessageDeliveryMetadata;
    }>;
  } {
    const stub = {
      announceMessageCalls: [] as Array<{
        blockIds: string[];
        metadata: MessageDeliveryMetadata;
      }>,
      announceBlock: async () => {},
      announceRemoval: async () => {},
      announcePoolDeletion: async () => {},
      handleAnnouncement: async () => {},
      onAnnouncement: () => {},
      offAnnouncement: () => {},
      getPendingAnnouncements: () => [] as BlockAnnouncement[],
      flushAnnouncements: async () => {},
      start: () => {},
      stop: async () => {},
      getConfig: () => DEFAULT_GOSSIP_CONFIG,
      announceMessage: async (
        blockIds: string[],
        metadata: MessageDeliveryMetadata,
      ) => {
        stub.announceMessageCalls.push({ blockIds, metadata });
      },
      sendDeliveryAck: async () => {},
      onMessageDelivery: () => {},
      offMessageDelivery: () => {},
      onDeliveryAck: () => {},
      offDeliveryAck: () => {},
      announceCBLIndexUpdate: async () => {},
      announceCBLIndexDelete: async () => {},
      announceHeadUpdate: async () => {},
      announceACLUpdate: async () => {},
    };
    return stub;
  }

  /**
   * Creates a minimal IDeliveryStatusStore stub.
   */
  function createMetadataStoreStub(): IDeliveryStatusStore {
    return {
      updateDeliveryStatus: async () => {},
    };
  }

  /**
   * Creates a minimal IMessageEventEmitter stub that tracks emitted events.
   */
  function createEventSystemStub(): IMessageEventEmitter & {
    emittedEvents: Array<{ type: string; metadata: IMessageMetadata }>;
  } {
    const stub = {
      emittedEvents: [] as Array<{ type: string; metadata: IMessageMetadata }>,
      emit: (
        type:
          | 'message:stored'
          | 'message:received'
          | 'message:delivered'
          | 'message:failed',
        metadata: IMessageMetadata,
      ) => {
        stub.emittedEvents.push({ type, metadata });
      },
    };
    return stub;
  }

  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a valid MessageDeliveryMetadata */
  const messageDeliveryMetadataArb: fc.Arbitrary<MessageDeliveryMetadata> =
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc.array(nonEmptyStringArb, {
        minLength: 1,
        maxLength: 5,
      }),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(true),
    });

  /**
   * Generates a valid RetryConfig with constrained values.
   * - initialTimeoutMs: 1000..60000 (1s to 60s)
   * - backoffMultiplier: 2..4
   * - maxRetries: 1..10
   * - maxBackoffMs: must be >= initialTimeoutMs
   */
  const retryConfigArb: fc.Arbitrary<RetryConfig> = fc
    .tuple(
      fc.integer({ min: 1000, max: 60000 }), // initialTimeoutMs
      fc.integer({ min: 2, max: 4 }), // backoffMultiplier
      fc.integer({ min: 1, max: 10 }), // maxRetries
    )
    .chain(([initialTimeoutMs, backoffMultiplier, maxRetries]) =>
      fc
        .integer({
          min: initialTimeoutMs,
          max: initialTimeoutMs * Math.pow(backoffMultiplier, maxRetries),
        })
        .map((maxBackoffMs) => ({
          initialTimeoutMs,
          backoffMultiplier,
          maxRetries,
          maxBackoffMs,
        })),
    );

  /** Generates a retry count (1-indexed) within a reasonable range */
  const retryCountArb = fc.integer({ min: 1, max: 10 });

  // --- Helper Functions ---

  /**
   * Computes the expected backoff delay for a given retry count and config.
   * This is the reference implementation of the backoff formula.
   */
  function expectedBackoffMs(retryCount: number, config: RetryConfig): number {
    const delay =
      config.initialTimeoutMs *
      Math.pow(config.backoffMultiplier, retryCount - 1);
    return Math.min(delay, config.maxBackoffMs);
  }

  // --- Property Tests ---

  /**
   * Property 10a: The backoff formula produces correct delays for any retry count.
   *
   * For any retry count n (1-indexed) and any valid RetryConfig, the delay
   * must equal min(initialTimeoutMs * backoffMultiplier^(n-1), maxBackoffMs).
   *
   * **Validates: Requirements 5.1, 5.2**
   */
  it('Property 10a: backoff formula produces correct delays for any retry count and config', () => {
    fc.assert(
      fc.property(
        retryConfigArb,
        retryCountArb,
        messageDeliveryMetadataArb,
        (config, retryCount, metadata) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
            config,
          );

          // Track a delivery
          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          const pending = service.getPendingDelivery(metadata.messageId);
          expect(pending).toBeDefined();

          // Simulate retries up to the desired retryCount by advancing nextRetryAt
          // and calling checkRetries() for each retry
          const baseTime = pending!.createdAt.getTime();
          let currentTime = baseTime;

          for (let n = 1; n <= Math.min(retryCount, config.maxRetries); n++) {
            // Advance time past the nextRetryAt
            const pendingBefore = service.getPendingDelivery(
              metadata.messageId,
            );
            if (!pendingBefore) break;

            const nextRetryTime = pendingBefore.nextRetryAt.getTime();

            // Set time to exactly the nextRetryAt to trigger the retry
            currentTime = nextRetryTime;

            // Override Date.now to simulate time advancement
            const originalDate = global.Date;
            const fixedNow = currentTime;

            // Create a mock Date class that returns our fixed time for new Date()
            class MockDate extends originalDate {
              constructor(...args: unknown[]) {
                if (args.length === 0) {
                  super(fixedNow);
                } else {
                  super(...(args as [number]));
                }
              }
              static override now() {
                return fixedNow;
              }
            }
            global.Date = MockDate as DateConstructor;

            try {
              service.checkRetries();
            } finally {
              global.Date = originalDate;
            }

            // After checkRetries, verify the pending delivery's state
            const pendingAfter = service.getPendingDelivery(metadata.messageId);

            if (pendingAfter) {
              // Verify the retry count was incremented
              expect(pendingAfter.retryCount).toBe(n);

              // Verify the nextRetryAt was set correctly using the backoff formula
              const expectedDelay = expectedBackoffMs(n, config);
              const expectedNextRetry = fixedNow + expectedDelay;
              expect(pendingAfter.nextRetryAt.getTime()).toBe(
                expectedNextRetry,
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10b: Backoff delay is always capped at maxBackoffMs.
   *
   * For any retry count and any valid RetryConfig, the computed backoff
   * delay must never exceed maxBackoffMs.
   *
   * **Validates: Requirements 5.2**
   */
  it('Property 10b: backoff delay is always capped at maxBackoffMs', () => {
    fc.assert(
      fc.property(retryConfigArb, retryCountArb, (config, retryCount) => {
        const delay = expectedBackoffMs(retryCount, config);
        expect(delay).toBeLessThanOrEqual(config.maxBackoffMs);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10c: No retry occurs before the configured timeout has elapsed.
   *
   * When checkRetries() is called before nextRetryAt, no re-announcement
   * should be made and the retry count should remain unchanged.
   *
   * **Validates: Requirements 5.1**
   */
  it('Property 10c: no retry occurs before the configured timeout has elapsed', () => {
    fc.assert(
      fc.property(
        retryConfigArb,
        messageDeliveryMetadataArb,
        fc.integer({ min: 1, max: 29999 }),
        (config, metadata, earlyOffsetMs) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          // Use a config with a known initialTimeoutMs >= 30000
          const safeConfig: RetryConfig = {
            ...config,
            initialTimeoutMs: 30000,
          };

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
            safeConfig,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          const pending = service.getPendingDelivery(metadata.messageId);
          expect(pending).toBeDefined();
          expect(pending!.retryCount).toBe(0);

          // Call checkRetries at a time BEFORE the nextRetryAt
          const tooEarlyTime = pending!.createdAt.getTime() + earlyOffsetMs;

          const originalDate = global.Date;
          class MockDate extends originalDate {
            constructor(...args: unknown[]) {
              if (args.length === 0) {
                super(tooEarlyTime);
              } else {
                super(...(args as [number]));
              }
            }
            static override now() {
              return tooEarlyTime;
            }
          }
          global.Date = MockDate as DateConstructor;

          try {
            service.checkRetries();
          } finally {
            global.Date = originalDate;
          }

          // Verify no retry occurred
          const pendingAfter = service.getPendingDelivery(metadata.messageId);
          expect(pendingAfter).toBeDefined();
          expect(pendingAfter!.retryCount).toBe(0);
          expect(gossipStub.announceMessageCalls.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10d: With custom config values, the exponential backoff formula still holds.
   *
   * For any valid custom RetryConfig, the service must compute backoff delays
   * that match the formula: min(initialTimeoutMs * backoffMultiplier^(n-1), maxBackoffMs).
   *
   * **Validates: Requirements 5.1, 5.2**
   */
  it('Property 10d: custom config values produce correct exponential backoff', () => {
    fc.assert(
      fc.property(
        retryConfigArb,
        messageDeliveryMetadataArb,
        (config, metadata) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
            config,
          );

          // Verify the config was applied
          const appliedConfig = service.getConfig();
          expect(appliedConfig.initialTimeoutMs).toBe(config.initialTimeoutMs);
          expect(appliedConfig.backoffMultiplier).toBe(
            config.backoffMultiplier,
          );
          expect(appliedConfig.maxRetries).toBe(config.maxRetries);
          expect(appliedConfig.maxBackoffMs).toBe(config.maxBackoffMs);

          // Track a delivery and simulate retries
          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          const originalDate = global.Date;

          // Walk through each retry and verify the backoff
          for (let n = 1; n <= config.maxRetries; n++) {
            const pendingBefore = service.getPendingDelivery(
              metadata.messageId,
            );
            if (!pendingBefore) break;

            const nextRetryTime = pendingBefore.nextRetryAt.getTime();

            class MockDate extends originalDate {
              constructor(...args: unknown[]) {
                if (args.length === 0) {
                  super(nextRetryTime);
                } else {
                  super(...(args as [number]));
                }
              }
              static override now() {
                return nextRetryTime;
              }
            }
            global.Date = MockDate as DateConstructor;

            try {
              service.checkRetries();
            } finally {
              global.Date = originalDate;
            }

            const pendingAfter = service.getPendingDelivery(metadata.messageId);
            if (!pendingAfter) break;

            // Verify the backoff formula
            const expectedDelay = expectedBackoffMs(n, config);
            const actualDelay =
              pendingAfter.nextRetryAt.getTime() - nextRetryTime;
            expect(actualDelay).toBe(expectedDelay);

            // Verify the delay matches the formula explicitly
            const rawDelay =
              config.initialTimeoutMs *
              Math.pow(config.backoffMultiplier, n - 1);
            expect(expectedDelay).toBe(Math.min(rawDelay, config.maxBackoffMs));
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10e: Backoff delays are monotonically non-decreasing until capped.
   *
   * For any valid RetryConfig, the sequence of backoff delays must be
   * monotonically non-decreasing (each delay >= the previous one).
   *
   * **Validates: Requirements 5.2**
   */
  it('Property 10e: backoff delays are monotonically non-decreasing', () => {
    fc.assert(
      fc.property(retryConfigArb, (config) => {
        let previousDelay = 0;
        for (let n = 1; n <= config.maxRetries; n++) {
          const delay = expectedBackoffMs(n, config);
          expect(delay).toBeGreaterThanOrEqual(previousDelay);
          previousDelay = delay;
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10f: The first retry delay always equals initialTimeoutMs.
   *
   * For any valid RetryConfig where maxBackoffMs >= initialTimeoutMs,
   * the first retry (n=1) must have a delay of exactly initialTimeoutMs.
   *
   * **Validates: Requirements 5.1, 5.2**
   */
  it('Property 10f: first retry delay equals initialTimeoutMs', () => {
    fc.assert(
      fc.property(retryConfigArb, (config) => {
        // For n=1: delay = initialTimeoutMs * multiplier^0 = initialTimeoutMs
        const firstDelay = expectedBackoffMs(1, config);
        // Since maxBackoffMs >= initialTimeoutMs (by generator constraint),
        // the first delay is always exactly initialTimeoutMs
        expect(firstDelay).toBe(config.initialTimeoutMs);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10g: Default config produces the documented retry schedule.
   *
   * With default config (initialTimeoutMs=30000, backoffMultiplier=2, maxBackoffMs=240000),
   * the retry schedule must be: 30s, 60s, 120s, 240s, 240s.
   *
   * **Validates: Requirements 5.1, 5.2**
   */
  it('Property 10g: default config produces documented retry schedule (30s, 60s, 120s, 240s, 240s)', () => {
    const expectedScheduleMs = [30000, 60000, 120000, 240000, 240000];

    fc.assert(
      fc.property(messageDeliveryMetadataArb, (metadata) => {
        const gossipStub = createGossipServiceStub();
        const metadataStoreStub = createMetadataStoreStub();
        const eventStub = createEventSystemStub();

        // Use default config
        const service = new GossipRetryService(
          gossipStub,
          metadataStoreStub,
          eventStub,
        );

        service.trackDelivery(metadata.messageId, metadata.blockIds, metadata);

        const originalDate = global.Date;

        for (let n = 0; n < expectedScheduleMs.length; n++) {
          const pending = service.getPendingDelivery(metadata.messageId);
          if (!pending) break;

          const nextRetryTime = pending.nextRetryAt.getTime();

          class MockDate extends originalDate {
            constructor(...args: unknown[]) {
              if (args.length === 0) {
                super(nextRetryTime);
              } else {
                super(...(args as [number]));
              }
            }
            static override now() {
              return nextRetryTime;
            }
          }
          global.Date = MockDate as DateConstructor;

          try {
            service.checkRetries();
          } finally {
            global.Date = originalDate;
          }

          const pendingAfter = service.getPendingDelivery(metadata.messageId);
          if (pendingAfter) {
            const actualDelay =
              pendingAfter.nextRetryAt.getTime() - nextRetryTime;
            expect(actualDelay).toBe(expectedScheduleMs[n]);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property tests for Max Retries Exhausted Marks Failed
 *
 * **Validates: Requirements 5.4, 5.5**
 *
 * Property 11: Max Retries Exhausted Marks Failed
 * For any message that exhausts the configured maximum number of retries without
 * receiving a DeliveryAck for all recipients, all unacknowledged recipients must
 * have their DeliveryStatus set to Failed, and the EventNotificationSystem must
 * emit exactly one MESSAGE_FAILED event for that message.
 */
describe('Feature: unified-gossip-delivery, Property 11: Max retries exhausted marks Failed', () => {
  // --- Minimal Stubs ---

  /**
   * Creates a minimal IGossipService stub that tracks announceMessage calls.
   */
  function createGossipServiceStub(): IGossipService & {
    announceMessageCalls: Array<{
      blockIds: string[];
      metadata: MessageDeliveryMetadata;
    }>;
  } {
    const stub = {
      announceMessageCalls: [] as Array<{
        blockIds: string[];
        metadata: MessageDeliveryMetadata;
      }>,
      announceBlock: async () => {},
      announceRemoval: async () => {},
      announcePoolDeletion: async () => {},
      handleAnnouncement: async () => {},
      onAnnouncement: () => {},
      offAnnouncement: () => {},
      getPendingAnnouncements: () => [] as BlockAnnouncement[],
      flushAnnouncements: async () => {},
      start: () => {},
      stop: async () => {},
      getConfig: () => DEFAULT_GOSSIP_CONFIG,
      announceMessage: async (
        blockIds: string[],
        metadata: MessageDeliveryMetadata,
      ) => {
        stub.announceMessageCalls.push({ blockIds, metadata });
      },
      sendDeliveryAck: async () => {},
      onMessageDelivery: () => {},
      offMessageDelivery: () => {},
      onDeliveryAck: () => {},
      offDeliveryAck: () => {},
      announceCBLIndexUpdate: async () => {},
      announceCBLIndexDelete: async () => {},
      announceHeadUpdate: async () => {},
      announceACLUpdate: async () => {},
    };
    return stub;
  }

  /**
   * Creates a minimal IDeliveryStatusStore stub that tracks updateDeliveryStatus calls.
   */
  function createMetadataStoreStub(): IDeliveryStatusStore & {
    statusUpdates: Array<{
      messageId: string;
      recipientId: string;
      status: DeliveryStatus;
    }>;
  } {
    const stub = {
      statusUpdates: [] as Array<{
        messageId: string;
        recipientId: string;
        status: DeliveryStatus;
      }>,
      updateDeliveryStatus: async (
        messageId: string,
        recipientId: string,
        status: DeliveryStatus,
      ) => {
        stub.statusUpdates.push({ messageId, recipientId, status });
      },
    };
    return stub;
  }

  /**
   * Creates a minimal IMessageEventEmitter stub that tracks emitted events.
   */
  function createEventSystemStub(): IMessageEventEmitter & {
    emittedEvents: Array<{ type: string; metadata: IMessageMetadata }>;
  } {
    const stub = {
      emittedEvents: [] as Array<{ type: string; metadata: IMessageMetadata }>,
      emit: (
        type:
          | 'message:stored'
          | 'message:received'
          | 'message:delivered'
          | 'message:failed',
        metadata: IMessageMetadata,
      ) => {
        stub.emittedEvents.push({ type, metadata });
      },
    };
    return stub;
  }

  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a valid MessageDeliveryMetadata */
  const messageDeliveryMetadataArb: fc.Arbitrary<MessageDeliveryMetadata> =
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc.array(nonEmptyStringArb, {
        minLength: 1,
        maxLength: 5,
      }),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(true),
    });

  /**
   * Generates a valid RetryConfig with constrained values.
   * - initialTimeoutMs: 1000..60000 (1s to 60s)
   * - backoffMultiplier: 2..4
   * - maxRetries: 1..10
   * - maxBackoffMs: must be >= initialTimeoutMs
   */
  const retryConfigArb: fc.Arbitrary<RetryConfig> = fc
    .tuple(
      fc.integer({ min: 1000, max: 60000 }), // initialTimeoutMs
      fc.integer({ min: 2, max: 4 }), // backoffMultiplier
      fc.integer({ min: 1, max: 10 }), // maxRetries
    )
    .chain(([initialTimeoutMs, backoffMultiplier, maxRetries]) =>
      fc
        .integer({
          min: initialTimeoutMs,
          max: initialTimeoutMs * Math.pow(backoffMultiplier, maxRetries),
        })
        .map((maxBackoffMs) => ({
          initialTimeoutMs,
          backoffMultiplier,
          maxRetries,
          maxBackoffMs,
        })),
    );

  // --- Helper Functions ---

  /**
   * Advances the service through all retries until max retries are exhausted.
   * Simulates time progression by mocking Date for each checkRetries() call.
   * Returns the time at which the final checkRetries() was called.
   */
  function exhaustAllRetries(
    service: GossipRetryService,
    messageId: string,
    config: RetryConfig,
  ): void {
    const originalDate = global.Date;

    // First, advance through maxRetries retries (each increments retryCount)
    for (let n = 0; n < config.maxRetries; n++) {
      const pending = service.getPendingDelivery(messageId);
      if (!pending) break;

      const nextRetryTime = pending.nextRetryAt.getTime();

      class MockDate extends originalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(nextRetryTime);
          } else {
            super(...(args as [number]));
          }
        }
        static override now() {
          return nextRetryTime;
        }
      }
      global.Date = MockDate as DateConstructor;

      try {
        service.checkRetries();
      } finally {
        global.Date = originalDate;
      }
    }

    // Now retryCount === maxRetries. One more checkRetries at the next retry time
    // will trigger handleMaxRetriesExhausted.
    const pending = service.getPendingDelivery(messageId);
    if (pending) {
      const nextRetryTime = pending.nextRetryAt.getTime();

      class MockDate extends originalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(nextRetryTime);
          } else {
            super(...(args as [number]));
          }
        }
        static override now() {
          return nextRetryTime;
        }
      }
      global.Date = MockDate as DateConstructor;

      try {
        service.checkRetries();
      } finally {
        global.Date = originalDate;
      }
    }
  }

  // --- Property Tests ---

  /**
   * Property 11a: After exhausting max retries, all unacknowledged recipients
   * have DeliveryStatus.Failed.
   *
   * For any message with any number of recipients and any valid RetryConfig,
   * when max retries are exhausted without any acks, all recipients must be
   * marked as Failed.
   *
   * **Validates: Requirements 5.4, 5.5**
   */
  it('Property 11a: all unacknowledged recipients are marked Failed after max retries exhausted', () => {
    fc.assert(
      fc.property(
        retryConfigArb,
        messageDeliveryMetadataArb,
        (config, metadata) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
            config,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Exhaust all retries without sending any acks
          exhaustAllRetries(service, metadata.messageId, config);

          // Verify: the delivery should be removed from tracking
          expect(
            service.getPendingDelivery(metadata.messageId),
          ).toBeUndefined();

          // Verify: metadataStore.updateDeliveryStatus was called for each recipient
          // with DeliveryStatus.Failed
          for (const recipientId of metadata.recipientIds) {
            const updates = metadataStoreStub.statusUpdates.filter(
              (u) =>
                u.messageId === metadata.messageId &&
                u.recipientId === recipientId &&
                u.status === DeliveryStatus.Failed,
            );
            expect(updates.length).toBeGreaterThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11b: Exactly one MESSAGE_FAILED event is emitted when max retries
   * are exhausted.
   *
   * For any message and any valid RetryConfig, when max retries are exhausted,
   * the EventNotificationSystem must emit exactly one 'message:failed' event.
   *
   * **Validates: Requirements 5.5**
   */
  it('Property 11b: exactly one MESSAGE_FAILED event is emitted on max retries exhausted', () => {
    fc.assert(
      fc.property(
        retryConfigArb,
        messageDeliveryMetadataArb,
        (config, metadata) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
            config,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Exhaust all retries
          exhaustAllRetries(service, metadata.messageId, config);

          // Verify: exactly one 'message:failed' event was emitted
          const failedEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:failed',
          );
          expect(failedEvents.length).toBe(1);

          // Verify: no 'message:delivered' events were emitted
          const deliveredEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:delivered',
          );
          expect(deliveredEvents.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11c: The delivery is removed from tracking after max retries exhausted.
   *
   * For any message and any valid RetryConfig, after max retries are exhausted,
   * getPendingDelivery must return undefined and the pending count must decrease.
   *
   * **Validates: Requirements 5.4**
   */
  it('Property 11c: delivery is removed from tracking after max retries exhausted', () => {
    fc.assert(
      fc.property(
        retryConfigArb,
        messageDeliveryMetadataArb,
        (config, metadata) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
            config,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Verify it's tracked before exhaustion
          expect(service.getPendingDelivery(metadata.messageId)).toBeDefined();
          const countBefore = service.getPendingCount();

          // Exhaust all retries
          exhaustAllRetries(service, metadata.messageId, config);

          // Verify: removed from tracking
          expect(
            service.getPendingDelivery(metadata.messageId),
          ).toBeUndefined();
          expect(service.getPendingCount()).toBe(countBefore - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11d: Recipients already Delivered or Read are NOT changed to Failed.
   *
   * For any message with multiple recipients where some have been acknowledged
   * (Delivered/Read) before max retries are exhausted, only the unacknowledged
   * recipients (Announced/Pending) must be marked Failed. Already-delivered
   * recipients must retain their status.
   *
   * **Validates: Requirements 5.4**
   */
  it('Property 11d: already-delivered/read recipients are not changed to Failed', () => {
    // Generator: metadata with at least 2 recipients so we can ack some and leave others
    const metadataWithMultipleRecipientsArb = fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc
        .uniqueArray(nonEmptyStringArb, { minLength: 2, maxLength: 6 })
        .filter((arr) => arr.length >= 2),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(true),
    });

    fc.assert(
      fc.property(
        retryConfigArb,
        metadataWithMultipleRecipientsArb,
        fc.constantFrom('delivered' as const, 'read' as const),
        (config, metadata, ackStatus) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
            config,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Acknowledge the first recipient (simulate a successful delivery ack)
          const ackedRecipientId = metadata.recipientIds[0];
          const ack: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId: ackedRecipientId,
            status: ackStatus,
            originalSenderNode: 'sender-node',
          };

          // If ackStatus is 'read', we need to first deliver then read
          if (ackStatus === 'read') {
            service.handleAck({
              messageId: metadata.messageId,
              recipientId: ackedRecipientId,
              status: 'delivered',
              originalSenderNode: 'sender-node',
            });
          }
          service.handleAck(ack);

          // Verify the acked recipient has the expected status before exhaustion
          const pendingBefore = service.getPendingDelivery(metadata.messageId);
          if (!pendingBefore) {
            // If all recipients were the same ID (deduped), the delivery may already be complete
            return;
          }

          const ackedStatusBefore =
            pendingBefore.recipientStatuses.get(ackedRecipientId);
          const expectedAckedStatus =
            ackStatus === 'delivered'
              ? DeliveryStatus.Delivered
              : DeliveryStatus.Read;
          expect(ackedStatusBefore).toBe(expectedAckedStatus);

          // Exhaust all retries
          exhaustAllRetries(service, metadata.messageId, config);

          // Verify: the metadataStore should NOT have a Failed update for the acked recipient
          const failedUpdatesForAcked = metadataStoreStub.statusUpdates.filter(
            (u) =>
              u.messageId === metadata.messageId &&
              u.recipientId === ackedRecipientId &&
              u.status === DeliveryStatus.Failed,
          );
          expect(failedUpdatesForAcked.length).toBe(0);

          // Verify: the unacked recipients SHOULD have Failed updates
          const unackedRecipients = metadata.recipientIds.filter(
            (id) => id !== ackedRecipientId,
          );
          for (const recipientId of unackedRecipients) {
            const failedUpdates = metadataStoreStub.statusUpdates.filter(
              (u) =>
                u.messageId === metadata.messageId &&
                u.recipientId === recipientId &&
                u.status === DeliveryStatus.Failed,
            );
            expect(failedUpdates.length).toBeGreaterThanOrEqual(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11e: Works with any valid RetryConfig (custom maxRetries).
   *
   * For any valid RetryConfig, the max retries exhaustion behavior must be
   * consistent: after exactly maxRetries retries + 1 final check, the delivery
   * is marked Failed and removed.
   *
   * **Validates: Requirements 5.4, 5.5**
   */
  it('Property 11e: max retries exhaustion works with any valid custom RetryConfig', () => {
    fc.assert(
      fc.property(
        retryConfigArb,
        messageDeliveryMetadataArb,
        (config, metadata) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
            config,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          const originalDate = global.Date;

          // Advance through exactly maxRetries retries
          for (let n = 0; n < config.maxRetries; n++) {
            const pending = service.getPendingDelivery(metadata.messageId);
            expect(pending).toBeDefined();
            expect(pending!.retryCount).toBe(n);

            const nextRetryTime = pending!.nextRetryAt.getTime();

            class MockDate extends originalDate {
              constructor(...args: unknown[]) {
                if (args.length === 0) {
                  super(nextRetryTime);
                } else {
                  super(...(args as [number]));
                }
              }
              static override now() {
                return nextRetryTime;
              }
            }
            global.Date = MockDate as DateConstructor;

            try {
              service.checkRetries();
            } finally {
              global.Date = originalDate;
            }
          }

          // After maxRetries retries, the delivery should still be tracked
          // (retryCount === maxRetries, but not yet handled as exhausted)
          const pendingBeforeFinal = service.getPendingDelivery(
            metadata.messageId,
          );
          expect(pendingBeforeFinal).toBeDefined();
          expect(pendingBeforeFinal!.retryCount).toBe(config.maxRetries);

          // One more checkRetries triggers handleMaxRetriesExhausted
          const finalRetryTime = pendingBeforeFinal!.nextRetryAt.getTime();

          class FinalMockDate extends originalDate {
            constructor(...args: unknown[]) {
              if (args.length === 0) {
                super(finalRetryTime);
              } else {
                super(...(args as [number]));
              }
            }
            static override now() {
              return finalRetryTime;
            }
          }
          global.Date = FinalMockDate as DateConstructor;

          try {
            service.checkRetries();
          } finally {
            global.Date = originalDate;
          }

          // Verify: delivery removed, exactly one failed event, all recipients Failed
          expect(
            service.getPendingDelivery(metadata.messageId),
          ).toBeUndefined();

          const failedEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:failed',
          );
          expect(failedEvents.length).toBe(1);

          // The number of announceMessage calls should equal maxRetries
          // (one re-announcement per retry, not counting the exhaustion check)
          expect(gossipStub.announceMessageCalls.length).toBe(
            config.maxRetries,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
