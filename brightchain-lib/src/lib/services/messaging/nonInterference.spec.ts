import { Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { ServiceProvider } from '../service.provider';
import { MessageCBLService } from './messageCBLService';

describe('Non-Interference with Existing Operations', () => {
  let blockStore: MemoryBlockStore;
  let metadataStore: MemoryMessageMetadataStore;
  let messageCBL: MessageCBLService;
  let creator: Member;

  beforeEach(async () => {
    // Use ServiceProvider to get properly configured services
    const serviceProvider = ServiceProvider.getInstance();
    const eciesService = serviceProvider.eciesService;
    const checksumService = serviceProvider.checksumService;
    const cblService = serviceProvider.cblService;
    blockStore = new MemoryBlockStore(BlockSize.Small);
    metadataStore = new MemoryMessageMetadataStore();
    messageCBL = new MessageCBLService(
      cblService,
      checksumService,
      blockStore,
      metadataStore,
    );

    const memberWithMnemonic = Member.newMember(
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

  it('should allow message operations without interfering with block store', async () => {
    const messageContent = Buffer.from('test message');
    const { messageId } = await messageCBL.createMessage(
      messageContent,
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

    const retrieved = await messageCBL.getMessageContent(messageId);
    expect(retrieved).toEqual(messageContent);
  });
});
