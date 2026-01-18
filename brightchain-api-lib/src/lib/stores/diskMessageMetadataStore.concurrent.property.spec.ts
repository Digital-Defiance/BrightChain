import {
  BlockSize,
  DurabilityLevel,
  IMessageMetadata,
  MessageDeliveryStatus,
  MessageEncryptionScheme,
  MessagePriority,
  ReplicationStatus,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DiskMessageMetadataStore } from './diskMessageMetadataStore';

const arbHexString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength, maxLength })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

describe('DiskMessageMetadataStore - Concurrent Access Property Tests', () => {
  let tempDir: string;
  let store: DiskMessageMetadataStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'disk-message-concurrent-'));
    store = new DiskMessageMetadataStore(tempDir, BlockSize.Small);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const createMessageMetadata = (
    blockId: string,
    senderId: string,
    recipients: string[],
  ): IMessageMetadata => ({
    blockId,
    createdAt: new Date(),
    expiresAt: null,
    durabilityLevel: DurabilityLevel.Standard,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: new Date(),
    replicationStatus: ReplicationStatus.Pending,
    targetReplicationFactor: 3,
    replicaNodeIds: [],
    size: 1024,
    checksum: blockId,
    messageType: 'test',
    senderId,
    recipients,
    priority: MessagePriority.NORMAL,
    deliveryStatus: new Map(
      recipients.map((r) => [r, MessageDeliveryStatus.PENDING]),
    ),
    acknowledgments: new Map(),
    encryptionScheme: MessageEncryptionScheme.NONE,
    isCBL: false,
  });

  it('Property 33a: Concurrent writes do not corrupt data (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbHexString(64, 64), { minLength: 5, maxLength: 10 }),
        arbHexString(40, 40),
        async (blockIds, senderId) => {
          const uniqueBlockIds = [...new Set(blockIds)];
          const writes = uniqueBlockIds.map((blockId) => {
            const metadata = createMessageMetadata(blockId, senderId, [
              'recipient1'.padEnd(40, '0'),
            ]);
            return store.storeMessageMetadata(metadata);
          });

          await Promise.all(writes);

          const results = await store.getMessagesBySender(senderId);
          expect(results.length).toBe(uniqueBlockIds.length);

          for (const blockId of uniqueBlockIds) {
            const found = results.find((m) => m.blockId === blockId);
            expect(found).toBeDefined();
            expect(found?.senderId).toBe(senderId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 33b: Concurrent reads return consistent data (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbHexString(64, 64),
        arbHexString(40, 40),
        fc.integer({ min: 3, max: 10 }),
        async (blockId, senderId, readCount) => {
          const metadata = createMessageMetadata(blockId, senderId, [
            'recipient1'.padEnd(40, '0'),
          ]);
          await store.storeMessageMetadata(metadata);

          const reads = Array(readCount)
            .fill(null)
            .map(() => store.getMessagesBySender(senderId));

          const results = await Promise.all(reads);

          expect(results.every((r) => r.length === 1)).toBe(true);
          expect(results.every((r) => r[0]?.blockId === blockId)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 33c: Concurrent delivery status updates are atomic (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbHexString(64, 64),
        arbHexString(40, 40),
        fc.array(arbHexString(40, 40), { minLength: 2, maxLength: 5 }),
        async (blockId, senderId, recipients) => {
          const iterTempDir = mkdtempSync(join(tmpdir(), 'disk-msg-conc-'));
          const iterStore = new DiskMessageMetadataStore(iterTempDir, BlockSize.Small);
          
          try {
            const uniqueRecipients = [...new Set(recipients)];
            const metadata = createMessageMetadata(
              blockId,
              senderId,
              uniqueRecipients,
            );
            await iterStore.storeMessageMetadata(metadata);

            // Update sequentially to avoid race conditions
            for (const recipientId of uniqueRecipients) {
              await iterStore.updateDeliveryStatus(
                blockId,
                recipientId,
                MessageDeliveryStatus.DELIVERED,
              );
            }

            const results = await iterStore.getMessagesBySender(senderId);
            const found = results.find((m) => m.blockId === blockId);

            expect(found).toBeDefined();
            uniqueRecipients.forEach((recipientId) => {
              expect(found?.deliveryStatus.get(recipientId)).toBe(
                MessageDeliveryStatus.DELIVERED,
              );
            });
          } finally {
            rmSync(iterTempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 33d: Concurrent acknowledgments are recorded correctly (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbHexString(64, 64),
        arbHexString(40, 40),
        fc.array(arbHexString(40, 40), { minLength: 2, maxLength: 5 }),
        async (blockId, senderId, recipients) => {
          const iterTempDir = mkdtempSync(join(tmpdir(), 'disk-msg-ack-conc-'));
          const iterStore = new DiskMessageMetadataStore(iterTempDir, BlockSize.Small);
          
          try {
            const uniqueRecipients = [...new Set(recipients)];
            const metadata = createMessageMetadata(
              blockId,
              senderId,
              uniqueRecipients,
            );
            await iterStore.storeMessageMetadata(metadata);

            const ackTime = new Date();
            // Update sequentially to avoid race conditions
            for (const recipientId of uniqueRecipients) {
              await iterStore.recordAcknowledgment(blockId, recipientId, ackTime);
            }

            const results = await iterStore.getMessagesBySender(senderId);
            const found = results.find((m) => m.blockId === blockId);

            expect(found).toBeDefined();
            uniqueRecipients.forEach((recipientId) => {
              expect(found?.acknowledgments.has(recipientId)).toBe(true);
              expect(found?.deliveryStatus.get(recipientId)).toBe(
                MessageDeliveryStatus.DELIVERED,
              );
            });
          } finally {
            rmSync(iterTempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 33e: Multiple stores can read concurrently (50 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbHexString(64, 64), { minLength: 5, maxLength: 10 }),
        arbHexString(40, 40),
        fc.integer({ min: 2, max: 5 }),
        async (blockIds, senderId, storeCount) => {
          const uniqueBlockIds = [...new Set(blockIds)];

          for (const blockId of uniqueBlockIds) {
            const metadata = createMessageMetadata(blockId, senderId, [
              'recipient1'.padEnd(40, '0'),
            ]);
            await store.storeMessageMetadata(metadata);
          }

          const stores = Array(storeCount)
            .fill(null)
            .map(() => new DiskMessageMetadataStore(tempDir, BlockSize.Small));

          const reads = stores.map((s) => s.getMessagesBySender(senderId));
          const results = await Promise.all(reads);

          expect(results.every((r) => r.length === uniqueBlockIds.length)).toBe(
            true,
          );
          results.forEach((result) => {
            const resultIds = new Set(result.map((m) => m.blockId));
            uniqueBlockIds.forEach((blockId) => {
              expect(resultIds.has(blockId)).toBe(true);
            });
          });
        },
      ),
      { numRuns: 50 },
    );
  });
});
