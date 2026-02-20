# Implementation Plan: Lumen–BrightChain Client Protocol

## Overview

Implement the server-side protocol layer for Lumen to introspect and manage BrightChain nodes. Work proceeds bottom-up: shared interfaces first, then services, then controllers, then WebSocket channel, then wiring.

## Tasks

- [-] 1. Define shared client protocol interfaces in brightchain-lib
  - [x] 1.1 Create `brightchain-lib/src/lib/interfaces/clientProtocol/nodeStatus.ts` with `INodeStatus<TID>` interface
    - Include nodeId, healthy, uptime, version, capabilities, partitionMode, disconnectedPeers fields
    - _Requirements: 2.1, 10.1_
  - [x] 1.2 Create `brightchain-lib/src/lib/interfaces/clientProtocol/peerInfo.ts` with `IPeerInfo<TID>` and `INetworkTopology<TID>` interfaces
    - Include nodeId, connected, lastSeen, latencyMs for peers; localNodeId, peers, totalConnected for topology
    - _Requirements: 3.1, 10.1_
  - [x] 1.3 Create `brightchain-lib/src/lib/interfaces/clientProtocol/poolInfo.ts` with `IPoolInfo<TID>`, `IPoolDetail<TID>`, and `IPoolAclSummary<TID>` interfaces
    - Include poolId, blockCount, totalSize, memberCount, encrypted, publicRead, publicWrite, hostingNodes
    - _Requirements: 4.1, 4.2, 10.1_
  - [x] 1.4 Create `brightchain-lib/src/lib/interfaces/clientProtocol/poolDiscovery.ts` with `IPoolDiscoveryResult<TID>` interface
    - Include pools, queriedPeers, unreachablePeers, timestamp
    - _Requirements: 7.1, 7.4, 10.1_
  - [x] 1.5 Create `brightchain-lib/src/lib/interfaces/clientProtocol/blockStoreStats.ts` with `IBlockStoreStats` interface
    - Include totalCapacity, currentUsage, availableSpace, blockCounts, totalBlocks
    - _Requirements: 5.1, 10.1_
  - [x] 1.6 Create `brightchain-lib/src/lib/interfaces/clientProtocol/energyAccount.ts` with `IEnergyAccountStatus<TID>` interface
    - Include memberId, balance, availableBalance, earned, spent, reserved
    - _Requirements: 6.1, 10.1_
  - [x] 1.7 Create `brightchain-lib/src/lib/interfaces/clientProtocol/clientEvent.ts` with `ClientEventType` enum, `ClientEventAccessTier` enum, `IClientEvent<TID>`, and `ISubscriptionMessage` interfaces
    - Include eventType, accessTier, payload, timestamp, correlationId, targetPoolId, targetMemberId
    - _Requirements: 9.3, 9.4, 10.1_
  - [x] 1.8 Create `brightchain-lib/src/lib/interfaces/clientProtocol/index.ts` barrel export and register in `brightchain-lib/src/lib/interfaces/index.ts`
    - Re-export all client protocol interfaces
    - _Requirements: 10.1_

  - [x] 1.9 Write property test for shared interface serialization round-trip
    - **Property 15: Shared interface serialization round-trip**
    - Create `brightchain-lib/src/__tests__/clientProtocol.serialization.property.spec.ts`
    - Generate random instances of each interface with fast-check, verify JSON.stringify then JSON.parse produces deeply equal objects
    - **Validates: Requirements 10.3**

- [x] 2. Define API response wrappers in brightchain-api-lib
  - [x] 2.1 Create `brightchain-api-lib/src/lib/interfaces/introspectionApiResponses.ts`
    - Define INodeStatusApiResponse, IPeerListApiResponse, IPoolListApiResponse, IPoolDetailApiResponse, IPoolDiscoveryApiResponse, IBlockStoreStatsApiResponse, IEnergyAccountApiResponse extending IApiMessageResponse
    - Follow existing IUserProfileApiResponse pattern
    - _Requirements: 10.2_
  - [x] 2.2 Export new response interfaces from `brightchain-api-lib/src/lib/interfaces/index.ts`
    - _Requirements: 10.2_

- [x] 3. Extend gossip protocol with pool announcement types
  - [x] 3.1 Add `POOL_ANNOUNCEMENT` and `POOL_REMOVAL` to `GossipMessageType` enum in `brightchain-api-lib/src/lib/enumerations/websocketMessageType.ts`
    - Also add `POOL_LIST_REQUEST` and `POOL_LIST_RESPONSE` for discovery queries
    - _Requirements: 8.1, 8.4_
  - [x] 3.2 Add `IPoolGossipAnnouncement` interface to `brightchain-api-lib/src/lib/interfaces/websocketMessages.ts`
    - Include type, poolId, nodeId, blockCount, totalSize, encrypted, encryptedMetadata, ttl fields
    - Update the WebSocketMessage union type
    - _Requirements: 8.1, 8.2_
  - [x] 3.3 Add `announcePool` and `announcePoolRemoval` methods to `GossipService`
    - Follow existing `announceBlock`/`announceRemoval` pattern
    - Encrypt pool metadata using PoolEncryptionService when pool has encryption enabled
    - _Requirements: 8.1, 8.2, 8.4_
  - [x] 3.4 Write property test for pool lifecycle gossip announcements
    - **Property 9: Pool lifecycle events trigger gossip announcements**
    - Create `brightchain-api-lib/src/lib/availability/poolGossip.property.spec.ts`
    - Generate random pool events, verify correct announcement type is queued
    - **Validates: Requirements 8.1, 8.4**
  - [x] 3.5 Write property test for encrypted pool announcement round-trip
    - **Property 10: Encrypted pool announcement round-trip**
    - In same file, verify encrypt then decrypt produces original metadata, wrong key fails
    - **Validates: Requirements 8.2**

- [x] 4. Checkpoint - Ensure shared interfaces and gossip extensions compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement PoolDiscoveryService
  - [x] 5.1 Create `brightchain-api-lib/src/lib/availability/poolDiscoveryService.ts`
    - Implement constructor taking IPeerProvider, PoolACLStore, PoolEncryptionService, GossipService
    - Implement `discoverPools(memberContext)` that queries peers, filters by ACL and encryption, deduplicates
    - Implement `handlePoolAnnouncement` and `handlePoolRemoval` for gossip-driven cache updates
    - Implement remote pool cache with `getRemotePoolCache()` and `clearPeerCache(peerId)`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.3_
  - [x] 5.2 Write property test for pool discovery ACL and encryption filtering
    - **Property 6: Pool discovery results contain only authorized pools**
    - Create `brightchain-api-lib/src/lib/availability/poolDiscoveryService.property.spec.ts`
    - Generate random pools with various ACL/encryption configs and random member contexts
    - Verify every pool in result is authorized for the requesting member
    - **Validates: Requirements 7.2, 7.3**
  - [x] 5.3 Write property test for pool discovery deduplication
    - **Property 7: Pool discovery deduplication invariant**
    - In same file, generate pools reported by multiple peers, verify no duplicate pool IDs and hostingNodes is complete
    - **Validates: Requirements 7.4**
  - [x] 5.4 Write property test for pool discovery graceful degradation
    - **Property 8: Pool discovery graceful degradation**
    - In same file, generate peer sets with some unreachable, verify partial results and unreachablePeers list
    - **Validates: Requirements 7.5**
  - [x] 5.5 Write property test for pool announcement cache update
    - **Property 11: Pool announcement cache update invariant**
    - In same file, generate pool announcements, verify cache contains announced pool with correct hosting node
    - **Validates: Requirements 8.3**

- [x] 6. Implement ClientWebSocketServer
  - [x] 6.1 Create `brightchain-api-lib/src/lib/services/clientWebSocketServer.ts`
    - Implement JWT authentication on WebSocket upgrade (verify token from query param or first message)
    - Implement subscription management (subscribe/unsubscribe to ClientEventType sets)
    - Implement event broadcasting with access tier filtering (shouldDeliverEvent logic)
    - Implement token expiration monitoring that sends TokenExpiring event before closing
    - Implement ping/pong idle timeout
    - Use `/ws/client` path, separate from existing `/ws/node/:nodeId`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 11.3, 11.4_
  - [x] 6.2 Write property test for WebSocket JWT authentication gate
    - **Property 12: WebSocket JWT authentication gate**
    - Create `brightchain-api-lib/src/lib/services/clientWebSocketServer.property.spec.ts`
    - Generate valid and invalid JWTs, verify connection accepted/rejected accordingly
    - **Validates: Requirements 9.1, 9.2**
  - [x] 6.3 Write property test for client event delivery access tier filtering
    - **Property 13: Client event delivery respects access tiers**
    - In same file, generate events with various access tiers and subscriber sets with various MemberTypes
    - Verify only authorized subscribers receive each event
    - **Validates: Requirements 3.2, 4.4, 6.2, 9.4, 9.7**
  - [x] 6.4 Write property test for client event envelope completeness
    - **Property 14: Client event envelope completeness**
    - In same file, generate random client events, verify all required fields present
    - **Validates: Requirements 9.4**
  - [x] 6.5 Write property test for WebSocket token expiration notification
    - **Property 18: WebSocket token expiration notification**
    - In same file, verify that sessions with expired tokens receive TokenExpiring event
    - **Validates: Requirements 11.4**

- [x] 7. Checkpoint - Ensure services compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Implement IntrospectionController
  - [x] 8.1 Create `brightchain-api-lib/src/lib/controllers/api/introspection.ts`
    - Extend BaseController with IntrospectionHandlers interface
    - Register route definitions with correct auth middleware (requireAuth for all, requireMemberTypes for admin endpoints)
    - Implement handleGetStatus: read uptime, version, partition mode from AvailabilityService; conditionally include disconnectedPeers based on MemberType
    - Implement handleListPeers: read connected nodes from WebSocketMessageServer, enrich with HeartbeatMonitor data
    - Implement handleListPools: get local pools, filter by ACL (or return all for Admin/System)
    - Implement handleGetPoolDetails: check ACL permission, return full pool metadata
    - Implement handleGetBlockStoreStats: read from AvailabilityService.getStatistics()
    - Implement handleGetEnergy: read energy account for requesting member
    - Implement handleGetMemberEnergy: admin-only, read energy account for specified member
    - Implement handleDiscoverPools: delegate to PoolDiscoveryService
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 4.1, 4.2, 4.3, 4.5, 5.1, 6.1, 6.3, 7.1, 11.1, 11.2, 11.5_
  - [x] 8.2 Write property test for role-based endpoint access control
    - **Property 1: Role-based endpoint access control**
    - Create `brightchain-api-lib/src/lib/controllers/api/introspection.property.spec.ts`
    - Generate random MemberTypes and endpoint access tiers, verify access granted/denied correctly
    - **Validates: Requirements 1.2, 1.3, 11.5**
  - [x] 8.3 Write property test for authentication required
    - **Property 2: Authentication required for all endpoints**
    - In same file, generate requests without valid JWTs, verify 401 for all endpoints
    - **Validates: Requirements 2.2, 11.1**
  - [x] 8.4 Write property test for partition mode response by member type
    - **Property 3: Partition mode response varies by member type**
    - In same file, generate partition states and member types, verify disconnectedPeers presence
    - **Validates: Requirements 2.3, 2.4**
  - [x] 8.5 Write property test for pool listing authorization filtering
    - **Property 4: Pool listing filtered by authorization**
    - In same file, generate pool sets with various ACLs and member contexts, verify correct filtering
    - **Validates: Requirements 4.1, 4.3, 4.5**
  - [x] 8.6 Write property test for unauthorized pool direct access
    - **Property 5: Unauthorized pool direct access returns 403**
    - In same file, generate unauthorized pool access attempts, verify 403
    - **Validates: Requirements 4.3**
  - [x] 8.7 Write property test for introspection response completeness
    - **Property 16: Introspection response completeness**
    - In same file, generate successful requests to each endpoint, verify all interface fields present
    - **Validates: Requirements 2.1, 3.1, 4.2, 5.1, 6.1**
  - [x] 8.8 Write property test for energy account access control
    - **Property 17: Energy account access control**
    - In same file, generate User-type members requesting other members' energy, verify 403
    - **Validates: Requirements 6.3**

- [x] 9. Wire components into application
  - [x] 9.1 Register IntrospectionController in `ApiRouter` (`brightchain-api-lib/src/lib/routers/api.ts`)
    - Add introspection controller instantiation and route mounting at `/api/introspection`
    - Add setter methods for PoolDiscoveryService and AvailabilityService dependencies
    - _Requirements: 1.1, 1.4, 1.5_
  - [x] 9.2 Instantiate and wire ClientWebSocketServer in application startup
    - Create ClientWebSocketServer alongside existing WebSocketMessageServer
    - Connect EventNotificationSystem events to ClientWebSocketServer.broadcastEvent
    - Wire AvailabilityService events (storage threshold alerts) to ClientWebSocketServer
    - _Requirements: 9.6, 11.3_
  - [x] 9.3 Instantiate and wire PoolDiscoveryService in application startup
    - Connect GossipService pool announcement handlers to PoolDiscoveryService
    - Wire peer disconnect events to PoolDiscoveryService.clearPeerCache
    - Pass PoolDiscoveryService to IntrospectionController
    - _Requirements: 7.1, 8.3_
  - [x] 9.4 Register new exports in package barrel files
    - Update `brightchain-api-lib/src/lib/services/index.ts` with ClientWebSocketServer
    - Update `brightchain-api-lib/src/lib/availability/index.ts` with PoolDiscoveryService
    - Update `brightchain-api-lib/src/lib/controllers/index.ts` with IntrospectionController
    - Update `brightchain-api-lib/src/lib/enumerations/index.ts` with new gossip types
    - _Requirements: 10.1, 10.2_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Documentation
  - Document full Lumen API, authentication?
  - What needs to be running for Lumen to connect?

- [x] 12. Full end to end integration test
  - Ensure external client can authenticate, use protocol.
  - Deliverable is an nx endpoint we can run and have a true client connect to.
  - We will be developing the nexus client in parallel.
  - So what -is- the protocol?
  - ./Lumen has the code

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- Run tests via: `NX_TUI=false npx nx run brightchain-api-lib:test --outputStyle=stream`
- All shared interfaces go in `brightchain-lib`, API wrappers in `brightchain-api-lib`, per AGENTS.md conventions
