# Implementation Plan: Backend Blockstore Quorum

## Overview

This implementation plan breaks down the Backend Blockstore Quorum feature into discrete coding tasks. The plan follows an incremental approach:

1. **Phase 1**: Enhance IBlockStore interface in brightchain-lib with FEC/durability/replication methods
2. **Phase 2**: Create IFecService interface and implementations
3. **Phase 3**: Create IBlockMetadataStore interface and MemoryBlockMetadataStore in brightchain-lib
4. **Phase 4**: Update MemoryBlockStore to implement enhanced interface
5. **Phase 5**: Create DiskBlockMetadataStore in brightchain-api-lib
6. **Phase 6**: Update DiskBlockAsyncStore to implement enhanced interface
7. **Phase 7**: Implement Quorum Service and API layer

Each task builds on previous work to ensure no orphaned code. All interfaces and core implementations go in brightchain-lib, while disk-specific implementations go in brightchain-api-lib.

## Tasks

- [x] 1. Enhance IBlockStore Interface
  - [x] 1.1 Create durability and replication types in brightchain-lib
    - Create `brightchain-lib/src/lib/enumerations/durabilityLevel.ts`
    - Create `brightchain-lib/src/lib/enumerations/replicationStatus.ts`
    - Define DurabilityLevel enum (Ephemeral, Standard, HighDurability)
    - Define ReplicationStatus enum (Pending, Replicated, UnderReplicated, Failed)
    - _Requirements: 1.1, 4.1, 5.1_
  
  - [x] 1.2 Create IBlockMetadata interface in brightchain-lib
    - Create `brightchain-lib/src/lib/interfaces/storage/blockMetadata.ts`
    - Define IBlockMetadata with durability, parity, and replication fields
    - Define BlockStoreOptions interface
    - Define RecoveryResult interface
    - _Requirements: 1.5, 2.1, 2.6, 2.7_
  
  - [x] 1.3 Extend IBlockStore interface with FEC and replication methods
    - Modify `brightchain-lib/src/lib/interfaces/storage/blockStore.ts`
    - Add setData options parameter for durability
    - Add getMetadata, updateMetadata methods
    - Add generateParityBlocks, getParityBlocks, recoverBlock, verifyBlockIntegrity methods
    - Add getBlocksPendingReplication, getUnderReplicatedBlocks, recordReplication, recordReplicaLoss methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 1.4 Export new types from brightchain-lib index
    - Update `brightchain-lib/src/index.ts`
    - Export DurabilityLevel, ReplicationStatus, IBlockMetadata, BlockStoreOptions, RecoveryResult
    - _Requirements: 1.1_

- [x] 2. Create IFecService Interface and Implementations
  - [x] 2.1 Create IFecService interface in brightchain-lib
    - Create `brightchain-lib/src/lib/interfaces/services/fecService.ts`
    - Define IFecService with isAvailable, createParityData, recoverFileData, verifyFileIntegrity methods
    - Define ParityData and FecRecoveryResult interfaces
    - _Requirements: 1.8, 4.5, 4.6, 4.8_
  
  - [x] 2.2 Create NativeRsFecService implementation in brightchain-api-lib
    - Create `brightchain-api-lib/src/lib/services/nativeRsFecService.ts`
    - Implement IFecService using `@digitaldefiance/node-rs-accelerate`
    - Add isAvailable check for Apple Silicon hardware
    - _Requirements: 1.8, 4.5, 4.6_
  
  - [x] 2.3 Update existing FecService to implement IFecService
    - Modify `brightchain-api-lib/src/lib/services/fec.ts`
    - Rename to WasmFecService or update to implement IFecService
    - Add isAvailable method
    - _Requirements: 1.8, 4.5, 4.6_
  
  - [x] 2.4 Create FecServiceFactory in brightchain-api-lib
    - Create `brightchain-api-lib/src/lib/services/fecServiceFactory.ts`
    - Implement getBestAvailable() to select NativeRs > Wasm based on availability
    - _Requirements: 1.8_

- [x] 3. Implement IBlockMetadataStore Interface in brightchain-lib
  - [x] 3.1 Create IBlockMetadataStore interface in brightchain-lib
    - Create `brightchain-lib/src/lib/interfaces/storage/blockMetadataStore.ts`
    - Define create, get, update, delete, findExpired, findByReplicationStatus, recordAccess methods
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.6_
  
  - [x] 3.2 Create MemoryBlockMetadataStore implementation in brightchain-lib
    - Create `brightchain-lib/src/lib/stores/memoryBlockMetadataStore.ts`
    - Implement IBlockMetadataStore using Map<string, IBlockMetadata>
    - _Requirements: 1.6, 2.1, 2.2, 2.3_
  
  - [x] 3.3 Export IBlockMetadataStore and MemoryBlockMetadataStore from brightchain-lib
    - Update `brightchain-lib/src/index.ts`
    - _Requirements: 1.6_

- [x] 4. Update MemoryBlockStore with FEC Support
  - [x] 4.1 Add FEC service integration to MemoryBlockStore
    - Modify `brightchain-lib/src/lib/stores/memoryBlockStore.ts`
    - Add optional IFecService dependency (injected, for environments where FEC is available)
    - Add in-memory parity block storage (Map<string, Uint8Array[]>)
    - _Requirements: 1.6, 1.8_
  
  - [x] 4.2 Implement metadata operations in MemoryBlockStore
    - Add MemoryBlockMetadataStore as dependency
    - Implement getMetadata, updateMetadata methods
    - Update setData to accept options and create metadata with durability options
    - Update getData to record access
    - Update deleteData to delete metadata and parity blocks
    - _Requirements: 1.5, 1.6, 2.1, 2.2_
  
  - [x] 4.3 Implement FEC operations in MemoryBlockStore
    - Implement generateParityBlocks using IFecService.createParityData
    - Implement getParityBlocks to return stored parity block IDs
    - Implement recoverBlock using IFecService.recoverFileData
    - Implement verifyBlockIntegrity using IFecService.verifyFileIntegrity
    - Handle case where FEC service is not available (return error or no-op)
    - _Requirements: 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  
  - [x] 4.4 Implement replication tracking in MemoryBlockStore
    - Implement getBlocksPendingReplication
    - Implement getUnderReplicatedBlocks
    - Implement recordReplication
    - Implement recordReplicaLoss
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 4.5 Write property tests for MemoryBlockStore FEC operations
    - **Property: Block FEC Round-Trip** - Store with durability, verify parity generation, corrupt block, recover
    - **Validates: Requirements 4.1, 4.2, 4.5, 4.6**
  
  - [x] 4.6 Write property tests for MemoryBlockStore replication tracking
    - **Property: Replication Status Tracking** - Store with replication, record replicas, verify status
    - **Validates: Requirements 5.1, 5.3, 5.4**

- [x] 5. Checkpoint - MemoryBlockStore Enhanced
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create DiskBlockMetadataStore in brightchain-api-lib
  - [x] 6.1 Create DiskBlockMetadataStore class in brightchain-api-lib
    - Create `brightchain-api-lib/src/lib/stores/diskBlockMetadataStore.ts`
    - Implement IBlockMetadataStore with JSON file storage (*.m.json)
    - Store metadata alongside block data files
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 6.2 Write property tests for block metadata serialization round-trip
    - **Property 29: Block Metadata Serialization Round-Trip**
    - **Validates: Requirements 16.2**
  
  - [x] 6.3 Write property tests for block metadata persistence
    - **Property 1: Block Metadata Persistence Round-Trip**
    - **Validates: Requirements 2.1, 2.3**

- [x] 7. Update DiskBlockAsyncStore with FEC Support
  - [x] 7.1 Integrate DiskBlockMetadataStore into DiskBlockAsyncStore
    - Modify `brightchain-api-lib/src/lib/stores/diskBlockAsyncStore.ts`
    - Add DiskBlockMetadataStore as dependency
    - Create metadata on block storage
    - Update metadata on block access
    - Delete metadata on block deletion
    - _Requirements: 1.7, 2.1, 2.2_
  
  - [x] 7.2 Implement FEC operations in DiskBlockAsyncStore
    - Integrate IFecService via FecServiceFactory for parity generation
    - Implement generateParityBlocks - store parity as separate files ({blockId}.p0, {blockId}.p1)
    - Implement getParityBlocks
    - Implement recoverBlock
    - Implement verifyBlockIntegrity
    - _Requirements: 1.7, 1.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  
  - [x] 7.3 Implement replication tracking in DiskBlockAsyncStore
    - Implement getBlocksPendingReplication
    - Implement getUnderReplicatedBlocks
    - Implement recordReplication
    - Implement recordReplicaLoss
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [x] 7.4 Implement block expiration and cleanup methods
    - Add cleanupExpiredBlocks method
    - Implement findExpired to identify expired blocks
    - Add CBL reference checking before deletion
    - Delete parity blocks when deleting data blocks
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 7.5 Write property tests for access tracking
    - **Property 2: Block Access Tracking**
    - **Validates: Requirements 2.2**
  
  - [x] 7.6 Write property tests for expiration identification
    - **Property 3: Block Expiration Identification**
    - **Validates: Requirements 3.1, 3.4**
  
  - [x] 7.7 Write property tests for cleanup with CBL protection
    - **Property 4: Block Cleanup with CBL Protection**
    - **Validates: Requirements 3.2, 3.4**
  
  - [x] 7.8 Write property tests for DiskBlockAsyncStore FEC operations
    - **Property: Disk Block FEC Round-Trip**
    - **Validates: Requirements 4.1, 4.5, 4.6**

- [x] 8. Implement XOR Brightening Operations
  - [x] 8.1 Add brightenBlock method to DiskBlockAsyncStore
    - XOR operation with random blocks (use existing xorMultipleTransform)
    - Return brightened block and list of random block IDs
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 8.2 Write property tests for XOR brightening correctness
    - **Property 5: XOR Brightening Correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 9. Checkpoint - Block Store Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Quorum Service

  - **Architecture Note**: All core logic goes in brightchain-lib (platform-agnostic) and brightchain-api-lib (disk-specific). Only thin execution stubs/wiring should be in brightchain-api.
  
  - [x] 10.1 Create QuorumService class in brightchain-lib
    - Create `brightchain-lib/src/lib/services/quorumService.ts`
    - Wrap BrightChainQuorum from brightchain-lib
    - Implement member management methods (addMember, removeMember, getMember, listMembers)
    - Use IBlockStore interface for storage abstraction
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 10.2 Implement document sealing in QuorumService (brightchain-lib)
    - Add sealDocument method using SealingService
    - Use IDocumentStore interface for persistence abstraction
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 10.1_
  
  - [x] 10.3 Implement document unsealing in QuorumService (brightchain-lib)
    - Add unsealDocument method
    - Implement share validation and decryption
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [x] 10.4 Implement document management methods (brightchain-lib)
    - Add getDocument, listDocuments, deleteDocument, canUnlock methods
    - _Requirements: 10.2, 10.3, 10.4_
  
  - [x] 10.5 Create DiskQuorumService in brightchain-api-lib
    - Create `brightchain-api-lib/src/lib/services/diskQuorumService.ts`
    - Extend QuorumService with disk-specific storage (DiskBlockAsyncStore, BlockDocumentStore)
    - Wire up FEC service for durability
    - _Requirements: 7.1, 8.1, 9.1, 10.1_

  - [x] 10.6 Create MemoryQuorumService in brightchain-lib
    - Create `brightchain-lib/src/lib/services/memoryQuorumService.ts`
    - Extend QuorumService with memory storage (MemoryBlockAsyncStore, BlockDocumentStore)
    - Wire up FEC service for durability
    - _Requirements: 7.1, 8.1, 9.1, 10.1_    
  
  - [x] 10.7 Create QuorumService execution stub in brightchain-api
    - Create `brightchain-api/src/services/quorum.ts`
    - Thin wrapper that instantiates DiskQuorumService with application dependencies
    - No business logic - only dependency injection and initialization
    - _Requirements: 7.1_
  
  - [x] 10.8 Write property tests for member management round-trip (brightchain-lib)
    - **Property 6: Member Management Round-Trip**
    - **Validates: Requirements 7.1, 7.3, 7.4**
  
  - [x] 10.9 Write property tests for seal/unseal round-trip (brightchain-lib)
    - **Property 9: Seal/Unseal Round-Trip**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
  
  - [x] 10.10 Write property tests for QuorumDataRecord serialization (brightchain-lib)
    - **Property 28: QuorumDataRecord Serialization Round-Trip**
    - **Validates: Requirements 16.1**

- [x] 11. Checkpoint - Quorum Service Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Enhanced Blocks Controller
  - [x] 12.1 Extend BlocksController with metadata endpoints
    - Add GET /api/blocks/:id/metadata endpoint
    - Update existing endpoints to include metadata in responses
    - Add durability options to POST /api/blocks
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 12.2 Add brighten endpoint to BlocksController
    - Add POST /api/blocks/brighten endpoint
    - _Requirements: 11.5_
  
  - [x] 12.3 Implement error handling for block endpoints
    - Add proper 404, 400, 401 responses
    - _Requirements: 11.6, 11.7, 15.1, 15.2, 15.4_
  
  - [x] 12.4 Write property tests for Block API round-trip
    - **Property 13: Block API Round-Trip**
    - **Validates: Requirements 11.1, 11.2, 11.4**

- [x] 13. Implement Quorum Controller
  - [x] 13.1 Create QuorumController class
    - Create `brightchain-api/src/controllers/api/quorum.ts`
    - Implement member management endpoints (POST, GET, DELETE /api/quorum/members)
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 13.2 Implement document sealing/unsealing endpoints
    - Add POST /api/quorum/documents/seal
    - Add POST /api/quorum/documents/:id/unseal
    - Add GET /api/quorum/documents/:id
    - Add GET /api/quorum/documents/:id/can-unlock
    - _Requirements: 12.4, 12.5, 12.6, 12.7_
  
  - [x] 13.3 Wire QuorumController into API router
    - Update `brightchain-api/src/routers/api.ts`
    - Add /api/quorum routes
    - _Requirements: 12.1-12.7_
  
  - [x] 13.4 Write property tests for Quorum API round-trip
    - **Property 18: Quorum Document API Round-Trip**
    - **Validates: Requirements 12.4, 12.5**

- [x] 14. Implement CBL Controller
  - [x] 14.1 Create CBLController class
    - Create `brightchain-api/src/controllers/api/cbl.ts`
    - Implement POST /api/cbl, GET /api/cbl/:id, GET /api/cbl/:id/blocks, DELETE /api/cbl/:id
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 14.2 Wire CBLController into API router
    - Update `brightchain-api/src/routers/api.ts`
    - Add /api/cbl routes
    - _Requirements: 14.1-14.4_
  
  - [x] 14.3 Write property tests for CBL API round-trip
    - **Property 24: CBL API Round-Trip**
    - **Validates: Requirements 14.1, 14.2**
  
  - [x] 14.4 Write property tests for CBL serialization
    - **Property 30: CBL Serialization Round-Trip**
    - **Validates: Requirements 16.3**

- [x] 15. Checkpoint - API Layer Complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Implement Document Store Integration
  - [x] 16.1 Extend BlockDocumentStore with encryption support
    - Modify `brightchain-api-lib/src/lib/datastore/block-document-store.ts`
    - Add optional encryption flag to create method
    - Integrate with QuorumService for sealing/unsealing
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 16.2 Implement access control for document queries
    - Filter documents based on requesting user's membership
    - _Requirements: 13.4_
  
  - [x] 16.3 Write property tests for encrypted document round-trip
    - **Property 21: Encrypted Document Store Round-Trip**
    - **Validates: Requirements 13.1, 13.2**
  
  - [x] 16.4 Write property tests for document access control
    - **Property 23: Document Store Access Control**
    - **Validates: Requirements 13.4**

- [x] 17. Implement Consistent Error Handling
  - [x] 17.1 Create error response utilities
    - Create `brightchain-api/src/utils/errorResponse.ts`
    - Implement consistent error response format
    - Define error code constants
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  
  - [x] 17.2 Update all controllers to use consistent error handling
    - Apply error utilities to BlocksController, QuorumController, CBLController
    - _Requirements: 15.6_
  
  - [x] 17.3 Write property tests for error response consistency
    - **Property 27: Error Response Format Consistency**
    - **Validates: Requirements 15.6**

- [x] 18. Final Integration and Wiring
  - [x] 18.1 Update application initialization
    - Ensure all services are properly initialized
    - Wire up DiskBlockMetadataStore with DiskBlockAsyncStore
    - Initialize QuorumService with required dependencies
    - Initialize FecServiceFactory and inject into block stores
    - _Requirements: All_
  
  - [x] 18.2 Add API documentation comments
    - Document all new endpoints with JSDoc
    - _Requirements: All_

- [x] 19. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- **Key ordering**: Interface enhancement → IFecService → IBlockMetadataStore → MemoryBlockStore → DiskBlockAsyncStore → API layer
- All interfaces go in brightchain-lib, disk-specific implementations go in brightchain-api-lib
- FEC implementations: NativeRsFecService (Apple Silicon via @digitaldefiance/node-rs-accelerate) and WasmFecService (cross-platform)
- Replication interfaces are in place for future implementation - tracking only, no actual replication yet
