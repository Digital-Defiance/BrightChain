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
 * Property tests for event payload completeness
 * Validates Requirements 5.4, 7.5
 */
describe('Feature: message-passing-and-events, Property: Event Payload Completeness', () => {
  /**
   * Property 17a: Event payload includes all message metadata fields
   * For any message, event payload must contain complete metadata
   */
  it('Property 17a: should include all message metadata fields in event payload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.string({ minLength: 1, maxLength: 32 }),
        fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
          minLength: 0,
          maxLength: 5,
        }),
        fc.constantFrom(
          MessagePriority.LOW,
          MessagePriority.NORMAL,
          MessagePriority.HIGH,
        ),
        fc.constantFrom(
          MessageEncryptionScheme.NONE,
          MessageEncryptionScheme.SHARED_KEY,
          MessageEncryptionScheme.RECIPIENT_KEYS,
        ),
        async (
          senderId,
          messageType,
          recipients,
          priority,
          encryptionScheme,
        ) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          const metadata: IMessageMetadata = {
            blockId: 'block-1',
            messageType,
            senderId,
            recipients,
            priority,
            deliveryStatus: new Map(
              recipients.map((r) => [r, MessageDeliveryStatus.PENDING]),
            ),
            acknowledgments: new Map(),
            encryptionScheme,
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
            checksum: 'abc123',
          };

          system.emit(MessageEventType.MESSAGE_STORED, metadata);

          const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
          const event = JSON.parse(sentData);

          expect(event.metadata.messageType).toBe(messageType);
          expect(event.metadata.senderId).toBe(senderId);
          expect(event.metadata.recipients).toEqual(recipients);
          expect(event.metadata.priority).toBe(priority);
          expect(event.metadata.encryptionScheme).toBe(encryptionScheme);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 17b: Event payload includes timestamp
   * Every event must have a timestamp field
   */
  it('Property 17b: should include timestamp in event payload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          MessageEventType.MESSAGE_STORED,
          MessageEventType.MESSAGE_RECEIVED,
          MessageEventType.MESSAGE_DELIVERED,
          MessageEventType.MESSAGE_FAILED,
        ),
        async (eventType) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          const metadata: IMessageMetadata = {
            blockId: 'block-1',
            messageType: 'test',
            senderId: 'sender-1',
            recipients: ['recipient-1'],
            priority: MessagePriority.NORMAL,
            deliveryStatus: new Map([
              ['recipient-1', MessageDeliveryStatus.PENDING],
            ]),
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
          };

          const beforeEmit = Date.now();
          system.emit(eventType, metadata);
          const afterEmit = Date.now();

          const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
          const event = JSON.parse(sentData);

          expect(event.timestamp).toBeDefined();
          const eventTime = new Date(event.timestamp).getTime();
          expect(eventTime).toBeGreaterThanOrEqual(beforeEmit);
          expect(eventTime).toBeLessThanOrEqual(afterEmit);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 17c: Event payload includes event type
   * Every event must have a type field matching the emitted type
   */
  it('Property 17c: should include correct event type in payload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          MessageEventType.MESSAGE_STORED,
          MessageEventType.MESSAGE_RECEIVED,
          MessageEventType.MESSAGE_DELIVERED,
          MessageEventType.MESSAGE_FAILED,
        ),
        async (eventType) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          const metadata: IMessageMetadata = {
            blockId: 'block-1',
            messageType: 'test',
            senderId: 'sender-1',
            recipients: [],
            priority: MessagePriority.NORMAL,
            deliveryStatus: new Map(),
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
          };

          system.emit(eventType, metadata);

          const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
          const event = JSON.parse(sentData);

          expect(event.type).toBe(eventType);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 17d: Event payload preserves recipient list
   * Recipient list in event must match original metadata
   */
  it('Property 17d: should preserve recipient list in event payload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 32 }), {
          minLength: 0,
          maxLength: 10,
        }),
        async (recipients) => {
          const system = new EventNotificationSystem();
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn(),
          } as unknown as jest.Mocked<WebSocket>;

          system.subscribe(mockWs);

          const metadata: IMessageMetadata = {
            blockId: 'block-1',
            messageType: 'test',
            senderId: 'sender-1',
            recipients,
            priority: MessagePriority.NORMAL,
            deliveryStatus: new Map(
              recipients.map((r) => [r, MessageDeliveryStatus.PENDING]),
            ),
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
          };

          system.emit(MessageEventType.MESSAGE_STORED, metadata);

          const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
          const event = JSON.parse(sentData);

          expect(event.metadata.recipients).toEqual(recipients);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 17e: Event payload is valid JSON
   * All event payloads must be parseable JSON
   */
  it('Property 17e: should emit valid JSON payload', async () => {
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

          const metadata: IMessageMetadata = {
            blockId: 'block-1',
            messageType,
            senderId,
            recipients: [],
            priority: MessagePriority.NORMAL,
            deliveryStatus: new Map(),
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
          };

          system.emit(MessageEventType.MESSAGE_STORED, metadata);

          const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];

          expect(() => JSON.parse(sentData)).not.toThrow();
          const event = JSON.parse(sentData);
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('timestamp');
          expect(event).toHaveProperty('metadata');
        },
      ),
      { numRuns: 50 },
    );
  });
});
