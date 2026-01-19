/**
 * @fileoverview Property-based tests for MemoryBlockStore XOR Brightening operations
 *
 * **Feature: backend-blockstore-quorum, Property 5: XOR Brightening Correctness**
 * **Validates: Requirements 6.1, 6.2, 6.3**
 *
 * This test suite verifies that:
 * - Brightening XORs the source block with the specified number of random blocks
 * - The result block equals the XOR of source with all random blocks
 * - The correct list of random block IDs is returned
 * - Insufficient random blocks throws an appropriate error
 */

import fc from 'fast-check';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import { DurabilityLevel } from '../enumerations/durabilityLevel';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { initializeBrightChain } from '../init';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { Checksum } from '../types/checksum';
import { MemoryBlockStore } from './memoryBlockStore';

describe('MemoryBlockStore XOR Brightening Property Tests', () => {
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

  describe('Property 5: XOR Brightening Correctness', () => {
    /**
     * Property: For any source block and N random blocks, the brightening operation
     * SHALL produce a result block that equals the XOR of the source block with all
     * N random blocks.
     *
     * **Validates: Requirements 6.1, 6.2**
     */
    it('should produce correct XOR result of source with random blocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 3 }),
          async (sourceData, randomBlockCount) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              // Create and store the source block
              const sourceBlock = new RawDataBlock(blockSize, sourceData);
              await testStore.setData(sourceBlock, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              // Create and store random blocks with unique data
              const randomBlocks: RawDataBlock[] = [];
              const usedChecksums = new Set<string>();
              usedChecksums.add(sourceBlock.idChecksum.toHex());

              for (let i = 0; i < randomBlockCount; i++) {
                let randomBlock: RawDataBlock;
                let attempts = 0;
                const maxAttempts = 10;

                // Keep generating until we get a unique block or hit max attempts
                do {
                  // Generate random data for each random block with a unique seed
                  const randomData = new Uint8Array(sourceData.length);
                  for (let j = 0; j < randomData.length; j++) {
                    randomData[j] = Math.floor(Math.random() * 256);
                  }
                  // Add attempt number to ensure uniqueness
                  if (randomData.length > 0) {
                    randomData[0] = (randomData[0] + attempts) % 256;
                  }
                  randomBlock = new RawDataBlock(blockSize, randomData);
                  attempts++;
                } while (
                  usedChecksums.has(randomBlock.idChecksum.toHex()) &&
                  attempts < maxAttempts
                );

                if (attempts >= maxAttempts) {
                  // Skip this test run if we can't generate unique blocks
                  return;
                }

                usedChecksums.add(randomBlock.idChecksum.toHex());
                await testStore.setData(randomBlock, {
                  durabilityLevel: DurabilityLevel.Ephemeral,
                });
                randomBlocks.push(randomBlock);
              }

              // Perform brightening
              const result = await testStore.brightenBlock(
                sourceBlock.idChecksum,
                randomBlockCount,
              );

              // Verify the result contains the correct number of random block IDs
              expect(result.randomBlockIds.length).toBe(randomBlockCount);

              // Verify the original block ID is correct
              expect(result.originalBlockId).toBeDefined();

              // Verify the brightened block was stored
              const brightenedBlockExists = await testStore.has(
                result.brightenedBlockId,
              );
              expect(brightenedBlockExists).toBe(true);

              // Get the brightened block data
              const brightenedBlock = await testStore.getData(
                Checksum.fromHex(result.brightenedBlockId),
              );

              // Manually compute expected XOR result
              const expectedXor = new Uint8Array(sourceData.length);
              for (let i = 0; i < sourceData.length; i++) {
                expectedXor[i] = sourceData[i];
              }

              // XOR with each random block that was used
              for (const randomBlockId of result.randomBlockIds) {
                const randomBlock = await testStore.getData(
                  Checksum.fromHex(randomBlockId),
                );
                for (let i = 0; i < expectedXor.length; i++) {
                  expectedXor[i] ^=
                    randomBlock.data[i % randomBlock.data.length];
                }
              }

              // Verify the brightened block data matches expected XOR
              for (let i = 0; i < expectedXor.length; i++) {
                expect(brightenedBlock.data[i]).toBe(expectedXor[i]);
              }
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: The brightening operation SHALL return the correct list of
     * random block IDs used in the XOR operation.
     *
     * **Validates: Requirements 6.2, 6.3**
     */
    it('should return correct random block IDs used in brightening', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 3 }),
          async (sourceData, randomBlockCount) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              // Create and store the source block
              const sourceBlock = new RawDataBlock(blockSize, sourceData);
              await testStore.setData(sourceBlock, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              // Create and store random blocks with unique data
              const storedRandomBlockIds: string[] = [];
              const usedChecksums = new Set<string>();
              usedChecksums.add(sourceBlock.idChecksum.toHex());

              for (let i = 0; i < randomBlockCount; i++) {
                let randomBlock: RawDataBlock;
                let attempts = 0;
                const maxAttempts = 10;

                // Keep generating until we get a unique block or hit max attempts
                do {
                  const randomData = new Uint8Array(sourceData.length);
                  for (let j = 0; j < randomData.length; j++) {
                    randomData[j] = Math.floor(Math.random() * 256);
                  }
                  // Add attempt number and index to ensure uniqueness
                  if (randomData.length > 0) {
                    randomData[0] = (randomData[0] + attempts + i) % 256;
                  }
                  randomBlock = new RawDataBlock(blockSize, randomData);
                  attempts++;
                } while (
                  usedChecksums.has(randomBlock.idChecksum.toHex()) &&
                  attempts < maxAttempts
                );

                if (attempts >= maxAttempts) {
                  // Skip this test run if we can't generate unique blocks
                  return;
                }

                const hexId = randomBlock.idChecksum.toHex();
                usedChecksums.add(hexId);
                await testStore.setData(randomBlock, {
                  durabilityLevel: DurabilityLevel.Ephemeral,
                });
                storedRandomBlockIds.push(hexId);
              }

              // Perform brightening
              const result = await testStore.brightenBlock(
                sourceBlock.idChecksum,
                randomBlockCount,
              );

              // Verify all returned random block IDs exist in the store
              for (const randomBlockId of result.randomBlockIds) {
                const exists = await testStore.has(randomBlockId);
                expect(exists).toBe(true);
              }

              // Verify the count matches
              expect(result.randomBlockIds.length).toBe(randomBlockCount);
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: If insufficient random blocks are available, the brightening
     * operation SHALL return an error indicating the shortage.
     *
     * **Validates: Requirements 6.4**
     */
    it('should throw error when insufficient random blocks available', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 5, max: 10 }),
          async (sourceData, requestedRandomBlocks) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              // Create and store only the source block (no random blocks)
              const sourceBlock = new RawDataBlock(blockSize, sourceData);
              await testStore.setData(sourceBlock, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              // Attempt brightening with more random blocks than available
              // The store only has 1 block (the source), so requesting more should fail
              await expect(
                testStore.brightenBlock(
                  sourceBlock.idChecksum,
                  requestedRandomBlocks,
                ),
              ).rejects.toThrow(StoreError);

              try {
                await testStore.brightenBlock(
                  sourceBlock.idChecksum,
                  requestedRandomBlocks,
                );
              } catch (error) {
                expect(error).toBeInstanceOf(StoreError);
                expect((error as StoreError).type).toBe(
                  StoreErrorType.InsufficientRandomBlocks,
                );
              }
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property: Brightening should fail gracefully when source block doesn't exist.
     */
    it('should throw error when source block does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 64, maxLength: 64 }).map((s) => {
            // Generate a valid hex string
            return Array.from(s)
              .map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
              .join('')
              .slice(0, 64);
          }),
          async (fakeBlockId: string) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              // Attempt brightening with non-existent source block
              await expect(
                testStore.brightenBlock(fakeBlockId, 1),
              ).rejects.toThrow(StoreError);

              try {
                await testStore.brightenBlock(fakeBlockId, 1);
              } catch (error) {
                expect(error).toBeInstanceOf(StoreError);
                expect((error as StoreError).type).toBe(
                  StoreErrorType.KeyNotFound,
                );
              }
            } finally {
              testStore.clear();
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    /**
     * Property: XOR brightening is reversible - XORing the brightened block
     * with the same random blocks should recover the original data.
     *
     * **Validates: Requirements 6.1**
     */
    it('should be reversible - XORing brightened block with random blocks recovers original', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 2 }),
          async (sourceData, randomBlockCount) => {
            const testStore = new MemoryBlockStore(blockSize);

            try {
              // Create and store the source block
              const sourceBlock = new RawDataBlock(blockSize, sourceData);
              await testStore.setData(sourceBlock, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              // Create and store random blocks with unique data
              const usedChecksums = new Set<string>();
              usedChecksums.add(sourceBlock.idChecksum.toHex());

              for (let i = 0; i < randomBlockCount; i++) {
                let randomBlock: RawDataBlock;
                let attempts = 0;
                const maxAttempts = 10;

                // Keep generating until we get a unique block or hit max attempts
                do {
                  const randomData = new Uint8Array(sourceData.length);
                  for (let j = 0; j < randomData.length; j++) {
                    randomData[j] = Math.floor(Math.random() * 256);
                  }
                  // Add attempt number and index to ensure uniqueness
                  if (randomData.length > 0) {
                    randomData[0] = (randomData[0] + attempts + i * 10) % 256;
                  }
                  randomBlock = new RawDataBlock(blockSize, randomData);
                  attempts++;
                } while (
                  usedChecksums.has(randomBlock.idChecksum.toHex()) &&
                  attempts < maxAttempts
                );

                if (attempts >= maxAttempts) {
                  // Skip this test run if we can't generate unique blocks
                  return;
                }

                usedChecksums.add(randomBlock.idChecksum.toHex());
                await testStore.setData(randomBlock, {
                  durabilityLevel: DurabilityLevel.Ephemeral,
                });
              }

              // Perform brightening
              const result = await testStore.brightenBlock(
                sourceBlock.idChecksum,
                randomBlockCount,
              );

              // Get the brightened block
              const brightenedBlock = await testStore.getData(
                Checksum.fromHex(result.brightenedBlockId),
              );

              // Reverse the XOR operation manually
              const recovered = new Uint8Array(sourceData.length);
              for (let i = 0; i < sourceData.length; i++) {
                recovered[i] = brightenedBlock.data[i];
              }

              // XOR with each random block to recover original
              for (const randomBlockId of result.randomBlockIds) {
                const randomBlock = await testStore.getData(
                  Checksum.fromHex(randomBlockId),
                );
                for (let i = 0; i < recovered.length; i++) {
                  recovered[i] ^= randomBlock.data[i % randomBlock.data.length];
                }
              }

              // Verify recovered data matches original
              for (let i = 0; i < sourceData.length; i++) {
                expect(recovered[i]).toBe(sourceData[i]);
              }
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
