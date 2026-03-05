/**
 * Feature: cloud-block-store-drivers, Property 4: Metadata round-trip
 *
 * For any stored block and any valid partial IBlockMetadata update, calling
 * updateMetadata(checksum, updates) followed by getMetadata(checksum) should
 * return metadata that reflects the applied updates while preserving unchanged
 * fields.
 *
 * **Validates: Requirements 2.7, 3.7, 6.5, 6.6**
 */
import {
  BlockSize,
  IBlockMetadata,
  ICloudBlockStoreConfig,
  initializeBrightChain,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { beforeAll, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { MockCloudBlockStore } from './__tests__/helpers/mockCloudBlockStore';

/**
 * Block sizes suitable for property testing.
 */
const testBlockSizes: BlockSize[] = [
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
  BlockSize.Small, // 4096 bytes
];

const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  ...testBlockSizes,
);

const arbBlockSizeAndData: fc.Arbitrary<[BlockSize, Uint8Array]> =
  arbBlockSize.chain((blockSize) =>
    fc
      .uint8Array({ minLength: blockSize, maxLength: blockSize })
      .map((data) => [blockSize, data] as [BlockSize, Uint8Array]),
  );

/**
 * Arbitrary generator for partial metadata updates.
 * Focuses on fields that are safe to update:
 * - accessCount: arbitrary positive integer
 * - targetReplicationFactor: arbitrary positive integer 1-10
 * - replicaNodeIds: arbitrary string array
 *
 * At least one field is always present in the update.
 */
const arbMetadataUpdates: fc.Arbitrary<Partial<IBlockMetadata>> = fc
  .record(
    {
      accessCount: fc.nat({ max: 10000 }),
      targetReplicationFactor: fc.integer({ min: 1, max: 10 }),
      replicaNodeIds: fc.array(
        fc.string({ minLength: 8, maxLength: 16 }),
        { minLength: 0, maxLength: 5 },
      ),
    },
    { requiredKeys: [] },
  )
  .filter(
    (updates) =>
      updates.accessCount !== undefined ||
      updates.targetReplicationFactor !== undefined ||
      updates.replicaNodeIds !== undefined,
  );

function createStore(blockSize: BlockSize): MockCloudBlockStore {
  const config: ICloudBlockStoreConfig = {
    region: 'test-region',
    containerOrBucketName: 'test-bucket',
    blockSize,
  };
  return new MockCloudBlockStore(config);
}

// Feature: cloud-block-store-drivers, Property 4: Metadata round-trip
describe('Property 4: Metadata round-trip', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  it('updateMetadata followed by getMetadata reflects applied updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSizeAndData,
        arbMetadataUpdates,
        async ([blockSize, data], updates) => {
          const store = createStore(blockSize);

          // Store a block to create initial metadata
          const block = new RawDataBlock(blockSize, data);
          await store.setData(block);

          // Capture metadata before update
          const metaBefore = await store.getMetadata(block.idChecksum);
          expect(metaBefore).not.toBeNull();

          // Apply partial metadata update
          await store.updateMetadata(block.idChecksum, updates);

          // Retrieve metadata after update
          const metaAfter = await store.getMetadata(block.idChecksum);
          expect(metaAfter).not.toBeNull();

          // Verify updated fields reflect the applied updates
          if (updates.accessCount !== undefined) {
            expect(metaAfter!.accessCount).toBe(updates.accessCount);
          }
          if (updates.targetReplicationFactor !== undefined) {
            expect(metaAfter!.targetReplicationFactor).toBe(
              updates.targetReplicationFactor,
            );
          }
          if (updates.replicaNodeIds !== undefined) {
            expect(metaAfter!.replicaNodeIds).toEqual(updates.replicaNodeIds);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('updateMetadata preserves unchanged fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSizeAndData,
        arbMetadataUpdates,
        async ([blockSize, data], updates) => {
          const store = createStore(blockSize);

          const block = new RawDataBlock(blockSize, data);
          await store.setData(block);

          const metaBefore = await store.getMetadata(block.idChecksum);
          expect(metaBefore).not.toBeNull();

          await store.updateMetadata(block.idChecksum, updates);

          const metaAfter = await store.getMetadata(block.idChecksum);
          expect(metaAfter).not.toBeNull();

          // Fields NOT in the update should be preserved
          expect(metaAfter!.blockId).toEqual(metaBefore!.blockId);
          expect(metaAfter!.checksum).toBe(metaBefore!.checksum);
          expect(metaAfter!.size).toBe(metaBefore!.size);
          expect(metaAfter!.durabilityLevel).toBe(
            metaBefore!.durabilityLevel,
          );
          expect(metaAfter!.replicationStatus).toBe(
            metaBefore!.replicationStatus,
          );
          expect(metaAfter!.parityBlockIds).toEqual(
            metaBefore!.parityBlockIds,
          );

          // Fields not in the update should also be preserved
          if (updates.accessCount === undefined) {
            expect(metaAfter!.accessCount).toBe(metaBefore!.accessCount);
          }
          if (updates.targetReplicationFactor === undefined) {
            expect(metaAfter!.targetReplicationFactor).toBe(
              metaBefore!.targetReplicationFactor,
            );
          }
          if (updates.replicaNodeIds === undefined) {
            expect(metaAfter!.replicaNodeIds).toEqual(
              metaBefore!.replicaNodeIds,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
