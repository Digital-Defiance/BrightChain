# Implementation Plan: BrightChain Architectural Gaps

## Overview

This plan addresses 8 architectural gaps across 7 phases. Each phase builds on the previous, with Phase 1 (persistence foundation) being the critical prerequisite. Tasks are organized so each builds incrementally on prior work, with property-based tests placed close to the code they validate.

## Tasks

---

### Phase 1: HeadRegistry Persistence & CBL Index Foundation

- [x] 1. Extract HeadRegistry into its own module with IHeadRegistry interface
  - [x] 1.1 Create `IHeadRegistry` interface in `brightchain-lib/src/lib/interfaces/storage/headRegistry.ts`
    - Define `getHead`, `setHead`, `removeHead`, `clear`, `load`, `getAllHeads` methods
    - `setHead`, `removeHead`, `clear` return `Promise<void>` (async for disk I/O)
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7_
  - [x] 1.2 Create `InMemoryHeadRegistry` in `brightchain-db/src/lib/headRegistry.ts` implementing `IHeadRegistry`
    - Port existing `HeadRegistry` logic from `collection.ts`
    - Keep `createIsolated()` factory for testing
    - _Requirements: 1.1_
  - [x] 1.3 Create `PersistentHeadRegistry` in `brightchain-db/src/lib/headRegistry.ts`
    - Write-through to JSON file on `setHead`, `removeHead`, `clear`
    - Load from JSON file on `load()`
    - File-level locking via `proper-lockfile` or `fs.open` with exclusive flag
    - Graceful handling of corrupt/missing files (log warning, start empty)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [x] 1.4 Write property tests for HeadRegistry persistence
    - **Property 1: HeadRegistry persistence round-trip**
    - **Validates: Requirements 1.1, 1.2**
    - **Property 2: HeadRegistry removal persistence**
    - **Validates: Requirements 1.3, 1.7**
    - **Property 3: HeadRegistry corrupt file recovery**
    - **Validates: Requirements 1.4**
  - [x] 1.5 Update `Collection` and `BrightChainDb` to use `IHeadRegistry`
    - Replace direct `HeadRegistry` usage with `IHeadRegistry` dependency injection
    - `BrightChainDbOptions` gains optional `headRegistry: IHeadRegistry` (default: `InMemoryHeadRegistry`)
    - Add `dataDir` option that auto-creates `PersistentHeadRegistry`
    - Remove old `HeadRegistry` class from `collection.ts`
    - _Requirements: 1.1, 1.6_
  - [x] 1.6 Write unit tests for HeadRegistry integration with BrightChainDb
    - Test that `BrightChainDb` with `dataDir` uses `PersistentHeadRegistry`
    - Test backward compatibility (no `dataDir` = `InMemoryHeadRegistry`)
    - Test file locking under concurrent access
    - _Requirements: 1.1, 1.5, 1.6_

- [x] 2. Fix PooledStoreAdapter CBL whitening pool scoping
  - [x] 2.1 Add pool-scoped CBL methods to `IPooledBlockStore` in `brightchain-lib`
    - Add `storeCBLWithWhiteningInPool(pool, cblData, options)` to interface
    - Add `retrieveCBLFromPool(pool, blockId1, blockId2, ...)` to interface
    - _Requirements: 3.3_
  - [x] 2.2 Implement pool-scoped CBL methods in `PooledMemoryBlockStore`
    - `storeCBLWithWhiteningInPool`: generate random block from pool, XOR, store both in pool
    - `retrieveCBLFromPool`: retrieve both blocks from pool, XOR to reconstruct
    - _Requirements: 3.1, 3.2_
  - [x] 2.3 Update `PooledStoreAdapter` to delegate CBL operations through pool
    - Override `storeCBLWithWhitening` to call `inner.storeCBLWithWhiteningInPool(this.poolId, ...)`
    - Override `retrieveCBL` to call `inner.retrieveCBLFromPool(this.poolId, ...)`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  - [x] 2.4 Write property test for pool-scoped CBL whitening
    - **Property 6: Pool-scoped CBL whitening round-trip**
    - **Validates: Requirements 3.1, 3.2, 3.4**
  - [x] 2.5 Write unit tests for CBL whitening error cases
    - Test retrieval with non-existent block IDs in pool
    - Test error message contains pool ID and block IDs
    - _Requirements: 3.5_

- [x] 3. Checkpoint - HeadRegistry and CBL whitening fix
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement CBL Index Store
  - [x] 4.1 Create `ICBLIndexEntry` and related interfaces in `brightchain-lib`
    - `ICBLIndexEntry<TId>` with generic type parameter for DTO flexibility
    - `ICBLMetadata` interface
    - `CBLVisibility` enum
    - `ICBLIndexQueryOptions` interface
    - Include `fileId`, `versionNumber`, `previousVersion` optional fields on `ICBLIndexEntry`
    - Include `fileId` filter and `versionNumber` sort option on `ICBLIndexQueryOptions`
    - Location: `brightchain-lib/src/lib/interfaces/storage/cblIndex.ts`
    - _Requirements: 4.2, 4.5, 5.1, 6.1, 27.1, 27.2, 27.3_
  - [x] 4.2 Create `CBLIndex` class in `brightchain-db/src/lib/cblIndex.ts`
    - Backed by a `Collection<ICBLIndexEntry>` named `__cbl_index__`
    - `addEntry()`: validate block existence, assign sequence number, insert
    - `getByMagnetUrl()`, `getByBlockId()`: single-entry lookups
    - `query()`: multi-attribute filtering with pagination and sort
    - `softDelete()`: set `deletedAt` timestamp
    - `getPoolCBLCounts()`: aggregate counts per pool
    - `getCrossPoolDependencies()`: find entries with blocks in multiple pools
    - Monotonically increasing sequence counter
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 4.3 Write property tests for CBL Index core operations
    - **Property 7: CBL Index entry completeness**
    - **Validates: Requirements 4.2, 5.1, 6.1**
    - **Property 8: CBL Index query correctness**
    - **Validates: Requirements 4.3, 5.2, 6.2**
    - **Property 9: CBL Index block existence validation**
    - **Validates: Requirements 4.4**
    - **Property 10: CBL Index soft-delete preserves entry**
    - **Validates: Requirements 4.6**
    - **Property 11: CBL Index pagination completeness and ordering**
    - **Validates: Requirements 4.7**
  - [x] 4.4 Implement pool-scoped CBL tracking features
    - Pool deletion reporting via `getPoolCBLCounts()` and query by pool
    - Cross-pool dependency detection in `getCrossPoolDependencies()`
    - _Requirements: 5.3, 5.4, 5.5_
  - [x] 4.5 Write property tests for pool-scoped CBL tracking
    - **Property 12: CBL Index pool deletion reporting**
    - **Validates: Requirements 5.3**
    - **Property 13: CBL Index cross-pool dependency tracking**
    - **Validates: Requirements 5.4, 5.5**

- [x] 5. Implement user-level CBL tracking
  - [x] 5.1 Add user collection and sharing features to `CBLIndex`
    - `userCollection` field support in `addEntry()` and `query()`
    - `shareWith()`: add user ID to `sharedWith` array, set visibility to `shared`
    - Visibility-based query filtering (private: creator only, shared: creator + sharedWith, public: all)
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  - [x] 5.2 Add file version history features to `CBLIndex`
    - `addVersion(fileId, entry)`: auto-assign `versionNumber` (max + 1), set `previousVersion` to current latest's magnet URL
    - `getVersionHistory(fileId)`: return all versions sorted by `versionNumber` ascending
    - `getLatestVersion(fileId)`: return latest version via sort + limit 1
    - Handle first version (versionNumber=1, no previousVersion)
    - Ensure soft-deleted versions don't break the chain
    - _Requirements: 27.4, 27.5, 27.6, 27.7, 27.8, 27.9_
  - [x] 5.3 Write property tests for user-level CBL tracking
    - **Property 14: CBL Index user collection organization**
    - **Validates: Requirements 6.3**
    - **Property 15: CBL Index sharing without duplication**
    - **Validates: Requirements 6.4**
    - **Property 16: CBL Index visibility enforcement**
    - **Validates: Requirements 6.5**
  - [x] 5.4 Write property tests for file version history
    - **Property 39: Version history chain integrity**
    - **Validates: Requirements 27.1, 27.2, 27.3, 27.4, 27.5**
    - **Property 40: Latest version resolution**
    - **Validates: Requirements 27.6, 27.7**
    - **Property 41: Version chain survives soft-delete**
    - **Validates: Requirements 27.8**

- [x] 6. Checkpoint - CBL Index complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 2: CBL Durability & Cross-Node Sync

- [x] 7. Implement CBL Index durability
  - [x] 7.1 Add FEC redundancy to CBL Index collection metadata
    - Configure the `__cbl_index__` collection to store metadata blocks with FEC parity
    - Use existing `FecService` for parity generation
    - Make parity count configurable via `CBLIndexOptions`
    - _Requirements: 7.1_
  - [x] 7.2 Implement CBL Index snapshot and restore
    - `snapshot()`: serialize index state, store as CBL, return magnet URL
    - `restoreFromSnapshot()`: retrieve CBL by magnet URL, deserialize, replace index state
    - Automatic periodic snapshots (configurable mutation count threshold, default: 100)
    - _Requirements: 7.2, 7.3_
  - [x] 7.3 Implement CBL Index recovery on startup
    - Recovery order: (1) latest snapshot, (2) FEC parity rebuild, (3) block store scan using `isCblBlock()` and `extractCblAddresses()`
    - Log warning on partial rebuild (metadata lost)
    - _Requirements: 7.4, 7.5_
  - [x] 7.4 Write property tests for CBL Index durability
    - **Property 17: CBL Index snapshot round-trip**
    - **Validates: Requirements 7.2**
    - **Property 18: CBL Index sequence number monotonicity**
    - **Validates: Requirements 7.6**
  - [x] 7.5 Write unit tests for CBL Index recovery
    - Test recovery from snapshot
    - Test recovery from FEC parity
    - Test partial rebuild from block scan (verify metadata loss warning)
    - Test recovery ordering (snapshot preferred over FEC over scan)
    - _Requirements: 7.4, 7.5_

- [x] 8. Implement cross-node CBL Index synchronization
  - [x] 8.1 Extend gossip announcements for CBL Index entries
    - Add `cbl_index_update` and `cbl_index_delete` announcement types to `BlockAnnouncement`
    - Announce new CBL index entries to peers in the same pool
    - Announce soft-deletions to peers
    - _Requirements: 8.1, 8.6_
  - [x] 8.2 Implement CBL Index merge logic for incoming announcements
    - Merge new entries (idempotent: skip if magnet URL already exists)
    - Handle conflicts (same magnet URL, different content): preserve both, flag conflict
    - Process soft-delete announcements
    - _Requirements: 8.2, 8.3, 8.6_
  - [x] 8.3 Extend reconciliation for CBL Index manifests
    - Exchange CBL index manifests (magnet URL to sequence number) during pool-scoped reconciliation
    - Fetch missing entries from peers
    - _Requirements: 8.4_
  - [x] 8.4 Extend discovery protocol for CBL metadata search
    - Add CBL metadata search to `IDiscoveryProtocol`
    - Search by file name, MIME type, tags across pool peers
    - _Requirements: 8.5_
  - [x] 8.5 Write property tests for CBL Index sync
    - **Property 19: CBL Index gossip idempotence**
    - **Validates: Requirements 8.2**
    - **Property 20: CBL Index conflict preservation**
    - **Validates: Requirements 8.3**
    - **Property 21: CBL Index soft-delete propagation**
    - **Validates: Requirements 8.6**

- [x] 9. Implement HeadRegistry cross-node synchronization
  - [x] 9.1 Extend gossip for HeadRegistry announcements
    - Add `head_update` announcement type to `BlockAnnouncement`
    - Announce head pointer updates with dbName, collectionName, blockId, timestamp
    - _Requirements: 2.1_
  - [x] 9.2 Implement HeadRegistry merge and conflict resolution
    - Last-writer-wins based on block metadata timestamps
    - Defer updates for blocks not yet fetched locally
    - _Requirements: 2.2, 2.3, 2.4_
  - [x] 9.3 Write property tests for HeadRegistry sync
    - **Property 4: HeadRegistry gossip announcement on update**
    - **Validates: Requirements 2.1**
    - **Property 5: HeadRegistry last-writer-wins conflict resolution**
    - **Validates: Requirements 2.2, 2.3**

- [x] 10. Checkpoint - Phase 2 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 3: Pool Authentication & Access Control

- [x] 11. Implement node authentication
  - [x] 11.1 Create `INodeAuthenticator` interface in `brightchain-lib`
    - `createChallenge()`, `signChallenge()`, `verifySignature()`, `deriveNodeId()`
    - All key/signature parameters use `Uint8Array` (browser-compatible)
    - Location: `brightchain-lib/src/lib/interfaces/auth/nodeAuthenticator.ts`
    - _Requirements: 9.1, 9.2, 9.4_
  - [x] 11.2 Implement `ECDSANodeAuthenticator` in `brightchain-api-lib`
    - Use Node.js `crypto` module for ECDSA operations
    - Challenge: 32 random bytes
    - Sign/verify using secp256k1 curve (consistent with existing BrightChain crypto)
    - _Requirements: 9.1, 9.2, 9.5_
  - [x] 11.3 Write property test for ECDSA authentication
    - **Property 22: ECDSA challenge-response round-trip**
    - **Validates: Requirements 9.1, 9.2**
  - [x] 11.4 Write unit tests for authentication error cases
    - Test invalid signature rejection with logging
    - Test wrong key pair rejection
    - _Requirements: 9.3_

- [x] 12. Implement Pool ACL
  - [x] 12.1 Create `PoolPermission` enum and `IPoolACL` interface in `brightchain-lib`
    - `PoolPermission` enum: Read, Write, Replicate, Admin
    - `IPoolACL<TId>` with generic type parameter
    - `IPoolACLMember<TId>` interface
    - `hasPermission()` and `hasQuorum()` utility functions
    - Location: `brightchain-lib/src/lib/interfaces/auth/poolAcl.ts`
    - _Requirements: 10.1, 10.2, 11.2, 11.3_
  - [x] 12.2 Implement ACL storage as signed blocks
    - Serialize ACL to JSON, sign with admin's ECDSA key, store as block
    - Load and verify ACL signature on retrieval
    - ACL chain: each update references previous ACL block ID
    - _Requirements: 11.1, 13.3_
  - [x] 12.3 Implement pool creation bootstrap
    - Auto-create ACL with creator as sole Admin on pool creation
    - Sign initial ACL with creator's key
    - Support `publicRead` and `publicWrite` flags
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  - [x] 12.4 Implement quorum-based ACL updates
    - Collect signatures from Admin members
    - Verify majority (>50%) of Admins have signed
    - Single-admin mode: no quorum required
    - Prevent removal of last Admin
    - _Requirements: 13.1, 13.2, 13.5, 13.6_
  - [x] 12.5 Write property tests for ACL
    - **Property 23: ACL permission enforcement**
    - **Validates: Requirements 10.3, 10.4, 10.5, 11.4, 11.5, 11.6, 11.7**
    - **Property 24: ACL completeness**
    - **Validates: Requirements 11.2**
    - **Property 25: Pool creation bootstrap**
    - **Validates: Requirements 12.1, 12.3**
    - **Property 26: Public access flags**
    - **Validates: Requirements 12.5, 12.6**
    - **Property 27: Quorum requirement for ACL updates**
    - **Validates: Requirements 13.1, 13.5**
    - **Property 28: ACL chain integrity**
    - **Validates: Requirements 13.3**
    - **Property 29: ACL minimum admin invariant**
    - **Validates: Requirements 13.6**

- [x] 13. Integrate ACL enforcement at all layers
  - [x] 13.1 Add ACL checks to block store operations
    - Wrap `putInPool`, `getFromPool`, `deleteFromPool` with permission checks
    - Create `ACLEnforcedBlockStore` wrapper or middleware
    - _Requirements: 11.4, 10.3, 10.4_
  - [x] 13.2 Add ACL checks to gossip, reconciliation, and discovery
    - Filter gossip announcements by pool ACL (Write/Replicate required)
    - Verify Replicate permission during reconciliation
    - Verify Read permission during discovery
    - _Requirements: 11.5, 11.6, 11.7_
  - [x] 13.3 Propagate ACL updates via gossip
    - Add `acl_update` announcement type
    - Distribute approved ACL updates to pool peers
    - _Requirements: 13.4_
  - [x] 13.4 Write unit tests for ACL enforcement integration
    - Test permission denied errors at each enforcement point
    - Test error message content (required permission, actual permissions, pool ID)
    - _Requirements: 10.6, 11.4, 11.5, 11.6, 11.7_

- [x] 14. Checkpoint - Phase 3 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 4: Encrypted Pool Storage

- [x] 15. Implement pool encryption
  - [x] 15.1 Create encryption interfaces in `brightchain-lib`
    - `EncryptionMode` enum: None, NodeSpecific, PoolShared
    - `IEncryptedPoolOptions` interface
    - `IPoolEncryptionConfig` interface with key version history
    - `IKeyVersion` interface
    - Location: `brightchain-lib/src/lib/interfaces/storage/encryptedPool.ts`
    - _Requirements: 14.1, 14.4, 14.6_
  - [x] 15.2 Implement encryption service in `brightchain-api-lib`
    - `PoolEncryptionService` class
    - Node-specific: ECIES encrypt/decrypt using node's key pair
    - Pool-shared: AES-256-GCM with shared key, key encrypted per-member via ECIES
    - Block ID = hash of ciphertext (not plaintext)
    - _Requirements: 14.2, 14.3, 14.5_
  - [x] 15.3 Implement key management
    - Key generation for pool-shared mode
    - Key distribution: encrypt pool key with each member's public key
    - Key rotation: generate new key version, re-encrypt for current members, retain old version
    - Member removal triggers key rotation
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_
  - [x] 15.4 Write property tests for encryption
    - **Property 30: Encryption round-trip**
    - **Validates: Requirements 14.2, 14.3**
    - **Property 31: Block ID is hash of ciphertext**
    - **Validates: Requirements 14.5**
    - **Property 32: Key distribution to all members**
    - **Validates: Requirements 15.2, 15.3**
    - **Property 33: Key rotation preserves old block access**
    - **Validates: Requirements 15.4**
    - **Property 34: Member removal triggers key rotation**
    - **Validates: Requirements 15.5**

- [x] 16. Implement encrypted metadata and replication
  - [x] 16.1 Implement searchable metadata configuration
    - Pool config specifies searchable fields
    - Encrypt non-searchable CBL Index metadata fields
    - Block IDs always remain unencrypted
    - Reject queries on encrypted fields with descriptive error
    - Block content-based indexing on encrypted blocks
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x] 16.2 Implement encryption-aware replication
    - Block replication for node-specific pools (not allowed)
    - Allow replication for pool-shared and none modes
    - Distribute pool key to new members before replication
    - Encrypt FEC parity blocks with same key as data blocks
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  - [x] 16.3 Write property tests for encrypted metadata and replication
    - **Property 35: Block IDs always unencrypted**
    - **Validates: Requirements 16.2**
    - **Property 36: Encrypted metadata field access control**
    - **Validates: Requirements 16.3, 16.4, 16.5**
    - **Property 37: Replication allowed by encryption mode**
    - **Validates: Requirements 17.1, 17.2**
    - **Property 38: Encrypted parity blocks**
    - **Validates: Requirements 17.5**

- [x] 17. Checkpoint - Phase 4 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 5: Browser Compatibility Audit

- [x] 18. Audit and fix brightchain-lib browser compatibility
  - [x] 18.1 Scan brightchain-lib for Node.js-specific imports
    - Search for imports of `fs`, `path`, `crypto`, `os`, `net`, `child_process`, `buffer`
    - Replace `Buffer` usage in interfaces with `Uint8Array`
    - Replace Node.js `crypto` with Web Crypto API or `@noble/hashes`/`@noble/curves`
    - _Requirements: 18.1, 18.2, 18.6_
  - [x] 18.2 Isolate unavoidable platform-specific code
    - Create platform detection boundary for any remaining Node.js-specific code
    - Document platform-specific code with clear comments
    - _Requirements: 18.4_
  - [x] 18.3 Add browser build verification
    - Add a build step targeting browser environment (esbuild with `platform: 'browser'`)
    - Integrate into CI/Nx pipeline
    - _Requirements: 18.3_
  - [x] 18.4 Write browser compatibility tests
    - Test that brightchain-lib builds for browser without errors
    - Test that no Node.js-specific imports exist at top level
    - Test that interfaces use Uint8Array instead of Buffer
    - _Requirements: 18.1, 18.3, 18.6_

- [x] 19. Checkpoint - Phase 5 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### Phase 6: Documentation Updates

- [x] 20. Create and update documentation
  - [x] 20.1 Create `docs/Storage_Pools_Architecture.md`
    - Cover pool concepts, namespace isolation, pool-scoped whitening, cross-node coordination
    - Cover pool lifecycle, authentication, access control, use cases
    - Include Mermaid architecture diagrams
    - Include code examples for pool creation, storage, retrieval
    - Reference the four existing pool specs
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
  - [x] 20.2 Update `README.md`
    - Add Storage Pools overview section
    - Add pool-based storage isolation section
    - Add cross-node coordination section
    - Link to Storage Pools Architecture document
    - _Requirements: 20.1_
  - [x] 20.3 Update `docs/BrightChain Writeup.md` and `docs/BrightChain Summary.md`
    - Add pool-based storage architecture subsection to Writeup
    - Add bullet points for pools, whitening, coordination, consistency to Summary
    - _Requirements: 20.2, 20.3_
  - [x] 20.4 Create API documentation
    - Document `IPooledBlockStore` methods with examples
    - Document `PooledStoreAdapter` usage patterns
    - Document `ReadConcern` enum and usage
    - Document pool-related gossip and reconciliation
    - Document error types and handling patterns
    - _Requirements: 21.1, 21.2, 21.3_

---

### Phase 7: Showcase Updates

- [x] 21. Implement showcase demos

For things that don't have components that live in brightchain-lib we will have to simulate or mock them and explain the component.

  - [x] 21.1 Create Storage Pools demo page
    - Pool creation, data storage in different pools, isolation demo, pool deletion
    - Live code examples against in-memory block store
    - Explanatory text for each operation
    - _Requirements: 22.1, 22.2, 22.3_
  - [x] 21.2 Create Messaging/Communication demo page
    - Encrypted messages, group chats, channels, presence indicators
    - Explanatory text on encryption and privacy model
    - _Requirements: 23.1, 23.2_
  - [x] 21.3 Create BrightPass demo page
    - Vault creation, credential storage, password generation, breach checking, TOTP/2FA
    - Explanatory text on security model
    - _Requirements: 24.1, 24.2_
  - [x] 21.4 Create Database demo page
    - Database with pool isolation, insert/query, transactions, aggregation pipeline
    - Explanatory text on copy-on-write storage model
    - _Requirements: 25.1, 25.2_

- [x] 22. Final checkpoint - All phases complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between phases
- Property tests validate universal correctness properties using `fast-check`
- Unit tests validate specific examples, edge cases, and error conditions
- Run tests with: `NX_TUI=false npx nx test <project> --outputStyle=stream`
- All shared interfaces go in `brightchain-lib` with generic type parameters for DTO flexibility
- Node.js-specific implementations go in `brightchain-api-lib` or `brightchain-db`
