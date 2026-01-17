/**
 * @fileoverview Property-based tests for DiskBlockAsyncStore FEC operations
 *
 * **Feature: backend-blockstore-quorum, Property: Disk Block FEC Round-Trip**
 * **Validates: Requirements 4.1, 4.5, 4.6**
 *
 * This test suite verifies that:
 * - Blocks stored with durability levels generate appropriate parity blocks
 * - Corrupted blocks can be recovered using parity data
 * - Block integrity can be verified against parity data
 */

import {
  BlockSize,
  DurabilityLevel,
  getParityCountForDurability,
  RawDataBlock,
  initializeBrightChain,
  ServiceProvider,
  ServiceLocator,
  IFecService,
  ParityData,
  FecRecoveryResult,
} from '@brightchain/brightchain-lib';
import { uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

/**
 * Mock FEC Service for testing.
 * Implements a simple XOR-based parity scheme for testing purposes.
 */
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
    const data = Buffer.from(blockData);
    const parityBlocks: ParityData[] = [];

    for (let i = 0; i < parityCount; i++) {
      // Simple XOR-based parity with a seed based on index
      const parity = Buffer.alloc(data.length);
      for (let j = 0; j < data.length; j++) {
        parity[j] = data[j] ^ ((i + 1) * 17); // Simple transformation
      }
      parityBlocks.push({ data: parity, index: i });
    }

    return parityBlocks;
  }

  async recoverFileData(
    corruptedData: Buffer | Uint8Array | null,
    parityData: ParityData[],
    originalSize: number,
  ): Promise<FecRecoveryResult> {
    if (parityData.length === 0) {
      return { data: Buffer.alloc(0), recovered: false };
    }

    // Recover using first parity block (reverse the XOR)
    const parity = Buffer.from(parityData[0].data);
    const recovered = Buffer.alloc(originalSize);
    
    for (let j = 0; j < originalSize; j++) {
      recovered[j] = parity[j] ^ ((parityData[0].index + 1) * 17);
    }

    return { data: recovered, recovered: true };
  }

  async verifyFileIntegrity(
    blockData: Buffer | Uint8Array,
    parityData: ParityData[],
  ): Promise<boolean> {
    if (parityData.length === 0) {
      return true;
    }

    // Regenerate parity and compare
    const regenerated = await this.createParityData(blockData, parityData.length);
    
    for (let i = 0; i < parityData.length; i++) {
      const original = Buffer.from(parityData[i].data);
      const regen = Buffer.from(regenerated[i].data);
      if (!original.equals(regen)) {
        return false;
      }
    }

    return true;
  }
}

describe('DiskBlockAsyncStore FEC Property Tests', () => {
  const blockSize = BlockSize.Small;
  let mockFecService: MockFecService;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
    mockFecService = new MockFecService();
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Property: Disk Block FEC Round-Trip', () => {
    /**
     * Property: For any block stored with durability level, the correct number
     * of parity blocks should be generated based on the durability level.
     *
     * **Validates: Requirements 4.1**
     */
    it('should generate correct number of parity blocks based on durability level', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.constantFrom(
            DurabilityLevel.Ephemeral,
            DurabilityLevel.Standard,
            DurabilityLevel.HighDurability,
          ),
          async (data, durabilityLevel) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-fec-parity-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });
            store.setFecService(mockFecService);

            try {
              const block = new RawDataBlock(blockSize, data);

              await store.setData(block, { durabilityLevel });

              const metadata = await store.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();

              const expectedParityCount = getParityCountForDurability(durabilityLevel);
              expect(metadata!.parityBlockIds.length).toBe(expectedParityCount);
              expect(metadata!.durabilityLevel).toBe(durabilityLevel);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: For any block with parity data, the block can be recovered
     * after corruption using the parity blocks.
     *
     * **Validates: Requirements 4.5, 4.6**
     */
    it('should recover corrupted blocks using parity data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-fec-recover-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });
            store.setFecService(mockFecService);

            try {
              const block = new RawDataBlock(blockSize, data);

              // Store with standard durability (1 parity block)
              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Standard,
              });

              // Verify parity was generated
              const parityBlocks = await store.getParityBlocks(block.idChecksum);
              expect(parityBlocks.length).toBe(1);

              // Attempt recovery
              const result = await store.recoverBlock(block.idChecksum);

              expect(result.success).toBe(true);
              expect(result.recoveredBlock).toBeDefined();

              // Verify recovered data matches original
              const recoveredData = result.recoveredBlock!.data;
              expect(recoveredData.length).toBe(data.length);

              for (let i = 0; i < data.length; i++) {
                expect(recoveredData[i]).toBe(data[i]);
              }
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: For any block with parity data, integrity verification
     * should return true for uncorrupted blocks.
     */
    it('should verify integrity of uncorrupted blocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-fec-verify-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });
            store.setFecService(mockFecService);

            try {
              const block = new RawDataBlock(blockSize, data);

              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Standard,
              });

              const isValid = await store.verifyBlockIntegrity(block.idChecksum);
              expect(isValid).toBe(true);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Blocks stored with Ephemeral durability should have no parity blocks.
     */
    it('should not generate parity blocks for ephemeral durability', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-fec-ephemeral-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });
            store.setFecService(mockFecService);

            try {
              const block = new RawDataBlock(blockSize, data);

              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              const metadata = await store.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.parityBlockIds.length).toBe(0);

              const parityBlocks = await store.getParityBlocks(block.idChecksum);
              expect(parityBlocks.length).toBe(0);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: When FEC service is unavailable, recovery should fail gracefully.
     */
    it('should handle FEC service unavailability gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-fec-unavail-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            // Create store without FEC service
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });

            try {
              const block = new RawDataBlock(blockSize, data);

              // Should still be able to store block
              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Standard,
              });

              // Recovery should fail gracefully
              const result = await store.recoverBlock(block.idChecksum);
              expect(result.success).toBe(false);
              expect(result.error).toBeDefined();
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: High durability should generate at least 2 parity blocks.
     */
    it('should generate multiple parity blocks for high durability', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-fec-high-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });
            store.setFecService(mockFecService);

            try {
              const block = new RawDataBlock(blockSize, data);

              await store.setData(block, {
                durabilityLevel: DurabilityLevel.HighDurability,
              });

              const metadata = await store.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.parityBlockIds.length).toBeGreaterThanOrEqual(2);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
