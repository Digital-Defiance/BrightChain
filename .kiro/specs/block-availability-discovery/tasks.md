# Implementation Plan: Block Availability and Discovery Protocol

## Overview

This implementation plan breaks down the Block Availability and Discovery Protocol into discrete coding tasks. The implementation follows a bottom-up approach, starting with core enumerations and interfaces, then building up to services and integration.

## Tasks

- [ ] 1. Create core enumerations and types
  - [ ] 1.1 Create AvailabilityState enumeration
    - Create `brightchain-lib/src/lib/enumerations/availabilityState.ts`
    - Define Local, Remote, Cached, Orphaned, Unknown states
    - Add helper functions: isLocallyAccessible, requiresNetwork
    - Export from enumerations index
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [ ] 1.2 Extend IBlockMetadata with location fields
    - Create `brightchain-lib/src/lib/interfaces/availability/locationRecord.ts`
    - Define ILocationRecord interface
    - Create IBlockMetadataWithLocation extending IBlockMetadata
    - Add createDefaultLocationMetadata helper
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2. Implement Block Registry
  - [ ] 2.1 Create IBlockRegistry interface
    - Create `brightchain-lib/src/lib/interfaces/availability/blockRegistry.ts`
    - Define hasLocal, addLocal, removeLocal methods
    - Define exportBloomFilter, exportManifest methods
    - Define BloomFilter and BlockManifest interfaces
    - _Requirements: 3.1, 3.6, 3.7_
  
  - [ ] 2.2 Implement BlockRegistry class
    - Create `brightchain-api-lib/src/lib/availability/blockRegistry.ts`
    - Implement in-memory Set-based index
    - Implement Bloom filter generation using bloom-filters library
    - Implement manifest export with checksum
    - Implement rebuild from disk storage
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.7_
  
  - [ ] 2.3 Write property tests for BlockRegistry
    - **Property 9: Registry Consistency with Storage**
    - **Property 10: Manifest Export Correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.7**
  
  - [ ] 2.4 Write property tests for Bloom filter
    - **Property 6: Bloom Filter Accuracy**
    - **Validates: Requirements 4.1, 4.6**

- [ ] 3. Checkpoint - Registry implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Gossip Service
  - [ ] 4.1 Create IGossipService interface
    - Create `brightchain-lib/src/lib/interfaces/availability/gossipService.ts`
    - Define announceBlock, announceRemoval methods
    - Define handleAnnouncement, onAnnouncement methods
    - Define BlockAnnouncement and GossipConfig interfaces
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ] 4.2 Implement GossipService class
    - Create `brightchain-api-lib/src/lib/availability/gossipService.ts`
    - Implement announcement batching with configurable interval
    - Implement TTL decrement on forwarding
    - Implement fanout to random peers
    - Integrate with PeerManager for peer selection
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ] 4.3 Write property tests for GossipService
    - **Property 12: Gossip TTL Decrement**
    - **Property 13: Gossip Batching**
    - **Validates: Requirements 6.4, 6.6**

- [ ] 5. Implement Discovery Protocol
  - [ ] 5.1 Create IDiscoveryProtocol interface
    - Create `brightchain-lib/src/lib/interfaces/availability/discoveryProtocol.ts`
    - Define discoverBlock, queryPeer methods
    - Define getCachedLocations, clearCache methods
    - Define DiscoveryResult, PeerQueryResult, DiscoveryConfig interfaces
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ] 5.2 Implement DiscoveryProtocol class
    - Create `brightchain-api-lib/src/lib/availability/discoveryProtocol.ts`
    - Implement Bloom filter pre-check before direct queries
    - Implement concurrent query limiting
    - Implement result caching with TTL
    - Implement latency-based node preference
    - Implement configurable timeouts
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [ ] 5.3 Write property tests for DiscoveryProtocol
    - **Property 5: Bloom Filter Query Optimization**
    - **Property 11: Discovery Result Caching**
    - **Property 31: Discovery Latency Preference**
    - **Validates: Requirements 4.3, 4.4, 4.5, 5.2, 5.3, 5.5, 5.8**

- [ ] 6. Checkpoint - Discovery and Gossip complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Heartbeat Monitor
  - [ ] 7.1 Create IHeartbeatMonitor interface
    - Create `brightchain-lib/src/lib/interfaces/availability/heartbeatMonitor.ts`
    - Define start, stop, isPeerReachable methods
    - Define getReachablePeers, getUnreachablePeers methods
    - Define ConnectivityEvent and HeartbeatConfig interfaces
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [ ] 7.2 Implement HeartbeatMonitor class
    - Create `brightchain-api-lib/src/lib/availability/heartbeatMonitor.ts`
    - Implement periodic heartbeat sending
    - Implement missed heartbeat tracking
    - Implement connectivity event emission
    - Integrate with WebSocket for ping/pong
    - _Requirements: 7.1, 7.2, 7.5, 7.6_
  
  - [ ] 7.3 Write unit tests for HeartbeatMonitor
    - Test heartbeat interval timing
    - Test missed threshold detection
    - Test connectivity event emission
    - _Requirements: 7.1, 7.2, 7.5_

- [ ] 8. Implement Reconciliation Service
  - [ ] 8.1 Create IReconciliationService interface
    - Create `brightchain-lib/src/lib/interfaces/availability/reconciliationService.ts`
    - Define reconcile, getSyncVector, updateSyncVector methods
    - Define getPendingSyncQueue, addToPendingSyncQueue methods
    - Define SyncVectorEntry, PendingSyncItem, ReconciliationResult interfaces
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 8.2 Implement ReconciliationService class
    - Create `brightchain-api-lib/src/lib/availability/reconciliationService.ts`
    - Implement manifest exchange with peers
    - Implement pending sync queue processing
    - Implement orphan resolution
    - Implement last-write-wins conflict resolution
    - Implement sync vector persistence
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [ ] 8.3 Write property tests for ReconciliationService
    - **Property 18: Reconciliation Manifest Exchange**
    - **Property 19: Reconciliation Orphan Resolution**
    - **Property 20: Reconciliation Conflict Resolution**
    - **Validates: Requirements 9.2, 9.3, 9.5, 9.6**
  
  - [ ] 8.4 Write property tests for Sync Vector
    - **Property 21: Sync Vector Persistence Round-Trip**
    - **Property 22: Delta Synchronization**
    - **Property 23: Sync Vector Update**
    - **Validates: Requirements 10.2, 10.3, 10.5, 10.6**

- [ ] 9. Checkpoint - Reconciliation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Availability Service
  - [ ] 10.1 Create IAvailabilityService interface
    - Create `brightchain-lib/src/lib/interfaces/availability/availabilityService.ts`
    - Define getAvailabilityState, getBlockLocations methods
    - Define listBlocksByState, getStatistics methods
    - Define updateLocation, removeLocation methods
    - Define partition mode methods
    - Define event subscription methods
    - _Requirements: 1.7, 7.2, 7.3, 7.4, 7.5, 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  
  - [ ] 10.2 Implement AvailabilityService class
    - Create `brightchain-api-lib/src/lib/availability/availabilityService.ts`
    - Implement state queries and updates
    - Implement partition mode handling
    - Implement event emission with filtering
    - Integrate BlockRegistry, DiscoveryProtocol, GossipService, ReconciliationService
    - Integrate HeartbeatMonitor for partition detection
    - _Requirements: 1.7, 7.2, 7.3, 7.4, 7.5, 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [ ] 10.3 Write property tests for AvailabilityService state management
    - **Property 3: Availability State Transitions**
    - **Property 4: Orphan State Transition on Partition**
    - **Property 24: Block State Query Consistency**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 7.3, 11.3**
  
  - [ ] 10.4 Write property tests for partition mode
    - **Property 14: Partition Mode Entry**
    - **Property 15: Partition Mode Exit**
    - **Validates: Requirements 7.2, 7.5, 7.7, 9.1, 14.4**
  
  - [ ] 10.5 Write property tests for events
    - **Property 28: Event Emission Completeness**
    - **Property 29: Event Filtering**
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6**

- [ ] 11. Implement Availability-Aware Block Store Wrapper
  - [ ] 11.1 Implement AvailabilityAwareBlockStore class
    - Create `brightchain-api-lib/src/lib/stores/availabilityAwareBlockStore.ts`
    - Wrap existing IBlockStore implementation
    - Add hooks for registry updates on store/delete
    - Add hooks for gossip announcements
    - Add hooks for access metadata updates
    - Implement partition mode operation restrictions
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ] 11.2 Write property tests for AvailabilityAwareBlockStore
    - **Property 1: Block Storage Side Effects**
    - **Property 2: Block Deletion Side Effects**
    - **Property 16: Partition Mode Local Operations**
    - **Property 17: Pending Sync Queue**
    - **Property 26: Wrapper Error Propagation**
    - **Validates: Requirements 1.2, 2.3, 3.2, 6.1, 12.2, 3.3, 6.5, 12.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 12.6**

- [ ] 12. Checkpoint - Core implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement Location Metadata Serialization
  - [ ] 13.1 Implement location metadata serialization
    - Add toJSON/fromJSON methods to IBlockMetadataWithLocation
    - Ensure Date fields serialize correctly
    - Add validation on deserialization
    - _Requirements: 2.6_
  
  - [ ] 13.2 Write property tests for serialization
    - **Property 8: Location Metadata Serialization Round-Trip**
    - **Validates: Requirements 2.6**

- [ ] 14. Implement Configuration and Validation
  - [ ] 14.1 Implement configuration validation
    - Create `brightchain-api-lib/src/lib/availability/configValidation.ts`
    - Validate DiscoveryConfig, GossipConfig, HeartbeatConfig
    - Return descriptive error messages for invalid config
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  
  - [ ] 14.2 Write property tests for configuration validation
    - **Property 27: Configuration Validation**
    - **Validates: Requirements 13.6**

- [ ] 15. Implement Metrics and Monitoring
  - [ ] 15.1 Implement availability metrics
    - Create `brightchain-api-lib/src/lib/availability/availabilityMetrics.ts`
    - Track block counts by state
    - Track discovery query counts and latency
    - Track partition mode duration
    - Track reconciliation operations
    - Export in Prometheus-compatible format
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  
  - [ ] 15.2 Write property tests for metrics
    - **Property 30: Metrics Accuracy**
    - **Validates: Requirements 15.1**

- [ ] 16. Implement WebSocket Message Handlers
  - [ ] 16.1 Add discovery message handlers
    - Add handlers for BLOOM_FILTER_REQUEST/RESPONSE
    - Add handlers for BLOCK_QUERY/RESPONSE
    - Add handlers for MANIFEST_REQUEST/RESPONSE
    - Integrate with existing WebSocket infrastructure
    - _Requirements: 4.2, 5.1, 5.2, 5.3_
  
  - [ ] 16.2 Add gossip message handlers
    - Add handlers for BLOCK_ANNOUNCEMENT
    - Add handlers for BLOCK_REMOVAL
    - Add handlers for ANNOUNCEMENT_BATCH
    - _Requirements: 6.1, 6.2, 6.5_
  
  - [ ] 16.3 Add heartbeat message handlers
    - Add handlers for PING/PONG
    - Integrate with HeartbeatMonitor
    - _Requirements: 7.1_

- [ ] 17. Implement Staleness Indication
  - [ ] 17.1 Add staleness tracking to location queries
    - Track locationUpdatedAt timestamp
    - Compare against configurable staleness threshold
    - Include staleness indicator in query responses
    - _Requirements: 11.6_
  
  - [ ] 17.2 Write property tests for staleness
    - **Property 25: Staleness Indication**
    - **Validates: Requirements 11.6**

- [ ] 18. Final checkpoint - All implementation complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Export and integrate
  - [ ] 19.1 Update brightchain-lib exports
    - Export all new interfaces from index
    - Export AvailabilityState enumeration
    - Export location record types
    - _Requirements: All_
  
  - [ ] 19.2 Update brightchain-api-lib exports
    - Export all new service implementations
    - Export AvailabilityAwareBlockStore
    - Export configuration types
    - _Requirements: All_
  
  - [ ] 19.3 Write integration tests
    - Test multi-node discovery scenario
    - Test partition and reconciliation scenario
    - Test gossip propagation scenario
    - _Requirements: All_

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript to match the existing codebase
- Bloom filter implementation should use the `bloom-filters` npm package
- WebSocket handlers integrate with existing Socket.io infrastructure from NetworkImplementation.md
