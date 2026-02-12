# Implementation Plan: Pool-Based Storage Isolation

## Overview

Implement pool-based namespace isolation for BrightChain's block store. New interfaces and types go in `brightchain-lib`, the database integration goes in `brightchain-db`. The implementation builds incrementally: types/validation first, then the interface, then the in-memory implementation, then the database adapter, and finally wiring it all together.

## Tasks

- [x] 1. Define PoolId type, validation, and storage key utilities in brightchain-lib
  - [x] 1.1 Create `brightchain-lib/src/lib/interfaces/storage/pooledBlockStore.ts` with: `PoolId` type, `DEFAULT_POOL` constant, `validatePoolId` function, `isValidPoolId` function, `makeStorageKey` function, `parseStorageKey` function, `ListOptions` interface, and `PoolStats` interface
    - Export all new types from `brightchain-lib/src/lib/interfaces/storage/index.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3_
  - [x] 1.2 Write property test for pool ID validation
    - **Property 1: Pool ID validation accepts exactly valid identifiers**
    - **Validates: Requirements 1.1, 1.2, 1.3**
  - [x] 1.3 Write property test for storage key round-trip
    - **Property 2: Storage key round-trip**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [x] 1.4 Write unit tests for pool ID edge cases
    - Test empty string, 64-char boundary, 65-char string, special characters, case sensitivity ("Users" vs "users"), "default" reservation
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 2. Define IPooledBlockStore interface and extend IBlockMetadata
  - [x] 2.1 Add `IPooledBlockStore` interface to `brightchain-lib/src/lib/interfaces/storage/pooledBlockStore.ts` extending `IBlockStore` with pool-scoped operations (`hasInPool`, `getFromPool`, `putInPool`, `deleteFromPool`) and pool management operations (`listPools`, `listBlocksInPool`, `getPoolStats`, `deletePool`)
    - Export the interface from the storage index barrel
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Add optional `poolId` field of type `PoolId` to `IBlockMetadata` in `brightchain-lib/src/lib/interfaces/storage/blockMetadata.ts`
    - Update `createDefaultBlockMetadata` to accept optional `poolId`
    - _Requirements: 7.1_
  - [x] 2.3 Add `isPooledBlockStore` type guard function to `pooledBlockStore.ts`
    - Checks for presence of `hasInPool`, `putInPool`, `getFromPool`, `deleteFromPool` methods
    - Export from storage index barrel
    - _Requirements: 10.1_

- [x] 3. Checkpoint - Ensure interfaces compile cleanly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement PooledMemoryBlockStore in brightchain-lib
  - [x] 4.1 Create `brightchain-lib/src/lib/stores/pooledMemoryBlockStore.ts` implementing `IPooledBlockStore`
    - Extend or compose with `MemoryBlockStore` for legacy method delegation
    - Use `Map<string, Uint8Array>` keyed by storage keys for pool-scoped storage
    - Use `Map<PoolId, PoolStats>` for per-pool statistics
    - Implement all pool-scoped CRUD: `hasInPool`, `getFromPool`, `putInPool`, `deleteFromPool`
    - Implement pool management: `listPools`, `listBlocksInPool` (with pagination via `ListOptions`), `getPoolStats`, `deletePool`
    - Legacy methods (`has`, `get`, `put`, `delete`, `getData`, `setData`, `deleteData`) delegate to `DEFAULT_POOL`
    - Set `poolId` in block metadata on storage
    - Export from `brightchain-lib/src/lib/stores/` barrel if one exists
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3_
  - [x] 4.2 Write property test for put/get round-trip
    - **Property 3: Put/get round-trip within a pool**
    - **Validates: Requirements 2.4, 2.6, 8.3, 8.4**
  - [x] 4.3 Write property test for cross-pool isolation
    - **Property 4: Cross-pool isolation**
    - **Validates: Requirements 2.3, 3.4, 9.1**
  - [x] 4.4 Write property test for delete removes block
    - **Property 5: Delete removes block from pool**
    - **Validates: Requirements 2.7**
  - [x] 4.5 Write property test for pool stats consistency
    - **Property 6: Pool stats consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3, 8.5**
  - [x] 4.6 Write property test for deletePool removes exactly target pool
    - **Property 7: deletePool removes exactly the target pool**
    - **Validates: Requirements 5.1, 5.2, 9.2**
  - [x] 4.7 Write property test for listPools correctness
    - **Property 8: listPools returns exactly pools with blocks**
    - **Validates: Requirements 2.8**
  - [x] 4.8 Write property test for listBlocksInPool correctness
    - **Property 9: listBlocksInPool returns exactly the pool's hashes**
    - **Validates: Requirements 2.9, 9.3**
  - [x] 4.9 Write property test for legacy/pool equivalence
    - **Property 10: Legacy operations equivalent to default pool**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
  - [x] 4.10 Write property test for metadata poolId
    - **Property 11: Metadata poolId matches storage pool**
    - **Validates: Requirements 7.2, 7.3**
  - [x] 4.11 Write property test for pagination
    - **Property 14: Pagination in listBlocksInPool**
    - **Validates: Requirements 2.10**
  - [x] 4.12 Write unit tests for error conditions
    - Test `getFromPool` on missing block throws error
    - Test `getPoolStats` on missing pool throws error
    - Test `deletePool` on non-existent pool completes without error
    - Test `deletePool` on default pool
    - _Requirements: 2.5, 4.4, 5.3, 5.4_

- [x] 5. Checkpoint - Ensure all brightchain-lib tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement PooledStoreAdapter and BrightChainDb integration in brightchain-db
  - [x] 6.1 Create `brightchain-db/src/lib/pooledStoreAdapter.ts` implementing `IBlockStore`
    - Constructor takes `IPooledBlockStore` and `PoolId`
    - All `IBlockStore` methods delegate to pool-scoped methods on the inner store
    - `has(key)` → `inner.hasInPool(poolId, key)`
    - `put(key, data)` → `inner.putInPool(poolId, data)`
    - `get(key)` → construct pool-prefixed key and delegate to `inner.get()`
    - Other methods (metadata, parity, replication, etc.) delegate to inner store directly
    - _Requirements: 10.2_
  - [x] 6.2 Update `BrightChainDbOptions` in `brightchain-db/src/lib/database.ts` to add optional `poolId: PoolId` field
    - In the constructor, if `poolId` is provided and `isPooledBlockStore(blockStore)` is true, wrap the store in `PooledStoreAdapter`
    - Add a `dropDatabase` method that calls `deletePool` on the underlying store if poolId was configured
    - _Requirements: 10.1, 10.2, 10.4_
  - [x] 6.3 Write property test for database pool routing
    - **Property 12: Database pool routing**
    - **Validates: Requirements 10.2**
  - [x] 6.4 Write property test for database drop deletes pool
    - **Property 13: Database drop deletes pool**
    - **Validates: Requirements 10.4**
  - [x] 6.5 Write unit tests for BrightChainDb pool integration
    - Test constructor with poolId wraps store in adapter
    - Test constructor without poolId uses store directly
    - Test two databases with different pools sharing same store are isolated
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 7. Update exports and ensure cross-project compatibility
  - [x] 7.1 Ensure all new types and classes are exported from `brightchain-lib` public API
    - Update `brightchain-lib/src/lib/interfaces/storage/index.ts` barrel
    - Update any top-level barrel exports (e.g., `brightchain-lib/src/index.ts` or `browser.ts`) if needed
    - _Requirements: 2.1, 2.2_
  - [x] 7.2 Update `brightchain-db` mock block store (`src/__tests__/helpers/mockBlockStore.ts`) to optionally support pool methods for testing
    - Create a `MockPooledBlockStore` extending `MockBlockStore` that implements `IPooledBlockStore`
    - _Requirements: 8.1, 10.2_

- [x] 8. Final checkpoint - Ensure all tests pass across both projects
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Analyze multi-node operation and what happens to blocks with a cross-node database query involving multiple blocks and how to successfully query related blocks
  - Consider if further development needs to occur to facilitate this

- [x] 10. Now, normally brightchain is write-only with immutable blocks:
  - however pools bring about the thought that this might be the only case where you might want to delete a collection of blocks when a pool is deleted? is this a valid case? Is this a safe case? how intermingled are these blocks with the rest of the database? are they xored with other blocks in normal use? are they separate? if they're logically separate we can delete- if there's any chance they're ever xored with other blocks to make new blocks, they have to stay.
  - Should a case be made for a 'no mingling' option where pool blocks are never xored with non-pool or other pool blocks? This would facilitate a 'clean delete'.
  - How would that be handled across nodes?
  - I see you implemented pool deletion, but is it safe? Have the blocks mingled with other blocks or are the logically held separate in some manner to prevent this, both on the originating node and others?
  - What is your proposal for pool deletion given this?

  ### Analysis: Pool Deletion Safety and Block Mingling

  #### Is pool deletion safe as currently implemented?

  **No. The current `deletePool` implementation is NOT safe for production use.** Here's why:

  ##### How blocks get mingled via XOR (the OFF whitening pattern)

  BrightChain's Owner Free Filesystem (OFF) pattern works like this:

  1. A source data block is created (e.g., from a document in a pool-scoped `BrightChainDb`).
  2. The `TupleService` (or `MemberCblService`) fetches random blocks via `getRandomBlocks()` from the block store.
  3. The source block is XORed with those random/whitened blocks to produce a "prime whitened" block.
  4. A tuple of `[whitenedBlock, randomBlock1, randomBlock2]` is stored. All three blocks are needed to reconstruct the original data.
  5. A CBL (Constituent Block List) records the addresses of all tuple members.

  The critical problem: **`getRandomBlocks()` is NOT pool-aware.** In `PooledMemoryBlockStore`, it is inherited from `MemoryBlockStore` and pulls from the global `blocks` map — not from pool-scoped storage. This means:

  - A block stored in Pool A could be used as a random whitener for a block being stored in Pool B (or the default pool).
  - Deleting Pool A would then destroy a block that Pool B's CBL depends on for reconstruction.
  - The CBL in Pool B would become permanently unrecoverable — data loss.

  Even if `getRandomBlocks()` were pool-scoped, the `TupleService.dataStreamToPlaintextTuplesAndCBL()` accepts `whitenedBlockSource` and `randomBlockSource` as callback functions. There is no enforcement that these callbacks return blocks from the same pool as the data being whitened.

  ##### How intermingled are pool blocks with the rest of the database?

  **Highly intermingled in the current design.** Specifically:

  1. **Random block sourcing is global**: `getRandomBlocks()` draws from all stored blocks regardless of pool membership.
  2. **No pool constraint on tuples**: `BlockHandleTuple` validates block sizes match but has zero awareness of pools. Any block from any pool can be in a tuple with any other.
  3. **CBL addresses are pool-blind**: A CBL stores raw checksums of its constituent blocks. It doesn't record which pool each block belongs to. During hydration (`getHandleTuples`), it fetches blocks by checksum from whatever store is provided — no pool scoping.
  4. **The `PooledStoreAdapter` wraps at the database level**, but the whitening/tuple layer operates below that, directly on the block store.

  ##### Are pool blocks logically separate?

  **No.** The pool isolation implemented so far is a storage-level namespace (key prefix). It does NOT extend to the XOR/whitening layer. Pool blocks and non-pool blocks freely intermingle during tuple creation.

  #### Should there be a "no mingling" option?

  **Yes, absolutely.** A "no mingling" constraint is the only way to make pool deletion safe. Without it, deleting any pool risks breaking XOR reconstruction chains in other pools.

  #### Proposal for safe pool deletion

  There are three viable approaches, in order of recommendation:

  ##### Option A: Pool-Scoped Whitening (Recommended for Phase 1)

  Enforce that all blocks in a tuple belong to the same pool. This means:

  1. **Pool-scoped `getRandomBlocks`**: Override `getRandomBlocks` in `PooledMemoryBlockStore` (and any disk-backed store) to only return blocks from the current pool. The `PooledStoreAdapter` already routes `has`/`get`/`put` through a fixed pool — extend this to `getRandomBlocks`.
  2. **Pool-aware tuple creation**: The `TupleService` callbacks (`whitenedBlockSource`, `randomBlockSource`) must be constrained to the active pool. When `BrightChainDb` creates tuples through its adapter, the adapter ensures random blocks come from the same pool.
  3. **Seed random blocks per pool**: When a pool is first created, pre-populate it with a set of `RandomBlock` instances so that whitening has material to work with. Without this, a new empty pool would have no random blocks to XOR against.
  4. **Validation in `BlockHandleTuple`**: Optionally add a pool-consistency check in the tuple constructor. This would require blocks/handles to carry pool metadata, which they currently don't.

  With this constraint, all blocks referenced by a pool's CBLs are guaranteed to live within that same pool. Deleting the pool removes a self-contained set of blocks with no external dependencies.

  **Trade-off**: Reduces the entropy pool for whitening (fewer random blocks to choose from per pool). For small pools this could be a concern, but can be mitigated by seeding.

  ##### Option B: Soft Delete with Reference Counting

  Don't physically delete blocks. Instead:

  1. Add a `refCount` or `dependentPools: Set<PoolId>` field to block metadata.
  2. When a block is used in a tuple for pool X, record that dependency.
  3. `deletePool` marks all blocks as "logically deleted" for that pool.
  4. A block is only physically removed when its `dependentPools` set is empty.
  5. `listBlocksInPool` and `hasInPool` respect the logical deletion flag.

  **Trade-off**: More complex bookkeeping. Blocks may linger indefinitely if cross-pool references exist. Doesn't truly "clean up" storage.

  ##### Option C: Immutable Pools (No Deletion)

  Accept that pools, like blocks, are immutable once created. `deletePool` becomes a no-op or is removed entirely. Pools can be "archived" (hidden from `listPools`) but their blocks remain.

  **Trade-off**: Simplest to implement, but doesn't address the user's need for storage cleanup.

  #### Cross-node implications

  Regardless of which option is chosen:

  1. **Replication is pool-blind today**: The `AvailabilityAwareBlockStore` and gossip layer replicate blocks by checksum. Remote nodes don't know which pool a block belongs to (the cross-node design's `IBlockFetchTransport.fetchBlockFromNode` accepts an optional `poolId`, but this is for routing, not enforcement).
  2. **Pool deletion must be coordinated**: If Node A deletes Pool X, but Node B has replicated some of Pool X's blocks (possibly as whiteners for its own pools), Node B's data could break. The cross-node eventual consistency spec would need a "pool deletion event" in the gossip protocol.
  3. **With Option A (pool-scoped whitening)**: Cross-node deletion becomes safer because replicated blocks from Pool X are only dependencies of Pool X's CBLs. If all nodes agree to delete Pool X, no other pool is affected. This could be implemented as a gossip-propagated deletion tombstone.
  4. **Random blocks should NOT be shared across nodes for different pools**: If Node B fetches a random block from Node A that belongs to Pool X, and uses it in Pool Y's tuple, we're back to the mingling problem. The fetch transport's `poolId` parameter should be enforced, not optional.

  #### Summary

  | Aspect | Current State | Recommended State |
  |--------|--------------|-------------------|
  | Random block sourcing | Global (all pools) | Pool-scoped |
  | Tuple pool consistency | Not enforced | Enforced (all blocks same pool) |
  | CBL pool awareness | None | Blocks carry pool metadata |
  | `deletePool` safety | Unsafe (can break other pools) | Safe with Option A |
  | Cross-node deletion | Not addressed | Gossip-propagated tombstone |
  | New pool bootstrapping | N/A | Seed with random blocks |

  **Recommendation**: Implement Option A (Pool-Scoped Whitening) as a follow-up spec. The current `deletePool` implementation should be documented as unsafe for production use until pool-scoped whitening is in place. In the interim, `deletePool` could log a warning or require an explicit `force: true` flag to acknowledge the risk.

- [x] 11. Analyze- How do we deal with cross-node consistency as a whole?
  - how does it relate to the two new specs we just created (cross-node-eventual-consistency, pool-scoped-whitening)

  ### Analysis: Cross-Node Consistency and How the Three Specs Fit Together

  #### The Three-Spec Architecture

  The pool-based storage isolation work has spawned two follow-up specs that, together with this one, form a layered consistency model:

  | Layer | Spec | Responsibility |
  |-------|------|---------------|
  | Storage namespace | **pool-based-storage-isolation** (this spec) | Key-prefixed block isolation, pool CRUD, pool stats, adapter pattern |
  | XOR integrity | **pool-scoped-whitening** | Ensures tuples are self-contained within a pool; safe deletion; pool bootstrapping |
  | Network consistency | **cross-node-eventual-consistency** | Remote block fetching, read concern levels, fetch queue, gossip-triggered caching |

  These three specs are not independent — they form a dependency chain where each layer assumes the one below it is in place.

  #### How They Relate

  ##### 1. pool-based-storage-isolation → pool-scoped-whitening

  This spec (pool-based-storage-isolation) provides the storage primitives: `IPooledBlockStore`, `PooledMemoryBlockStore`, `PooledStoreAdapter`, storage keys, pool stats. But as analyzed in Task 10, the storage isolation alone is insufficient because the XOR/whitening layer is pool-blind.

  Pool-scoped-whitening closes that gap by:
  - Adding `getRandomBlocksFromPool(pool, count)` to `IPooledBlockStore` so random block sourcing is pool-scoped
  - Fixing `PooledStoreAdapter.getRandomBlocks()` to route through `getRandomBlocksFromPool` — this is the single most critical change, because it makes all existing code using the adapter (including `Collection`, `MemberCblService`, `TupleService` callbacks) automatically pool-safe
  - Adding `bootstrapPool(pool, blockSize, count)` to seed new pools with random blocks for whitening material
  - Adding `validatePoolDeletion(pool)` and `forceDeletePool(pool)` for safe pool lifecycle management
  - Adding optional pool validation to `BlockHandleTuple` and `TupleService` as defense-in-depth

  The dependency is strict: pool-scoped-whitening MUST be implemented before `deletePool` can be considered safe for production use. Until then, `deletePool` risks breaking XOR reconstruction chains in other pools.

  ##### 2. pool-based-storage-isolation → cross-node-eventual-consistency

  This spec provides the pool namespace that cross-node-eventual-consistency must respect when fetching remote blocks. Specifically:

  - `IBlockFetchTransport.fetchBlockFromNode(nodeId, blockId, poolId?)` accepts an optional `poolId` — this parameter exists because of pool-based-storage-isolation
  - When a block is fetched remotely and has pool metadata, the `BlockFetcher` must store it in the correct pool via `putInPool`, not just the global store
  - `PoolMismatchError` (defined in the cross-node spec) rejects fetched blocks whose pool metadata doesn't match the requested pool
  - The `PooledStoreAdapter` transparently routes fetched blocks into the correct pool when `BrightChainDb` is configured with a `poolId`

  ##### 3. pool-scoped-whitening → cross-node-eventual-consistency

  This is the most nuanced relationship. Pool-scoped whitening ensures tuples are self-contained within a pool on the originating node. But cross-node consistency introduces remote block fetching, which creates new pool boundary risks:

  - **Remote random block sourcing**: If Node B fetches a random block from Node A's Pool X and uses it in Pool Y's tuple, we're back to cross-pool mingling. The cross-node spec's `BlockFetcher` must enforce that fetched blocks are stored in the requested pool, and the pool-scoped whitening spec ensures `getRandomBlocks` on the adapter only returns blocks from the current pool.
  - **Tuple reconstruction across nodes**: When a CBL on Node A references blocks that exist on Node B, the `ReadConcern.Consistent` mode will fetch those blocks. Pool-scoped whitening's CBL pool awareness (optional `poolId` in CBL metadata) ensures the reconstruction process verifies all fetched blocks belong to the same pool.
  - **Pool deletion across nodes**: If Node A deletes Pool X, Node B may still have replicated blocks from Pool X. With pool-scoped whitening in place, those blocks are only dependencies of Pool X's CBLs — no other pool references them. So a coordinated pool deletion (via gossip-propagated tombstone) is safe.

  #### The Current State of Cross-Node Consistency

  Today, the codebase has:

  **Implemented (interfaces + some implementations):**
  - `IAvailabilityService` — tracks block availability states (Local, Remote, Cached, Orphaned, Unknown) and location records per block
  - `IBlockRegistry` — fast local index with Bloom filter export for efficient network queries
  - `IGossipService` / `GossipService` — gossip-based block announcements with batching, TTL, fanout, ECIES encryption, message delivery metadata
  - `IDiscoveryProtocol` — Bloom filter pre-checks, concurrent query limiting, latency-based node preference, result caching
  - `IReconciliationService` — manifest exchange, pending sync queue, orphan resolution, conflict resolution (last-write-wins with vector timestamps)
  - `AvailabilityAwareBlockStore` — wraps an inner `IBlockStore` with availability tracking, gossip announcements on put/delete, partition mode handling
  - `SyncController` — exposes `/api/sync/*` endpoints for cross-node operations

  **Not yet implemented (defined in cross-node-eventual-consistency spec):**
  - `ReadConcern` enum (Local, Available, Consistent)
  - `IBlockFetcher` / `BlockFetcher` — remote block retrieval with checksum verification, retry, node health tracking
  - `IFetchQueue` / `FetchQueue` — priority queue with deduplication and concurrency limiting
  - `IBlockFetchTransport` / `HttpBlockFetchTransport` — HTTP transport for remote block data retrieval
  - `IEnrichedQueryResult<T>` — query results with availability metadata
  - `Collection.findWithAvailability()` — availability-aware queries
  - Gossip-triggered proactive fetching
  - `GET /api/sync/blocks/:blockId` endpoint for block data retrieval

  **Not yet implemented (defined in pool-scoped-whitening spec):**
  - `getRandomBlocksFromPool` on `IPooledBlockStore`
  - `PooledStoreAdapter.getRandomBlocks` routing fix
  - `bootstrapPool` for pool seeding
  - `validatePoolDeletion` / `forceDeletePool` for safe pool lifecycle
  - Pool validation in `BlockHandleTuple` and `TupleService`
  - CBL pool awareness

  #### The Gap: What's Missing for Full Cross-Node Pool Consistency

  Even after all three specs are implemented, there are coordination gaps at the network level:

  1. **Pool deletion gossip event**: The gossip protocol currently supports `add` and `remove` announcement types for individual blocks, plus `ack` for delivery acknowledgments. There is no `pool_deleted` announcement type. When a pool is deleted on one node, other nodes that have replicated blocks from that pool need to be notified. This should be a new announcement type in the gossip protocol, propagated as a tombstone.

  2. **Pool-aware replication targets**: The `AvailabilityAwareBlockStore.setData()` announces blocks via gossip and tracks replication, but it's pool-blind. When a block is stored in a pool, the gossip announcement should include the pool ID so receiving nodes can store it in the correct pool namespace. The `BlockAnnouncement` interface would need an optional `poolId` field.

  3. **Pool-aware reconciliation**: The `IReconciliationService` exchanges manifests (lists of block IDs) for synchronization after partition recovery. These manifests are currently flat lists of checksums with no pool context. After reconciliation, blocks could end up in the wrong pool on the recovering node. Manifests should be pool-scoped: `Map<PoolId, string[]>` instead of `string[]`.

  4. **Pool-aware discovery**: The `IDiscoveryProtocol` uses Bloom filters for efficient block existence queries. These filters are currently global. A node querying "does anyone have block X in pool Y?" would get false positives from nodes that have block X in pool Z. Pool-scoped Bloom filters (one per pool, or a composite filter with pool-prefixed keys) would improve accuracy.

  5. **Pool metadata in location records**: `ILocationRecord` tracks `nodeId`, `lastSeen`, and `isAuthoritative` for each block. It doesn't record which pool the block is in on that node. A block could exist in Pool X on Node A and Pool Y on Node B — the location record doesn't distinguish these.

  #### Recommended Implementation Order

  Given the dependencies:

  ```
  1. pool-based-storage-isolation  ← DONE (this spec)
  2. pool-scoped-whitening         ← NEXT (makes deletePool safe, fixes XOR layer)
  3. cross-node-eventual-consistency ← AFTER (adds remote fetch, read concerns)
  4. Cross-node pool coordination   ← FUTURE (gossip pool events, pool-aware replication/reconciliation/discovery)
  ```

  Step 4 is not yet specced. It would be a fourth spec covering:
  - `pool_deleted` gossip announcement type with tombstone propagation
  - `poolId` field on `BlockAnnouncement` for pool-aware replication
  - Pool-scoped manifests in `IReconciliationService`
  - Pool-scoped Bloom filters in `IBlockRegistry`
  - `poolId` field on `ILocationRecord`

  This fourth spec should be created after pool-scoped-whitening and cross-node-eventual-consistency are implemented, since it builds on both.

  #### Summary

  | Question | Answer |
  |----------|--------|
  | How do we deal with cross-node consistency? | Three-layer approach: storage namespace (done) → XOR integrity (pool-scoped-whitening) → network consistency (cross-node-eventual-consistency) |
  | Are the three specs independent? | No. They form a dependency chain. Pool-scoped-whitening depends on this spec. Cross-node-eventual-consistency depends on both. |
  | What's the implementation order? | This spec → pool-scoped-whitening → cross-node-eventual-consistency → (future) cross-node pool coordination |
  | Is there a gap? | Yes. A fourth spec for cross-node pool coordination (gossip pool events, pool-aware replication/reconciliation/discovery) is needed after the other three are complete. |
  | Is `deletePool` safe today? | No. It requires pool-scoped-whitening to be implemented first. Until then, it should be treated as unsafe for production. |
  | Can pools work across nodes today? | Partially. Storage isolation works locally. Remote fetch will respect pool boundaries (via `poolId` parameter and `PoolMismatchError`). But gossip, replication, reconciliation, and discovery are not yet pool-aware. |

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with minimum 100 iterations per property
- Checkpoints ensure incremental validation
- The `PooledStoreAdapter` pattern means `Collection` requires zero changes — all pool routing is handled at the adapter level
