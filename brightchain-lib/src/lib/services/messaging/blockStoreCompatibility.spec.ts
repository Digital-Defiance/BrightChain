import { ECIESService, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { ServiceProvider } from '../service.provider';
import { MessageCBLService } from './messageCBLService';

describe('BlockStore Interface Compatibility', () => {
  let blockStore: MemoryBlockStore;
  let metadataStore: MemoryMessageMetadataStore;
  let messageCBL: MessageCBLService;
  let creator: Member;

  beforeEach(async () => {
    blockStore = new MemoryBlockStore(BlockSize.Small);
    metadataStore = new MemoryMessageMetadataStore();
    const checksumService = new ChecksumService();
    const eciesService = new ECIESService();
    const cblService = new CBLService(checksumService, eciesService);
    messageCBL = new MessageCBLService(
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
      'test@example.com' as unknown as Parameters<typeof Member.newMember>[3],
    );
    creator = memberWithMnemonic.member;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  it('should create message blocks in block store', async () => {
    const content = Buffer.from('test message');
    const { messageId, contentBlockIds } = await messageCBL.createMessage(
      content,
      creator,
      {
        senderId: creator.id.toString(),
        recipients: ['recipient1'],
        messageType: 'direct',
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      },
    );

    expect(messageId).toBeDefined();
    expect(contentBlockIds.length).toBeGreaterThan(0);

    for (const blockId of contentBlockIds) {
      const hasBlock = await blockStore.has(blockId);
      expect(hasBlock).toBe(true);
    }
  });

  it('should retrieve message content', async () => {
    const content = Buffer.from('test message content');
    const { messageId } = await messageCBL.createMessage(content, creator, {
      senderId: creator.id.toString(),
      recipients: ['recipient1'],
      messageType: 'direct',
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    });

    const retrieved = await messageCBL.getMessageContent(messageId);
    expect(retrieved).toEqual(content);
  });
});
