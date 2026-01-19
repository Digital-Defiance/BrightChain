import {
  DurabilityLevel,
  IMessageMetadata,
  MessageEncryptionScheme,
  MessagePriority,
} from '@brightchain/brightchain-lib';
import { EventEmitter } from 'events';
import {
  EventNotificationSystem,
  MessageEventType,
} from './eventNotificationSystem';
import { MessageEventsWebSocketHandler } from './messageEventsWebSocketHandler';

describe('Task 13.5: WebSocket /messages/events endpoint', () => {
  let handler: MessageEventsWebSocketHandler;
  let eventSystem: EventNotificationSystem;
  let mockWs: unknown;

  beforeEach(() => {
    eventSystem = new EventNotificationSystem();
    handler = new MessageEventsWebSocketHandler(eventSystem);

    mockWs = Object.assign(new EventEmitter(), {
      readyState: 1,
      send: jest.fn(),
      on: jest.fn((event: string, callback: (data: Buffer) => void) => {
        mockWs.addListener(event, callback);
        return mockWs;
      }),
    });
  });

  it('should subscribe WebSocket on connection', () => {
    handler.handleConnection(mockWs);

    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"connected"'),
    );
  });

  it('should handle subscribe message with filter', () => {
    handler.handleConnection(mockWs);
    mockWs.send = jest.fn(); // Reset after connection message

    const subscribeMessage = {
      type: 'subscribe',
      eventTypes: [MessageEventType.MESSAGE_STORED],
      senderId: 'sender-1',
    };

    mockWs.emit('message', Buffer.from(JSON.stringify(subscribeMessage)));

    // Should not throw and connection should still be active
    expect(mockWs.readyState).toBe(1);
  });

  it('should handle unsubscribe message', () => {
    handler.handleConnection(mockWs);

    const unsubscribeMessage = { type: 'unsubscribe' };
    mockWs.emit('message', Buffer.from(JSON.stringify(unsubscribeMessage)));

    // Should not throw
    expect(mockWs.readyState).toBe(1);
  });

  it('should handle getHistory message', () => {
    handler.handleConnection(mockWs);
    mockWs.send = jest.fn(); // Reset after connection message

    const historyMessage = {
      type: 'getHistory',
      limit: 50,
    };

    mockWs.emit('message', Buffer.from(JSON.stringify(historyMessage)));

    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"history"'),
    );
  });

  it('should handle invalid JSON message', () => {
    handler.handleConnection(mockWs);
    mockWs.send = jest.fn(); // Reset after connection message

    mockWs.emit('message', Buffer.from('invalid json'));

    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"error"'),
    );
  });

  it('should unsubscribe on disconnect', () => {
    handler.handleConnection(mockWs);

    const spy = jest.spyOn(eventSystem, 'unsubscribe');
    mockWs.emit('close');

    expect(spy).toHaveBeenCalledWith(mockWs);
  });

  it('should stream events to subscribed client', () => {
    handler.handleConnection(mockWs);
    mockWs.send = jest.fn(); // Reset after connection message

    const metadata = {
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
      replicationStatus: 0,
      targetReplicationFactor: 3,
      replicaNodeIds: [],
      size: 100,
      checksum: '',
    };

    eventSystem.emit(
      MessageEventType.MESSAGE_STORED,
      metadata as IMessageMetadata,
    );

    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"message:stored"'),
    );
  });

  it('should filter events based on subscription', () => {
    handler.handleConnection(mockWs);
    mockWs.send = jest.fn(); // Reset

    // Subscribe with filter
    const subscribeMessage = {
      type: 'subscribe',
      eventTypes: [MessageEventType.MESSAGE_DELIVERED],
    };
    mockWs.emit('message', Buffer.from(JSON.stringify(subscribeMessage)));
    mockWs.send = jest.fn(); // Reset again

    const metadata = {
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
      replicationStatus: 0,
      targetReplicationFactor: 3,
      replicaNodeIds: [],
      size: 100,
      checksum: '',
    };

    // Emit non-matching event
    eventSystem.emit(
      MessageEventType.MESSAGE_STORED,
      metadata as IMessageMetadata,
    );
    expect(mockWs.send).not.toHaveBeenCalled();

    // Emit matching event
    eventSystem.emit(
      MessageEventType.MESSAGE_DELIVERED,
      metadata as IMessageMetadata,
    );
    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"message:delivered"'),
    );
  });
});
