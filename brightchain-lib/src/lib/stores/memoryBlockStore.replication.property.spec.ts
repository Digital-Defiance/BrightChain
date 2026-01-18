/**
 * @fileoverview Property-based tests for MemoryBlockStore replication tracking
 *
 * **Feature: backend-blockstore-quorum, Property: Replication Status Tracking**
 * **Validates: Requirements 5.1, 5.3, 5.4**
 *
 * This test suite verifies that:
 * - Blocks with replication targets start with Pending status
 * - Recording replications updates status correctly
 * - Recording replica loss updates status correctly
 * - Replication queries return correct blocks
 */

import fc from 'fast-check';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import { ReplicationStatus } from '../enumerations/replicationStatus';
import { initializeBrightChain } from '../init';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { MemoryBlockStore } from './memoryBlockStore';

describe('MemoryBlockStore Replication Property Tests', () => {
  let blockStore: MemoryBlockStore;
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
    blockStore = new MemoryBlockStore(blockSize);
  });

  afterEach(() => {
    blockStore.clear();
    ServiceProvider.resetInstance();
  });

  describe('Property: Replication Status Tracking', () => {
    /**
     * Property: For any block stored with a target replication factor > 0,
     * the block should initially have status "Pending".
     *
     * **Validates: Requirements 5.1**
     */
    it('should start with Pending status for blocks with replication target', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          async (data, targetReplicationFactor) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              const block = new RawDataBlock(blockSize, data);

              await testStore.setData(block, { targetReplicationFactor });

              const metadata = await testStore.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.replicationStatus).toBe(
                ReplicationStatus.Pending,
              );
              expect(metadata!.targetReplicationFactor).toBe(
                targetReplicationFactor,
              );
              expect(metadata!.replicaNodeIds.length).toBe(0);
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: After recording enough replications to meet the target,
     * the status should be "Replicated".
     *
     * **Validates: Requirements 5.3, 5.4**
     */
    it('should update to Replicated status when target is met', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 5 }),
          async (data, targetReplicationFactor) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              const block = new RawDataBlock(blockSize, data);

              await testStore.setData(block, { targetReplicationFactor });

              // Record replications to meet target
              for (let i = 0; i < targetReplicationFactor; i++) {
                await testStore.recordReplication(
                  block.idChecksum,
                  `node-${i}`,
                );
              }

              const metadata = await testStore.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.replicationStatus).toBe(
                ReplicationStatus.Replicated,
              );
              expect(metadata!.replicaNodeIds.length).toBe(
                targetReplicationFactor,
              );
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: After recording replica loss that drops below target,
     * the status should be "UnderReplicated".
     *
     * **Validates: Requirements 5.5**
     */
    it('should update to UnderReplicated status when replicas are lost', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 2, max: 5 }),
          async (data, targetReplicationFactor) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              const block = new RawDataBlock(blockSize, data);

              await testStore.setData(block, { targetReplicationFactor });

              // Record replications to meet target
              for (let i = 0; i < targetReplicationFactor; i++) {
                await testStore.recordReplication(
                  block.idChecksum,
                  `node-${i}`,
                );
              }

              // Verify replicated status
              let metadata = await testStore.getMetadata(block.idChecksum);
              expect(metadata!.replicationStatus).toBe(
                ReplicationStatus.Replicated,
              );

              // Lose one replica
              await testStore.recordReplicaLoss(block.idChecksum, 'node-0');

              metadata = await testStore.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.replicationStatus).toBe(
                ReplicationStatus.UnderReplicated,
              );
              expect(metadata!.replicaNodeIds.length).toBe(
                targetReplicationFactor - 1,
              );
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: getBlocksPendingReplication should return exactly those blocks
     * with Pending status and target > 0.
     *
     * **Validates: Requirements 5.2**
     */
    it('should correctly query blocks pending replication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              data: fc.uint8Array({ minLength: 1, maxLength: 50 }),
              targetReplicationFactor: fc.integer({ min: 0, max: 3 }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          async (blockSpecs) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              const storedBlocks: { block: RawDataBlock; target: number }[] =
                [];

              for (const spec of blockSpecs) {
                const block = new RawDataBlock(blockSize, spec.data);
                await testStore.setData(block, {
                  targetReplicationFactor: spec.targetReplicationFactor,
                });
                storedBlocks.push({
                  block,
                  target: spec.targetReplicationFactor,
                });
              }

              const pendingBlocks =
                await testStore.getBlocksPendingReplication();

              // Count expected pending blocks (those with target > 0)
              const expectedPendingCount = storedBlocks.filter(
                (b) => b.target > 0,
              ).length;

              expect(pendingBlocks.length).toBe(expectedPendingCount);
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: getUnderReplicatedBlocks should return exactly those blocks
     * with UnderReplicated status.
     *
     * **Validates: Requirements 5.6**
     */
    it('should correctly query under-replicated blocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 2, max: 5 }),
          async (data, targetReplicationFactor) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              const block = new RawDataBlock(blockSize, data);

              await testStore.setData(block, { targetReplicationFactor });

              // Initially should not be in under-replicated list
              let underReplicated = await testStore.getUnderReplicatedBlocks();
              expect(underReplicated.length).toBe(0);

              // Meet target
              for (let i = 0; i < targetReplicationFactor; i++) {
                await testStore.recordReplication(
                  block.idChecksum,
                  `node-${i}`,
                );
              }

              // Still should not be under-replicated
              underReplicated = await testStore.getUnderReplicatedBlocks();
              expect(underReplicated.length).toBe(0);

              // Lose a replica
              await testStore.recordReplicaLoss(block.idChecksum, 'node-0');

              // Now should be under-replicated
              underReplicated = await testStore.getUnderReplicatedBlocks();
              expect(underReplicated.length).toBe(1);
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Recording the same node multiple times should not duplicate entries.
     */
    it('should not duplicate replica node entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 5 }),
          async (data, recordCount) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              const block = new RawDataBlock(blockSize, data);

              await testStore.setData(block, { targetReplicationFactor: 3 });

              // Record same node multiple times
              for (let i = 0; i < recordCount; i++) {
                await testStore.recordReplication(
                  block.idChecksum,
                  'same-node',
                );
              }

              const metadata = await testStore.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.replicaNodeIds.length).toBe(1);
              expect(metadata!.replicaNodeIds[0]).toBe('same-node');
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Losing all replicas should return to Pending status.
     */
    it('should return to Pending status when all replicas are lost', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 3 }),
          async (data, targetReplicationFactor) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              const block = new RawDataBlock(blockSize, data);

              await testStore.setData(block, { targetReplicationFactor });

              // Meet target
              for (let i = 0; i < targetReplicationFactor; i++) {
                await testStore.recordReplication(
                  block.idChecksum,
                  `node-${i}`,
                );
              }

              // Lose all replicas
              for (let i = 0; i < targetReplicationFactor; i++) {
                await testStore.recordReplicaLoss(
                  block.idChecksum,
                  `node-${i}`,
                );
              }

              const metadata = await testStore.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.replicationStatus).toBe(
                ReplicationStatus.Pending,
              );
              expect(metadata!.replicaNodeIds.length).toBe(0);
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Blocks with target replication factor of 0 should not appear
     * in pending replication list.
     */
    it('should not include blocks with zero target in pending list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              const block = new RawDataBlock(blockSize, data);

              // Store with no replication target
              await testStore.setData(block, { targetReplicationFactor: 0 });

              const pendingBlocks =
                await testStore.getBlocksPendingReplication();
              expect(pendingBlocks.length).toBe(0);
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
