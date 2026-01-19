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
import { MessageRouter } from './messageRouter';

describe('Message Passing Performance Tests', () => {
  let checksumService: ChecksumService;
  let eciesService: ECIESService;
  let cblService: CBLService;
  let creator: Member;

  beforeAll(async () => {
    checksumService = new ChecksumService();
    eciesService = new ECIESService();
    cblService = new CBLService(checksumService, eciesService);

    // Initialize ServiceProvider
    ServiceProvider.getInstance();

    const memberWithMnemonic = await Member.newMember(
      eciesService,
      MemberType.User,
      'test',
      'test@example.com' as unknown as Parameters<typeof Member.newMember>[3],
    );
    creator = memberWithMnemonic.member;
  });

  it('should handle message throughput (10 messages)', async () => {
    // Fresh stores for this test
    const blockStore = new MemoryBlockStore(BlockSize.Small);
    const metadataStore = new MemoryMessageMetadataStore();
    const messageCBL = new MessageCBLService(
      cblService,
      checksumService,
      blockStore,
      metadataStore,
      { storageRetryAttempts: 3, storageRetryDelayMs: 10 },
    );

    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      const content = new Uint8Array([i, i + 1, i + 2, i + 3, i + 4]);
      await messageCBL.createMessage(content, creator, {
        messageType: `perf-test-${i}`,
        senderId: `sender-${i}`,
        recipients: [`recipient-${i}`],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });
    }

    const duration = Date.now() - startTime;
    const throughput = 10 / (duration / 1000);

    expect(throughput).toBeGreaterThan(1); // At least 1 message/sec
  });

  it('should handle query performance (100 messages)', async () => {
    // Fresh stores for this test
    const blockStore = new MemoryBlockStore(BlockSize.Small);
    const metadataStore = new MemoryMessageMetadataStore();
    const messageCBL = new MessageCBLService(
      cblService,
      checksumService,
      blockStore,
      metadataStore,
      { storageRetryAttempts: 3, storageRetryDelayMs: 10 },
    );

    // Create 100 messages with unique content
    for (let i = 0; i < 100; i++) {
      const content = new Uint8Array([
        i % 256,
        (i + 1) % 256,
        (i + 2) % 256,
        (i + 3) % 256,
      ]);
      await messageCBL.createMessage(content, creator, {
        messageType: `query-test-${i}`,
        senderId: `sender${i % 10}`,
        recipients: [`recipient${i % 5}`],
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });
    }

    // Query performance
    const startTime = Date.now();
    const results = await metadataStore.queryMessages({
      recipientId: 'recipient1',
      page: 0,
      pageSize: 50,
    });
    const duration = Date.now() - startTime;

    expect(results.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(500); // Query should complete in < 500ms
  });

  it('should handle delivery latency', async () => {
    // Fresh stores for this test
    const blockStore = new MemoryBlockStore(BlockSize.Small);
    const metadataStore = new MemoryMessageMetadataStore();
    const messageCBL = new MessageCBLService(
      cblService,
      checksumService,
      blockStore,
      metadataStore,
      { storageRetryAttempts: 3, storageRetryDelayMs: 10 },
    );
    const router = new MessageRouter(metadataStore, 'local-node');

    const content = new Uint8Array([1, 2, 3, 4, 5]);

    const startTime = Date.now();
    const { messageId } = await messageCBL.createMessage(content, creator, {
      messageType: 'latency-test',
      senderId: 'sender1',
      recipients: ['recipient1'],
      priority: MessagePriority.NORMAL,
      encryptionScheme: MessageEncryptionScheme.NONE,
    });

    await router.routeMessage(messageId, ['recipient1']);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500); // End-to-end should be < 500ms
  });

  it('should scale with increasing recipients', async () => {
    // Fresh stores for this test
    const blockStore = new MemoryBlockStore(BlockSize.Small);
    const metadataStore = new MemoryMessageMetadataStore();
    const messageCBL = new MessageCBLService(
      cblService,
      checksumService,
      blockStore,
      metadataStore,
      { storageRetryAttempts: 3, storageRetryDelayMs: 10 },
    );
    const router = new MessageRouter(metadataStore, 'local-node');

    const recipientCounts = [1, 5, 10];
    const durations: number[] = [];

    for (let idx = 0; idx < recipientCounts.length; idx++) {
      const count = recipientCounts[idx];
      const content = new Uint8Array([idx, idx + 1, idx + 2, idx + 3]);
      const recipients = Array.from(
        { length: count },
        (_, i) => `recipient-${idx}-${i}`,
      );

      const startTime = Date.now();
      const { messageId } = await messageCBL.createMessage(content, creator, {
        messageType: `scale-test-${idx}`,
        senderId: `sender-${idx}`,
        recipients,
        priority: MessagePriority.NORMAL,
        encryptionScheme: MessageEncryptionScheme.NONE,
      });

      await router.routeMessage(messageId, recipients);
      durations.push(Date.now() - startTime);
    }

    // Verify linear or sub-linear scaling
    const ratio = durations[2] / durations[0];
    expect(ratio).toBeLessThan(20); // 10x recipients should not take 20x time
  });
});
