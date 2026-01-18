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
import { ServiceProvider } from '../service.provider';

describe('Feature: message-passing-and-events, Property: Large Message CBL Splitting', () => {
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

  it('Property 3: Large Message CBL Splitting', async () => {
    const blockSizeNum = BlockSize.Small as number;
    
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 20 }),
        async (numBlocks) => {
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

          const contentSize = numBlocks * blockSizeNum;
          const content = new Uint8Array(contentSize);
          // Create unique pattern per block
          for (let i = 0; i < contentSize; i++) {
            const blockIndex = Math.floor(i / blockSizeNum);
            content[i] = (i + blockIndex * 37) % 256;
          }

          const options = {
            messageType: 'large',
            senderId: 'sender',
            recipients: ['recipient'],
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
          };

          const { messageId, contentBlockIds } = await service.createMessage(content, creator, options);
          
          // Verify correct number of content blocks
          expect(contentBlockIds.length).toBe(numBlocks);

          // Verify MessageCBL block exists
          expect(await blockStore.has(messageId)).toBe(true);

          // Verify all content blocks exist
          for (const blockId of contentBlockIds) {
            expect(await blockStore.has(blockId)).toBe(true);
          }

          // Verify metadata contains all block IDs
          const metadata = await service.getMessageMetadata(messageId);
          expect(metadata?.cblBlockIds).toEqual(contentBlockIds);
          expect(metadata?.isCBL).toBe(true);

          // Verify content reconstruction
          const retrieved = await service.getMessageContent(messageId);
          expect(retrieved).toEqual(content);
        }
      ),
      { numRuns: 50 }
    );
  });
});
