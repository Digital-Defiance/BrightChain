# Requirements Document

## Introduction

This feature adds pool-aware coordination to BrightChain's cross-node networking layer. The three preceding specs established pool-based storage isolation (storage namespace primitives), pool-scoped whitening (XOR integrity within pools), and cross-node eventual consistency (remote block fetching with read concerns). However, the networking layer — gossip, replication, reconciliation, discovery, and location tracking — remains pool-blind.

When a block is stored in a pool on one node and announced via gossip, receiving nodes have no way to know which pool the block belongs to. Reconciliation exchanges flat manifests of checksums with no pool context, so blocks can end up in the wrong pool after partition recovery. Discovery uses global Bloom filters, causing false positives when the same block ID exists in different pools on different nodes. Location records track node presence but not pool membership, making it impossible to distinguish "block X in Pool A on Node 1" from "block X in Pool B on Node 2." Finally, there is no mechanism to propagate pool deletion across nodes.

This spec addresses these five coordination gaps by extending the existing gossip, reconciliation, discovery, location record, and block announcement interfaces with pool awareness.

## Glossary

- **Gossip_Service**: The service responsible for propagating block announcements across the network via a gossip protocol
- **Block_Announcement**: A message sent via the Gossip_Service to inform peers about block additions, removals, or pool deletions
- **Reconciliation_Service**: The service that synchronizes block state between nodes after network partition recovery via manifest exchange
- **Block_Manifest**: A list of block identifiers exchanged during reconciliation to determine which blocks need synchronization
- **Pool_Scoped_Manifest**: A Block_Manifest organized by pool, mapping each Pool_ID to its list of block identifiers
- **Discovery_Protocol**: The service that locates blocks across the network using Bloom filter pre-checks and direct peer queries
- **Bloom_Filter**: A probabilistic data structure used by the Discovery_Protocol for efficient block existence queries
- **Pool_Scoped_Bloom_Filter**: A Bloom_Filter that uses pool-prefixed keys to distinguish blocks in different pools
- **Location_Record**: A record tracking which node holds a copy of a block, including timestamps and authority status
- **Pool_ID**: A string identifier for a storage pool, as defined in pool-based-storage-isolation
- **Availability_Aware_Block_Store**: The block store wrapper that integrates with gossip, availability tracking, and replication
- **Block_Registry**: The local index of blocks that supports Bloom filter export and manifest generation
- **Pool_Deletion_Tombstone**: A time-limited record indicating that a pool has been deleted, propagated via gossip to prevent re-creation of deleted pool data

## Requirements

### Requirement 1: Pool-Aware Block Announcements

**User Story:** As a node operator, I want block announcements to include pool context, so that receiving nodes can store replicated blocks in the correct pool namespace.

#### Acceptance Criteria

1. WHEN the Availability_Aware_Block_Store stores a block in a pool, THE Block_Announcement SHALL include the Pool_ID of the pool the block was stored in
2. WHEN the Gossip_Service receives a Block_Announcement with a Pool_ID, THE Gossip_Service SHALL propagate the Pool_ID to all downstream peers without modification
3. WHEN a node receives a Block_Announcement with a Pool_ID and stores the block locally, THE Availability_Aware_Block_Store SHALL store the block in the pool namespace matching the announced Pool_ID
4. WHEN a node receives a Block_Announcement without a Pool_ID, THE Availability_Aware_Block_Store SHALL store the block in the default pool for backward compatibility
5. THE Block_Announcement interface SHALL include an optional poolId field of type Pool_ID
6. WHEN validating a Block_Announcement with a poolId field, THE Gossip_Service SHALL verify the poolId conforms to the Pool_ID format defined in pool-based-storage-isolation

### Requirement 2: Pool Deletion Gossip Event

**User Story:** As a node operator, I want pool deletions to be propagated across the network, so that all nodes can clean up replicated blocks from a deleted pool.

#### Acceptance Criteria

1. THE Block_Announcement type field SHALL support a "pool_deleted" value in addition to "add", "remove", and "ack"
2. WHEN a pool is deleted on a node, THE Gossip_Service SHALL create a Block_Announcement of type "pool_deleted" with the deleted Pool_ID and propagate the announcement to peers
3. WHEN a node receives a "pool_deleted" announcement, THE Availability_Aware_Block_Store SHALL remove all locally stored blocks belonging to the announced Pool_ID
4. WHEN a node receives a "pool_deleted" announcement, THE Block_Registry SHALL remove all entries for blocks in the deleted pool from the local index
5. WHEN a node receives a "pool_deleted" announcement, THE Availability_Aware_Block_Store SHALL record a Pool_Deletion_Tombstone with a configurable time-to-live
6. WHILE a Pool_Deletion_Tombstone exists for a Pool_ID, THE Availability_Aware_Block_Store SHALL reject storage of blocks with that Pool_ID
7. WHEN a "pool_deleted" announcement is received with a TTL greater than zero, THE Gossip_Service SHALL forward the announcement to peers with a decremented TTL

### Requirement 3: Pool-Scoped Reconciliation

**User Story:** As a node operator, I want reconciliation after partition recovery to respect pool boundaries, so that blocks are synchronized into the correct pool namespace on each node.

#### Acceptance Criteria

1. WHEN the Reconciliation_Service exchanges manifests with a peer, THE Block_Manifest SHALL be organized as a Pool_Scoped_Manifest mapping each Pool_ID to its list of block identifiers
2. WHEN the Reconciliation_Service receives a Pool_Scoped_Manifest from a peer, THE Reconciliation_Service SHALL compare manifests on a per-pool basis, identifying missing blocks within each pool separately
3. WHEN the Reconciliation_Service synchronizes a missing block identified in a Pool_Scoped_Manifest, THE Reconciliation_Service SHALL store the block in the pool namespace indicated by the manifest
4. WHEN the Reconciliation_Service receives a manifest containing a Pool_ID that has a local Pool_Deletion_Tombstone, THE Reconciliation_Service SHALL skip synchronization for that pool
5. THE Block_Registry SHALL support exporting a Pool_Scoped_Manifest that groups block identifiers by their Pool_ID
6. WHEN the Reconciliation_Service processes a Pool_Scoped_Manifest, THE Reconciliation_Service SHALL include per-pool statistics in the ReconciliationResult

### Requirement 4: Pool-Scoped Discovery

**User Story:** As a node operator, I want block discovery queries to include pool context, so that the system can accurately locate blocks within specific pools and avoid false positives from blocks in other pools.

#### Acceptance Criteria

1. THE Discovery_Protocol SHALL accept an optional Pool_ID parameter in the discoverBlock method
2. WHEN a Pool_ID is provided to discoverBlock, THE Discovery_Protocol SHALL use Pool_Scoped_Bloom_Filters that encode pool-prefixed keys to pre-check peer block existence
3. WHEN a Pool_ID is provided to discoverBlock, THE Discovery_Protocol SHALL include the Pool_ID in direct peer queries so peers can check pool-specific storage
4. WHEN a Pool_ID is not provided to discoverBlock, THE Discovery_Protocol SHALL use the existing global Bloom_Filter for backward compatibility
5. THE Block_Registry SHALL support exporting a Pool_Scoped_Bloom_Filter that uses keys in the format "poolId:blockId"
6. WHEN the Discovery_Protocol queries a peer with a Pool_ID, THE peer SHALL respond based on whether the block exists in the specified pool, not in any pool

### Requirement 5: Pool Metadata in Location Records

**User Story:** As a node operator, I want location records to include pool context, so that the system can distinguish between the same block stored in different pools on different nodes.

#### Acceptance Criteria

1. THE Location_Record interface SHALL include an optional poolId field of type Pool_ID
2. WHEN the Availability_Aware_Block_Store updates a location record for a pool-scoped block, THE Location_Record SHALL include the Pool_ID of the pool the block is stored in
3. WHEN the Availability_Aware_Block_Store queries block locations, THE Availability_Aware_Block_Store SHALL be able to filter location records by Pool_ID
4. WHEN a Location_Record includes a poolId, THE serialization and deserialization functions SHALL preserve the poolId through round-trip conversion
5. WHEN the Availability_Aware_Block_Store receives a location update with a Pool_ID that differs from the locally stored pool for the same block, THE Availability_Aware_Block_Store SHALL treat the records as distinct entries representing different pool placements

### Requirement 6: Pool-Aware Replication Tracking

**User Story:** As a node operator, I want replication tracking to be pool-aware, so that the system can ensure each pool meets its replication targets independently.

#### Acceptance Criteria

1. WHEN the Availability_Aware_Block_Store tracks replication for a pool-scoped block, THE replication count SHALL reflect only replicas in the same pool across nodes
2. WHEN the Availability_Aware_Block_Store identifies under-replicated blocks, THE identification SHALL be scoped to each pool independently
3. WHEN the Availability_Aware_Block_Store announces a block for replication via gossip, THE Block_Announcement SHALL include the Pool_ID so receiving nodes replicate into the correct pool

</content>
</invoke>