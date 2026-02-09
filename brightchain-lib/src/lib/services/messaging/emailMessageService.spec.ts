import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { EmailError } from '../../errors/messaging/emailError';
import type { IGossipService } from '../../interfaces/availability/gossipService';
import { createMailbox } from '../../interfaces/messaging/emailAddress';
import type { IEmailMetadata } from '../../interfaces/messaging/emailMetadata';
import { createContentType } from '../../interfaces/messaging/mimePart';
import {
  DEFAULT_EMAIL_SERVICE_CONFIG,
  EmailMessageService,
  type IAttachmentInput,
  type IEmailInput,
  type IEmailMetadataStore,
  type IEmailServiceConfig,
  type IInboxQuery,
  type IInboxResult,
  type IReplyInput,
} from './emailMessageService';
import type { MessageCBLService } from './messageCBLService';

/**
 * Unit tests for EmailMessageService class structure (Task 8.1).
 *
 * Verifies:
 * - Class can be instantiated with required dependencies
 * - Configuration defaults are applied correctly
 * - Custom configuration overrides defaults
 * - All method stubs exist and throw 'Not implemented'
 * - Interface types are correctly defined
 */
describe('EmailMessageService', () => {
  // Minimal stubs for dependencies - just enough to construct the service
  const mockMessageCBLService = {} as MessageCBLService;
  const mockGossipService = {
    announceBlock: jest.fn(),
    announceRemoval: jest.fn(),
    handleAnnouncement: jest.fn(),
    onAnnouncement: jest.fn(),
    offAnnouncement: jest.fn(),
    getPendingAnnouncements: jest.fn().mockReturnValue([]),
    flushAnnouncements: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    getConfig: jest.fn(),
    announceMessage: jest.fn().mockResolvedValue(undefined),
    sendDeliveryAck: jest.fn(),
    onMessageDelivery: jest.fn(),
    offMessageDelivery: jest.fn(),
    onDeliveryAck: jest.fn(),
    offDeliveryAck: jest.fn(),
  } as unknown as IGossipService;
  const mockMetadataStore: IEmailMetadataStore = {
    store: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    queryInbox: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    getThread: jest.fn(),
    getRootMessage: jest.fn(),
  };

  describe('constructor and configuration', () => {
    it('should instantiate with all required dependencies', () => {
      const service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
      );

      expect(service).toBeInstanceOf(EmailMessageService);
    });

    it('should apply default configuration when no config is provided', () => {
      const service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
      );

      const config = service.getConfig();
      expect(config.maxAttachmentSize).toBe(25 * 1024 * 1024);
      expect(config.maxMessageSize).toBe(50 * 1024 * 1024);
      expect(config.inlinePartThreshold).toBe(64 * 1024);
      expect(config.maxInlinePartsTotal).toBe(256 * 1024);
      expect(config.defaultPageSize).toBe(50);
      expect(config.maxReferencesCount).toBe(20);
      expect(config.maxRetryAttempts).toBe(3);
      expect(config.deliveryTimeoutMs).toBe(24 * 60 * 60 * 1000);
      expect(config.nodeId).toBe('localhost');
    });

    it('should override defaults with custom configuration', () => {
      const customConfig: Partial<IEmailServiceConfig> = {
        maxAttachmentSize: 10 * 1024 * 1024,
        nodeId: 'node-42',
        defaultPageSize: 25,
      };

      const service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
        customConfig,
      );

      const config = service.getConfig();
      expect(config.maxAttachmentSize).toBe(10 * 1024 * 1024);
      expect(config.nodeId).toBe('node-42');
      expect(config.defaultPageSize).toBe(25);
      // Non-overridden values should remain as defaults
      expect(config.maxMessageSize).toBe(50 * 1024 * 1024);
      expect(config.maxReferencesCount).toBe(20);
    });

    it('should return a readonly config from getConfig()', () => {
      const service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
      );

      const config = service.getConfig();
      expect(config).toBeDefined();
      expect(typeof config.maxAttachmentSize).toBe('number');
      expect(typeof config.nodeId).toBe('string');
    });
  });

  describe('method stubs throw "Not implemented"', () => {
    let service: EmailMessageService;

    beforeEach(() => {
      service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
      );
    });

    // Core operations - sendEmail is now implemented (Task 8.4), tested separately below
    // getEmail, getEmailContent, deleteEmail are now implemented (Task 8.6), tested separately below

    // Inbox operations - now implemented (Task 12)
    it('queryInbox() should delegate to metadataStore', async () => {
      const mockResult: IInboxResult = {
        emails: [],
        totalCount: 0,
        unreadCount: 0,
        page: 1,
        pageSize: 50,
        hasMore: false,
      };
      (mockMetadataStore.queryInbox as jest.Mock).mockResolvedValue(mockResult);
      const query: IInboxQuery = { readStatus: 'all' };
      const result = await service.queryInbox('user-1', query);
      expect(result).toEqual(mockResult);
    });

    it('markAsRead() should delegate to metadataStore', async () => {
      (mockMetadataStore.markAsRead as jest.Mock).mockResolvedValue(undefined);
      await service.markAsRead('<test@example.com>', 'user-1');
      expect(mockMetadataStore.markAsRead).toHaveBeenCalledWith(
        '<test@example.com>',
        'user-1',
      );
    });

    it('getUnreadCount() should delegate to metadataStore', async () => {
      (mockMetadataStore.getUnreadCount as jest.Mock).mockResolvedValue(5);
      const count = await service.getUnreadCount('user-1');
      expect(count).toBe(5);
    });

    // Threading operations - now implemented (Task 11)
    it('getThread() should return empty array when message not found', async () => {
      (mockMetadataStore.get as jest.Mock).mockResolvedValue(null);
      (mockMetadataStore.getThread as jest.Mock).mockResolvedValue([]);
      const result = await service.getThread('<test@example.com>');
      expect(result).toEqual([]);
    });

    it('getRootMessage() should return null when message not found', async () => {
      (mockMetadataStore.get as jest.Mock).mockResolvedValue(null);
      const result = await service.getRootMessage('<test@example.com>');
      expect(result).toBeNull();
    });

    // Reply/Forward operations - now implemented (Task 11)
    it('createReply() should throw EmailError when original not found', async () => {
      (mockMetadataStore.get as jest.Mock).mockResolvedValue(null);
      const replyInput: IReplyInput = {
        from: createMailbox('replier', 'example.com'),
        textBody: 'Reply text',
      };
      await expect(
        service.createReply('<original@example.com>', replyInput),
      ).rejects.toThrow('not found');
    });

    it('forwardEmail() should throw EmailError when original not found', async () => {
      (mockMetadataStore.get as jest.Mock).mockResolvedValue(null);
      const forwardTo = [createMailbox('forward', 'example.com')];
      await expect(
        service.forwardEmail('<original@example.com>', forwardTo),
      ).rejects.toThrow('not found');
    });

    // Delivery tracking - now implemented (Task 12)
    it('getDeliveryStatus() should throw EmailError when message not found', async () => {
      (mockMetadataStore.get as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getDeliveryStatus('<test@example.com>'),
      ).rejects.toThrow('not found');
    });
  });

  describe('generateMessageId()', () => {
    let service: EmailMessageService;

    beforeEach(() => {
      service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
      );
    });

    it('should generate a Message-ID matching the format <...@...>', () => {
      const messageId = service.generateMessageId();
      expect(messageId).toMatch(/^<[^@]+@[^>]+>$/);
    });

    it('should use the configured nodeId as the id-right portion', () => {
      const customService = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
        { nodeId: 'my-node.brightchain.org' },
      );

      const messageId = customService.generateMessageId();
      // Extract id-right: everything after @ and before >
      const idRight = messageId.slice(messageId.indexOf('@') + 1, -1);
      expect(idRight).toBe('my-node.brightchain.org');
    });

    it('should use the default nodeId ("localhost") when no custom nodeId is configured', () => {
      const messageId = service.generateMessageId();
      const idRight = messageId.slice(messageId.indexOf('@') + 1, -1);
      expect(idRight).toBe('localhost');
    });

    it('should generate unique Message-IDs across multiple calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(service.generateMessageId());
      }
      expect(ids.size).toBe(100);
    });

    it('should include a timestamp component in the id-left portion', () => {
      const beforeTimestamp = Date.now();
      const messageId = service.generateMessageId();
      const afterTimestamp = Date.now();

      // Extract id-left: everything after < and before @
      const idLeft = messageId.slice(1, messageId.indexOf('@'));
      // The timestamp is the part before the first dot, encoded in base-36
      const timestampPart = idLeft.split('.')[0];
      const parsedTimestamp = parseInt(timestampPart, 36);

      expect(parsedTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(parsedTimestamp).toBeLessThanOrEqual(afterTimestamp);
    });

    it('should include a random component in the id-left portion', () => {
      const messageId = service.generateMessageId();
      const idLeft = messageId.slice(1, messageId.indexOf('@'));
      // The random part is after the first dot - 32 hex characters (16 bytes)
      const randomPart = idLeft.split('.')[1];
      expect(randomPart).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should contain exactly one @ character', () => {
      const messageId = service.generateMessageId();
      // Remove angle brackets and count @ characters
      const inner = messageId.slice(1, -1);
      const atCount = (inner.match(/@/g) || []).length;
      expect(atCount).toBe(1);
    });

    it('should be enclosed in angle brackets', () => {
      const messageId = service.generateMessageId();
      expect(messageId.startsWith('<')).toBe(true);
      expect(messageId.endsWith('>')).toBe(true);
    });
  });

  describe('DEFAULT_EMAIL_SERVICE_CONFIG', () => {
    it('should have all required fields with correct default values', () => {
      expect(DEFAULT_EMAIL_SERVICE_CONFIG).toEqual({
        maxAttachmentSize: 25 * 1024 * 1024,
        maxMessageSize: 50 * 1024 * 1024,
        inlinePartThreshold: 64 * 1024,
        maxInlinePartsTotal: 256 * 1024,
        defaultPageSize: 50,
        maxReferencesCount: 20,
        maxRetryAttempts: 3,
        deliveryTimeoutMs: 24 * 60 * 60 * 1000,
        nodeId: 'localhost',
      });
    });
  });

  describe('sendEmail()', () => {
    let service: EmailMessageService;
    let storeMock: jest.Mock;
    let announceMessageMock: jest.Mock;

    beforeEach(() => {
      storeMock = jest.fn().mockResolvedValue(undefined);
      announceMessageMock = jest.fn().mockResolvedValue(undefined);

      const metadataStoreMock: IEmailMetadataStore = {
        store: storeMock,
        get: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        queryInbox: jest.fn(),
        getUnreadCount: jest.fn(),
        markAsRead: jest.fn(),
        getThread: jest.fn(),
        getRootMessage: jest.fn(),
      };

      const gossipServiceMock = {
        announceBlock: jest.fn(),
        announceRemoval: jest.fn(),
        handleAnnouncement: jest.fn(),
        onAnnouncement: jest.fn(),
        offAnnouncement: jest.fn(),
        getPendingAnnouncements: jest.fn().mockReturnValue([]),
        flushAnnouncements: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        getConfig: jest.fn(),
        announceMessage: announceMessageMock,
        sendDeliveryAck: jest.fn(),
        onMessageDelivery: jest.fn(),
        offMessageDelivery: jest.fn(),
        onDeliveryAck: jest.fn(),
        offDeliveryAck: jest.fn(),
      } as unknown as IGossipService;

      service = new EmailMessageService(
        mockMessageCBLService,
        metadataStoreMock,
        gossipServiceMock,
        { nodeId: 'test-node.brightchain.org' },
      );
    });

    it('should return success with messageId for valid input', async () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Test',
        textBody: 'Hello, World!',
      };

      const result = await service.sendEmail(input);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^<[^@]+@[^>]+>$/);
      expect(result.brightchainMessageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should auto-generate messageId when not provided', async () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        textBody: 'Hello',
      };

      const result = await service.sendEmail(input);

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^<.+@test-node\.brightchain\.org>$/);
    });

    it('should auto-generate date when not provided', async () => {
      const beforeSend = new Date();
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        textBody: 'Hello',
      };

      await service.sendEmail(input);

      // First store call is the sender's copy (with full metadata)
      // Second store call is the BCC-stripped copy for To/CC delivery
      expect(storeMock).toHaveBeenCalledTimes(2);
      const storedMetadata = storeMock.mock.calls[0][0] as IEmailMetadata;
      expect(storedMetadata.date).toBeInstanceOf(Date);
      expect(storedMetadata.date.getTime()).toBeGreaterThanOrEqual(
        beforeSend.getTime(),
      );
    });

    it('should use provided messageId when given', async () => {
      const customMessageId = '<custom-id@example.com>';
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        messageId: customMessageId,
        textBody: 'Hello',
      };

      const result = await service.sendEmail(input);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(customMessageId);
    });

    it('should fail validation when no recipients provided', async () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        textBody: 'Hello',
      };

      const result = await service.sendEmail(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('recipient');
    });

    it('should fail validation when from has invalid address', async () => {
      const input: IEmailInput = {
        from: createMailbox('', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        textBody: 'Hello',
      };

      const result = await service.sendEmail(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should call metadataStore.store() with correct metadata', async () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        cc: [createMailbox('cc-user', 'example.com')],
        subject: 'Test Subject',
        textBody: 'Hello, World!',
      };

      await service.sendEmail(input);

      // First call stores sender's copy, second stores BCC-stripped copy for To/CC delivery
      expect(storeMock).toHaveBeenCalledTimes(2);
      const storedMetadata = storeMock.mock.calls[0][0] as IEmailMetadata;

      // Verify email-specific fields
      expect(storedMetadata.from.address).toBe('sender@example.com');
      expect(storedMetadata.to).toHaveLength(1);
      expect(storedMetadata.to[0].address).toBe('recipient@example.com');
      expect(storedMetadata.cc).toHaveLength(1);
      expect(storedMetadata.cc![0].address).toBe('cc-user@example.com');
      expect(storedMetadata.subject).toBe('Test Subject');
      expect(storedMetadata.messageId).toMatch(/^<[^@]+@[^>]+>$/);
      expect(storedMetadata.mimeVersion).toBe('1.0');
      expect(storedMetadata.messageType).toBe('email');
      expect(storedMetadata.senderId).toBe('sender@example.com');
      expect(storedMetadata.recipients).toContain('recipient@example.com');
      expect(storedMetadata.recipients).toContain('cc-user@example.com');
    });

    it('should call gossipService.announceMessage() for To/CC and BCC separately', async () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        bcc: [createMailbox('bcc-user', 'example.com')],
        textBody: 'Hello',
      };

      await service.sendEmail(input);

      // BCC privacy: announceMessage is called separately for To/CC and each BCC recipient
      expect(announceMessageMock).toHaveBeenCalledTimes(2);

      // First call: To/CC recipients only (no BCC info)
      const [blockIds1, metadata1] = announceMessageMock.mock.calls[0];
      expect(Array.isArray(blockIds1)).toBe(true);
      expect(metadata1.recipientIds).toEqual(['recipient@example.com']);
      expect(metadata1.ackRequired).toBe(true);
      expect(metadata1.priority).toBe('normal');

      // Second call: BCC recipient delivered separately
      const [blockIds2, metadata2] = announceMessageMock.mock.calls[1];
      expect(Array.isArray(blockIds2)).toBe(true);
      expect(metadata2.recipientIds).toEqual(['bcc-user@example.com']);
      expect(metadata2.ackRequired).toBe(true);
      expect(metadata2.priority).toBe('normal');
    });

    it('should preserve CC visibility in all recipient copies (Requirement 9.1)', async () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('to-user', 'example.com')],
        cc: [createMailbox('cc-user', 'example.com')],
        bcc: [createMailbox('bcc-user', 'example.com')],
        textBody: 'Hello',
      };

      await service.sendEmail(input);

      // storeMock calls: [0] sender copy, [1] To/CC delivery copy, [2] BCC copy
      expect(storeMock.mock.calls.length).toBeGreaterThanOrEqual(3);

      // To/CC delivery copy should have CC visible
      const toCcCopy = storeMock.mock.calls[1][0] as IEmailMetadata;
      expect(toCcCopy.cc).toBeDefined();
      expect(toCcCopy.cc).toHaveLength(1);
      expect(toCcCopy.cc![0].address).toBe('cc-user@example.com');

      // BCC recipient copy should also have CC visible
      const bccCopy = storeMock.mock.calls[2][0] as IEmailMetadata;
      expect(bccCopy.cc).toBeDefined();
      expect(bccCopy.cc).toHaveLength(1);
      expect(bccCopy.cc![0].address).toBe('cc-user@example.com');

      // Both copies should NOT have BCC
      expect(toCcCopy.bcc).toBeUndefined();
      expect(bccCopy.bcc).toBeUndefined();
    });

    it('should support undisclosed recipients (BCC-only, empty To) per Requirement 9.6', async () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        // No To or CC - only BCC (undisclosed recipients)
        bcc: [
          createMailbox('bcc1', 'example.com'),
          createMailbox('bcc2', 'example.com'),
        ],
        textBody: 'Secret message',
      };

      const result = await service.sendEmail(input);

      expect(result.success).toBe(true);

      // Sender copy + one BCC copy per recipient = 3 store calls
      expect(storeMock).toHaveBeenCalledTimes(3);

      // No To/CC delivery should have been attempted
      // announceMessageMock should be called once per BCC recipient (2 times)
      expect(announceMessageMock).toHaveBeenCalledTimes(2);

      // Each BCC delivery should have exactly 1 recipient
      for (let i = 0; i < 2; i++) {
        const [, metadata] = announceMessageMock.mock.calls[i];
        expect(metadata.recipientIds).toHaveLength(1);
        expect(metadata.ackRequired).toBe(true);
      }

      // Sender's copy should have the To field as empty array
      const senderCopy = storeMock.mock.calls[0][0] as IEmailMetadata;
      expect(senderCopy.to).toEqual([]);
    });

    it('should handle delivery errors gracefully', async () => {
      announceMessageMock.mockRejectedValue(new Error('Network failure'));

      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        textBody: 'Hello',
      };

      // Should not throw - delivery errors are non-fatal
      const result = await service.sendEmail(input);

      // Email was stored successfully, so success is true
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toContain('Delivery initiation failed');
    });
  });

  describe('interface type checks', () => {
    it('IEmailInput should accept valid email input', () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Test Subject',
        textBody: 'Hello, World!',
      };

      expect(input.from.address).toBe('sender@example.com');
      expect(input.to).toHaveLength(1);
      expect(input.subject).toBe('Test Subject');
    });

    it('IInboxQuery should accept valid query parameters', () => {
      const query: IInboxQuery = {
        readStatus: 'unread',
        sortBy: 'date',
        sortDirection: 'desc',
        page: 1,
        pageSize: 25,
      };

      expect(query.readStatus).toBe('unread');
      expect(query.sortBy).toBe('date');
      expect(query.page).toBe(1);
    });

    it('IReplyInput should accept valid reply input', () => {
      const reply: IReplyInput = {
        from: createMailbox('replier', 'example.com'),
        replyAll: true,
        textBody: 'This is a reply',
      };

      expect(reply.from.address).toBe('replier@example.com');
      expect(reply.replyAll).toBe(true);
    });

    it('IAttachmentInput should accept valid attachment input', () => {
      const attachment: IAttachmentInput = {
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        content: new Uint8Array([1, 2, 3]),
        inline: false,
      };

      expect(attachment.filename).toBe('document.pdf');
      expect(attachment.mimeType).toBe('application/pdf');
      expect(attachment.content).toHaveLength(3);
    });
  });

  describe('getEmail()', () => {
    let service: EmailMessageService;
    let getMock: jest.Mock;

    function buildMockMetadata(
      overrides?: Partial<IEmailMetadata>,
    ): IEmailMetadata {
      const now = new Date();
      return {
        // IBlockMetadata fields
        blockId: '<mock-block-id>',
        createdAt: now,
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: now,
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        size: 100,
        checksum: '',

        // IMessageMetadata fields
        messageType: 'email',
        senderId: 'sender@example.com',
        recipients: ['recipient@example.com'],
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map([
          ['recipient@example.com', DeliveryStatus.Pending],
        ]),
        acknowledgments: new Map(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: false,
        cblBlockIds: [],

        // IEmailMetadata fields
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        messageId: '<test-msg@example.com>',
        subject: 'Test Subject',
        date: now,
        mimeVersion: '1.0',
        contentType: createContentType(
          'text',
          'plain',
          new Map([['charset', 'utf-8']]),
        ),
        customHeaders: new Map(),
        deliveryReceipts: new Map(),
        readReceipts: new Map(),
        ...overrides,
      };
    }

    beforeEach(() => {
      getMock = jest.fn();

      const metadataStoreMock: IEmailMetadataStore = {
        store: jest.fn(),
        get: getMock,
        delete: jest.fn(),
        update: jest.fn(),
        queryInbox: jest.fn(),
        getUnreadCount: jest.fn(),
        markAsRead: jest.fn(),
        getThread: jest.fn(),
        getRootMessage: jest.fn(),
      };

      service = new EmailMessageService(
        {} as MessageCBLService,
        metadataStoreMock,
        {
          announceBlock: jest.fn(),
          announceRemoval: jest.fn(),
          handleAnnouncement: jest.fn(),
          onAnnouncement: jest.fn(),
          offAnnouncement: jest.fn(),
          getPendingAnnouncements: jest.fn().mockReturnValue([]),
          flushAnnouncements: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          getConfig: jest.fn(),
          announceMessage: jest.fn(),
          sendDeliveryAck: jest.fn(),
          onMessageDelivery: jest.fn(),
          offMessageDelivery: jest.fn(),
          onDeliveryAck: jest.fn(),
          offDeliveryAck: jest.fn(),
        } as unknown as IGossipService,
      );
    });

    it('should return metadata when found', async () => {
      const mockMetadata = buildMockMetadata();
      getMock.mockResolvedValue(mockMetadata);

      const result = await service.getEmail('<test-msg@example.com>');

      expect(result).toBe(mockMetadata);
      expect(getMock).toHaveBeenCalledWith('<test-msg@example.com>');
    });

    it('should return null when not found', async () => {
      getMock.mockResolvedValue(null);

      const result = await service.getEmail('<nonexistent@example.com>');

      expect(result).toBeNull();
      expect(getMock).toHaveBeenCalledWith('<nonexistent@example.com>');
    });
  });

  describe('getEmailContent()', () => {
    let service: EmailMessageService;
    let getMock: jest.Mock;

    function buildMockMetadata(
      overrides?: Partial<IEmailMetadata>,
    ): IEmailMetadata {
      const now = new Date();
      return {
        blockId: '<mock-block-id>',
        createdAt: now,
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: now,
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        size: 100,
        checksum: '',
        messageType: 'email',
        senderId: 'sender@example.com',
        recipients: ['recipient@example.com'],
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map([
          ['recipient@example.com', DeliveryStatus.Pending],
        ]),
        acknowledgments: new Map(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: false,
        cblBlockIds: [],
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        messageId: '<test-msg@example.com>',
        subject: 'Test Subject',
        date: now,
        mimeVersion: '1.0',
        contentType: createContentType('multipart', 'mixed'),
        customHeaders: new Map(),
        deliveryReceipts: new Map(),
        readReceipts: new Map(),
        ...overrides,
      };
    }

    beforeEach(() => {
      getMock = jest.fn();

      const metadataStoreMock: IEmailMetadataStore = {
        store: jest.fn(),
        get: getMock,
        delete: jest.fn(),
        update: jest.fn(),
        queryInbox: jest.fn(),
        getUnreadCount: jest.fn(),
        markAsRead: jest.fn(),
        getThread: jest.fn(),
        getRootMessage: jest.fn(),
      };

      service = new EmailMessageService(
        {} as MessageCBLService,
        metadataStoreMock,
        {
          announceBlock: jest.fn(),
          announceRemoval: jest.fn(),
          handleAnnouncement: jest.fn(),
          onAnnouncement: jest.fn(),
          offAnnouncement: jest.fn(),
          getPendingAnnouncements: jest.fn().mockReturnValue([]),
          flushAnnouncements: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          getConfig: jest.fn(),
          announceMessage: jest.fn(),
          sendDeliveryAck: jest.fn(),
          onMessageDelivery: jest.fn(),
          offMessageDelivery: jest.fn(),
          onDeliveryAck: jest.fn(),
          offDeliveryAck: jest.fn(),
        } as unknown as IGossipService,
      );
    });

    it('should return full content when found', async () => {
      const encoder = new TextEncoder();
      const mockMetadata = buildMockMetadata({
        parts: [
          {
            contentType: createContentType(
              'text',
              'plain',
              new Map([['charset', 'utf-8']]),
            ),
            body: encoder.encode('Hello, World!'),
            size: 13,
          },
          {
            contentType: createContentType('text', 'html'),
            body: encoder.encode('<p>Hello, World!</p>'),
            size: 20,
          },
        ],
      });
      getMock.mockResolvedValue(mockMetadata);

      const result = await service.getEmailContent('<test-msg@example.com>');

      expect(result.metadata).toBe(mockMetadata);
      expect(result.textBody).toBe('Hello, World!');
      expect(result.htmlBody).toBe('<p>Hello, World!</p>');
      expect(result.parts).toHaveLength(2);
      expect(result.attachments).toEqual([]);
    });

    it('should throw MESSAGE_NOT_FOUND when not found', async () => {
      getMock.mockResolvedValue(null);

      await expect(
        service.getEmailContent('<nonexistent@example.com>'),
      ).rejects.toThrow(EmailError);

      try {
        await service.getEmailContent('<nonexistent@example.com>');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailError);
        expect((error as EmailError).errorType).toBe(
          EmailErrorType.MESSAGE_NOT_FOUND,
        );
      }
    });

    it('should extract textBody from parts', async () => {
      const encoder = new TextEncoder();
      const mockMetadata = buildMockMetadata({
        parts: [
          {
            contentType: createContentType(
              'text',
              'plain',
              new Map([['charset', 'utf-8']]),
            ),
            body: encoder.encode('Plain text content'),
            size: 18,
          },
        ],
      });
      getMock.mockResolvedValue(mockMetadata);

      const result = await service.getEmailContent('<test-msg@example.com>');

      expect(result.textBody).toBe('Plain text content');
      expect(result.htmlBody).toBeUndefined();
    });

    it('should return empty parts when metadata has no parts', async () => {
      const mockMetadata = buildMockMetadata({ parts: undefined });
      getMock.mockResolvedValue(mockMetadata);

      const result = await service.getEmailContent('<test-msg@example.com>');

      expect(result.textBody).toBeUndefined();
      expect(result.htmlBody).toBeUndefined();
      expect(result.parts).toEqual([]);
    });
  });

  describe('deleteEmail()', () => {
    let service: EmailMessageService;
    let getMock: jest.Mock;
    let deleteMock: jest.Mock;

    function buildMockMetadata(): IEmailMetadata {
      const now = new Date();
      return {
        blockId: '<mock-block-id>',
        createdAt: now,
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: now,
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        size: 100,
        checksum: '',
        messageType: 'email',
        senderId: 'sender@example.com',
        recipients: ['recipient@example.com'],
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map([
          ['recipient@example.com', DeliveryStatus.Pending],
        ]),
        acknowledgments: new Map(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: false,
        cblBlockIds: [],
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        messageId: '<test-msg@example.com>',
        subject: 'Test Subject',
        date: now,
        mimeVersion: '1.0',
        contentType: createContentType('text', 'plain'),
        customHeaders: new Map(),
        deliveryReceipts: new Map(),
        readReceipts: new Map(),
      };
    }

    beforeEach(() => {
      getMock = jest.fn();
      deleteMock = jest.fn().mockResolvedValue(undefined);

      const metadataStoreMock: IEmailMetadataStore = {
        store: jest.fn(),
        get: getMock,
        delete: deleteMock,
        update: jest.fn(),
        queryInbox: jest.fn(),
        getUnreadCount: jest.fn(),
        markAsRead: jest.fn(),
        getThread: jest.fn(),
        getRootMessage: jest.fn(),
      };

      service = new EmailMessageService(
        {} as MessageCBLService,
        metadataStoreMock,
        {
          announceBlock: jest.fn(),
          announceRemoval: jest.fn(),
          handleAnnouncement: jest.fn(),
          onAnnouncement: jest.fn(),
          offAnnouncement: jest.fn(),
          getPendingAnnouncements: jest.fn().mockReturnValue([]),
          flushAnnouncements: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
          getConfig: jest.fn(),
          announceMessage: jest.fn(),
          sendDeliveryAck: jest.fn(),
          onMessageDelivery: jest.fn(),
          offMessageDelivery: jest.fn(),
          onDeliveryAck: jest.fn(),
          offDeliveryAck: jest.fn(),
        } as unknown as IGossipService,
      );
    });

    it('should delete when found', async () => {
      getMock.mockResolvedValue(buildMockMetadata());

      await service.deleteEmail('<test-msg@example.com>');

      expect(getMock).toHaveBeenCalledWith('<test-msg@example.com>');
      expect(deleteMock).toHaveBeenCalledWith('<test-msg@example.com>');
    });

    it('should throw MESSAGE_NOT_FOUND when not found', async () => {
      getMock.mockResolvedValue(null);

      await expect(
        service.deleteEmail('<nonexistent@example.com>'),
      ).rejects.toThrow(EmailError);

      try {
        await service.deleteEmail('<nonexistent@example.com>');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailError);
        expect((error as EmailError).errorType).toBe(
          EmailErrorType.MESSAGE_NOT_FOUND,
        );
      }
    });
  });

  describe('attachment storage (Task 8.7)', () => {
    let service: EmailMessageService;
    let storeMock: jest.Mock;
    let getMock: jest.Mock;
    let announceMessageMock: jest.Mock;

    beforeEach(() => {
      storeMock = jest.fn().mockResolvedValue(undefined);
      getMock = jest.fn();
      announceMessageMock = jest.fn().mockResolvedValue(undefined);

      const metadataStoreMock: IEmailMetadataStore = {
        store: storeMock,
        get: getMock,
        delete: jest.fn(),
        update: jest.fn(),
        queryInbox: jest.fn(),
        getUnreadCount: jest.fn(),
        markAsRead: jest.fn(),
        getThread: jest.fn(),
        getRootMessage: jest.fn(),
      };

      const gossipServiceMock = {
        announceBlock: jest.fn(),
        announceRemoval: jest.fn(),
        handleAnnouncement: jest.fn(),
        onAnnouncement: jest.fn(),
        offAnnouncement: jest.fn(),
        getPendingAnnouncements: jest.fn().mockReturnValue([]),
        flushAnnouncements: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        getConfig: jest.fn(),
        announceMessage: announceMessageMock,
        sendDeliveryAck: jest.fn(),
        onMessageDelivery: jest.fn(),
        offMessageDelivery: jest.fn(),
        onDeliveryAck: jest.fn(),
        offDeliveryAck: jest.fn(),
      } as unknown as IGossipService;

      service = new EmailMessageService(
        {} as MessageCBLService,
        metadataStoreMock,
        gossipServiceMock,
        { nodeId: 'test-node.brightchain.org' },
      );
    });

    it('sendEmail() with attachments should store attachment metadata', async () => {
      const attachmentContent = new Uint8Array([0x50, 0x44, 0x46, 0x2d, 0x31]); // "PDF-1"
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Email with attachment',
        textBody: 'See attached.',
        attachments: [
          {
            filename: 'document.pdf',
            mimeType: 'application/pdf',
            content: attachmentContent,
          },
        ],
      };

      const result = await service.sendEmail(input);
      expect(result.success).toBe(true);

      // First store call is sender's copy (with full metadata including attachments)
      // Second store call is BCC-stripped copy for To/CC delivery
      expect(storeMock).toHaveBeenCalledTimes(2);
      const storedMetadata = storeMock.mock.calls[0][0] as IEmailMetadata;
      expect(storedMetadata.attachments).toBeDefined();
      expect(storedMetadata.attachments).toHaveLength(1);

      const att = storedMetadata.attachments![0];
      expect(att.filename).toBe('document.pdf');
      expect(att.mimeType).toBe('application/pdf');
      expect(att.size).toBe(attachmentContent.length);
    });

    it('sendEmail() with attachments should calculate checksums', async () => {
      const attachmentContent = new Uint8Array([1, 2, 3, 4, 5]);
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        textBody: 'Hello',
        attachments: [
          {
            filename: 'data.bin',
            mimeType: 'application/octet-stream',
            content: attachmentContent,
          },
        ],
      };

      await service.sendEmail(input);

      const storedMetadata = storeMock.mock.calls[0][0] as IEmailMetadata;
      const att = storedMetadata.attachments![0];

      // checksum should be a non-empty hex string (SHA-256 = 64 hex chars)
      expect(att.checksum).toBeDefined();
      expect(typeof att.checksum).toBe('string');
      expect(att.checksum.length).toBe(64);
      expect(att.checksum).toMatch(/^[0-9a-f]{64}$/);

      // contentMd5 should be a non-empty base64 string (MD5 = 24 base64 chars with padding)
      expect(att.contentMd5).toBeDefined();
      expect(typeof att.contentMd5).toBe('string');
      expect(att.contentMd5!.length).toBeGreaterThan(0);
    });

    it('sendEmail() with inline attachment should preserve contentId', async () => {
      const input: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        htmlBody: '<img src="cid:image001">',
        attachments: [
          {
            filename: 'logo.png',
            mimeType: 'image/png',
            content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
            contentId: '<image001>',
            inline: true,
          },
        ],
      };

      await service.sendEmail(input);

      const storedMetadata = storeMock.mock.calls[0][0] as IEmailMetadata;
      const att = storedMetadata.attachments![0];
      expect(att.contentId).toBe('<image001>');
    });

    it('getEmailContent() should return attachment metadata', async () => {
      const now = new Date();
      const mockMetadata: IEmailMetadata = {
        blockId: '<mock-block-id>',
        createdAt: now,
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: now,
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        size: 100,
        checksum: '',
        messageType: 'email',
        senderId: 'sender@example.com',
        recipients: ['recipient@example.com'],
        priority: MessagePriority.NORMAL,
        deliveryStatus: new Map([
          ['recipient@example.com', DeliveryStatus.Pending],
        ]),
        acknowledgments: new Map(),
        encryptionScheme: MessageEncryptionScheme.NONE,
        isCBL: false,
        cblBlockIds: [],
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        messageId: '<test-msg@example.com>',
        subject: 'Test with attachment',
        date: now,
        mimeVersion: '1.0',
        contentType: createContentType('multipart', 'mixed'),
        customHeaders: new Map(),
        deliveryReceipts: new Map(),
        readReceipts: new Map(),
        attachments: [
          {
            filename: 'report.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            cblMagnetUrl: 'magnet:?xt=urn:cbl:abc123',
            blockIds: ['cbl-block-abc123'],
            checksum: 'abc123',
            contentMd5: 'dGVzdA==',
          },
        ],
      };
      getMock.mockResolvedValue(mockMetadata);

      const result = await service.getEmailContent('<test-msg@example.com>');

      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].metadata.filename).toBe('report.pdf');
      expect(result.attachments[0].metadata.mimeType).toBe('application/pdf');
      expect(result.attachments[0].metadata.size).toBe(1024);
      expect(result.attachments[0].metadata.checksum).toBe('abc123');
      // Content is empty Uint8Array since actual CBL retrieval is not yet implemented
      expect(result.attachments[0].content).toBeInstanceOf(Uint8Array);
      expect(result.attachments[0].content.length).toBe(0);
    });
  });

  // ─── Encryption Integration (Requirements 16.1, 16.4, 16.7) ──────────

  describe('sendEmail with encryption', () => {
    let service: EmailMessageService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
      );
    });

    it('should store encryption metadata when SHARED_KEY scheme is used', async () => {
      const { randomBytes } = await import('crypto');
      const storeMock = mockMetadataStore.store as jest.Mock;
      storeMock.mockResolvedValue(undefined);

      const sharedKey = randomBytes(32);
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Encrypted email',
        textBody: 'Secret content',
        encryptionScheme: MessageEncryptionScheme.SHARED_KEY,
        sharedKey,
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(true);

      // The first store call is the sender's copy
      const storedMetadata = storeMock.mock.calls[0][0] as IEmailMetadata;
      expect(storedMetadata.encryptionScheme).toBe(
        MessageEncryptionScheme.SHARED_KEY,
      );
      expect(storedMetadata.encryptionIv).toBeDefined();
      expect(storedMetadata.encryptionIv!.length).toBe(12);
      expect(storedMetadata.encryptionAuthTag).toBeDefined();
      expect(storedMetadata.encryptionAuthTag!.length).toBe(16);
    });

    it('should fail when SHARED_KEY scheme is used without a shared key', async () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Missing key',
        textBody: 'Content',
        encryptionScheme: MessageEncryptionScheme.SHARED_KEY,
        // No sharedKey provided
      };

      await expect(service.sendEmail(email)).rejects.toThrow(EmailError);
    });

    it('should fail when RECIPIENT_KEYS scheme is used without public keys', async () => {
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Missing keys',
        textBody: 'Content',
        encryptionScheme: MessageEncryptionScheme.RECIPIENT_KEYS,
        // No recipientPublicKeys provided
      };

      await expect(service.sendEmail(email)).rejects.toThrow(EmailError);
    });

    it('should store signature metadata when sender keys are provided with SHARED_KEY', async () => {
      const { randomBytes } = await import('crypto');
      const storeMock = mockMetadataStore.store as jest.Mock;
      storeMock.mockResolvedValue(undefined);

      const sharedKey = randomBytes(32);
      const senderPrivateKey = randomBytes(32);
      const senderPublicKey = randomBytes(33);

      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Signed and encrypted',
        textBody: 'Signed content',
        encryptionScheme: MessageEncryptionScheme.SHARED_KEY,
        sharedKey,
        senderPrivateKey,
        senderPublicKey,
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(true);

      const storedMetadata = storeMock.mock.calls[0][0] as IEmailMetadata;
      expect(storedMetadata.isSigned).toBe(true);
      expect(storedMetadata.contentSignature).toBeDefined();
      expect(storedMetadata.contentSignature!.length).toBe(32);
      expect(storedMetadata.signerPublicKey).toBeDefined();
    });

    it('should not set encryption metadata when scheme is NONE', async () => {
      const storeMock = mockMetadataStore.store as jest.Mock;
      storeMock.mockResolvedValue(undefined);

      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'Plain email',
        textBody: 'No encryption',
      };

      const result = await service.sendEmail(email);
      expect(result.success).toBe(true);

      const storedMetadata = storeMock.mock.calls[0][0] as IEmailMetadata;
      expect(storedMetadata.encryptionScheme).toBe(
        MessageEncryptionScheme.NONE,
      );
      expect(storedMetadata.encryptedKeys).toBeUndefined();
      expect(storedMetadata.encryptionIv).toBeUndefined();
      expect(storedMetadata.encryptionAuthTag).toBeUndefined();
      expect(storedMetadata.isSigned).toBeUndefined();
    });
  });

  // ─── Signature Verification (Requirements 16.5, 16.8) ────────────────

  describe('verifyEmailSignature', () => {
    let service: EmailMessageService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
      );
    });

    it('should return isSigned=false for unsigned emails', async () => {
      const getMock = mockMetadataStore.get as jest.Mock;
      getMock.mockResolvedValue({
        messageId: '<test@example.com>',
        isSigned: false,
      });

      const { randomBytes } = await import('crypto');
      const result = await service.verifyEmailSignature(
        '<test@example.com>',
        randomBytes(32),
      );

      expect(result.isSigned).toBe(false);
      expect(result.verified).toBe(false);
    });

    it('should throw for non-existent email', async () => {
      const getMock = mockMetadataStore.get as jest.Mock;
      getMock.mockResolvedValue(null);

      const { randomBytes } = await import('crypto');
      await expect(
        service.verifyEmailSignature('<missing@example.com>', randomBytes(32)),
      ).rejects.toThrow(EmailError);
    });
  });

  // ─── S/MIME Encryption (Requirement 16.6) ─────────────────────────────

  describe('sendEmail with S/MIME encryption', () => {
    let service: EmailMessageService;

    beforeEach(() => {
      jest.clearAllMocks();
      service = new EmailMessageService(
        mockMessageCBLService,
        mockMetadataStore,
        mockGossipService,
      );
    });

    it('should fail when S_MIME scheme is used without recipient public keys', async () => {
      const { randomBytes } = await import('crypto');
      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'S/MIME test',
        textBody: 'Content',
        encryptionScheme: MessageEncryptionScheme.S_MIME,
        senderPrivateKey: randomBytes(32),
        senderPublicKey: randomBytes(33),
        // No recipientPublicKeys
      };

      await expect(service.sendEmail(email)).rejects.toThrow(EmailError);
    });

    it('should fail when S_MIME scheme is used without sender keys', async () => {
      const { randomBytes } = await import('crypto');
      const recipientPublicKeys = new Map<string, Uint8Array>();
      recipientPublicKeys.set('recipient@example.com', randomBytes(33));

      const email: IEmailInput = {
        from: createMailbox('sender', 'example.com'),
        to: [createMailbox('recipient', 'example.com')],
        subject: 'S/MIME test',
        textBody: 'Content',
        encryptionScheme: MessageEncryptionScheme.S_MIME,
        recipientPublicKeys,
        // No senderPrivateKey or senderPublicKey
      };

      await expect(service.sendEmail(email)).rejects.toThrow(EmailError);
    });
  });
});
