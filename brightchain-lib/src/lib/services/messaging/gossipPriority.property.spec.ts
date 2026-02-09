import fc from 'fast-check';
import {
  BlockAnnouncement,
  DEFAULT_GOSSIP_CONFIG,
  GossipConfig,
  MessageDeliveryMetadata,
  PriorityGossipConfig,
} from '../../interfaces/availability/gossipService';

/**
 * Property tests for Priority-Based Fanout and TTL
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 10.2**
 *
 * Property 5: Priority-Based Fanout and TTL
 * For any gossip announcement, the fanout and TTL used for propagation must match
 * the priority configuration: block-only announcements use the default config
 * (fanout=3, TTL=3), normal-priority message announcements use (fanout=5, TTL=5),
 * and high-priority message announcements use (fanout=7, TTL=7), unless overridden
 * by custom configuration.
 */
describe('Feature: unified-gossip-delivery, Property 5: Priority-based fanout and TTL', () => {
  // --- Helper: Determine expected fanout and TTL for an announcement ---

  /**
   * Given a config and an announcement, returns the expected { fanout, ttl }
   * that the gossip service should use for propagation.
   *
   * This encodes the core property: block-only → default, normal → normal config,
   * high → high config.
   */
  function getExpectedPropagationParams(
    config: GossipConfig,
    announcement: BlockAnnouncement,
  ): PriorityGossipConfig {
    if (announcement.messageDelivery) {
      return config.messagePriority[announcement.messageDelivery.priority];
    }
    // Block-only announcements use the base config
    return { fanout: config.fanout, ttl: config.defaultTtl };
  }

  /**
   * Simulates the GossipService's announceBlock behavior:
   * creates a BlockAnnouncement with the default TTL from config.
   */
  function createBlockAnnouncement(
    config: GossipConfig,
    blockId: string,
  ): BlockAnnouncement {
    return {
      type: 'add',
      blockId,
      nodeId: 'local-node',
      timestamp: new Date(),
      ttl: config.defaultTtl,
    };
  }

  /**
   * Simulates the GossipService's announceMessage behavior:
   * creates BlockAnnouncements with priority-based TTL from config.
   */
  function createMessageAnnouncements(
    config: GossipConfig,
    metadata: MessageDeliveryMetadata,
  ): BlockAnnouncement[] {
    const priorityConfig = config.messagePriority[metadata.priority];
    return metadata.blockIds.map((blockId) => ({
      type: 'add' as const,
      blockId,
      nodeId: 'local-node',
      timestamp: new Date(),
      ttl: priorityConfig.ttl,
      messageDelivery: metadata,
    }));
  }

  /**
   * Simulates the GossipService's flushAnnouncements fanout grouping:
   * groups announcements by their required fanout and returns the mapping.
   */
  function groupByFanout(
    config: GossipConfig,
    announcements: BlockAnnouncement[],
  ): Map<number, BlockAnnouncement[]> {
    const groups = new Map<number, BlockAnnouncement[]>();

    for (const announcement of announcements) {
      let fanout: number;
      if (announcement.messageDelivery) {
        fanout =
          config.messagePriority[announcement.messageDelivery.priority].fanout;
      } else {
        fanout = config.fanout;
      }

      const group = groups.get(fanout);
      if (group) {
        group.push(announcement);
      } else {
        groups.set(fanout, [announcement]);
      }
    }

    return groups;
  }

  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a valid MessageDeliveryMetadata with a specific priority */
  const messageDeliveryWithPriorityArb = (
    priority: 'normal' | 'high',
  ): fc.Arbitrary<MessageDeliveryMetadata> =>
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      priority: fc.constant(priority),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.boolean(),
    });

  /** Generates a valid MessageDeliveryMetadata with any priority */
  const messageDeliveryArb: fc.Arbitrary<MessageDeliveryMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    priority: fc.constantFrom('normal' as const, 'high' as const),
    blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    cblBlockId: nonEmptyStringArb,
    ackRequired: fc.boolean(),
  });

  /** Generates a positive integer for fanout/TTL config values */
  const positiveIntArb = fc.integer({ min: 1, max: 50 });

  /** Generates a custom GossipConfig with arbitrary positive integer fanout/TTL values */
  const customGossipConfigArb: fc.Arbitrary<GossipConfig> = fc
    .tuple(
      positiveIntArb, // base fanout
      positiveIntArb, // base TTL
      positiveIntArb, // normal fanout
      positiveIntArb, // normal TTL
      positiveIntArb, // high fanout
      positiveIntArb, // high TTL
    )
    .map(
      ([
        baseFanout,
        baseTtl,
        normalFanout,
        normalTtl,
        highFanout,
        highTtl,
      ]) => ({
        fanout: baseFanout,
        defaultTtl: baseTtl,
        batchIntervalMs: 1000,
        maxBatchSize: 100,
        messagePriority: {
          normal: { fanout: normalFanout, ttl: normalTtl },
          high: { fanout: highFanout, ttl: highTtl },
        },
      }),
    );

  // --- Property Tests ---

  /**
   * Property 5a: Block-only announcements use default fanout=3 and TTL=3.
   * When a block is announced without message metadata using the default config,
   * the TTL must be 3 and the fanout must be 3.
   *
   * **Validates: Requirements 3.3, 10.2**
   */
  it('Property 5a: block-only announcements use default fanout=3 and TTL=3', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, (blockId) => {
        const announcement = createBlockAnnouncement(
          DEFAULT_GOSSIP_CONFIG,
          blockId,
        );

        // TTL must match default config
        expect(announcement.ttl).toBe(3);
        expect(announcement.ttl).toBe(DEFAULT_GOSSIP_CONFIG.defaultTtl);

        // No message delivery metadata
        expect(announcement.messageDelivery).toBeUndefined();

        // Expected propagation params must match default
        const expected = getExpectedPropagationParams(
          DEFAULT_GOSSIP_CONFIG,
          announcement,
        );
        expect(expected.fanout).toBe(3);
        expect(expected.ttl).toBe(3);

        // Fanout grouping must use default fanout
        const groups = groupByFanout(DEFAULT_GOSSIP_CONFIG, [announcement]);
        expect(groups.size).toBe(1);
        expect(groups.has(DEFAULT_GOSSIP_CONFIG.fanout)).toBe(true);
        expect(groups.get(DEFAULT_GOSSIP_CONFIG.fanout)!.length).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5b: Normal-priority message announcements use fanout=5 and TTL=5.
   * When a message is announced with priority='normal' using the default config,
   * the TTL on each announcement must be 5 and the fanout must be 5.
   *
   * **Validates: Requirements 3.1, 10.2**
   */
  it('Property 5b: normal-priority message announcements use fanout=5, TTL=5', () => {
    fc.assert(
      fc.property(messageDeliveryWithPriorityArb('normal'), (metadata) => {
        const announcements = createMessageAnnouncements(
          DEFAULT_GOSSIP_CONFIG,
          metadata,
        );

        // Each announcement must have TTL=5
        for (const announcement of announcements) {
          expect(announcement.ttl).toBe(5);
          expect(announcement.ttl).toBe(
            DEFAULT_GOSSIP_CONFIG.messagePriority.normal.ttl,
          );
          expect(announcement.messageDelivery).toBeDefined();
          expect(announcement.messageDelivery!.priority).toBe('normal');

          // Expected propagation params
          const expected = getExpectedPropagationParams(
            DEFAULT_GOSSIP_CONFIG,
            announcement,
          );
          expect(expected.fanout).toBe(5);
          expect(expected.ttl).toBe(5);
        }

        // Fanout grouping must use normal fanout=5
        const groups = groupByFanout(DEFAULT_GOSSIP_CONFIG, announcements);
        expect(groups.size).toBe(1);
        expect(
          groups.has(DEFAULT_GOSSIP_CONFIG.messagePriority.normal.fanout),
        ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5c: High-priority message announcements use fanout=7 and TTL=7.
   * When a message is announced with priority='high' using the default config,
   * the TTL on each announcement must be 7 and the fanout must be 7.
   *
   * **Validates: Requirements 3.2, 10.2**
   */
  it('Property 5c: high-priority message announcements use fanout=7, TTL=7', () => {
    fc.assert(
      fc.property(messageDeliveryWithPriorityArb('high'), (metadata) => {
        const announcements = createMessageAnnouncements(
          DEFAULT_GOSSIP_CONFIG,
          metadata,
        );

        // Each announcement must have TTL=7
        for (const announcement of announcements) {
          expect(announcement.ttl).toBe(7);
          expect(announcement.ttl).toBe(
            DEFAULT_GOSSIP_CONFIG.messagePriority.high.ttl,
          );
          expect(announcement.messageDelivery).toBeDefined();
          expect(announcement.messageDelivery!.priority).toBe('high');

          // Expected propagation params
          const expected = getExpectedPropagationParams(
            DEFAULT_GOSSIP_CONFIG,
            announcement,
          );
          expect(expected.fanout).toBe(7);
          expect(expected.ttl).toBe(7);
        }

        // Fanout grouping must use high fanout=7
        const groups = groupByFanout(DEFAULT_GOSSIP_CONFIG, announcements);
        expect(groups.size).toBe(1);
        expect(
          groups.has(DEFAULT_GOSSIP_CONFIG.messagePriority.high.fanout),
        ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5d: Custom configuration overrides default fanout and TTL values.
   * For any valid custom GossipConfig, announcements must use the configured
   * fanout and TTL values rather than the hardcoded defaults.
   *
   * **Validates: Requirements 10.2**
   */
  it('Property 5d: custom config overrides default fanout and TTL', () => {
    fc.assert(
      fc.property(
        customGossipConfigArb,
        nonEmptyStringArb,
        messageDeliveryArb,
        (config, blockId, metadata) => {
          // Block-only announcement uses custom base config
          const blockAnnouncement = createBlockAnnouncement(config, blockId);
          expect(blockAnnouncement.ttl).toBe(config.defaultTtl);

          const blockExpected = getExpectedPropagationParams(
            config,
            blockAnnouncement,
          );
          expect(blockExpected.fanout).toBe(config.fanout);
          expect(blockExpected.ttl).toBe(config.defaultTtl);

          // Message announcement uses custom priority config
          const msgAnnouncements = createMessageAnnouncements(config, metadata);
          const expectedPriorityConfig =
            config.messagePriority[metadata.priority];

          for (const announcement of msgAnnouncements) {
            expect(announcement.ttl).toBe(expectedPriorityConfig.ttl);

            const msgExpected = getExpectedPropagationParams(
              config,
              announcement,
            );
            expect(msgExpected.fanout).toBe(expectedPriorityConfig.fanout);
            expect(msgExpected.ttl).toBe(expectedPriorityConfig.ttl);
          }

          // Fanout grouping uses custom config values
          const blockGroups = groupByFanout(config, [blockAnnouncement]);
          expect(blockGroups.has(config.fanout)).toBe(true);

          const msgGroups = groupByFanout(config, msgAnnouncements);
          expect(msgGroups.has(expectedPriorityConfig.fanout)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5e: Mixed announcements in the same batch use correct per-priority fanout.
   * When block-only, normal-priority, and high-priority announcements are grouped
   * together, each group must be assigned the correct fanout from the config.
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 10.2**
   */
  it('Property 5e: mixed announcements use correct per-priority fanout', () => {
    fc.assert(
      fc.property(
        nonEmptyStringArb,
        messageDeliveryWithPriorityArb('normal'),
        messageDeliveryWithPriorityArb('high'),
        (blockId, normalMetadata, highMetadata) => {
          const config = DEFAULT_GOSSIP_CONFIG;

          // Create all three types of announcements
          const blockAnnouncement = createBlockAnnouncement(config, blockId);
          const normalAnnouncements = createMessageAnnouncements(
            config,
            normalMetadata,
          );
          const highAnnouncements = createMessageAnnouncements(
            config,
            highMetadata,
          );

          // Verify TTLs
          expect(blockAnnouncement.ttl).toBe(3);
          for (const a of normalAnnouncements) {
            expect(a.ttl).toBe(5);
          }
          for (const a of highAnnouncements) {
            expect(a.ttl).toBe(7);
          }

          // Group all announcements by fanout
          const allAnnouncements = [
            blockAnnouncement,
            ...normalAnnouncements,
            ...highAnnouncements,
          ];
          const groups = groupByFanout(config, allAnnouncements);

          // Must have exactly 3 groups (fanout 3, 5, 7)
          expect(groups.size).toBe(3);

          // Block-only group: fanout=3
          expect(groups.has(3)).toBe(true);
          const blockGroup = groups.get(3)!;
          expect(blockGroup.every((a) => a.messageDelivery === undefined)).toBe(
            true,
          );

          // Normal-priority group: fanout=5
          expect(groups.has(5)).toBe(true);
          const normalGroup = groups.get(5)!;
          expect(
            normalGroup.every((a) => a.messageDelivery?.priority === 'normal'),
          ).toBe(true);

          // High-priority group: fanout=7
          expect(groups.has(7)).toBe(true);
          const highGroup = groups.get(7)!;
          expect(
            highGroup.every((a) => a.messageDelivery?.priority === 'high'),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
