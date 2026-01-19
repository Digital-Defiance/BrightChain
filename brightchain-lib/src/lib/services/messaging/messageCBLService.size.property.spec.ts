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

describe('Feature: message-passing-and-events, Property: Message Size Handling', () => {
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

  it('Property 2: Message Size Handling', async () => {
    const blockSizeNum = BlockSize.Small as number;

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: blockSizeNum * 10 }),
        async (contentSize) => {
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          const service = new MessageCBLService(
            cblService,
            checksumService,
            blockStore,
            metadataStore,
          );

          // Create content with unique pattern to avoid block ID collisions
          const content = new Uint8Array(contentSize);
          for (let i = 0; i < contentSize; i++) {
            const blockIndex = Math.floor(i / blockSizeNum);
            content[i] = (i + contentSize + blockIndex * 17) % 256;
          }

          const options = {
            messageType: 'test',
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

          // Calculate expected number of blocks
          const expectedBlocks =
            contentSize === 0 ? 0 : Math.ceil(contentSize / blockSizeNum);
          expect(contentBlockIds.length).toBe(expectedBlocks);

          // Verify content round-trip
          const retrieved = await service.getMessageContent(messageId);
          expect(retrieved).toEqual(content);
          expect(retrieved.length).toBe(contentSize);
        },
      ),
      { numRuns: 100 },
    );
  });
});
