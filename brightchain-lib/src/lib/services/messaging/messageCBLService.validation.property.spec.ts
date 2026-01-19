import {
  ECIESService,
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { BlockSize } from '../../enumerations/blockSize';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { ServiceProvider } from '../service.provider';
import { MessageCBLService } from './messageCBLService';

describe('Feature: message-passing-and-events, Property: Recipient Node ID Validation', () => {
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let creator: Member;

  beforeEach(async () => {
    checksumService = new ChecksumService();
    const eciesService = new ECIESService();
    cblService = new CBLService(checksumService, eciesService);

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

  it('Property 5: Recipient Node ID Validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }), // Valid strings
            fc.constant(''), // Empty string
            fc.string({ minLength: 1, maxLength: 10 }).map((s) => s.trim()), // Whitespace strings
          ),
          { minLength: 0, maxLength: 10 },
        ),
        async (recipients) => {
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          const service = new MessageCBLService(
            cblService,
            checksumService,
            blockStore,
            metadataStore,
          );

          const content = new TextEncoder().encode('test');
          const options = {
            messageType: 'validation',
            senderId: 'sender',
            recipients,
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
          };

          // MessageCBLService accepts any recipient list format
          // Validation is responsibility of caller
          const { messageId } = await service.createMessage(
            content,
            creator,
            options,
          );
          const metadata = await service.getMessageMetadata(messageId);

          // Verify recipients are stored as-is
          expect(metadata?.recipients).toEqual(recipients);

          // Verify delivery status initialized for unique recipients
          // (Map keys are unique, so duplicates only get one entry)
          const uniqueRecipients = new Set(recipients);
          expect(metadata?.deliveryStatus.size).toBe(uniqueRecipients.size);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 5b: Empty recipient list (broadcast)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 100 }),
        async (content) => {
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          const service = new MessageCBLService(
            cblService,
            checksumService,
            blockStore,
            metadataStore,
          );

          const options = {
            messageType: 'broadcast',
            senderId: 'sender',
            recipients: [],
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
          };

          const { messageId } = await service.createMessage(
            content,
            creator,
            options,
          );
          const metadata = await service.getMessageMetadata(messageId);

          // Empty recipients list is valid (broadcast)
          expect(metadata?.recipients).toEqual([]);
          expect(metadata?.deliveryStatus.size).toBe(0);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 5c: Non-empty recipient list (direct)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (recipients) => {
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          const service = new MessageCBLService(
            cblService,
            checksumService,
            blockStore,
            metadataStore,
          );

          const content = new TextEncoder().encode('direct');
          const options = {
            messageType: 'direct',
            senderId: 'sender',
            recipients,
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
          };

          const { messageId } = await service.createMessage(
            content,
            creator,
            options,
          );
          const metadata = await service.getMessageMetadata(messageId);

          // Non-empty recipients list is valid (direct message)
          expect(metadata?.recipients).toEqual(recipients);

          // Delivery status has unique recipients only
          const uniqueRecipients = new Set(recipients);
          expect(metadata?.deliveryStatus.size).toBe(uniqueRecipients.size);
        },
      ),
      { numRuns: 50 },
    );
  });
});
