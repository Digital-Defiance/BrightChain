import {
  DurabilityLevel,
  IMessageMetadata,
  MessageDeliveryStatus,
  MessageEncryptionScheme,
  MessagePriority,
  ReplicationStatus,
} from '@brightchain/brightchain-lib';
import { WebSocket } from 'ws';
import {
  EventNotificationSystem,
  MessageEventType,
} from './eventNotificationSystem';

describe('EventNotificationSystem', () => {
  let system: EventNotificationSystem;
  let mockWs: jest.Mocked<WebSocket>;

  const createMockMetadata = (): IMessageMetadata => ({
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
  });

  beforeEach(() => {
    system = new EventNotificationSystem();
    mockWs = {
      readyState: 1, // OPEN
      send: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<WebSocket>;
  });

  describe('Task 12.1: subscribe/unsubscribe', () => {
    it('should subscribe WebSocket connection', () => {
      system.subscribe(mockWs);
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should subscribe with filter', () => {
      const filter = { types: [MessageEventType.MESSAGE_STORED] };
      system.subscribe(mockWs, filter);
      expect(mockWs.on).toHaveBeenCalled();
    });

    it('should unsubscribe WebSocket connection', () => {
      system.subscribe(mockWs);
      system.unsubscribe(mockWs);

      system.emit(MessageEventType.MESSAGE_STORED, createMockMetadata());
      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it('should auto-unsubscribe on close', () => {
      system.subscribe(mockWs);
      const closeHandler = (mockWs.on as jest.Mock).mock.calls[0][1];
      closeHandler();

      system.emit(MessageEventType.MESSAGE_STORED, createMockMetadata());
      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('Task 12.2: event subscription management', () => {
    it('should filter events by type', () => {
      system.subscribe(mockWs, { types: [MessageEventType.MESSAGE_DELIVERED] });

      system.emit(MessageEventType.MESSAGE_STORED, createMockMetadata());
      expect(mockWs.send).not.toHaveBeenCalled();

      system.emit(MessageEventType.MESSAGE_DELIVERED, createMockMetadata());
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('should filter events by senderId', () => {
      system.subscribe(mockWs, { senderId: 'sender-1' });

      const metadata1 = createMockMetadata();
      metadata1.senderId = 'sender-2';
      system.emit(MessageEventType.MESSAGE_STORED, metadata1);
      expect(mockWs.send).not.toHaveBeenCalled();

      const metadata2 = createMockMetadata();
      metadata2.senderId = 'sender-1';
      system.emit(MessageEventType.MESSAGE_STORED, metadata2);
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('should filter events by recipientId', () => {
      system.subscribe(mockWs, { recipientId: 'recipient-1' });

      const metadata1 = createMockMetadata();
      metadata1.recipients = ['recipient-2'];
      system.emit(MessageEventType.MESSAGE_STORED, metadata1);
      expect(mockWs.send).not.toHaveBeenCalled();

      const metadata2 = createMockMetadata();
      metadata2.recipients = ['recipient-1'];
      system.emit(MessageEventType.MESSAGE_STORED, metadata2);
      expect(mockWs.send).toHaveBeenCalled();
    });

    it('should not send to closed connections', () => {
      const closedWs = {
        readyState: 3, // CLOSED
        send: jest.fn(),
        on: jest.fn(),
      } as unknown as jest.Mocked<WebSocket>;
      system.subscribe(closedWs);

      system.emit(MessageEventType.MESSAGE_STORED, createMockMetadata());
      expect(closedWs.send).not.toHaveBeenCalled();
    });
  });

  describe('Task 12.3: event emission', () => {
    it('should emit MESSAGE_STORED event', () => {
      system.subscribe(mockWs);
      const metadata = createMockMetadata();

      system.emit(MessageEventType.MESSAGE_STORED, metadata);

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"message:stored"'),
      );
    });

    it('should emit MESSAGE_RECEIVED event', () => {
      system.subscribe(mockWs);
      const metadata = createMockMetadata();

      system.emit(MessageEventType.MESSAGE_RECEIVED, metadata);

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"message:received"'),
      );
    });

    it('should emit MESSAGE_DELIVERED event', () => {
      system.subscribe(mockWs);
      const metadata = createMockMetadata();

      system.emit(MessageEventType.MESSAGE_DELIVERED, metadata);

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"message:delivered"'),
      );
    });

    it('should emit MESSAGE_FAILED event', () => {
      system.subscribe(mockWs);
      const metadata = createMockMetadata();

      system.emit(MessageEventType.MESSAGE_FAILED, metadata);

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"message:failed"'),
      );
    });

    it('should include complete metadata in event payload', () => {
      system.subscribe(mockWs);
      const metadata = createMockMetadata();

      system.emit(MessageEventType.MESSAGE_STORED, metadata);

      const sentData = (mockWs.send as jest.Mock).mock.calls[0][0];
      const event = JSON.parse(sentData);

      expect(event.metadata.senderId).toBe('sender-1');
      expect(event.metadata.recipients).toEqual(['recipient-1']);
      expect(event.metadata.messageType).toBe('test');
    });
  });

  describe('Task 12.4: event history storage', () => {
    it('should store events in history', () => {
      const metadata = createMockMetadata();
      system.emit(MessageEventType.MESSAGE_STORED, metadata);

      const history = system.getEventHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(MessageEventType.MESSAGE_STORED);
    });

    it('should limit history to 1000 events', () => {
      const metadata = createMockMetadata();

      for (let i = 0; i < 1100; i++) {
        system.emit(MessageEventType.MESSAGE_STORED, metadata);
      }

      const history = system.getEventHistory({}, 2000);
      expect(history.length).toBeLessThanOrEqual(1000);
    });

    it('should filter history by event type', () => {
      const metadata = createMockMetadata();
      system.emit(MessageEventType.MESSAGE_STORED, metadata);
      system.emit(MessageEventType.MESSAGE_DELIVERED, metadata);

      const history = system.getEventHistory({
        types: [MessageEventType.MESSAGE_STORED],
      });
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(MessageEventType.MESSAGE_STORED);
    });

    it('should limit history results', () => {
      const metadata = createMockMetadata();

      for (let i = 0; i < 10; i++) {
        system.emit(MessageEventType.MESSAGE_STORED, metadata);
      }

      const history = system.getEventHistory({}, 5);
      expect(history).toHaveLength(5);
    });

    it('should provide event history with timestamp', () => {
      const metadata = createMockMetadata();
      system.emit(MessageEventType.MESSAGE_STORED, metadata);

      const history = system.getEventHistory();
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Task 12.5: multiple subscribers', () => {
    it('should emit to multiple subscribers', () => {
      const mockWs2 = {
        readyState: 1,
        send: jest.fn(),
        on: jest.fn(),
      } as unknown as jest.Mocked<WebSocket>;

      system.subscribe(mockWs);
      system.subscribe(mockWs2);

      system.emit(MessageEventType.MESSAGE_STORED, createMockMetadata());

      expect(mockWs.send).toHaveBeenCalled();
      expect(mockWs2.send).toHaveBeenCalled();
    });

    it('should apply different filters to different subscribers', () => {
      const mockWs2 = {
        readyState: 1,
        send: jest.fn(),
        on: jest.fn(),
      } as unknown as jest.Mocked<WebSocket>;

      system.subscribe(mockWs, { types: [MessageEventType.MESSAGE_STORED] });
      system.subscribe(mockWs2, {
        types: [MessageEventType.MESSAGE_DELIVERED],
      });

      system.emit(MessageEventType.MESSAGE_STORED, createMockMetadata());

      expect(mockWs.send).toHaveBeenCalled();
      expect(mockWs2.send).not.toHaveBeenCalled();
    });
  });
});
