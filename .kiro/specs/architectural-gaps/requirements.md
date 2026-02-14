# Requirements Document: BrightChain Architectural Gaps

## Introduction

This mega spec addresses the remaining architectural gaps in BrightChain, covering persistent storage foundations, CBL index management, pool authentication, encrypted storage, browser compatibility, documentation, and showcase updates. The requirements are organized into seven phases reflecting implementation dependencies: foundational persistence must come first, then durability and sync, then security layers, then encryption, then browser audit, and finally documentation and demos.

The spec incorporates 6 gaps identified in `docs/gaps.md` plus 2 additional gaps discovered during codebase analysis: HeadRegistry persistence (Gap #7) and PooledStoreAdapter CBL whitening bypass (Gap #8).

## Glossary

- **HeadRegistry**: Singleton registry mapping `(dbName, collectionName)` pairs to the block ID of the latest metadata block for that collection. Currently in-memory only.
- **CBL**: Constituent Block List — a data structure listing the block checksums that compose a stored file or object.
- **CBL_Index**: A higher-level registry that tracks whitened CBL storage results (magnet URLs, block ID pairs, metadata). Distinct from the low-level `ICBLStore` interface which handles raw CBL block storage.
- **CBL_Storage_Result**: The result of `storeCBLWithWhitening()`, containing `blockId1`, `blockId2`, `blockSize`, and `magnetUrl`.
- **Magnet_URL**: A URI encoding the two XOR component block IDs, block size, optional parity IDs, and encryption flag needed to reconstruct a whitened CBL.
- **PooledStoreAdapter**: Adapter in `brightchain-db` that wraps an `IPooledBlockStore` and exposes `IBlockStore` scoped to a specific pool.
- **Pool**: A lightweight namespace prefix on block IDs providing logical grouping without separate physical storage.
- **PoolId**: String identifier for a pool, matching `/^[a-zA-Z0-9_-]{1,64}$/`.
- **ACL**: Access Control List — defines which nodes have which permissions on a pool.
- **ECDSA**: Elliptic Curve Digital Signature Algorithm — used for node identity and authentication.
- **ECIES**: Elliptic Curve Integrated Encryption Scheme — used for encrypting data to specific public keys.
- **FEC**: Forward Error Correction — Reed-Solomon encoding for block redundancy and recovery.
- **Gossip_Service**: Service that propagates block announcements and pool events across nodes.
- **Reconciliation_Service**: Service that synchronizes block manifests between nodes after partition recovery.
- **Discovery_Protocol**: Protocol for locating blocks and CBLs across the network.
- **Block_Store**: The underlying storage layer for blocks (disk or memory).
- **Whitening**: XOR-based Owner Free storage pattern where data is split into two or more XOR components.
- **Bloom_Filter**: Probabilistic data structure used for efficient set membership testing in block registries.
- **Read_Concern**: Consistency level for reads (Local, Available, Consistent).
- **DiskBlockAsyncStore**: Node.js disk-based implementation of `IPooledBlockStore` in `brightchain-api-lib`.
- **Showcase**: The `/showcase` demo application demonstrating BrightChain features.
- **FileId**: A stable identifier grouping all versions of the same logical file across CBL Index entries.

## Requirements

---

## Phase 1: HeadRegistry Persistence & CBL Index Foundation

### Requirement 1: HeadRegistry Disk Persistence

**User Story:** As a node operator, I want the HeadRegistry to persist head pointers to disk, so that all brightchain-db collections survive process restarts without data loss.

#### Acceptance Criteria

1. WHEN a BrightChainDb instance is created with a disk-backed block store, THE HeadRegistry SHALL load previously persisted head pointers from disk into memory.
2. WHEN `HeadRegistry.setHead()` is called, THE HeadRegistry SHALL persist the updated head pointer to disk before the call returns.
3. WHEN `HeadRegistry.removeHead()` is called, THE HeadRegistry SHALL remove the head pointer from disk before the call returns.
4. IF the persisted head pointer file is corrupted or unreadable, THEN THE HeadRegistry SHALL log a warning and start with an empty registry rather than crashing.
5. WHEN multiple BrightChainDb instances share the same data directory, THE HeadRegistry SHALL use file-level locking to prevent concurrent write corruption.
6. THE HeadRegistry SHALL store head pointers in a JSON file at a configurable path within the data directory.
7. WHEN `HeadRegistry.clear()` is called, THE HeadRegistry SHALL remove all persisted head pointers from disk.


### Requirement 2: HeadRegistry Cross-Node Synchronization

**User Story:** As a distributed system operator, I want HeadRegistry state to synchronize across nodes, so that collection head pointers are consistent after network partitions heal.

#### Acceptance Criteria

1. WHEN a head pointer is updated on one node, THE HeadRegistry SHALL announce the update via the Gossip_Service with the database name, collection name, and new block ID.
2. WHEN a node receives a head pointer announcement from a peer, THE HeadRegistry SHALL update the local head pointer if the announced block ID is newer (based on the block's creation timestamp in metadata).
3. WHEN two nodes have conflicting head pointers for the same collection after partition recovery, THE Reconciliation_Service SHALL resolve the conflict using last-writer-wins based on block metadata timestamps.
4. IF a head pointer announcement references a block ID not present locally, THEN THE HeadRegistry SHALL defer the update until the block is fetched via the existing remote block fetch mechanism.

### Requirement 3: PooledStoreAdapter CBL Whitening Pool Scoping

**User Story:** As a developer using pool-isolated storage, I want CBL whitening operations to route through the pool, so that XOR components are stored in the correct pool namespace rather than the global namespace.

#### Acceptance Criteria

1. WHEN `PooledStoreAdapter.storeCBLWithWhitening()` is called, THE PooledStoreAdapter SHALL pass the pool ID to the inner store so that both XOR component blocks are stored within the adapter's pool namespace.
2. WHEN `PooledStoreAdapter.retrieveCBL()` is called, THE PooledStoreAdapter SHALL retrieve both XOR component blocks from the adapter's pool namespace.
3. THE PooledStoreAdapter SHALL extend `IPooledBlockStore` with pool-scoped variants: `storeCBLWithWhiteningInPool(poolId, cblData, options)` and `retrieveCBLFromPool(poolId, blockId1, blockId2, ...)`.
4. WHEN CBL whitening is performed through a PooledStoreAdapter, THE resulting CBL_Storage_Result SHALL contain block IDs that exist within the specified pool.
5. IF a CBL retrieval is attempted with block IDs that do not exist in the specified pool, THEN THE PooledStoreAdapter SHALL return a descriptive error indicating the pool and missing block IDs.

### Requirement 4: CBL Index Store

**User Story:** As a node operator, I want a persistent CBL index that tracks all whitened CBL storage results, so that I can discover and reconstruct stored CBLs without manually tracking magnet URLs.

#### Acceptance Criteria

1. THE CBL_Index SHALL be implemented as a brightchain-db collection, storing CBL index entries as documents.
2. WHEN a CBL is stored via `storeCBLWithWhitening()`, THE CBL_Index SHALL create an index entry containing the magnet URL, both block IDs, block size, creation timestamp, and optional metadata (file name, MIME type, original size, tags).
3. THE CBL_Index SHALL support querying entries by magnet URL, block ID, creator ID, pool ID, file name, MIME type, and tags.
4. WHEN a CBL index entry is created, THE CBL_Index SHALL validate that both referenced block IDs exist in the block store before persisting the entry.
5. THE CBL_Index SHALL define its data model as a shared interface `ICBLIndexEntry` in `brightchain-lib`, with the Node.js-specific collection implementation in `brightchain-db`.
6. WHEN a CBL is deleted, THE CBL_Index SHALL mark the entry as soft-deleted with a deletion timestamp rather than removing the entry.
7. THE CBL_Index SHALL support pagination for listing entries, returning results in configurable sort order (by creation date, file name, or size).

### Requirement 5: Pool-Scoped CBL Tracking

**User Story:** As a pool administrator, I want CBLs tracked per-pool with cross-pool dependency awareness, so that pool deletion safety checks account for CBL references.

#### Acceptance Criteria

1. WHEN a CBL is stored in a specific pool, THE CBL_Index SHALL record the pool ID in the index entry.
2. THE CBL_Index SHALL support filtering queries by pool ID, returning only entries belonging to the specified pool.
3. WHEN a pool deletion is requested, THE CBL_Index SHALL report all CBL entries in that pool as part of the deletion validation.
4. WHEN a CBL's XOR component blocks span multiple pools (cross-pool reference), THE CBL_Index SHALL track the cross-pool dependency so that neither pool can be deleted without acknowledging the dependency.
5. THE CBL_Index SHALL provide a method to list all pools that have CBL entries, with counts per pool.

### Requirement 6: User-Level CBL Tracking

**User Story:** As a BrightChain user, I want to see and organize my stored files, so that I can manage my data without manually tracking magnet URLs.

#### Acceptance Criteria

1. WHEN a user stores a CBL, THE CBL_Index SHALL associate the entry with the user's member ID via the `createdBy` field.
2. THE CBL_Index SHALL support querying all CBL entries for a specific user, with pagination and filtering by metadata.
3. THE CBL_Index SHALL support organizing CBL entries into named user collections (folders), stored as metadata on the index entry.
4. WHEN a user shares a CBL with another user, THE CBL_Index SHALL create a reference entry in the recipient's view without duplicating the underlying CBL data.
5. THE CBL_Index SHALL support visibility levels for CBL entries: private (creator only), shared (specific users), and public (all pool members).

### Requirement 27: File Version History

**User Story:** As a BrightChain user, I want to track version history for stored files, so that I can access previous versions and see the evolution of a document over time.

#### Acceptance Criteria

1. THE CBL_Index entry SHALL support an optional `fileId` field that groups all versions of the same logical file.
2. THE CBL_Index entry SHALL support an optional `versionNumber` field (positive integer) that identifies the version within a file group.
3. THE CBL_Index entry SHALL support an optional `previousVersion` field containing the magnet URL of the prior version, forming a linked audit chain.
4. WHEN a new version of a file is stored via `CBLIndex.addVersion()`, THE CBL_Index SHALL auto-assign the next `versionNumber` (previous max + 1) and set `previousVersion` to the current latest version's magnet URL.
5. WHEN `CBLIndex.addVersion()` is called with a `fileId` that has no existing entries, THE CBL_Index SHALL treat it as version 1 with no `previousVersion`.
6. THE CBL_Index SHALL support querying the full version history for a `fileId`, returned in version order.
7. THE CBL_Index SHALL support retrieving only the latest version for a `fileId` in O(1) query complexity (via sort + limit).
8. WHEN a version is soft-deleted, THE version chain SHALL remain intact — the `previousVersion` pointers of subsequent versions SHALL NOT be modified.
9. THE `fileId` field SHALL be queryable alongside other CBL_Index query filters (pool ID, creator ID, tags, etc.).

---

## Phase 2: CBL Durability & Cross-Node Sync

### Requirement 7: CBL Index Durability via FEC and Snapshots

**User Story:** As a node operator, I want the CBL index to be recoverable after corruption, so that I do not lose track of stored data.

#### Acceptance Criteria

1. THE CBL_Index collection SHALL store its metadata blocks with configurable FEC redundancy (parity block count), using the existing `FecService`.
2. WHEN a CBL index snapshot is requested, THE CBL_Index SHALL serialize the current index state and store it as a CBL in the block store, creating a point-in-time recovery checkpoint.
3. THE CBL_Index SHALL support automatic periodic snapshots at a configurable interval (default: every 100 index mutations).
4. WHEN the CBL index is corrupted or missing on startup, THE CBL_Index SHALL attempt recovery in order: (a) load from latest snapshot, (b) rebuild from FEC parity blocks, (c) partial rebuild by scanning the block store for CBL blocks using `DiskBlockAsyncStore.isCblBlock()` and `extractCblAddresses()`.
5. IF a partial rebuild from block scanning is performed, THEN THE CBL_Index SHALL log a warning that user metadata (file names, tags, collections) has been lost and only structural data (block IDs, magnet URLs) was recovered.
6. THE CBL_Index SHALL track a monotonically increasing sequence number for each mutation, used to determine snapshot freshness during recovery.

### Requirement 8: Cross-Node CBL Index Synchronization

**User Story:** As a distributed system operator, I want CBL index entries to synchronize across nodes, so that any node in a pool can discover and retrieve CBLs stored by other nodes.

#### Acceptance Criteria

1. WHEN a new CBL index entry is created, THE Gossip_Service SHALL announce the entry to peer nodes participating in the same pool.
2. WHEN a node receives a CBL index announcement, THE CBL_Index SHALL merge the entry into the local index if the entry does not already exist.
3. WHEN two nodes have conflicting CBL index entries for the same magnet URL, THE CBL_Index SHALL keep both entries and flag the conflict for manual resolution.
4. WHEN the Reconciliation_Service performs pool-scoped reconciliation, THE Reconciliation_Service SHALL exchange CBL index manifests (list of magnet URLs with sequence numbers) alongside block manifests.
5. THE Discovery_Protocol SHALL support searching for CBLs by metadata (file name, MIME type, tags) across nodes in the same pool.
6. WHEN a CBL index entry is soft-deleted on one node, THE Gossip_Service SHALL propagate the deletion to peer nodes so they also mark the entry as deleted.

---

## Phase 3: Pool Authentication & Access Control

### Requirement 9: Node Authentication via ECDSA

**User Story:** As a pool administrator, I want nodes to authenticate using ECDSA signatures, so that only verified nodes can interact with pool resources.

#### Acceptance Criteria

1. WHEN a node attempts to join a pool or perform a pool operation, THE node SHALL present an ECDSA signature proving ownership of its claimed node ID (derived from its public key).
2. THE authentication system SHALL define a challenge-response protocol: the verifying node sends a random nonce, the requesting node signs it with its private key, and the verifier checks the signature against the node's registered public key.
3. WHEN an ECDSA signature verification fails, THE system SHALL reject the operation and log the failed authentication attempt with the requesting node ID and operation type.
4. THE authentication interfaces SHALL be defined in `brightchain-lib` as `INodeAuthenticator` with methods `createChallenge()`, `signChallenge(challenge, privateKey)`, and `verifySignature(challenge, signature, publicKey)`.
5. THE Node.js implementation of `INodeAuthenticator` SHALL reside in `brightchain-api-lib`.

### Requirement 10: Pool Permission Levels

**User Story:** As a pool administrator, I want granular permission levels for pool members, so that I can control who can read, write, replicate, and administer pool data.

#### Acceptance Criteria

1. THE system SHALL define four permission levels: Read (retrieve blocks), Write (store blocks), Replicate (receive and serve replicas), and Admin (modify ACL and pool configuration).
2. THE permission levels SHALL be defined as an enum `PoolPermission` in `brightchain-lib`.
3. WHEN a node with only Read permission attempts to store a block in a pool, THE Block_Store SHALL reject the operation with a permission denied error.
4. WHEN a node with only Read and Write permissions attempts to modify the pool ACL, THE system SHALL reject the operation with a permission denied error.
5. THE Admin permission SHALL imply all other permissions (Read, Write, Replicate).
6. WHEN a permission check fails, THE system SHALL include the required permission, the node's actual permissions, and the pool ID in the error response.

### Requirement 11: Pool ACL Storage and Enforcement

**User Story:** As a pool administrator, I want pool access control lists stored as signed documents in the block store, so that ACLs are tamper-evident and auditable.

#### Acceptance Criteria

1. THE Pool ACL SHALL be stored as a signed document in the block store, with the signer being the Admin who last modified the ACL.
2. THE Pool ACL SHALL contain: pool ID, owner node ID, a list of members (each with node ID, permissions array, added-at timestamp, and added-by node ID), and flags for public read and public write access.
3. THE ACL interface `IPoolACL` SHALL be defined in `brightchain-lib` with a generic type parameter for node ID representation (string for frontend, buffer for backend).
4. WHEN a block store operation is attempted on a pool, THE Block_Store SHALL check the ACL before executing the operation.
5. WHEN the Gossip_Service receives a block announcement for a pool, THE Gossip_Service SHALL verify the announcing node has Write or Replicate permission in the pool's ACL before forwarding.
6. WHEN the Reconciliation_Service exchanges manifests for a pool, THE Reconciliation_Service SHALL verify both nodes have Replicate permission in the pool's ACL.
7. WHEN the Discovery_Protocol receives a query for blocks in a pool, THE Discovery_Protocol SHALL verify the querying node has Read permission before returning results.

### Requirement 12: ACL Bootstrap for Pool Creation

**User Story:** As a node operator creating a new pool, I want the pool creator to automatically become the first Admin, so that pools can be created without a pre-existing authority.

#### Acceptance Criteria

1. WHEN a new pool is created, THE system SHALL automatically create an ACL with the creating node as the sole Admin member.
2. WHEN a pool is created on a single-node deployment, THE system SHALL allow the single node to have full Admin permissions without requiring quorum.
3. THE pool creation process SHALL sign the initial ACL with the creating node's ECDSA key.
4. WHEN the first additional node is added to a pool, THE existing Admin SHALL sign the updated ACL, establishing the chain of trust.
5. IF a pool is created with `publicRead: true`, THEN THE system SHALL allow unauthenticated read access to blocks in that pool.
6. IF a pool is created with `publicWrite: true`, THEN THE system SHALL allow unauthenticated write access to blocks in that pool.

### Requirement 13: Quorum-Based ACL Updates

**User Story:** As a pool administrator, I want ACL changes to require quorum approval from existing admins, so that no single admin can unilaterally change access control.

#### Acceptance Criteria

1. WHEN an ACL update is proposed (adding/removing members, changing permissions), THE system SHALL require signatures from a majority (>50%) of current Admin members before applying the update.
2. WHEN a pool has only one Admin, THE system SHALL allow that Admin to make ACL changes without quorum (single-admin mode).
3. WHEN a quorum-based ACL update is approved, THE system SHALL create a new signed ACL document referencing the previous ACL's block ID, forming an auditable chain.
4. THE system SHALL propagate approved ACL updates via the Gossip_Service to all nodes participating in the pool.
5. IF a node receives an ACL update that does not have sufficient signatures, THEN THE system SHALL reject the update and log the insufficient quorum attempt.
6. WHEN an Admin is removed from the ACL, THE system SHALL verify that at least one Admin remains after the removal.

---

## Phase 4: Encrypted Pool Storage

### Requirement 14: Pool Encryption Modes

**User Story:** As a pool administrator, I want to configure encryption modes for pools, so that sensitive data is protected at rest according to organizational requirements.

#### Acceptance Criteria

1. THE system SHALL support three encryption modes for pools: `node-specific` (encrypted with the storing node's key, only that node can decrypt), `pool-shared` (encrypted with a shared pool key, any pool member can decrypt), and `none` (no encryption).
2. WHEN a pool is created with `node-specific` encryption, THE Block_Store SHALL encrypt block data using the node's ECIES public key before storage.
3. WHEN a pool is created with `pool-shared` encryption, THE Block_Store SHALL encrypt block data using a shared pool key derived from the pool's key material.
4. THE encryption mode SHALL be set at pool creation time and stored in the pool's configuration document.
5. WHEN encrypted block data is stored, THE block ID (checksum) SHALL be computed from the encrypted data, not the plaintext. This ensures Bloom_Filters and block lookups work correctly on encrypted pools.
6. THE encryption configuration interface `IEncryptedPoolOptions` SHALL be defined in `brightchain-lib`.

### Requirement 15: Key Management and Rotation

**User Story:** As a security administrator, I want encryption keys to be manageable and rotatable, so that compromised keys can be replaced without losing data.

#### Acceptance Criteria

1. WHEN `node-specific` encryption is used, THE system SHALL derive the encryption key from the node's existing ECDSA key pair.
2. WHEN `pool-shared` encryption is used, THE system SHALL generate a symmetric pool key and distribute it to authorized pool members encrypted with each member's public key.
3. WHEN a key rotation is initiated for a `pool-shared` pool, THE system SHALL re-encrypt the pool key with the new key material and distribute it to all current members.
4. THE system SHALL NOT re-encrypt existing blocks during key rotation; only new blocks use the new key. The old key SHALL be retained in a key history for decrypting older blocks.
5. WHEN a member is removed from a `pool-shared` pool, THE system SHALL initiate a key rotation so the removed member cannot decrypt new blocks.
6. IF a node's private key is compromised, THEN THE system SHALL support revoking the node's access and re-encrypting the pool key for `pool-shared` pools.

### Requirement 16: Encrypted Pool Metadata Handling

**User Story:** As a developer, I want to control which metadata fields remain searchable on encrypted pools, so that I can balance security with query functionality.

#### Acceptance Criteria

1. WHEN an encrypted pool is configured, THE pool configuration SHALL specify which metadata fields remain unencrypted and searchable (e.g., block size, creation date, pool ID).
2. THE system SHALL always leave block IDs (checksums) unencrypted, as they are content hashes of the encrypted data.
3. WHEN a CBL is stored in an encrypted pool, THE CBL_Index entry metadata (file name, tags, MIME type) SHALL be encrypted unless explicitly listed as searchable in the pool configuration.
4. THE system SHALL NOT allow content-based indexing or CBL address extraction on encrypted blocks, as the block content is opaque.
5. WHEN a query targets encrypted metadata fields, THE system SHALL return an error indicating those fields are not searchable in the current pool configuration.

### Requirement 17: Encrypted Pool Replication

**User Story:** As a distributed system operator, I want encrypted pools to replicate correctly across nodes, so that data availability is maintained without compromising encryption.

#### Acceptance Criteria

1. WHEN `node-specific` encryption is used, THE system SHALL NOT replicate encrypted blocks to other nodes, as other nodes cannot decrypt the data.
2. WHEN `pool-shared` encryption is used, THE system SHALL replicate encrypted blocks normally, as any pool member with the shared key can decrypt.
3. WHEN a new node joins a `pool-shared` encrypted pool, THE system SHALL distribute the current pool key (encrypted with the new node's public key) before replicating blocks.
4. THE replication strategy SHALL be enforced by the ACL: nodes without the Replicate permission and the pool key SHALL NOT receive replicated blocks.
5. WHEN `node-specific` encryption is combined with FEC parity, THE parity blocks SHALL also be encrypted with the same node key.

---

## Phase 5: Browser Compatibility Audit

### Requirement 18: brightchain-lib Browser Compatibility

**User Story:** As a frontend developer, I want `brightchain-lib` to run in browsers without polyfills, so that I can use shared types and crypto operations in web applications.

#### Acceptance Criteria

1. THE `brightchain-lib` package SHALL NOT import Node.js-specific modules (`fs`, `path`, `crypto`, `os`, `net`, `child_process`, `buffer` as Node.js Buffer) at the top level.
2. WHEN cryptographic operations are needed in `brightchain-lib`, THE implementation SHALL use the Web Crypto API (`crypto.subtle`) or a browser-compatible library (e.g., `@noble/hashes`, `@noble/curves`).
3. THE `brightchain-lib` package SHALL pass a build step targeting a browser environment (e.g., webpack or esbuild with `platform: 'browser'`) without errors.
4. WHEN platform-specific code is unavoidable in `brightchain-lib`, THE code SHALL be isolated behind a platform detection boundary with clear documentation.
5. THE `brightchain-db` and `brightchain-api-lib` packages SHALL NOT be required to be browser-compatible, as they are server-side packages using Node.js `crypto`, `fs`, and `Buffer`.
6. WHEN a shared interface in `brightchain-lib` uses `Buffer`, THE interface SHALL use `Uint8Array` instead, with `Buffer` usage confined to Node.js-specific packages.

---

## Phase 6: Documentation Updates

### Requirement 19: Storage Pools Architecture Document

**User Story:** As a developer onboarding to BrightChain, I want a comprehensive Storage Pools Architecture document, so that I can understand pool-based storage isolation, whitening, and coordination.

#### Acceptance Criteria

1. THE documentation team SHALL create `docs/Storage_Pools_Architecture.md` covering: pool concepts, namespace isolation, pool-scoped whitening, cross-node coordination, pool lifecycle, authentication, access control, and use cases.
2. THE document SHALL reference the four existing pool specs: `pool-based-storage-isolation`, `pool-scoped-whitening`, `cross-node-eventual-consistency`, and `cross-node-pool-coordination`.
3. THE document SHALL include Mermaid architecture diagrams showing component relationships.
4. THE document SHALL include code examples demonstrating pool creation, data storage, and retrieval.

### Requirement 20: README and Summary Updates

**User Story:** As a prospective contributor, I want the README and summary documents to reflect current BrightChain capabilities, so that I can quickly understand the project scope.

#### Acceptance Criteria

1. THE `README.md` SHALL be updated with sections covering: Storage Pools overview, pool-based storage isolation, cross-node coordination, and links to the Storage Pools Architecture document.
2. THE `docs/BrightChain Writeup.md` SHALL be updated with a "Pool-Based Storage Architecture" subsection under "Technical Implementation" covering pool isolation, pool-scoped whitening, cross-node consistency, and pool coordination.
3. THE `docs/BrightChain Summary.md` SHALL be updated with bullet points for: storage pools, pool-scoped whitening, cross-node pool coordination, and eventual consistency with read concerns.

### Requirement 21: API Documentation

**User Story:** As a developer integrating with BrightChain, I want API documentation for pool-related interfaces, so that I can correctly use pool storage, ACLs, and CBL management.

#### Acceptance Criteria

1. THE API documentation SHALL cover: `IPooledBlockStore` methods, `PooledStoreAdapter` usage patterns, `ReadConcern` enum and usage, pool-related gossip announcements, and pool-scoped reconciliation.
2. THE API documentation SHALL include TypeScript code examples for each major operation.
3. THE API documentation SHALL document error types and error handling patterns for pool operations.

---

## Phase 7: Showcase Updates

### Requirement 22: Storage Pools Demo

**User Story:** As a prospective user, I want an interactive demo of storage pools, so that I can see pool isolation, creation, and deletion in action.

#### Acceptance Criteria

1. THE Showcase SHALL include a Storage Pools demo page demonstrating: pool creation, storing data in different pools, querying data with pool isolation (data in pool A not visible from pool B), and pool deletion.
2. THE demo SHALL include explanatory text describing each operation and its significance.
3. THE demo SHALL use live code examples that execute against an in-memory block store.

### Requirement 23: Messaging and Communication Demo

**User Story:** As a prospective user, I want an interactive messaging demo, so that I can see BrightChain's encrypted communication capabilities.

#### Acceptance Criteria

1. THE Showcase SHALL include a Messaging demo page demonstrating: sending encrypted messages, creating group chats, creating channels with different visibility modes, and real-time presence indicators.
2. THE demo SHALL include explanatory text describing the encryption and privacy model.

### Requirement 24: BrightPass Demo

**User Story:** As a prospective user, I want an interactive BrightPass demo, so that I can see the password manager and credential vault capabilities.

#### Acceptance Criteria

1. THE Showcase SHALL include a BrightPass demo page demonstrating: vault creation, storing credentials (login, note, card), password generation, breach checking, and TOTP/2FA setup.
2. THE demo SHALL include explanatory text describing the security model.

### Requirement 25: Database Demo

**User Story:** As a prospective user, I want an interactive database demo, so that I can see brightchain-db's document storage and query capabilities.

#### Acceptance Criteria

1. THE Showcase SHALL include a Database demo page demonstrating: creating a database with pool isolation, inserting and querying documents, transactions, and the aggregation pipeline.
2. THE demo SHALL include explanatory text describing the copy-on-write storage model.

### Requirement 26: Voting Demo

**User Story:** As a prospective user, I want an interactive voting demo, so that I can see BrightChain's verifiable voting capabilities.

#### Acceptance Criteria

1. THE Showcase SHALL include a Voting demo page demonstrating: creating an election with multiple voting methods, casting encrypted votes, tallying votes, and displaying verifiable receipts.
2. THE demo SHALL include explanatory text describing the homomorphic encryption and verification model.

---

## Cross-Phase Dependencies

- Phase 2 depends on Phase 1 (CBL Index must exist before durability and sync can be built on top of it).
- Phase 3 depends on Phase 1 (ACL enforcement at the block store level requires the PooledStoreAdapter CBL fix from Requirement 3).
- Phase 4 depends on Phase 3 (encrypted pools integrate with ACLs for key distribution and access control).
- Phase 5 is independent and can proceed in parallel with Phases 2-4.
- Phase 6 depends on Phases 1-4 (documentation should reflect implemented features).
- Phase 7 depends on Phase 6 (demos should reference documentation).
