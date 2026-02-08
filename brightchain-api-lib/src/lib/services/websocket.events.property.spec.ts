/**
 * Property-Based Tests for WebSocket Events
 *
 * Feature: api-server-operations
 * Property 10: State Changes Emit WebSocket Events
 * Property 11: WebSocket Filter Enforcement
 * Property 12: WebSocket Cleanup on Disconnect
 *
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
 *
 * Property 10: For any message operation (store/deliver/fail) or block availability
 * state change, subscribed WebSocket clients SHALL receive an event with the correct
 * type and relevant metadata within the event delivery window.
 *
 * Property 11: For any subscription filter (event types, senderId, recipientId) and
 * any set of emitted events, the client SHALL receive only events that match ALL
 * specified filter criteria.
 *
 * Property 12: For any WebSocket client that disconnects, the server's subscription
 * count SHALL decrease by one, and no events SHALL be sent to the disconnected
 * client's former connection.
 */

import {
  AvailabilityState,
  DurabilityLevel,
  IMessageMetadata,
  MessageDeliveryStatus,
  MessageEncryptionScheme,
  MessagePriority,
  ReplicationStatus,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { WebSocket } from 'ws';
import {
  BlockEventType,
  EventNotificationSystem,
  IEventFilter,
  MessageEventType,
  PartitionEventType,
} from './eventNotificationSystem';

/**
 * Helper to create valid message metadata for testing
 */
const createMetadata = (
  overrides?: Partial<IMessageMetadata>,
): IMessageMetadata => ({
  blockId: 'block-1',
  messageType: 'test',
  senderId: 'sender-1',
  recipients: ['recipient-1'],
  priority: MessagePriority.NORMAL,
  deliveryStatus: new Map([['recipient-1', MessageDeliveryStatus.PENDING]]),
  acknowledgments: new Map(),
  encryptionScheme: MessageEncryptionScheme.NONE,
  isCBL: false,
  cblBlockIds: [],
  createdAt: new Date(),
  expiresAt: null,
  durabilityLevel: DurabilityLevel.Standard,
  parityBlockIds: [],
  accessCount: 0,
  lastAccessedAt: new Date(),
  replicationStatus: ReplicationStatus.Pending,
  targetReplicationFactor: 3,
  replicaNodeIds: [],
  size: 100,
  checksum: '',
  ...overrides,
});

/**
 * Arbitrary generator for message event types
 */
const arbMessageEventType = fc.constantFrom(
  MessageEventType.MESSAGE_STORED,
  MessageEventType.MESSAGE_RECEIVED,
  MessageEventType.MESSAGE_DELIVERED,
  MessageEventType.MESSAGE_FAILED,
);

/**
 * Arbitrary generator for availability states
 */
const arbAvailabilityState = fc.constantFrom(
  AvailabilityState.Local,
  AvailabilityState.Remote,
  AvailabilityState.Cached,
  AvailabilityState.Orphaned,
  AvailabilityState.Unknown,
);

/**
 * Create a mock WebSocket for testing
 */
const createMockWebSocket = (): jest.Mocked<WebSocket> => {
  const closeHandlers: Array<() => void> = [];
  return {
    readyState: WebSocket.OPEN,
    send: jest.fn(),
    on: jest.fn((event: string, handler: () => void) => {
      if (event === 'close') {
        closeHandlers.push(handler);
      }
    }),
    // Helper to simulate close
    _simulateClose: () => {
      closeHandlers.forEach((h) => h());
    },
  } as unknown as jest.Mocked<WebSocket> & { _simulateClose: () => void };
};

describe('WebSocket Events Property Tests', () => {
  describe('Property 10: State Changes Emit WebSocket Events', () => {
    /**
     * Property 10a: Message operations emit events to subscribers
     *
     * For any message operation (store/deliver/fail), subscribed WebSocket clients
     * SHALL receive an event with the correct type and relevant metadata.
     */
    it('Property 10a: Message operations emit events with correct type and metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbMessageEventType,
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
            minLength: 1,
            maxLength: 5,
          }),
          async (eventType, senderId, recipients) => {
            // Feature: api-server-operations, Property 10: State Changes Emit WebSocket Events
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            system.subscribe(mockWs);

            const metadata = createMetadata({ senderId, recipients });
            system.emit(eventType, metadata);

            // Verify event was sent
            expect(mockWs.send).toHaveBeenCalledTimes(1);

            // Parse and verify the sent event
            const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
            const event = JSON.parse(sentData);

            // Verify event type matches
            expect(event.type).toBe(eventType);

            // Verify metadata is included
            expect(event.metadata.senderId).toBe(senderId);
            expect(event.metadata.recipients).toEqual(recipients);

            // Verify timestamp is present and valid
            expect(event.timestamp).toBeDefined();
            const timestamp = new Date(event.timestamp);
            expect(timestamp.toString()).not.toBe('Invalid Date');

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10b: Block availability changes emit events
     *
     * For any block availability state change, subscribed WebSocket clients
     * SHALL receive an event with the correct type and state information.
     */
    it('Property 10b: Block availability changes emit events with state info', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbAvailabilityState,
          arbAvailabilityState,
          async (blockId, oldState, newState) => {
            // Feature: api-server-operations, Property 10: State Changes Emit WebSocket Events
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            system.subscribe(mockWs);

            system.emitBlockAvailabilityChanged(blockId, oldState, newState);

            // Verify event was sent
            expect(mockWs.send).toHaveBeenCalledTimes(1);

            // Parse and verify the sent event
            const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
            const event = JSON.parse(sentData);

            // Verify event type
            expect(event.type).toBe(BlockEventType.AVAILABILITY_CHANGED);

            // Verify state information
            expect(event.data.blockId).toBe(blockId);
            expect(event.data.oldState).toBe(oldState);
            expect(event.data.newState).toBe(newState);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10c: Block replication events emit to subscribers
     *
     * For any block replication operation, subscribed WebSocket clients
     * SHALL receive an event with the correct type and replication details.
     */
    it('Property 10c: Block replication events emit with replication details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.boolean(),
          fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          async (blockId, targetNodeId, success, error) => {
            // Feature: api-server-operations, Property 10: State Changes Emit WebSocket Events
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            system.subscribe(mockWs);

            system.emitBlockReplicated(
              blockId,
              targetNodeId,
              success,
              error ?? undefined,
            );

            // Verify event was sent
            expect(mockWs.send).toHaveBeenCalledTimes(1);

            // Parse and verify the sent event
            const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
            const event = JSON.parse(sentData);

            // Verify event type
            expect(event.type).toBe(BlockEventType.REPLICATED);

            // Verify replication details
            expect(event.data.blockId).toBe(blockId);
            expect(event.data.targetNodeId).toBe(targetNodeId);
            expect(event.data.success).toBe(success);
            if (error) {
              expect(event.data.error).toBe(error);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10d: Partition events emit to all subscribers
     *
     * For any partition state change, ALL subscribed WebSocket clients
     * SHALL receive the partition event with peer information.
     */
    it('Property 10d: Partition events emit to all subscribers with peer info', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
            minLength: 1,
            maxLength: 10,
          }),
          fc.boolean(),
          async (peers, isEntering) => {
            // Feature: api-server-operations, Property 10: State Changes Emit WebSocket Events
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            system.subscribe(mockWs);

            if (isEntering) {
              system.emitPartitionEntered(peers);
            } else {
              system.emitPartitionExited(peers);
            }

            // Verify event was sent
            expect(mockWs.send).toHaveBeenCalledTimes(1);

            // Parse and verify the sent event
            const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
            const event = JSON.parse(sentData);

            // Verify event type
            if (isEntering) {
              expect(event.type).toBe(PartitionEventType.PARTITION_ENTERED);
              expect(event.data.disconnectedPeers).toEqual(peers);
            } else {
              expect(event.type).toBe(PartitionEventType.PARTITION_EXITED);
              expect(event.data.reconnectedPeers).toEqual(peers);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10e: Events delivered to all subscribers
     *
     * For any event, ALL subscribed WebSocket clients SHALL receive the event.
     */
    it('Property 10e: Events delivered to all subscribers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          arbMessageEventType,
          async (numSubscribers, eventType) => {
            // Feature: api-server-operations, Property 10: State Changes Emit WebSocket Events
            const system = new EventNotificationSystem();
            const subscribers: Array<jest.Mocked<WebSocket>> = [];

            for (let i = 0; i < numSubscribers; i++) {
              const mockWs = createMockWebSocket();
              system.subscribe(mockWs);
              subscribers.push(mockWs);
            }

            system.emit(eventType, createMetadata());

            // Verify all subscribers received the event
            for (const ws of subscribers) {
              expect(ws.send).toHaveBeenCalledTimes(1);
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 11: WebSocket Filter Enforcement', () => {
    /**
     * Property 11a: Type filter only receives matching events
     *
     * For any subscription with type filter, the client SHALL receive
     * only events of the specified types.
     */
    it('Property 11a: Type filter only receives matching event types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(arbMessageEventType, { minLength: 1, maxLength: 2 }),
          async (allowedTypes) => {
            // Feature: api-server-operations, Property 11: WebSocket Filter Enforcement
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            const uniqueAllowedTypes = [...new Set(allowedTypes)];
            const filter: IEventFilter = { types: uniqueAllowedTypes };
            system.subscribe(mockWs, filter);

            // Emit all message event types
            const allTypes = [
              MessageEventType.MESSAGE_STORED,
              MessageEventType.MESSAGE_RECEIVED,
              MessageEventType.MESSAGE_DELIVERED,
              MessageEventType.MESSAGE_FAILED,
            ];

            for (const eventType of allTypes) {
              system.emit(eventType, createMetadata());
            }

            // Count how many events should have been received
            const expectedCount = allTypes.filter((t) =>
              uniqueAllowedTypes.includes(t),
            ).length;

            expect(mockWs.send).toHaveBeenCalledTimes(expectedCount);

            // Verify all received events match the filter
            const calls = (mockWs.send as jest.Mock).mock.calls;
            for (const call of calls) {
              const event = JSON.parse(call[0]);
              expect(uniqueAllowedTypes).toContain(event.type);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 11b: Sender filter only receives matching events
     *
     * For any subscription with senderId filter, the client SHALL receive
     * only events from the specified sender.
     */
    it('Property 11b: Sender filter only receives events from specified sender', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
            minLength: 1,
            maxLength: 5,
          }),
          async (targetSender, otherSenders) => {
            // Feature: api-server-operations, Property 11: WebSocket Filter Enforcement
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            const filter: IEventFilter = { senderId: targetSender };
            system.subscribe(mockWs, filter);

            // Emit from target sender
            system.emit(
              MessageEventType.MESSAGE_STORED,
              createMetadata({ senderId: targetSender }),
            );

            // Emit from other senders
            for (const sender of otherSenders) {
              if (sender !== targetSender) {
                system.emit(
                  MessageEventType.MESSAGE_STORED,
                  createMetadata({ senderId: sender }),
                );
              }
            }

            // Should only receive the event from target sender
            expect(mockWs.send).toHaveBeenCalledTimes(1);

            // Verify the received event is from target sender
            const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
            const event = JSON.parse(sentData);
            expect(event.metadata.senderId).toBe(targetSender);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 11c: Recipient filter only receives matching events
     *
     * For any subscription with recipientId filter, the client SHALL receive
     * only events for the specified recipient.
     */
    it('Property 11c: Recipient filter only receives events for specified recipient', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
            minLength: 1,
            maxLength: 5,
          }),
          async (targetRecipient, otherRecipients) => {
            // Feature: api-server-operations, Property 11: WebSocket Filter Enforcement
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            const filter: IEventFilter = { recipientId: targetRecipient };
            system.subscribe(mockWs, filter);

            // Emit with target recipient
            system.emit(
              MessageEventType.MESSAGE_STORED,
              createMetadata({ recipients: [targetRecipient] }),
            );

            // Emit with other recipients
            for (const recipient of otherRecipients) {
              if (recipient !== targetRecipient) {
                system.emit(
                  MessageEventType.MESSAGE_STORED,
                  createMetadata({ recipients: [recipient] }),
                );
              }
            }

            // Should only receive the event for target recipient
            expect(mockWs.send).toHaveBeenCalledTimes(1);

            // Verify the received event is for target recipient
            const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
            const event = JSON.parse(sentData);
            expect(event.metadata.recipients).toContain(targetRecipient);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 11d: Block ID filter only receives matching block events
     *
     * For any subscription with blockId filter, the client SHALL receive
     * only block events for the specified block.
     */
    it('Property 11d: Block ID filter only receives events for specified block', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (targetBlockId, otherBlockIds) => {
            // Feature: api-server-operations, Property 11: WebSocket Filter Enforcement
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            const filter: IEventFilter = { blockId: targetBlockId };
            system.subscribe(mockWs, filter);

            // Emit for target block
            system.emitBlockAvailabilityChanged(
              targetBlockId,
              AvailabilityState.Unknown,
              AvailabilityState.Local,
            );

            // Emit for other blocks
            for (const blockId of otherBlockIds) {
              if (blockId !== targetBlockId) {
                system.emitBlockAvailabilityChanged(
                  blockId,
                  AvailabilityState.Unknown,
                  AvailabilityState.Local,
                );
              }
            }

            // Should only receive the event for target block
            expect(mockWs.send).toHaveBeenCalledTimes(1);

            // Verify the received event is for target block
            const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
            const event = JSON.parse(sentData);
            expect(event.data.blockId).toBe(targetBlockId);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 11e: Multiple filters combine with AND logic
     *
     * For any subscription with multiple filters, the client SHALL receive
     * only events that match ALL specified filter criteria.
     */
    it('Property 11e: Multiple filters combine with AND logic', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 32 }),
          fc.string({ minLength: 1, maxLength: 32 }),
          async (senderId, recipientId) => {
            // Feature: api-server-operations, Property 11: WebSocket Filter Enforcement
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            const filter: IEventFilter = {
              types: [MessageEventType.MESSAGE_STORED],
              senderId,
              recipientId,
            };
            system.subscribe(mockWs, filter);

            // Event matching all filters - should be received
            system.emit(
              MessageEventType.MESSAGE_STORED,
              createMetadata({ senderId, recipients: [recipientId] }),
            );

            // Event with wrong type - should NOT be received
            system.emit(
              MessageEventType.MESSAGE_RECEIVED,
              createMetadata({ senderId, recipients: [recipientId] }),
            );

            // Event with wrong sender - should NOT be received
            system.emit(
              MessageEventType.MESSAGE_STORED,
              createMetadata({
                senderId: 'other-sender',
                recipients: [recipientId],
              }),
            );

            // Event with wrong recipient - should NOT be received
            system.emit(
              MessageEventType.MESSAGE_STORED,
              createMetadata({ senderId, recipients: ['other-recipient'] }),
            );

            // Should only receive the one event matching all filters
            expect(mockWs.send).toHaveBeenCalledTimes(1);

            // Verify the received event matches all criteria
            const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
            const event = JSON.parse(sentData);
            expect(event.type).toBe(MessageEventType.MESSAGE_STORED);
            expect(event.metadata.senderId).toBe(senderId);
            expect(event.metadata.recipients).toContain(recipientId);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 11f: Empty filter receives all events
     *
     * For any subscription without filters, the client SHALL receive all events.
     */
    it('Property 11f: Empty filter receives all events', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (numEvents) => {
          // Feature: api-server-operations, Property 11: WebSocket Filter Enforcement
          const system = new EventNotificationSystem();
          const mockWs = createMockWebSocket();

          // Subscribe without filter
          system.subscribe(mockWs);

          // Emit various events
          for (let i = 0; i < numEvents; i++) {
            system.emit(MessageEventType.MESSAGE_STORED, createMetadata());
          }

          // Should receive all events
          expect(mockWs.send).toHaveBeenCalledTimes(numEvents);

          return true;
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 12: WebSocket Cleanup on Disconnect', () => {
    /**
     * Property 12a: Subscription count decreases on disconnect
     *
     * For any WebSocket client that disconnects, the server's subscription
     * count SHALL decrease by one.
     */
    it('Property 12a: Subscription count decreases on disconnect', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (numSubscribers) => {
            // Feature: api-server-operations, Property 12: WebSocket Cleanup on Disconnect
            const system = new EventNotificationSystem();
            const subscribers: Array<
              jest.Mocked<WebSocket> & { _simulateClose: () => void }
            > = [];

            // Subscribe multiple clients
            for (let i = 0; i < numSubscribers; i++) {
              const mockWs = createMockWebSocket() as jest.Mocked<WebSocket> & {
                _simulateClose: () => void;
              };
              system.subscribe(mockWs);
              subscribers.push(mockWs);
            }

            // Verify initial subscription count
            expect(system.getSubscriptionCount()).toBe(numSubscribers);

            // Disconnect each subscriber one by one
            for (let i = 0; i < numSubscribers; i++) {
              subscribers[i]._simulateClose();
              expect(system.getSubscriptionCount()).toBe(
                numSubscribers - i - 1,
              );
            }

            // Final count should be zero
            expect(system.getSubscriptionCount()).toBe(0);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 12b: No events sent to disconnected clients
     *
     * For any WebSocket client that disconnects, no events SHALL be sent
     * to the disconnected client's former connection.
     */
    it('Property 12b: No events sent to disconnected clients', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          async (eventsBeforeDisconnect, eventsAfterDisconnect) => {
            // Feature: api-server-operations, Property 12: WebSocket Cleanup on Disconnect
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket() as jest.Mocked<WebSocket> & {
              _simulateClose: () => void;
            };

            system.subscribe(mockWs);

            // Emit events before disconnect
            for (let i = 0; i < eventsBeforeDisconnect; i++) {
              system.emit(MessageEventType.MESSAGE_STORED, createMetadata());
            }

            // Verify events were received before disconnect
            expect(mockWs.send).toHaveBeenCalledTimes(eventsBeforeDisconnect);

            // Disconnect
            mockWs._simulateClose();

            // Clear mock to track only post-disconnect calls
            (mockWs.send as jest.Mock).mockClear();

            // Emit events after disconnect
            for (let i = 0; i < eventsAfterDisconnect; i++) {
              system.emit(MessageEventType.MESSAGE_STORED, createMetadata());
            }

            // No events should be sent after disconnect
            expect(mockWs.send).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 12c: Unsubscribe stops event delivery
     *
     * After explicit unsubscribe, the WebSocket SHALL not receive any more events.
     */
    it('Property 12c: Unsubscribe stops event delivery', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          async (eventsBeforeUnsubscribe, eventsAfterUnsubscribe) => {
            // Feature: api-server-operations, Property 12: WebSocket Cleanup on Disconnect
            const system = new EventNotificationSystem();
            const mockWs = createMockWebSocket();

            system.subscribe(mockWs);

            // Emit events before unsubscribe
            for (let i = 0; i < eventsBeforeUnsubscribe; i++) {
              system.emit(MessageEventType.MESSAGE_STORED, createMetadata());
            }

            // Verify events were received before unsubscribe
            expect(mockWs.send).toHaveBeenCalledTimes(eventsBeforeUnsubscribe);

            // Unsubscribe
            system.unsubscribe(mockWs);

            // Clear mock to track only post-unsubscribe calls
            (mockWs.send as jest.Mock).mockClear();

            // Emit events after unsubscribe
            for (let i = 0; i < eventsAfterUnsubscribe; i++) {
              system.emit(MessageEventType.MESSAGE_STORED, createMetadata());
            }

            // No events should be sent after unsubscribe
            expect(mockWs.send).not.toHaveBeenCalled();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 12d: Closed WebSocket state prevents event delivery
     *
     * For any WebSocket in CLOSED state, no events SHALL be sent.
     */
    it('Property 12d: Closed WebSocket state prevents event delivery', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (numEvents) => {
          // Feature: api-server-operations, Property 12: WebSocket Cleanup on Disconnect
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: WebSocket.CLOSED, // CLOSED state
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          // Emit events
          for (let i = 0; i < numEvents; i++) {
            system.emit(MessageEventType.MESSAGE_STORED, createMetadata());
          }

          // No events should be sent to closed WebSocket
          expect(mockWs.send).not.toHaveBeenCalled();

          return true;
        }),
        { numRuns: 50 },
      );
    });

    /**
     * Property 12e: Multiple disconnects handled correctly
     *
     * For any set of subscribers that disconnect in any order, the subscription
     * count SHALL accurately reflect the remaining subscribers.
     */
    it('Property 12e: Multiple disconnects handled correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 0, max: 9 }), {
            minLength: 1,
            maxLength: 10,
          }),
          async (disconnectOrder) => {
            // Feature: api-server-operations, Property 12: WebSocket Cleanup on Disconnect
            const system = new EventNotificationSystem();
            const numSubscribers = 10;
            const subscribers: Array<
              jest.Mocked<WebSocket> & { _simulateClose: () => void }
            > = [];
            const disconnected = new Set<number>();

            // Subscribe all clients
            for (let i = 0; i < numSubscribers; i++) {
              const mockWs = createMockWebSocket() as jest.Mocked<WebSocket> & {
                _simulateClose: () => void;
              };
              system.subscribe(mockWs);
              subscribers.push(mockWs);
            }

            // Disconnect in the specified order
            for (const idx of disconnectOrder) {
              if (!disconnected.has(idx)) {
                subscribers[idx]._simulateClose();
                disconnected.add(idx);
              }
            }

            // Verify subscription count matches remaining subscribers
            expect(system.getSubscriptionCount()).toBe(
              numSubscribers - disconnected.size,
            );

            // Emit an event and verify only connected subscribers receive it
            system.emit(MessageEventType.MESSAGE_STORED, createMetadata());

            for (let i = 0; i < numSubscribers; i++) {
              if (disconnected.has(i)) {
                // Disconnected subscribers should NOT receive the event
                // since they disconnected before the emit
                expect(subscribers[i].send).not.toHaveBeenCalled();
              } else {
                // Connected subscribers should receive the event
                expect(subscribers[i].send).toHaveBeenCalled();
              }
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 12f: isSubscribed returns false after disconnect
     *
     * For any WebSocket that disconnects, isSubscribed SHALL return false.
     */
    it('Property 12f: isSubscribed returns false after disconnect', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(true), async () => {
          // Feature: api-server-operations, Property 12: WebSocket Cleanup on Disconnect
          const system = new EventNotificationSystem();
          const mockWs = createMockWebSocket() as jest.Mocked<WebSocket> & {
            _simulateClose: () => void;
          };

          system.subscribe(mockWs);

          // Verify subscribed
          expect(system.isSubscribed(mockWs)).toBe(true);

          // Disconnect
          mockWs._simulateClose();

          // Verify no longer subscribed
          expect(system.isSubscribed(mockWs)).toBe(false);

          return true;
        }),
        { numRuns: 50 },
      );
    });
  });
});
