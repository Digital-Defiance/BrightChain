/**
 * Feature: cloud-block-store-drivers, Property 7: CBL whitening round-trip
 *
 * For any valid CBL data (Uint8Array of valid block size), calling
 * storeCBLWithWhitening(cblData) and then retrieveCBL(blockId1, blockId2)
 * using the returned block IDs should produce data byte-identical to the
 * original cblData.
 *
 * **Validates: Requirements 7.1–7.7**
 */
import {
  BlockSize,
  Checksum,
  ICloudBlockStoreConfig,
  initializeBrightChain,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { beforeAll, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { MockCloudBlockStore } from './__tests__/helpers/mockCloudBlockStore';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const testBlockSizes: BlockSize[] = [
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
  BlockSize.Small, // 4096 bytes
];

const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  ...testBlockSizes,
);

/**
 * Generate arbitrary CBL data that fits within a block after padding.
 * Padding adds a 4-byte length prefix, so max data = blockSize - 4.
 */
function arbCblDataForBlockSize(
  blockSize: BlockSize,
): fc.Arbitrary<Uint8Array> {
  // Length prefix is 4 bytes; keep data small enough to fit in one block
  const maxDataLen = blockSize - 4;
  return fc.uint8Array({ minLength: 1, maxLength: maxDataLen });
}

function createStore(blockSize: BlockSize): MockCloudBlockStore {
  const config: ICloudBlockStoreConfig = {
    region: 'test-region',
    containerOrBucketName: 'test-bucket',
    supportedBlockSizes: [blockSize],
  };
  return new MockCloudBlockStore(config);
}

// ---------------------------------------------------------------------------
// Property 7: CBL whitening round-trip
// ---------------------------------------------------------------------------

describe('Property 7: CBL whitening round-trip', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  it('storeCBLWithWhitening followed by retrieveCBL returns byte-identical data', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSize.chain((bs) =>
          arbCblDataForBlockSize(bs).map(
            (data) => [bs, data] as [BlockSize, Uint8Array],
          ),
        ),
        async ([blockSize, cblData]) => {
          const store = createStore(blockSize);

          // Store CBL with whitening
          const result = await store.storeCBLWithWhitening(cblData);

          expect(result.blockId1).toBeDefined();
          expect(result.blockId2).toBeDefined();
          expect(result.blockSize).toBe(blockSize);
          expect(result.magnetUrl).toContain('magnet:?');

          // Retrieve CBL using the returned block IDs
          const reconstructed = await store.retrieveCBL(
            result.blockId1,
            result.blockId2,
          );

          // Reconstructed data must be byte-identical to the original
          expect(reconstructed.length).toBe(cblData.length);
          expect(Buffer.from(reconstructed)).toEqual(Buffer.from(cblData));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('both XOR component blocks exist in the store after whitening', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSize.chain((bs) =>
          arbCblDataForBlockSize(bs).map(
            (data) => [bs, data] as [BlockSize, Uint8Array],
          ),
        ),
        async ([blockSize, cblData]) => {
          const store = createStore(blockSize);

          const result = await store.storeCBLWithWhitening(cblData);

          // Both blocks must exist
          expect(await store.has(result.blockId1)).toBe(true);
          expect(await store.has(result.blockId2)).toBe(true);

          // Both blocks must be retrievable individually
          const block1 = await store.getData(Checksum.fromHex(result.blockId1));
          const block2 = await store.getData(Checksum.fromHex(result.blockId2));

          expect(block1).toBeInstanceOf(RawDataBlock);
          expect(block2).toBeInstanceOf(RawDataBlock);
          expect(block1.data.length).toBeGreaterThan(0);
          expect(block2.data.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('magnet URL round-trips through parse and generate', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSize.chain((bs) =>
          arbCblDataForBlockSize(bs).map(
            (data) => [bs, data] as [BlockSize, Uint8Array],
          ),
        ),
        async ([blockSize, cblData]) => {
          const store = createStore(blockSize);

          const result = await store.storeCBLWithWhitening(cblData);

          // Parse the magnet URL
          const parsed = store.parseCBLMagnetUrl(result.magnetUrl);

          expect(parsed.blockId1).toBe(result.blockId1);
          expect(parsed.blockId2).toBe(result.blockId2);
          expect(parsed.blockSize).toBe(blockSize);

          // Use parsed components to retrieve CBL
          const reconstructed = await store.retrieveCBL(
            parsed.blockId1,
            parsed.blockId2,
          );

          expect(Buffer.from(reconstructed)).toEqual(Buffer.from(cblData));
        },
      ),
      { numRuns: 50 },
    );
  });

  it('rejects empty CBL data', async () => {
    const store = createStore(BlockSize.Message);

    await expect(
      store.storeCBLWithWhitening(new Uint8Array(0)),
    ).rejects.toThrow();
  });

  it('retrieveCBL throws for non-existent block IDs', async () => {
    const store = createStore(BlockSize.Message);

    const fakeId = '0'.repeat(128);
    await expect(store.retrieveCBL(fakeId, fakeId)).rejects.toThrow();
  });
});
