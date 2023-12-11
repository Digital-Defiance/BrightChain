/**
 * @fileoverview Property-based tests for pool-scoped whitening on PooledMemoryBlockStore.
 *
 * **Feature: pool-scoped-whitening**
 */

import { CHECKSUM, CrcService, ECIES } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { BLOCK_HEADER, StructuredBlockType, TUPLE } from '../constants';
import { BlockSize } from '../enumerations/blockSize';
import { PoolDeletionError } from '../errors/poolDeletionError';
import { initializeBrightChain, resetInitialization } from '../init';
import { ServiceProvider } from '../services/service.provider';
import { PooledMemoryBlockStore } from './pooledMemoryBlockStore';

// Longer timeout for property tests
jest.setTimeout(30000);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Valid pool ID strings matching /^[a-zA-Z0-9_-]{1,64}$/ */
const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** Two or more distinct valid pool IDs */
const arbDistinctPoolIds = fc
  .uniqueArray(arbPoolId, { minLength: 2, maxLength: 5 })
  .filter((ids) => new Set(ids).size >= 2);

/** Random block data sized to a given block size (capped to small sizes for speed) */
const _arbBlockData = (size: number): fc.Arbitrary<Uint8Array> =>
  fc.uint8Array({ minLength: size, maxLength: size });

/** A small block size suitable for fast property tests */
const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
);

/** Reasonable block count for test scenarios */
const arbBlockCount = fc.integer({ min: 1, max: 10 });

// ---------------------------------------------------------------------------
// Property 1: Pool-scoped random block isolation
// ---------------------------------------------------------------------------

describe('PooledMemoryBlockStore Pool-Scoped Whitening Property Tests', () => {
  describe('Property 1: Pool-scoped random block isolation', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 1: Pool-scoped random block isolation**
     *
     * For any valid PoolId P and any PooledMemoryBlockStore containing blocks
     * in multiple pools, calling `getRandomBlocksFromPool(P, count)` SHALL
     * return only checksums that correspond to blocks stored in pool P.
     * No checksum from any other pool shall appear in the result.
     *
     * **Validates: Requirements 1.1, 1.2, 1.6**
     */
    it('getRandomBlocksFromPool returns only checksums belonging to the requested pool', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIds,
          arbBlockSize,
          arbBlockCount,
          arbBlockCount,
          async (poolIds, blockSize, countPerPool, requestCount) => {
            const store = new PooledMemoryBlockStore(blockSize);

            // Store blocks in each pool, tracking which hashes belong where
            const hashesByPool = new Map<string, Set<string>>();
            for (const pool of poolIds) {
              hashesByPool.set(pool, new Set());
              for (let i = 0; i < countPerPool; i++) {
                const data = new Uint8Array(blockSize);
                crypto.getRandomValues(data);
                const hash = await store.putInPool(pool, data);
                hashesByPool.get(pool)!.add(hash);
              }
            }

            // For each pool, request random blocks and verify isolation
            for (const targetPool of poolIds) {
              const checksums = await store.getRandomBlocksFromPool(
                targetPool,
                requestCount,
              );

              for (const checksum of checksums) {
                const hex = checksum.toHex();

                // Must exist in the target pool
                const inTarget = await store.hasInPool(targetPool, hex);
                expect(inTarget).toBe(true);

                // Must NOT exist in any other pool
                for (const otherPool of poolIds) {
                  if (otherPool === targetPool) continue;
                  const inOther = await store.hasInPool(otherPool, hex);
                  expect(inOther).toBe(false);
                }
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Property 2: Random block count capping
  // ---------------------------------------------------------------------------

  describe('Property 2: Random block count capping', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 2: Random block count capping**
     *
     * For any valid PoolId P containing N blocks and any requested count M,
     * `getRandomBlocksFromPool(P, M)` SHALL return exactly `min(M, N)` checksums.
     * When N is 0, the result SHALL be an empty array.
     *
     * **Validates: Requirements 1.4, 1.5**
     */
    it('getRandomBlocksFromPool returns exactly min(M, N) checksums', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPoolId,
          arbBlockSize,
          arbBlockCount,
          fc.integer({ min: 0, max: 20 }),
          async (pool, blockSize, numBlocks, requestCount) => {
            const store = new PooledMemoryBlockStore(blockSize);

            // Store N blocks in the pool
            for (let i = 0; i < numBlocks; i++) {
              const data = new Uint8Array(blockSize);
              crypto.getRandomValues(data);
              await store.putInPool(pool, data);
            }

            const checksums = await store.getRandomBlocksFromPool(
              pool,
              requestCount,
            );

            const expectedCount = Math.min(requestCount, numBlocks);
            expect(checksums).toHaveLength(expectedCount);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('getRandomBlocksFromPool returns empty array for empty/non-existent pool', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPoolId,
          arbBlockSize,
          fc.integer({ min: 1, max: 20 }),
          async (pool, blockSize, requestCount) => {
            const store = new PooledMemoryBlockStore(blockSize);

            // Pool has zero blocks — never stored anything
            const checksums = await store.getRandomBlocksFromPool(
              pool,
              requestCount,
            );

            expect(checksums).toHaveLength(0);
            expect(checksums).toEqual([]);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Property 7: Bootstrap adds the requested number of blocks to a pool
  // ---------------------------------------------------------------------------

  describe('Property 7: Bootstrap adds the requested number of blocks to a pool', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 7: Bootstrap adds the requested number of blocks to a pool**
     *
     * For any valid PoolId P, BlockSize B, and count N > 0, after calling
     * `bootstrapPool(P, B, N)`, `getRandomBlocksFromPool(P, N)` SHALL return
     * exactly N checksums, and `getPoolStats(P).blockCount` SHALL be at least N.
     *
     * **Validates: Requirements 5.2, 5.3**
     */
    it('bootstrapPool adds exactly the requested number of blocks to the pool', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPoolId,
          arbBlockSize,
          arbBlockCount,
          async (pool, blockSize, count) => {
            const store = new PooledMemoryBlockStore(blockSize);

            await store.bootstrapPool(pool, blockSize, count);

            // getRandomBlocksFromPool should return exactly count checksums
            const checksums = await store.getRandomBlocksFromPool(pool, count);
            expect(checksums).toHaveLength(count);

            // getPoolStats blockCount should be at least count
            const stats = await store.getPoolStats(pool);
            expect(stats.blockCount).toBeGreaterThanOrEqual(count);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 7 (no-op case)**
     *
     * When bootstrapPool is called with count=0, no blocks should be added.
     *
     * **Validates: Requirements 5.5**
     */
    it('bootstrapPool with count=0 does not add blocks', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, arbBlockSize, async (pool, blockSize) => {
          const store = new PooledMemoryBlockStore(blockSize);

          await store.bootstrapPool(pool, blockSize, 0);

          // Pool should have no blocks — getRandomBlocksFromPool returns empty
          const checksums = await store.getRandomBlocksFromPool(pool, 10);
          expect(checksums).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Property 8: Bootstrap is additive to existing pool contents
  // ---------------------------------------------------------------------------

  describe('Property 8: Bootstrap is additive to existing pool contents', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 8: Bootstrap is additive to existing pool contents**
     *
     * For any valid PoolId P that already contains K blocks, after calling
     * `bootstrapPool(P, B, N)`, `getPoolStats(P).blockCount` SHALL equal K + N.
     * All K original blocks SHALL still be retrievable via `hasInPool(P, hash)`.
     *
     * **Validates: Requirements 5.4**
     */
    it('bootstrapPool adds N blocks without affecting existing K blocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPoolId,
          arbBlockSize,
          arbBlockCount,
          arbBlockCount,
          async (pool, blockSize, existingCount, bootstrapCount) => {
            const store = new PooledMemoryBlockStore(blockSize);

            // Manually add K blocks to the pool, tracking their hashes
            const originalHashes: string[] = [];
            for (let i = 0; i < existingCount; i++) {
              const data = new Uint8Array(blockSize);
              crypto.getRandomValues(data);
              const hash = await store.putInPool(pool, data);
              originalHashes.push(hash);
            }

            const statsBefore = await store.getPoolStats(pool);
            expect(statsBefore.blockCount).toBe(existingCount);

            // Bootstrap N additional blocks
            await store.bootstrapPool(pool, blockSize, bootstrapCount);

            // blockCount should equal K + N
            const statsAfter = await store.getPoolStats(pool);
            expect(statsAfter.blockCount).toBe(existingCount + bootstrapCount);

            // All K original blocks should still be retrievable
            for (const hash of originalHashes) {
              const exists = await store.hasInPool(pool, hash);
              expect(exists).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Property 9: validatePoolDeletion detects cross-pool dependencies
  // ---------------------------------------------------------------------------

  describe('Property 9: validatePoolDeletion detects cross-pool dependencies', () => {
    /**
     * Build a minimal CBL block (StructuredBlockType.CBL) whose address section
     * contains the given checksums. The block is sized to `blockSize` and padded
     * with zeros. The header follows the BrightChain CBL binary layout:
     *
     *   [0]      MagicPrefix  (0xBC)
     *   [1]      BlockType    (StructuredBlockType.CBL = 0x02)
     *   [2]      Version      (0x01)
     *   [3]      CRC8         (over header-without-signature)
     *   [4..4+creatorLen-1]   CreatorId
     *   [+8]     DateCreated  (uint64 big-endian)
     *   [+4]     AddressCount (uint32 big-endian)
     *   [+1]     TupleSize    (uint8)
     *   [+8]     OriginalDataLength (uint64 big-endian)
     *   [+64]    OriginalDataChecksum (SHA3-512 zeros)
     *   [+1]     IsExtendedHeader (0 = not extended)
     *   [+64]    CreatorSignature (zeros — not validated by validatePoolDeletion)
     *   [...]    Address data (each address = 64 bytes)
     */
    function buildMinimalCblBlock(
      addressHexes: string[],
      blockSize: BlockSize,
      creatorIdLength: number,
    ): Uint8Array {
      const checksumLen = CHECKSUM.SHA3_BUFFER_LENGTH; // 64
      const signatureLen = ECIES.SIGNATURE_SIZE; // 64

      // Ensure address count is a multiple of TUPLE.SIZE for valid CBL
      const addressCount = addressHexes.length;

      // Build header-without-signature (everything between structured prefix and signature)
      const headerWithoutSigLen =
        creatorIdLength + // CreatorId
        8 + // DateCreated
        4 + // AddressCount
        1 + // TupleSize
        8 + // OriginalDataLength
        checksumLen + // OriginalDataChecksum
        1; // IsExtendedHeader

      const headerWithoutSig = new Uint8Array(headerWithoutSigLen);
      const hView = new DataView(
        headerWithoutSig.buffer,
        headerWithoutSig.byteOffset,
        headerWithoutSig.byteLength,
      );

      let off = 0;
      // CreatorId — zeros
      off += creatorIdLength;
      // DateCreated — zeros (epoch)
      off += 8;
      // AddressCount
      hView.setUint32(off, addressCount, false);
      off += 4;
      // TupleSize
      headerWithoutSig[off] = TUPLE.SIZE;
      off += 1;
      // OriginalDataLength — zeros
      off += 8;
      // OriginalDataChecksum — zeros
      off += checksumLen;
      // IsExtendedHeader = 0
      headerWithoutSig[off] = 0;

      // Compute CRC8 over header-without-signature
      const crcService = new CrcService();
      const crc8 = crcService.crc8(headerWithoutSig)[0];

      // Structured prefix
      const prefix = new Uint8Array(4);
      prefix[0] = BLOCK_HEADER.MAGIC_PREFIX;
      prefix[1] = StructuredBlockType.CBL;
      prefix[2] = BLOCK_HEADER.VERSION;
      prefix[3] = crc8;

      // Signature — zeros (validatePoolDeletion doesn't verify signatures)
      const signature = new Uint8Array(signatureLen);

      // Address data
      const addressData = new Uint8Array(addressCount * checksumLen);
      for (let i = 0; i < addressCount; i++) {
        const hex = addressHexes[i];
        for (let j = 0; j < checksumLen; j++) {
          addressData[i * checksumLen + j] = parseInt(
            hex.substring(j * 2, j * 2 + 2),
            16,
          );
        }
      }

      // Assemble into a block-sized buffer
      const data = new Uint8Array(blockSize);
      let pos = 0;
      data.set(prefix, pos);
      pos += prefix.length;
      data.set(headerWithoutSig, pos);
      pos += headerWithoutSig.length;
      data.set(signature, pos);
      pos += signature.length;
      data.set(addressData, pos);
      // Remaining bytes stay zero (padding)

      return data;
    }

    // We need BrightChain services initialized for validatePoolDeletion
    // to access CBLService via getGlobalServiceProvider()
    beforeAll(() => {
      initializeBrightChain();
    });

    afterAll(() => {
      resetInitialization();
    });

    /**
     * **Feature: pool-scoped-whitening, Property 9: validatePoolDeletion detects cross-pool dependencies (safe case)**
     *
     * For any pool A with no external CBL references,
     * `validatePoolDeletion(A)` SHALL return `safe: true` with empty arrays.
     *
     * **Validates: Requirements 6.2, 6.3**
     */
    it('returns safe=true when no CBL in other pools references the target pool', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIds,
          arbBlockSize,
          arbBlockCount,
          async (poolIds, blockSize, countPerPool) => {
            const store = new PooledMemoryBlockStore(blockSize);

            // Store regular (non-CBL) blocks in each pool
            for (const pool of poolIds) {
              for (let i = 0; i < countPerPool; i++) {
                const data = new Uint8Array(blockSize);
                crypto.getRandomValues(data);
                // Ensure byte 0 is NOT the magic prefix so it's not mistaken for a CBL
                if (data[0] === BLOCK_HEADER.MAGIC_PREFIX) {
                  data[0] = 0x00;
                }
                await store.putInPool(pool, data);
              }
            }

            // validatePoolDeletion should return safe for every pool
            for (const pool of poolIds) {
              const result = await store.validatePoolDeletion(pool);
              expect(result.safe).toBe(true);
              expect(result.dependentPools).toHaveLength(0);
              expect(result.referencedBlocks).toHaveLength(0);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 9: validatePoolDeletion detects cross-pool dependencies (unsafe case)**
     *
     * For any pool configuration where pool A contains blocks referenced by
     * a CBL in pool B, `validatePoolDeletion(A)` SHALL return `safe: false`
     * with pool B in `dependentPools` and the referenced checksums in
     * `referencedBlocks`.
     *
     * **Validates: Requirements 6.2, 6.3, 6.4**
     */
    it('returns safe=false when a CBL in another pool references blocks in the target pool', async () => {
      // Get the creator ID length from the initialized CBLService
      const cblService = ServiceProvider.getInstance().cblService;
      const creatorIdLength = cblService.creatorLength;

      // Use a block size large enough to hold the CBL header + address data.
      // Header is ~170 bytes; each address is 64 bytes. BlockSize.Small (4096)
      // can hold (4096-170)/64 = 61 addresses, more than enough.
      const cblBlockSize = BlockSize.Small;

      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIds,
          // Generate 1-3 tuples worth of addresses (3-9 addresses)
          fc.integer({ min: 1, max: 3 }),
          async (poolIds, tupleMultiplier) => {
            const poolA = poolIds[0];
            const poolB = poolIds[1];
            const store = new PooledMemoryBlockStore(cblBlockSize);

            // Store some regular blocks in pool A and track their hashes
            const poolAHashes: string[] = [];
            const numBlocks = tupleMultiplier * TUPLE.SIZE;
            for (let i = 0; i < numBlocks; i++) {
              const data = new Uint8Array(cblBlockSize);
              crypto.getRandomValues(data);
              // Ensure not mistaken for CBL
              if (data[0] === BLOCK_HEADER.MAGIC_PREFIX) {
                data[0] = 0x00;
              }
              const hash = await store.putInPool(poolA, data);
              poolAHashes.push(hash);
            }

            // Build a CBL block in pool B that references all blocks in pool A
            const cblData = buildMinimalCblBlock(
              poolAHashes,
              cblBlockSize,
              creatorIdLength,
            );
            await store.putInPool(poolB, cblData);

            // validatePoolDeletion(poolA) should detect the dependency
            const result = await store.validatePoolDeletion(poolA);
            expect(result.safe).toBe(false);
            expect(result.dependentPools).toContain(poolB);
            // Every hash from pool A should appear in referencedBlocks
            for (const hash of poolAHashes) {
              expect(result.referencedBlocks).toContain(hash);
            }

            // Conversely, pool B should be safe to delete (no CBL in pool A references pool B)
            const resultB = await store.validatePoolDeletion(poolB);
            expect(resultB.safe).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Property 10: deletePool rejects deletion when cross-pool dependencies exist
  // ---------------------------------------------------------------------------

  describe('Property 10: deletePool rejects deletion when cross-pool dependencies exist', () => {
    /**
     * Build a minimal CBL block (StructuredBlockType.CBL) whose address section
     * contains the given checksums. See Property 9 for full layout documentation.
     */
    function buildMinimalCblBlock(
      addressHexes: string[],
      blockSize: BlockSize,
      creatorIdLength: number,
    ): Uint8Array {
      const checksumLen = CHECKSUM.SHA3_BUFFER_LENGTH; // 64
      const signatureLen = ECIES.SIGNATURE_SIZE; // 64

      const addressCount = addressHexes.length;

      const headerWithoutSigLen =
        creatorIdLength + // CreatorId
        8 + // DateCreated
        4 + // AddressCount
        1 + // TupleSize
        8 + // OriginalDataLength
        checksumLen + // OriginalDataChecksum
        1; // IsExtendedHeader

      const headerWithoutSig = new Uint8Array(headerWithoutSigLen);
      const hView = new DataView(
        headerWithoutSig.buffer,
        headerWithoutSig.byteOffset,
        headerWithoutSig.byteLength,
      );

      let off = 0;
      // CreatorId — zeros
      off += creatorIdLength;
      // DateCreated — zeros (epoch)
      off += 8;
      // AddressCount
      hView.setUint32(off, addressCount, false);
      off += 4;
      // TupleSize
      headerWithoutSig[off] = TUPLE.SIZE;
      off += 1;
      // OriginalDataLength — zeros
      off += 8;
      // OriginalDataChecksum — zeros
      off += checksumLen;
      // IsExtendedHeader = 0
      headerWithoutSig[off] = 0;

      // Compute CRC8 over header-without-signature
      const crcService = new CrcService();
      const crc8 = crcService.crc8(headerWithoutSig)[0];

      // Structured prefix
      const prefix = new Uint8Array(4);
      prefix[0] = BLOCK_HEADER.MAGIC_PREFIX;
      prefix[1] = StructuredBlockType.CBL;
      prefix[2] = BLOCK_HEADER.VERSION;
      prefix[3] = crc8;

      // Signature — zeros
      const signature = new Uint8Array(signatureLen);

      // Address data
      const addressData = new Uint8Array(addressCount * checksumLen);
      for (let i = 0; i < addressCount; i++) {
        const hex = addressHexes[i];
        for (let j = 0; j < checksumLen; j++) {
          addressData[i * checksumLen + j] = parseInt(
            hex.substring(j * 2, j * 2 + 2),
            16,
          );
        }
      }

      // Assemble into a block-sized buffer
      const data = new Uint8Array(blockSize);
      let pos = 0;
      data.set(prefix, pos);
      pos += prefix.length;
      data.set(headerWithoutSig, pos);
      pos += headerWithoutSig.length;
      data.set(signature, pos);
      pos += signature.length;
      data.set(addressData, pos);

      return data;
    }

    beforeAll(() => {
      initializeBrightChain();
    });

    afterAll(() => {
      resetInitialization();
    });

    /**
     * **Feature: pool-scoped-whitening, Property 10: deletePool rejects deletion when cross-pool dependencies exist**
     *
     * For any pool A that has cross-pool dependencies (validatePoolDeletion
     * returns safe=false), calling `deletePool(A)` SHALL throw a
     * PoolDeletionError and leave pool A's blocks intact.
     *
     * **Validates: Requirements 6.5, 6.6**
     */
    it('deletePool throws PoolDeletionError and leaves blocks intact when cross-pool dependencies exist', async () => {
      const cblService = ServiceProvider.getInstance().cblService;
      const creatorIdLength = cblService.creatorLength;
      const cblBlockSize = BlockSize.Small;

      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIds,
          fc.integer({ min: 1, max: 3 }),
          async (poolIds, tupleMultiplier) => {
            const poolA = poolIds[0];
            const poolB = poolIds[1];
            const store = new PooledMemoryBlockStore(cblBlockSize);

            // Store blocks in pool A and track their hashes
            const poolAHashes: string[] = [];
            const numBlocks = tupleMultiplier * TUPLE.SIZE;
            for (let i = 0; i < numBlocks; i++) {
              const data = new Uint8Array(cblBlockSize);
              crypto.getRandomValues(data);
              if (data[0] === BLOCK_HEADER.MAGIC_PREFIX) {
                data[0] = 0x00;
              }
              const hash = await store.putInPool(poolA, data);
              poolAHashes.push(hash);
            }

            // Build a CBL in pool B that references pool A's blocks
            const cblData = buildMinimalCblBlock(
              poolAHashes,
              cblBlockSize,
              creatorIdLength,
            );
            await store.putInPool(poolB, cblData);

            // deletePool(poolA) should throw PoolDeletionError
            let caughtError: PoolDeletionError | undefined;
            try {
              await store.deletePool(poolA);
            } catch (err) {
              if (err instanceof PoolDeletionError) {
                caughtError = err;
              } else {
                throw err; // unexpected error — re-throw
              }
            }

            expect(caughtError).toBeDefined();
            expect(caughtError!.name).toBe('PoolDeletionError');

            // The error's validation result should indicate unsafe deletion
            const validation = caughtError!.validation;
            expect(validation.safe).toBe(false);
            expect(validation.dependentPools).toContain(poolB);
            for (const hash of poolAHashes) {
              expect(validation.referencedBlocks).toContain(hash);
            }

            // Pool A's blocks must still be intact
            for (const hash of poolAHashes) {
              const exists = await store.hasInPool(poolA, hash);
              expect(exists).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Property 11: forceDeletePool bypasses dependency validation
  // ---------------------------------------------------------------------------

  describe('Property 11: forceDeletePool bypasses dependency validation', () => {
    /**
     * Build a minimal CBL block (StructuredBlockType.CBL) whose address section
     * contains the given checksums. See Property 9 for full layout documentation.
     */
    function buildMinimalCblBlock(
      addressHexes: string[],
      blockSize: BlockSize,
      creatorIdLength: number,
    ): Uint8Array {
      const checksumLen = CHECKSUM.SHA3_BUFFER_LENGTH; // 64
      const signatureLen = ECIES.SIGNATURE_SIZE; // 64

      const addressCount = addressHexes.length;

      const headerWithoutSigLen =
        creatorIdLength + // CreatorId
        8 + // DateCreated
        4 + // AddressCount
        1 + // TupleSize
        8 + // OriginalDataLength
        checksumLen + // OriginalDataChecksum
        1; // IsExtendedHeader

      const headerWithoutSig = new Uint8Array(headerWithoutSigLen);
      const hView = new DataView(
        headerWithoutSig.buffer,
        headerWithoutSig.byteOffset,
        headerWithoutSig.byteLength,
      );

      let off = 0;
      // CreatorId — zeros
      off += creatorIdLength;
      // DateCreated — zeros (epoch)
      off += 8;
      // AddressCount
      hView.setUint32(off, addressCount, false);
      off += 4;
      // TupleSize
      headerWithoutSig[off] = TUPLE.SIZE;
      off += 1;
      // OriginalDataLength — zeros
      off += 8;
      // OriginalDataChecksum — zeros
      off += checksumLen;
      // IsExtendedHeader = 0
      headerWithoutSig[off] = 0;

      // Compute CRC8 over header-without-signature
      const crcService = new CrcService();
      const crc8 = crcService.crc8(headerWithoutSig)[0];

      // Structured prefix
      const prefix = new Uint8Array(4);
      prefix[0] = BLOCK_HEADER.MAGIC_PREFIX;
      prefix[1] = StructuredBlockType.CBL;
      prefix[2] = BLOCK_HEADER.VERSION;
      prefix[3] = crc8;

      // Signature — zeros
      const signature = new Uint8Array(signatureLen);

      // Address data
      const addressData = new Uint8Array(addressCount * checksumLen);
      for (let i = 0; i < addressCount; i++) {
        const hex = addressHexes[i];
        for (let j = 0; j < checksumLen; j++) {
          addressData[i * checksumLen + j] = parseInt(
            hex.substring(j * 2, j * 2 + 2),
            16,
          );
        }
      }

      // Assemble into a block-sized buffer
      const data = new Uint8Array(blockSize);
      let pos = 0;
      data.set(prefix, pos);
      pos += prefix.length;
      data.set(headerWithoutSig, pos);
      pos += headerWithoutSig.length;
      data.set(signature, pos);
      pos += signature.length;
      data.set(addressData, pos);

      return data;
    }

    beforeAll(() => {
      initializeBrightChain();
    });

    afterAll(() => {
      resetInitialization();
    });

    /**
     * **Feature: pool-scoped-whitening, Property 11: forceDeletePool bypasses dependency validation**
     *
     * For any pool A (regardless of cross-pool dependencies), calling
     * `forceDeletePool(A)` SHALL remove all blocks from pool A and remove
     * pool A from `listPools()`.
     *
     * **Validates: Requirements 6.7**
     */
    it('forceDeletePool removes all blocks and the pool even when cross-pool dependencies exist', async () => {
      const cblService = ServiceProvider.getInstance().cblService;
      const creatorIdLength = cblService.creatorLength;
      const cblBlockSize = BlockSize.Small;

      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIds,
          fc.integer({ min: 1, max: 3 }),
          async (poolIds, tupleMultiplier) => {
            const poolA = poolIds[0];
            const poolB = poolIds[1];
            const store = new PooledMemoryBlockStore(cblBlockSize);

            // Store blocks in pool A and track their hashes
            const poolAHashes: string[] = [];
            const numBlocks = tupleMultiplier * TUPLE.SIZE;
            for (let i = 0; i < numBlocks; i++) {
              const data = new Uint8Array(cblBlockSize);
              crypto.getRandomValues(data);
              if (data[0] === BLOCK_HEADER.MAGIC_PREFIX) {
                data[0] = 0x00;
              }
              const hash = await store.putInPool(poolA, data);
              poolAHashes.push(hash);
            }

            // Build a CBL in pool B that references pool A's blocks
            // This creates cross-pool dependencies that would block normal deletePool
            const cblData = buildMinimalCblBlock(
              poolAHashes,
              cblBlockSize,
              creatorIdLength,
            );
            await store.putInPool(poolB, cblData);

            // Confirm the dependency exists (deletePool would fail)
            const validation = await store.validatePoolDeletion(poolA);
            expect(validation.safe).toBe(false);

            // forceDeletePool should succeed without throwing
            await expect(store.forceDeletePool(poolA)).resolves.not.toThrow();

            // All pool A blocks should be gone
            for (const hash of poolAHashes) {
              const exists = await store.hasInPool(poolA, hash);
              expect(exists).toBe(false);
            }

            // Pool A should no longer appear in listPools
            const pools = await store.listPools();
            expect(pools).not.toContain(poolA);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
