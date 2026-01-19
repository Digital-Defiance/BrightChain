import {
  DurabilityLevel,
  IMessageMetadata,
  MessageDeliveryStatus,
  MessageEncryptionScheme,
  MessagePriority,
  ReplicationStatus,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { WebSocket } from 'ws';
import {
  EventNotificationSystem,
  MessageEventType,
} from './eventNotificationSystem';

/**
 * Property tests for event emission on message actions
 * Validates Requirements 5.1, 5.2, 5.3
 */
describe('Feature: message-passing-and-events, Property: Event Emission on Message Actions', () => {
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
   * Property 16a: MESSAGE_STORED event emitted for any message
   * For any message metadata, emit should trigger MESSAGE_STORED event
   */
  it('Property 16a: should emit MESSAGE_STORED event for any message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
          minLength: 0,
          maxLength: 5,
        }),
        async (senderId, messageType, recipients) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          const metadata = createMetadata({
            senderId,
            messageType,
            recipients,
          });
          system.emit(MessageEventType.MESSAGE_STORED, metadata);

          expect(mockWs.send).toHaveBeenCalledWith(
            expect.stringContaining('"type":"message:stored"'),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16b: MESSAGE_RECEIVED event emitted for any incoming message
   * For any message metadata, emit should trigger MESSAGE_RECEIVED event
   */
  it('Property 16b: should emit MESSAGE_RECEIVED event for any incoming message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        async (senderId, messageType) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          const metadata = createMetadata({ senderId, messageType });
          system.emit(MessageEventType.MESSAGE_RECEIVED, metadata);

          expect(mockWs.send).toHaveBeenCalledWith(
            expect.stringContaining('"type":"message:received"'),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16c: MESSAGE_DELIVERED event emitted on successful delivery
   * For any message with DELIVERED status, emit should trigger MESSAGE_DELIVERED event
   */
  it('Property 16c: should emit MESSAGE_DELIVERED event on successful delivery', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
          minLength: 1,
          maxLength: 5,
        }),
        async (senderId, recipients) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          const deliveryStatus = new Map(
            recipients.map((r) => [r, MessageDeliveryStatus.DELIVERED]),
          );
          const metadata = createMetadata({
            senderId,
            recipients,
            deliveryStatus,
          });
          system.emit(MessageEventType.MESSAGE_DELIVERED, metadata);

          expect(mockWs.send).toHaveBeenCalledWith(
            expect.stringContaining('"type":"message:delivered"'),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16d: MESSAGE_FAILED event emitted on delivery failure
   * For any message with FAILED status, emit should trigger MESSAGE_FAILED event
   */
  it('Property 16d: should emit MESSAGE_FAILED event on delivery failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
          minLength: 1,
          maxLength: 5,
        }),
        async (senderId, recipients) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          const deliveryStatus = new Map(
            recipients.map((r) => [r, MessageDeliveryStatus.FAILED]),
          );
          const metadata = createMetadata({
            senderId,
            recipients,
            deliveryStatus,
          });
          system.emit(MessageEventType.MESSAGE_FAILED, metadata);

          expect(mockWs.send).toHaveBeenCalledWith(
            expect.stringContaining('"type":"message:failed"'),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 16e: Events emitted to all subscribers
   * Any event should be delivered to all subscribed connections
   */
  it('Property 16e: should emit events to all subscribers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.constantFrom(
          MessageEventType.MESSAGE_STORED,
          MessageEventType.MESSAGE_RECEIVED,
          MessageEventType.MESSAGE_DELIVERED,
          MessageEventType.MESSAGE_FAILED,
        ),
        async (numSubscribers, eventType) => {
          const system = new EventNotificationSystem();
          const subscribers: Array<jest.Mocked<WebSocket>> = [];

          for (let i = 0; i < numSubscribers; i++) {
            const mockWs = {
              readyState: 1,
              send: jest.fn(),
              on: jest.fn(),
            } as unknown as jest.Mocked<WebSocket>;
            system.subscribe(mockWs);
            subscribers.push(mockWs);
          }

          const metadata = createMetadata();
          system.emit(eventType, metadata);

          for (const ws of subscribers) {
            expect(ws.send).toHaveBeenCalled();
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
