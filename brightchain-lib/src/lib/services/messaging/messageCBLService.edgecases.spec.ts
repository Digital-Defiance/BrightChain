import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MessageCBLService } from './messageCBLService';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { ECIESService, EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { BlockSize } from '../../enumerations/blockSize';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { ServiceProvider } from '../service.provider';

describe('Feature: message-passing-and-events, MessageCBL Edge Cases', () => {
  let messageCBLService: MessageCBLService;
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let creator: Member;

  beforeEach(async () => {
    checksumService = new ChecksumService();
    const eciesService = new ECIESService();
    cblService = new CBLService(checksumService, eciesService);
    const blockStore = new MemoryBlockStore(BlockSize.Small);
    const metadataStore = new MemoryMessageMetadataStore();
    messageCBLService = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);
    
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

  describe('MessageCBL Header Operations', () => {
    it('makeMessageHeader creates valid header', () => {
      const header = cblService.makeMessageHeader(
        'chat',
        'sender123',
        ['recipient1', 'recipient2'],
        MessagePriority.HIGH,
        MessageEncryptionScheme.RECIPIENT_KEYS
      );

      expect(header).toBeInstanceOf(Uint8Array);
      expect(header.length).toBeGreaterThan(0);
      expect(header[0]).toBe(2); // isMessage flag
    });

    it('isMessageHeader correctly identifies message headers', () => {
      const messageHeader = cblService.makeMessageHeader(
        'test',
        'sender',
        ['recipient'],
        MessagePriority.NORMAL,
        MessageEncryptionScheme.NONE
      );

      const fullHeader = new Uint8Array(cblService.baseHeaderSize + messageHeader.length);
      fullHeader.set(messageHeader, cblService.baseHeaderCreatorSignatureOffset);

      expect(cblService.isMessageHeader(fullHeader)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content (0 bytes)', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const metadataStore = new MemoryMessageMetadataStore();
      const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

      const content = new Uint8Array(0);
      const options = {
        messageType: 'empty',
        senderId: 'sender',
        recipients: ['recipient'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const { messageId } = await service.createMessage(content, creator, options);
      const retrieved = await service.getMessageContent(messageId);

      expect(retrieved).toEqual(content);
      expect(retrieved.length).toBe(0);
    });

    it('handles content exactly at block boundary', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const metadataStore = new MemoryMessageMetadataStore();
      const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

      const blockSizeNum = BlockSize.Small as number;
      const content = new Uint8Array(blockSizeNum).fill(42);
      const options = {
        messageType: 'boundary',
        senderId: 'sender',
        recipients: ['recipient'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const { messageId, contentBlockIds } = await service.createMessage(content, creator, options);
      const retrieved = await service.getMessageContent(messageId);

      expect(retrieved).toEqual(content);
      expect(contentBlockIds.length).toBe(1);
    });

    it('handles very large content (multiple blocks)', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const metadataStore = new MemoryMessageMetadataStore();
      const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

      const blockSizeNum = BlockSize.Small as number;
      const content = new Uint8Array(blockSizeNum * 5);
      // Fill with unique data per block to avoid identical block IDs
      for (let i = 0; i < content.length; i++) {
        content[i] = (i + Math.floor(i / blockSizeNum)) % 256;
      }
      const options = {
        messageType: 'large',
        senderId: 'sender',
        recipients: ['recipient'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const { messageId, contentBlockIds } = await service.createMessage(content, creator, options);
      const retrieved = await service.getMessageContent(messageId);

      expect(retrieved).toEqual(content);
      expect(contentBlockIds.length).toBe(5);
    });

    it('handles empty recipients list (broadcast)', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const metadataStore = new MemoryMessageMetadataStore();
      const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

      const content = new TextEncoder().encode('broadcast');
      const options = {
        messageType: 'broadcast',
        senderId: 'sender',
        recipients: [],
        priority: MessagePriority.HIGH,
        encryptionScheme: MessageEncryptionScheme.NONE,
      };

      const { messageId } = await service.createMessage(content, creator, options);
      const metadata = await service.getMessageMetadata(messageId);

      expect(metadata?.recipients).toEqual([]);
      expect(metadata?.deliveryStatus.size).toBe(0);
    });

    it('handles single recipient', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const metadataStore = new MemoryMessageMetadataStore();
      const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

      const content = new TextEncoder().encode('direct');
      const options = {
        messageType: 'direct',
        senderId: 'sender',
        recipients: ['recipient1'],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.RECIPIENT_KEYS,
      };

      const { messageId } = await service.createMessage(content, creator, options);
      const metadata = await service.getMessageMetadata(messageId);

      expect(metadata?.recipients).toEqual(['recipient1']);
      expect(metadata?.deliveryStatus.size).toBe(1);
    });

    it('handles many recipients (10+)', async () => {
      const blockStore = new MemoryBlockStore(BlockSize.Small);
      const metadataStore = new MemoryMessageMetadataStore();
      const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

      const content = new TextEncoder().encode('multicast');
      const recipients = Array.from({ length: 15 }, (_, i) => `recipient${i}`);
      const options = {
        messageType: 'multicast',
        senderId: 'sender',
        recipients,
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.RECIPIENT_KEYS,
      };

      const { messageId } = await service.createMessage(content, creator, options);
      const metadata = await service.getMessageMetadata(messageId);

      expect(metadata?.recipients).toEqual(recipients);
      expect(metadata?.deliveryStatus.size).toBe(15);
    });
  });
});
