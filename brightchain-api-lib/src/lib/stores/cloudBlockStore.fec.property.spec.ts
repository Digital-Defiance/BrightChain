/**
 * Feature: cloud-block-store-drivers, Properties 5 & 6: FEC operations
 *
 * Property 5: FEC parity generate/recover round-trip
 *   For any stored block with parity count >= 1, calling generateParityBlocks
 *   and then recoverBlock should produce a RecoveryResult with success: true
 *   and recoveredBlock.data identical to the original block data.
 *
 * Property 6: Block integrity verification invariant
 *   For any stored block with generated parity blocks, verifyBlockIntegrity
 *   should return true when the block data has not been modified since storage.
 *
 * **Validates: Requirements 6.1–6.4, 6.7, 6.8, 2.8, 3.8**
 */
import {
  BlockSize,
  Checksum,
  DurabilityLevel,
  FecRecoveryResult,
  ICloudBlockStoreConfig,
  IFecService,
  initializeBrightChain,
  ParityData,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { MockCloudBlockStore } from './__tests__/helpers/mockCloudBlockStore';

// ---------------------------------------------------------------------------
// Mock FEC Service — simple XOR-based parity for deterministic testing
// ---------------------------------------------------------------------------

class MockFecService implements IFecService {
  private available = true;

  setAvailable(available: boolean): void {
    this.available = available;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async createParityData(
    blockData: Buffer | Uint8Array,
    parityCount: number,
  ): Promise<ParityData[]> {
    const data = new Uint8Array(blockData);
    const parityBlocks: ParityData[] = [];
    for (let i = 0; i < parityCount; i++) {
      const parity = new Uint8Array(data.length);
      for (let j = 0; j < data.length; j++) {
        parity[j] = data[j] ^ ((i + 1) * 17);
      }
      parityBlocks.push({ data: parity, index: i });
    }
    return parityBlocks;
  }

  async recoverFileData(
    _corruptedData: Buffer | Uint8Array | null,
    parityData: ParityData[],
    originalSize: number,
  ): Promise<FecRecoveryResult> {
    if (parityData.length === 0) {
      return { data: new Uint8Array(0), recovered: false };
    }
    const parity = new Uint8Array(parityData[0].data);
    const recovered = new Uint8Array(originalSize);
    for (let j = 0; j < originalSize; j++) {
      recovered[j] = parity[j] ^ ((parityData[0].index + 1) * 17);
    }
    return { data: recovered, recovered: true };
  }

  async verifyFileIntegrity(
    blockData: Buffer | Uint8Array,
    parityData: ParityData[],
  ): Promise<boolean> {
    if (parityData.length === 0) return true;
    const regenerated = await this.createParityData(
      blockData,
      parityData.length,
    );
    for (let i = 0; i < parityData.length; i++) {
      const original = new Uint8Array(parityData[i].data);
      const regen = new Uint8Array(regenerated[i].data);
      if (original.length !== regen.length) return false;
      for (let j = 0; j < original.length; j++) {
        if (original[j] !== regen[j]) return false;
      }
    }
    return true;
  }
}

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

const arbBlockSizeAndData: fc.Arbitrary<[BlockSize, Uint8Array]> =
  arbBlockSize.chain((blockSize) =>
    fc
      .uint8Array({ minLength: blockSize, maxLength: blockSize })
      .map((data) => [blockSize, data] as [BlockSize, Uint8Array]),
  );

const arbParityCount: fc.Arbitrary<number> = fc.integer({ min: 1, max: 3 });

function createStore(blockSize: BlockSize): MockCloudBlockStore {
  const config: ICloudBlockStoreConfig = {
    region: 'test-region',
    containerOrBucketName: 'test-bucket',
    supportedBlockSizes: [blockSize],
  };
  return new MockCloudBlockStore(config);
}

// ---------------------------------------------------------------------------
// Property 5: FEC parity generate/recover round-trip
// ---------------------------------------------------------------------------

describe('Property 5: FEC parity generate/recover round-trip', () => {
  let mockFecService: MockFecService;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    mockFecService = new MockFecService();
  });

  it('generateParityBlocks followed by recoverBlock returns data identical to the original', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSizeAndData,
        arbParityCount,
        async ([blockSize, data], parityCount) => {
          const store = createStore(blockSize);
          store.setFecService(mockFecService);

          const block = new RawDataBlock(blockSize, data);

          // Store the block (without auto-parity — use Ephemeral durability)
          await store.setData(block, {
            durabilityLevel: DurabilityLevel.Ephemeral,
          });

          // Explicitly generate parity blocks
          const parityIds = await store.generateParityBlocks(
            block.idChecksum,
            parityCount,
          );
          expect(parityIds.length).toBe(parityCount);

          // Recover the block using parity data
          const result = await store.recoverBlock(block.idChecksum);

          expect(result.success).toBe(true);
          expect(result.recoveredBlock).toBeDefined();
          expect(result.recoveredBlock!.data.length).toBe(data.length);

          // Recovered data must be byte-identical to the original
          expect(Buffer.from(result.recoveredBlock!.data)).toEqual(
            Buffer.from(data),
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  it('recoverBlock fails gracefully when no FEC service is set', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);
        // No FEC service set

        const block = new RawDataBlock(blockSize, data);
        await store.setData(block);

        const result = await store.recoverBlock(block.idChecksum);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 30 },
    );
  });

  it('recoverBlock fails gracefully when no parity data exists', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);
        store.setFecService(mockFecService);

        const block = new RawDataBlock(blockSize, data);
        // Store with ephemeral durability — no parity generated
        await store.setData(block, {
          durabilityLevel: DurabilityLevel.Ephemeral,
        });

        const result = await store.recoverBlock(block.idChecksum);
        expect(result.success).toBe(false);
        expect(result.error).toContain('No parity data');
      }),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Block integrity verification invariant
// ---------------------------------------------------------------------------

describe('Property 6: Block integrity verification invariant', () => {
  let mockFecService: MockFecService;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    mockFecService = new MockFecService();
  });

  it('verifyBlockIntegrity returns true for unmodified blocks with parity', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSizeAndData,
        arbParityCount,
        async ([blockSize, data], parityCount) => {
          const store = createStore(blockSize);
          store.setFecService(mockFecService);

          const block = new RawDataBlock(blockSize, data);
          await store.setData(block, {
            durabilityLevel: DurabilityLevel.Ephemeral,
          });

          // Generate parity
          await store.generateParityBlocks(block.idChecksum, parityCount);

          // Verify integrity — block is unmodified, should be true
          const isValid = await store.verifyBlockIntegrity(block.idChecksum);
          expect(isValid).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('verifyBlockIntegrity returns true for blocks without parity (existence check)', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);
        store.setFecService(mockFecService);

        const block = new RawDataBlock(blockSize, data);
        await store.setData(block, {
          durabilityLevel: DurabilityLevel.Ephemeral,
        });

        // No parity generated — verifyBlockIntegrity should still return true
        // (falls back to existence check when no parity data)
        const isValid = await store.verifyBlockIntegrity(block.idChecksum);
        expect(isValid).toBe(true);
      }),
      { numRuns: 30 },
    );
  });

  it('verifyBlockIntegrity returns false for non-existent blocks', async () => {
    const store = createStore(BlockSize.Message);
    store.setFecService(new MockFecService());

    const fakeHex = 'a'.repeat(128);
    const fakeChecksum = Checksum.fromHex(fakeHex);
    const isValid = await store.verifyBlockIntegrity(fakeChecksum);
    expect(isValid).toBe(false);
  });

  it('verifyBlockIntegrity returns false when FEC service is unavailable and block does not exist', async () => {
    const store = createStore(BlockSize.Message);
    // No FEC service — falls back to has() check

    const fakeHex = 'b'.repeat(128);
    const fakeChecksum = Checksum.fromHex(fakeHex);
    const isValid = await store.verifyBlockIntegrity(fakeChecksum);
    expect(isValid).toBe(false);
  });
});
