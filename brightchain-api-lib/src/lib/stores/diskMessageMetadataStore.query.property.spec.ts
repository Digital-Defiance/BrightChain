import {
  BlockSize,
  DurabilityLevel,
  IMessageMetadata,
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

describe('DiskMessageMetadataStore - Query Performance Property Tests', () => {
  let tempDir: string;
  let store: DiskMessageMetadataStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'disk-message-query-'));
    store = new DiskMessageMetadataStore(tempDir, BlockSize.Small);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const createMessageMetadata = (
    blockId: string,
    senderId: string,
    recipients: string[],
    messageType: string,
    priority: MessagePriority,
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
    messageType,
    senderId,
    recipients,
    priority,
    deliveryStatus: new Map(),
    acknowledgments: new Map(),
    encryptionScheme: MessageEncryptionScheme.NONE,
    isCBL: false,
  });

  it('Property 32a: Query by recipient scales linearly (50 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 50 }),
        arbHexString(40, 40),
        async (messageCount, targetRecipient) => {
          const iterTempDir = mkdtempSync(join(tmpdir(), 'disk-msg-query-'));
          const iterStore = new DiskMessageMetadataStore(
            iterTempDir,
            BlockSize.Small,
          );

          try {
            const startStore = Date.now();
            for (let i = 0; i < messageCount; i++) {
              const metadata = createMessageMetadata(
                `block${i}${Date.now()}`.padEnd(64, '0').substring(0, 64),
                `sender${i}`.padEnd(40, '0'),
                [targetRecipient],
                'test',
                MessagePriority.NORMAL,
              );
              await iterStore.storeMessageMetadata(metadata);
            }
            const storeTime = Date.now() - startStore;

            const startQuery = Date.now();
            const results =
              await iterStore.getMessagesByRecipient(targetRecipient);
            const queryTime = Date.now() - startQuery;

            expect(results.length).toBe(messageCount);
            // Allow generous overhead for filesystem operations which vary by system load
            expect(queryTime).toBeLessThan(Math.max(storeTime * 10, 500));
          } finally {
            rmSync(iterTempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 32b: Query by sender scales linearly (50 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 50 }),
        arbHexString(40, 40),
        async (messageCount, targetSender) => {
          const iterTempDir = mkdtempSync(join(tmpdir(), 'disk-msg-sender-q-'));
          const iterStore = new DiskMessageMetadataStore(
            iterTempDir,
            BlockSize.Small,
          );

          try {
            const startStore = Date.now();
            for (let i = 0; i < messageCount; i++) {
              const metadata = createMessageMetadata(
                `block${i}${Date.now()}`.padEnd(64, '0').substring(0, 64),
                targetSender,
                [`recipient${i}`.padEnd(40, '0')],
                'test',
                MessagePriority.NORMAL,
              );
              await iterStore.storeMessageMetadata(metadata);
            }
            const storeTime = Date.now() - startStore;

            const startQuery = Date.now();
            const results = await iterStore.getMessagesBySender(targetSender);
            const queryTime = Date.now() - startQuery;

            expect(results.length).toBe(messageCount);
            // Allow generous overhead for filesystem operations which vary by system load
            expect(queryTime).toBeLessThan(Math.max(storeTime * 10, 500));
          } finally {
            rmSync(iterTempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property 32c: Query with filters reduces result set (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        arbHexString(40, 40),
        fc.constantFrom('type1', 'type2', 'type3'),
        async (messageCount, targetRecipient, filterType) => {
          const iterTempDir = mkdtempSync(join(tmpdir(), 'disk-msg-filter-'));
          const iterStore = new DiskMessageMetadataStore(
            iterTempDir,
            BlockSize.Small,
          );

          try {
            for (let i = 0; i < messageCount; i++) {
              const metadata = createMessageMetadata(
                `block${i}${Date.now()}`.padEnd(64, '0').substring(0, 64),
                `sender${i}`.padEnd(40, '0'),
                [targetRecipient],
                i % 2 === 0 ? 'type1' : 'type2',
                MessagePriority.NORMAL,
              );
              await iterStore.storeMessageMetadata(metadata);
            }

            const allResults =
              await iterStore.getMessagesByRecipient(targetRecipient);
            const filteredResults = await iterStore.getMessagesByRecipient(
              targetRecipient,
              { messageType: filterType },
            );

            expect(allResults.length).toBe(messageCount);
            expect(filteredResults.length).toBeLessThanOrEqual(
              allResults.length,
            );
            filteredResults.forEach((msg) => {
              expect(msg.messageType).toBe(filterType);
            });
          } finally {
            rmSync(iterTempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 32d: Pagination works correctly (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 30 }),
        arbHexString(40, 40),
        fc.integer({ min: 1, max: 5 }),
        async (messageCount, targetRecipient, pageSize) => {
          for (let i = 0; i < messageCount; i++) {
            const metadata = createMessageMetadata(
              `block${i}`.padEnd(64, '0'),
              `sender${i}`.padEnd(40, '0'),
              [targetRecipient],
              'test',
              MessagePriority.NORMAL,
            );
            await store.storeMessageMetadata(metadata);
          }

          const page0 = await store.getMessagesByRecipient(targetRecipient, {
            limit: pageSize,
            offset: 0,
          });
          const page1 = await store.getMessagesByRecipient(targetRecipient, {
            limit: pageSize,
            offset: pageSize,
          });

          expect(page0.length).toBeLessThanOrEqual(pageSize);
          expect(page1.length).toBeLessThanOrEqual(pageSize);

          if (page0.length > 0 && page1.length > 0) {
            const page0Ids = new Set(page0.map((m) => m.blockId));
            const page1Ids = new Set(page1.map((m) => m.blockId));
            const intersection = [...page0Ids].filter((id) => page1Ids.has(id));
            expect(intersection.length).toBe(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 32e: Query by message type is efficient (50 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10, max: 50 }),
        fc.constantFrom('type1', 'type2', 'type3'),
        async (messageCount, targetType) => {
          for (let i = 0; i < messageCount; i++) {
            const metadata = createMessageMetadata(
              `block${i}`.padEnd(64, '0'),
              `sender${i}`.padEnd(40, '0'),
              [`recipient${i}`.padEnd(40, '0')],
              i % 3 === 0 ? 'type1' : i % 3 === 1 ? 'type2' : 'type3',
              MessagePriority.NORMAL,
            );
            await store.storeMessageMetadata(metadata);
          }

          const startQuery = Date.now();
          const results = await store.queryMessages({
            messageType: targetType,
          });
          const queryTime = Date.now() - startQuery;

          expect(queryTime).toBeLessThan(1000);
          results.forEach((msg) => {
            expect(msg.messageType).toBe(targetType);
          });
        },
      ),
      { numRuns: 50 },
    );
  });
});
