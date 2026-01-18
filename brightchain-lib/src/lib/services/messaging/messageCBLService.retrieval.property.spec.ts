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

describe('Feature: message-passing-and-events, Property: Message-Sized Block Retrieval', () => {
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

  it('Property 29: Message-Sized Block Retrieval', async () => {
    const blockSizeNum = BlockSize.Small as number;
    
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: blockSizeNum }),
        async (contentSize) => {
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          const service = new MessageCBLService(cblService, checksumService, blockStore, metadataStore);

          // Create content with unique pattern
          const content = new Uint8Array(contentSize);
          for (let i = 0; i < contentSize; i++) {
            content[i] = (i + contentSize * 11) % 256;
          }

          const options = {
            messageType: 'retrieval',
            senderId: 'sender',
            recipients: ['recipient'],
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
          };

          const { messageId } = await service.createMessage(content, creator, options);
          
          // Requirement 11.4: Retrieval returns exact original content without padding
          const retrieved = await service.getMessageContent(messageId);
          
          expect(retrieved.length).toBe(contentSize);
          expect(retrieved).toEqual(content);
          
          // Verify no padding bytes included
          if (contentSize < blockSizeNum) {
            // Content should not include any trailing zeros from padding
            for (let i = 0; i < contentSize; i++) {
              expect(retrieved[i]).toBe(content[i]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
