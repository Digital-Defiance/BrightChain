import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { BlockSize } from '../../enumerations/blockSize';
import { DeliveryStatus } from '../../enumerations/messaging/deliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { ServiceProvider } from '../service.provider';
import { MessageCBLService } from './messageCBLService';

describe('Feature: message-passing-and-events, Property: Message Block Storage', () => {
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let creator: Member;

  beforeEach(() => {
    const serviceProvider = ServiceProvider.getInstance();
    const eciesService = serviceProvider.eciesService;
    checksumService = serviceProvider.checksumService;
    cblService = serviceProvider.cblService;

    const memberWithMnemonic = Member.newMember(
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

  it('Property 1: Message Block Storage with Complete Metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 1, maxLength: 1000 }),
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        fc
          .array(fc.string({ minLength: 1, maxLength: 50 }), {
            minLength: 0,
            maxLength: 5,
          })
          .map((arr) => [...new Set(arr)]),
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
          content,
          messageType,
          senderId,
          recipients,
          priority,
          encryptionScheme,
        ) => {
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          const service = new MessageCBLService(
            cblService,
            checksumService,
            blockStore,
            metadataStore,
          );

          const options = {
            messageType,
            senderId,
            recipients,
            priority,
            encryptionScheme,
          };
          const { messageId, contentBlockIds, magnetUrl } =
            await service.createMessage(content, creator, options);

          // Verify messageId is a magnet URL
          expect(messageId).toContain('magnet:?');
          expect(magnetUrl).toBe(messageId);

          // Verify messageId is a TUPLE magnet URL (CBL is now stored as TUPLE)
          expect(messageId).toContain('urn:brightchain:tuple');

          // Verify all content blocks exist in BlockStore
          for (const blockId of contentBlockIds) {
            expect(await blockStore.has(blockId)).toBe(true);
          }

          // Verify metadata is stored with all fields
          const metadata = await service.getMessageMetadata(messageId);
          expect(metadata).toBeDefined();
          expect(metadata?.blockId).toBe(messageId);
          expect(metadata?.messageType).toBe(messageType);
          expect(metadata?.senderId).toBe(senderId);
          expect(metadata?.recipients).toEqual(recipients);
          expect(metadata?.priority).toBe(priority);
          expect(metadata?.encryptionScheme).toBe(encryptionScheme);
          expect(metadata?.isCBL).toBe(true);
          expect(metadata?.cblBlockIds).toEqual(contentBlockIds);
          expect(metadata?.createdAt).toBeInstanceOf(Date);

          // Verify delivery status initialized for all recipients
          expect(metadata?.deliveryStatus.size).toBe(recipients.length);
          for (const recipient of recipients) {
            expect(metadata?.deliveryStatus.get(recipient)).toBe(
              DeliveryStatus.Pending,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
