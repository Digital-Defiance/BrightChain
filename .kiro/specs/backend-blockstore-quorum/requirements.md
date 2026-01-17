# Requirements Document

## Introduction

This document specifies the requirements for the Backend Blockstore Quorum feature, which provides a complete backend system for BrightChain's distributed storage. The system includes persistent disk-based block storage with metadata management, a quorum document system using Shamir's Secret Sharing for secure multi-party access control, and REST API endpoints to expose all functionality. The system acts as a MongoDB-like document database with encryption and distributed trust.

## Glossary

- **Block_Store**: The persistent storage system that manages raw data blocks on disk, including storage, retrieval, and metadata operations
- **Block_Metadata**: Information about a block including expiration time, durability level, access timestamps, and replication status
- **FEC**: Forward Error Correction - a technique using Reed-Solomon encoding to generate parity data that enables recovery of lost or corrupted blocks
- **Parity_Block**: A block generated using Reed-Solomon encoding that stores redundant data for error recovery
- **Durability_Level**: The level of redundancy for a block (ephemeral, standard, high_durability) determining how many parity blocks are generated
- **Replication**: The process of copying blocks to multiple nodes for availability and fault tolerance
- **Replica_Node**: A remote node that stores a copy of a block for redundancy
- **Quorum_Service**: The backend service that manages quorum operations including document sealing, unsealing, and member management
- **Quorum_Document**: An encrypted document that requires a threshold number of quorum members to decrypt using Shamir's Secret Sharing
- **Quorum_Member**: A participant in the quorum system who holds a share of the encryption key for sealed documents
- **Share**: A piece of the encryption key distributed to a quorum member using Shamir's Secret Sharing
- **Sealing**: The process of encrypting a document and distributing key shares to quorum members
- **Unsealing**: The process of combining shares from quorum members to decrypt a sealed document
- **CBL**: Constituent Block List - a mapping of files to their constituent blocks
- **XOR_Brightening**: The process of XORing data blocks with random blocks to create Owner-Free storage
- **Document_Store**: The MongoDB-like document storage system backed by blocks

## Requirements

### Requirement 1: Enhanced Block Store Interface

**User Story:** As a developer, I want a unified block store interface that supports durability, metadata, and FEC operations, so that both memory and disk implementations can provide consistent functionality.

#### Acceptance Criteria

1. THE IBlockStore interface SHALL be extended to include durability level parameter in store operations
2. THE IBlockStore interface SHALL include methods for parity block generation and retrieval
3. THE IBlockStore interface SHALL include methods for block recovery using FEC
4. THE IBlockStore interface SHALL include methods for block integrity verification
5. THE IBlockStore interface SHALL include metadata management methods (getMetadata, updateMetadata)
6. THE MemoryBlockStore SHALL implement the enhanced IBlockStore interface with in-memory parity storage
7. THE DiskBlockAsyncStore SHALL implement the enhanced IBlockStore interface with disk-based parity storage
8. BOTH implementations SHALL use the same FecService for Reed-Solomon encoding/decoding

### Requirement 2: Block Metadata Management

**User Story:** As a system administrator, I want to track metadata for stored blocks, so that I can manage block lifecycle, replication, and access patterns.

#### Acceptance Criteria

1. WHEN a block is stored, THE Block_Store SHALL create and persist metadata including creation timestamp, expiration time, durability level, parity block references, replication targets, and access count
2. WHEN a block is accessed, THE Block_Store SHALL update the last access timestamp and increment the access count
3. WHEN block metadata is requested, THE Block_Store SHALL return the complete metadata record for the specified block
4. WHEN a block's expiration time is reached, THE Block_Store SHALL mark the block as eligible for cleanup
5. IF a block's metadata file is corrupted or missing, THEN THE Block_Store SHALL return an appropriate error and not serve the block
6. WHEN a block has parity blocks, THE Block_Store SHALL store references to all parity block IDs in the metadata
7. WHEN a block has replicas, THE Block_Store SHALL store references to replica node IDs in the metadata

### Requirement 3: Block Expiration and Cleanup

**User Story:** As a system administrator, I want blocks to automatically expire and be cleaned up, so that storage space is managed efficiently.

#### Acceptance Criteria

1. WHEN the cleanup process runs, THE Block_Store SHALL identify all blocks past their expiration time
2. WHEN an expired block is identified, THE Block_Store SHALL delete both the block data, its metadata, and any associated parity blocks
3. WHEN a block is deleted during cleanup, THE Block_Store SHALL log the deletion with the block ID and reason
4. IF a block is referenced by an active CBL, THEN THE Block_Store SHALL NOT delete the block even if expired

### Requirement 4: FEC-Based Block Durability

**User Story:** As a system administrator, I want blocks to have configurable durability levels using Reed-Solomon Forward Error Correction, so that data can be recovered even if some blocks are lost or corrupted.

#### Acceptance Criteria

1. WHEN a block is stored with durability level "standard", THE Block_Store SHALL generate 1 parity block using Reed-Solomon encoding
2. WHEN a block is stored with durability level "high_durability", THE Block_Store SHALL generate 2 or more parity blocks using Reed-Solomon encoding
3. WHEN a block is stored with durability level "ephemeral", THE Block_Store SHALL NOT generate any parity blocks
4. WHEN parity blocks are generated, THE Block_Store SHALL store them alongside the data block and record their IDs in the block metadata
5. WHEN a block is corrupted or missing, THE Block_Store SHALL attempt recovery using available parity blocks
6. WHEN recovery is attempted, THE Block_Store SHALL use the FecService to reconstruct the original data from parity
7. IF insufficient parity blocks are available for recovery, THEN THE Block_Store SHALL return an error indicating the block is unrecoverable
8. WHEN verifying block integrity, THE Block_Store SHALL use FecService.verifyFileIntegrity to check data against parity

### Requirement 5: Block Replication

**User Story:** As a system administrator, I want blocks to be replicated across multiple nodes, so that data remains available even if individual nodes fail.

#### Acceptance Criteria

1. WHEN a block is stored with replication enabled, THE Block_Store SHALL track the target replication factor in metadata
2. WHEN replication is requested, THE Block_Store SHALL provide methods to list blocks pending replication
3. WHEN a block is replicated to a remote node, THE Block_Store SHALL update the metadata with the replica node ID
4. WHEN checking replication status, THE Block_Store SHALL return the current replica count and target count
5. WHEN a replica node becomes unavailable, THE Block_Store SHALL mark the block as under-replicated
6. THE Block_Store SHALL provide methods to query blocks by replication status (pending, replicated, under-replicated)
7. WHEN deleting a block, THE Block_Store SHALL notify replica nodes to delete their copies (if replication coordination is enabled)

### Requirement 6: XOR Brightening Operations

**User Story:** As a developer, I want to brighten data blocks using XOR operations with random blocks, so that I can implement Owner-Free storage patterns.

#### Acceptance Criteria

1. WHEN a brighten operation is requested, THE Block_Store SHALL XOR the source block with the specified number of random blocks
2. WHEN brightening completes, THE Block_Store SHALL return the resulting brightened block and the list of random block IDs used
3. WHEN random blocks are needed for brightening, THE Block_Store SHALL select blocks randomly from the available pool
4. IF insufficient random blocks are available, THEN THE Block_Store SHALL return an error indicating the shortage

### Requirement 7: Quorum Member Management

**User Story:** As a quorum administrator, I want to manage quorum members, so that I can control who participates in document access decisions.

#### Acceptance Criteria

1. WHEN a new member is added to the quorum, THE Quorum_Service SHALL store the member's public key and metadata
2. WHEN a member is removed from the quorum, THE Quorum_Service SHALL revoke their access to future documents while preserving access to existing documents they are part of
3. WHEN member information is requested, THE Quorum_Service SHALL return the member's public key and participation status
4. THE Quorum_Service SHALL maintain a list of all active quorum members

### Requirement 8: Document Sealing

**User Story:** As a user, I want to seal documents so that they can only be accessed when enough quorum members agree, ensuring secure multi-party access control.

#### Acceptance Criteria

1. WHEN a document is sealed, THE Quorum_Service SHALL encrypt the document using a randomly generated symmetric key
2. WHEN a document is sealed, THE Quorum_Service SHALL split the symmetric key into shares using Shamir's Secret Sharing
3. WHEN shares are created, THE Quorum_Service SHALL encrypt each share with the corresponding member's public key
4. WHEN sealing completes, THE Quorum_Service SHALL return a document record containing the encrypted data, encrypted shares, and metadata
5. WHEN sealing is requested with fewer than 2 members, THE Quorum_Service SHALL return an error
6. WHEN sealing is requested, THE Quorum_Service SHALL allow specifying the threshold number of shares required for unsealing

### Requirement 9: Document Unsealing

**User Story:** As a user, I want to unseal documents when enough quorum members provide their shares, so that I can access protected content.

#### Acceptance Criteria

1. WHEN unsealing is requested, THE Quorum_Service SHALL verify that sufficient shares are provided
2. WHEN shares are provided, THE Quorum_Service SHALL decrypt each share using the corresponding member's private key
3. WHEN sufficient shares are decrypted, THE Quorum_Service SHALL reconstruct the symmetric key using Shamir's Secret Sharing
4. WHEN the key is reconstructed, THE Quorum_Service SHALL decrypt and return the original document
5. IF insufficient shares are provided, THEN THE Quorum_Service SHALL return an error indicating how many more shares are needed
6. IF share decryption fails, THEN THE Quorum_Service SHALL return an error identifying the problematic share

### Requirement 10: Quorum Document Storage

**User Story:** As a user, I want sealed documents to be persistently stored, so that they survive system restarts and can be retrieved later.

#### Acceptance Criteria

1. WHEN a document is sealed, THE Quorum_Service SHALL persist the document record to the block store
2. WHEN a document is requested by ID, THE Quorum_Service SHALL retrieve it from persistent storage
3. WHEN listing documents, THE Quorum_Service SHALL return all documents the requesting member has access to
4. WHEN a document is deleted, THE Quorum_Service SHALL remove it from persistent storage

### Requirement 11: Block API Endpoints

**User Story:** As a developer, I want REST API endpoints for block operations, so that I can integrate block storage into applications.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/blocks, THE API SHALL store the provided block data and return the block ID
2. WHEN a GET request is made to /api/blocks/:id, THE API SHALL return the block data for the specified ID
3. WHEN a DELETE request is made to /api/blocks/:id, THE API SHALL delete the specified block
4. WHEN a GET request is made to /api/blocks/:id/metadata, THE API SHALL return the block's metadata
5. WHEN a POST request is made to /api/blocks/brighten, THE API SHALL perform XOR brightening and return the result
6. IF a block is not found, THEN THE API SHALL return a 404 status with an appropriate error message
7. IF the request is unauthorized, THEN THE API SHALL return a 401 status

### Requirement 12: Quorum API Endpoints

**User Story:** As a developer, I want REST API endpoints for quorum operations, so that I can integrate quorum-based access control into applications.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/quorum/members, THE API SHALL add a new member to the quorum
2. WHEN a GET request is made to /api/quorum/members, THE API SHALL return the list of quorum members
3. WHEN a DELETE request is made to /api/quorum/members/:id, THE API SHALL remove the specified member
4. WHEN a POST request is made to /api/quorum/documents/seal, THE API SHALL seal the provided document
5. WHEN a POST request is made to /api/quorum/documents/:id/unseal, THE API SHALL unseal the document using provided shares
6. WHEN a GET request is made to /api/quorum/documents/:id, THE API SHALL return the sealed document metadata
7. WHEN a GET request is made to /api/quorum/documents/:id/can-unlock, THE API SHALL return whether the specified members can unlock the document

### Requirement 13: Document Store Integration

**User Story:** As a developer, I want the document store to support both encrypted and unencrypted documents, so that I can choose the appropriate security level for each use case.

#### Acceptance Criteria

1. WHEN creating a document with encryption enabled, THE Document_Store SHALL seal the document using the quorum system before storage
2. WHEN retrieving an encrypted document, THE Document_Store SHALL require quorum member shares for decryption
3. WHEN creating a document without encryption, THE Document_Store SHALL store it directly in the block store
4. WHEN querying documents, THE Document_Store SHALL only return documents the requesting user has access to

### Requirement 14: CBL Management Endpoints

**User Story:** As a developer, I want REST API endpoints for CBL operations, so that I can manage file-to-block mappings.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/cbl, THE API SHALL create a new CBL with the provided block addresses
2. WHEN a GET request is made to /api/cbl/:id, THE API SHALL return the CBL with its block addresses
3. WHEN a GET request is made to /api/cbl/:id/blocks, THE API SHALL return the actual block data for all blocks in the CBL
4. WHEN a DELETE request is made to /api/cbl/:id, THE API SHALL delete the CBL

### Requirement 15: Error Handling and Validation

**User Story:** As a developer, I want consistent error handling across all endpoints, so that I can properly handle failures in my applications.

#### Acceptance Criteria

1. WHEN a validation error occurs, THE API SHALL return a 400 status with details about the invalid fields
2. WHEN an authentication error occurs, THE API SHALL return a 401 status with an appropriate message
3. WHEN an authorization error occurs, THE API SHALL return a 403 status with an appropriate message
4. WHEN a resource is not found, THE API SHALL return a 404 status with the resource type and ID
5. WHEN an internal error occurs, THE API SHALL return a 500 status and log the error details
6. THE API SHALL use consistent error response format across all endpoints

### Requirement 16: Serialization Round-Trip

**User Story:** As a developer, I want quorum documents to serialize and deserialize correctly, so that they can be stored and retrieved without data loss.

#### Acceptance Criteria

1. FOR ALL valid QuorumDataRecord objects, serializing to JSON then deserializing SHALL produce an equivalent object
2. FOR ALL valid block metadata objects, serializing then deserializing SHALL preserve all fields
3. FOR ALL valid CBL objects, serializing then deserializing SHALL preserve all block addresses and metadata
