# Requirements Document

## Introduction

This document specifies the requirements for the Block Availability and Discovery Protocol, which enables BrightChain nodes to track block locations, discover blocks across the network, and handle network partitions gracefully. The system extends the existing IBlockStore and IBlockMetadata interfaces to support distributed block discovery, availability tracking, and state reconciliation after network disruptions.

## Glossary

- **Block_Registry**: A local index that tracks which blocks are stored on the local node, including their availability state and location information
- **Availability_State**: The current accessibility status of a block (Local, Remote, Cached, Orphaned, Unknown)
- **Local_Block**: A block whose authoritative copy is stored on the local node's disk
- **Remote_Block**: A block that exists on one or more remote nodes but not locally
- **Cached_Block**: A block that is stored locally as a cache copy but whose authoritative copy is on a remote node
- **Orphaned_Block**: A block that was previously available but whose source nodes are no longer reachable
- **Discovery_Protocol**: The mechanism by which nodes find and locate blocks across the network
- **Bloom_Filter**: A space-efficient probabilistic data structure used to test whether a block might exist on a node
- **Block_Manifest**: A complete list of block IDs stored on a node, used for synchronization
- **Network_Partition**: A condition where a node loses connectivity to some or all peers
- **Partition_Mode**: The operational state a node enters when disconnected from the network
- **Reconciliation**: The process of synchronizing block state after reconnecting to the network
- **Location_Record**: Metadata tracking which nodes hold copies of a specific block
- **Gossip_Protocol**: A peer-to-peer communication pattern where nodes share information with random neighbors
- **DHT**: Distributed Hash Table - a decentralized lookup system that maps block IDs to node locations
- **Availability_Service**: The service responsible for tracking block availability and coordinating discovery
- **Sync_Vector**: A timestamp-based vector used to track the last known state from each peer

## Requirements

### Requirement 1: Block Availability States

**User Story:** As a node operator, I want to know the availability state of each block, so that I can understand whether blocks are accessible locally, remotely, or unavailable.

#### Acceptance Criteria

1. THE Availability_Service SHALL define five availability states: Local, Remote, Cached, Orphaned, and Unknown
2. WHEN a block is stored locally as the authoritative copy, THE Availability_Service SHALL mark it as Local
3. WHEN a block exists only on remote nodes, THE Availability_Service SHALL mark it as Remote
4. WHEN a block is cached locally but the authoritative copy is remote, THE Availability_Service SHALL mark it as Cached
5. WHEN a block's source nodes become unreachable, THE Availability_Service SHALL mark it as Orphaned
6. WHEN a block's location is not yet determined, THE Availability_Service SHALL mark it as Unknown
7. WHEN querying a block's availability, THE Availability_Service SHALL return the current state and location information

### Requirement 2: Extended Block Metadata with Location

**User Story:** As a developer, I want block metadata to include location information, so that I can track where blocks are stored across the network.

#### Acceptance Criteria

1. THE IBlockMetadata interface SHALL be extended to include an availabilityState field
2. THE IBlockMetadata interface SHALL be extended to include a locationRecords array tracking node locations
3. WHEN a block is stored, THE Block_Store SHALL initialize location metadata with the local node ID
4. WHEN a block is discovered on a remote node, THE Block_Store SHALL add the remote node to locationRecords
5. WHEN a node holding a block becomes unavailable, THE Block_Store SHALL update locationRecords to reflect the loss
6. FOR ALL valid IBlockMetadata objects with location data, serializing then deserializing SHALL preserve all location records

### Requirement 3: Local Block Registry

**User Story:** As a node operator, I want a fast local registry of blocks, so that I can quickly determine which blocks exist locally without scanning disk.

#### Acceptance Criteria

1. THE Block_Registry SHALL maintain an in-memory index of all locally stored block IDs
2. WHEN a block is stored locally, THE Block_Registry SHALL add the block ID to the index
3. WHEN a block is deleted locally, THE Block_Registry SHALL remove the block ID from the index
4. WHEN checking if a block exists locally, THE Block_Registry SHALL return a result in O(1) time
5. WHEN the node starts, THE Block_Registry SHALL rebuild the index from disk storage
6. THE Block_Registry SHALL support exporting a Bloom filter representation for efficient network queries
7. THE Block_Registry SHALL support exporting a complete manifest for full synchronization

### Requirement 4: Bloom Filter Block Queries

**User Story:** As a node, I want to efficiently query whether another node might have a block, so that I can minimize network traffic during discovery.

#### Acceptance Criteria

1. THE Block_Registry SHALL generate a Bloom filter representing all local block IDs
2. WHEN a peer requests the Bloom filter, THE Block_Registry SHALL return the current filter
3. WHEN querying a remote node for a block, THE Availability_Service SHALL first check the node's Bloom filter
4. IF the Bloom filter indicates the block might exist, THEN THE Availability_Service SHALL make a direct query
5. IF the Bloom filter indicates the block definitely does not exist, THEN THE Availability_Service SHALL skip that node
6. THE Bloom filter SHALL be configured with a false positive rate of 1% or less
7. WHEN blocks are added or removed, THE Block_Registry SHALL update the Bloom filter incrementally or regenerate it

### Requirement 5: Block Discovery Protocol

**User Story:** As a node, I want to discover where blocks are located across the network, so that I can retrieve blocks that are not stored locally.

#### Acceptance Criteria

1. WHEN a block is requested but not found locally, THE Discovery_Protocol SHALL initiate a network search
2. THE Discovery_Protocol SHALL query known peers using their Bloom filters first
3. WHEN a peer's Bloom filter indicates a possible match, THE Discovery_Protocol SHALL send a direct block existence query
4. WHEN a block is found on a remote node, THE Discovery_Protocol SHALL update the local location metadata
5. WHEN multiple nodes have the block, THE Discovery_Protocol SHALL prefer nodes with lower latency
6. IF no nodes have the block after querying all known peers, THEN THE Discovery_Protocol SHALL return a not-found result
7. THE Discovery_Protocol SHALL implement request timeouts to prevent indefinite waiting
8. THE Discovery_Protocol SHALL cache discovery results to avoid repeated queries for the same block

### Requirement 6: Gossip-Based Block Announcements

**User Story:** As a node, I want to announce new blocks to the network, so that other nodes can discover them without polling.

#### Acceptance Criteria

1. WHEN a new block is stored locally, THE Gossip_Protocol SHALL announce the block ID to connected peers
2. WHEN a block announcement is received, THE Availability_Service SHALL update location metadata for that block
3. THE Gossip_Protocol SHALL propagate announcements to a configurable number of random peers
4. THE Gossip_Protocol SHALL include a TTL (time-to-live) to prevent infinite propagation
5. WHEN a block is deleted locally, THE Gossip_Protocol SHALL announce the removal to connected peers
6. THE Gossip_Protocol SHALL batch multiple announcements to reduce network overhead

### Requirement 7: Network Partition Detection

**User Story:** As a node operator, I want the system to detect network partitions, so that the node can operate appropriately when disconnected.

#### Acceptance Criteria

1. THE Availability_Service SHALL monitor connectivity to known peers using heartbeat messages
2. WHEN all peers become unreachable, THE Availability_Service SHALL enter Partition_Mode
3. WHEN in Partition_Mode, THE Availability_Service SHALL mark all Remote blocks as Orphaned
4. WHEN in Partition_Mode, THE Availability_Service SHALL continue serving Local and Cached blocks
5. WHEN at least one peer becomes reachable, THE Availability_Service SHALL exit Partition_Mode
6. THE Availability_Service SHALL log partition events with timestamps and affected peer counts
7. WHEN entering Partition_Mode, THE Availability_Service SHALL emit an event for monitoring systems

### Requirement 8: Partition Mode Operations

**User Story:** As a node operator, I want the node to continue operating during network partitions, so that local operations are not blocked by network issues.

#### Acceptance Criteria

1. WHILE in Partition_Mode, THE Block_Store SHALL allow reading and writing Local blocks
2. WHILE in Partition_Mode, THE Block_Store SHALL allow reading Cached blocks
3. WHILE in Partition_Mode, THE Block_Store SHALL queue replication requests for later processing
4. WHILE in Partition_Mode, THE Block_Store SHALL reject requests for Remote blocks with a clear error
5. WHILE in Partition_Mode, THE Block_Store SHALL track all local changes in a pending sync queue
6. IF a block operation requires network access during Partition_Mode, THEN THE Block_Store SHALL return an appropriate error indicating the partition state

### Requirement 9: Reconnection and State Reconciliation

**User Story:** As a node operator, I want the system to reconcile state after reconnecting, so that the node's view of the network is consistent.

#### Acceptance Criteria

1. WHEN exiting Partition_Mode, THE Availability_Service SHALL initiate a reconciliation process
2. WHEN reconciling, THE Availability_Service SHALL exchange manifests with reconnected peers
3. WHEN reconciling, THE Availability_Service SHALL update location metadata for blocks discovered on peers
4. WHEN reconciling, THE Availability_Service SHALL process the pending sync queue
5. WHEN reconciling, THE Availability_Service SHALL re-evaluate Orphaned blocks and update their state if sources are found
6. WHEN reconciling, THE Availability_Service SHALL resolve conflicts using last-write-wins with vector timestamps
7. WHEN reconciliation completes, THE Availability_Service SHALL emit an event with statistics about changes
8. IF reconciliation fails for specific blocks, THEN THE Availability_Service SHALL log the failures and continue with remaining blocks

### Requirement 10: Sync Vector Tracking

**User Story:** As a node, I want to track synchronization state with each peer, so that I can efficiently sync only changes since the last synchronization.

#### Acceptance Criteria

1. THE Availability_Service SHALL maintain a Sync_Vector with timestamps for each known peer
2. WHEN synchronizing with a peer, THE Availability_Service SHALL request only changes since the last sync timestamp
3. WHEN receiving sync data from a peer, THE Availability_Service SHALL update the Sync_Vector for that peer
4. WHEN a new peer is discovered, THE Availability_Service SHALL initialize its Sync_Vector entry to zero
5. THE Sync_Vector SHALL be persisted to survive node restarts
6. FOR ALL valid Sync_Vector objects, serializing then deserializing SHALL preserve all peer timestamps

### Requirement 11: Block Location Query API

**User Story:** As a developer, I want API methods to query block locations, so that I can build applications that understand block distribution.

#### Acceptance Criteria

1. THE Availability_Service SHALL provide a method to get the availability state of a block
2. THE Availability_Service SHALL provide a method to list all nodes holding a specific block
3. THE Availability_Service SHALL provide a method to list all blocks in a specific availability state
4. THE Availability_Service SHALL provide a method to get statistics about block distribution
5. WHEN querying block locations, THE Availability_Service SHALL return results within a configurable timeout
6. IF location information is stale, THEN THE Availability_Service SHALL indicate the staleness in the response

### Requirement 12: Integration with Existing Block Store

**User Story:** As a developer, I want the availability system to integrate seamlessly with existing IBlockStore implementations, so that I don't need to rewrite storage code.

#### Acceptance Criteria

1. THE Availability_Service SHALL wrap existing IBlockStore implementations without modifying them
2. WHEN a block is stored via IBlockStore, THE Availability_Service SHALL automatically update the registry
3. WHEN a block is deleted via IBlockStore, THE Availability_Service SHALL automatically update the registry
4. WHEN a block is retrieved via IBlockStore, THE Availability_Service SHALL update access metadata
5. THE Availability_Service SHALL expose the same IBlockStore interface for transparent usage
6. WHEN the underlying IBlockStore fails, THE Availability_Service SHALL propagate errors appropriately

### Requirement 13: Discovery Protocol Configuration

**User Story:** As a node operator, I want to configure discovery protocol parameters, so that I can tune performance for my network environment.

#### Acceptance Criteria

1. THE Discovery_Protocol SHALL support configurable query timeout duration
2. THE Discovery_Protocol SHALL support configurable maximum concurrent queries
3. THE Discovery_Protocol SHALL support configurable Bloom filter size and hash count
4. THE Discovery_Protocol SHALL support configurable gossip fanout (number of peers to notify)
5. THE Discovery_Protocol SHALL support configurable heartbeat interval for partition detection
6. WHEN configuration is invalid, THE Discovery_Protocol SHALL reject it with a clear error message

### Requirement 14: Block Availability Events

**User Story:** As a developer, I want to subscribe to block availability events, so that I can react to changes in block state.

#### Acceptance Criteria

1. THE Availability_Service SHALL emit events when a block's availability state changes
2. THE Availability_Service SHALL emit events when a new block location is discovered
3. THE Availability_Service SHALL emit events when a block location is lost
4. THE Availability_Service SHALL emit events when entering or exiting Partition_Mode
5. THE Availability_Service SHALL emit events when reconciliation starts and completes
6. WHEN subscribing to events, THE Availability_Service SHALL support filtering by event type and block ID patterns

### Requirement 15: Availability Metrics and Monitoring

**User Story:** As a node operator, I want metrics about block availability, so that I can monitor the health of the distributed storage system.

#### Acceptance Criteria

1. THE Availability_Service SHALL track the count of blocks in each availability state
2. THE Availability_Service SHALL track the number of discovery queries per time period
3. THE Availability_Service SHALL track the average discovery latency
4. THE Availability_Service SHALL track the time spent in Partition_Mode
5. THE Availability_Service SHALL track the number of reconciliation operations and their outcomes
6. THE Availability_Service SHALL expose metrics in a format compatible with standard monitoring systems

