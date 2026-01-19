import { ECIESService, Member, MemberType } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { MessageDeliveryStatus } from '../../enumerations/messaging/messageDeliveryStatus';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { MessagePriority } from '../../enumerations/messaging/messagePriority';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { MemoryMessageMetadataStore } from '../../stores/messaging/memoryMessageMetadataStore';
import { CBLService } from '../cblService';
import { ChecksumService } from '../checksum.service';
import { ServiceProvider } from '../service.provider';
import { MessageCBLService } from './messageCBLService';
import { MessageRouter } from './messageRouter';

describe('Message Passing Integration Tests', () => {
  let messageCBL: MessageCBLService;
  let router: MessageRouter;
  let metadataStore: MemoryMessageMetadataStore;
  let creator: Member;

  beforeEach(async () => {
    const checksumService = new ChecksumService();
    const eciesService = new ECIESService();
    const cblService = new CBLService(checksumService, eciesService);
    const blockStore = new MemoryBlockStore(BlockSize.Small);
    metadataStore = new MemoryMessageMetadataStore();

    messageCBL = new MessageCBLService(
      cblService,
      checksumService,
      blockStore,
      metadataStore,
      { storageRetryAttempts: 3, storageRetryDelayMs: 10 }, // Increased retries for reliability
    );
    router = new MessageRouter(metadataStore, 'local-node', {
      routingTimeoutMs: 5000,
    });

    ServiceProvider.getInstance(); // Initialize service provider

    const memberWithMnemonic = await Member.newMember(
      eciesService,
      MemberType.User,
      'test',
      'test@example.com' as unknown as Parameters<typeof Member.newMember>[3],
    );
    creator = memberWithMnemonic.member;
  });

  it('should complete end-to-end message flow: send → route → deliver → ack', async () => {
    const content = new Uint8Array([1, 2, 3, 4, 5]);
    const options = {
      messageType: 'test',
      senderId: 'sender1',
      recipients: ['recipient1', 'recipient2'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    // Send
    const { messageId } = await messageCBL.createMessage(
      content,
      creator,
      options,
    );
    expect(messageId).toBeDefined();

    // Verify initial status is PENDING
    const initialMetadata = (await metadataStore.get(
      messageId,
    )) as IMessageMetadata;
    expect(initialMetadata?.deliveryStatus.get('recipient1')).toBe(
      MessageDeliveryStatus.PENDING,
    );
    expect(initialMetadata?.deliveryStatus.get('recipient2')).toBe(
      MessageDeliveryStatus.PENDING,
    );

    // Route
    const routingResult = await router.routeMessage(
      messageId,
      options.recipients,
    );
    expect(routingResult.successfulRecipients).toHaveLength(2);

    // Verify delivery status updated to IN_TRANSIT
    const metadata = (await metadataStore.get(messageId)) as IMessageMetadata;
    expect(metadata?.deliveryStatus.get('recipient1')).toBe(
      MessageDeliveryStatus.IN_TRANSIT,
    );
    expect(metadata?.deliveryStatus.get('recipient2')).toBe(
      MessageDeliveryStatus.IN_TRANSIT,
    );

    // Acknowledge
    await metadataStore.recordAcknowledgment(
      messageId,
      'recipient1',
      new Date(),
    );
    await metadataStore.recordAcknowledgment(
      messageId,
      'recipient2',
      new Date(),
    );

    // Verify acknowledgments
    const updatedMetadata = (await metadataStore.get(
      messageId,
    )) as IMessageMetadata;
    expect(updatedMetadata?.acknowledgments.size).toBe(2);
  });

  it('should handle broadcast message propagation', async () => {
    const content = new Uint8Array([1, 2, 3]);
    const options = {
      messageType: 'broadcast',
      senderId: 'sender1',
      recipients: [], // Empty = broadcast
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    const { messageId } = await messageCBL.createMessage(
      content,
      creator,
      options,
    );
    const routingResult = await router.routeMessage(
      messageId,
      options.recipients,
    );

    expect(routingResult.strategy).toBe('GOSSIP');
  });

  it('should handle direct message delivery', async () => {
    const content = new Uint8Array([1, 2, 3]);
    const options = {
      messageType: 'direct',
      senderId: 'sender1',
      recipients: ['recipient1'],
      priority: MessagePriority.HIGH,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    const { messageId } = await messageCBL.createMessage(
      content,
      creator,
      options,
    );
    const routingResult = await router.routeMessage(
      messageId,
      options.recipients,
    );

    expect(routingResult.strategy).toBe('DIRECT');
    expect(routingResult.successfulRecipients).toContain('recipient1');
  });

  it('should retrieve message content correctly', async () => {
    const originalContent = new Uint8Array([10, 20, 30, 40, 50]);
    const options = {
      messageType: 'test',
      senderId: 'sender1',
      recipients: ['recipient1'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    const { messageId } = await messageCBL.createMessage(
      originalContent,
      creator,
      options,
    );
    const retrievedContent = await messageCBL.getMessageContent(messageId);

    expect(retrievedContent).toEqual(originalContent);
  });

  it('should query messages by recipient', async () => {
    // Use different content for each message to avoid checksum collisions
    const content1 = new Uint8Array([1, 2, 3]);
    const content2 = new Uint8Array([4, 5, 6]);

    // Create multiple messages
    const msg1 = await messageCBL.createMessage(content1, creator, {
      messageType: 'test',
      senderId: 'sender1',
      recipients: ['recipient1'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    });

    const msg2 = await messageCBL.createMessage(content2, creator, {
      messageType: 'test',
      senderId: 'sender2',
      recipients: ['recipient1', 'recipient2'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    });

    // Query messages for recipient1
    const messages = await metadataStore.queryMessages({
      recipientId: 'recipient1',
      page: 0,
      pageSize: 10,
    });

    expect(messages.length).toBe(2);
    expect([msg1.messageId, msg2.messageId]).toContain(messages[0].blockId);
    expect([msg1.messageId, msg2.messageId]).toContain(messages[1].blockId);
  });

  it('should handle message forwarding', async () => {
    const content = new Uint8Array([1, 2, 3]);
    const options = {
      messageType: 'forward',
      senderId: 'sender1',
      recipients: ['recipient1'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    const { messageId } = await messageCBL.createMessage(
      content,
      creator,
      options,
    );

    // Forward message through intermediate node
    const forwardResult = await router.forwardMessage(
      messageId,
      options.recipients,
      ['intermediate-node'],
    );

    expect(forwardResult.successfulRecipients).toContain('recipient1');
  });

  it('should handle large messages across multiple blocks', async () => {
    const largeContent = new Uint8Array(5000); // Larger than single block
    for (let i = 0; i < largeContent.length; i++) {
      largeContent[i] = i % 256;
    }

    const options = {
      messageType: 'large',
      senderId: 'sender1',
      recipients: ['recipient1'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    };

    const { messageId, contentBlockIds } = await messageCBL.createMessage(
      largeContent,
      creator,
      options,
    );
    expect(contentBlockIds.length).toBeGreaterThan(1);

    const retrievedContent = await messageCBL.getMessageContent(messageId);
    expect(retrievedContent).toEqual(largeContent);
  });
});
