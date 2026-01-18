import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fc from 'fast-check';
import { MessageCBLService } from './messageCBLService';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { ECIESService, EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { BlockSize } from '../../enumerations/blockSize';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { ServiceProvider } from '../service.provider';

describe('Feature: message-passing-and-events, Property: MessageCBL Metadata Persistence', () => {
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

  it('Property 2: All message options are preserved in metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        fc.constantFrom(MessagePriority.LOW, MessagePriority.NORMAL, MessagePriority.HIGH),
        fc.constantFrom(MessageEncryptionScheme.NONE, MessageEncryptionScheme.SHARED_KEY, MessageEncryptionScheme.RECIPIENT_KEYS),
        async (messageType, senderId, recipients, priority, encryptionScheme) => {
          // Reset stores for each test run
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          messageCBLService = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

          const content = new TextEncoder().encode('test');
          const options = { messageType, senderId, recipients, priority, encryptionScheme };

          const { messageId } = await messageCBLService.createMessage(content, creator, options);
          const metadata = await messageCBLService.getMessageMetadata(messageId);

          expect(metadata).toBeDefined();
          expect(metadata?.messageType).toBe(messageType);
          expect(metadata?.senderId).toBe(senderId);
          expect(metadata?.recipients).toEqual(recipients);
          expect(metadata?.priority).toBe(priority);
          expect(metadata?.encryptionScheme).toBe(encryptionScheme);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Each recipient gets PENDING delivery status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }).map(arr => [...new Set(arr)]).filter(arr => arr.length > 0),
        async (recipients) => {
          // Reset stores for each test run
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          messageCBLService = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

          const content = new TextEncoder().encode('test');
          const options = {
            messageType: 'test',
            senderId: 'sender',
            recipients,
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
          };

          const { messageId } = await messageCBLService.createMessage(content, creator, options);
          const metadata = await messageCBLService.getMessageMetadata(messageId);

          expect(metadata).toBeDefined();
          expect(metadata?.deliveryStatus.size).toBe(recipients.length);
          
          for (const recipient of recipients) {
            expect(metadata?.deliveryStatus.get(recipient)).toBe(MessageDeliveryStatus.PENDING);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
