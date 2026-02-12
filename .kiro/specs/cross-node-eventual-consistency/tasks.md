# Implementation Plan: Cross-Node Eventual Consistency for Block Retrieval

## Overview

Implement remote block fetching and eventual consistency semantics across BrightChain's block retrieval path. Work proceeds bottom-up: shared interfaces/types in brightchain-lib first, then implementations in brightchain-api-lib, then Collection integration in brightchain-db.

## Tasks

- [x] 1. Define shared types and interfaces in brightchain-lib
  - [x] 1.1 Create ReadConcern enum and block fetch error types
    - Add `ReadConcern` enum (`Local`, `Available`, `Consistent`) to `brightchain-lib/src/lib/enumerations/readConcern.ts`
    - Add `BlockFetchError`, `FetchTimeoutError`, `PendingBlockError`, `PoolMismatchError` to `brightchain-lib/src/lib/errors/`
    - Export from brightchain-lib barrel
    - _Requirements: 2.1_

  - [x] 1.2 Create IBlockFetchTransport interface
    - Add `brightchain-lib/src/lib/interfaces/blockFetch/blockFetchTransport.ts` with `IBlockFetchTransport` interface
    - Define `fetchBlockFromNode(nodeId, blockId, poolId?)` method
    - Export from brightchain-lib barrel
    - _Requirements: 1.1_

  - [x] 1.3 Create IBlockFetcher interface and BlockFetchResult type
    - Add `brightchain-lib/src/lib/interfaces/blockFetch/blockFetcher.ts` with `IBlockFetcher`, `BlockFetchResult`, `BlockFetcherConfig`
    - Export from brightchain-lib barrel
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.4 Create IFetchQueue interface
    - Add `brightchain-lib/src/lib/interfaces/blockFetch/fetchQueue.ts` with `IFetchQueue`, `FetchQueueConfig`
    - Export from brightchain-lib barrel
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 1.5 Create IEnrichedQueryResult and IPendingBlockInfo interfaces
    - Add `brightchain-lib/src/lib/interfaces/blockFetch/enrichedQueryResult.ts` with `IEnrichedQueryResult<TDoc>`, `IPendingBlockInfo`
    - Export from brightchain-lib barrel
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Checkpoint — Verify brightchain-lib compiles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement FetchQueue in brightchain-api-lib
  - [x] 3.1 Implement FetchQueue class
    - Create `brightchain-api-lib/src/lib/blockFetch/fetchQueue.ts`
    - Implement deduplication via `Map<string, Array<{resolve, reject}>>` for coalescing concurrent requests
    - Implement concurrency limiting with `maxConcurrency` bound on active fetches
    - Implement priority ordering by waiter count
    - Implement per-request timeout with cancellation
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.2 Write property test: FetchQueue deduplication (Property 8)
    - **Property 8: FetchQueue deduplication — concurrent requests for the same block produce one fetch**
    - **Validates: Requirements 4.1**

  - [x] 3.3 Write property test: FetchQueue concurrency bound (Property 9)
    - **Property 9: FetchQueue concurrency bound**
    - **Validates: Requirements 4.2**

- [x] 4. Implement BlockFetcher in brightchain-api-lib
  - [x] 4.1 Implement BlockFetcher class
    - Create `brightchain-api-lib/src/lib/blockFetch/blockFetcher.ts`
    - Query `IAvailabilityService.getBlockLocations()` for candidate nodes
    - Filter out nodes in cooldown via `Map<string, number>` tracking
    - Try nodes in order with exponential backoff retry on transient failures
    - Verify checksum of fetched data matches requested blockId
    - Return `BlockFetchResult` with per-node attempt details
    - Respect `fetchTimeoutMs` configuration
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 7.1, 7.2_

  - [x] 4.2 Write property test: Checksum verification rejects tampered blocks (Property 1)
    - **Property 1: Checksum verification rejects tampered blocks**
    - **Validates: Requirements 1.3**

  - [x] 4.3 Write property test: Failover exhausts all candidate nodes (Property 2)
    - **Property 2: Failover exhausts all candidate nodes and reports attempts**
    - **Validates: Requirements 1.4, 1.5**

  - [x] 4.4 Write property test: Successful fetch transitions state to Cached (Property 3)
    - **Property 3: Successful fetch transitions state to Cached**
    - **Validates: Requirements 1.2**

  - [x] 4.5 Write property test: Retry count respects maxRetries (Property 13)
    - **Property 13: Retry count respects maxRetries configuration**
    - **Validates: Requirements 7.1**

  - [x] 4.6 Write property test: Node cooldown excludes failed nodes (Property 14)
    - **Property 14: Node cooldown excludes failed nodes from candidate list**
    - **Validates: Requirements 7.2**

- [x] 5. Checkpoint — Verify BlockFetcher and FetchQueue tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement pool-scoped fetching in BlockFetcher
  - [x] 6.1 Add pool-scoped fetch logic to BlockFetcher
    - Pass `poolId` through to `IBlockFetchTransport.fetchBlockFromNode()`
    - After fetch, validate fetched block metadata `poolId` matches requested `poolId`
    - Store fetched block under pool-scoped key via `PooledStoreAdapter`
    - Throw `PoolMismatchError` on mismatch
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Write property test: Pool-scoped fetch stores in correct namespace (Property 10)
    - **Property 10: Pool-scoped fetch stores block in correct namespace**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 6.3 Write property test: Pool mismatch rejection (Property 11)
    - **Property 11: Pool mismatch rejection**
    - **Validates: Requirements 5.3**

- [x] 7. Extend AvailabilityAwareBlockStore with read concern and remote fetch
  - [x] 7.1 Add BlockFetcher dependency and read concern to AvailabilityAwareBlockStore
    - Add optional `IBlockFetcher` to constructor and config
    - Add `defaultReadConcern` to `AvailabilityAwareBlockStoreConfig`
    - Extend `getData(key, readConcern?)` with optional read concern parameter
    - Implement Local concern: return local/cached blocks, error for remote/unknown
    - Implement Consistent concern: await `blockFetcher.fetchBlock()`, store result, return or timeout
    - Implement Available concern: try fetch with `initialWaitMs`, return `PendingBlockError` if not resolved
    - Short-circuit with `PartitionModeError` during partition mode regardless of concern
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 7.3_

  - [x] 7.2 Write property test: Local read concern behavior (Property 4)
    - **Property 4: Local read concern returns only locally available blocks**
    - **Validates: Requirements 2.2**

  - [x] 7.3 Write property test: Available read concern behavior (Property 5)
    - **Property 5: Available read concern returns local blocks and attempts fetch for remote**
    - **Validates: Requirements 2.3**

  - [x] 7.4 Write property test: Consistent read concern behavior (Property 6)
    - **Property 6: Consistent read concern blocks until fetch completes or times out**
    - **Validates: Requirements 2.4, 2.5**

  - [x] 7.5 Write property test: Partition mode suspends fetches (Property 15)
    - **Property 15: Partition mode suspends all remote fetches**
    - **Validates: Requirements 7.3**

- [x] 8. Checkpoint — Verify AvailabilityAwareBlockStore tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Add block data endpoint to SyncController
  - [x] 9.1 Add GET /api/sync/blocks/:blockId endpoint
    - Add handler to `SyncController` that reads block data from local store
    - Support optional `poolId` query parameter for pool-scoped retrieval
    - Return 200 with raw block data or 404 if not found
    - _Requirements: 1.1_

  - [x] 9.2 Write unit tests for block data endpoint
    - Test successful block retrieval returns raw data
    - Test 404 for missing blocks
    - Test pool-scoped retrieval
    - _Requirements: 1.1, 5.2_

- [x] 10. Implement HttpBlockFetchTransport in brightchain-api-lib
  - [x] 10.1 Create HttpBlockFetchTransport class
    - Create `brightchain-api-lib/src/lib/blockFetch/httpBlockFetchTransport.ts`
    - Implement `IBlockFetchTransport` using HTTP GET to remote node's `/api/sync/blocks/:blockId`
    - Include `poolId` query parameter when provided
    - Handle HTTP errors and map to `BlockFetchError`
    - _Requirements: 1.1, 5.2_

  - [x] 10.2 Write unit tests for HttpBlockFetchTransport
    - Test successful fetch returns block data
    - Test HTTP error mapping
    - Test pool ID parameter inclusion
    - _Requirements: 1.1, 5.2_

- [x] 11. Integrate gossip-triggered proactive fetching
  - [x] 11.1 Add proactive fetch subscription to BlockFetcher
    - In `BlockFetcher.start()`, subscribe to `gossipService.onAnnouncement()` when `proactiveFetchEnabled` is true
    - On announcement, check if block is already local; if not, evaluate proactive fetch policy
    - Enqueue low-priority fetch if policy allows
    - In `BlockFetcher.stop()`, unsubscribe
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 11.2 Write property test: Proactive fetch disabled means no data transfers (Property 12)
    - **Property 12: Proactive fetch disabled means no data transfers on announcements**
    - **Validates: Requirements 6.3**

  - [x] 11.3 Write unit test for gossip-triggered proactive fetch
    - Test that announcement triggers fetch evaluation when enabled
    - Test that announcement does not trigger fetch when disabled
    - _Requirements: 6.1, 6.3_

- [x] 12. Extend Collection with availability-aware queries in brightchain-db
  - [x] 12.1 Add findWithAvailability method to Collection
    - Add `findWithAvailability(filter, options?)` method returning `IEnrichedQueryResult<T>`
    - Propagate `readConcern` from options to `AvailabilityAwareBlockStore.getData()`
    - Catch `PendingBlockError` and add to `pendingBlocks` list
    - Set `isComplete = (pendingBlocks.length === 0)`
    - Existing `find`/`findOne` remain unchanged for backward compatibility
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 12.2 Write property test: EnrichedQueryResult isComplete consistency (Property 7)
    - **Property 7: EnrichedQueryResult isComplete flag is consistent with pendingBlocks**
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 12.3 Write unit tests for findWithAvailability
    - Test all-local query returns complete result
    - Test mixed availability returns partial result with correct pending blocks
    - Test read concern propagation to underlying store
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All shared interfaces go in brightchain-lib; Node.js implementations go in brightchain-api-lib; Collection changes go in brightchain-db
