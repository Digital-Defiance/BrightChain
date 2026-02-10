# Requirements Document

## Introduction

This feature introduces pool-based storage isolation to BrightChain's block store, enabling namespace-level grouping and isolation of blocks. Pools act as lightweight namespace prefixes on block IDs (format: `<pool>:<hash>`), allowing database-like applications to independently manage block lifecycles, apply per-pool policies, and ensure data isolation between tenants or applications. The scope covers Phase 1 (Core Pool Support / MVP), with Phases 2 and 3 (Gossip Integration, Discovery Protocol) deferred to future work.

## Glossary

- **Pool**: A logical namespace that groups blocks together using a string prefix on block IDs
- **PoolId**: A string identifier for a pool, matching the pattern `/^[a-zA-Z0-9_-]{1,64}$/`
- **Default_Pool**: The implicit pool (identifier `"default"`) used for unpooled/legacy blocks
- **Storage_Key**: The internal composite key used to store a block, formatted as `${poolId}:${hash}`
- **IBlockStore**: The existing base interface for block storage operations in brightchain-lib
- **IPooledBlockStore**: The new extended interface adding pool-scoped operations on top of IBlockStore
- **PoolStats**: A data structure containing statistics about a pool (block count, total bytes, timestamps)
- **ListOptions**: Pagination options for listing blocks in a pool (limit, cursor)
- **Block_Store_Implementation**: A concrete class implementing IPooledBlockStore (e.g., PooledMemoryBlockStore)
- **BrightChainDb**: The top-level database class in brightchain-db that uses IBlockStore
- **Collection**: The document collection class in brightchain-db that performs block I/O through IBlockStore
- **IBlockMetadata**: The existing metadata interface for blocks in brightchain-lib

## Requirements

### Requirement 1: Pool ID Validation

**User Story:** As a developer, I want pool identifiers to be validated against a strict format, so that pool names are consistent, safe, and predictable across the system.

#### Acceptance Criteria

1. THE Pool_ID_Validator SHALL accept pool identifiers matching the pattern `/^[a-zA-Z0-9_-]{1,64}$/`
2. WHEN a pool identifier is empty or exceeds 64 characters, THEN THE Pool_ID_Validator SHALL reject the identifier with a descriptive error
3. WHEN a pool identifier contains characters outside `[a-zA-Z0-9_-]`, THEN THE Pool_ID_Validator SHALL reject the identifier with a descriptive error
4. THE Pool_ID_Validator SHALL treat pool identifiers as case-sensitive (e.g., `"Users"` and `"users"` are distinct pools)
5. THE Pool_ID_Validator SHALL reserve the identifier `"default"` for the Default_Pool

### Requirement 2: Pool-Aware Block Store Interface

**User Story:** As a developer, I want a pool-aware block store interface that extends IBlockStore, so that I can perform block operations scoped to specific pools.

#### Acceptance Criteria

1. THE IPooledBlockStore interface SHALL extend IBlockStore with pool-scoped block operations: `hasInPool`, `getFromPool`, `putInPool`, and `deleteFromPool`
2. THE IPooledBlockStore interface SHALL provide pool management operations: `listPools`, `listBlocksInPool`, `getPoolStats`, and `deletePool`
3. WHEN `hasInPool` is called with a valid PoolId and hash, THE IPooledBlockStore SHALL return true only if a block with that hash exists in the specified pool
4. WHEN `getFromPool` is called with a valid PoolId and hash, THE IPooledBlockStore SHALL return the block data from the specified pool
5. IF `getFromPool` is called with a hash that does not exist in the specified pool, THEN THE IPooledBlockStore SHALL throw a descriptive error
6. WHEN `putInPool` is called with a valid PoolId and data, THE IPooledBlockStore SHALL store the block in the specified pool and return the block hash
7. WHEN `deleteFromPool` is called with a valid PoolId and hash, THE IPooledBlockStore SHALL remove the block from the specified pool
8. WHEN `listPools` is called, THE IPooledBlockStore SHALL return all pool identifiers that contain at least one block
9. WHEN `listBlocksInPool` is called with a valid PoolId, THE IPooledBlockStore SHALL return an async iterable of block hashes in that pool
10. THE `listBlocksInPool` method SHALL support pagination through ListOptions (limit and cursor)

### Requirement 3: Storage Key Format

**User Story:** As a developer, I want a consistent internal key format that combines pool and hash, so that blocks are correctly namespaced in the underlying storage.

#### Acceptance Criteria

1. THE Block_Store_Implementation SHALL construct internal Storage_Keys using the format `${poolId}:${hash}`
2. THE Block_Store_Implementation SHALL parse a Storage_Key back into its constituent PoolId and hash components
3. FOR ALL valid PoolId and hash combinations, constructing a Storage_Key and then parsing the Storage_Key SHALL yield the original PoolId and hash (round-trip property)
4. WHEN two blocks have the same hash but different PoolIds, THE Block_Store_Implementation SHALL store them as separate entries with distinct Storage_Keys

### Requirement 4: Pool Statistics

**User Story:** As a developer, I want to retrieve statistics about a pool, so that I can monitor storage usage and manage pool lifecycles.

#### Acceptance Criteria

1. WHEN `getPoolStats` is called with a valid PoolId, THE IPooledBlockStore SHALL return a PoolStats object containing: poolId, blockCount, totalBytes, createdAt, and lastAccessedAt
2. WHEN a block is added to a pool, THE Block_Store_Implementation SHALL update the pool's blockCount and totalBytes accordingly
3. WHEN a block is removed from a pool, THE Block_Store_Implementation SHALL update the pool's blockCount and totalBytes accordingly
4. IF `getPoolStats` is called for a pool that does not exist, THEN THE IPooledBlockStore SHALL throw a descriptive error

### Requirement 5: Pool Deletion

**User Story:** As a developer, I want to delete an entire pool and all its blocks, so that I can clean up storage when a database or tenant is removed.

#### Acceptance Criteria

1. WHEN `deletePool` is called with a valid PoolId, THE IPooledBlockStore SHALL remove all blocks belonging to that pool
2. WHEN `deletePool` completes, THE IPooledBlockStore SHALL remove the pool from the list returned by `listPools`
3. WHEN `deletePool` is called for the Default_Pool, THE IPooledBlockStore SHALL remove all blocks in the Default_Pool
4. IF `deletePool` is called for a pool that does not exist, THEN THE IPooledBlockStore SHALL complete without error

### Requirement 6: Backward Compatibility

**User Story:** As a developer, I want existing unpooled block operations to continue working unchanged, so that legacy code is not broken by the introduction of pools.

#### Acceptance Criteria

1. WHEN a legacy `has` method is called on IPooledBlockStore, THE IPooledBlockStore SHALL delegate to `hasInPool` with the Default_Pool
2. WHEN a legacy `put` method is called on IPooledBlockStore, THE IPooledBlockStore SHALL delegate to `putInPool` with the Default_Pool
3. WHEN a legacy `getData` method is called on IPooledBlockStore, THE IPooledBlockStore SHALL delegate to `getFromPool` with the Default_Pool
4. WHEN a legacy `delete` method is called on IPooledBlockStore, THE IPooledBlockStore SHALL delegate to `deleteFromPool` with the Default_Pool
5. FOR ALL blocks stored via legacy methods, retrieving the block via `getFromPool` with the Default_Pool SHALL return the same data

### Requirement 7: Block Metadata Extension

**User Story:** As a developer, I want block metadata to optionally include the pool identifier, so that metadata queries can be pool-aware.

#### Acceptance Criteria

1. THE IBlockMetadata interface SHALL include an optional `poolId` field of type PoolId
2. WHEN a block is stored in a specific pool, THE Block_Store_Implementation SHALL set the `poolId` field in the block's metadata to the corresponding PoolId
3. WHEN a block is stored via a legacy (unpooled) method, THE Block_Store_Implementation SHALL set the `poolId` field to `"default"` or leave it undefined

### Requirement 8: Pooled Memory Block Store Implementation

**User Story:** As a developer, I want an in-memory implementation of IPooledBlockStore, so that I can use pool-scoped storage in tests and development.

#### Acceptance Criteria

1. THE PooledMemoryBlockStore SHALL implement the full IPooledBlockStore interface
2. THE PooledMemoryBlockStore SHALL store blocks in memory using Storage_Keys as map keys
3. WHEN `putInPool` is called, THE PooledMemoryBlockStore SHALL compute the block hash, construct the Storage_Key, and store the block
4. WHEN `getFromPool` is called, THE PooledMemoryBlockStore SHALL construct the Storage_Key and retrieve the block from the internal map
5. THE PooledMemoryBlockStore SHALL maintain per-pool statistics that are updated on every put and delete operation

### Requirement 9: Cross-Pool Isolation

**User Story:** As a developer, I want blocks in different pools to be fully isolated, so that operations on one pool do not affect another.

#### Acceptance Criteria

1. WHEN a block is stored in pool A, THE Block_Store_Implementation SHALL ensure that `hasInPool` for pool B with the same hash returns false
2. WHEN a pool is deleted, THE Block_Store_Implementation SHALL ensure that blocks in other pools remain unaffected
3. WHEN `listBlocksInPool` is called for pool A, THE Block_Store_Implementation SHALL return only hashes belonging to pool A

### Requirement 10: Database Layer Pool Integration

**User Story:** As a developer, I want BrightChainDb to route its block operations through a pool, so that each database instance has isolated storage.

#### Acceptance Criteria

1. WHEN a BrightChainDb instance is created with a pool-aware block store, THE BrightChainDb SHALL accept an optional poolId parameter
2. WHEN a BrightChainDb instance has a poolId configured, THE Collection class SHALL route all block store operations (has, get, put) through the corresponding pool-scoped methods
3. WHEN a BrightChainDb instance does not have a poolId configured, THE Collection class SHALL use legacy (unpooled) block store methods for backward compatibility
4. WHEN a BrightChainDb database is dropped, THE BrightChainDb SHALL delete the corresponding pool if a poolId was configured
