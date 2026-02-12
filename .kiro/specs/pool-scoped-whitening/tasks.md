# Implementation Plan: Pool-Scoped Whitening

## Overview

Implement pool-scoped whitening to ensure all blocks in a tuple belong to the same pool, making each pool a self-contained unit with no external XOR dependencies. Changes span `brightchain-lib` (interfaces, stores, services, blocks), `brightchain-db` (adapter fix), and `brightchain-api-lib` (disk store, remote fetch).

## Tasks

- [x] 1. Extend IPooledBlockStore interface and supporting types
  - [x] 1.1 Add `getRandomBlocksFromPool`, `bootstrapPool`, `validatePoolDeletion`, `forceDeletePool` to `IPooledBlockStore` in `brightchain-lib/src/lib/interfaces/storage/pooledBlockStore.ts`
    - Add `PoolDeletionValidationResult` interface
    - Import `BlockSize` and `Checksum` types as needed
    - _Requirements: 1.3, 5.1, 6.1, 6.7_
  - [x] 1.2 Add new error types: `PoolDeletionError` in `brightchain-lib`, `PoolBoundaryViolation` to `TupleErrorType` enum, `PoolMismatch` to `HandleTupleErrorType` enum
    - _Requirements: 6.6, 3.4, 4.3_

- [x] 2. Implement pool-scoped random blocks in PooledMemoryBlockStore
  - [x] 2.1 Implement `getRandomBlocksFromPool` on `PooledMemoryBlockStore` in `brightchain-lib/src/lib/stores/pooledMemoryBlockStore.ts`
    - Filter storage keys by pool prefix, randomly select, return checksums
    - Override `getRandomBlocks` to delegate to `getRandomBlocksFromPool(DEFAULT_POOL, count)`
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  - [x] 2.2 Write property test: Pool-scoped random block isolation (Property 1)
    - **Property 1: Pool-scoped random block isolation**
    - **Validates: Requirements 1.1, 1.2, 1.6**
  - [x] 2.3 Write property test: Random block count capping (Property 2)
    - **Property 2: Random block count capping**
    - **Validates: Requirements 1.4, 1.5**

- [x] 3. Fix PooledStoreAdapter random block routing
  - [x] 3.1 Change `PooledStoreAdapter.getRandomBlocks` in `brightchain-db/src/lib/pooledStoreAdapter.ts` to call `this.inner.getRandomBlocksFromPool(this.poolId, count)` instead of `this.inner.getRandomBlocks(count)`
    - _Requirements: 2.1, 2.3_
  - [x] 3.2 Write property test: PooledStoreAdapter routes random blocks through pool (Property 3)
    - **Property 3: PooledStoreAdapter routes random blocks through pool**
    - **Validates: Requirements 2.1, 2.3, 8.4**

- [x] 4. Checkpoint - Ensure core pool-scoped random block sourcing works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement pool bootstrapping
  - [x] 5.1 Implement `bootstrapPool` on `PooledMemoryBlockStore`
    - Generate `count` cryptographically random blocks of `blockSize` and store via `putInPool`
    - No-op when count <= 0
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 5.2 Write property test: Bootstrap adds blocks to pool (Property 7)
    - **Property 7: Bootstrap adds the requested number of blocks to a pool**
    - **Validates: Requirements 5.2, 5.3**
  - [x] 5.3 Write property test: Bootstrap is additive (Property 8)
    - **Property 8: Bootstrap is additive to existing pool contents**
    - **Validates: Requirements 5.4**

- [x] 6. Implement safe pool deletion with pre-deletion validation
  - [x] 6.1 Implement `validatePoolDeletion` on `PooledMemoryBlockStore`
    - Scan all pools' blocks for CBL-type blocks, parse their addresses, check if any reference blocks in the target pool
    - Return `PoolDeletionValidationResult` with `safe`, `dependentPools`, `referencedBlocks`
    - _Requirements: 6.2, 6.3, 6.4_
  - [x] 6.2 Update `deletePool` on `PooledMemoryBlockStore` to call `validatePoolDeletion` before deletion, throw `PoolDeletionError` if unsafe
    - Implement `forceDeletePool` that bypasses validation
    - _Requirements: 6.5, 6.6, 6.7_
  - [x] 6.3 Write property test: validatePoolDeletion detects cross-pool dependencies (Property 9)
    - **Property 9: validatePoolDeletion detects cross-pool dependencies**
    - **Validates: Requirements 6.2, 6.3, 6.4**
  - [x] 6.4 Write property test: deletePool rejects unsafe deletion (Property 10)
    - **Property 10: deletePool rejects deletion when cross-pool dependencies exist**
    - **Validates: Requirements 6.5, 6.6**
  - [x] 6.5 Write property test: forceDeletePool bypasses validation (Property 11)
    - **Property 11: forceDeletePool bypasses dependency validation**
    - **Validates: Requirements 6.7**

- [x] 7. Checkpoint - Ensure pool lifecycle (bootstrap + safe deletion) works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Add pool validation to BlockHandleTuple
  - [x] 8.1 Extend `BlockHandleTuple` constructor in `brightchain-lib/src/lib/blocks/handleTuple.ts` to accept optional `poolId` parameter
    - When provided, validate all handles belong to the specified pool; throw `HandleTupleError(PoolMismatch)` on violation
    - When omitted, skip pool validation (backward compatible)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 8.2 Write property test: BlockHandleTuple pool validation rejects mismatched handles (Property 5)
    - **Property 5: BlockHandleTuple pool validation rejects mismatched handles**
    - **Validates: Requirements 4.2, 4.3**
  - [x] 8.3 Write property test: BlockHandleTuple without poolId skips pool validation (Property 6)
    - **Property 6: BlockHandleTuple without poolId skips pool validation**
    - **Validates: Requirements 4.4, 8.3**

- [x] 9. Add pool-scoping to TupleService
  - [x] 9.1 Add `TuplePoolOptions` interface and optional `poolOptions` parameter to `dataStreamToPlaintextTuplesAndCBL` and `dataStreamToEncryptedTuplesAndCBL` in `brightchain-lib/src/lib/services/tuple.service.ts`
    - Implement `wrapWithPoolValidation` helper that wraps source callbacks with pool membership checks
    - Throw `TupleError(PoolBoundaryViolation)` when a block from the wrong pool is returned
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 9.2 Write property test: Tuple creation pool enforcement (Property 4)
    - **Property 4: Tuple creation pool enforcement**
    - **Validates: Requirements 3.1, 3.2, 3.4, 3.5**

- [x] 10. Add CBL pool awareness
  - [x] 10.1 Ensure CBL metadata records poolId when created via pool-scoped tuple creation
    - Update `persistTuple` callback usage in TupleService to pass pool metadata
    - Update `getHandleTuples` in `CBLBase` to optionally verify all addresses exist in the CBL's pool via `hasInPool`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 10.2 Write property test: CBL records pool on creation (Property 13)
    - **Property 13: CBL records pool on pool-scoped creation**
    - **Validates: Requirements 9.2**
  - [x] 10.3 Write property test: CBL reconstruction verifies pool integrity (Property 14)
    - **Property 14: CBL reconstruction verifies pool integrity**
    - **Validates: Requirements 9.3, 9.4**

- [x] 11. Checkpoint - Ensure tuple creation and CBL pool awareness works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement DiskBlockAsyncStore pool-scoped methods
  - [x] 12.1 Implement `getRandomBlocksFromPool` on `DiskBlockAsyncStore` in `brightchain-api-lib/src/lib/stores/diskBlockAsyncStore.ts`
    - Read only from pool-prefixed directory structure
    - Override `getRandomBlocks` to delegate to `getRandomBlocksFromPool(DEFAULT_POOL, count)`
    - _Requirements: 1.6_
  - [x] 12.2 Implement `bootstrapPool` on `DiskBlockAsyncStore`
    - Generate random blocks and store via `putInPool` to disk
    - _Requirements: 5.7_
  - [x] 12.3 Implement `validatePoolDeletion` and `forceDeletePool` on `DiskBlockAsyncStore`
    - Scan CBLs on disk in other pools for cross-pool references
    - _Requirements: 6.1, 6.7_

- [x] 13. Add cross-node pool boundary enforcement
  - [x] 13.1 Ensure `BlockFetcher` in `brightchain-api-lib` stores fetched blocks in the specified pool via `putInPool` and validates pool metadata
    - Leverage existing `PoolMismatchError` from cross-node-eventual-consistency design
    - Ensure tuple reconstruction fetches all blocks into the same pool
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 13.2 Write property test: Remote fetch stores block in correct pool (Property 12)
    - **Property 12: Remote fetch stores block in correct pool**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 14. Backward compatibility verification
  - [x] 14.1 Verify existing non-pooled `MemoryBlockStore.getRandomBlocks` is unchanged
    - Verify `TupleService` without poolOptions works as before
    - Verify `BlockHandleTuple` without poolId works as before
    - _Requirements: 8.1, 8.2, 8.5_
  - [x] 14.2 Write unit tests for backward compatibility edge cases
    - Legacy `getRandomBlocks` on non-pooled store
    - `dataStreamToPlaintextTuplesAndCBL` without poolOptions
    - `BlockHandleTuple` without poolId with mixed-pool handles
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- The most critical fix is task 3.1 (PooledStoreAdapter routing) — this single change makes all existing code using the adapter automatically pool-safe
