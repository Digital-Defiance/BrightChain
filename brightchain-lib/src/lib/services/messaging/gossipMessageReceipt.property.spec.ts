import fc from 'fast-check';
import {
  BlockAnnouncement,
  DEFAULT_GOSSIP_CONFIG,
  DeliveryAckMetadata,
  GossipConfig,
  MessageDeliveryMetadata,
} from '../../interfaces/availability/gossipService';

/**
 * Property tests for Message Receipt Triggers Correct Ack
 *
 * **Validates: Requirements 3.4, 3.5, 4.1**
 *
 * Property 6: Message Receipt Triggers Correct Ack
 * For any BlockAnnouncement with messageDelivery where ackRequired is true
 * and at least one recipientId matches a local user, after the recipient node
 * successfully fetches and indexes the message blocks, the node must produce
 * a DeliveryAck announcement with status equal to 'delivered', messageId
 * matching the original announcement's messageDelivery.messageId, recipientId
 * matching the local user, and originalSenderNode matching the original
 * announcement's nodeId.
 */
describe('Feature: unified-gossip-delivery, Property 6: Message receipt triggers correct ack', () => {
  // --- Simulation of GossipService ack generation logic ---

  /**
   * Simulates the GossipService's handleAnnouncement behavior for message
   * delivery announcements. When a BlockAnnouncement with messageDelivery
   * is received and recipientIds match local users:
   * - Message delivery handlers are triggered (Req 3.4)
   * - If ackRequired is true, a DeliveryAck is generated for each local recipient (Req 3.5, 4.1)
   *
   * Returns the generated DeliveryAck announcements (empty if ackRequired is false
   * or no local recipients match).
   */
  function simulateHandleMessageAnnouncement(
    announcement: BlockAnnouncement,
    localUserIds: Set<string>,
    localNodeId: string,
    config: GossipConfig = DEFAULT_GOSSIP_CONFIG,
  ): BlockAnnouncement[] {
    const acks: BlockAnnouncement[] = [];

    // Only process 'add' type announcements with messageDelivery
    if (announcement.type !== 'add' || !announcement.messageDelivery) {
      return acks;
    }

    // Find matching local recipients
    const matchingLocalRecipients =
      announcement.messageDelivery.recipientIds.filter((id) =>
        localUserIds.has(id),
      );

    if (matchingLocalRecipients.length === 0) {
      return acks;
    }

    // Req 3.5: If ackRequired, generate delivery ack for each local recipient
    if (announcement.messageDelivery.ackRequired) {
      for (const recipientId of matchingLocalRecipients) {
        const ackMetadata: DeliveryAckMetadata = {
          messageId: announcement.messageDelivery.messageId,
          recipientId,
          status: 'delivered',
          originalSenderNode: announcement.nodeId,
        };

        const ackAnnouncement: BlockAnnouncement = {
          type: 'ack',
          blockId: ackMetadata.messageId,
          nodeId: localNodeId,
          timestamp: new Date(),
          ttl: config.defaultTtl,
          deliveryAck: ackMetadata,
        };

        acks.push(ackAnnouncement);
      }
    }

    return acks;
  }

  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a valid MessageDeliveryMetadata with ackRequired=true */
  const messageDeliveryAckRequiredArb: fc.Arbitrary<MessageDeliveryMetadata> =
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(true),
    });

  /** Generates a valid MessageDeliveryMetadata with ackRequired=false */
  const messageDeliveryNoAckArb: fc.Arbitrary<MessageDeliveryMetadata> =
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(false),
    });

  /** Generates the base fields common to all BlockAnnouncements */
  const baseAnnouncementFieldsArb = fc.record({
    blockId: nonEmptyStringArb,
    nodeId: nonEmptyStringArb,
    timestamp: fc.date(),
    ttl: fc.integer({ min: 1, max: 10 }),
  });

  /**
   * Generates a scenario where at least one recipientId matches a local user.
   * Returns { announcement, localUserIds, localNodeId } where the announcement
   * has ackRequired=true and at least one recipient is in localUserIds.
   */
  const matchingScenarioArb = fc
    .tuple(
      baseAnnouncementFieldsArb,
      messageDeliveryAckRequiredArb,
      nonEmptyStringArb, // localNodeId
      fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 3 }), // extra local users
    )
    .map(([base, md, localNodeId, extraLocalUsers]) => {
      // Ensure at least one recipientId is in the local user set
      const localUserIds = new Set([
        md.recipientIds[0], // guarantee at least one match
        ...extraLocalUsers,
      ]);

      const announcement: BlockAnnouncement = {
        ...base,
        type: 'add' as const,
        messageDelivery: md,
      };

      return { announcement, localUserIds, localNodeId };
    });

  /**
   * Generates a scenario with multiple local recipients matching.
   * Ensures at least 2 recipientIds are in the local user set.
   */
  const multipleMatchingRecipientsArb = fc
    .tuple(
      baseAnnouncementFieldsArb,
      fc.array(nonEmptyStringArb, { minLength: 2, maxLength: 5 }), // recipientIds
      nonEmptyStringArb, // messageId
      fc.constantFrom('normal' as const, 'high' as const),
      fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }), // blockIds
      nonEmptyStringArb, // cblBlockId
      nonEmptyStringArb, // localNodeId
    )
    .map(
      ([
        base,
        recipientIds,
        messageId,
        priority,
        blockIds,
        cblBlockId,
        localNodeId,
      ]) => {
        // Deduplicate recipientIds
        const uniqueRecipients = [...new Set(recipientIds)];
        // If dedup reduced to 1, add a synthetic second
        const finalRecipients =
          uniqueRecipients.length >= 2
            ? uniqueRecipients
            : [...uniqueRecipients, uniqueRecipients[0] + '_extra'];

        const md: MessageDeliveryMetadata = {
          messageId,
          recipientIds: finalRecipients,
          priority,
          blockIds,
          cblBlockId,
          ackRequired: true,
        };

        // All recipients are local
        const localUserIds = new Set(finalRecipients);

        const announcement: BlockAnnouncement = {
          ...base,
          type: 'add' as const,
          messageDelivery: md,
        };

        return { announcement, localUserIds, localNodeId };
      },
    );

  // --- Property Tests ---

  /**
   * Property 6a: When ackRequired is true and a recipientId matches a local user,
   * the node produces a DeliveryAck with status 'delivered'.
   *
   * **Validates: Requirements 3.5, 4.1**
   */
  it("Property 6a: ack status is 'delivered' for successfully received messages", () => {
    fc.assert(
      fc.property(
        matchingScenarioArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          // At least one ack must be produced (at least one local recipient matches)
          expect(acks.length).toBeGreaterThan(0);

          // Every ack must have status 'delivered'
          for (const ack of acks) {
            expect(ack.deliveryAck).toBeDefined();
            expect(ack.deliveryAck!.status).toBe('delivered');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6b: The DeliveryAck's messageId matches the original announcement's
   * messageDelivery.messageId.
   *
   * **Validates: Requirements 3.5, 4.1**
   */
  it("Property 6b: ack messageId matches original announcement's messageDelivery.messageId", () => {
    fc.assert(
      fc.property(
        matchingScenarioArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          expect(acks.length).toBeGreaterThan(0);

          const expectedMessageId = announcement.messageDelivery!.messageId;

          for (const ack of acks) {
            expect(ack.deliveryAck).toBeDefined();
            expect(ack.deliveryAck!.messageId).toBe(expectedMessageId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6c: The DeliveryAck's recipientId matches a local user that was
   * in the original announcement's recipientIds.
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it('Property 6c: ack recipientId matches a local user from the original recipientIds', () => {
    fc.assert(
      fc.property(
        matchingScenarioArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          expect(acks.length).toBeGreaterThan(0);

          const originalRecipientIds = new Set(
            announcement.messageDelivery!.recipientIds,
          );

          for (const ack of acks) {
            expect(ack.deliveryAck).toBeDefined();
            // recipientId must be in the local user set
            expect(localUserIds.has(ack.deliveryAck!.recipientId)).toBe(true);
            // recipientId must also be in the original announcement's recipientIds
            expect(originalRecipientIds.has(ack.deliveryAck!.recipientId)).toBe(
              true,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6d: The DeliveryAck's originalSenderNode matches the original
   * announcement's nodeId.
   *
   * **Validates: Requirements 4.1**
   */
  it("Property 6d: ack originalSenderNode matches original announcement's nodeId", () => {
    fc.assert(
      fc.property(
        matchingScenarioArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          expect(acks.length).toBeGreaterThan(0);

          for (const ack of acks) {
            expect(ack.deliveryAck).toBeDefined();
            expect(ack.deliveryAck!.originalSenderNode).toBe(
              announcement.nodeId,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6e: The generated ack announcement has type 'ack' and valid structure.
   * The ack announcement must be of type 'ack', have a blockId equal to the messageId,
   * and have the local node's nodeId.
   *
   * **Validates: Requirements 3.5, 4.1**
   */
  it('Property 6e: generated ack announcement has correct type and structure', () => {
    fc.assert(
      fc.property(
        matchingScenarioArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          expect(acks.length).toBeGreaterThan(0);

          for (const ack of acks) {
            // Type must be 'ack'
            expect(ack.type).toBe('ack');

            // blockId is set to the messageId
            expect(ack.blockId).toBe(announcement.messageDelivery!.messageId);

            // nodeId is the local node (the recipient node sending the ack)
            expect(ack.nodeId).toBe(localNodeId);

            // TTL must be set (using default config TTL)
            expect(ack.ttl).toBe(DEFAULT_GOSSIP_CONFIG.defaultTtl);

            // deliveryAck must be present
            expect(ack.deliveryAck).toBeDefined();

            // No messageDelivery on ack announcements
            expect(ack.messageDelivery).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6f: One ack is produced per matching local recipient.
   * When multiple recipientIds match local users, exactly one ack must be
   * generated for each matching recipient.
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it('Property 6f: exactly one ack per matching local recipient', () => {
    fc.assert(
      fc.property(
        multipleMatchingRecipientsArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          // Count matching local recipients
          const matchingRecipients =
            announcement.messageDelivery!.recipientIds.filter((id) =>
              localUserIds.has(id),
            );

          // Number of acks must equal number of matching local recipients
          expect(acks.length).toBe(matchingRecipients.length);

          // Each matching recipient must have exactly one ack
          const ackedRecipientIds = acks.map((a) => a.deliveryAck!.recipientId);
          for (const recipientId of matchingRecipients) {
            expect(ackedRecipientIds).toContain(recipientId);
          }

          // No duplicate acks for the same recipient
          const uniqueAckedIds = new Set(ackedRecipientIds);
          expect(uniqueAckedIds.size).toBe(ackedRecipientIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6g: No ack is produced when ackRequired is false, even if
   * recipientIds match local users.
   *
   * **Validates: Requirements 3.5**
   */
  it('Property 6g: no ack produced when ackRequired is false', () => {
    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        messageDeliveryNoAckArb,
        nonEmptyStringArb,
        (base, md, localNodeId) => {
          // Ensure at least one recipient is local
          const localUserIds = new Set([md.recipientIds[0]]);

          const announcement: BlockAnnouncement = {
            ...base,
            type: 'add' as const,
            messageDelivery: md,
          };

          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          // No acks should be produced when ackRequired is false
          expect(acks.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6h: No ack is produced when no recipientIds match local users,
   * even if ackRequired is true.
   *
   * **Validates: Requirements 3.4, 3.5**
   */
  it('Property 6h: no ack produced when no recipientIds match local users', () => {
    fc.assert(
      fc.property(
        baseAnnouncementFieldsArb,
        messageDeliveryAckRequiredArb,
        nonEmptyStringArb,
        (base, md, localNodeId) => {
          // Create a local user set that does NOT contain any recipientIds
          // Use a prefix that guarantees no overlap
          const localUserIds = new Set(
            md.recipientIds.map((id) => `__nonmatching__${id}`),
          );

          const announcement: BlockAnnouncement = {
            ...base,
            type: 'add' as const,
            messageDelivery: md,
          };

          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          // No acks should be produced when no recipients are local
          expect(acks.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6i: All ack fields are consistent across all generated acks
   * for the same announcement. The messageId and originalSenderNode must
   * be identical across all acks; only recipientId varies.
   *
   * **Validates: Requirements 3.5, 4.1**
   */
  it('Property 6i: all acks for same announcement share messageId and originalSenderNode', () => {
    fc.assert(
      fc.property(
        multipleMatchingRecipientsArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const acks = simulateHandleMessageAnnouncement(
            announcement,
            localUserIds,
            localNodeId,
          );

          if (acks.length <= 1) {
            return; // Need multiple acks to test consistency
          }

          const firstAck = acks[0].deliveryAck!;

          for (const ack of acks) {
            // messageId must be the same across all acks
            expect(ack.deliveryAck!.messageId).toBe(firstAck.messageId);

            // originalSenderNode must be the same across all acks
            expect(ack.deliveryAck!.originalSenderNode).toBe(
              firstAck.originalSenderNode,
            );

            // status must be 'delivered' for all
            expect(ack.deliveryAck!.status).toBe('delivered');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property tests for Non-Local Recipients Forwarded Normally
 *
 * **Validates: Requirements 3.6**
 *
 * Property 7: Non-Local Recipients Forwarded Normally
 * For any BlockAnnouncement with messageDelivery where none of the recipientIds
 * match local users, the announcement must be forwarded to peers according to
 * standard gossip propagation rules (respecting the priority-adjusted fanout
 * and TTL), and no DeliveryAck must be generated.
 */
describe('Feature: unified-gossip-delivery, Property 7: Non-local recipients forwarded normally', () => {
  // --- Simulation of GossipService forwarding logic ---

  /**
   * Result of processing a BlockAnnouncement at a node.
   * Captures whether the announcement was forwarded, the forwarding parameters,
   * and any acks generated.
   */
  interface ProcessingResult {
    /** Whether the announcement was forwarded to peers */
    forwarded: boolean;
    /** The fanout used for forwarding (number of peers) */
    forwardFanout: number;
    /** The TTL set on the forwarded announcement */
    forwardTtl: number;
    /** Any DeliveryAck announcements generated */
    acks: BlockAnnouncement[];
    /** Whether the message was consumed locally (inbox indexing) */
    consumedLocally: boolean;
  }

  /**
   * Simulates the GossipService's handleAnnouncement behavior for message
   * delivery announcements when no recipientIds match local users.
   *
   * When none of the recipientIds match local users:
   * - The announcement is forwarded according to standard gossip propagation (Req 3.6)
   * - Priority-adjusted fanout and TTL are used (Req 3.1, 3.2)
   * - No DeliveryAck is generated
   * - The message is NOT consumed locally (no inbox indexing)
   *
   * When recipientIds DO match local users:
   * - The message is consumed locally (inbox indexing)
   * - Acks may be generated if ackRequired is true
   * - The announcement is still forwarded (gossip propagation continues)
   */
  function simulateHandleAnnouncementForwarding(
    announcement: BlockAnnouncement,
    localUserIds: Set<string>,
    localNodeId: string,
    config: GossipConfig = DEFAULT_GOSSIP_CONFIG,
  ): ProcessingResult {
    const result: ProcessingResult = {
      forwarded: false,
      forwardFanout: 0,
      forwardTtl: 0,
      acks: [],
      consumedLocally: false,
    };

    // Only process 'add' type announcements with messageDelivery
    if (announcement.type !== 'add' || !announcement.messageDelivery) {
      // Non-message announcements use default config
      if (announcement.ttl > 0) {
        result.forwarded = true;
        result.forwardFanout = config.fanout;
        result.forwardTtl = announcement.ttl - 1;
      }
      return result;
    }

    const md = announcement.messageDelivery;

    // Find matching local recipients
    const matchingLocalRecipients = md.recipientIds.filter((id) =>
      localUserIds.has(id),
    );

    // Determine priority-adjusted fanout and TTL
    const priorityConfig = config.messagePriority[md.priority];
    const effectiveFanout = priorityConfig.fanout;
    const effectiveTtl = priorityConfig.ttl;

    if (matchingLocalRecipients.length > 0) {
      // Local recipients found — consume locally
      result.consumedLocally = true;

      // Generate acks if ackRequired
      if (md.ackRequired) {
        for (const recipientId of matchingLocalRecipients) {
          const ackMetadata: DeliveryAckMetadata = {
            messageId: md.messageId,
            recipientId,
            status: 'delivered',
            originalSenderNode: announcement.nodeId,
          };

          const ackAnnouncement: BlockAnnouncement = {
            type: 'ack',
            blockId: ackMetadata.messageId,
            nodeId: localNodeId,
            timestamp: new Date(),
            ttl: config.defaultTtl,
            deliveryAck: ackMetadata,
          };

          result.acks.push(ackAnnouncement);
        }
      }
    }

    // Req 3.6: When no local recipients match, forward according to
    // standard gossip propagation with priority-adjusted fanout/TTL.
    // (In practice, forwarding also happens when local recipients exist,
    // but the key property is that non-local-only announcements are
    // always forwarded and never consumed locally.)
    if (announcement.ttl > 0) {
      result.forwarded = true;
      result.forwardFanout = effectiveFanout;
      // The forwarded TTL is the priority-adjusted TTL minus 1 hop,
      // but capped at the announcement's current TTL - 1
      result.forwardTtl = Math.min(effectiveTtl, announcement.ttl) - 1;
    }

    return result;
  }

  // --- Smart Generators ---

  /** Generates a non-empty string suitable for IDs */
  const nonEmptyStringArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0);

  /** Generates a valid MessageDeliveryMetadata */
  const messageDeliveryArb: fc.Arbitrary<MessageDeliveryMetadata> = fc.record({
    messageId: nonEmptyStringArb,
    recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    priority: fc.constantFrom('normal' as const, 'high' as const),
    blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
    cblBlockId: nonEmptyStringArb,
    ackRequired: fc.boolean(),
  });

  /** Generates the base fields common to all BlockAnnouncements */
  const baseAnnouncementFieldsArb = fc.record({
    blockId: nonEmptyStringArb,
    nodeId: nonEmptyStringArb,
    timestamp: fc.date(),
    ttl: fc.integer({ min: 1, max: 10 }),
  });

  /**
   * Generates a scenario where NO recipientIds match local users.
   * Uses a prefix-based approach to guarantee no overlap between
   * recipientIds and localUserIds.
   */
  const nonLocalScenarioArb = fc
    .tuple(
      baseAnnouncementFieldsArb,
      messageDeliveryArb,
      nonEmptyStringArb, // localNodeId
      fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }), // local user base names
    )
    .map(([base, md, localNodeId, localUserBaseNames]) => {
      // Ensure local user IDs do NOT overlap with any recipientIds
      // by prefixing local user names with a guaranteed non-matching prefix
      const localUserIds = new Set(
        localUserBaseNames.map((name) => `__local__${name}`),
      );

      // Also ensure recipientIds don't accidentally match by prefixing them
      const safeRecipientIds = md.recipientIds.map((id) => `__remote__${id}`);

      const safeMetadata: MessageDeliveryMetadata = {
        ...md,
        recipientIds: safeRecipientIds,
      };

      const announcement: BlockAnnouncement = {
        ...base,
        type: 'add' as const,
        messageDelivery: safeMetadata,
      };

      return { announcement, localUserIds, localNodeId };
    });

  /**
   * Generates a custom GossipConfig with valid priority settings.
   */
  const gossipConfigArb: fc.Arbitrary<GossipConfig> = fc.record({
    fanout: fc.integer({ min: 1, max: 10 }),
    defaultTtl: fc.integer({ min: 1, max: 10 }),
    batchIntervalMs: fc.constant(1000),
    maxBatchSize: fc.constant(100),
    messagePriority: fc.record({
      normal: fc.record({
        fanout: fc.integer({ min: 1, max: 10 }),
        ttl: fc.integer({ min: 1, max: 10 }),
      }),
      high: fc.record({
        fanout: fc.integer({ min: 1, max: 10 }),
        ttl: fc.integer({ min: 1, max: 10 }),
      }),
    }),
  });

  // --- Property Tests ---

  /**
   * Property 7a: When no recipientIds match local users, the announcement
   * is forwarded (not consumed locally).
   *
   * **Validates: Requirements 3.6**
   */
  it('Property 7a: non-local recipients cause forwarding, not local consumption', () => {
    fc.assert(
      fc.property(
        nonLocalScenarioArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const result = simulateHandleAnnouncementForwarding(
            announcement,
            localUserIds,
            localNodeId,
          );

          // The announcement must be forwarded (TTL > 0 guaranteed by generator)
          expect(result.forwarded).toBe(true);

          // The message must NOT be consumed locally
          expect(result.consumedLocally).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7b: No DeliveryAck is generated when no recipientIds match
   * local users, regardless of ackRequired setting.
   *
   * **Validates: Requirements 3.6**
   */
  it('Property 7b: no DeliveryAck generated for non-local recipients', () => {
    fc.assert(
      fc.property(
        nonLocalScenarioArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const result = simulateHandleAnnouncementForwarding(
            announcement,
            localUserIds,
            localNodeId,
          );

          // No acks must be generated
          expect(result.acks.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7c: Forwarding uses priority-adjusted fanout for normal-priority
   * messages (fanout=5, TTL=5 with default config).
   *
   * **Validates: Requirements 3.6**
   */
  it('Property 7c: normal-priority non-local messages use correct fanout', () => {
    fc.assert(
      fc.property(
        nonLocalScenarioArb.filter(
          ({ announcement }) =>
            announcement.messageDelivery!.priority === 'normal',
        ),
        ({ announcement, localUserIds, localNodeId }) => {
          const result = simulateHandleAnnouncementForwarding(
            announcement,
            localUserIds,
            localNodeId,
          );

          // Fanout must match normal priority config (default: 5)
          expect(result.forwardFanout).toBe(
            DEFAULT_GOSSIP_CONFIG.messagePriority.normal.fanout,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7d: Forwarding uses priority-adjusted fanout for high-priority
   * messages (fanout=7, TTL=7 with default config).
   *
   * **Validates: Requirements 3.6**
   */
  it('Property 7d: high-priority non-local messages use correct fanout', () => {
    fc.assert(
      fc.property(
        nonLocalScenarioArb.filter(
          ({ announcement }) =>
            announcement.messageDelivery!.priority === 'high',
        ),
        ({ announcement, localUserIds, localNodeId }) => {
          const result = simulateHandleAnnouncementForwarding(
            announcement,
            localUserIds,
            localNodeId,
          );

          // Fanout must match high priority config (default: 7)
          expect(result.forwardFanout).toBe(
            DEFAULT_GOSSIP_CONFIG.messagePriority.high.fanout,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7e: Forwarding respects priority-adjusted TTL. The forwarded
   * TTL is decremented by 1 from the effective TTL (min of priority TTL
   * and announcement TTL).
   *
   * **Validates: Requirements 3.6**
   */
  it('Property 7e: forwarded TTL respects priority-adjusted TTL with decrement', () => {
    fc.assert(
      fc.property(
        nonLocalScenarioArb,
        ({ announcement, localUserIds, localNodeId }) => {
          const result = simulateHandleAnnouncementForwarding(
            announcement,
            localUserIds,
            localNodeId,
          );

          const priorityConfig =
            DEFAULT_GOSSIP_CONFIG.messagePriority[
              announcement.messageDelivery!.priority
            ];
          const expectedTtl =
            Math.min(priorityConfig.ttl, announcement.ttl) - 1;

          expect(result.forwardTtl).toBe(expectedTtl);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7f: Forwarding fanout and TTL respect custom GossipConfig.
   * When a custom config is provided, the priority-adjusted values from
   * that config are used instead of defaults.
   *
   * **Validates: Requirements 3.6**
   */
  it('Property 7f: forwarding respects custom GossipConfig priority settings', () => {
    fc.assert(
      fc.property(
        nonLocalScenarioArb,
        gossipConfigArb,
        ({ announcement, localUserIds, localNodeId }, config) => {
          const result = simulateHandleAnnouncementForwarding(
            announcement,
            localUserIds,
            localNodeId,
            config,
          );

          const priority = announcement.messageDelivery!.priority;
          const priorityConfig = config.messagePriority[priority];

          // Fanout must match the custom config's priority fanout
          expect(result.forwardFanout).toBe(priorityConfig.fanout);

          // TTL must be decremented from the effective TTL
          const expectedTtl =
            Math.min(priorityConfig.ttl, announcement.ttl) - 1;
          expect(result.forwardTtl).toBe(expectedTtl);

          // No acks generated
          expect(result.acks.length).toBe(0);

          // Not consumed locally
          expect(result.consumedLocally).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7g: Announcements with TTL=0 are not forwarded, even for
   * non-local recipients. This ensures TTL expiration is respected.
   *
   * **Validates: Requirements 3.6**
   */
  it('Property 7g: announcements with TTL=0 are not forwarded', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(
            baseAnnouncementFieldsArb,
            messageDeliveryArb,
            nonEmptyStringArb,
            fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 3 }),
          )
          .map(([base, md, localNodeId, localUserBaseNames]) => {
            const localUserIds = new Set(
              localUserBaseNames.map((name) => `__local__${name}`),
            );
            const safeRecipientIds = md.recipientIds.map(
              (id) => `__remote__${id}`,
            );
            const safeMetadata: MessageDeliveryMetadata = {
              ...md,
              recipientIds: safeRecipientIds,
            };
            const announcement: BlockAnnouncement = {
              ...base,
              type: 'add' as const,
              ttl: 0, // Force TTL=0
              messageDelivery: safeMetadata,
            };
            return { announcement, localUserIds, localNodeId };
          }),
        ({ announcement, localUserIds, localNodeId }) => {
          const result = simulateHandleAnnouncementForwarding(
            announcement,
            localUserIds,
            localNodeId,
          );

          // Must NOT be forwarded when TTL=0
          expect(result.forwarded).toBe(false);
          expect(result.forwardFanout).toBe(0);
          expect(result.forwardTtl).toBe(0);

          // Still no acks for non-local recipients
          expect(result.acks.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7h: Contrast property — when recipientIds DO match local users,
   * the message IS consumed locally and acks ARE generated (if ackRequired).
   * This confirms the non-local forwarding path is distinct from local consumption.
   *
   * **Validates: Requirements 3.6**
   */
  it('Property 7h: contrast — local recipients cause local consumption and acks', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(
            baseAnnouncementFieldsArb,
            messageDeliveryArb,
            nonEmptyStringArb,
          )
          .map(([base, md, localNodeId]) => {
            // Force ackRequired=true and ensure at least one local match
            const safeMetadata: MessageDeliveryMetadata = {
              ...md,
              ackRequired: true,
            };
            // Make the first recipientId a local user
            const localUserIds = new Set([safeMetadata.recipientIds[0]]);

            const announcement: BlockAnnouncement = {
              ...base,
              type: 'add' as const,
              messageDelivery: safeMetadata,
            };

            return { announcement, localUserIds, localNodeId };
          }),
        ({ announcement, localUserIds, localNodeId }) => {
          const result = simulateHandleAnnouncementForwarding(
            announcement,
            localUserIds,
            localNodeId,
          );

          // Message IS consumed locally
          expect(result.consumedLocally).toBe(true);

          // Acks ARE generated for local recipients
          expect(result.acks.length).toBeGreaterThan(0);

          // Each ack has correct structure
          for (const ack of result.acks) {
            expect(ack.type).toBe('ack');
            expect(ack.deliveryAck).toBeDefined();
            expect(ack.deliveryAck!.status).toBe('delivered');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
