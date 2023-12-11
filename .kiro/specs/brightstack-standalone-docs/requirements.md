# Requirements Document

## Introduction

BrightDB is currently documented and architected as a component of the BrightChain decentralized network. To use BrightDB, developers must set up a full BrightChain node — a significant barrier for developers who simply want a privacy-preserving, content-addressable document database as a drop-in MERN replacement. This feature delivers standalone documentation and guides that enable developers to use BrightDB and the BrightStack paradigm (BrightDB + Express + React + Node.js) without joining or participating in the BrightChain network. Two deployment models are covered: a single-node standalone application and a private multi-node cluster that shares data only within itself.

## Glossary

- **BrightStack**: The development paradigm combining BrightDB, Express, React, and Node.js as a decentralized alternative to the MERN stack (MongoDB, Express, React, Node.js).
- **Standalone_Mode**: A BrightDB deployment that operates independently of the BrightChain network, using a local block store without gossip, discovery, or network participation.
- **Private_Cluster**: A group of BrightDB nodes that replicate data among themselves using private pools and gossip, without connecting to or participating in the public BrightChain network.
- **BrightPool**: A storage pool namespace that isolates blocks within a BrightDB instance, providing logical separation of data with optional encryption.
- **InMemoryDatabase**: A lightweight, ephemeral block store implementation suitable for development, testing, and prototyping.
- **LocalDiskStore**: A persistent block store implementation that writes content-addressable blocks to the local filesystem without requiring BrightChain node infrastructure.
- **Single_Node_Guide**: The documentation artifact that walks a developer through setting up a standalone BrightDB application on a single machine as a MERN replacement.
- **Cluster_Guide**: The documentation artifact that walks a developer through setting up a private multi-node BrightDB cluster with data sharing restricted to cluster members.
- **MERN_Migration_Reference**: The documentation artifact that maps MERN stack concepts, patterns, and code to their BrightStack equivalents.
- **Block_Store**: The content-addressable storage backend that BrightDB operates over, identified by the `IBlockStore` interface.
- **Express_Middleware**: The `createDbRouter` function from `@brightchain/db` that exposes BrightDB collections as REST endpoints.
- **PooledStoreAdapter**: An adapter that wraps a block store and scopes all operations to a specific pool namespace.

## Requirements

### Requirement 1: Single-Node Standalone Setup Guide

**User Story:** As a web developer familiar with MERN, I want a step-by-step guide to set up a standalone BrightDB application on a single machine, so that I can build applications with BrightDB without joining the BrightChain network.

#### Acceptance Criteria

1. THE Single_Node_Guide SHALL provide a complete walkthrough from project initialization to a running BrightStack application using only `@brightchain/db` and standard Node.js dependencies.
2. WHEN a developer follows the Single_Node_Guide, THE Single_Node_Guide SHALL produce a working Express API server with BrightDB-backed collections accessible via REST endpoints within 15 minutes.
3. THE Single_Node_Guide SHALL include code examples for creating a BrightDB instance with InMemoryDatabase for development and LocalDiskStore for production persistence.
4. THE Single_Node_Guide SHALL include code examples for all CRUD operations (insertOne, findOne, updateOne, deleteOne, insertMany, find, updateMany, deleteMany) using the standalone block store.
5. THE Single_Node_Guide SHALL include a code example for mounting the Express_Middleware (`createDbRouter`) to expose collections as REST endpoints.
6. THE Single_Node_Guide SHALL include a code example for a minimal React frontend that performs CRUD operations against the Express API.
7. THE Single_Node_Guide SHALL explicitly state that no BrightChain node, network connection, or blockchain participation is required for standalone operation.
8. IF a developer attempts to use BrightChain-specific features (gossip, discovery, replication) in standalone mode, THEN THE Single_Node_Guide SHALL explain that those features are unavailable and describe the cluster deployment path as an alternative.

### Requirement 2: Private Cluster Setup Guide

**User Story:** As a developer building a multi-server application, I want a guide to set up a private BrightDB cluster that shares data only among its members, so that I can have data replication and high availability without joining the public BrightChain network.

#### Acceptance Criteria

1. THE Cluster_Guide SHALL provide a complete walkthrough for configuring two or more BrightDB nodes that replicate data among themselves without connecting to the BrightChain network.
2. THE Cluster_Guide SHALL include instructions for creating a private BrightPool that is scoped exclusively to the cluster members.
3. THE Cluster_Guide SHALL include code examples for configuring gossip between cluster nodes using explicit peer lists rather than public network discovery.
4. THE Cluster_Guide SHALL include code examples for configuring reconciliation between cluster nodes to recover from network partitions.
5. THE Cluster_Guide SHALL include instructions for adding a new node to an existing private cluster, including ACL configuration and pool key distribution.
6. THE Cluster_Guide SHALL include instructions for removing a node from the cluster, including ACL revocation and key rotation.
7. WHEN a private cluster is configured following the Cluster_Guide, THE Private_Cluster SHALL reject connection attempts from nodes not listed in the cluster ACL.
8. THE Cluster_Guide SHALL include a code example for configuring PoolShared encryption so that all data at rest within the cluster is encrypted with a shared AES-256-GCM key.
9. THE Cluster_Guide SHALL explicitly state that the cluster does not participate in the BrightChain network and that data remains private to cluster members.

### Requirement 3: MERN-to-BrightStack Migration Reference

**User Story:** As a developer migrating an existing MERN application, I want a side-by-side reference mapping MongoDB operations to BrightDB equivalents, so that I can convert my application with minimal friction.

#### Acceptance Criteria

1. THE MERN_Migration_Reference SHALL provide a side-by-side comparison table mapping each MongoDB driver method (connect, insertOne, findOne, find, updateOne, updateMany, deleteOne, deleteMany, aggregate, createIndex, watch) to the equivalent BrightDB method.
2. THE MERN_Migration_Reference SHALL provide a side-by-side comparison of MongoDB connection strings versus BrightDB block store initialization code.
3. THE MERN_Migration_Reference SHALL provide a side-by-side comparison of Mongoose schema definitions versus BrightDB CollectionSchema definitions.
4. THE MERN_Migration_Reference SHALL include a before/after code example showing a complete Express route handler migrated from MongoDB to BrightDB.
5. THE MERN_Migration_Reference SHALL document which MongoDB features are supported by BrightDB (query operators, aggregation stages, indexes, transactions, change streams) and which are not yet supported.
6. THE MERN_Migration_Reference SHALL document the differences in data persistence behavior between MongoDB (disk-based by default) and BrightDB (InMemoryDatabase for development, LocalDiskStore for production).

### Requirement 4: Standalone Block Store Configuration

**User Story:** As a developer, I want clear documentation on how to configure BrightDB's block store for standalone use without BrightChain dependencies, so that I can choose the right storage backend for my deployment.

#### Acceptance Criteria

1. THE Single_Node_Guide SHALL document at least two block store options for standalone use: InMemoryDatabase for development and a persistent file-based store for production.
2. WHEN a developer configures a persistent block store following the Single_Node_Guide, THE Block_Store SHALL persist data across application restarts without requiring a BrightChain node.
3. THE Single_Node_Guide SHALL include a code example for configuring the PersistentHeadRegistry to track collection state across restarts.
4. THE Single_Node_Guide SHALL document the storage directory structure used by the persistent block store, including the head registry file location.
5. IF the configured storage directory does not exist, THEN THE Block_Store SHALL create the directory automatically on first write.

### Requirement 5: Schema Validation and Data Modeling Guide

**User Story:** As a developer, I want documentation on how to define schemas and validate documents in standalone BrightDB, so that I can enforce data integrity without relying on external tools like Mongoose.

#### Acceptance Criteria

1. THE Single_Node_Guide SHALL include a section on defining CollectionSchema objects with field types, required fields, default values, enum constraints, and pattern validation.
2. THE Single_Node_Guide SHALL include a code example for creating a Model with schema validation, demonstrating validation errors on invalid documents.
3. THE Single_Node_Guide SHALL include a code example for nested object schemas and array item schemas.
4. WHEN a document fails schema validation, THE BrightDB instance SHALL return a ValidationError with field-level error details and MongoDB-compatible error code 121.

### Requirement 6: Indexing and Query Performance Guide

**User Story:** As a developer, I want documentation on how to create and manage indexes in standalone BrightDB, so that I can optimize query performance for my application.

#### Acceptance Criteria

1. THE Single_Node_Guide SHALL include a section on creating single-field, compound, unique, sparse, and TTL indexes with code examples.
2. THE Single_Node_Guide SHALL include guidance on when to create indexes based on query patterns, with examples of queries that benefit from indexing versus full collection scans.
3. THE Single_Node_Guide SHALL document the performance characteristics of index rebuilds on application restart when using a persistent block store.

### Requirement 7: Transaction Support Documentation

**User Story:** As a developer, I want documentation on how to use transactions in standalone BrightDB, so that I can perform atomic multi-document operations.

#### Acceptance Criteria

1. THE Single_Node_Guide SHALL include a section on using DbSession for manual transaction control (startTransaction, commitTransaction, abortTransaction).
2. THE Single_Node_Guide SHALL include a code example using the `withTransaction` convenience helper for automatic commit/abort lifecycle management.
3. THE Single_Node_Guide SHALL document the isolation level provided by BrightDB transactions (read-committed) and its implications for concurrent operations.

### Requirement 8: Aggregation Pipeline Documentation

**User Story:** As a developer, I want documentation on using BrightDB's aggregation pipeline in standalone mode, so that I can perform complex data analysis without external tools.

#### Acceptance Criteria

1. THE Single_Node_Guide SHALL include a section documenting all 14 supported aggregation stages ($match, $group, $sort, $limit, $skip, $project, $unwind, $count, $addFields, $lookup, $replaceRoot, $out, $sample, $facet) with code examples.
2. THE Single_Node_Guide SHALL include a complete aggregation pipeline example that demonstrates chaining at least four stages to produce a report.
3. THE Single_Node_Guide SHALL include a code example for the $lookup stage performing a cross-collection join in standalone mode.

### Requirement 9: Deployment and Production Readiness Guide

**User Story:** As a developer preparing for production, I want documentation on deploying a standalone BrightStack application, so that I can run it reliably in a production environment.

#### Acceptance Criteria

1. THE Single_Node_Guide SHALL include a section on production deployment covering persistent storage configuration, environment variable management, and process management recommendations.
2. THE Single_Node_Guide SHALL include a production deployment checklist with items for storage persistence, backup strategy, error handling, and monitoring.
3. THE Cluster_Guide SHALL include a production deployment checklist with items for node redundancy, encryption configuration, reconciliation scheduling, and health monitoring.
4. WHEN deploying to production, THE Single_Node_Guide SHALL recommend configuring the PersistentHeadRegistry with a durable storage path rather than using InMemoryDatabase.

### Requirement 10: Documentation Structure and Navigation

**User Story:** As a developer browsing the BrightChain documentation site, I want the standalone BrightStack guides to be discoverable and well-organized, so that I can find them without prior knowledge of BrightChain.

#### Acceptance Criteria

1. THE Single_Node_Guide SHALL be placed in the `docs/guides/` directory with a Jekyll front matter `nav_order` that positions it prominently in the guides section.
2. THE Cluster_Guide SHALL be placed in the `docs/guides/` directory adjacent to the Single_Node_Guide.
3. THE MERN_Migration_Reference SHALL be placed in the `docs/guides/` directory adjacent to the other standalone guides.
4. WHEN a developer navigates to the guides section of the documentation site, THE documentation index SHALL list the standalone BrightStack guides with descriptive titles that do not require prior BrightChain knowledge.
5. THE Single_Node_Guide SHALL include cross-references to the existing BrightDB Usage walkthrough and Building a dApp walkthrough for developers who want to explore BrightChain integration later.
