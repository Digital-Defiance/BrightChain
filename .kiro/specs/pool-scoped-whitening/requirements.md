# Requirements Document

## Introduction

This feature enforces pool-scoped whitening in BrightChain's Owner Free Filesystem (OFF) pattern. Currently, the XOR/whitening layer is completely pool-blind: `getRandomBlocks()` pulls from global storage, `BlockHandleTuple` does not validate pool membership, and `TupleService` callbacks accept blocks from any pool. This means a tuple can contain blocks from multiple pools, creating cross-pool XOR dependencies that make `deletePool` unsafe — deleting one pool can destroy blocks needed to reconstruct another pool's data.

Pool-scoped whitening ensures that all blocks in a tuple belong to the same pool, making each pool a self-contained unit with no external XOR dependencies. This enables safe pool deletion, correct pool-scoped block lifecycle management, and maintains backward compatibility for legacy unpooled code via the Default_Pool.

## Glossary

- **Pool**: A logical namespace that groups blocks together using a string prefix on block IDs (format: `${poolId}:${hash}`)
- **PoolId**: A string identifier for a pool, matching the pattern `/^[a-zA-Z0-9_-]{1,64}$/`
- **Default_Pool**: The implicit pool (identifier `"default"`) used for unpooled/legacy blocks
- **Tuple**: A fixed-size group of blocks (typically 3) whose XOR produces the original data; format is `[whitenedBlock, randomBlock1, randomBlock2]`
- **Whitened_Block**: A block produced by XORing source data with random/whitened blocks, used in the OFF pattern to obscure data
- **Random_Block**: A block filled with cryptographically random data, used as XOR material in tuple creation
- **CBL**: Constituent Block List — a block that records the addresses (checksums) of all tuple members needed to reconstruct data
- **TupleService**: The service responsible for creating tuples via `dataStreamToPlaintextTuplesAndCBL` and related methods
- **BlockHandleTuple**: A tuple of block handles that validates block sizes match and provides XOR operations
- **IPooledBlockStore**: The extended block store interface with pool-scoped operations (from pool-based-storage-isolation)
- **PooledMemoryBlockStore**: The in-memory implementation of IPooledBlockStore
- **PooledStoreAdapter**: An adapter in brightchain-db that wraps IPooledBlockStore and exposes IBlockStore scoped to a fixed pool
- **DiskBlockAsyncStore**: The disk-based block store implementation in brightchain-api-lib
- **Pool_Bootstrapping**: The process of seeding a new pool with random blocks so that whitening operations have material to work with
- **Pool_Integrity_Check**: A pre-deletion validation that verifies no external pool depends on blocks within the pool being deleted
- **IBlockStore**: The base interface for block storage operations
- **XOR_Dependency**: A relationship where a block in one pool is needed to reconstruct data in another pool via XOR

## Requirements

### Requirement 1: Pool-Scoped Random Block Sourcing

**User Story:** As a developer, I want `getRandomBlocks` to return only blocks from the current pool, so that whitening operations never create cross-pool XOR dependencies.

#### Acceptance Criteria

1. WHEN `getRandomBlocks` is called on a PooledMemoryBlockStore with a pool context, THE PooledMemoryBlockStore SHALL return only block checksums belonging to that pool
2. WHEN `getRandomBlocks` is called on a PooledMemoryBlockStore without a pool context, THE PooledMemoryBlockStore SHALL return block checksums from the Default_Pool
3. THE IPooledBlockStore interface SHALL define a `getRandomBlocksFromPool(pool: PoolId, count: number)` method that returns random block checksums scoped to the specified pool
4. WHEN `getRandomBlocksFromPool` is called with a pool containing fewer blocks than requested, THE IPooledBlockStore SHALL return all available blocks from that pool
5. WHEN `getRandomBlocksFromPool` is called with a pool containing zero blocks, THE IPooledBlockStore SHALL return an empty array
6. THE DiskBlockAsyncStore SHALL implement pool-scoped random block retrieval that reads only from the pool's storage namespace

### Requirement 2: PooledStoreAdapter Random Block Routing

**User Story:** As a developer, I want the PooledStoreAdapter to route `getRandomBlocks` through the pool, so that any code using the adapter automatically gets pool-scoped random blocks.

#### Acceptance Criteria

1. WHEN `getRandomBlocks` is called on a PooledStoreAdapter, THE PooledStoreAdapter SHALL delegate to `getRandomBlocksFromPool` on the inner IPooledBlockStore using the adapter's configured PoolId
2. WHEN `getRandomBlocks` is called on a PooledStoreAdapter and the inner store returns fewer blocks than requested, THE PooledStoreAdapter SHALL return the available blocks without error
3. FOR ALL calls to `getRandomBlocks` on a PooledStoreAdapter configured with pool P, every returned checksum SHALL correspond to a block that exists in pool P

### Requirement 3: Pool-Scoped Tuple Creation

**User Story:** As a developer, I want tuple creation to enforce that all blocks in a tuple belong to the same pool, so that tuples are self-contained within a single pool.

#### Acceptance Criteria

1. WHEN `dataStreamToPlaintextTuplesAndCBL` is called with a `whitenedBlockSource` callback, THE TupleService SHALL use blocks that originate from the same pool as the source data
2. WHEN `dataStreamToPlaintextTuplesAndCBL` is called with a `randomBlockSource` callback, THE TupleService SHALL use random blocks that originate from the same pool as the source data
3. THE TupleService SHALL accept an optional PoolId parameter in its tuple-creation methods to specify the target pool for all blocks in the tuple
4. WHEN a PoolId is provided to a tuple-creation method, THE TupleService SHALL validate that all whitened and random blocks used in the tuple belong to the specified pool
5. WHEN `dataStreamToEncryptedTuplesAndCBL` is called with a PoolId, THE TupleService SHALL apply the same pool-scoping constraints as the plaintext variant

### Requirement 4: BlockHandleTuple Pool Validation

**User Story:** As a developer, I want BlockHandleTuple to optionally validate that all handles belong to the same pool, so that pool boundary violations are caught at tuple construction time.

#### Acceptance Criteria

1. THE BlockHandleTuple constructor SHALL accept an optional PoolId parameter
2. WHEN a PoolId is provided to the BlockHandleTuple constructor, THE BlockHandleTuple SHALL validate that all block handles belong to the specified pool
3. IF any block handle in the tuple does not belong to the specified pool, THEN THE BlockHandleTuple SHALL throw a descriptive error identifying the mismatched block and its pool
4. WHEN no PoolId is provided to the BlockHandleTuple constructor, THE BlockHandleTuple SHALL skip pool validation to maintain backward compatibility

### Requirement 5: New Pool Bootstrapping

**User Story:** As a developer, I want to seed a new pool with random blocks, so that whitening operations have sufficient material to create tuples without cross-pool dependencies.

#### Acceptance Criteria

1. THE IPooledBlockStore interface SHALL define a `bootstrapPool(pool: PoolId, blockSize: BlockSize, count: number)` method
2. WHEN `bootstrapPool` is called, THE IPooledBlockStore SHALL generate the specified number of cryptographically random blocks and store them in the specified pool
3. WHEN `bootstrapPool` completes, THE IPooledBlockStore SHALL have at least `count` random blocks available via `getRandomBlocksFromPool` for the specified pool
4. WHEN `bootstrapPool` is called on a pool that already contains blocks, THE IPooledBlockStore SHALL add the new random blocks without affecting existing blocks
5. IF `bootstrapPool` is called with a count of zero, THEN THE IPooledBlockStore SHALL complete without generating blocks
6. THE PooledMemoryBlockStore SHALL implement `bootstrapPool` for in-memory random block generation
7. THE DiskBlockAsyncStore SHALL implement `bootstrapPool` for disk-based random block generation

### Requirement 6: Safe Pool Deletion with Pre-Deletion Validation

**User Story:** As a developer, I want pool deletion to verify that no other pool depends on the pool's blocks for XOR reconstruction, so that deleting a pool never causes data loss in other pools.

#### Acceptance Criteria

1. THE IPooledBlockStore interface SHALL define a `validatePoolDeletion(pool: PoolId)` method that checks for cross-pool XOR dependencies
2. WHEN `validatePoolDeletion` is called, THE IPooledBlockStore SHALL scan all CBLs in other pools to determine if any reference blocks in the target pool
3. WHEN `validatePoolDeletion` finds no cross-pool dependencies, THE IPooledBlockStore SHALL return a result indicating safe deletion
4. WHEN `validatePoolDeletion` finds cross-pool dependencies, THE IPooledBlockStore SHALL return a result listing the dependent pools and the specific block checksums involved
5. WHEN `deletePool` is called, THE IPooledBlockStore SHALL invoke `validatePoolDeletion` before proceeding with deletion
6. IF `validatePoolDeletion` reports cross-pool dependencies, THEN THE `deletePool` method SHALL reject the deletion with a descriptive error listing the dependencies
7. THE IPooledBlockStore SHALL provide a `forceDeletePool(pool: PoolId)` method that bypasses the dependency check for administrative use

### Requirement 7: Cross-Node Pool Boundary Enforcement

**User Story:** As a developer, I want remote block fetching to respect pool boundaries, so that blocks fetched from other nodes are stored in the correct pool and never mixed across pools.

#### Acceptance Criteria

1. WHEN the IBlockFetchTransport fetches a block with a PoolId, THE Block_Fetcher SHALL store the fetched block in the specified pool
2. WHEN a remote node responds with block data for a pool-scoped request, THE Block_Fetcher SHALL verify that the block's metadata pool matches the requested pool
3. IF a fetched block's pool metadata does not match the requested pool, THEN THE Block_Fetcher SHALL reject the block with a PoolMismatchError
4. WHEN a tuple reconstruction requires fetching remote blocks, THE reconstruction process SHALL fetch all blocks into the same pool

### Requirement 8: Backward Compatibility

**User Story:** As a developer, I want existing unpooled code to continue working unchanged, so that the introduction of pool-scoped whitening does not break legacy tuple creation or block operations.

#### Acceptance Criteria

1. WHEN `getRandomBlocks` is called on a non-pooled IBlockStore implementation, THE IBlockStore SHALL continue to return blocks from the global store as before
2. WHEN `dataStreamToPlaintextTuplesAndCBL` is called without a PoolId parameter, THE TupleService SHALL operate with the same behavior as before pool-scoping was introduced
3. WHEN a BlockHandleTuple is constructed without a PoolId parameter, THE BlockHandleTuple SHALL validate only block sizes as before
4. WHEN legacy code uses the Default_Pool through PooledStoreAdapter, THE PooledStoreAdapter SHALL route `getRandomBlocks` to `getRandomBlocksFromPool` with the Default_Pool identifier
5. FOR ALL existing tests that do not use pool-scoped operations, the tests SHALL continue to pass without modification

### Requirement 9: CBL Pool Awareness

**User Story:** As a developer, I want CBLs to record which pool their constituent blocks belong to, so that tuple reconstruction can verify pool integrity.

#### Acceptance Criteria

1. THE CBL data structure SHALL include an optional PoolId field indicating which pool all constituent blocks belong to
2. WHEN a CBL is created with pool-scoped tuple creation, THE CBL SHALL record the PoolId of the pool
3. WHEN a CBL is reconstructed, THE reconstruction process SHALL verify that all referenced blocks exist in the CBL's recorded pool
4. IF a CBL's recorded pool does not match the pool where its blocks are found, THEN THE reconstruction process SHALL report a pool integrity error
5. WHEN a CBL is created without pool-scoping (legacy), THE CBL SHALL omit the PoolId field or set it to the Default_Pool identifier
