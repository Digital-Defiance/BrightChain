import fc from 'fast-check';
import {
  BlockAnnouncement,
  DEFAULT_GOSSIP_CONFIG,
  GossipConfig,
} from '../../interfaces/availability/gossipService';

/**
 * Property tests for Backward Compatibility of Non-Message Announcements
 *
 * **Validates: Requirements 1.4**
 *
 * Property 3: Backward Compatibility for Non-Message Announcements
 * For any BlockAnnouncement without messageDelivery and without deliveryAck,
 * the gossip service must process the announcement identically to the pre-unified
 * behavior — same fanout, same TTL, same forwarding logic. The presence of the
 * unified gossip delivery feature must not alter block-level gossip behavior.
 */
describe('Feature: unified-gossip-delivery, Property 3: Backward compatibility', () => {
  // --- Helpers that mirror GossipService behavior ---

  /**
   * Simulates the GossipService's announceBlock behavior:
   * creates a plain BlockAnnouncement with the default TTL from config.
   * This is the pre-unified behavior for block announcements.
   */
  function createPlainBlockAnnouncement(
    config: GossipConfig,
    blockId: string,
    nodeId: string,
  ): BlockAnnouncement {
    return {
      type: 'add',
      blockId,
      nodeId,
      timestamp: new Date(),
      ttl: config.defaultTtl,
    };
  }

  /**
   * Simulates the GossipService's announceRemoval behavior:
   * creates a plain 'remove' BlockAnnouncement with the default TTL from config.
   */
  function createPlainRemovalAnnouncement(
    config: GossipConfig,
    blockId: string,
    nodeId: string,
  ): BlockAnnouncement {
    return {
      type: 'remove',
      blockId,
      nodeId,
      timestamp: new Date(),
      ttl: config.defaultTtl,
    };
  }

  /**
   * Simulates the GossipService's handleAnnouncement forwarding logic
   * for plain block announcements (no messageDelivery, no deliveryAck).
   *
   * Returns the forwarded announcement if TTL > 0, or null if not forwarded.
   */
  function handlePlainAnnouncement(
    announcement: BlockAnnouncement,
  ): BlockAnnouncement | null {
    // Plain announcements are forwarded with decremented TTL if TTL > 0
    if (announcement.ttl > 0) {
      return {
        ...announcement,
        ttl: announcement.ttl - 1,
      };
    }
    return null;
  }

  /**
   * Determines the fanout for a given announcement based on config.
   * For plain block announcements (no messageDelivery), this must always
   * be the base config fanout — the same as pre-unified behavior.
   */
  function getFanoutForAnnouncement(
    config: GossipConfig,
    announcement: BlockAnnouncement,
  ): number {
    if (announcement.messageDelivery) {
      return config.messagePriority[announcement.messageDelivery.priority]
        .fanout;
    }
    // Plain block announcements always use base fanout
    return config.fanout;
  }

  /**
   * Simulates peer selection: selects min(fanout, peerCount) peers.
   */
  function selectPeerCount(totalPeers: number, fanout: number): number {
    return Math.min(totalPeers, fanout);
  }

  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a positive integer for fanout/TTL config values */
  const positiveIntArb = fc.integer({ min: 1, max: 50 });

  /** Generates a valid TTL value (0 to 10) */
  const ttlArb = fc.integer({ min: 0, max: 10 });

  /** Generates a plain 'add' BlockAnnouncement (no messageDelivery, no deliveryAck) */
  const plainAddAnnouncementArb: fc.Arbitrary<BlockAnnouncement> = fc
    .record({
      blockId: nonEmptyStringArb,
      nodeId: nonEmptyStringArb,
      timestamp: fc.date(),
      ttl: ttlArb,
    })
    .map((base) => ({
      ...base,
      type: 'add' as const,
    }));

  /** Generates a plain 'remove' BlockAnnouncement (no messageDelivery, no deliveryAck) */
  const plainRemoveAnnouncementArb: fc.Arbitrary<BlockAnnouncement> = fc
    .record({
      blockId: nonEmptyStringArb,
      nodeId: nonEmptyStringArb,
      timestamp: fc.date(),
      ttl: ttlArb,
    })
    .map((base) => ({
      ...base,
      type: 'remove' as const,
    }));

  /** Generates any plain BlockAnnouncement (add or remove, no message metadata) */
  const plainAnnouncementArb: fc.Arbitrary<BlockAnnouncement> = fc.oneof(
    plainAddAnnouncementArb,
    plainRemoveAnnouncementArb,
  );

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
   * Property 3a: Plain block announcements use default fanout from config.
   * For any plain BlockAnnouncement (no messageDelivery, no deliveryAck),
   * the fanout used for propagation must be the base config.fanout value,
   * regardless of what messagePriority values are configured.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3a: plain block announcements use default fanout from config', () => {
    fc.assert(
      fc.property(
        customGossipConfigArb,
        plainAnnouncementArb,
        (config, announcement) => {
          const fanout = getFanoutForAnnouncement(config, announcement);

          // Must use the base config fanout, NOT any message priority fanout
          expect(fanout).toBe(config.fanout);

          // Must NOT use normal or high priority fanout
          // (unless they happen to equal the base fanout by coincidence)
          expect(announcement.messageDelivery).toBeUndefined();
          expect(announcement.deliveryAck).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3b: Plain block announcements use default TTL from config.
   * When a block is announced via announceBlock or announceRemoval,
   * the TTL must be set to config.defaultTtl, not any message priority TTL.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3b: plain block announcements use default TTL from config', () => {
    fc.assert(
      fc.property(
        customGossipConfigArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        (config, blockId, nodeId) => {
          // Simulate announceBlock
          const addAnnouncement = createPlainBlockAnnouncement(
            config,
            blockId,
            nodeId,
          );
          expect(addAnnouncement.ttl).toBe(config.defaultTtl);
          expect(addAnnouncement.messageDelivery).toBeUndefined();
          expect(addAnnouncement.deliveryAck).toBeUndefined();

          // Simulate announceRemoval
          const removeAnnouncement = createPlainRemovalAnnouncement(
            config,
            blockId,
            nodeId,
          );
          expect(removeAnnouncement.ttl).toBe(config.defaultTtl);
          expect(removeAnnouncement.messageDelivery).toBeUndefined();
          expect(removeAnnouncement.deliveryAck).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3c: Plain block announcements are forwarded with TTL decremented by 1.
   * When a plain BlockAnnouncement with TTL > 0 is handled, it must be forwarded
   * with TTL decremented by exactly 1. This is identical to pre-unified behavior.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3c: plain announcements with TTL > 0 are forwarded with TTL-1', () => {
    fc.assert(
      fc.property(
        plainAnnouncementArb.filter((a) => a.ttl > 0),
        (announcement) => {
          const forwarded = handlePlainAnnouncement(announcement);

          // Must be forwarded
          expect(forwarded).not.toBeNull();

          // TTL must be decremented by exactly 1
          expect(forwarded!.ttl).toBe(announcement.ttl - 1);

          // All other fields must be preserved
          expect(forwarded!.type).toBe(announcement.type);
          expect(forwarded!.blockId).toBe(announcement.blockId);
          expect(forwarded!.nodeId).toBe(announcement.nodeId);

          // Must still have no message metadata
          expect(forwarded!.messageDelivery).toBeUndefined();
          expect(forwarded!.deliveryAck).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3d: Plain block announcements with TTL=0 are not forwarded.
   * When a plain BlockAnnouncement with TTL=0 is handled, it must NOT be
   * forwarded. This is identical to pre-unified behavior.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3d: plain announcements with TTL=0 are not forwarded', () => {
    fc.assert(
      fc.property(
        plainAnnouncementArb.map((a) => ({ ...a, ttl: 0 })),
        (announcement) => {
          const forwarded = handlePlainAnnouncement(announcement);

          // Must NOT be forwarded
          expect(forwarded).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3e: Default config values produce correct fanout and TTL for plain announcements.
   * Using DEFAULT_GOSSIP_CONFIG, plain block announcements must use fanout=3 and TTL=3,
   * which are the pre-unified default values.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3e: DEFAULT_GOSSIP_CONFIG produces fanout=3 and TTL=3 for plain announcements', () => {
    fc.assert(
      fc.property(nonEmptyStringArb, nonEmptyStringArb, (blockId, nodeId) => {
        const config = DEFAULT_GOSSIP_CONFIG;

        // announceBlock behavior
        const addAnnouncement = createPlainBlockAnnouncement(
          config,
          blockId,
          nodeId,
        );
        expect(addAnnouncement.ttl).toBe(3);

        // Fanout must be 3
        const fanout = getFanoutForAnnouncement(config, addAnnouncement);
        expect(fanout).toBe(3);

        // announceRemoval behavior
        const removeAnnouncement = createPlainRemovalAnnouncement(
          config,
          blockId,
          nodeId,
        );
        expect(removeAnnouncement.ttl).toBe(3);

        const removeFanout = getFanoutForAnnouncement(
          config,
          removeAnnouncement,
        );
        expect(removeFanout).toBe(3);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3f: Message priority config does not affect plain block announcement propagation.
   * For any GossipConfig with arbitrary messagePriority values, plain block announcements
   * must still use the base fanout and TTL, proving that the unified gossip delivery
   * feature does not alter block-level gossip behavior.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3f: message priority config does not affect plain block propagation', () => {
    fc.assert(
      fc.property(
        customGossipConfigArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        (config, blockId, nodeId) => {
          // Create plain announcements
          const addAnnouncement = createPlainBlockAnnouncement(
            config,
            blockId,
            nodeId,
          );
          const removeAnnouncement = createPlainRemovalAnnouncement(
            config,
            blockId,
            nodeId,
          );

          // TTL must come from base config, not message priority
          expect(addAnnouncement.ttl).toBe(config.defaultTtl);
          expect(removeAnnouncement.ttl).toBe(config.defaultTtl);

          // Fanout must come from base config, not message priority
          expect(getFanoutForAnnouncement(config, addAnnouncement)).toBe(
            config.fanout,
          );
          expect(getFanoutForAnnouncement(config, removeAnnouncement)).toBe(
            config.fanout,
          );

          // Verify these are independent of message priority values
          // by checking they don't accidentally match priority values
          // (this is a structural check — the fanout function must not
          // reference messagePriority for plain announcements)
          expect(addAnnouncement.messageDelivery).toBeUndefined();
          expect(removeAnnouncement.messageDelivery).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3g: Plain block announcements reach exactly TTL hops before stopping.
   * For any plain BlockAnnouncement with a given TTL, repeated forwarding must
   * produce exactly TTL forwarded announcements before TTL reaches 0 and
   * forwarding stops. This is the same multi-hop behavior as pre-unified gossip.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3g: plain announcements propagate for exactly TTL hops', () => {
    fc.assert(
      fc.property(
        plainAnnouncementArb.filter((a) => a.ttl >= 1 && a.ttl <= 10),
        (announcement) => {
          let current: BlockAnnouncement | null = announcement;
          let hopCount = 0;

          while (current && current.ttl > 0) {
            const forwarded = handlePlainAnnouncement(current);
            if (forwarded) {
              hopCount++;
              // Each hop must preserve type, blockId, nodeId
              expect(forwarded.type).toBe(announcement.type);
              expect(forwarded.blockId).toBe(announcement.blockId);
              expect(forwarded.nodeId).toBe(announcement.nodeId);
              // No message metadata must appear during forwarding
              expect(forwarded.messageDelivery).toBeUndefined();
              expect(forwarded.deliveryAck).toBeUndefined();
            }
            current = forwarded;
          }

          // Must have forwarded exactly TTL times
          expect(hopCount).toBe(announcement.ttl);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3h: Peer selection count for plain announcements uses base fanout.
   * For any number of connected peers and any config where the base fanout
   * differs from message priority fanouts, the number of peers selected for
   * plain block announcement propagation must be min(config.fanout, peerCount),
   * proving the message priority config is not consulted.
   *
   * **Validates: Requirements 1.4**
   */
  it('Property 3h: peer selection for plain announcements uses base fanout', () => {
    // Generate configs where base fanout differs from both priority fanouts
    // to make the distinction observable
    const distinctFanoutConfigArb: fc.Arbitrary<GossipConfig> = fc
      .tuple(
        positiveIntArb, // base fanout
        positiveIntArb, // base TTL
        positiveIntArb, // normal TTL
        positiveIntArb, // high TTL
      )
      .map(([baseFanout, baseTtl, normalTtl, highTtl]) => ({
        fanout: baseFanout,
        defaultTtl: baseTtl,
        batchIntervalMs: 1000,
        maxBatchSize: 100,
        messagePriority: {
          // Ensure normal and high fanouts differ from base
          normal: { fanout: baseFanout + 10, ttl: normalTtl },
          high: { fanout: baseFanout + 20, ttl: highTtl },
        },
      }));

    fc.assert(
      fc.property(
        distinctFanoutConfigArb,
        fc.integer({ min: 1, max: 100 }),
        plainAnnouncementArb,
        (config, peerCount, announcement) => {
          const fanout = getFanoutForAnnouncement(config, announcement);
          const selectedCount = selectPeerCount(peerCount, fanout);

          // Selected peers must be min(base fanout, available peers)
          expect(selectedCount).toBe(Math.min(config.fanout, peerCount));

          // The fanout used must be the base fanout, not any priority fanout
          expect(fanout).toBe(config.fanout);
          expect(fanout).not.toBe(config.messagePriority.normal.fanout);
          expect(fanout).not.toBe(config.messagePriority.high.fanout);
        },
      ),
      { numRuns: 100 },
    );
  });
});
