# Requirements Document

## Introduction

This feature adds cross-node eventual consistency for block retrieval in BrightChain. Currently, when a block is known to exist on a remote node (via the availability service), the system cannot actually fetch the block data — it only tracks metadata. The `AvailabilityAwareBlockStore` delegates to the local inner store and fails if the block isn't present locally. The `Collection` layer silently returns `null` for missing blocks with no indication of why.

This feature introduces:
- A block fetching protocol for retrieving blocks from remote nodes
- Read concern levels so callers can choose their consistency guarantee
- A query result model that communicates block availability status (partial results, pending blocks)
- Integration with the existing gossip and availability services

## Glossary

- **Block_Fetcher**: Service responsible for retrieving block data from remote nodes over the network
- **Read_Concern**: A caller-specified consistency level that controls how the system handles missing remote blocks during reads
- **Block_Fetch_Result**: The outcome of a remote block fetch attempt, including the block data or an error
- **Query_Result**: An enriched result from Collection queries that includes availability metadata alongside document data
- **Pending_Block**: A block that is known to exist on a remote node but has not yet been fetched locally
- **Fetch_Queue**: An ordered queue of block fetch requests with priority and deduplication
- **Availability_Aware_Block_Store**: The existing block store wrapper that checks availability state; will be extended with remote fetch capability
- **Collection**: The document query layer in brightchain-db that reads documents from block storage
- **Pool_Scoped_Fetch**: A remote block fetch that respects pool boundaries, ensuring blocks are stored in the correct pool namespace
- **Fetch_Timeout**: The maximum duration the system waits for a remote block fetch before returning a timeout error

## Requirements

### Requirement 1: Block Fetching Protocol

**User Story:** As a node operator, I want the system to fetch block data from remote nodes when a block is not available locally, so that cross-node queries can retrieve data that exists elsewhere in the network.

#### Acceptance Criteria

1. WHEN the Availability_Aware_Block_Store receives a read request for a block with Remote availability state, THE Block_Fetcher SHALL attempt to retrieve the block data from a node listed in the block's location records
2. WHEN the Block_Fetcher successfully retrieves a block from a remote node, THE Availability_Aware_Block_Store SHALL store the block locally as a cached copy and update the availability state to Cached
3. WHEN the Block_Fetcher receives block data from a remote node, THE Block_Fetcher SHALL verify the block's checksum matches the requested block ID before accepting the data
4. IF the Block_Fetcher fails to retrieve a block from one remote node, THEN THE Block_Fetcher SHALL attempt retrieval from the next available node in the location records
5. IF all remote nodes fail to provide the requested block, THEN THE Block_Fetcher SHALL return a Block_Fetch_Result with a descriptive error indicating which nodes were attempted and why each failed
6. WHEN the Block_Fetcher retrieves a block, THE Block_Fetcher SHALL respect the Fetch_Timeout configuration, returning a timeout error if the fetch exceeds the configured duration

### Requirement 2: Read Concern Levels

**User Story:** As a developer querying BrightChain, I want to specify a read concern level for my queries, so that I can choose between fast local-only reads and consistent cross-node reads based on my use case.

#### Acceptance Criteria

1. THE Availability_Aware_Block_Store SHALL support three Read_Concern levels: Local, Available, and Consistent
2. WHEN Read_Concern is set to Local, THE Availability_Aware_Block_Store SHALL return only blocks that are stored locally (Local or Cached state), returning an error for blocks in Remote or Unknown state
3. WHEN Read_Concern is set to Available, THE Availability_Aware_Block_Store SHALL return locally stored blocks immediately and attempt to fetch Remote blocks, returning a Pending_Block indicator if the fetch has not completed within a short initial wait period
4. WHEN Read_Concern is set to Consistent, THE Availability_Aware_Block_Store SHALL block until the requested block is available locally or fetched from a remote node, up to the Fetch_Timeout
5. IF a Consistent read exceeds the Fetch_Timeout, THEN THE Availability_Aware_Block_Store SHALL return a timeout error rather than incomplete data

### Requirement 3: Query Result Enrichment

**User Story:** As a developer, I want query results to include availability metadata, so that I can understand which documents are fully available, which are pending remote fetch, and handle partial results appropriately.

#### Acceptance Criteria

1. WHEN the Collection executes a query, THE Query_Result SHALL include a list of documents that were successfully retrieved and a separate list of block IDs that could not be retrieved with their availability state
2. WHEN a query returns partial results due to pending remote blocks, THE Query_Result SHALL include a flag indicating the result is partial and the count of pending blocks
3. WHEN all blocks for a query are available locally, THE Query_Result SHALL indicate the result is complete with no pending blocks
4. THE Collection SHALL propagate the Read_Concern from the query options to the underlying Availability_Aware_Block_Store for each block read

### Requirement 4: Fetch Queue and Deduplication

**User Story:** As a node operator, I want remote block fetches to be queued and deduplicated, so that the system does not make redundant network requests for the same block.

#### Acceptance Criteria

1. WHEN multiple read requests target the same Remote block concurrently, THE Fetch_Queue SHALL issue only one network fetch and resolve all waiting callers with the same result
2. THE Fetch_Queue SHALL process fetch requests with configurable concurrency, limiting the number of simultaneous remote fetches
3. WHEN a fetch request is added to the Fetch_Queue, THE Fetch_Queue SHALL assign a priority based on the number of callers waiting for that block
4. IF a fetch request in the Fetch_Queue exceeds the Fetch_Timeout, THEN THE Fetch_Queue SHALL cancel the request and notify all waiting callers with a timeout error

### Requirement 5: Pool-Scoped Remote Fetching

**User Story:** As a node operator, I want remote block fetches to respect pool boundaries, so that blocks fetched from remote nodes are stored in the correct pool namespace.

#### Acceptance Criteria

1. WHEN a block is fetched from a remote node and the block has a pool ID in its metadata, THE Block_Fetcher SHALL store the fetched block in the corresponding pool namespace
2. WHEN a pool-scoped block is requested, THE Block_Fetcher SHALL include the pool ID in the fetch request so the remote node can locate the block in the correct pool
3. IF a fetched block's pool ID does not match the expected pool ID, THEN THE Block_Fetcher SHALL reject the block and report a pool mismatch error

### Requirement 6: Gossip-Triggered Proactive Fetching

**User Story:** As a node operator, I want the gossip service to optionally trigger proactive block fetching for blocks that are likely to be needed, so that frequently accessed blocks are pre-cached across nodes.

#### Acceptance Criteria

1. WHEN the gossip service receives a block announcement and proactive fetching is enabled, THE Block_Fetcher SHALL evaluate whether to proactively fetch the announced block based on configurable criteria
2. THE Block_Fetcher SHALL support a configurable proactive fetch policy that considers block access frequency and replication targets
3. WHEN proactive fetching is disabled, THE gossip service SHALL continue to update location metadata without triggering block data transfers

### Requirement 7: Error Handling and Resilience

**User Story:** As a node operator, I want the block fetching system to handle network failures gracefully, so that transient errors do not cause permanent query failures.

#### Acceptance Criteria

1. WHEN a remote fetch fails due to a transient network error, THE Block_Fetcher SHALL retry the fetch with exponential backoff up to a configurable maximum retry count
2. IF a remote node consistently fails to respond, THEN THE Block_Fetcher SHALL mark the node as temporarily unavailable and skip the node for subsequent fetch attempts within a configurable cooldown period
3. WHILE the system is in partition mode, THE Block_Fetcher SHALL suspend all remote fetch attempts and return partition mode errors immediately
4. WHEN the system exits partition mode, THE Block_Fetcher SHALL resume processing the Fetch_Queue and re-evaluate pending fetch requests
