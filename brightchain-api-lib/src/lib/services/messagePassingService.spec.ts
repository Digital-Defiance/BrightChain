/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DeliveryStatus,
  MessageCBLService,
  MessageEncryptionScheme,
  MessagePriority,
} from '@brightchain/brightchain-lib';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MessageEventType } from './eventNotificationSystem';
import { MessagePassingService } from './messagePassingService';

describe('MessagePassingService', () => {
  /**
   * Creates a mock IGossipService with all required methods.
   */
  function createMockGossipService() {
    return {
      announceBlock: jest.fn<any>(),
      announceRemoval: jest.fn<any>(),
      handleAnnouncement: jest.fn<any>(),
      onAnnouncement: jest.fn<any>(),
      offAnnouncement: jest.fn<any>(),
      getPendingAnnouncements: jest.fn<any>(),
      flushAnnouncements: jest.fn<any>(),
      start: jest.fn<any>(),
      stop: jest.fn<any>(),
      getConfig: jest.fn<any>(),
      announceMessage: jest.fn<any>(),
      sendDeliveryAck: jest.fn<any>(),
      onMessageDelivery: jest.fn<any>(),
      offMessageDelivery: jest.fn<any>(),
      onDeliveryAck: jest.fn<any>(),
      offDeliveryAck: jest.fn<any>(),
    } as any;
  }

  function createMockMessageCBL() {
    return {
      createMessage: jest.fn<any>(),
      getMessageMetadata: jest.fn<any>(),
      getMessageContent: jest.fn<any>(),
    } as any;
  }

  function createMockMetadataStore() {
    return {
      updateDeliveryStatus: jest.fn<any>().mockResolvedValue(undefined),
      recordAcknowledgment: jest.fn<any>().mockResolvedValue(undefined),
      queryMessages: jest.fn<any>().mockResolvedValue([]),
    } as any;
  }

  function createMockEventSystem() {
    return {
      emit: jest.fn(),
    } as any;
  }

  describe('sendMessage', () => {
    it('should return messageId and magnetUrl when message is created', async () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      mockMessageCBL.createMessage.mockResolvedValue({
        messageId: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
        contentBlockIds: ['block1'],
        magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
      });

      mockMessageCBL.getMessageMetadata.mockResolvedValue({
        blockId: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc&b2=def',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1'],
        cblBlockIds: ['block1'],
      });

      mockGossipService.announceMessage.mockResolvedValue(undefined);

      const service = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      const content = Buffer.from('Hello, World!');
      const result = await service.sendMessage(content, 'sender1', {
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      expect(result.messageId).toBeDefined();
      expect(result.magnetUrl).toBeDefined();
      expect(result.magnetUrl).toContain('magnet:?');
    });

    it('should emit MESSAGE_STORED event after successful storage', async () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      const storedMetadata = {
        blockId: 'msg-block-1',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1'],
        cblBlockIds: ['block1'],
      };

      mockMessageCBL.createMessage.mockResolvedValue({
        messageId: 'msg-1',
        magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc',
      });
      mockMessageCBL.getMessageMetadata.mockResolvedValue(storedMetadata);
      mockGossipService.announceMessage.mockResolvedValue(undefined);

      const service = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      await service.sendMessage(Buffer.from('test'), 'sender1', {
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      expect(mockEventSystem.emit).toHaveBeenCalledWith(
        MessageEventType.MESSAGE_STORED,
        storedMetadata,
      );
    });

    it('should call gossipService.announceMessage instead of wsServer methods', async () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      mockMessageCBL.createMessage.mockResolvedValue({
        messageId: 'msg-1',
        magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc',
      });
      mockMessageCBL.getMessageMetadata.mockResolvedValue({
        blockId: 'msg-block-1',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1', 'recipient2'],
        cblBlockIds: ['block1', 'block2'],
      });
      mockGossipService.announceMessage.mockResolvedValue(undefined);

      const service = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      await service.sendMessage(Buffer.from('test'), 'sender1', {
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1', 'recipient2'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      // Verify gossipService.announceMessage was called with correct metadata
      expect(mockGossipService.announceMessage).toHaveBeenCalledWith(
        ['block1', 'block2'],
        expect.objectContaining({
          messageId: 'msg-1',
          recipientIds: ['recipient1', 'recipient2'],
          priority: 'normal',
          blockIds: ['block1', 'block2'],
          cblBlockId: 'msg-block-1',
          ackRequired: true,
        }),
      );

      // Verify delivery status updated for each recipient
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg-1',
        'recipient1',
        DeliveryStatus.Announced,
      );
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg-1',
        'recipient2',
        DeliveryStatus.Announced,
      );
    });

    it('should announce via gossip with empty recipientIds for broadcast', async () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      mockMessageCBL.createMessage.mockResolvedValue({
        messageId: 'msg-broadcast',
        magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc',
      });
      mockMessageCBL.getMessageMetadata.mockResolvedValue({
        blockId: 'msg-block-broadcast',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: [],
        cblBlockIds: ['block1'],
      });
      mockGossipService.announceMessage.mockResolvedValue(undefined);

      const service = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      await service.sendMessage(Buffer.from('broadcast msg'), 'sender1', {
        messageType: 'chat',
        senderId: 'sender1',
        recipients: [],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      // Verify gossipService.announceMessage was called with empty recipientIds
      expect(mockGossipService.announceMessage).toHaveBeenCalledWith(
        ['block1'],
        expect.objectContaining({
          messageId: 'msg-broadcast',
          recipientIds: [],
        }),
      );

      // No updateDeliveryStatus calls for broadcast (no specific recipients)
      expect(mockMetadataStore.updateDeliveryStatus).not.toHaveBeenCalled();
    });
  });

  describe('setupHandlers', () => {
    it('should register onMessageDelivery and onDeliveryAck handlers', () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      // Verify handlers were registered via gossipService
      expect(mockGossipService.onMessageDelivery).toHaveBeenCalledWith(
        expect.any(Function),
      );
      expect(mockGossipService.onDeliveryAck).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should handle delivery ack and update status to DELIVERED', async () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      mockMessageCBL.getMessageMetadata.mockResolvedValue({
        blockId: 'msg-block-1',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1'],
        deliveryStatus: new Map([['recipient1', DeliveryStatus.Delivered]]),
      });

      new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      // Get the onDeliveryAck handler that was registered
      const ackHandler = mockGossipService.onDeliveryAck.mock.calls[0][0];

      // Simulate receiving a delivery ack
      await ackHandler({
        type: 'ack',
        blockId: 'msg-block-1',
        nodeId: 'recipient-node',
        timestamp: new Date(),
        ttl: 3,
        deliveryAck: {
          messageId: 'msg-1',
          recipientId: 'recipient1',
          status: 'delivered',
          originalSenderNode: 'sender-node',
        },
      });

      expect(mockMetadataStore.recordAcknowledgment).toHaveBeenCalledWith(
        'msg-1',
        'recipient1',
        expect.any(Date),
      );
      expect(mockMetadataStore.updateDeliveryStatus).toHaveBeenCalledWith(
        'msg-1',
        'recipient1',
        DeliveryStatus.Delivered,
      );
    });

    it('should emit MESSAGE_DELIVERED when all recipients are delivered', async () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      const metadata = {
        blockId: 'msg-block-1',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1'],
        deliveryStatus: new Map([['recipient1', DeliveryStatus.Delivered]]),
      };
      mockMessageCBL.getMessageMetadata.mockResolvedValue(metadata);

      new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      const ackHandler = mockGossipService.onDeliveryAck.mock.calls[0][0];

      await ackHandler({
        type: 'ack',
        blockId: 'msg-block-1',
        nodeId: 'recipient-node',
        timestamp: new Date(),
        ttl: 3,
        deliveryAck: {
          messageId: 'msg-1',
          recipientId: 'recipient1',
          status: 'delivered',
          originalSenderNode: 'sender-node',
        },
      });

      expect(mockEventSystem.emit).toHaveBeenCalledWith(
        MessageEventType.MESSAGE_DELIVERED,
        metadata,
      );
    });

    it('should emit MESSAGE_FAILED when ack status is failed', async () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      const metadata = {
        blockId: 'msg-block-1',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['recipient1', 'recipient2'],
        deliveryStatus: new Map([
          ['recipient1', DeliveryStatus.Failed],
          ['recipient2', DeliveryStatus.Announced],
        ]),
      };
      mockMessageCBL.getMessageMetadata.mockResolvedValue(metadata);

      new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      const ackHandler = mockGossipService.onDeliveryAck.mock.calls[0][0];

      await ackHandler({
        type: 'ack',
        blockId: 'msg-block-1',
        nodeId: 'recipient-node',
        timestamp: new Date(),
        ttl: 3,
        deliveryAck: {
          messageId: 'msg-1',
          recipientId: 'recipient1',
          status: 'failed',
          originalSenderNode: 'sender-node',
        },
      });

      expect(mockEventSystem.emit).toHaveBeenCalledWith(
        MessageEventType.MESSAGE_FAILED,
        metadata,
      );
    });
  });

  describe('API compatibility (Requirement 7.5)', () => {
    let service: MessagePassingService;

    beforeEach(() => {
      service = new MessagePassingService(
        createMockMessageCBL() as MessageCBLService,
        createMockMetadataStore(),
        createMockEventSystem(),
        createMockGossipService(),
      );
    });

    it('should have sendMessage method as a function', () => {
      expect(typeof service.sendMessage).toBe('function');
    });

    it('should have getMessage method as a function', () => {
      expect(typeof service.getMessage).toBe('function');
    });

    it('should have queryMessages method as a function', () => {
      expect(typeof service.queryMessages).toBe('function');
    });

    it('should have deleteMessage method as a function', () => {
      expect(typeof service.deleteMessage).toBe('function');
    });

    it('sendMessage should accept (content: Buffer, senderId: string, options) and return a Promise', () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      mockMessageCBL.createMessage.mockResolvedValue({
        messageId: 'test-msg-id',
        magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=abc',
      });
      mockMessageCBL.getMessageMetadata.mockResolvedValue({
        blockId: 'test-block',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['r1'],
        cblBlockIds: ['block1'],
      });
      mockGossipService.announceMessage.mockResolvedValue(undefined);

      const svc = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      const result = svc.sendMessage(Buffer.from('test'), 'sender1', {
        messageType: 'chat',
        senderId: 'sender1',
        recipients: ['r1'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      expect(result).toBeInstanceOf(Promise);
    });

    it('sendMessage should resolve with { messageId, magnetUrl }', async () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      mockMessageCBL.createMessage.mockResolvedValue({
        messageId: 'compat-msg-id',
        magnetUrl: 'magnet:?xt=urn:brightchain:cbl&bs=1024&b1=xyz',
      });
      mockMessageCBL.getMessageMetadata.mockResolvedValue({
        blockId: 'compat-block',
        messageType: 'chat',
        senderId: 'sender1',
        recipients: [],
        cblBlockIds: ['block1'],
      });
      mockGossipService.announceMessage.mockResolvedValue(undefined);

      const svc = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        mockMetadataStore,
        mockEventSystem,
        mockGossipService,
      );

      const result = await svc.sendMessage(Buffer.from('hello'), 'sender1', {
        messageType: 'chat',
        senderId: 'sender1',
        recipients: [],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('magnetUrl');
      expect(typeof result.messageId).toBe('string');
      expect(typeof result.magnetUrl).toBe('string');
    });

    it('getMessage should accept (messageId: string) and return a Promise', () => {
      const mockMessageCBL = createMockMessageCBL();
      mockMessageCBL.getMessageContent.mockResolvedValue(null);

      const svc = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        createMockMetadataStore(),
        createMockEventSystem(),
        createMockGossipService(),
      );

      const result = svc.getMessage('some-message-id');
      expect(result).toBeInstanceOf(Promise);
    });

    it('getMessage should resolve with Buffer when content exists', async () => {
      const mockMessageCBL = createMockMessageCBL();
      mockMessageCBL.getMessageContent.mockResolvedValue(
        new Uint8Array([72, 101, 108, 108, 111]),
      );

      const svc = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        createMockMetadataStore(),
        createMockEventSystem(),
        createMockGossipService(),
      );

      const result = await svc.getMessage('msg-with-content');
      expect(result).toBeInstanceOf(Buffer);
      expect(result!.toString()).toBe('Hello');
    });

    it('getMessage should resolve with null when content does not exist', async () => {
      const mockMessageCBL = createMockMessageCBL();
      mockMessageCBL.getMessageContent.mockResolvedValue(null);

      const svc = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        createMockMetadataStore(),
        createMockEventSystem(),
        createMockGossipService(),
      );

      const result = await svc.getMessage('nonexistent-msg');
      expect(result).toBeNull();
    });

    it('queryMessages should accept (query: Record<string, unknown>) and return a Promise', () => {
      const mockMetadataStore = createMockMetadataStore();
      mockMetadataStore.queryMessages.mockResolvedValue([]);

      const svc = new MessagePassingService(
        createMockMessageCBL() as MessageCBLService,
        mockMetadataStore,
        createMockEventSystem(),
        createMockGossipService(),
      );

      const result = svc.queryMessages({ senderId: 'user1' });
      expect(result).toBeInstanceOf(Promise);
    });

    it('queryMessages should resolve with an array of IMessageMetadata', async () => {
      const mockMetadataStore = createMockMetadataStore();
      const mockMessages = [
        { blockId: 'b1', messageType: 'chat', senderId: 's1' },
        { blockId: 'b2', messageType: 'chat', senderId: 's1' },
      ];
      mockMetadataStore.queryMessages.mockResolvedValue(mockMessages);

      const svc = new MessagePassingService(
        createMockMessageCBL() as MessageCBLService,
        mockMetadataStore,
        createMockEventSystem(),
        createMockGossipService(),
      );

      const result = await svc.queryMessages({ senderId: 's1' });
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockMessages);
    });

    it('deleteMessage should accept (messageId: string) and return a Promise', () => {
      const mockMessageCBL = createMockMessageCBL();
      mockMessageCBL.getMessageMetadata.mockResolvedValue(null);

      const svc = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        createMockMetadataStore(),
        createMockEventSystem(),
        createMockGossipService(),
      );

      const result = svc.deleteMessage('msg-to-delete');
      expect(result).toBeInstanceOf(Promise);
    });

    it('deleteMessage should resolve with void (undefined)', async () => {
      const mockMessageCBL = createMockMessageCBL();
      mockMessageCBL.getMessageMetadata.mockResolvedValue(null);

      const svc = new MessagePassingService(
        mockMessageCBL as MessageCBLService,
        createMockMetadataStore(),
        createMockEventSystem(),
        createMockGossipService(),
      );

      const result = await svc.deleteMessage('msg-to-delete');
      expect(result).toBeUndefined();
    });

    it('constructor should accept (messageCBL, metadataStore, eventSystem, gossipService) — gossip-based signature (Requirement 7.2)', () => {
      const mockMessageCBL = createMockMessageCBL();
      const mockMetadataStore = createMockMetadataStore();
      const mockEventSystem = createMockEventSystem();
      const mockGossipService = createMockGossipService();

      // The constructor should not throw with the gossip-based signature
      expect(() => {
        new MessagePassingService(
          mockMessageCBL as MessageCBLService,
          mockMetadataStore,
          mockEventSystem,
          mockGossipService,
        );
      }).not.toThrow();
    });

    it('constructor should set up gossip handlers on initialization', () => {
      const mockGossipService = createMockGossipService();

      new MessagePassingService(
        createMockMessageCBL() as MessageCBLService,
        createMockMetadataStore(),
        createMockEventSystem(),
        mockGossipService,
      );

      // Verify gossip-specific handlers are registered (not WebSocket handlers)
      expect(mockGossipService.onMessageDelivery).toHaveBeenCalledTimes(1);
      expect(mockGossipService.onDeliveryAck).toHaveBeenCalledTimes(1);
    });
  });
});
