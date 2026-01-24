import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
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

describe('Feature: message-passing-and-events, Property: MessageCBL Round-Trip', () => {
  let messageCBLService: MessageCBLService;
  let cblService: CBLService;
  let checksumService: ChecksumService;
  let creator: Member;

  beforeEach(() => {
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

  it('Property 1: Content round-trip preserves data for various sizes', async () => {
    const blockSizeNum = BlockSize.Small as number;
    // CBL header is ~200 bytes, each block ID is 64 bytes
    // For BlockSize.Small (1024), we can fit ~12 block IDs safely
    // So max content should be ~12 blocks = 12 * 1024 = 12288 bytes
    const _maxContentSize = blockSizeNum * 10; // Conservative limit (unused, kept for documentation)

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(new Uint8Array(0)), // 0 bytes
          fc.constant(new Uint8Array(1).fill(42)), // 1 byte
          fc.uint8Array({
            minLength: blockSizeNum - 1,
            maxLength: blockSizeNum - 1,
          }), // block size - 1
          fc.uint8Array({ minLength: blockSizeNum, maxLength: blockSizeNum }), // exact block size
          fc.uint8Array({
            minLength: blockSizeNum + 1,
            maxLength: blockSizeNum + 1,
          }), // block size + 1
          fc.uint8Array({
            minLength: blockSizeNum * 2,
            maxLength: blockSizeNum * 2,
          }), // 2 blocks
        ),
        async (content) => {
          // Reset stores for each test run
          const blockStore = new MemoryBlockStore(BlockSize.Small);
          const metadataStore = new MemoryMessageMetadataStore();
          messageCBLService = new MessageCBLService(
            cblService,
            checksumService,
            blockStore,
            metadataStore,
          );

          const options = {
            messageType: 'test',
            senderId: 'sender',
            recipients: ['recipient'],
            priority: MessagePriority.NORMAL,
            encryptionScheme: MessageEncryptionScheme.NONE,
          };

          const { messageId } = await messageCBLService.createMessage(
            content,
            creator,
            options,
          );
          const retrieved =
            await messageCBLService.getMessageContent(messageId);

          expect(retrieved).toEqual(content);
        },
      ),
      { numRuns: 100 },
    );
  });
});
