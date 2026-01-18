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

const arbValidDate = fc
  .integer({
    min: new Date('2020-01-01').getTime(),
    max: new Date('2030-12-31').getTime(),
  })
  .map((timestamp) => new Date(timestamp));

describe('DiskMessageMetadataStore - Persistence Property Tests', () => {
  let tempDir: string;
  let store: DiskMessageMetadataStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'disk-message-metadata-'));
    store = new DiskMessageMetadataStore(tempDir, BlockSize.Small);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const messageMetadataArb = fc.record({
    blockId: arbHexString(64, 64),
    createdAt: arbValidDate,
    expiresAt: fc.option(arbValidDate, { nil: null }),
    durabilityLevel: fc.constantFrom(DurabilityLevel.Standard, DurabilityLevel.HighDurability),
    parityBlockIds: fc.array(arbHexString(64, 64)),
    accessCount: fc.nat(),
    lastAccessedAt: arbValidDate,
    replicationStatus: fc.constantFrom(
      ReplicationStatus.Pending,
      ReplicationStatus.Replicated,
      ReplicationStatus.UnderReplicated,
    ),
    targetReplicationFactor: fc.integer({ min: 1, max: 10 }),
    replicaNodeIds: fc.array(arbHexString(40, 40)),
    size: fc.nat(),
    checksum: arbHexString(64, 64),
    messageType: fc.string({ minLength: 1, maxLength: 50 }),
    senderId: arbHexString(40, 40),
    recipients: fc.array(arbHexString(40, 40)),
    priority: fc.constantFrom(
      MessagePriority.LOW,
      MessagePriority.NORMAL,
      MessagePriority.HIGH,
    ),
    encryptionScheme: fc.constantFrom(
      MessageEncryptionScheme.NONE,
      MessageEncryptionScheme.SHARED_KEY,
      MessageEncryptionScheme.RECIPIENT_KEYS,
    ),
    isCBL: fc.boolean(),
  }) as fc.Arbitrary<Omit<IMessageMetadata, 'deliveryStatus' | 'acknowledgments' | 'cblBlockIds'>>;

  it('Property 31a: Metadata persists across store instances (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(messageMetadataArb, async (baseMeta) => {
        const metadata: IMessageMetadata = {
          ...baseMeta,
          deliveryStatus: new Map(),
          acknowledgments: new Map(),
          cblBlockIds: baseMeta.isCBL ? [baseMeta.blockId] : undefined,
        };

        await store.storeMessageMetadata(metadata);

        const newStore = new DiskMessageMetadataStore(tempDir, BlockSize.Small);
        const retrieved = await newStore.queryMessages({
          senderId: metadata.senderId,
        });

        expect(retrieved.length).toBeGreaterThan(0);
        const found = retrieved.find((m) => m.blockId === metadata.blockId);
        expect(found).toBeDefined();
        expect(found?.messageType).toBe(metadata.messageType);
        expect(found?.senderId).toBe(metadata.senderId);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 31b: Delivery status persists across restarts (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        messageMetadataArb,
        fc.array(arbHexString(40, 40), { minLength: 1, maxLength: 5 }),
        async (baseMeta, recipientIds) => {
          const iterTempDir = mkdtempSync(join(tmpdir(), 'disk-msg-persist-'));
          const iterStore = new DiskMessageMetadataStore(iterTempDir, BlockSize.Small);
          
          try {
            const metadata: IMessageMetadata = {
              ...baseMeta,
              recipients: recipientIds,
              deliveryStatus: new Map(
                recipientIds.map((id) => [id, MessageDeliveryStatus.PENDING]),
              ),
              acknowledgments: new Map(),
            };

            await iterStore.storeMessageMetadata(metadata);
            await iterStore.updateDeliveryStatus(
              metadata.blockId,
              recipientIds[0],
              MessageDeliveryStatus.DELIVERED,
            );

            const newStore = new DiskMessageMetadataStore(
              iterTempDir,
              BlockSize.Small,
            );
            const retrieved = await newStore.queryMessages({
              senderId: metadata.senderId,
            });

            const found = retrieved.find((m) => m.blockId === metadata.blockId);
            expect(found?.deliveryStatus.get(recipientIds[0])).toBe(
              MessageDeliveryStatus.DELIVERED,
            );
          } finally {
            rmSync(iterTempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 31c: Acknowledgments persist across restarts (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        messageMetadataArb,
        fc.array(arbHexString(40, 40), { minLength: 1, maxLength: 5 }),
        arbValidDate,
        async (baseMeta, recipientIds, ackTime) => {
          const iterTempDir = mkdtempSync(join(tmpdir(), 'disk-msg-ack-'));
          const iterStore = new DiskMessageMetadataStore(iterTempDir, BlockSize.Small);
          
          try {
            const metadata: IMessageMetadata = {
              ...baseMeta,
              recipients: recipientIds,
              deliveryStatus: new Map(
                recipientIds.map((id) => [id, MessageDeliveryStatus.PENDING]),
              ),
              acknowledgments: new Map(),
            };

            await iterStore.storeMessageMetadata(metadata);
            await iterStore.recordAcknowledgment(
              metadata.blockId,
              recipientIds[0],
              ackTime,
            );

            const newStore = new DiskMessageMetadataStore(
              iterTempDir,
              BlockSize.Small,
            );
            const retrieved = await newStore.queryMessages({
              senderId: metadata.senderId,
            });

            const found = retrieved.find((m) => m.blockId === metadata.blockId);
            expect(found?.acknowledgments.has(recipientIds[0])).toBe(true);
            expect(found?.acknowledgments.get(recipientIds[0])?.getTime()).toBe(
              ackTime.getTime(),
            );
          } finally {
            rmSync(iterTempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 31d: Query by recipient works after restart (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(messageMetadataArb, { minLength: 1, maxLength: 10 }),
        arbHexString(40, 40),
        async (baseMetas, targetRecipient) => {
          for (const baseMeta of baseMetas) {
            const metadata: IMessageMetadata = {
              ...baseMeta,
              recipients: [targetRecipient],
              deliveryStatus: new Map(),
              acknowledgments: new Map(),
            };
            await store.storeMessageMetadata(metadata);
          }

          const newStore = new DiskMessageMetadataStore(
            tempDir,
            BlockSize.Small,
          );
          const retrieved = await newStore.getMessagesByRecipient(
            targetRecipient,
          );

          expect(retrieved.length).toBe(baseMetas.length);
          retrieved.forEach((msg) => {
            expect(msg.recipients).toContain(targetRecipient);
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 31e: Query by sender works after restart (100 iterations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(messageMetadataArb, { minLength: 1, maxLength: 10 }),
        arbHexString(40, 40),
        async (baseMetas, targetSender) => {
          const iterTempDir = mkdtempSync(join(tmpdir(), 'disk-msg-sender-'));
          const iterStore = new DiskMessageMetadataStore(iterTempDir, BlockSize.Small);
          
          try {
            for (const baseMeta of baseMetas) {
              const metadata: IMessageMetadata = {
                ...baseMeta,
                senderId: targetSender,
                deliveryStatus: new Map(),
                acknowledgments: new Map(),
              };
              await iterStore.storeMessageMetadata(metadata);
            }

            const newStore = new DiskMessageMetadataStore(
              iterTempDir,
              BlockSize.Small,
            );
            const retrieved = await newStore.getMessagesBySender(targetSender);

            expect(retrieved.length).toBe(baseMetas.length);
            retrieved.forEach((msg) => {
              expect(msg.senderId).toBe(targetSender);
            });
          } finally {
            rmSync(iterTempDir, { recursive: true, force: true });
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
