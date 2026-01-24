import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { BlockSize } from '../../enumerations/blockSize';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { Checksum } from '../../types/checksum';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { ServiceProvider } from '../service.provider';
import { MessageCBLService } from './messageCBLService';

describe('Feature: message-passing-and-events, Property: Message-Sized Block Storage', () => {
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let creator: Member;

  beforeEach(async () => {
    // Use ServiceProvider to get properly configured services
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

  it('Property 28: Message-Sized Block Storage', async () => {
    const blockSizeNum = BlockSize.Small as number;

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: blockSizeNum }),
        async (contentSize) => {
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          const service = new MessageCBLService(
            cblService,
            checksumService,
            blockStore,
            metadataStore,
          );

          // Create content with unique pattern
          const content = new Uint8Array(contentSize);
          for (let i = 0; i < contentSize; i++) {
            content[i] = (i + contentSize * 7) % 256;
          }

          const options = {
            messageType: 'sized',
            senderId: 'sender',
            recipients: ['recipient'],
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
          };

          const { messageId, contentBlockIds } = await service.createMessage(
            content,
            creator,
            options,
          );

          // Requirement 11.1: Content <= block size stored in single block
          expect(contentBlockIds.length).toBe(1);

          // Requirement 11.2: Block padded to full block size
          const contentBlock = await blockStore.getData(
            Checksum.fromHex(contentBlockIds[0]),
          );
          expect(contentBlock.data.length).toBe(blockSizeNum);

          // Requirement 11.3: Padding is zeros
          for (let i = contentSize; i < blockSizeNum; i++) {
            expect(contentBlock.data[i]).toBe(0);
          }

          // Verify content retrieval strips padding
          const retrieved = await service.getMessageContent(messageId);
          expect(retrieved.length).toBe(contentSize);
          expect(retrieved).toEqual(content);
        },
      ),
      { numRuns: 100 },
    );
  });
});
