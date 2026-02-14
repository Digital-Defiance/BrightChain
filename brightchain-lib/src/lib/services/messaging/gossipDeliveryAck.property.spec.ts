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
} from './gossipRetryService';

/**
 * Property tests for Ack Updates Delivery Status in Metadata Store
 *
 * **Validates: Requirements 4.4**
 *
 * Property 8: Ack Updates Delivery Status in Metadata Store
 * For any DeliveryAck received by the sender node, the metadata store must be
 * updated such that the DeliveryStatus for the corresponding (messageId, recipientId)
 * pair matches the ack's status field. The status transition must be valid according
 * to the state machine (Property 4).
 */
describe('Feature: unified-gossip-delivery, Property 8: Ack updates delivery status', () => {
  // --- Minimal Stubs ---

  /**
   * Creates a minimal IGossipService stub.
   */
  function createGossipServiceStub(): IGossipService {
    return {
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
      announceMessage: async () => {},
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

  /** Generates a valid MessageDeliveryMetadata with unique recipient IDs */
  const messageDeliveryMetadataArb: fc.Arbitrary<MessageDeliveryMetadata> =
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc
        .array(nonEmptyStringArb, { minLength: 1, maxLength: 5 })
        .map((ids) => [...new Set(ids)])
        .filter((ids) => ids.length > 0),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(true),
    });

  /**
   * Generates a valid ack status that represents a valid transition from Announced.
   * When trackDelivery() is called, recipients start at Announced status.
   * Valid transitions from Announced: delivered, failed, bounced.
   */
  const validAckStatusFromAnnouncedArb = fc.constantFrom(
    'delivered' as const,
    'failed' as const,
    'bounced' as const,
  );

  /**
   * Maps ack status strings to DeliveryStatus enum values.
   * This is the expected mapping that handleAck should use.
   */
  function expectedDeliveryStatus(
    ackStatus: 'delivered' | 'read' | 'failed' | 'bounced',
  ): DeliveryStatus {
    switch (ackStatus) {
      case 'delivered':
        return DeliveryStatus.Delivered;
      case 'read':
        return DeliveryStatus.Read;
      case 'failed':
        return DeliveryStatus.Failed;
      case 'bounced':
        return DeliveryStatus.Bounced;
    }
  }

  // --- Property Tests ---

  /**
   * Property 8a: When a valid ack is received, the metadata store is updated
   * with the correct DeliveryStatus for the (messageId, recipientId) pair.
   *
   * For any tracked delivery and any valid ack status from Announced,
   * handleAck must call metadataStore.updateDeliveryStatus with the
   * correct mapped DeliveryStatus.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 8a: valid ack updates metadata store with correct status for (messageId, recipientId)', () => {
    fc.assert(
      fc.property(
        messageDeliveryMetadataArb,
        validAckStatusFromAnnouncedArb,
        nonEmptyStringArb,
        (metadata, ackStatus, originalSenderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          // Track the delivery - recipients start at Announced
          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Pick the first recipient to ack
          const recipientId = metadata.recipientIds[0];

          const ack: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId,
            status: ackStatus,
            originalSenderNode,
          };

          // Handle the ack
          service.handleAck(ack);

          // Verify the metadata store was updated with the correct status
          const expectedStatus = expectedDeliveryStatus(ackStatus);
          const matchingUpdates = metadataStoreStub.statusUpdates.filter(
            (u) =>
              u.messageId === metadata.messageId &&
              u.recipientId === recipientId &&
              u.status === expectedStatus,
          );

          expect(matchingUpdates.length).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8b: The ack status string maps correctly to DeliveryStatus enum values.
   *
   * For each valid ack status ('delivered', 'failed', 'bounced') from Announced,
   * and ('read', 'failed') from Delivered, the metadata store update must contain
   * the corresponding DeliveryStatus enum value.
   *
   * Note: For transitions from Delivered, we use a 2-recipient delivery so that
   * the first 'delivered' ack doesn't cause the delivery to be removed from
   * tracking (it's only fully delivered when ALL recipients are delivered/read).
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 8b: ack status string maps correctly to DeliveryStatus enum values', () => {
    const statusMappings: Array<{
      ackStatus: 'delivered' | 'read' | 'failed' | 'bounced';
      expected: DeliveryStatus;
      fromStatus: DeliveryStatus;
    }> = [
      {
        ackStatus: 'delivered',
        expected: DeliveryStatus.Delivered,
        fromStatus: DeliveryStatus.Announced,
      },
      {
        ackStatus: 'failed',
        expected: DeliveryStatus.Failed,
        fromStatus: DeliveryStatus.Announced,
      },
      {
        ackStatus: 'bounced',
        expected: DeliveryStatus.Bounced,
        fromStatus: DeliveryStatus.Announced,
      },
      {
        ackStatus: 'read',
        expected: DeliveryStatus.Read,
        fromStatus: DeliveryStatus.Delivered,
      },
      {
        ackStatus: 'failed',
        expected: DeliveryStatus.Failed,
        fromStatus: DeliveryStatus.Delivered,
      },
    ];

    /**
     * Generates metadata with exactly 2 unique recipients so that delivering
     * to one recipient doesn't remove the delivery from tracking.
     */
    const twoRecipientMetadataArb: fc.Arbitrary<MessageDeliveryMetadata> = fc
      .tuple(nonEmptyStringArb, nonEmptyStringArb)
      .filter(([a, b]) => a !== b)
      .chain(([r1, r2]) =>
        fc.record({
          messageId: nonEmptyStringArb,
          recipientIds: fc.constant([r1, r2]),
          priority: fc.constantFrom('normal' as const, 'high' as const),
          blockIds: fc.array(nonEmptyStringArb, {
            minLength: 1,
            maxLength: 5,
          }),
          cblBlockId: nonEmptyStringArb,
          ackRequired: fc.constant(true),
        }),
      );

    fc.assert(
      fc.property(
        twoRecipientMetadataArb,
        fc.constantFrom(...statusMappings),
        nonEmptyStringArb,
        (metadata, mapping, originalSenderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          // Track the delivery - recipients start at Announced
          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Use the first recipient as the test subject
          const recipientId = metadata.recipientIds[0];

          // If the mapping requires starting from Delivered, first transition to Delivered
          if (mapping.fromStatus === DeliveryStatus.Delivered) {
            const deliveredAck: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId,
              status: 'delivered',
              originalSenderNode,
            };
            service.handleAck(deliveredAck);
            // Clear previous updates to isolate the test
            metadataStoreStub.statusUpdates.length = 0;
          }

          const ack: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId,
            status: mapping.ackStatus,
            originalSenderNode,
          };

          service.handleAck(ack);

          // Verify the correct DeliveryStatus enum value was stored
          const matchingUpdates = metadataStoreStub.statusUpdates.filter(
            (u) =>
              u.messageId === metadata.messageId &&
              u.recipientId === recipientId &&
              u.status === mapping.expected,
          );

          expect(matchingUpdates.length).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8c: Invalid state transitions are rejected — the metadata store
   * is NOT updated when the ack would cause an invalid transition.
   *
   * For example, an ack with 'read' when recipient is still 'Announced' is invalid
   * (Announced → Read is not in the valid transitions). The metadata store must
   * not be called for such transitions.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 8c: invalid state transitions are rejected and metadata store is not updated', () => {
    // Invalid transitions from Announced: 'read' (Announced → Read is not valid)
    // Invalid transitions from Delivered: 'bounced' (Delivered → Bounced is not valid)
    const invalidTransitions: Array<{
      fromStatus: DeliveryStatus;
      ackStatus: 'delivered' | 'read' | 'failed' | 'bounced';
      setupAckStatus?: 'delivered' | 'read' | 'failed' | 'bounced';
    }> = [
      // Announced → Read is invalid
      { fromStatus: DeliveryStatus.Announced, ackStatus: 'read' },
      // Delivered → Bounced is invalid
      {
        fromStatus: DeliveryStatus.Delivered,
        ackStatus: 'bounced',
        setupAckStatus: 'delivered',
      },
      // Delivered → Delivered is invalid (already delivered)
      {
        fromStatus: DeliveryStatus.Delivered,
        ackStatus: 'delivered',
        setupAckStatus: 'delivered',
      },
    ];

    fc.assert(
      fc.property(
        messageDeliveryMetadataArb,
        fc.constantFrom(...invalidTransitions),
        nonEmptyStringArb,
        (metadata, transition, originalSenderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          // Track the delivery - recipients start at Announced
          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          const recipientId = metadata.recipientIds[0];

          // If we need to set up a prior state (e.g., Delivered), do so first
          if (transition.setupAckStatus) {
            const setupAck: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId,
              status: transition.setupAckStatus,
              originalSenderNode,
            };
            service.handleAck(setupAck);
            // Clear previous updates to isolate the invalid transition test
            metadataStoreStub.statusUpdates.length = 0;
          }

          // Now attempt the invalid transition
          const invalidAck: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId,
            status: transition.ackStatus,
            originalSenderNode,
          };

          service.handleAck(invalidAck);

          // Verify the metadata store was NOT updated for this invalid transition
          expect(metadataStoreStub.statusUpdates.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8d: Acks for unknown messageIds are silently ignored.
   *
   * For any ack with a messageId that has not been tracked via trackDelivery(),
   * the metadata store must not be updated and no error should be thrown.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 8d: acks for unknown messageIds are silently ignored', () => {
    fc.assert(
      fc.property(
        messageDeliveryMetadataArb,
        nonEmptyStringArb,
        validAckStatusFromAnnouncedArb,
        nonEmptyStringArb,
        nonEmptyStringArb,
        (metadata, unknownMessageId, ackStatus, recipientId, senderNode) => {
          // Ensure the unknown messageId is different from the tracked one
          fc.pre(unknownMessageId !== metadata.messageId);

          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          // Track a delivery with a known messageId
          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Send an ack for an unknown messageId
          const ack: DeliveryAckMetadata = {
            messageId: unknownMessageId,
            recipientId,
            status: ackStatus,
            originalSenderNode: senderNode,
          };

          // Should not throw
          service.handleAck(ack);

          // Metadata store should not be updated
          expect(metadataStoreStub.statusUpdates.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8e: Acks for unknown recipientIds within a tracked message are silently ignored.
   *
   * For any ack with a valid messageId but a recipientId that is not in the
   * tracked delivery's recipientIds, the metadata store must not be updated.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 8e: acks for unknown recipientIds within a tracked message are silently ignored', () => {
    fc.assert(
      fc.property(
        messageDeliveryMetadataArb,
        nonEmptyStringArb,
        validAckStatusFromAnnouncedArb,
        nonEmptyStringArb,
        (metadata, unknownRecipientId, ackStatus, senderNode) => {
          // Ensure the unknown recipientId is not in the tracked recipients
          fc.pre(!metadata.recipientIds.includes(unknownRecipientId));

          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          // Track the delivery
          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Send an ack for an unknown recipientId
          const ack: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId: unknownRecipientId,
            status: ackStatus,
            originalSenderNode: senderNode,
          };

          // Should not throw
          service.handleAck(ack);

          // Metadata store should not be updated
          expect(metadataStoreStub.statusUpdates.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8f: Multiple acks for different recipients of the same message
   * each update the metadata store independently.
   *
   * For any tracked delivery with multiple recipients, each valid ack updates
   * the metadata store for the specific (messageId, recipientId) pair without
   * affecting other recipients.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 8f: multiple acks for different recipients each update metadata store independently', () => {
    // Generate metadata with at least 2 unique recipients
    const multiRecipientMetadataArb: fc.Arbitrary<MessageDeliveryMetadata> =
      fc.record({
        messageId: nonEmptyStringArb,
        recipientIds: fc
          .array(nonEmptyStringArb, { minLength: 2, maxLength: 5 })
          .map((ids) => [...new Set(ids)])
          .filter((ids) => ids.length >= 2),
        priority: fc.constantFrom('normal' as const, 'high' as const),
        blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
        cblBlockId: nonEmptyStringArb,
        ackRequired: fc.constant(true),
      });

    fc.assert(
      fc.property(
        multiRecipientMetadataArb,
        nonEmptyStringArb,
        (metadata, senderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Send acks for each recipient with valid statuses from Announced
          const validStatuses: Array<'delivered' | 'failed' | 'bounced'> = [
            'delivered',
            'failed',
            'bounced',
          ];

          for (let i = 0; i < metadata.recipientIds.length; i++) {
            const recipientId = metadata.recipientIds[i];
            const ackStatus = validStatuses[i % validStatuses.length];

            const ack: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId,
              status: ackStatus,
              originalSenderNode: senderNode,
            };

            service.handleAck(ack);
          }

          // Verify each recipient got the correct status update
          for (let i = 0; i < metadata.recipientIds.length; i++) {
            const recipientId = metadata.recipientIds[i];
            const ackStatus = validStatuses[i % validStatuses.length];
            const expected = expectedDeliveryStatus(ackStatus);

            const matchingUpdates = metadataStoreStub.statusUpdates.filter(
              (u) =>
                u.messageId === metadata.messageId &&
                u.recipientId === recipientId &&
                u.status === expected,
            );

            expect(matchingUpdates.length).toBe(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8g: Valid two-step transitions (Announced → Delivered → Read)
   * update the metadata store at each step.
   *
   * For any tracked delivery, when a 'delivered' ack is followed by a 'read' ack
   * for the same recipient, both transitions must update the metadata store.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 8g: valid two-step transitions update metadata store at each step', () => {
    fc.assert(
      fc.property(
        messageDeliveryMetadataArb,
        nonEmptyStringArb,
        (metadata, senderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          const recipientId = metadata.recipientIds[0];

          // Step 1: Announced → Delivered
          const deliveredAck: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId,
            status: 'delivered',
            originalSenderNode: senderNode,
          };
          service.handleAck(deliveredAck);

          // Verify first update
          const deliveredUpdates = metadataStoreStub.statusUpdates.filter(
            (u) =>
              u.messageId === metadata.messageId &&
              u.recipientId === recipientId &&
              u.status === DeliveryStatus.Delivered,
          );
          expect(deliveredUpdates.length).toBe(1);

          // Step 2: Delivered → Read (only if delivery is still tracked)
          // Note: if there's only 1 recipient, the delivery may have been
          // removed after the 'delivered' ack (fully delivered). In that case,
          // the 'read' ack will be silently ignored (unknown messageId).
          const pending = service.getPendingDelivery(metadata.messageId);
          if (pending) {
            const readAck: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId,
              status: 'read',
              originalSenderNode: senderNode,
            };
            service.handleAck(readAck);

            // Verify second update
            const readUpdates = metadataStoreStub.statusUpdates.filter(
              (u) =>
                u.messageId === metadata.messageId &&
                u.recipientId === recipientId &&
                u.status === DeliveryStatus.Read,
            );
            expect(readUpdates.length).toBe(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property tests for All-Recipients-Delivered Triggers Event
 *
 * **Validates: Requirements 4.5**
 *
 * Property 9: All-Recipients-Delivered Triggers Event
 * For any message where every recipient has a DeliveryStatus of Delivered (or Read),
 * the EventNotificationSystem must have emitted exactly one MESSAGE_DELIVERED event
 * for that message. The event must not be emitted while any recipient remains in
 * Announced status.
 */
describe('Feature: unified-gossip-delivery, Property 9: All-recipients-delivered triggers event', () => {
  // --- Minimal Stubs ---

  /**
   * Creates a minimal IGossipService stub.
   */
  function createGossipServiceStub(): IGossipService {
    return {
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
      announceMessage: async () => {},
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

  /** Generates a MessageDeliveryMetadata with a single recipient */
  const singleRecipientMetadataArb: fc.Arbitrary<MessageDeliveryMetadata> =
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 1 }),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(true),
    });

  /**
   * Generates a MessageDeliveryMetadata with 2-5 unique recipients.
   * Ensures all recipient IDs are distinct.
   */
  const multiRecipientMetadataArb: fc.Arbitrary<MessageDeliveryMetadata> =
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc
        .array(nonEmptyStringArb, { minLength: 2, maxLength: 5 })
        .map((ids) => [...new Set(ids)])
        .filter((ids) => ids.length >= 2),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(true),
    });

  /**
   * Generates a MessageDeliveryMetadata with 1-5 unique recipients (flexible).
   */
  const anyRecipientCountMetadataArb: fc.Arbitrary<MessageDeliveryMetadata> =
    fc.record({
      messageId: nonEmptyStringArb,
      recipientIds: fc
        .array(nonEmptyStringArb, { minLength: 1, maxLength: 5 })
        .map((ids) => [...new Set(ids)])
        .filter((ids) => ids.length > 0),
      priority: fc.constantFrom('normal' as const, 'high' as const),
      blockIds: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
      cblBlockId: nonEmptyStringArb,
      ackRequired: fc.constant(true),
    });

  // --- Property Tests ---

  /**
   * Property 9a: When all recipients receive 'delivered' acks, exactly one
   * MESSAGE_DELIVERED event is emitted.
   *
   * For any tracked delivery, when every recipient receives a 'delivered' ack,
   * the event system must emit exactly one 'message:delivered' event.
   *
   * **Validates: Requirements 4.5**
   */
  it('Property 9a: all recipients delivered emits exactly one MESSAGE_DELIVERED event', () => {
    fc.assert(
      fc.property(
        anyRecipientCountMetadataArb,
        nonEmptyStringArb,
        (metadata, senderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Send 'delivered' ack for every recipient
          for (const recipientId of metadata.recipientIds) {
            const ack: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId,
              status: 'delivered',
              originalSenderNode: senderNode,
            };
            service.handleAck(ack);
          }

          // Exactly one MESSAGE_DELIVERED event must be emitted
          const deliveredEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:delivered',
          );
          expect(deliveredEvents.length).toBe(1);

          // No MESSAGE_FAILED events should be emitted
          const failedEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:failed',
          );
          expect(failedEvents.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9a-single: Single-recipient edge case — when the sole recipient
   * receives a 'delivered' ack, exactly one MESSAGE_DELIVERED event is emitted
   * and the delivery is removed from tracking.
   *
   * **Validates: Requirements 4.5**
   */
  it('Property 9a-single: single recipient delivered emits exactly one MESSAGE_DELIVERED event', () => {
    fc.assert(
      fc.property(
        singleRecipientMetadataArb,
        nonEmptyStringArb,
        (metadata, senderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          expect(metadata.recipientIds).toHaveLength(1);

          const ack: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId: metadata.recipientIds[0],
            status: 'delivered',
            originalSenderNode: senderNode,
          };
          service.handleAck(ack);

          const deliveredEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:delivered',
          );
          expect(deliveredEvents.length).toBe(1);

          expect(
            service.getPendingDelivery(metadata.messageId),
          ).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9b: When all recipients have a mix of 'delivered' and 'read' statuses,
   * MESSAGE_DELIVERED is still emitted.
   *
   * For any tracked delivery with multiple recipients, when some recipients are
   * 'delivered' and others transition to 'read' (via delivered → read), the
   * MESSAGE_DELIVERED event must still be emitted exactly once.
   *
   * **Validates: Requirements 4.5**
   */
  it('Property 9b: mix of delivered and read statuses still emits MESSAGE_DELIVERED', () => {
    fc.assert(
      fc.property(
        multiRecipientMetadataArb,
        nonEmptyStringArb,
        (metadata, senderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // First, deliver to all recipients except the last one
          // (so the delivery stays tracked while we transition some to 'read')
          for (let i = 0; i < metadata.recipientIds.length - 1; i++) {
            const ack: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId: metadata.recipientIds[i],
              status: 'delivered',
              originalSenderNode: senderNode,
            };
            service.handleAck(ack);
          }

          // No MESSAGE_DELIVERED yet (last recipient still Announced)
          const midEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:delivered',
          );
          expect(midEvents.length).toBe(0);

          // Transition the first recipient from Delivered → Read
          const readAck: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId: metadata.recipientIds[0],
            status: 'read',
            originalSenderNode: senderNode,
          };
          service.handleAck(readAck);

          // Still no MESSAGE_DELIVERED (last recipient still Announced)
          const midEvents2 = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:delivered',
          );
          expect(midEvents2.length).toBe(0);

          // Now deliver the last recipient
          const lastAck: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId:
              metadata.recipientIds[metadata.recipientIds.length - 1],
            status: 'delivered',
            originalSenderNode: senderNode,
          };
          service.handleAck(lastAck);

          // Now MESSAGE_DELIVERED should be emitted exactly once
          // (mix of Read and Delivered statuses)
          const deliveredEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:delivered',
          );
          expect(deliveredEvents.length).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9c: While any recipient remains in 'Announced' status, no
   * MESSAGE_DELIVERED event is emitted.
   *
   * For any tracked delivery with multiple recipients, delivering acks to
   * all but one recipient must NOT trigger a MESSAGE_DELIVERED event.
   *
   * **Validates: Requirements 4.5**
   */
  it('Property 9c: no MESSAGE_DELIVERED while any recipient remains Announced', () => {
    fc.assert(
      fc.property(
        multiRecipientMetadataArb,
        nonEmptyStringArb,
        (metadata, senderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Deliver to all recipients EXCEPT the last one
          for (let i = 0; i < metadata.recipientIds.length - 1; i++) {
            const ack: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId: metadata.recipientIds[i],
              status: 'delivered',
              originalSenderNode: senderNode,
            };
            service.handleAck(ack);
          }

          // MESSAGE_DELIVERED must NOT be emitted (last recipient still Announced)
          const deliveredEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:delivered',
          );
          expect(deliveredEvents.length).toBe(0);

          // Verify the delivery is still being tracked
          const pending = service.getPendingDelivery(metadata.messageId);
          expect(pending).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9d: The delivery is removed from tracking after MESSAGE_DELIVERED
   * is emitted.
   *
   * For any tracked delivery, once all recipients are delivered and the
   * MESSAGE_DELIVERED event is emitted, the delivery must be removed from
   * the pending deliveries map.
   *
   * **Validates: Requirements 4.5**
   */
  it('Property 9d: delivery removed from tracking after MESSAGE_DELIVERED', () => {
    fc.assert(
      fc.property(
        anyRecipientCountMetadataArb,
        nonEmptyStringArb,
        (metadata, senderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Verify delivery is tracked before acks
          expect(service.getPendingDelivery(metadata.messageId)).toBeDefined();

          // Deliver to all recipients
          for (const recipientId of metadata.recipientIds) {
            const ack: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId,
              status: 'delivered',
              originalSenderNode: senderNode,
            };
            service.handleAck(ack);
          }

          // Delivery must be removed from tracking
          expect(
            service.getPendingDelivery(metadata.messageId),
          ).toBeUndefined();

          // Pending count should not include this delivery
          expect(service.getPendingCount()).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9e: If some recipients fail (status 'failed' or 'bounced'),
   * MESSAGE_DELIVERED is NOT emitted even if other recipients are delivered.
   *
   * For any tracked delivery with multiple recipients, if at least one recipient
   * has a 'failed' or 'bounced' status, the MESSAGE_DELIVERED event must NOT
   * be emitted regardless of other recipients' statuses.
   *
   * **Validates: Requirements 4.5**
   */
  it('Property 9e: MESSAGE_DELIVERED not emitted when any recipient has failed or bounced', () => {
    fc.assert(
      fc.property(
        multiRecipientMetadataArb,
        fc.constantFrom('failed' as const, 'bounced' as const),
        nonEmptyStringArb,
        (metadata, failStatus, senderNode) => {
          const gossipStub = createGossipServiceStub();
          const metadataStoreStub = createMetadataStoreStub();
          const eventStub = createEventSystemStub();

          const service = new GossipRetryService(
            gossipStub,
            metadataStoreStub,
            eventStub,
          );

          service.trackDelivery(
            metadata.messageId,
            metadata.blockIds,
            metadata,
          );

          // Deliver to all recipients except the first one
          for (let i = 1; i < metadata.recipientIds.length; i++) {
            const ack: DeliveryAckMetadata = {
              messageId: metadata.messageId,
              recipientId: metadata.recipientIds[i],
              status: 'delivered',
              originalSenderNode: senderNode,
            };
            service.handleAck(ack);
          }

          // First recipient fails or bounces
          const failAck: DeliveryAckMetadata = {
            messageId: metadata.messageId,
            recipientId: metadata.recipientIds[0],
            status: failStatus,
            originalSenderNode: senderNode,
          };
          service.handleAck(failAck);

          // MESSAGE_DELIVERED must NOT be emitted
          const deliveredEvents = eventStub.emittedEvents.filter(
            (e) => e.type === 'message:delivered',
          );
          expect(deliveredEvents.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
