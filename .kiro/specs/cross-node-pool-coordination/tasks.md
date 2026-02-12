# Implementation Plan: Cross-Node Pool Coordination

## Overview

Add pool awareness to BrightChain's cross-node networking layer. Shared interfaces go in `brightchain-lib`, Node.js implementations go in `brightchain-api-lib`. The implementation builds incrementally: extend interfaces first, then update implementations, then wire everything together. Each step builds on the previous one with no orphaned code.

## Tasks

- [ ] 1. Extend BlockAnnouncement and validation with pool support (brightchain-lib)
  - [ ] 1.1 Add optional `poolId` field to `BlockAnnouncement` interface and extend `type` union to include `'pool_deleted'` in `brightchain-lib/src/lib/interfaces/availability/gossipService.ts`
    - Add `poolId?: PoolId` field to `BlockAnnouncement`
    - Change type to `'add' | 'remove' | 'ack' | 'pool_deleted'`
    - Update `VALID_ANNOUNCEMENT_TYPES` constant to include `'pool_deleted'`
    - Update `validateBlockAnnouncement` to validate `poolId` format when present (using `isValidPoolId` from pool-based-storage-isolation)
    - Add validation: `pool_deleted` requires valid `poolId`, must not have `messageDelivery` or `deliveryAck`
    - Import `PoolId` and `isValidPoolId` from storage interfaces
    - _Requirements: 1.5, 1.6, 2.1_

  - [ ]* 1.2 Write property test for announcement validation with poolId
    - **Property 3: Announcement validation rejects invalid poolIds**
    - **Validates: Requirements 1.6, 2.1**

- [ ] 2. Add Pool Deletion Tombstone interface and extend IGossipService (brightchain-lib)
  - [ ] 2.1 Create `IPoolDeletionTombstone` interface and `PoolDeletionTombstoneConfig` in `brightchain-lib/src/lib/interfaces/availability/poolDeletionTombstone.ts`
    - Define `IPoolDeletionTombstone` with `poolId`, `deletedAt`, `expiresAt`, `originNodeId`
    - Define `PoolDeletionTombstoneConfig` with `tombstoneTtlMs`
    - Define `DEFAULT_TOMBSTONE_CONFIG` constant (7 days)
    - Export from availability barrel
    - _Requirements: 2.5_

  - [ ] 2.2 Extend `IGossipService` interface in `brightchain-lib/src/lib/interfaces/availability/gossipService.ts`
    - Update `announceBlock` signature to accept optional `poolId` parameter: `announceBlock(blockId: string, poolId?: PoolId): Promise<void>`
    - Update `announceRemoval` signature to accept optional `poolId` parameter: `announceRemoval(blockId: string, poolId?: PoolId): Promise<void>`
    - Add `announcePoolDeletion(poolId: PoolId): Promise<void>` method
    - _Requirements: 1.1, 2.2, 6.3_

- [ ] 3. Extend ILocationRecord with pool context (brightchain-lib)
  - [ ] 3.1 Add optional `poolId` field to `ILocationRecord` and update serialization in `brightchain-lib/src/lib/interfaces/availability/locationRecord.ts`
    - Add `poolId?: PoolId` to `ILocationRecord`
    - Add `poolId?: string` to `SerializedLocationRecord`
    - Update `locationRecordToJSON` to include `poolId` when present
    - Update `locationRecordFromJSON` to parse and validate `poolId` when present
    - Update `blockMetadataWithLocationToJSON` and `blockMetadataWithLocationFromJSON` to propagate `poolId`
    - _Requirements: 5.1, 5.4_

  - [ ]* 3.2 Write property test for location record poolId round-trip serialization
    - **Property 12: Location record poolId round-trip serialization**
    - **Validates: Requirements 5.4**

- [ ] 4. Extend IBlockRegistry with pool-scoped exports (brightchain-lib)
  - [ ] 4.1 Add `PoolScopedBloomFilter`, `PoolScopedManifest` interfaces and extend `IBlockRegistry` in `brightchain-lib/src/lib/interfaces/availability/blockRegistry.ts`
    - Define `PoolScopedBloomFilter` interface with `filters: Map<PoolId, BloomFilter>` and `globalFilter: BloomFilter`
    - Define `PoolScopedManifest` interface with `nodeId`, `pools: Map<PoolId, string[]>`, `generatedAt`, `checksum`
    - Add `exportPoolScopedBloomFilter(): PoolScopedBloomFilter` to `IBlockRegistry`
    - Add `exportPoolScopedManifest(): PoolScopedManifest` to `IBlockRegistry`
    - Update `addLocal` and `removeLocal` signatures to accept optional `poolId`: `addLocal(blockId: string, poolId?: PoolId): void`
    - _Requirements: 3.5, 4.5_

  - [ ]* 4.2 Write property test for pool-scoped manifest export
    - **Property 7: Pool-scoped manifest groups blocks by pool**
    - **Validates: Requirements 3.1, 3.5**

- [ ] 5. Extend IDiscoveryProtocol with pool-scoped discovery (brightchain-lib)
  - [ ] 5.1 Update `IDiscoveryProtocol` and `DiscoveryResult` in `brightchain-lib/src/lib/interfaces/availability/discoveryProtocol.ts`
    - Add optional `poolId?: PoolId` to `DiscoveryResult`
    - Update `discoverBlock` signature: `discoverBlock(blockId: string, poolId?: PoolId): Promise<DiscoveryResult>`
    - Add `getPeerPoolScopedBloomFilter(peerId: string): Promise<PoolScopedBloomFilter>` method
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Extend ReconciliationResult with pool statistics (brightchain-lib)
  - [ ] 6.1 Add pool-scoped fields to `ReconciliationResult` in `brightchain-lib/src/lib/interfaces/availability/reconciliationService.ts`
    - Add optional `poolStats?: Map<PoolId, { blocksDiscovered: number; blocksUpdated: number }>` to `ReconciliationResult`
    - Add optional `skippedPools?: PoolId[]` to `ReconciliationResult`
    - _Requirements: 3.6_

- [ ] 7. Checkpoint - Ensure all brightchain-lib interface changes compile cleanly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Update GossipService implementation with pool support (brightchain-api-lib)
  - [ ] 8.1 Update `GossipService` in `brightchain-api-lib/src/lib/availability/gossipService.ts`
    - Update `announceBlock(blockId, poolId?)` to include `poolId` in the `BlockAnnouncement` when provided
    - Update `announceRemoval(blockId, poolId?)` to include `poolId` in the `BlockAnnouncement` when provided
    - Add `announcePoolDeletion(poolId)` method that creates a `pool_deleted` announcement with empty `blockId`
    - Update `handleAnnouncement` to handle `pool_deleted` type: dispatch to handlers and forward with decremented TTL
    - Ensure all forwarded announcements preserve the `poolId` field
    - _Requirements: 1.1, 1.2, 2.2, 2.7, 6.3_

  - [ ]* 8.2 Write property test for gossip pool announcement creation
    - **Property 1: Block announcements include pool context**
    - **Validates: Requirements 1.1, 6.3**

  - [ ]* 8.3 Write property test for gossip poolId preservation during forwarding
    - **Property 2: Gossip preserves poolId during forwarding**
    - **Validates: Requirements 1.2, 2.7**

  - [ ]* 8.4 Write property test for pool deletion announcement creation
    - **Property 4: Pool deletion creates correct announcement**
    - **Validates: Requirements 2.2**

- [ ] 9. Update AvailabilityAwareBlockStore with pool-aware announcements and tombstones (brightchain-api-lib)
  - [ ] 9.1 Add tombstone tracking and pool-aware storage to `AvailabilityAwareBlockStore` in `brightchain-api-lib/src/lib/stores/availabilityAwareBlockStore.ts`
    - Add `tombstones: Map<PoolId, IPoolDeletionTombstone>` private field
    - Add `tombstoneConfig: PoolDeletionTombstoneConfig` to config with default
    - Add `hasTombstone(poolId: PoolId): boolean` private method (checks existence and expiry)
    - Update `setData` to check tombstone before storing, throw `PoolDeletionTombstoneError` if active
    - Update `setData` to include `poolId` from block metadata in gossip announcement
    - Update `setData` to include `poolId` in location record
    - Update `deleteData` to include `poolId` in gossip removal announcement
    - Add `handlePoolDeletion(poolId, originNodeId)` method: record tombstone, call `forceDeletePool` on inner store, remove from registry
    - Add `PoolDeletionTombstoneError` class
    - _Requirements: 1.1, 1.3, 2.3, 2.4, 2.5, 2.6, 5.2_

  - [ ]* 9.2 Write property test for pool deletion cleanup
    - **Property 5: Pool deletion cleanup removes all pool blocks and registry entries**
    - **Validates: Requirements 2.3, 2.4**

  - [ ]* 9.3 Write property test for tombstone blocking storage
    - **Property 6: Tombstone blocks storage in deleted pool**
    - **Validates: Requirements 2.5, 2.6**

  - [ ]* 9.4 Write property test for location records including pool context
    - **Property 11: Location records include pool context**
    - **Validates: Requirements 5.2**

  - [ ]* 9.5 Write property test for received blocks stored in announced pool
    - **Property 15: Received blocks stored in announced pool**
    - **Validates: Requirements 1.3**

- [ ] 10. Checkpoint - Ensure gossip and store changes pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement pool-scoped discovery and Bloom filter support (brightchain-api-lib)
  - [ ] 11.1 Update `IBlockRegistry` implementations to support pool-scoped addLocal/removeLocal and pool-scoped exports
    - Update internal data structure to track `blockId → poolId` mapping
    - Implement `addLocal(blockId, poolId?)` to record pool association
    - Implement `removeLocal(blockId, poolId?)` to remove pool association
    - Implement `exportPoolScopedBloomFilter()` using keys in `"poolId:blockId"` format
    - Implement `exportPoolScopedManifest()` grouping block IDs by pool
    - _Requirements: 3.5, 4.5_

  - [ ]* 11.2 Write property test for pool-scoped Bloom filter accuracy
    - **Property 10: Pool-scoped Bloom filter eliminates cross-pool false positives**
    - **Validates: Requirements 4.2, 4.5, 4.6**

- [ ] 12. Implement pool-scoped reconciliation (brightchain-api-lib)
  - [ ] 12.1 Update `IReconciliationService` implementation to use pool-scoped manifests
    - Update `reconcile` to exchange `PoolScopedManifest` instead of flat `BlockManifest`
    - Compare manifests per-pool, identifying missing blocks within each pool
    - Store synchronized blocks in the correct pool via `putInPool`
    - Skip pools with active deletion tombstones
    - Populate `poolStats` and `skippedPools` in `ReconciliationResult`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ]* 12.2 Write property test for reconciliation storing blocks in correct pool
    - **Property 8: Reconciliation stores blocks in correct pool**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 12.3 Write property test for reconciliation skipping tombstoned pools
    - **Property 9: Reconciliation skips tombstoned pools**
    - **Validates: Requirements 3.4**

- [ ] 13. Implement pool-aware replication tracking (brightchain-api-lib)
  - [ ] 13.1 Update replication tracking in `AvailabilityAwareBlockStore` to be pool-scoped
    - Update `recordReplication` to include `poolId` in location records
    - Update `getBlocksPendingReplication` and `getUnderReplicatedBlocks` to scope replication counts by pool
    - A block's replication count for pool P = number of distinct nodes with a location record for that block with `poolId: P`
    - _Requirements: 6.1, 6.2_

  - [ ]* 13.2 Write property test for pool-scoped replication counting
    - **Property 14: Pool-scoped replication counting**
    - **Validates: Requirements 6.1, 6.2**

- [ ] 14. Implement distinct location records for different pool placements (brightchain-api-lib)
  - [ ] 14.1 Update `IAvailabilityService` implementation to treat location records with different poolIds as distinct
    - When updating a location for a block, use `(nodeId, poolId)` as the composite key instead of just `nodeId`
    - `getBlockLocations` returns all location records; add filtering support by poolId
    - _Requirements: 5.3, 5.5_

  - [ ]* 14.2 Write property test for distinct location records
    - **Property 13: Distinct location records for different pool placements**
    - **Validates: Requirements 5.5**

- [ ] 15. Update exports and ensure cross-project compatibility
  - [ ] 15.1 Ensure all new types are exported from `brightchain-lib` public API
    - Export `IPoolDeletionTombstone`, `PoolDeletionTombstoneConfig`, `DEFAULT_TOMBSTONE_CONFIG` from availability barrel
    - Export `PoolScopedBloomFilter`, `PoolScopedManifest` from availability barrel
    - Export `PoolDeletionTombstoneError` from errors
    - _Requirements: 1.5, 2.1, 2.5_

- [ ] 16. Final checkpoint - Ensure all tests pass across both projects
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with minimum 100 iterations per property
- All new interface fields are optional to maintain backward compatibility with existing code
- This spec depends on pool-based-storage-isolation (done) and builds alongside pool-scoped-whitening and cross-node-eventual-consistency
- Shared interfaces go in `brightchain-lib`, Node.js implementations go in `brightchain-api-lib`
