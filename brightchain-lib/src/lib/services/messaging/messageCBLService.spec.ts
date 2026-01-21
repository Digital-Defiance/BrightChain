import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { BlockSize } from '../../enumerations/blockSize';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { ServiceProvider } from '../service.provider';
import { MessageCBLService } from './messageCBLService';

describe('MessageCBLService', () => {
  let messageCBLService: MessageCBLService;
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let eciesService: ECIESService;
  let blockStore: MemoryBlockStore;
  let metadataStore: MemoryMessageMetadataStore;
  let creator: Member;

  beforeEach(async () => {
    checksumService = new ChecksumService();
    eciesService = new ECIESService();
    cblService = new CBLService(checksumService, eciesService);
    blockStore = new MemoryBlockStore(BlockSize.Small);
    metadataStore = new MemoryMessageMetadataStore();
    messageCBLService = new MessageCBLService(
      cblService,
      checksumService,
      blockStore,
      metadataStore,
    );

    ServiceProvider.getInstance();

    const memberWithMnemonic = await Member.newMember(
      eciesService,
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    );
    creator = memberWithMnemonic.member;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('createMessage', () => {
    it('should create a message with content blocks', async () => {
      const content = new TextEncoder().encode('Hello, World!');
      const options = {
        messageType: 'chat',
        senderId: 'sender123',
        recipients: ['recipient1'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const result = await messageCBLService.createMessage(
        content,
        creator,
        options,
      );

      expect(result.messageId).toBeDefined();
      expect(result.contentBlockIds).toHaveLength(1);
      expect(result.contentBlockIds[0]).toBeDefined();
    });

    it('should create a message with whitened CBL when block store supports it', async () => {
      const content = new TextEncoder().encode('Hello, World!');
      const options = {
        messageType: 'chat',
        senderId: 'sender123',
        recipients: ['recipient1'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const result = await messageCBLService.createMessage(
        content,
        creator,
        options,
      );

      expect(result.messageId).toBeDefined();
      expect(result.magnetUrl).toBeDefined();
      expect(result.magnetUrl).toContain('magnet:?');
      expect(result.contentBlockIds).toHaveLength(1);
    });

    it('should handle empty recipients', async () => {
      const content = new TextEncoder().encode('Broadcast message');
      const options = {
        messageType: 'broadcast',
        senderId: 'sender123',
        recipients: [],
        priority: MessagePriority.HIGH,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const result = await messageCBLService.createMessage(
        content,
        creator,
        options,
      );

      expect(result.messageId).toBeDefined();
      expect(result.contentBlockIds.length).toBeGreaterThan(0);
    });
  });

  describe('getMessageContent', () => {
    it('should store and retrieve MessageCBL block', async () => {
      const originalContent = new TextEncoder().encode('Test');
      const options = {
        messageType: 'test',
        senderId: 'sender',
        recipients: ['recipient'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const { messageId, magnetUrl } = await messageCBLService.createMessage(
        originalContent,
        creator,
        options,
      );

      expect(messageId).toBeDefined();
      expect(magnetUrl).toBeDefined();
      expect(magnetUrl).toContain('magnet:?');
      expect(messageId).toBe(magnetUrl);
    });

    it('should retrieve message content from whitened CBL', async () => {
      const originalContent = new TextEncoder().encode('Test whitened message');
      const options = {
        messageType: 'test',
        senderId: 'sender',
        recipients: ['recipient'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const { messageId, magnetUrl } = await messageCBLService.createMessage(
        originalContent,
        creator,
        options,
      );

      expect(magnetUrl).toBeDefined();
      expect(magnetUrl).toContain('magnet:?');

      const retrievedContent =
        await messageCBLService.getMessageContent(messageId);

      expect(retrievedContent).toEqual(originalContent);
    });

    it('should store message metadata', async () => {
      const originalContent = new TextEncoder().encode('Test');
      const options = {
        messageType: 'chat',
        senderId: 'sender123',
        recipients: ['recipient1', 'recipient2'],
        priority: MessagePriority.HIGH,
        encryptionScheme: MessageEncryptionScheme.RECIPIENT_KEYS,
      };

      const { messageId } = await messageCBLService.createMessage(
        originalContent,
        creator,
        options,
      );
      const metadata = await messageCBLService.getMessageMetadata(messageId);

      expect(metadata).toBeDefined();
      expect(metadata?.messageType).toBe('chat');
      expect(metadata?.senderId).toBe('sender123');
      expect(metadata?.recipients).toEqual(['recipient1', 'recipient2']);
      expect(metadata?.priority).toBe(MessagePriority.HIGH);
      expect(metadata?.encryptionScheme).toBe(
        MessageEncryptionScheme.RECIPIENT_KEYS,
      );
      expect(metadata?.deliveryStatus.get('recipient1')).toBe(
        MessageDeliveryStatus.PENDING,
      );
      expect(metadata?.deliveryStatus.get('recipient2')).toBe(
        MessageDeliveryStatus.PENDING,
      );
    });

    it('should retrieve message content', async () => {
      const originalContent = new TextEncoder().encode('Test message content');
      const options = {
        messageType: 'test',
        senderId: 'sender',
        recipients: ['recipient'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const { messageId } = await messageCBLService.createMessage(
        originalContent,
        creator,
        options,
      );
      const retrievedContent =
        await messageCBLService.getMessageContent(messageId);

      expect(retrievedContent).toEqual(originalContent);
    });
  });
});
