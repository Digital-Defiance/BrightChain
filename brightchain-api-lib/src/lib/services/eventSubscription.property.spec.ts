import fc from 'fast-check';
import { EventNotificationSystem, MessageEventType, IEventFilter } from './eventNotificationSystem';
import { WebSocket } from 'ws';
import { IMessageMetadata, MessageDeliveryStatus, MessageEncryptionScheme, MessagePriority, ReplicationStatus, DurabilityLevel } from '@brightchain/brightchain-lib';

/**
 * Property tests for WebSocket event subscription
 * Validates Requirement 5.5
 */
describe('Feature: message-passing-and-events, Property: WebSocket Event Subscription', () => {
  const createMetadata = (overrides?: Partial<IMessageMetadata>): IMessageMetadata => ({
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
   * Property 18a: Subscription without filter receives all events
   * Any WebSocket subscribed without filter should receive all event types
   */
  it('Property 18a: should receive all events without filter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            MessageEventType.MESSAGE_STORED,
            MessageEventType.MESSAGE_RECEIVED,
            MessageEventType.MESSAGE_DELIVERED,
            MessageEventType.MESSAGE_FAILED
          ),
          { minLength: 1, maxLength: 10 }
        ),
        async (eventTypes) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          for (const eventType of eventTypes) {
            system.emit(eventType, createMetadata());
          }

          expect(mockWs.send).toHaveBeenCalledTimes(eventTypes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18b: Type filter only receives matching events
   * Subscription with type filter should only receive events of specified types
   */
  it('Property 18b: should filter events by type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            MessageEventType.MESSAGE_STORED,
            MessageEventType.MESSAGE_RECEIVED
          ),
          { minLength: 1, maxLength: 3 }
        ),
        async (allowedTypes) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          const filter: IEventFilter = { types: allowedTypes };
          system.subscribe(mockWs, filter);

          // Emit allowed events
          for (const eventType of allowedTypes) {
            system.emit(eventType, createMetadata());
          }

          // Emit disallowed events
          system.emit(MessageEventType.MESSAGE_DELIVERED, createMetadata());
          system.emit(MessageEventType.MESSAGE_FAILED, createMetadata());

          expect(mockWs.send).toHaveBeenCalledTimes(allowedTypes.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18c: Sender filter only receives matching events
   * Subscription with senderId filter should only receive events from that sender
   */
  it('Property 18c: should filter events by senderId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.array(fc.string({ minLength: 1, maxLength: 32 }), { minLength: 1, maxLength: 5 }),
        async (targetSender, otherSenders) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          const filter: IEventFilter = { senderId: targetSender };
          system.subscribe(mockWs, filter);

          // Emit from target sender
          system.emit(MessageEventType.MESSAGE_STORED, createMetadata({ senderId: targetSender }));

          // Emit from other senders
          for (const sender of otherSenders) {
            if (sender !== targetSender) {
              system.emit(MessageEventType.MESSAGE_STORED, createMetadata({ senderId: sender }));
            }
          }

          expect(mockWs.send).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18d: Recipient filter only receives matching events
   * Subscription with recipientId filter should only receive events for that recipient
   */
  it('Property 18d: should filter events by recipientId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.array(fc.string({ minLength: 1, maxLength: 32 }), { minLength: 1, maxLength: 5 }),
        async (targetRecipient, otherRecipients) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          const filter: IEventFilter = { recipientId: targetRecipient };
          system.subscribe(mockWs, filter);

          // Emit with target recipient
          system.emit(MessageEventType.MESSAGE_STORED, createMetadata({ recipients: [targetRecipient] }));

          // Emit with other recipients
          for (const recipient of otherRecipients) {
            if (recipient !== targetRecipient) {
              system.emit(MessageEventType.MESSAGE_STORED, createMetadata({ recipients: [recipient] }));
            }
          }

          expect(mockWs.send).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 18e: Multiple filters combine with AND logic
   * Subscription with multiple filters should only receive events matching all filters
   */
  it('Property 18e: should combine multiple filters with AND logic', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        async (senderId, recipientId) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          const filter: IEventFilter = {
            types: [MessageEventType.MESSAGE_STORED],
            senderId,
            recipientId,
          };
          system.subscribe(mockWs, filter);

          // Matches all filters
          system.emit(MessageEventType.MESSAGE_STORED, createMetadata({ senderId, recipients: [recipientId] }));

          // Wrong type
          system.emit(MessageEventType.MESSAGE_RECEIVED, createMetadata({ senderId, recipients: [recipientId] }));

          // Wrong sender
          system.emit(MessageEventType.MESSAGE_STORED, createMetadata({ senderId: 'other', recipients: [recipientId] }));

          // Wrong recipient
          system.emit(MessageEventType.MESSAGE_STORED, createMetadata({ senderId, recipients: ['other'] }));

          expect(mockWs.send).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 18f: Unsubscribe stops event delivery
   * After unsubscribe, WebSocket should not receive any more events
   */
  it('Property 18f: should stop receiving events after unsubscribe', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (beforeCount, afterCount) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          // Emit before unsubscribe
          for (let i = 0; i < beforeCount; i++) {
            system.emit(MessageEventType.MESSAGE_STORED, createMetadata());
          }

          system.unsubscribe(mockWs);

          // Emit after unsubscribe
          for (let i = 0; i < afterCount; i++) {
            system.emit(MessageEventType.MESSAGE_STORED, createMetadata());
          }

          expect(mockWs.send).toHaveBeenCalledTimes(beforeCount);
        }
      ),
      { numRuns: 50 }
    );
  });
});
