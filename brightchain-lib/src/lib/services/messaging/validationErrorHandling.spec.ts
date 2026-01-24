import { Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessageErrorType } from '../../enumerations/messaging/messageErrorType';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { MessageError } from '../../errors/messaging/messageError';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { ServiceProvider } from '../service.provider';
import { MessageCBLService } from './messageCBLService';

describe('MessageCBLService Validation Error Handling', () => {
  let service: MessageCBLService;
  let blockStore: MemoryBlockStore;
  let metadataStore: MemoryMessageMetadataStore;
  let creator: Member;

  beforeEach(() => {
    const serviceProvider = ServiceProvider.getInstance();
    const eciesService = serviceProvider.eciesService;
    const checksumService = serviceProvider.checksumService;
    const cblService = serviceProvider.cblService;
    blockStore = new MemoryBlockStore(BlockSize.Small);
    metadataStore = new MemoryMessageMetadataStore();
    service = new MessageCBLService(
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

  it('should reject empty message type', async () => {
    const content = new Uint8Array([1, 2, 3]);
    const options = {
      messageType: '',
      senderId: 'sender1',
      recipients: ['recipient1'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    await expect(
      service.createMessage(content, creator, options),
    ).rejects.toThrow(MessageError);
    await expect(
      service.createMessage(content, creator, options),
    ).rejects.toMatchObject({
      errorType: MessageErrorType.INVALID_MESSAGE_TYPE,
    });
  });

  it('should reject empty sender ID', async () => {
    const content = new Uint8Array([1, 2, 3]);
    const options = {
      messageType: 'test',
      senderId: '',
      recipients: ['recipient1'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    await expect(
      service.createMessage(content, creator, options),
    ).rejects.toThrow(MessageError);
    await expect(
      service.createMessage(content, creator, options),
    ).rejects.toMatchObject({
      errorType: MessageErrorType.INVALID_RECIPIENT,
    });
  });

  it('should reject too many recipients', async () => {
    const content = new Uint8Array([1, 2, 3]);
    const recipients = Array.from({ length: 1001 }, (_, i) => `recipient${i}`);
    const options = {
      messageType: 'test',
      senderId: 'sender1',
      recipients,
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    await expect(
      service.createMessage(content, creator, options),
    ).rejects.toThrow(MessageError);
    await expect(
      service.createMessage(content, creator, options),
    ).rejects.toMatchObject({
      errorType: MessageErrorType.INVALID_RECIPIENT,
    });
  });

  it('should reject message too large', async () => {
    const content = new Uint8Array(2 * 1024 * 1024); // 2MB
    const options = {
      messageType: 'test',
      senderId: 'sender1',
      recipients: ['recipient1'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    await expect(
      service.createMessage(content, creator, options),
    ).rejects.toThrow(MessageError);
    await expect(
      service.createMessage(content, creator, options),
    ).rejects.toMatchObject({
      errorType: MessageErrorType.MESSAGE_TOO_LARGE,
    });
  });

  it('should throw MessageError for non-existent message', async () => {
    await expect(service.getMessageContent('nonexistent')).rejects.toThrow(
      MessageError,
    );
    await expect(
      service.getMessageContent('nonexistent'),
    ).rejects.toMatchObject({
      errorType: MessageErrorType.MESSAGE_NOT_FOUND,
    });
  });
});
